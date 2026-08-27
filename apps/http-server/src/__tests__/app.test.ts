import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import prisma from '@repo/db/client';

// Mock Prisma
vi.mock('@repo/db/client', () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe('HTTP Server API Tests', () => {
  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /auth/register', () => {
    it('should validate inputs', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'invalid-email', password: '123' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should register a user if valid', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({ id: '1', email: 'test@example.com', name: 'Test' });

      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).not.toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({ email: 'test@example.com' });
    });
  });
});
