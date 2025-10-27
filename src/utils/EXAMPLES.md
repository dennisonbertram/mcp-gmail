# Gmail Utilities - Usage Examples

This document provides comprehensive examples for using the Gmail utility modules.

## Table of Contents

1. [Error Handler](#error-handler)
2. [MIME Builder](#mime-builder)
3. [Message Parser](#message-parser)
4. [Attachment Handler](#attachment-handler)

---

## Error Handler

The error handler module provides typed error classes and utilities for handling Gmail API errors.

### Basic Error Handling

```typescript
import { handleGmailError, GmailAPIError } from './utils/error-handler.js';
import { gmail_v1, google } from 'googleapis';

async function fetchMessage(gmail: gmail_v1.Gmail, messageId: string) {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });
    return response.data;
  } catch (error) {
    // Convert to typed Gmail error
    const gmailError = handleGmailError(error);

    console.error(`Gmail API Error [${gmailError.code}]: ${gmailError.message}`);
    throw gmailError;
  }
}
```

### Checking Specific Error Types

```typescript
import {
  isRateLimitError,
  isAuthError,
  isPermissionError,
  isNotFoundError,
  GmailRateLimitError,
} from './utils/error-handler.js';

async function sendEmailWithRetry(gmail: gmail_v1.Gmail, params: gmail_v1.Params$Resource$Users$Messages$Send) {
  try {
    return await gmail.users.messages.send(params);
  } catch (error) {
    const gmailError = handleGmailError(error);

    if (isRateLimitError(gmailError)) {
      // Handle rate limit
      const rateLimitError = gmailError as GmailRateLimitError;
      const waitTime = rateLimitError.retryAfter || 60;
      console.log(`Rate limited. Waiting ${waitTime} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      // Retry logic here
    } else if (isAuthError(gmailError)) {
      // Handle authentication error
      console.error('Please re-authenticate');
    } else if (isPermissionError(gmailError)) {
      // Handle permission error
      console.error('Missing required scopes');
    } else if (isNotFoundError(gmailError)) {
      // Handle not found
      console.error('Resource does not exist');
    }

    throw gmailError;
  }
}
```

### Using Error Wrapper

```typescript
import { wrapGmailCall } from './utils/error-handler.js';

// Wrap a function to automatically convert errors
const safeGetMessage = wrapGmailCall(async (gmail: gmail_v1.Gmail, id: string) => {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: id,
  });
  return response.data;
});

// Now all errors are automatically converted to GmailAPIError
try {
  const message = await safeGetMessage(gmail, 'invalid-id');
} catch (error) {
  // error is guaranteed to be GmailAPIError
  console.error(error.message);
}
```

---

## MIME Builder

The MIME builder creates properly formatted email messages for the Gmail API.

### Simple Plain Text Email

```typescript
import { buildPlainTextEmail } from './utils/mime-builder.js';

const encodedMessage = await buildPlainTextEmail(
  'recipient@example.com',
  'sender@example.com',
  'Hello World',
  'This is a plain text email body.'
);

// Send with Gmail API
await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedMessage,
  },
});
```

### HTML Email with Plain Text Fallback

```typescript
import { buildHtmlEmail } from './utils/mime-builder.js';

const htmlBody = `
  <html>
    <body>
      <h1>Welcome!</h1>
      <p>This is an <strong>HTML</strong> email.</p>
    </body>
  </html>
`;

const plainText = 'Welcome!\n\nThis is an HTML email.';

const encodedMessage = await buildHtmlEmail(
  'recipient@example.com',
  'sender@example.com',
  'Welcome Email',
  htmlBody,
  plainText
);

await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedMessage,
  },
});
```

### Email with Multiple Recipients and CC

```typescript
import { buildMimeMessage, EmailParams } from './utils/mime-builder.js';

const emailParams: EmailParams = {
  to: ['user1@example.com', 'user2@example.com'],
  from: { email: 'sender@example.com', name: 'John Doe' },
  cc: ['manager@example.com'],
  bcc: ['archive@example.com'],
  subject: 'Team Update',
  text: 'Here is the team update...',
  html: '<h1>Team Update</h1><p>Here is the team update...</p>',
  replyTo: 'noreply@example.com',
};

