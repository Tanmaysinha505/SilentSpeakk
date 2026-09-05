import { create } from 'zustand';

const AUTH_STORAGE_KEY = 'agent44_auth_session';

const VALID_USERS = {
  tanmay: {
    username: 'tanmay',
    password: 'agent44',
    role: 'admin',
    displayName: 'Tanmay (Admin)',
    badge: 'ESP32 HARDWARE ADMIN'
  },
  guest: {
    username: 'guest',
    password: 'guest44',
    role: 'guest',
    displayName: 'Guest Explorer',
    badge: 'SIMULATION GUEST'
  }
};

const getInitialSession = () => {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.username && VALID_USERS[parsed.username]) {
        return VALID_USERS[parsed.username];
      }
    }
  } catch (e) {}
  return null; // Prompt login if no saved session
};

export const useAuthStore = create((set, get) => ({
  currentUser: getInitialSession(),
  loginError: null,

  login: (username, password) => {
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    const userRecord = VALID_USERS[cleanUser];
    if (userRecord && userRecord.password === cleanPass) {
      const authUser = {
        username: userRecord.username,
        role: userRecord.role,
        displayName: userRecord.displayName,
        badge: userRecord.badge
      };

      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } catch (e) {}

      set({ currentUser: authUser, loginError: null });
      return { success: true, user: authUser };
    }

    const errorMsg = 'Invalid username or password. (Use tanmay/agent44 or guest/guest44)';
    set({ loginError: errorMsg });
    return { success: false, message: errorMsg };
  },

  logout: () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {}
    set({ currentUser: null, loginError: null });
  },

  isAdmin: () => get().currentUser?.role === 'admin',
  isGuest: () => get().currentUser?.role === 'guest'
}));
