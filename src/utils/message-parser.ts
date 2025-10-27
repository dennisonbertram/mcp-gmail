// src/utils/message-parser.ts
// Parser for Gmail API message responses

import { gmail_v1 } from 'googleapis';

/**
 * Parsed email message interface
 */
export interface ParsedMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId?: string;
  internalDate?: string;
  sizeEstimate?: number;
  subject?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  date?: string;
  replyTo?: string;
  messageId?: string;
  references?: string[];
  inReplyTo?: string;
  body: {
    plain?: string;
    html?: string;
  };
  attachments: AttachmentInfo[];
}

/**
 * Attachment information
 */
export interface AttachmentInfo {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

/**
 * Header value lookup helper
 */
function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;
  const header = headers.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return header?.value || undefined;
}

/**
 * Extracts multiple email addresses from a header value
 */
function parseEmailList(headerValue: string | undefined): string[] {
  if (!headerValue) return [];

  // Split by comma and clean up each address
  return headerValue
    .split(',')
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0);
}

/**
 * Decodes base64 or base64url encoded string
 */
function decodeBase64(encoded: string | undefined | null): string {
  if (!encoded) return '';

  try {
    // Convert base64url to base64
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Decode
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    // Return empty string on decode failure
    return '';
  }
}

/**
 * Recursively extracts message parts (body and attachments)
 */
