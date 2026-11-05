// macOS Liquid Glass behind the transparent webview.
//
// On macOS 26 and later this puts an NSGlassEffectView under the webview.
// On older macOS it falls back to NSVisualEffectView (window-vibrancy).
// The glass covers only `rect` (in points, top-left origin), so a minimized
// dog can stick out above the glass pill.

use std::sync::Mutex;

use tauri::{Runtime, WebviewWindow};

/// The glass view that this module added, so it can be removed on a shape change.
static GLASS_VIEW: Mutex<usize> = Mutex::new(0);

#[derive(Clone, Copy)]
pub struct GlassRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub radius: f64,
    /// Cover the whole window and follow its size.
    pub fill: bool,
}

#[cfg(target_os = "macos")]
pub fn apply<R: Runtime>(win: &WebviewWindow<R>, rect: Option<GlassRect>) {
    use objc2::{msg_send, runtime::{AnyClass, AnyObject, Bool, Sel}, sel};
    use objc2_foundation::{NSPoint, NSRect, NSSize};

    let _ = window_vibrancy::clear_vibrancy(win);
    let Ok(ns_window) = win.ns_window() else { return };
    let ns_window = ns_window as *mut AnyObject;

    unsafe {
        let content: *mut AnyObject = msg_send![ns_window, contentView];
        if content.is_null() {
            return;
        }

        // Remove the previous glass view.
        let mut slot = GLASS_VIEW.lock().unwrap();
        if *slot != 0 {
            let old = *slot as *mut AnyObject;
            let _: () = msg_send![old, removeFromSuperview];
            *slot = 0;
        }

        let Some(r) = rect else { return };
        let bounds: NSRect = msg_send![content, bounds];
        let flipped: Bool = msg_send![content, isFlipped];
        let y = if flipped.as_bool() { r.y } else { bounds.size.height - r.y - r.h };
        let frame = if r.fill { bounds } else { NSRect::new(NSPoint::new(r.x, y), NSSize::new(r.w, r.h)) };

        let responds = |obj: *mut AnyObject, s: Sel| -> bool {
            let b: Bool = msg_send![obj, respondsToSelector: s];
            b.as_bool()
        };

        if let Some(cls) = AnyClass::get(c"NSGlassEffectView") {
            #[cfg(debug_assertions)]
            eprintln!("glass: NSGlassEffectView {}x{} at ({}, {})", r.w, r.h, r.x, r.y);
            let view: *mut AnyObject = msg_send![cls, alloc];
            let view: *mut AnyObject = msg_send![view, initWithFrame: frame];
            // NSViewWidthSizable (2) | NSViewHeightSizable (16) for the expanded window.
            let mask: usize = if r.fill { 18 } else { 0 };
            let _: () = msg_send![view, setAutoresizingMask: mask];
            if responds(view, sel!(setCornerRadius:)) {
                let _: () = msg_send![view, setCornerRadius: r.radius];
            }
            // NSGlassEffectViewStyle: 0 = regular, 1 = clear.
            if responds(view, sel!(setStyle:)) {
                let _: () = msg_send![view, setStyle: 0isize];
            }
            // NSWindowBelow (-1): under the webview.
            let _: () = msg_send![content, addSubview: view, positioned: -1isize, relativeTo: std::ptr::null_mut::<AnyObject>()];
            let _: () = msg_send![view, release];
            *slot = view as usize;
        } else {
            drop(slot);
            #[cfg(debug_assertions)]
            eprintln!("glass: fallback to NSVisualEffectView");
            use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
            let _ = apply_vibrancy(win, NSVisualEffectMaterial::HudWindow, Some(NSVisualEffectState::Active), Some(r.radius));
        }
    }
}

/// Active: regular (frosted) glass. Not active: clear glass, a lighter blur.
#[cfg(target_os = "macos")]
pub fn set_active(active: bool) {
    use objc2::{msg_send, runtime::{AnyObject, Bool}, sel};
    let slot = GLASS_VIEW.lock().unwrap();
    if *slot == 0 {
        return;
    }
    let view = *slot as *mut AnyObject;
    unsafe {
        let can_style: Bool = msg_send![view, respondsToSelector: sel!(setStyle:)];
        if can_style.as_bool() {
            // NSGlassEffectViewStyle: 0 = regular, 1 = clear.
            let style: isize = if active { 0 } else { 1 };
            let _: () = msg_send![view, setStyle: style];
        }
    }
}

#[cfg(target_os = "macos")]
pub fn set_radius(radius: f64) {
    use objc2::{msg_send, runtime::{AnyObject, Bool}, sel};
    let slot = GLASS_VIEW.lock().unwrap();
    if *slot == 0 {
        return;
    }
    let view = *slot as *mut AnyObject;
    unsafe {
        let ok: Bool = msg_send![view, respondsToSelector: sel!(setCornerRadius:)];
        if ok.as_bool() {
            let _: () = msg_send![view, setCornerRadius: radius];
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub fn set_active(_active: bool) {}
#[cfg(not(target_os = "macos"))]
pub fn set_radius(_radius: f64) {}

#[cfg(not(target_os = "macos"))]
pub fn apply<R: Runtime>(_win: &WebviewWindow<R>, _rect: Option<GlassRect>) {}
