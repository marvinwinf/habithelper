# Release Process

## Per-phase APK releases

After the final task of an implementation phase (per `TASKS.md`) is completed, merged/pushed, and green on `npm run verify`, an updated installable Android APK is published:

1. Trigger the `Android APK` workflow for the commit that completes the phase, either way:

   ```bash
   # a) push a tag (requires direct tag-push access):
   git tag apk-phase-<n>
   git push origin apk-phase-<n>

   # b) or dispatch the workflow on the phase's branch/commit with the
   #    release_tag input set to apk-phase-<n> (requires the workflow to
   #    exist on the default branch — true once the first phase branch
   #    carrying it has been merged):
   gh workflow run android-apk.yml --ref <branch> -f release_tag=apk-phase-<n>

   # c) or, from environments that can push neither tags nor to main
   #    (e.g. Claude Code sessions before the workflow reaches main),
   #    push an empty commit to the working branch whose message contains
   #    the marker:
   git commit --allow-empty -m "chore: build phase APK [build-apk apk-phase-<n>]"
   git push origin <branch>
   ```

2. The workflow (`.github/workflows/android-apk.yml`) builds the app (`expo prebuild` + Gradle `assembleRelease`) and attaches `habithelper.apk` to a GitHub Release named after the tag (creating the tag itself in the dispatch case).

3. Verify the workflow run succeeded and the release contains the APK. No README change is needed per release: the README's download link uses `releases/latest/download/habithelper.apk`, which always points at the newest release's asset.

Tag names: `apk-phase-2`, `apk-phase-3`, … Intermediate/preview builds may use a suffix (e.g. `apk-phase-2-preview`); they are ordinary releases too, so the "latest" link picks them up.

## Build characteristics

- The APK is a release build **signed with the Android debug keystore** (Expo prebuild's default). It installs on real devices for manual testing but is not store-distributable.
- Proper release signing, versioning scheme, and the dev-route exclusion check are handled by T060 in Phase 10 and will replace the signing part of this process when they land.
- The native `android/` directory is generated fresh on CI by `expo prebuild` and is never committed (`.gitignore`).

## Verification checklist per release

- [ ] Workflow run green.
- [ ] Release exists for the tag with `habithelper.apk` attached.
- [ ] APK installs and launches on an Android device/emulator (`adb install habithelper.apk`).
