import { create } from 'zustand';
import { connectSocket, getSocket } from '../utils/socket';

interface WebsocketState {
  socketConnected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
}

const useWebsocketStore = create<WebsocketState>((set) => ({
  socketConnected: false,
  connect: (token?: string) => {
    const socket = connectSocket(token);
    socket.on('connect', () => set({ socketConnected: true }));
    socket.on('disconnect', () => set({ socketConnected: false }));
    set({ socketConnected: socket.connected });
  },
  disconnect: () => {
    const socket = getSocket();
    socket?.disconnect();
    set({ socketConnected: false });
  }
}));

export default useWebsocketStore;
