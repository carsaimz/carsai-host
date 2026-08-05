import type { CapacitorConfig } from '@capacitor/cli';

/**
 * CARSAI HOST -- Capacitor 6 configuration.
 *
 * - appId        : the reverse-DNS bundle identifier used by iOS/Android.
 * - appName      : the human-readable name shown under the app icon.
 * - webDir       : the path to the built web assets (relative to this file).
 *                  In our monorepo the React web app is built into
 *                  packages/web/dist, so we point at ../web/dist.
 * - server.url   : during development we can point Capacitor at the live
 *                  Vite dev server so the webview hot-reloads. In
 *                  production this is omitted and the bundled assets
 *                  from webDir are served.
 */
const config: CapacitorConfig = {
  appId: 'host.carsai.app',
  appName: 'CARSAI HOST',
  webDir: '../web/dist',
  server: {
    // For local dev: uncomment and set to your machine's LAN IP so the
    // device/emulator can reach the Vite dev server (5173).
    // url: 'http://192.168.1.10:5173',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
  ios: {
    backgroundColor: '#0f172a',
    scrollEnabled: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#2563eb',
      sound: 'beep.wav',
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
    },
    BiometricAuth: {
      allowDeviceCredential: true,
    },
  },
};

export default config;
