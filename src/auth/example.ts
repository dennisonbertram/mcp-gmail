// src/auth/example.ts
// Example usage of Gmail authentication system
// Run this file to test authentication: npm run build && node dist/auth/example.js

import { createGmailAuth } from './index.js';

async function main() {
  console.log('=== Gmail Authentication Example ===\n');

  try {
    // Create auth manager
    const authManager = createGmailAuth();

    // Check if already authenticated
    const hasToken = await authManager.hasValidToken();
    console.log(`Has valid token: ${hasToken}\n`);

    // Get authenticated Gmail client
    console.log('Getting Gmail client...');
    const gmail = await authManager.getGmailClient();
    console.log('Gmail client ready!\n');

    // Test API call - get user profile
    console.log('Fetching user profile...');
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log('Email address:', profile.data.emailAddress);
    console.log('Total messages:', profile.data.messagesTotal);
    console.log('Total threads:', profile.data.threadsTotal);
    console.log('\n');

    // Test API call - list recent messages
    console.log('Fetching 5 most recent messages...');
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
    });

    if (messages.data.messages && messages.data.messages.length > 0) {
      console.log(`Found ${messages.data.messages.length} messages:`);
      for (const message of messages.data.messages) {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = details.data.payload?.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const date = headers.find(h => h.name === 'Date')?.value || 'Unknown date';

        console.log(`\n  Message ID: ${message.id}`);
        console.log(`  From: ${from}`);
        console.log(`  Subject: ${subject}`);
        console.log(`  Date: ${date}`);
      }
    } else {
      console.log('No messages found');
    }

    console.log('\n=== Authentication test successful! ===\n');

  } catch (error) {
    console.error('\n=== Error ===');
    console.error((error as Error).message);
    console.error('\nPlease check AUTHENTICATION.md for setup instructions.\n');
    process.exit(1);
  }
}

// Run the example
main();
