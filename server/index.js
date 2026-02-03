const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { ensureAdminUser } = require('./config/seed');
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
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(errorLogger);

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

// Health Check
app.get('/', (req, res) => {
  res.send('Matlance CRM API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = setupSocket(app);

server.listen(PORT, async () => {
  await ensureAdminUser();
  startMailboxSync({ intervalMs: (parseInt(process.env.MAIL_SYNC_MINUTES || '5', 10) * 60 * 1000) || (5 * 60 * 1000) });
  startCampaignRunner({ intervalMs: 30000, batchSize: 20 });
  console.log(`Server running on port ${PORT}`);
});
