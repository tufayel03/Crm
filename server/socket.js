const http = require('http');
const { Server } = require('socket.io');

// userId -> Set of socket ids (allow multiple devices per user)
const socketUsers = new Map();

const setupSocket = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    socket.on('user:online', (userId) => {
      if (!userId) return;
      const key = String(userId);
      if (!socketUsers.has(key)) socketUsers.set(key, new Set());
      socketUsers.get(key).add(socket.id);
      socket.data.userId = key;
    });

    // 1:1 calls
    socket.on('call:request', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        targetSocketIds.forEach((id) => io.to(id).emit('call:request', payload));
      }
    });

    socket.on('call:answer', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        targetSocketIds.forEach((id) => io.to(id).emit('call:answer', payload));
      }
    });

    socket.on('call:ice', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        targetSocketIds.forEach((id) => io.to(id).emit('call:ice', payload));
      }
    });

    socket.on('call:end', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        targetSocketIds.forEach((id) => io.to(id).emit('call:end', payload));
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.userId) {
        const key = String(socket.data.userId);
        const set = socketUsers.get(key);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) socketUsers.delete(key);
        }
      }
    });
  });

  return server;
};

module.exports = { setupSocket };
