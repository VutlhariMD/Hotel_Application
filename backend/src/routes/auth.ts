import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, User } from '../types.js';

const router = Router();

function makeToken(user: Pick<User, 'id' | 'email' | 'name' | 'role'>): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    avatar_url: user.avatar_url || null,
  };
}

function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Name, email, and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query<User>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role, phone, avatar_url`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );

    const user = result.rows[0];
    res.status(201).json({ user: publicUser(user), token: makeToken(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query<User>('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    const user = result.rows[0];
    if (!user?.password) {
      res.status(401).json({
        message: user?.google_id
          ? 'This account uses Google sign-in'
          : 'Invalid email or password',
      });
      return;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    res.json({ user: publicUser(user), token: makeToken(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/google', (_req: Request, res: Response) => {
  if (!googleConfigured()) {
    res.status(503).json({
      message:
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env',
    });
    return;
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const redirectUri = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state: clientUrl,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const oauthError = typeof req.query.error === 'string' ? req.query.error : null;

  if (oauthError || !code) {
    res.redirect(`${clientUrl}/login?error=google_denied`);
    return;
  }

  if (!googleConfigured()) {
    res.redirect(`${clientUrl}/login?error=google_not_configured`);
    return;
  }

  const redirectUri = `${process.env.API_URL || 'http://localhost:5000'}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      res.redirect(`${clientUrl}/login?error=google_token`);
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      res.redirect(`${clientUrl}/login?error=google_token`);
      return;
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) {
      res.redirect(`${clientUrl}/login?error=google_profile`);
      return;
    }

    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };

    if (!profile.email || !profile.id) {
      res.redirect(`${clientUrl}/login?error=google_profile`);
      return;
    }

    const email = profile.email.toLowerCase();
    const existing = await pool.query<User>(
      `SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1`,
      [profile.id, email]
    );

    let user = existing.rows[0];
    if (user) {
      const updated = await pool.query<User>(
        `UPDATE users
         SET google_id = COALESCE(google_id, $1),
             avatar_url = COALESCE($2, avatar_url),
             name = COALESCE(NULLIF($3, ''), name)
         WHERE id = $4
         RETURNING id, name, email, role, phone, avatar_url, google_id`,
        [profile.id, profile.picture || null, profile.name || '', user.id]
      );
      user = updated.rows[0];
    } else {
      const created = await pool.query<User>(
        `INSERT INTO users (name, email, google_id, role, avatar_url)
         VALUES ($1, $2, $3, 'user', $4)
         RETURNING id, name, email, role, phone, avatar_url, google_id`,
        [profile.name || email.split('@')[0], email, profile.id, profile.picture || null]
      );
      user = created.rows[0];
    }

    const token = makeToken(user);
    const payload = encodeURIComponent(JSON.stringify({ user: publicUser(user), token }));
    res.redirect(`${clientUrl}/auth/callback?data=${payload}`);
  } catch (err) {
    console.error(err);
    res.redirect(`${clientUrl}/login?error=google_failed`);
  }
});

router.get('/google/status', (_req: Request, res: Response) => {
  res.json({ enabled: googleConfigured() });
});

router.get('/me', requireAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  try {
    const result = await pool.query<User>(
      `SELECT id, name, email, role, phone, avatar_url FROM users WHERE id = $1`,
      [authed.user.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load user' });
  }
});

router.patch('/profile', requireAuth as never, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { name, email, phone, password, currentPassword } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    currentPassword?: string;
  };

  if (!name?.trim() || !email?.trim()) {
    res.status(400).json({ message: 'Name and email are required' });
    return;
  }

  try {
    const currentResult = await pool.query<User>('SELECT * FROM users WHERE id = $1', [
      authed.user.id,
    ]);
    const current = currentResult.rows[0];
    if (!current) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const nextEmail = email.toLowerCase().trim();
    if (nextEmail !== current.email) {
      const taken = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [
        nextEmail,
        authed.user.id,
      ]);
      if (taken.rows.length) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
    }

    let passwordHash = current.password;
    if (password) {
      if (password.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters' });
        return;
      }
      if (current.password) {
        if (!currentPassword) {
          res.status(400).json({ message: 'Current password is required to set a new one' });
          return;
        }
        const ok = await bcrypt.compare(currentPassword, current.password);
        if (!ok) {
          res.status(401).json({ message: 'Current password is incorrect' });
          return;
        }
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query<User>(
      `UPDATE users
       SET name = $1, email = $2, phone = $3, password = $4
       WHERE id = $5
       RETURNING id, name, email, role, phone, avatar_url`,
      [name.trim(), nextEmail, phone?.trim() || null, passwordHash, authed.user.id]
    );

    const user = result.rows[0];
    res.json({ user: publicUser(user), token: makeToken(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

export default router;
