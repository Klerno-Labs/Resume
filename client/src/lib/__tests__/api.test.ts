import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api';

// Mock fetch
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should send register request with correct data', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          plan: 'free',
          creditsRemaining: 1
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.register('test@example.com', 'password123', 'Test User');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should send login request with correct data', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          plan: 'free',
          creditsRemaining: 1
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.login('test@example.com', 'password123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed login', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      await expect(api.login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });
});
