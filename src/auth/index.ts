// src/auth/index.ts
// Main exports for Gmail authentication module

export { GmailAuthManager, createGmailAuth } from './gmail-auth.js';
export { loadOAuthCredentials, getTokenPath, getCredentialsDir } from './config.js';
export type { OAuthCredentials, GoogleCredentialsFile } from './config.js';
export type { StoredToken } from './gmail-auth.js';
