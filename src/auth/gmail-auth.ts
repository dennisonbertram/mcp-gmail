// src/auth/gmail-auth.ts
// Gmail OAuth 2.0 Authentication Manager
// Handles the complete OAuth flow, token storage, and automatic refresh

import { google } from 'googleapis';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { OAuth2Client } from 'google-auth-library';
import { loadOAuthCredentials, getTokenPath } from './config.js';
import { authenticateWithLogging } from './local-auth-helper.js';

// Gmail API scopes required for full email management
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.settings.basic',
];

export interface StoredToken {
  type: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

/**
 * Gmail Authentication Manager
 * Handles OAuth 2.0 authentication flow, token storage, and automatic refresh
 */
export class GmailAuthManager {
  private authClient: OAuth2Client | null = null;

  /**
   * Get an authenticated OAuth2 client
   * Loads existing token or triggers new OAuth flow if needed
   */
  async getAuthClient(): Promise<OAuth2Client> {
    if (this.authClient) {
      return this.authClient;
    }

    // Try to load existing token
    const tokenPath = getTokenPath();
    try {
      const token = await this.loadStoredToken(tokenPath);
      if (token) {
        this.authClient = token;
        return this.authClient;
      }
    } catch (error) {
      // Token doesn't exist or is invalid, continue to new auth flow
    }

    // Start new OAuth flow
    this.authClient = await this.authenticateNewUser();
    await this.saveToken(this.authClient, tokenPath);

    return this.authClient;
  }

  /**
   * Load and validate a stored token
   * Returns null if token is invalid or expired beyond refresh
   */
  private async loadStoredToken(tokenPath: string): Promise<OAuth2Client | null> {
    try {
      const content = await fs.readFile(tokenPath, 'utf-8');
      const credentials = JSON.parse(content) as StoredToken;

      // Create OAuth2 client with stored credentials
      const { client_id, client_secret, redirect_uri } = await loadOAuthCredentials();

      const auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uri
      );

      auth.setCredentials({
        refresh_token: credentials.refresh_token,
      });

      // Test if token is valid by attempting to refresh it
      try {
        await auth.getAccessToken();
        return auth as unknown as OAuth2Client;
      } catch (error) {
        return null;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // Token file doesn't exist
      }
      throw error;
    }
  }

  /**
   * Perform new OAuth authentication flow
   * Opens browser for user consent
   */
  private async authenticateNewUser(): Promise<OAuth2Client> {
    const credentials = await loadOAuthCredentials();

    try {
      // Use our custom authentication helper with better logging
      const auth = await authenticateWithLogging({
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret,
        redirectUri: credentials.redirect_uri,
        scopes: SCOPES,
      });

      return auth;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save authentication token to disk
   */
  private async saveToken(client: OAuth2Client, tokenPath: string): Promise<void> {
    const credentials = await loadOAuthCredentials();
    const tokens = client.credentials;

    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. This should not happen with a new authorization.');
    }

    const tokenData: StoredToken = {
      type: 'authorized_user',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: tokens.refresh_token,
    };

    // Ensure directory exists
    await fs.mkdir(dirname(tokenPath), { recursive: true });

    // Save token
    await fs.writeFile(tokenPath, JSON.stringify(tokenData, null, 2));
  }

  /**
   * Check if a valid token exists
   */
  async hasValidToken(): Promise<boolean> {
    const tokenPath = getTokenPath();
    try {
      const token = await this.loadStoredToken(tokenPath);
      return token !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke the current token and clear stored credentials
   * Use this to log out or reset authentication
   */
  async revokeToken(): Promise<void> {
    if (this.authClient) {
      try {
        await this.authClient.revokeCredentials();
      } catch (error) {
        // Ignore errors during revocation
      }
    }

    // Delete stored token
    const tokenPath = getTokenPath();
    try {
      await fs.unlink(tokenPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    this.authClient = null;
  }

  /**
   * Get a Gmail API client instance
   * Convenience method that returns a ready-to-use Gmail API client
   */
  async getGmailClient() {
    const auth = await this.getAuthClient();
    return google.gmail({ version: 'v1', auth: auth as any });
  }
}

/**
 * Create a new Gmail authentication manager instance
 */
export function createGmailAuth(): GmailAuthManager {
  return new GmailAuthManager();
}
