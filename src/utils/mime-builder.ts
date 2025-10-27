// src/utils/mime-builder.ts
// MIME message builder for Gmail API using nodemailer

import * as nodemailer from 'nodemailer';
import { Readable } from 'stream';
import { readFile } from 'fs/promises';

/**
 * Email address interface
 */
export interface EmailAddress {
  email: string;
  name?: string;
}

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
  path?: string; // File path to read from
}

/**
 * Email parameters for building MIME messages
 */
export interface EmailParams {
  to: string | string[] | EmailAddress | EmailAddress[];
  from: string | EmailAddress;
  subject: string;
  text?: string; // Plain text body
  html?: string; // HTML body
  cc?: string | string[] | EmailAddress | EmailAddress[];
  bcc?: string | string[] | EmailAddress | EmailAddress[];
  replyTo?: string | EmailAddress;
  inReplyTo?: string; // Message-ID this is a reply to
  references?: string | string[]; // Message-IDs for threading
  attachments?: EmailAttachment[];
}

/**
 * Normalizes email addresses to the format expected by nodemailer
 */
function normalizeAddress(
  address: string | string[] | EmailAddress | EmailAddress[] | undefined
): string | string[] | { name?: string; address: string } | Array<{ name?: string; address: string }> | undefined {
  if (!address) return undefined;

  if (typeof address === 'string') {
    return address;
  }

  if (Array.isArray(address)) {
    if (address.length === 0) return undefined;

    const first = address[0];
    if (typeof first === 'string') {
      return address as string[];
    }

    return (address as EmailAddress[]).map(addr => {
      const result: { name?: string; address: string } = { address: addr.email };
      if (addr.name !== undefined) {
        result.name = addr.name;
      }
      return result;
    });
  }

  const result: { name?: string; address: string } = { address: address.email };
  if (address.name !== undefined) {
    result.name = address.name;
  }
  return result;
}

/**
 * Converts a string to base64url encoding (RFC 4648)
 * @param str - String to encode
 * @returns Base64url encoded string
 */
function toBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds a MIME message from email parameters
 * @param params - Email parameters
 * @returns Promise resolving to base64url-encoded MIME message ready for Gmail API
 */
export async function buildMimeMessage(params: EmailParams): Promise<string> {
  // Validate required fields
  if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
    throw new Error('Email "to" field is required');
  }
  if (!params.from) {
    throw new Error('Email "from" field is required');
  }
  if (!params.subject) {
    throw new Error('Email "subject" field is required');
  }
  if (!params.text && !params.html) {
    throw new Error('Email must have either "text" or "html" body');
  }

  // Process attachments - load file paths if needed
  const processedAttachments = params.attachments
    ? await Promise.all(
        params.attachments.map(async (attachment) => {
          if (attachment.path) {
            // Read file from path
            const content = await readFile(attachment.path);
            return {
              filename: attachment.filename,
              content: content,
              contentType: attachment.contentType,
              encoding: 'base64',
            };
          }
          return {
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType,
            encoding: attachment.encoding || 'base64',
          };
        })
      )
    : undefined;

  // Create mail options for nodemailer
  // Type assertion is safe here as we're building MIME, not actually sending
  const mailOptions: Record<string, unknown> = {
    from: normalizeAddress(params.from),
    to: normalizeAddress(params.to),
    subject: params.subject,
    text: params.text,
    html: params.html,
    cc: normalizeAddress(params.cc),
    bcc: normalizeAddress(params.bcc),
    replyTo: normalizeAddress(params.replyTo),
    attachments: processedAttachments,
  };

  // Add threading headers if provided
  if (params.inReplyTo) {
    mailOptions.inReplyTo = params.inReplyTo;
  }
  if (params.references) {
    mailOptions.references = Array.isArray(params.references)
      ? params.references.join(' ')
      : params.references;
  }

  // Create a nodemailer transport (we won't actually send, just build the message)
  // Using streamTransport to get the raw message
  const transport = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
  });

  try {
    // Generate the email
    const info = await transport.sendMail(mailOptions);

    // Read the message from the stream
    const messageStream = info.message as Readable;
    const message = await streamToString(messageStream);

    // Encode to base64url for Gmail API
    return toBase64Url(message);
  } catch (error) {
    throw new Error(`Failed to build MIME message: ${(error as Error).message}`);
  }
}

/**
 * Helper function to convert stream to string
 */
function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks as any).toString('utf8')));
  });
}

/**
 * Creates a simple plain text email (convenience function)
 * @param to - Recipient email address
 * @param from - Sender email address
 * @param subject - Email subject
 * @param body - Plain text body
 * @returns Promise resolving to base64url-encoded MIME message
 */
export async function buildPlainTextEmail(
  to: string,
  from: string,
  subject: string,
  body: string
): Promise<string> {
  return buildMimeMessage({
    to,
    from,
    subject,
    text: body,
  });
}

/**
 * Creates an HTML email (convenience function)
 * @param to - Recipient email address
 * @param from - Sender email address
 * @param subject - Email subject
 * @param htmlBody - HTML body
 * @param textBody - Optional plain text fallback
 * @returns Promise resolving to base64url-encoded MIME message
 */
export async function buildHtmlEmail(
  to: string,
  from: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<string> {
  return buildMimeMessage({
    to,
    from,
    subject,
    html: htmlBody,
    text: textBody || stripHtmlTags(htmlBody),
  });
}

/**
 * Creates a reply email with proper threading headers
 * @param originalMessageId - Message-ID of the email being replied to
 * @param originalReferences - References header from original email
 * @param params - Email parameters
 * @returns Promise resolving to base64url-encoded MIME message
 */
export async function buildReplyEmail(
  originalMessageId: string,
  originalReferences: string | undefined,
  params: Omit<EmailParams, 'inReplyTo' | 'references'>
): Promise<string> {
  // Build references chain for threading
  const references = originalReferences
    ? `${originalReferences} ${originalMessageId}`
    : originalMessageId;

  return buildMimeMessage({
    ...params,
    inReplyTo: originalMessageId,
    references: references,
  });
}

/**
 * Simple HTML tag stripper for creating text fallback
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates email address format
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extracts email address from "Name <email@example.com>" format
 * @param addressString - Email address string
 * @returns Email address only, or undefined if invalid
 */
export function extractEmail(addressString: string): string | undefined {
  if (!addressString) return undefined;
  const match = addressString.match(/<(.+?)>/);
  if (match && match[1]) {
    return match[1];
  }
  return addressString.trim();
}
