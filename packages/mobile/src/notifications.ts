/**
 * CARSAI HOST -- Push notification registration wrapper.
 *
 * Wraps @capacitor/push-notifications (FCM on Android, APNs on iOS).
 * On web, all methods are no-ops and `registerForPush` resolves with
 * `token: null`.
 *
 * Usage:
 *   const { token } = await push.registerForPush();
 *   if (token) { await api.post('/devices', { token, platform: push.platform() }); }
 */
import { PushNotifications, type Token, type PushNotificationSchema } from '@capacitor/push-notifications';
import { isNativePlatform, getPlatform } from './platform';

export interface PushListenHandlers {
  onRegistration?: (token: string) => void;
  onRegistrationError?: (err: string) => void;
  onNotification?: (payload: PushNotificationSchema) => void;
  onAction?: (actionId: string, notification: PushNotificationSchema) => void;
}

export const push = {
  /** Returns the runtime platform string ('ios' | 'android' | 'web'). */
  platform(): 'ios' | 'android' | 'web' {
    return getPlatform();
  },

  /**
   * Request permission and register for remote notifications.
   * Resolves with the FCM/APNs token (or null on web / when denied).
   */
  async registerForPush(): Promise<{ token: string | null; granted: boolean }> {
    if (!isNativePlatform()) {
      return { token: null, granted: false };
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        return { token: null, granted: false };
      }

      await PushNotifications.register();

      const token = await new Promise<string | null>((resolve) => {
        let settled = false;
        const done = (t: string | null) => {
          if (!settled) {
            settled = true;
            resolve(t);
          }
        };
        PushNotifications.addListener('registration', (t: Token) => done(t.value));
        PushNotifications.addListener('registrationError', () => done(null));
        // Fallback timeout so the promise does not hang forever.
        setTimeout(() => done(null), 10_000);
      });

      return { token, granted: token !== null };
    } catch {
      return { token: null, granted: false };
    }
  },

  /**
   * Subscribe to push notification events. Returns an unsubscribe
   * function that removes all listeners.
   */
  async listen(handlers: PushListenHandlers): Promise<() => void> {
    if (!isNativePlatform()) {
      return () => undefined;
    }

    const listeners: Array<{ remove: () => void }> = [];
    if (handlers.onRegistration) {
      listeners.push(
        await PushNotifications.addListener('registration', (t: Token) => {
          handlers.onRegistration?.(t.value);
        }),
      );
    }
    if (handlers.onRegistrationError) {
      listeners.push(
        await PushNotifications.addListener('registrationError', (err) => {
          handlers.onRegistrationError?.(String(err));
        }),
      );
    }
    if (handlers.onNotification) {
      listeners.push(
        await PushNotifications.addListener('pushNotificationReceived', (n) => {
          handlers.onNotification?.(n);
        }),
      );
    }
    if (handlers.onAction) {
      listeners.push(
        await PushNotifications.addListener('pushNotificationActionPerformed', (e) => {
          handlers.onAction?.(e.actionId, e.notification);
        }),
      );
    }

    return () => {
      for (const l of listeners) l.remove();
    };
  },

  /** Unregister from remote notifications (FCM/APNs). */
  async unregister(): Promise<void> {
    if (!isNativePlatform()) return;
    await PushNotifications.unregister();
  },

  /**
   * Schedule a local notification (no server round-trip).
   * Useful for reminders (e.g. "your SSL cert expires in 7 days").
   */
  async scheduleLocal(opts: {
    title: string;
    body: string;
    at: Date;
    id?: number;
  }): Promise<number> {
    if (!isNativePlatform()) return -1;
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const id = opts.id ?? Math.floor(Math.random() * 1_000_000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: opts.title,
          body: opts.body,
          schedule: { at: opts.at },
        },
      ],
    });
    return id;
  },
};
