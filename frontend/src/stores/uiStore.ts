import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  modals: Record<string, boolean>;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  hideNotification: () => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  notification: null,
  modals: {},

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return { theme: newTheme };
    });
  },

  showNotification: (message, type) => set({ notification: { message, type } }),
  hideNotification: () => set({ notification: null }),

  openModal: (modalId) => set((state) => ({ modals: { ...state.modals, [modalId]: true } })),
  closeModal: (modalId) => set((state) => ({ modals: { ...state.modals, [modalId]: false } })),
  toggleModal: (modalId) => set((state) => ({ 
    modals: { ...state.modals, [modalId]: !state.modals[modalId] } 
  })),
}));