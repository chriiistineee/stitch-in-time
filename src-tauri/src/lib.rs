// Stitch in Time: window shape, glass effect, quit handling, and plugins.

use std::sync::Mutex;

use serde_json::json;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, PhysicalSize, RunEvent, Runtime,
    WebviewWindow, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri_plugin_store::StoreExt;

mod glass;
use glass::GlassRect;

const STORE: &str = "settings.json";
const POS_KEY: &str = "windowPosition";
const SIZE_KEY: &str = "windowWidth";
/// The Figma frame. The UI scales with the window width (see +page.svelte).
const BASE: (f64, f64) = (360.0, 600.0);
const DEFAULT_SCALE: f64 = 0.9;
const MIN_SCALE: f64 = 0.6;
const MAX_SCALE: f64 = 1.5;
const BASE_RADIUS: f64 = 44.0;
/// The minimized views are larger than the Figma size, so Stitch is easy to see.
/// Keep these in step with MINI_ZOOM in +page.svelte.
const PILL_ZOOM: f64 = 1.4;
const DOG_ZOOM: f64 = 1.7;
/// The pill window holds the pill and the part of Stitch that sticks out of it.
const PILL: (f64, f64) = (226.0 * PILL_ZOOM, 116.0 * PILL_ZOOM);
const DOG: (f64, f64) = (92.0 * DOG_ZOOM, 92.0 * DOG_ZOOM);

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Shape {
    Expanded,
    Pill,
    Dog,
}

struct WinState {
    shape: Shape,
    /// The last size of the expanded window (physical pixels).
    expanded_size: Option<PhysicalSize<u32>>,
}

fn expanded_radius<R: Runtime>(win: &WebviewWindow<R>) -> (f64, f64, f64) {
    let scale = win.scale_factor().unwrap_or(1.0);
    let size = win.inner_size().unwrap_or_default().to_logical::<f64>(scale);
    (size.width, size.height, BASE_RADIUS * size.width / BASE.0)
}

fn apply_glass<R: Runtime>(win: &WebviewWindow<R>, shape: Shape) {
    let rect = match shape {
        Shape::Expanded => {
            let (w, h, radius) = expanded_radius(win);
            Some(GlassRect { x: 0.0, y: 0.0, w, h, radius, fill: true })
        }
        // Minimized views are fully clear: no glass and no window shadow.
        Shape::Pill | Shape::Dog => None,
    };
    glass::apply(win, rect);
    glass::set_active(win.is_focused().unwrap_or(false));
    // A macOS shadow on this transparent window draws a hard outline at the window edge,
    // so the window has no native shadow. The glass gives the depth.
    let _ = win.set_shadow(false);
}

/// Keep the window on top of other apps, on every Space, and over full-screen apps.
/// Keep the Figma aspect ratio when the user resizes the window.
fn setup_ns_window<R: Runtime>(win: &WebviewWindow<R>) {
    let _ = win.set_always_on_top(true);
    let _ = win.set_visible_on_all_workspaces(true);
    #[cfg(target_os = "macos")]
    if let Ok(ptr) = win.ns_window() {
        use objc2::{msg_send, runtime::AnyObject};
        use objc2_foundation::NSSize;
        // NSWindowCollectionBehavior: CanJoinAllSpaces (1) | Stationary (16) | FullScreenAuxiliary (256)
        let behavior: usize = 1 | 16 | 256;
        unsafe {
            let ns = ptr as *mut AnyObject;
            let _: () = msg_send![ns, setCollectionBehavior: behavior];
            let _: () = msg_send![ns, setContentAspectRatio: NSSize::new(BASE.0, BASE.1)];
        }
    }
}

fn save_position<R: Runtime>(app: &AppHandle<R>, pos: PhysicalPosition<i32>) {
    if let Ok(store) = app.store(STORE) {
        store.set(POS_KEY, json!({ "x": pos.x, "y": pos.y }));
    }
}