const encodedMessage = await buildMimeMessage(emailParams);

await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedMessage,
  },
});
```

### Email with Attachments

```typescript
import { buildMimeMessage } from './utils/mime-builder.js';
import { readFile } from 'fs/promises';

// Load file and encode to base64
const pdfContent = await readFile('./document.pdf');
const base64Pdf = pdfContent.toString('base64');

const emailParams = {
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'Document Attached',
  text: 'Please find the attached document.',
  attachments: [
    {
      filename: 'document.pdf',
      content: base64Pdf,
      contentType: 'application/pdf',
      encoding: 'base64',
    },
  ],
};

const encodedMessage = await buildMimeMessage(emailParams);

await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedMessage,
  },
});
```

### Reply to Email (Threading)

```typescript
import { buildReplyEmail, parseMessage } from './utils/index.js';

// Get original message
const originalResponse = await gmail.users.messages.get({
  userId: 'me',
  id: 'original-message-id',
});

const originalMessage = parseMessage(originalResponse.data);

// Build reply with threading
const encodedReply = await buildReplyEmail(
  originalMessage.messageId!, // Message-ID from original
  originalMessage.references?.[0], // References from original
  {
    to: originalMessage.from!,
    from: 'sender@example.com',
    subject: `Re: ${originalMessage.subject}`,
    text: 'This is my reply...',
  }
);

await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedReply,
    threadId: originalMessage.threadId, // Keep in same thread
  },
});
```

### Validate Email Addresses

```typescript
import { isValidEmail, extractEmail } from './utils/mime-builder.js';

// Validate email format
console.log(isValidEmail('user@example.com')); // true
console.log(isValidEmail('invalid-email')); // false

// Extract email from formatted string
const email = extractEmail('John Doe <john@example.com>');
console.log(email); // 'john@example.com'
```

---

## Message Parser

The message parser extracts and formats Gmail API message responses.

### Parse a Single Message

```typescript
import { parseMessage, messageToText } from './utils/message-parser.js';

// Get message from Gmail API
const response = await gmail.users.messages.get({
  userId: 'me',
  id: 'message-id',
  format: 'full', // Important: use 'full' to get all data
});

// Parse the message
const parsed = parseMessage(response.data);

console.log('Subject:', parsed.subject);
console.log('From:', parsed.from);
console.log('To:', parsed.to);
console.log('Date:', parsed.date);
console.log('Body:', parsed.body.plain || parsed.body.html);
console.log('Attachments:', parsed.attachments.length);

// Get human-readable text representation
const text = messageToText(parsed);
console.log(text);
```

### Parse Multiple Messages

```typescript
import { parseMessages } from './utils/message-parser.js';

// List messages
const listResponse = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 10,
});

// Get full details for each message
const messagePromises = (listResponse.data.messages || []).map(msg =>
  gmail.users.messages.get({
    userId: 'me',
    id: msg.id!,
    format: 'full',
  })
);

const messageResponses = await Promise.all(messagePromises);
const messages = parseMessages(messageResponses.map(r => r.data));

// Process each message
messages.forEach(msg => {
  console.log(`${msg.from}: ${msg.subject}`);
});
```

### Extract Message Body

```typescript
import { getMessageBody, htmlToText } from './utils/message-parser.js';

const parsed = parseMessage(messageData);

// Get best available body (prefers plain text)
const body = getMessageBody(parsed);
console.log(body);

// Convert HTML to text manually
if (parsed.body.html) {
  const text = htmlToText(parsed.body.html);
  console.log(text);
}
```

### Check Message Properties

```typescript
import {
  isUnread,
  isStarred,
  isInInbox,
  isImportant,
  hasAttachments,
  getAllRecipients,
} from './utils/message-parser.js';

const parsed = parseMessage(messageData);

// Check various properties
if (isUnread(parsed)) {
  console.log('This message is unread');
}

if (isStarred(parsed)) {
  console.log('This message is starred');
}

if (isInInbox(parsed)) {
  console.log('This message is in inbox');
}

