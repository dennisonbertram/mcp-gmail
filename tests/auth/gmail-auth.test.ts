import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GmailAuthManager, createGmailAuth, StoredToken } from '../../src/auth/gmail-auth.js';

// Mock modules
const mockReadFile = jest.fn<any>();
const mockWriteFile = jest.fn<any>();
const mockUnlink = jest.fn<any>();
const mockMkdir = jest.fn<any>();
const mockAuthenticate = jest.fn<any>();
const mockLoadOAuthCredentials = jest.fn<any>();
const mockGetTokenPath = jest.fn<any>();
const mockGetCredentialsDir = jest.fn<any>();

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  unlink: mockUnlink,
  mkdir: mockMkdir,
}));

// Mock @google-cloud/local-auth
jest.mock('@google-cloud/local-auth', () => ({
  authenticate: mockAuthenticate,
}));

// Mock config module
jest.mock('../../src/auth/config.js', () => ({
  loadOAuthCredentials: mockLoadOAuthCredentials,
  getTokenPath: mockGetTokenPath,
  getCredentialsDir: mockGetCredentialsDir,
}));

describe('Gmail Auth Manager', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set default mock implementations
    mockGetTokenPath.mockReturnValue('/mock/path/token.json');
    mockGetCredentialsDir.mockReturnValue('/mock/path/.credentials');
    mockLoadOAuthCredentials.mockResolvedValue({
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      redirect_uri: 'http://localhost:3000/oauth2callback',
    });
  });

  describe('createGmailAuth', () => {
    it('should create a new GmailAuthManager instance', () => {
      const authManager = createGmailAuth();
      expect(authManager).toBeInstanceOf(GmailAuthManager);
    });
  });

  describe('getAuthClient', () => {
    it('should return existing auth client if already authenticated', async () => {
      const authManager = new GmailAuthManager();

      // Mock a valid stored token
      const storedToken: StoredToken = {
        type: 'authorized_user',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'test-refresh-token',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(storedToken));

      // Get client twice
      const client1 = await authManager.getAuthClient();
      const client2 = await authManager.getAuthClient();

      // Should return the same instance (cached)
      expect(client2).toBe(client1);
    });

    it('should load and validate stored token successfully', async () => {
      const authManager = new GmailAuthManager();

      const storedToken: StoredToken = {
        type: 'authorized_user',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'test-refresh-token',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(storedToken));

      const client = await authManager.getAuthClient();

      expect(client).toBeDefined();
      expect(mockReadFile).toHaveBeenCalledWith('/mock/path/token.json', 'utf-8');
    });

    it('should trigger new auth flow if stored token does not exist', async () => {
      const authManager = new GmailAuthManager();

      // Simulate token file not found
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      // Mock authenticate to return a mock client
      const mockClient = {
        credentials: {
          refresh_token: 'new-refresh-token',
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      const client = await authManager.getAuthClient();

      expect(client).toBeDefined();
      expect(mockAuthenticate).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should trigger new auth flow if stored token is invalid', async () => {
      const authManager = new GmailAuthManager();

      // Return an invalid token
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          type: 'authorized_user',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'invalid-token',
        })
      );

      // Mock new authentication
      const mockClient = {
        credentials: {
          refresh_token: 'new-refresh-token',
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      await authManager.getAuthClient();

      expect(mockAuthenticate).toHaveBeenCalled();
    });
  });

  describe('hasValidToken', () => {
    it('should return true if valid token exists', async () => {
      const authManager = new GmailAuthManager();

      const storedToken: StoredToken = {
        type: 'authorized_user',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'test-refresh-token',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(storedToken));

      const hasValid = await authManager.hasValidToken();

      expect(hasValid).toBe(true);
    });

    it('should return false if token does not exist', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const hasValid = await authManager.hasValidToken();

      expect(hasValid).toBe(false);
    });

    it('should return false if token is invalid', async () => {
      const authManager = new GmailAuthManager();

      mockReadFile.mockResolvedValue('invalid json');

      const hasValid = await authManager.hasValidToken();

      expect(hasValid).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('should revoke token and delete stored file', async () => {
      const authManager = new GmailAuthManager();

      // Set up a mock auth client
      const mockClient = {
        credentials: { refresh_token: 'test-token' },
        revokeCredentials: jest.fn<any>().mockResolvedValue(undefined),
      };

      // Manually set the auth client
      (authManager as any).authClient = mockClient;

      await authManager.revokeToken();

      expect(mockClient.revokeCredentials).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalledWith('/mock/path/token.json');
      expect((authManager as any).authClient).toBeNull();
    });

    it('should handle revoke error gracefully', async () => {
      const authManager = new GmailAuthManager();

      const mockClient = {
        credentials: { refresh_token: 'test-token' },
        revokeCredentials: jest.fn<any>().mockRejectedValue(new Error('Revoke failed')),
      };

      (authManager as any).authClient = mockClient;

      // Should not throw
      await expect(authManager.revokeToken()).resolves.not.toThrow();
    });

    it('should handle file deletion when file does not exist', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockUnlink.mockRejectedValue(error);

      // Should not throw
      await expect(authManager.revokeToken()).resolves.not.toThrow();
    });

    it('should throw error for other file deletion errors', async () => {
      const authManager = new GmailAuthManager();

      const error = new Error('Permission denied');
      mockUnlink.mockRejectedValue(error);

      await expect(authManager.revokeToken()).rejects.toThrow('Permission denied');
    });
  });

  describe('getGmailClient', () => {
    it('should return a Gmail API client', async () => {
      const authManager = new GmailAuthManager();

      const storedToken: StoredToken = {
        type: 'authorized_user',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'test-refresh-token',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(storedToken));

      const gmailClient = await authManager.getGmailClient();

      expect(gmailClient).toBeDefined();
      expect(gmailClient.users).toBeDefined();
    });
  });

  describe('Token Storage', () => {
    it('should save token with correct format', async () => {
      const authManager = new GmailAuthManager();

      // Simulate no existing token
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const mockClient = {
        credentials: {
          refresh_token: 'new-refresh-token',
          access_token: 'access-token',
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      await authManager.getAuthClient();

      expect(mockWriteFile).toHaveBeenCalled();
      const savedData = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(savedData).toEqual({
        type: 'authorized_user',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'new-refresh-token',
      });
    });

    it('should create token directory if it does not exist', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const mockClient = {
        credentials: {
          refresh_token: 'new-refresh-token',
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      await authManager.getAuthClient();

      expect(mockMkdir).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing credentials error', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      mockLoadOAuthCredentials.mockRejectedValue(
        new Error('Gmail OAuth credentials not configured!')
      );

      await expect(authManager.getAuthClient()).rejects.toThrow(
        'Gmail OAuth credentials not configured!'
      );
    });

    it('should handle authentication failure', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      mockAuthenticate.mockRejectedValue(new Error('User denied access'));

      await expect(authManager.getAuthClient()).rejects.toThrow('User denied access');
    });

    it('should handle missing refresh token error', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      // Mock client without refresh token
      const mockClient = {
        credentials: {
          access_token: 'access-token',
          // Missing refresh_token
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      await expect(authManager.getAuthClient()).rejects.toThrow('No refresh token received');
    });
  });

  describe('Token Validation', () => {
    it('should validate token by attempting to get access token', async () => {
      const authManager = new GmailAuthManager();

      const storedToken: StoredToken = {
        type: 'authorized_user',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'valid-refresh-token',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(storedToken));

      const client = await authManager.getAuthClient();

      expect(client).toBeDefined();
    });

    it('should reject expired token that cannot be refreshed', async () => {
      const authManager = new GmailAuthManager();

      const storedToken: StoredToken = {
        type: 'authorized_user',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'expired-refresh-token',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(storedToken));

      // Mock authenticate for new flow
      const mockClient = {
        credentials: {
          refresh_token: 'new-refresh-token',
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      await authManager.getAuthClient();

      // Should trigger new auth flow
      expect(mockAuthenticate).toHaveBeenCalled();
    });
  });

  describe('Temporary Credentials Cleanup', () => {
    it('should clean up temporary credentials file after authentication', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const mockClient = {
        credentials: {
          refresh_token: 'new-refresh-token',
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      await authManager.getAuthClient();

      // Should have attempted to delete temp credentials file
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should ignore cleanup errors for temp credentials file', async () => {
      const authManager = new GmailAuthManager();

      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const mockClient = {
        credentials: {
          refresh_token: 'new-refresh-token',
        },
      };
      mockAuthenticate.mockResolvedValue(mockClient);

      // Make unlink fail
      mockUnlink.mockRejectedValue(new Error('Failed to delete'));

      // Should not throw
      await expect(authManager.getAuthClient()).resolves.toBeDefined();
    });
  });
});
