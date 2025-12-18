const memory = new Map<string, string>();

const trySession = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const tryLocal = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const qcStorage = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;

    const session = trySession();
    if (session) {
      try {
        return session.getItem(key);
      } catch {
        // Bỏ qua lỗi (một số môi trường chặn sessionStorage).
      }
    }

    const local = tryLocal();
    if (local) {
      try {
        return local.getItem(key);
      } catch {
        // Bỏ qua lỗi (một số môi trường chặn localStorage).
      }
    }

    return memory.get(key) ?? null;
  },

  set(key: string, value: string) {
    if (typeof window === 'undefined') return;

    const session = trySession();
    if (session) {
      try {
        session.setItem(key, value);
        return;
      } catch {
        // Bỏ qua lỗi (một số môi trường chặn sessionStorage).
      }
    }

    const local = tryLocal();
    if (local) {
      try {
        local.setItem(key, value);
        return;
      } catch {
        // Bỏ qua lỗi (một số môi trường chặn localStorage).
      }
    }

    memory.set(key, value);
  },

  remove(key: string) {
    if (typeof window === 'undefined') return;

    const session = trySession();
    if (session) {
      try {
        session.removeItem(key);
      } catch {
        // Bỏ qua lỗi.
      }
    }

    const local = tryLocal();
    if (local) {
      try {
        local.removeItem(key);
      } catch {
        // Bỏ qua lỗi.
      }
    }

    memory.delete(key);
  },
};
