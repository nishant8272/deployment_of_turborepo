import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@repo/db/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { loginSchema, registerSchema } from '../validators/auth';

const router: Router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validatedData.error.issues[0]?.message || 'Validation error' } });
      return;
    }

    const { email, password, name } = validatedData.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, error: { code: 'USER_EXISTS', message: 'Email is already registered' } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash
      }
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
});

router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validatedData.error.issues[0]?.message || 'Validation error' } });
      return;
    }

    const { email, password } = validatedData.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
      return;
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name }
      }
    });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
