#!/usr/bin/env node
/**
 * Gmail MCP Server - Authentication Setup Script
 *
 * This script performs the OAuth 2.0 authentication flow with Google Gmail API.
 * It will:
 * 1. Open your browser for Google account login
 * 2. Request Gmail permissions
 * 3. Save the authentication token to .credentials/token.json
 *
 * Run this once to authenticate, then the token will be automatically refreshed.
 */

import { createGmailAuth } from '../auth/index.js';

console.log('\n🔐 Gmail MCP Server - Authentication Setup\n');
console.log('This will open your browser to authenticate with Google Gmail API.');
console.log('Please sign in and grant the requested permissions.\n');

async function authenticate() {
  try {
    // Create auth manager
    const authManager = createGmailAuth();

    console.log('Starting authentication flow...\n');

    // Get authenticated client (this will trigger browser auth if needed)
    const gmail = await authManager.getGmailClient();

    // Verify authentication by getting user profile
    console.log('✓ Authentication successful!\n');
    console.log('Testing Gmail API access...\n');

    const profile = await gmail.users.getProfile({ userId: 'me' });

    console.log('✓ Gmail API access verified!');
    console.log(`\n📧 Authenticated as: ${profile.data.emailAddress}`);
    console.log(`   Messages: ${profile.data.messagesTotal}`);
    console.log(`   Threads: ${profile.data.threadsTotal}`);

    console.log('\n✅ Authentication complete!');
    console.log('\nYour token has been saved to .credentials/token.json');
    console.log('You can now start the MCP server with: npm start\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Authentication failed!\n');

    if (error instanceof Error) {
      console.error('Error:', error.message);

      if (error.message.includes('ENOENT') || error.message.includes('credentials')) {
        console.error('\n💡 Setup required:');
        console.error('   1. Create a Google Cloud project');
        console.error('   2. Enable the Gmail API');
        console.error('   3. Create OAuth 2.0 credentials (Desktop app)');
        console.error('   4. Either:');
        console.error('      - Download credentials.json to project root, OR');
        console.error('      - Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
        console.error('\nSee QUICKSTART.md or AUTHENTICATION.md for detailed setup instructions.\n');
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

authenticate();
