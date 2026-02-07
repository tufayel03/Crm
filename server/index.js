const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs/promises');
const jwt = require('jsonwebtoken');
const mongoSanitize = require('express-mongo-sanitize');
const { startUploadsMonitor } = require('./utils/uploadsMonitor');
const connectDB = require('./config/db');
const { ensureAdminUser } = require('./config/seed');
const User = require('./models/User');
const { errorLogger } = require('./middleware/errorLogger');
const { notFound, errorHandler } = require('./middleware/error');
const { startMailboxSync } = require('./services/mailSync');
const { startCampaignRunner } = require('./services/campaignRunner');
const { setupSocket } = require('./socket');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
app.set('trust proxy', 1);

// Security & Performance Middleware
app.use(helmet());
app.use(compression());
app.use(mongoSanitize());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const isLocalNetwork = (origin) => {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(origin);
};

app.use(cors({
  origin: (origin, cb) => {
    if (isDev && isLocalNetwork(origin)) return cb(null, true);
    if (!origin) return cb(null, true);
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(errorLogger);

const getRequestToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  if (req.query && typeof req.query.token === 'string') return req.query.token;
  return null;
};

const uploadsAuth = async (req, res, next) => {
  try {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ message: 'Not authorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(401).json({ message: 'Not authorized' });
    const user = await User.findById(decoded.id).select('_id status');
    if (!user || user.status === 'blocked' || user.status === 'pending') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  } catch {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

app.use('/uploads', uploadsAuth, express.static(path.join(__dirname, 'uploads')));

// Route Imports
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/leads', require('./routes/leadRoutes'));
app.use('/api/v1/clients', require('./routes/clientRoutes'));
app.use('/api/v1/tasks', require('./routes/taskRoutes'));
app.use('/api/v1/meetings', require('./routes/meetingRoutes'));
app.use('/api/v1/campaigns', require('./routes/campaignRoutes'));
app.use('/api/v1/templates', require('./routes/templateRoutes'));
app.use('/api/v1/services', require('./routes/servicePlanRoutes'));
app.use('/api/v1/settings', require('./routes/settingsRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/payments', require('./routes/paymentRoutes'));
app.use('/api/v1/audit', require('./routes/auditRoutes'));
app.use('/api/v1/email', require('./routes/emailRoutes'));
app.use('/api/v1/mailbox', require('./routes/mailboxRoutes'));
app.use('/api/v1/track', require('./routes/trackRoutes'));
app.use('/api/v1/backup', require('./routes/backupRoutes'));
app.use('/api/v1/files', require('./routes/fileManagerRoutes'));

// Health Check
app.get('/', (req, res) => {
  res.send('Matlance CRM API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const { server, io } = setupSocket(app);

// Global Crash Handling
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught Exception:', err);
  try {
    const fs = require('fs');
    const path = require('path');
    fs.appendFileSync(path.join(__dirname, 'sync_debug.log'), `[${new Date().toISOString()}] [CRASH] Uncaught Exception: ${err.stack}\n`);
  } catch (e) { }
  // In dev/nodemon, let it crash so it restarts? Or keep alive?
  // Usually better to log and exit(1) so nodemon restarts.
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH] Unhandled Rejection:', reason);
  try {
    const fs = require('fs');
    const path = require('path');
    fs.appendFileSync(path.join(__dirname, 'sync_debug.log'), `[${new Date().toISOString()}] [CRASH] Unhandled Rejection: ${reason instanceof Error ? reason.stack : reason}\n`);
  } catch (e) { }
  // process.exit(1); // unhandledRejection acts differently in some nodes
});

server.listen(PORT, async () => {
  try {
    await ensureAdminUser();

    // Start Mail Sync (Background Service) with IO
    if (process.env.MAIL_SYNC_ENABLED !== 'false') {
      console.log('Starting Mailbox Sync Service...');
      const intervalSeconds = parseInt(process.env.MAIL_SYNC_SECONDS || '900', 10); // Still keep failsafe interval
      startMailboxSync({ intervalMs: intervalSeconds * 1000, io }).catch(err => { // Pass IO instance
        console.error('[Main] Mailbox Sync Start Failed:', err);
      });
    }

    const campaignRunner = startCampaignRunner({ intervalMs: 30000, batchSize: 20 });
    if (campaignRunner && typeof campaignRunner.catch === 'function') {
      campaignRunner.catch(err => {
        console.error('[Main] Campaign Runner Start Failed:', err);
      });
    }

    const uploadsDir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch {
      // ignore
    }

    const warnGb = parseFloat(process.env.UPLOADS_WARN_GB || '5');
    const checkMinutes = parseInt(process.env.UPLOADS_CHECK_MINUTES || '60', 10);
    startUploadsMonitor({
      uploadsDir,
      warnBytes: warnGb * 1024 * 1024 * 1024,
      intervalMs: checkMinutes * 60 * 1000
    });

    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error('[Main] Server Startup Error:', err);
  }
});
