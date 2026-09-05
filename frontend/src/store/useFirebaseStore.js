import { create } from 'zustand';
import { firebaseService, isFirebaseConfigured } from '../services/firebase.js';

export const useFirebaseStore = create((set, get) => ({
  userId: null,
  isConfigured: isFirebaseConfigured,
  cloudGestures: [],

  setUserId: (uid) => set({ userId: uid }),
  setCloudGestures: (gestures) => set({ cloudGestures: gestures }),

  saveMode: async (mode) => {
    const uid = get().userId;
    if (uid) {
      try {
        await firebaseService.saveCustomGesture(uid, mode, {});
      } catch (e) {}
    }
  },
}));

// Initialize auth listener
firebaseService.subscribeAuth((user) => {
  if (user) {
    useFirebaseStore.getState().setUserId(user.uid);
  }
});