if (hasAttachments(parsed)) {
  console.log(`Has ${parsed.attachments.length} attachments`);
  parsed.attachments.forEach(att => {
    console.log(`- ${att.filename} (${att.mimeType})`);
  });
}

// Get all recipients
const recipients = getAllRecipients(parsed);
console.log('All recipients:', recipients);
```

### Process Attachments

```typescript
import { parseMessage } from './utils/message-parser.js';

const parsed = parseMessage(messageData);

// Process each attachment
for (const attachment of parsed.attachments) {
  console.log(`Attachment: ${attachment.filename}`);
  console.log(`Type: ${attachment.mimeType}`);
  console.log(`Size: ${attachment.size} bytes`);
  console.log(`ID: ${attachment.attachmentId}`);

  // Download attachment using Gmail API
  const attachmentData = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: parsed.id,
    id: attachment.attachmentId,
  });

  // Now decode with attachment handler (see next section)
}
```

---

## Attachment Handler

The attachment handler manages encoding/decoding of email attachments.

### Download and Save Attachment

```typescript
import {
  decodeAttachment,
  saveAttachment,
  formatBytes,
} from './utils/attachment-handler.js';
import { parseMessage } from './utils/message-parser.js';

// Parse message to get attachment info
const parsed = parseMessage(messageData);

for (const attachmentInfo of parsed.attachments) {
  // Get attachment data from Gmail API
  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: parsed.id,
    id: attachmentInfo.attachmentId,
  });

  // Decode the attachment
  const decoded = decodeAttachment(
    response.data,
    attachmentInfo.filename,
    attachmentInfo.mimeType
  );

  console.log(`Downloaded ${decoded.filename} (${formatBytes(decoded.size)})`);

  // Save to file
  await saveAttachment(decoded, `./downloads/${decoded.filename}`);
}
```

### Encode File for Sending

```typescript
import {
  encodeFileToBase64,
  getMimeTypeFromFilename,
  createAttachmentFromFile,
} from './utils/attachment-handler.js';
import { buildMimeMessage } from './utils/mime-builder.js';

// Method 1: Manual encoding
const base64Data = await encodeFileToBase64('./document.pdf');
const mimeType = getMimeTypeFromFilename('document.pdf');

const emailParams = {
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'Document',
  text: 'See attachment',
  attachments: [
    {
      filename: 'document.pdf',
      content: base64Data,
      contentType: mimeType,
      encoding: 'base64',
    },
  ],
};

// Method 2: Using helper (recommended)
const attachment = await createAttachmentFromFile('./document.pdf');

const emailParams2 = {
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'Document',
  text: 'See attachment',
  attachments: [attachment],
};

const encodedMessage = await buildMimeMessage(emailParams2);
await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedMessage,
  },
});
```

### Validate Attachment Size

```typescript
import {
  isValidAttachmentSize,
  validateTotalAttachmentSize,
  MAX_ATTACHMENT_SIZE,
  formatBytes,
  validateAttachment,
} from './utils/attachment-handler.js';

// Check single file
const fileSize = 30 * 1024 * 1024; // 30MB
if (!isValidAttachmentSize(fileSize)) {
  console.error(
    `File too large: ${formatBytes(fileSize)} exceeds max ${formatBytes(MAX_ATTACHMENT_SIZE)}`
  );
}

// Validate total size
const attachments = [
  { size: 10 * 1024 * 1024 }, // 10MB
  { size: 8 * 1024 * 1024 },  // 8MB
  { size: 5 * 1024 * 1024 },  // 5MB
];

const validation = validateTotalAttachmentSize(attachments);
if (!validation.valid) {
  console.error(validation.message);
} else {
  console.log(`Total size: ${formatBytes(validation.totalSize)}`);
}

// Validate before sending
try {
  const base64Data = await encodeFileToBase64('./file.pdf');
  validateAttachment('file.pdf', base64Data);
  // Safe to send
} catch (error) {
  console.error(error.message);
}
```

### Work with MIME Types

```typescript
import {
  getMimeTypeFromFilename,
  getExtensionFromMimeType,
  isImageMimeType,
  isDocumentMimeType,
  isArchiveMimeType,
  MIME_TYPES,
} from './utils/attachment-handler.js';

