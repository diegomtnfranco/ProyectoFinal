// stores/websocketStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface WebsocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  subscribe: (event: string, callback: (data: any) => void) => void;
  unsubscribe: (event: string, callback: (data: any) => void) => void;
  joinRoom: (roomName: string, data?: any) => void;  // ← NUEVO
  leaveRoom: (roomName: string, data?: any) => void; // ← NUEVO
}

export const useWebsocketStore = create<WebsocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token: string) => {
    if (get().socket?.connected) return;

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000/', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
    
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  subscribe: (event: string, callback: (data: any) => void) => {
  const { socket } = get();
  if (socket) {
    socket.on(event, (data) => {
      console.log(`📡 [WS] Evento recibido: ${event}`, data);
      callback(data);
    });
  } else {
    console.log(`⚠️ [WS] No hay socket, no se puede suscribir a ${event}`);
  }
},

  unsubscribe: (event: string, callback: (data: any) => void) => {
    const { socket } = get();
    if (socket) {
      socket.off(event, callback);
    }
  },

   // ← NUEVO: Unirse a una sala específica
  joinRoom: (roomName: string, data?: any) => {
    const { socket } = get();
    if (socket) {
      console.log(`🔗 Uniéndose a sala: ${roomName}`);
      socket.emit('subscribe:parking', { parkingLotId: roomName });
    } else {
      console.log(`⚠️ [WS] No hay socket, no se puede unir a sala ${roomName}`);
    }
  },

  // ← NUEVO: Salir de una sala
  leaveRoom: (roomName: string, data?: any) => {
    const { socket } = get();
    if (socket) {
      console.log(`🚪 Saliendo de sala: ${roomName}`);
      socket.emit('unsubscribe:parking', { parkingLotId: roomName });
    }
  },
}));