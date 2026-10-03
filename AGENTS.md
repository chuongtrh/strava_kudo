# Repository Guidelines

## Project Structure & Module Organization

This is a dependency-free Chrome Manifest V3 extension. Files live at the repository root:

- `manifest.json` declares Strava URL matches, permissions, scripts, styles, and icons.
- `content.js` contains dashboard/profile detection, DOM injection, kudos actions, notifications, and ignore-list persistence.
- `styles.css` styles injected buttons, notifications, and the ignore-list modal.
- `icon16.png`, `icon48.png`, and `icon128.png` are extension assets.
- `README.md` documents installation and user-facing behavior.

Keep related DOM logic in small functions inside `content.js`. Add new root-level files only when they are referenced by the manifest or documentation.

## Build, Test, and Development Commands

There is no package manager, compilation step, or generated output. Develop directly against the source files.

- `python3 -m json.tool manifest.json >/dev/null` validates manifest JSON syntax.
- `git diff --check` detects whitespace errors before committing.
- In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this repository. After edits, click the extension's reload button and refresh Strava.

## Coding Style & Naming Conventions

Use four-space indentation and single quotes in JavaScript; use two-space indentation in CSS. Follow existing JavaScript naming: `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for constants, and descriptive action-oriented function names such as `createKudoButton`. Use kebab-case for CSS classes and DOM IDs, prefixed where practical with `kudo-` or `ignore-`. Preserve the IIFE and strict mode so content-script variables do not leak globally. No formatter or linter is configured, so match surrounding code closely.

## Testing Guidelines

No automated test framework or coverage threshold currently exists. Manually test both supported routes: `/dashboard` and `/athletes/<id>`. Verify initial injection, dynamically loaded activities, already-kudoed items, ignore-list add/remove persistence, empty states, and repeated extension reloads without duplicate controls. Check DevTools for errors and confirm unrelated Strava controls still work.

## Commit & Pull Request Guidelines

History favors short subjects such as `update readme`, with newer work using `feat:`. Prefer concise imperative Conventional Commit-style subjects, for example `fix: avoid duplicate ignore buttons`. Keep commits focused. Pull requests should explain the user-visible change, list manual test routes and results, link any issue, and include screenshots or a short recording for UI changes. Call out manifest permission or URL-match changes explicitly.

## Security & Configuration Tips

Keep permissions minimal and scoped to Strava. Do not commit credentials or collect user data. Continue storing the ignore list locally, and treat Strava DOM selectors as unstable integration points that require manual verification.