// Get MIME type from filename
const mimeType = getMimeTypeFromFilename('photo.jpg');
console.log(mimeType); // 'image/jpeg'

// Get extension from MIME type
const ext = getExtensionFromMimeType('image/jpeg');
console.log(ext); // 'jpg' or 'jpeg'

// Check MIME type category
if (isImageMimeType('image/png')) {
  console.log('This is an image');
}

if (isDocumentMimeType('application/pdf')) {
  console.log('This is a document');
}

if (isArchiveMimeType('application/zip')) {
  console.log('This is an archive');
}

// See all supported MIME types
console.log(MIME_TYPES);
```

### Encode/Decode Base64URL

```typescript
import { encodeBase64Url, decodeBase64Url } from './utils/attachment-handler.js';

// Encode data
const buffer = Buffer.from('Hello, World!');
const encoded = encodeBase64Url(buffer);
console.log(encoded); // Base64URL string (no +, /, or =)

// Decode data
const decoded = decodeBase64Url(encoded);
console.log(decoded.toString()); // 'Hello, World!'
```

---

## Complete Example: Sending Email with Attachments

Here's a complete example combining all utilities:

```typescript
import { google } from 'googleapis';
import {
  buildMimeMessage,
  createAttachmentFromFile,
  handleGmailError,
  isRateLimitError,
  validateTotalAttachmentSize,
} from './utils/index.js';

async function sendEmailWithAttachments(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  body: string,
  attachmentPaths: string[]
) {
  try {
    // Create attachments
    const attachments = await Promise.all(
      attachmentPaths.map(path => createAttachmentFromFile(path))
    );

    // Validate total size
    const validation = validateTotalAttachmentSize(attachments);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Build email
    const encodedMessage = await buildMimeMessage({
      to,
      from: 'me@example.com',
      subject,
      text: body,
      attachments,
    });

    // Send email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Email sent:', response.data.id);
    return response.data;

  } catch (error) {
    const gmailError = handleGmailError(error);

    if (isRateLimitError(gmailError)) {
      console.error('Rate limited. Please try again later.');
    } else {
      console.error('Failed to send email:', gmailError.message);
    }

    throw gmailError;
  }
}

// Usage
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

await sendEmailWithAttachments(
  gmail,
  'recipient@example.com',
  'Report for Q4',
  'Please find attached the quarterly report.',
  ['./report.pdf', './charts.xlsx']
);
```

---

## Complete Example: Reading and Processing Emails

```typescript
import { google } from 'googleapis';
import {
  parseMessage,
  getMessageBody,
  hasAttachments,
  isUnread,
  decodeAttachment,
  saveAttachment,
  handleGmailError,
} from './utils/index.js';

async function processInboxMessages(gmail: gmail_v1.Gmail) {
  try {
    // List unread messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10,
    });

    const messageIds = listResponse.data.messages || [];

    for (const { id } of messageIds) {
      // Get full message
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: id!,
        format: 'full',
      });

      // Parse message
      const message = parseMessage(response.data);

      console.log(`\nFrom: ${message.from}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Date: ${message.date}`);
      console.log(`Body: ${getMessageBody(message).substring(0, 100)}...`);

      // Process attachments
      if (hasAttachments(message)) {
        console.log(`\nAttachments (${message.attachments.length}):`);

        for (const attachment of message.attachments) {
          console.log(`- ${attachment.filename}`);

          // Download attachment
          const attachmentData = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: message.id,
            id: attachment.attachmentId,
          });

          // Decode and save
          const decoded = decodeAttachment(
            attachmentData.data,
            attachment.filename,
            attachment.mimeType
          );

          await saveAttachment(decoded, `./downloads/${decoded.filename}`);
        }
      }

      // Mark as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: message.id,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    }

  } catch (error) {
    const gmailError = handleGmailError(error);
    console.error('Error processing messages:', gmailError.message);
    throw gmailError;
  }
}

// Usage
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
await processInboxMessages(gmail);
```
