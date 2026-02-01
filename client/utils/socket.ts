import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;
  return '';
};

export const connectSocket = (userId: string) => {
  const url = getSocketUrl();
  if (!url) return null;
  if (socket) return socket;
  socket = io(url, { transports: ['websocket'] });
  socket.on('connect', () => {
    socket?.emit('user:online', userId);
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
