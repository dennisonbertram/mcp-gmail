import { describe, it, expect } from '@jest/globals';
import {
  handleGmailError,
  GmailAPIError,
  GmailAuthError,
  GmailPermissionError,
  GmailNotFoundError,
  GmailRateLimitError,
  isAuthError,
  isPermissionError,
  isNotFoundError,
  isRateLimitError,
  wrapGmailCall,
} from '../../src/utils/error-handler.js';

describe('Error Handler', () => {
  describe('handleGmailError', () => {
    it('should handle 401 authentication errors', () => {
      const mockError = {
        response: {
          status: 401,
          data: { error: { message: 'Invalid credentials' } },
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAuthError);
      expect(result.code).toBe(401);
      expect(result.message).toContain('Authentication required');
      expect(result.message).toContain('valid credentials');
    });

    it('should handle 403 permission errors with scope suggestions', () => {
      const mockError = {
        response: {
          status: 403,
          data: { error: { message: 'Insufficient permissions' } },
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailPermissionError);
      expect(result.code).toBe(403);
      expect(result.message).toContain('Permission denied');
      expect(result.message).toContain('gmail.readonly');
      expect(result.message).toContain('gmail.send');
      expect(result.message).toContain('gmail.modify');
    });

    it('should handle 404 not found errors', () => {
      const mockError = {
        response: {
          status: 404,
          data: { error: { message: 'Message not found' } },
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailNotFoundError);
      expect(result.code).toBe(404);
      expect(result.message).toContain('Resource not found');
      expect(result.message).toContain('invalid or deleted');
    });

    it('should handle 429 rate limit errors with retry-after', () => {
      const mockError = {
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } },
          headers: { 'retry-after': '60' },
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailRateLimitError);
      expect(result.code).toBe(429);
      expect(result.message).toContain('Rate limit exceeded');
      expect(result.message).toContain('retry after 60 seconds');
      expect((result as GmailRateLimitError).retryAfter).toBe(60);
    });

    it('should handle 429 rate limit errors without retry-after', () => {
      const mockError = {
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } },
          headers: {},
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailRateLimitError);
      expect(result.code).toBe(429);
      expect(result.message).toContain('exponential backoff');
      expect((result as GmailRateLimitError).retryAfter).toBeUndefined();
    });

    it('should handle 500 server errors', () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } },
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAPIError);
      expect(result.code).toBe(500);
      expect(result.message).toContain('Gmail API server error');
      expect(result.message).toContain('temporary issue');
    });

    it('should handle 503 service unavailable errors', () => {
      const mockError = {
        response: {
          status: 503,
          data: { error: { message: 'Service unavailable' } },
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAPIError);
      expect(result.code).toBe(503);
      expect(result.message).toContain('service unavailable');
    });

    it('should handle 400 bad request errors', () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: { message: 'Invalid query' } },
        },
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAPIError);
      expect(result.code).toBe(400);
      expect(result.message).toContain('Invalid request');
    });

    it('should handle network errors (ENOTFOUND)', () => {
      const mockError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND gmail.googleapis.com',
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAPIError);
      expect(result.code).toBe(0);
      expect(result.message).toContain('Network error');
      expect(result.message).toContain('check your internet connection');
    });

    it('should handle network errors (ECONNREFUSED)', () => {
      const mockError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAPIError);
      expect(result.code).toBe(0);
      expect(result.message).toContain('Network error');
    });

    it('should handle unknown errors with error objects', () => {
      const mockError = new Error('Something went wrong');

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAPIError);
      expect(result.code).toBe(0);
      expect(result.message).toContain('Unexpected error');
      expect(result.message).toContain('Something went wrong');
    });

    it('should handle unknown errors with string', () => {
      const result = handleGmailError('string error');

      expect(result).toBeInstanceOf(GmailAPIError);
      expect(result.code).toBe(0);
      expect(result.message).toContain('Unexpected error');
    });

    it('should handle errors without response data', () => {
      const mockError = {
        response: {
          status: 401,
        },
        message: 'Authentication failed',
      };

      const result = handleGmailError(mockError);

      expect(result).toBeInstanceOf(GmailAuthError);
      expect(result.message).toContain('Authentication required');
    });

    it('should preserve original error in originalError property', () => {
      const mockError = {
        response: {
          status: 404,
          data: { error: { message: 'Not found' } },
        },
      };

      const result = handleGmailError(mockError);

      expect(result.originalError).toBe(mockError);
    });
  });

  describe('Type Guard Functions', () => {
    describe('isAuthError', () => {
      it('should identify GmailAuthError instances', () => {
        const error = new GmailAuthError('Auth failed');
        expect(isAuthError(error)).toBe(true);
      });

      it('should identify errors with code 401', () => {
        const error = { code: 401, message: 'Unauthorized' };
        expect(isAuthError(error)).toBe(true);
      });

      it('should return false for non-auth errors', () => {
        const error = new GmailNotFoundError('Not found');
        expect(isAuthError(error)).toBe(false);
      });

      it('should return false for errors without code', () => {
        const error = new Error('Generic error');
        expect(isAuthError(error)).toBe(false);
      });
    });

    describe('isPermissionError', () => {
      it('should identify GmailPermissionError instances', () => {
        const error = new GmailPermissionError('Permission denied');
        expect(isPermissionError(error)).toBe(true);
      });

      it('should identify errors with code 403', () => {
        const error = { code: 403, message: 'Forbidden' };
        expect(isPermissionError(error)).toBe(true);
      });

      it('should return false for non-permission errors', () => {
        const error = new GmailAuthError('Auth failed');
        expect(isPermissionError(error)).toBe(false);
      });
    });

    describe('isNotFoundError', () => {
      it('should identify GmailNotFoundError instances', () => {
        const error = new GmailNotFoundError('Not found');
        expect(isNotFoundError(error)).toBe(true);
      });

      it('should identify errors with code 404', () => {
        const error = { code: 404, message: 'Not found' };
        expect(isNotFoundError(error)).toBe(true);
      });

      it('should return false for non-not-found errors', () => {
        const error = new GmailAuthError('Auth failed');
        expect(isNotFoundError(error)).toBe(false);
      });
    });

    describe('isRateLimitError', () => {
      it('should identify GmailRateLimitError instances', () => {
        const error = new GmailRateLimitError('Rate limited', 60);
        expect(isRateLimitError(error)).toBe(true);
      });

      it('should identify errors with code 429', () => {
        const error = { code: 429, message: 'Rate limit exceeded' };
        expect(isRateLimitError(error)).toBe(true);
      });

      it('should return false for non-rate-limit errors', () => {
        const error = new GmailAuthError('Auth failed');
        expect(isRateLimitError(error)).toBe(false);
      });
    });
  });

  describe('wrapGmailCall', () => {
    it('should return result from successful function call', async () => {
      const successFn = async (a: number, b: number) => a + b;
      const wrapped = wrapGmailCall(successFn);

      const result = await wrapped(2, 3);

      expect(result).toBe(5);
    });

    it('should wrap errors from failed function calls', async () => {
      const failFn = async () => {
        const error: any = new Error('API error');
        error.response = {
          status: 404,
          data: { error: { message: 'Not found' } },
        };
        throw error;
      };

      const wrapped = wrapGmailCall(failFn);

      await expect(wrapped()).rejects.toThrow(GmailNotFoundError);
    });

    it('should handle function with multiple parameters', async () => {
      const multiFn = async (a: string, b: number, c: boolean) => {
        return `${a}-${b}-${c}`;
      };

      const wrapped = wrapGmailCall(multiFn);
      const result = await wrapped('test', 42, true);

      expect(result).toBe('test-42-true');
    });

    it('should preserve error details when wrapping', async () => {
      const failFn = async () => {
        const error: any = new Error('Rate limited');
        error.response = {
          status: 429,
          data: { error: { message: 'Too many requests' } },
          headers: { 'retry-after': '30' },
        };
        throw error;
      };

      const wrapped = wrapGmailCall(failFn);

      try {
        await wrapped();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(GmailRateLimitError);
        expect((error as GmailRateLimitError).retryAfter).toBe(30);
      }
    });
  });

  describe('Error Class Properties', () => {
    it('should create GmailAPIError with correct properties', () => {
      const error = new GmailAPIError('Test error', 400);

      expect(error.name).toBe('GmailAPIError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(400);
      expect(error.originalError).toBeUndefined();
      expect(error.stack).toBeDefined();
    });

    it('should create GmailAuthError with correct properties', () => {
      const originalError = new Error('Original');
      const error = new GmailAuthError('Auth error', originalError);

      expect(error.name).toBe('GmailAuthError');
      expect(error.message).toBe('Auth error');
      expect(error.code).toBe(401);
      expect(error.originalError).toBe(originalError);
    });

    it('should create GmailRateLimitError with retryAfter', () => {
      const error = new GmailRateLimitError('Rate limited', 120);

      expect(error.name).toBe('GmailRateLimitError');
      expect(error.code).toBe(429);
      expect(error.retryAfter).toBe(120);
    });

    it('should create GmailRateLimitError without retryAfter', () => {
      const error = new GmailRateLimitError('Rate limited');

      expect(error.name).toBe('GmailRateLimitError');
      expect(error.retryAfter).toBeUndefined();
    });
  });
});