function extractParts(
  parts: gmail_v1.Schema$MessagePart[] | undefined,
  result: {
    plainBody: string;
    htmlBody: string;
    attachments: AttachmentInfo[];
  }
): void {
  if (!parts) return;

  for (const part of parts) {
    const mimeType = part.mimeType || '';
    const filename = part.filename || '';

    // Handle text/plain parts
    if (mimeType === 'text/plain' && part.body?.data) {
      result.plainBody += decodeBase64(part.body.data);
    }

    // Handle text/html parts
    else if (mimeType === 'text/html' && part.body?.data) {
      result.htmlBody += decodeBase64(part.body.data);
    }

    // Handle attachments (has filename and attachmentId)
    else if (filename && part.body?.attachmentId) {
      result.attachments.push({
        filename: filename,
        mimeType: mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }

    // Recursively process nested parts (multipart messages)
    if (part.parts) {
      extractParts(part.parts, result);
    }
  }
}

/**
 * Parses a Gmail API message response into a clean, readable format
 * @param message - Gmail API message object
 * @returns Parsed message with all relevant fields
 */
export function parseMessage(
  message: gmail_v1.Schema$Message
): ParsedMessage {
  if (!message.id || !message.threadId) {
    throw new Error('Invalid message: missing id or threadId');
  }

  const headers = message.payload?.headers;

  // Extract headers
  const subject = getHeader(headers, 'Subject');
  const from = getHeader(headers, 'From');
  const to = parseEmailList(getHeader(headers, 'To'));
  const cc = parseEmailList(getHeader(headers, 'Cc'));
  const bcc = parseEmailList(getHeader(headers, 'Bcc'));
  const date = getHeader(headers, 'Date');
  const replyTo = getHeader(headers, 'Reply-To');
  const messageId = getHeader(headers, 'Message-ID');
  const inReplyTo = getHeader(headers, 'In-Reply-To');
  const referencesHeader = getHeader(headers, 'References');
  const references = referencesHeader
    ? referencesHeader.split(/\s+/).filter(ref => ref.length > 0)
    : undefined;

  // Extract body and attachments
  const bodyData = {
    plainBody: '',
    htmlBody: '',
    attachments: [] as AttachmentInfo[],
  };

  // Handle single-part message (body directly in payload)
  if (message.payload?.body?.data) {
    const mimeType = message.payload.mimeType || '';
    const decoded = decodeBase64(message.payload.body.data);

    if (mimeType === 'text/plain') {
      bodyData.plainBody = decoded;
    } else if (mimeType === 'text/html') {
      bodyData.htmlBody = decoded;
    }
  }

  // Handle multi-part message
  if (message.payload?.parts) {
    extractParts(message.payload.parts, bodyData);
  }

  const result: ParsedMessage = {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds || [],
    snippet: message.snippet || '',
    body: {},
    attachments: bodyData.attachments,
  };

  // Set optional fields only if they have values
  if (message.historyId) result.historyId = message.historyId;
  if (message.internalDate) result.internalDate = message.internalDate;
  if (message.sizeEstimate !== undefined && message.sizeEstimate !== null) result.sizeEstimate = message.sizeEstimate;
  if (subject) result.subject = subject;
  if (from) result.from = from;
  if (to.length > 0) result.to = to;
  if (cc.length > 0) result.cc = cc;
  if (bcc.length > 0) result.bcc = bcc;
  if (date) result.date = date;
  if (replyTo) result.replyTo = replyTo;
  if (messageId) result.messageId = messageId;
  if (references) result.references = references;
  if (inReplyTo) result.inReplyTo = inReplyTo;
  if (bodyData.plainBody) result.body.plain = bodyData.plainBody;
  if (bodyData.htmlBody) result.body.html = bodyData.htmlBody;

  return result;
}

/**
 * Parses multiple messages
 * @param messages - Array of Gmail API message objects
 * @returns Array of parsed messages
 */
export function parseMessages(
  messages: gmail_v1.Schema$Message[]
): ParsedMessage[] {
  return messages.map(parseMessage);
}

/**
 * Gets a simple text representation of a message (for display)
 * @param message - Parsed message
 * @returns Human-readable text representation
 */
export function messageToText(message: ParsedMessage): string {
  const lines: string[] = [];

  lines.push(`Message ID: ${message.id}`);
  lines.push(`Thread ID: ${message.threadId}`);

  if (message.subject) {
    lines.push(`Subject: ${message.subject}`);
  }

  if (message.from) {
    lines.push(`From: ${message.from}`);
  }

  if (message.to && message.to.length > 0) {
    lines.push(`To: ${message.to.join(', ')}`);
  }

  if (message.cc && message.cc.length > 0) {
    lines.push(`Cc: ${message.cc.join(', ')}`);
  }

  if (message.date) {
    lines.push(`Date: ${message.date}`);
  }

  if (message.labelIds.length > 0) {
    lines.push(`Labels: ${message.labelIds.join(', ')}`);
  }

  lines.push('');
  lines.push('--- Body ---');
  lines.push(message.body.plain || message.snippet || '(No text content)');

  if (message.attachments.length > 0) {
    lines.push('');
    lines.push('--- Attachments ---');
    message.attachments.forEach(att => {
      lines.push(`- ${att.filename} (${att.mimeType}, ${formatBytes(att.size)})`);
    });
  }

  return lines.join('\n');
}

/**
 * Formats bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Extracts plain text from HTML body
 * @param html - HTML content
 * @returns Plain text content
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
}

/**
 * Gets the best available body content (prefers plain text)
 * @param message - Parsed message
 * @returns Body content as plain text
 */
export function getMessageBody(message: ParsedMessage): string {
  if (message.body.plain) {
    return message.body.plain;
  }

  if (message.body.html) {
    return htmlToText(message.body.html);
  }

  return message.snippet || '(No content)';
}

/**
 * Checks if a message has attachments
 */
export function hasAttachments(message: ParsedMessage): boolean {
  return message.attachments.length > 0;
}

/**
 * Gets all recipient email addresses (to + cc)
 */
export function getAllRecipients(message: ParsedMessage): string[] {
  const recipients: string[] = [];

  if (message.to) {
    recipients.push(...message.to);
  }

  if (message.cc) {
    recipients.push(...message.cc);
  }

  return recipients;
}

/**
 * Checks if message is unread (has UNREAD label)
 */
export function isUnread(message: ParsedMessage): boolean {
  return message.labelIds.includes('UNREAD');
}

/**
 * Checks if message is starred
 */
export function isStarred(message: ParsedMessage): boolean {
  return message.labelIds.includes('STARRED');
}

/**
 * Checks if message is in inbox
 */
export function isInInbox(message: ParsedMessage): boolean {
  return message.labelIds.includes('INBOX');
}

/**
 * Checks if message is important
 */
export function isImportant(message: ParsedMessage): boolean {
  return message.labelIds.includes('IMPORTANT');
}
