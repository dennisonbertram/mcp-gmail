// src/auth/config.ts
// Configuration loader for Gmail OAuth 2.0 credentials
// Checks environment variables first, then falls back to credentials.json file

import { promises as fs } from 'fs';
import { join } from 'path';

export interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface GoogleCredentialsFile {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

/**
 * Load OAuth credentials from environment variables or credentials.json file
 * Priority: Environment variables > credentials.json
 */
export async function loadOAuthCredentials(): Promise<OAuthCredentials> {
  // First, try to load from environment variables
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (envClientId && envClientSecret) {
    return {
      client_id: envClientId,
      client_secret: envClientSecret,
      redirect_uri: envRedirectUri || 'http://localhost:3000/oauth2callback',
    };
  }

  // Fall back to credentials.json file
  try {
    const credentialsPath = join(process.cwd(), 'credentials.json');
    const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
    const credentials: GoogleCredentialsFile = JSON.parse(credentialsContent);

    // Google OAuth credentials can be in 'installed' or 'web' format
    const creds = credentials.installed || credentials.web;

    if (!creds) {
      throw new Error(
        'credentials.json does not contain "installed" or "web" credentials. ' +
        'Please download the credentials file from Google Cloud Console.'
      );
    }

    return {
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      redirect_uri: creds.redirect_uris[0] || 'http://localhost:3000/oauth2callback',
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'Gmail OAuth credentials not configured!\n\n' +
        'Please configure credentials using one of these methods:\n\n' +
        '1. Environment Variables:\n' +
        '   Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and optionally GOOGLE_REDIRECT_URI\n\n' +
        '2. Credentials File:\n' +
        '   Place credentials.json in the project root directory.\n' +
        '   Download this file from Google Cloud Console:\n' +
        '   - Go to https://console.cloud.google.com/apis/credentials\n' +
        '   - Create OAuth 2.0 Client ID (Desktop app type)\n' +
        '   - Download the JSON file and save as credentials.json\n'
      );
    }
    throw error;
  }
}

/**
 * Get the path to the token storage file
 */
export function getTokenPath(): string {
  return join(process.cwd(), '.credentials', 'token.json');
}

/**
 * Get the path to the credentials directory
 */
export function getCredentialsDir(): string {
  return join(process.cwd(), '.credentials');
}
