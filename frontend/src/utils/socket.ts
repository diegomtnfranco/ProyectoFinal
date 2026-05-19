import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';

let socket: Socket | null = null;

export const connectSocket = (token?: string) => {
  socket = io(env.socketUrl, {
    auth: {
      token
    },
    transports: ['websocket']
  });
  return socket;
};

export const getSocket = () => socket;
