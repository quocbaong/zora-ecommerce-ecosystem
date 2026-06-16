// Helpers cho Web Notification API — show toast hệ thống khi tab ẩn/blur.
// Cần permission của user. Chrome policy: requestPermission chỉ hoạt động khi
// gọi trong user gesture (click/keydown). Nếu gọi từ useEffect mount, popup
// im lặng không hiện. Vì vậy ta đính 1 listener click/keydown lên document
// và chỉ request lần đầu user tương tác.

let permissionPromise: Promise<NotificationPermission> | null = null;
let gestureListenerInstalled = false;

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

async function doRequest(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  if (permissionPromise) return permissionPromise;
  permissionPromise = Notification.requestPermission().finally(() => {
    permissionPromise = null;
  });
  return permissionPromise;
}

/**
 * Đính listener vào user gesture đầu tiên để request quyền notification.
 * Idempotent — gọi nhiều lần chỉ install 1 listener. Tự gỡ sau lần đầu fire.
 */
export function ensurePermission(): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'default') return; // đã quyết rồi, khỏi xin
  if (gestureListenerInstalled) return;
  gestureListenerInstalled = true;

  const handler = () => {
    doRequest();
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler, { once: false });
  document.addEventListener('keydown', handler, { once: false });
}

interface ShowOptions {
  body?: string;
  icon?: string;
  tag?: string; // notifications cùng tag sẽ replace nhau, tránh spam
  onClick?: () => void;
}

export function showBrowserNotification(title: string, opts: ShowOptions = {}): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    const n = new Notification(title, {
      body: opts.body,
      icon: opts.icon || '/favicon.ico',
      tag: opts.tag,
    });
    if (opts.onClick) {
      n.onclick = () => {
        try { window.focus(); } catch { /* ignore */ }
        opts.onClick?.();
        n.close();
      };
    }
    // Tự đóng sau 6s để không đọng trên màn hình
    setTimeout(() => { try { n.close(); } catch { /* ignore */ } }, 6000);
  } catch {
    // ignore — vd: Notification constructor không hoạt động trong service worker context
  }
}

/** Tab/window đang ẩn hoặc không focus — dùng để quyết định có show notification không. */
export function isTabHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || !document.hasFocus();
}
