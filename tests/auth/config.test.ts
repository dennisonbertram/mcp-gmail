import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  loadOAuthCredentials,
  getTokenPath,
  getCredentialsDir,
  GoogleCredentialsFile,
} from '../../src/auth/config.js';

// Mock fs/promises
const mockReadFile = jest.fn<any>();
jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

describe('Config Loader', () => {
  // Save original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables before each test
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('loadOAuthCredentials', () => {
    describe('Environment Variables (Priority)', () => {
      it('should load credentials from environment variables', async () => {
        process.env.GOOGLE_CLIENT_ID = 'env-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';

        const credentials = await loadOAuthCredentials();

        expect(credentials).toEqual({
          client_id: 'env-client-id',
          client_secret: 'env-client-secret',
          redirect_uri: 'http://localhost:3000/oauth2callback',
        });

        // Should not read credentials.json
        expect(mockReadFile).not.toHaveBeenCalled();
      });

      it('should use custom redirect URI from environment', async () => {
        process.env.GOOGLE_CLIENT_ID = 'env-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
        process.env.GOOGLE_REDIRECT_URI = 'https://example.com/callback';

        const credentials = await loadOAuthCredentials();

        expect(credentials.redirect_uri).toBe('https://example.com/callback');
      });

      it('should use default redirect URI if not specified in environment', async () => {
        process.env.GOOGLE_CLIENT_ID = 'env-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';

        const credentials = await loadOAuthCredentials();

        expect(credentials.redirect_uri).toBe('http://localhost:3000/oauth2callback');
      });

      it('should prioritize environment variables over credentials.json', async () => {
        process.env.GOOGLE_CLIENT_ID = 'env-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';

        // Mock credentials.json (should not be used)
        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'file-client-id',
            client_secret: 'file-client-secret',
            redirect_uris: ['http://localhost:8080'],
          },
        };
        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        expect(credentials.client_id).toBe('env-client-id');
        expect(credentials.client_secret).toBe('env-client-secret');
        expect(mockReadFile).not.toHaveBeenCalled();
      });
    });

    describe('Credentials File (Fallback)', () => {
      it('should load credentials from installed app format', async () => {
        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'installed-client-id',
            client_secret: 'installed-client-secret',
            redirect_uris: ['http://localhost:3000/oauth2callback'],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        expect(credentials).toEqual({
          client_id: 'installed-client-id',
          client_secret: 'installed-client-secret',
          redirect_uri: 'http://localhost:3000/oauth2callback',
        });
      });

      it('should load credentials from web app format', async () => {
        const credentialsFile: GoogleCredentialsFile = {
          web: {
            client_id: 'web-client-id',
            client_secret: 'web-client-secret',
            redirect_uris: ['https://example.com/oauth2callback'],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        expect(credentials).toEqual({
          client_id: 'web-client-id',
          client_secret: 'web-client-secret',
          redirect_uri: 'https://example.com/oauth2callback',
        });
      });

      it('should prefer installed over web format if both exist', async () => {
        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'installed-client-id',
            client_secret: 'installed-client-secret',
            redirect_uris: ['http://localhost:3000/oauth2callback'],
          },
          web: {
            client_id: 'web-client-id',
            client_secret: 'web-client-secret',
            redirect_uris: ['https://example.com/oauth2callback'],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        expect(credentials.client_id).toBe('installed-client-id');
      });

      it('should use first redirect URI from array', async () => {
        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'client-id',
            client_secret: 'client-secret',
            redirect_uris: [
              'http://localhost:3000/callback1',
              'http://localhost:3000/callback2',
            ],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        expect(credentials.redirect_uri).toBe('http://localhost:3000/callback1');
      });

      it('should use default redirect URI if array is empty', async () => {
        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'client-id',
            client_secret: 'client-secret',
            redirect_uris: [],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        expect(credentials.redirect_uri).toBe('http://localhost:3000/oauth2callback');
      });

      it('should read from credentials.json in project root', async () => {
        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'client-id',
            client_secret: 'client-secret',
            redirect_uris: ['http://localhost:3000/oauth2callback'],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        await loadOAuthCredentials();

        expect(mockReadFile).toHaveBeenCalledWith(
          expect.stringContaining('credentials.json'),
          'utf-8'
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw error if credentials.json does not exist', async () => {
        const error: any = new Error('ENOENT: no such file');
        error.code = 'ENOENT';
        mockReadFile.mockRejectedValue(error);

        await expect(loadOAuthCredentials()).rejects.toThrow(
          'Gmail OAuth credentials not configured'
        );
        await expect(loadOAuthCredentials()).rejects.toThrow('Environment Variables');
        await expect(loadOAuthCredentials()).rejects.toThrow('credentials.json');
      });

      it('should throw error if credentials.json is missing installed/web', async () => {
        const invalidFile = {
          some_other_field: 'value',
        };

        mockReadFile.mockResolvedValue(JSON.stringify(invalidFile));

        await expect(loadOAuthCredentials()).rejects.toThrow(
          'does not contain "installed" or "web" credentials'
        );
      });

      it('should throw error if credentials.json is invalid JSON', async () => {
        mockReadFile.mockResolvedValue('invalid json {{{');

        await expect(loadOAuthCredentials()).rejects.toThrow();
      });

      it('should handle file read permission errors', async () => {
        const error = new Error('Permission denied');
        mockReadFile.mockRejectedValue(error);

        await expect(loadOAuthCredentials()).rejects.toThrow('Permission denied');
      });

      it('should provide helpful error message with setup instructions', async () => {
        const error: any = new Error('ENOENT');
        error.code = 'ENOENT';
        mockReadFile.mockRejectedValue(error);

        try {
          await loadOAuthCredentials();
          fail('Should have thrown an error');
        } catch (error) {
          const message = (error as Error).message;
          expect(message).toContain('Environment Variables');
          expect(message).toContain('GOOGLE_CLIENT_ID');
          expect(message).toContain('GOOGLE_CLIENT_SECRET');
          expect(message).toContain('credentials.json');
          expect(message).toContain('Google Cloud Console');
          expect(message).toContain('https://console.cloud.google.com/apis/credentials');
        }
      });
    });

    describe('Edge Cases', () => {
      it('should handle partial environment variables (missing secret)', async () => {
        process.env.GOOGLE_CLIENT_ID = 'env-client-id';
        // Missing GOOGLE_CLIENT_SECRET

        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'file-client-id',
            client_secret: 'file-client-secret',
            redirect_uris: ['http://localhost:3000/oauth2callback'],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        // Should fall back to file since env is incomplete
        expect(credentials.client_id).toBe('file-client-id');
      });

      it('should handle partial environment variables (missing client ID)', async () => {
        process.env.GOOGLE_CLIENT_SECRET = 'env-client-secret';
        // Missing GOOGLE_CLIENT_ID

        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'file-client-id',
            client_secret: 'file-client-secret',
            redirect_uris: ['http://localhost:3000/oauth2callback'],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        // Should fall back to file since env is incomplete
        expect(credentials.client_id).toBe('file-client-id');
      });

      it('should handle empty string environment variables', async () => {
        process.env.GOOGLE_CLIENT_ID = '';
        process.env.GOOGLE_CLIENT_SECRET = '';

        const credentialsFile: GoogleCredentialsFile = {
          installed: {
            client_id: 'file-client-id',
            client_secret: 'file-client-secret',
            redirect_uris: ['http://localhost:3000/oauth2callback'],
          },
        };

        mockReadFile.mockResolvedValue(JSON.stringify(credentialsFile));

        const credentials = await loadOAuthCredentials();

        // Should fall back to file since env vars are empty
        expect(credentials.client_id).toBe('file-client-id');
      });
    });
  });

  describe('getTokenPath', () => {
    it('should return path to token.json in .credentials directory', () => {
      const tokenPath = getTokenPath();

      expect(tokenPath).toContain('.credentials');
      expect(tokenPath).toContain('token.json');
      expect(tokenPath).toMatch(/\.credentials.*token\.json$/);
    });

    it('should return absolute path', () => {
      const tokenPath = getTokenPath();

      expect(tokenPath.startsWith('/')).toBe(true);
    });
  });

  describe('getCredentialsDir', () => {
    it('should return path to .credentials directory', () => {
      const credentialsDir = getCredentialsDir();

      expect(credentialsDir).toContain('.credentials');
      expect(credentialsDir).toMatch(/\.credentials$/);
    });

    it('should return absolute path', () => {
      const credentialsDir = getCredentialsDir();

      expect(credentialsDir.startsWith('/')).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should handle complete OAuth flow paths', async () => {
      // Set up environment
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/oauth2callback';

      const credentials = await loadOAuthCredentials();
      const tokenPath = getTokenPath();
      const credentialsDir = getCredentialsDir();

      expect(credentials).toBeDefined();
      expect(tokenPath).toBeDefined();
      expect(credentialsDir).toBeDefined();
      expect(tokenPath).toContain(credentialsDir);
    });
  });
});
