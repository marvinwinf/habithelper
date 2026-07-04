# HabitHelper

An Android-first personal routines and todo app built with React Native, Expo, and TypeScript. See `docs/PRODUCT_VISION.md` and `docs/MVP_SCOPE.md` for what it is (and isn't), and `TASKS.md` for the implementation plan.

## Releases

A sideloadable Android APK is published after each completed implementation phase (see `docs/RELEASE_PROCESS.md`).

- **Download the latest APK:** [habithelper.apk](https://github.com/marvinwinf/habithelper/releases/latest/download/habithelper.apk)
- **All releases:** [github.com/marvinwinf/habithelper/releases](https://github.com/marvinwinf/habithelper/releases)

These builds are signed with the Android debug keystore — fine for installing on your own device for testing (you may need to allow "install from unknown sources"), not for store distribution.

## Development

```bash
npm install
npm start          # Expo dev server
npm run android    # launch on an Android emulator/device
npm run verify     # typecheck + lint + tests
```

Project documentation lives in `docs/`; contributor rules are in `CLAUDE.md`.
