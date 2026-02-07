import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;

const getSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;
  return window.location.origin;
};

export const connectSocket = (_userId: string) => {
  const url = getSocketUrl();
  if (!url) return null;
  if (socket) return socket;
  const token = getAuthToken();
  if (!token) return null;
  socket = io(url, {
    transports: ['websocket'],
    auth: { token }
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
