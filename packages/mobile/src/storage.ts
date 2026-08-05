/**
 * CARSAI HOST -- Encrypted preferences wrapper.
 *
 * Wraps @capacitor/preferences (a thin key-value store backed by
 * UserDefaults on iOS and SharedPreferences on Android) with an
 * AES-GCM encryption layer so secrets like the refresh token are
 * never stored in plain text on disk.
 *
 * The encryption key is derived from the device + a per-install
 * salt using Web Crypto's PBKDF2 (100k iterations, SHA-256).
 *
 * On web, falls back to localStorage (no encryption) so the same API
 * works in the browser during development.
 */
import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from './platform';

const ENC_SALT_KEY = '__carsai_enc_salt__';
const ENC_ITER = 100_000;

let cryptoKeyPromise: Promise<CryptoKey | null> | null = null;

async function getOrCreateSalt(): Promise<Uint8Array> {
  const existing = await Preferences.get({ key: ENC_SALT_KEY });
  if (existing.value) {
    return Uint8Array.from(atob(existing.value), (c) => c.charCodeAt(0));
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await Preferences.set({
    key: ENC_SALT_KEY,
    value: btoa(String.fromCharCode(...salt)),
  });
  return salt;
}

async function getOrCreateKey(): Promise<CryptoKey | null> {
  if (!isNativePlatform() || typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }
  if (cryptoKeyPromise) return cryptoKeyPromise;
  cryptoKeyPromise = (async () => {
    const salt = await getOrCreateSalt();
    // Use a stable-ish device fingerprint as the PBKDF2 password. In a
    // real app you'd combine this with a user-provided PIN.
    const fingerprint = `carsai-host:${navigator.userAgent.slice(0, 64)}`;
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(fingerprint),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ENC_ITER, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  })();
  return cryptoKeyPromise;
}

async function encrypt(plain: string): Promise<string> {
  const key = await getOrCreateKey();
  if (!key) return plain; // web fallback
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(payload: string): Promise<string> {
  const key = await getOrCreateKey();
  if (!key) return payload; // web fallback
  const combined = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export const storage = {
  /** Read a value (decrypted if native). Returns null if missing. */
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    try {
      return await decrypt(value);
    } catch {
      // Decryption can fail if the device fingerprint changed (app
      // reinstall, OS upgrade). In that case, treat the value as lost.
      return null;
    }
  },

  /** Write a value (encrypted if native). */
  async set(key: string, value: string): Promise<void> {
    const enc = await encrypt(value);
    await Preferences.set({ key, value: enc });
  },

  /** Remove a key. */
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },

  /** Clear all CARSAI keys (preserves unrelated keys). */
  async clear(prefix = 'carsai.'): Promise<void> {
    const { keys } = await Preferences.keys();
    for (const k of keys) {
      if (k.startsWith(prefix)) {
        await Preferences.remove({ key: k });
      }
    }
  },
};
