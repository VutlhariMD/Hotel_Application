import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes, { stripeWebhook } from './routes/payments.js';
import favoriteRoutes from './routes/favorites.js';
import hotelRoutes from './routes/hotel.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import pool from './db/pool.js';
import { rateLimit, securityHeaders } from './middleware/security.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(rateLimit());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) send no Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
        return;
      }
      // Vercel production + preview deployments
      try {
        const host = new URL(origin).hostname;
        if (host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1') {
          callback(null, true);
          return;
        }
      } catch {
        // ignore invalid Origin
      }
      callback(null, false);
    },
  })
);
// Stripe webhooks need the raw body for signature verification.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    void stripeWebhook(req, res);
  }
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: true });
  } catch {
    res.status(500).json({ ok: false, db: false });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/hotel', hotelRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`HHotel API running on http://localhost:${PORT}`);
});
