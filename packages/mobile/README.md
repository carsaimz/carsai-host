# @carsai/mobile

Capacitor 6 native shell that wraps the CARSAI HOST React web app
(`@carsai/web`) and exposes native helpers for biometric auth, push
notifications, native share sheet and encrypted on-device storage.

The same React code powers the web, iOS and Android builds. The mobile
package only adds a thin TypeScript layer around Capacitor plugins so
the web app can call a single API (`import { biometric, push, share,
storage } from '@carsai/mobile'`) that degrades gracefully on web.

## Prerequisites

- Node.js 20+ and pnpm 9+
- For iOS: macOS 13+ with Xcode 15+ and CocoaPods
- For Android: Android Studio Hedgehog+ with JDK 17 and the Android SDK
  (platform 34, build-tools 34.0.0)

## Install

```bash
# from the repo root
pnpm install

# build the web app the native shell will load
pnpm --filter @carsai/web build

# install the mobile package deps
pnpm --filter @carsai/mobile install
```

## Add a native platform

Capacitor keeps native projects out of git, so each developer must add
them locally. After the first `cap sync` you commit only the generated
files you actually want to keep (see `.gitignore`).

### iOS

```bash
cd packages/mobile
pnpm cap:add:ios
pnpm cap:sync
pnpm cap:open:ios
```

Xcode will open. Set the signing team in the "Signing & Capabilities"
tab, then pick a simulator or device and press Cmd+R.

### Android

```bash
cd packages/mobile
pnpm cap:add:android
pnpm cap:sync
pnpm cap:open:android
```

Android Studio will open. Pick an emulator or device and press Shift+F10.

## Run on a physical device

1. Make sure your machine and the device are on the same Wi-Fi.
2. Start the API + web dev servers:
   ```bash
   pnpm dev:api      # http://localhost:3000
   pnpm dev:web -- --host 0.0.0.0
   ```
3. In `packages/mobile/capacitor.config.ts`, uncomment the `server.url`
   line and set it to `http://<your-LAN-IP>:5173`.
4. Run `pnpm cap:sync` then build/run from Xcode or Android Studio.

For production builds, remove the `server.url` line so the bundled
assets from `webDir` (`../web/dist`) are served.

## Push notifications

iOS uses APNs and Android uses FCM. To enable:

### iOS

1. In the Apple Developer portal, create an App ID with the Push
   Notifications capability enabled.
2. In Xcode, add the "Push Notifications" and "Background Modes"
   (Remote notifications) capabilities.
3. Upload an APNs auth key to your push backend (or use FCM as a
   unified gateway).

### Android

1. In the Firebase console, create a project and add an Android app
   with package id `host.carsai.app`.
2. Download `google-services.json` and place it in
   `packages/mobile/android/app/`.
3. Register the FCM token returned by `push.registerForPush()` with
   the CARSAI HOST API:
   ```ts
   const { token } = await push.registerForPush();
   if (token) {
     await api.post('/devices', { token, platform: push.platform() });
   }
   ```

## Native helpers

| Helper     | Source file         | Plugin                                  |
| ---------- | ------------------- | --------------------------------------- |
| biometric  | `src/biometric.ts`  | @capacitor-community/biometric-auth     |
| push       | `src/notifications.ts` | @capacitor/push-notifications        |
| storage    | `src/storage.ts`    | @capacitor/preferences + AES-GCM layer  |
| share      | `src/share.ts`      | @capacitor/share                        |
| platform   | `src/platform.ts`   | @capacitor/core                         |

All helpers are safe no-ops on web so you can import them from
`@carsai/web` directly via a conditional re-export.

## Build a release

### iOS

```bash
cd packages/mobile
pnpm cap:sync
pnpm cap:open:ios
# In Xcode: Product -> Archive -> Distribute App
```

### Android

```bash
cd packages/mobile
pnpm cap:sync
pnpm cap:open:android
# In Android Studio: Build -> Generate Signed Bundle / APK
```

The signed APK/AAB will be in
`packages/mobile/android/app/build/outputs/apk/release/`.

## Update native plugins

```bash
pnpm --filter @carsai/mobile update @capacitor/core @capacitor/cli
pnpm cap:sync
```

## Troubleshooting

- **White screen on launch**: run `pnpm --filter @carsai/web build`
  before `cap sync`. The webDir (`../web/dist`) must contain an
  `index.html`.
- **`cap add ios` fails on Linux**: iOS projects can only be created
  on macOS.
- **Push notifications not arriving on Android**: check that
  `google-services.json` is in `android/app/` and that your package id
  matches `host.carsai.app`.
- **Biometric prompt not shown**: call `biometric.isAvailable()` first
  and only call `biometric.verify()` if `available` is true.
