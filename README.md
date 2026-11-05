# Stitch in Time

A pomodoro timer and to-do list for macOS, with Stitch the dog. The window floats on top of other apps and uses frosted glass.

The full behavior is in [docs/SPEC.md](docs/SPEC.md).

## Run in development

1. Install Node 22 or later and Rust (`https://rustup.rs`).
2. Run `npm install`.
3. Run `npm run tauri dev`.

## Test

Run `npm test` for the timer and task rules. Run `npm run check` for type checks.

## Change the session-end sound

Replace `static/sounds/session-end.wav` with your file. Keep the same name, or change the path in `src/lib/native.ts`.

## Release

1. Set the version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
2. Push a tag, for example `git tag v0.1.0 && git push origin v0.1.0`.
3. GitHub Actions builds a universal `.dmg` and makes a draft release.
4. Open the draft on the Releases page and publish it.

The build is not signed. On first launch, macOS blocks it. Open System Settings > Privacy & Security and click Open Anyway, or run:

```bash
xattr -cr "/Applications/Stitch in Time.app"
```

## Where the data is

Tasks are in SQLite and settings are in `settings.json`. Both are in `~/Library/Application Support/com.christinecruz.stitchintime/`. When you delete the app, this data stays.