fn load_position<R: Runtime>(app: &AppHandle<R>) -> Option<PhysicalPosition<i32>> {
    let store = app.store(STORE).ok()?;
    let v = store.get(POS_KEY)?;
    Some(PhysicalPosition::new(v.get("x")?.as_i64()? as i32, v.get("y")?.as_i64()? as i32))
}

fn load_width<R: Runtime>(app: &AppHandle<R>) -> Option<f64> {
    let w = app.store(STORE).ok()?.get(SIZE_KEY)?.as_f64()?;
    Some(w.clamp(BASE.0 * MIN_SCALE, BASE.0 * MAX_SCALE))
}

/// First launch: the top-right of the main screen, below the menu bar.
fn default_position<R: Runtime>(win: &WebviewWindow<R>) -> Option<PhysicalPosition<i32>> {
    let m = win.primary_monitor().ok()??;
    let scale = m.scale_factor();
    let size = win.outer_size().ok()?;
    let x = m.position().x + m.size().width as i32 - size.width as i32 - (20.0 * scale) as i32;
    let y = m.position().y + (44.0 * scale) as i32;
    Some(PhysicalPosition::new(x, y))
}

/// The saved position, if any part of the window is still on a screen.
fn on_screen<R: Runtime>(win: &WebviewWindow<R>, p: PhysicalPosition<i32>) -> bool {
    win.available_monitors().map_or(false, |ms| {
        ms.iter().any(|m| {
            let (mx, my) = (m.position().x, m.position().y);
            let (mw, mh) = (m.size().width as i32, m.size().height as i32);
            p.x + 80 > mx && p.x < mx + mw - 40 && p.y >= my - 10 && p.y < my + mh - 40
        })
    })
}

/// Keep a window of size (w, h) inside the screen it is on.
fn clamp_to_screen<R: Runtime>(win: &WebviewWindow<R>, x: i32, y: i32, w: i32, h: i32) -> PhysicalPosition<i32> {
    let Ok(Some(m)) = win.current_monitor() else { return PhysicalPosition::new(x, y) };
    let (mx, my) = (m.position().x, m.position().y);
    let (mw, mh) = (m.size().width as i32, m.size().height as i32);
    let top = my + (30.0 * m.scale_factor()) as i32;
    PhysicalPosition::new(x.clamp(mx, (mx + mw - w).max(mx)), y.clamp(top, (my + mh - h).max(top)))
}

#[tauri::command]
fn set_window_shape<R: Runtime>(app: AppHandle<R>, shape: String) -> Result<(), String> {
    let next = match shape.as_str() {
        "expanded" => Shape::Expanded,
        "pill" => Shape::Pill,
        "dog" => Shape::Dog,
        _ => return Err(format!("unknown shape {shape}")),
    };
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let Some(win) = handle.get_webview_window("main") else { return };
        let state = handle.state::<Mutex<WinState>>();
        let mut st = state.lock().unwrap();
        if st.shape == next {
            return;
        }
        let pos = win.outer_position().unwrap_or_default();
        let size = win.outer_size().unwrap_or_default();
        let scale = win.scale_factor().unwrap_or(1.0);
        // The top-right corner stays where it is, so the window opens and closes where you put it.
        let right = pos.x + size.width as i32;

        if st.shape == Shape::Expanded {
            st.expanded_size = Some(win.inner_size().unwrap_or_default());
            save_position(&handle, pos);
        }

        let (w, h) = match next {
            Shape::Expanded => {
                let _ = win.set_resizable(true);
                // Use the size we ask for. A read right after set_size can still return the old size.
                let target = st.expanded_size.unwrap_or_else(|| {
                    let w = load_width(&handle).unwrap_or(BASE.0 * DEFAULT_SCALE);
                    LogicalSize::new(w, w * BASE.1 / BASE.0).to_physical(scale)
                });
                let _ = win.set_size(target);
                (target.width as i32, target.height as i32)
            }
            Shape::Pill | Shape::Dog => {
                let (lw, lh) = if next == Shape::Pill { PILL } else { DOG };
                let _ = win.set_resizable(false);
                let _ = win.set_size(LogicalSize::new(lw, lh));
                ((lw * scale) as i32, (lh * scale) as i32)
            }
        };
        let _ = win.set_position(clamp_to_screen(&win, right - w, pos.y, w, h));
        apply_glass(&win, next);
        st.shape = next;
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn debug_log(msg: String) {
    #[cfg(debug_assertions)]
    eprintln!("ui: {msg}");
    #[cfg(not(debug_assertions))]
    let _ = msg;
}

#[tauri::command]
fn quit_app<R: Runtime>(app: AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        let st = app.state::<Mutex<WinState>>();
        let st = st.lock().unwrap();
        if st.shape == Shape::Expanded {
            if let Ok(p) = win.outer_position() {
                save_position(&app, p);
            }
        }
    }
    if let Ok(store) = app.store(STORE) {
        let _ = store.save();
    }
    app.exit(0);
}

fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    // Cmd+Q goes to the app, which asks first while a session is active.
    let quit = MenuItem::with_id(app, "quit", "Quit Stitch in Time", true, Some("CmdOrCtrl+Q"))?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
    let app_menu = Submenu::with_items(
        app,
        "Stitch in Time",
        true,
        &[
            &PredefinedMenuItem::about(app, None, None)?,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    Menu::with_items(app, &[&app_menu, &edit])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create tasks",
        sql: "CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                estimate INTEGER NOT NULL DEFAULT 1,
                completed_pomodoros INTEGER NOT NULL DEFAULT 0,
                done INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );",
        kind: MigrationKind::Up,
    }];

    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:stitch-in-time.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(Mutex::new(WinState { shape: Shape::Expanded, expanded_size: None }))
        .invoke_handler(tauri::generate_handler![set_window_shape, quit_app, debug_log])
        .setup(|app| {
            let handle = app.handle().clone();
            handle.set_menu(build_menu(&handle)?)?;
            handle.on_menu_event(|app, e| {
                if e.id() == "quit" {
                    let _ = app.emit("quit-requested", ());
                } else if e.id() == "settings" {
                    let _ = app.emit("open-settings", ());
                }
            });

            let win = app.get_webview_window("main").expect("main window");
            let width = load_width(&handle).unwrap_or(BASE.0 * DEFAULT_SCALE);
            let _ = win.set_size(LogicalSize::new(width, width * BASE.1 / BASE.0));
            let pos = load_position(&handle).filter(|p| on_screen(&win, *p)).or_else(|| default_position(&win));
            if let Some(p) = pos {
                let _ = win.set_position(p);
            }
            apply_glass(&win, Shape::Expanded);
            setup_ns_window(&win);
            let _ = win.show();

            let h = handle.clone();
            win.on_window_event(move |event| {
                let expanded = h
                    .state::<Mutex<WinState>>()
                    .lock()
                    .map(|s| s.shape == Shape::Expanded)
                    .unwrap_or(false);
                match event {
                    WindowEvent::Moved(p) if expanded => save_position(&h, *p),
                    WindowEvent::Resized(_) if expanded => {
                        if let Some(w) = h.get_webview_window("main") {
                            let (lw, _, radius) = expanded_radius(&w);
                            glass::set_radius(radius);
                            if let Ok(store) = h.store(STORE) {
                                store.set(SIZE_KEY, json!(lw));
                            }
                        }
                    }
                    // Strong blur while the app is in use. Fully clear when it is not.
                    WindowEvent::Focused(f) => glass::set_active(*f),
                    _ => {}
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Stitch in Time");

    app.run(|app, event| {
        // Dock > Quit and other system quits: let the app ask first.
        if let RunEvent::ExitRequested { code: None, api, .. } = event {
            api.prevent_exit();
            let _ = app.emit("quit-requested", ());
        }
    });
}
