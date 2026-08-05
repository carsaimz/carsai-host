/**
 * CARSAI HOST -- Biometric authentication wrapper.
 *
 * Wraps @capacitor-community/biometric-auth so the rest of the app can
 * call a single `biometric.verify()` method. On web, every method
 * resolves to a safe no-op (verification always succeeds with a
 * `web` flag so the caller can branch).
 *
 * Usage:
 *   const result = await biometric.verify({ reason: 'Unlock CARSAI HOST' });
 *   if (result.verified) { ... }
 */
import { BiometricAuth, type BiometricOptions } from '@capacitor-community/biometric-auth';
import { isNativePlatform } from './platform';

export interface BiometricVerifyResult {
  verified: boolean;
  reason: 'biometric' | 'device-credential' | 'web' | 'unavailable';
  message?: string;
}

export const biometric = {
  /** Check whether biometric authentication is available on this device. */
  async isAvailable(): Promise<{
    available: boolean;
    biometryType?: number;
    hasCredentials?: boolean;
  }> {
    if (!isNativePlatform()) {
      return { available: false };
    }
    try {
      const res = await BiometricAuth.checkBiometrics();
      return {
        available: res.isAvailable,
        biometryType: res.biometryType,
        hasCredentials: res.hasCredentials,
      };
    } catch {
      return { available: false };
    }
  },

  /**
   * Trigger the OS biometric prompt and resolve with the result.
   * On web this resolves immediately with `verified: true`.
   */
  async verify(opts: { reason?: string; title?: string } = {}): Promise<BiometricVerifyResult> {
    if (!isNativePlatform()) {
      return { verified: true, reason: 'web' };
    }
    try {
      const biometricOpts: BiometricOptions = {
        reason: opts.reason ?? 'Authenticate to continue',
        title: opts.title ?? 'CARSAI HOST',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
      };
      await BiometricAuth.authenticate(biometricOpts);
      return { verified: true, reason: 'biometric' };
    } catch (err) {
      return {
        verified: false,
        reason: 'unavailable',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },

  /** Inject credentials into the platform's native keystore (Android only). */
  async setCredentials(credentials: {
    username: string;
    password: string;
  }): Promise<boolean> {
    if (!isNativePlatform()) return false;
    try {
      await BiometricAuth.setCredentials({
        username: credentials.username,
        password: credentials.password,
        clientID: 'host.carsai.app',
      });
      return true;
    } catch {
      return false;
    }
  },

  /** Retrieve previously stored credentials (requires biometric prompt). */
  async getCredentials(): Promise<{ username: string; password: string } | null> {
    if (!isNativePlatform()) return null;
    try {
      const res = await BiometricAuth.getCredentials({
        clientID: 'host.carsai.app',
      });
      return { username: res.username, password: res.password };
    } catch {
      return null;
    }
  },

  /** Delete previously stored credentials. */
  async deleteCredentials(): Promise<boolean> {
    if (!isNativePlatform()) return false;
    try {
      await BiometricAuth.deleteCredentials({ clientID: 'host.carsai.app' });
      return true;
    } catch {
      return false;
    }
  },
};
