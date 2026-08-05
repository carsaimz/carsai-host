/**
 * CARSAI HOST -- Mobile native helpers (entry point).
 *
 * Re-exports the mobile-specific wrappers so the web app can import a
 * single entry point: `import { biometric, push, share, storage,
 * isNativePlatform } from '@carsai/mobile'`. On web (non-Capacitor)
 * builds these wrappers are safe no-ops so the same code can be shared
 * between web and mobile.
 */
export * from './biometric';
export * from './notifications';
export * from './storage';
export * from './share';
export * from './platform';
