/**
 * CARSAI HOST -- Native share wrapper.
 *
 * Wraps @capacitor/share to invoke the OS share sheet (iOS UIActivityViewController,
 * Android ACTION_SEND intent). On web, falls back to the Web Share API
 * if available, otherwise copies the text to the clipboard.
 */
import { Share, type ShareOptions } from '@capacitor/share';
import { isNativePlatform } from './platform';

export interface ShareResult {
  shared: boolean;
  via: 'native' | 'web-api' | 'clipboard' | 'unavailable';
  message?: string;
}

export const share = {
  /** Invoke the OS share sheet for the given text/url. */
  async share(opts: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<ShareResult> {
    if (isNativePlatform()) {
      try {
        const shareOpts: ShareOptions = {
          title: opts.title,
          text: opts.text,
          url: opts.url,
          dialogTitle: opts.dialogTitle,
        };
        await Share.share(shareOpts);
        return { shared: true, via: 'native' };
      } catch (err) {
        return {
          shared: false,
          via: 'unavailable',
          message: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // Web fallback: Web Share API, then clipboard.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: opts.title,
          text: opts.text,
          url: opts.url,
        });
        return { shared: true, via: 'web-api' };
      } catch {
        return { shared: false, via: 'unavailable', message: 'User dismissed' };
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const text = [opts.text, opts.url].filter(Boolean).join('\n');
        await navigator.clipboard.writeText(text);
        return { shared: true, via: 'clipboard' };
      } catch {
        return { shared: false, via: 'unavailable', message: 'Clipboard write failed' };
      }
    }

    return { shared: false, via: 'unavailable' };
  },

  /** Check whether the share sheet is available on this platform. */
  async canShare(): Promise<boolean> {
    if (isNativePlatform()) {
      try {
        const res = await Share.canShare();
        return res.value;
      } catch {
        return false;
      }
    }
    return (
      (typeof navigator !== 'undefined' && typeof navigator.share === 'function') ||
      (!!navigator && !!navigator.clipboard)
    );
  },
};
