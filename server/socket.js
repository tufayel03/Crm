const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// userId -> Set of socket ids (allow multiple devices per user)
const socketUsers = new Map();

const isLocalNetwork = (origin) => {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(origin);
};

const buildSocketCors = () => {
  const isDev = process.env.NODE_ENV !== 'production';
  const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return {
    origin: (origin, cb) => {
      if (isDev && isLocalNetwork(origin)) return cb(null, true);
      if (!origin) return cb(null, true);
      if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  };
};

const setupSocket = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: buildSocketCors()
  });

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake?.auth?.token;
      const header = socket.handshake?.headers?.authorization || '';
      const bearerToken = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
      const token = authToken || bearerToken;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) return next(new Error('Unauthorized'));
      socket.data.userId = String(decoded.id);
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const key = String(socket.data.userId || '');
    if (key) {
      if (!socketUsers.has(key)) socketUsers.set(key, new Set());
      socketUsers.get(key).add(socket.id);
    }

    // 1:1 calls
    socket.on('call:request', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        const safePayload = { ...(payload || {}), senderId: key };
        targetSocketIds.forEach((id) => io.to(id).emit('call:request', safePayload));
      }
    });

    socket.on('call:answer', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        const safePayload = { ...(payload || {}), senderId: key };
        targetSocketIds.forEach((id) => io.to(id).emit('call:answer', safePayload));
      }
    });

    socket.on('call:ice', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        const safePayload = { ...(payload || {}), senderId: key };
        targetSocketIds.forEach((id) => io.to(id).emit('call:ice', safePayload));
      }
    });

    socket.on('call:end', (payload) => {
      const targetId = String(payload?.targetId || '');
      const targetSocketIds = socketUsers.get(targetId);
      if (targetSocketIds && targetSocketIds.size) {
        const safePayload = { ...(payload || {}), senderId: key };
        targetSocketIds.forEach((id) => io.to(id).emit('call:end', safePayload));
      }
    });

    socket.on('disconnect', () => {
      if (key) {
        const set = socketUsers.get(key);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) socketUsers.delete(key);
        }
      }
    });
  });

  return { server, io };
};

module.exports = { setupSocket };
