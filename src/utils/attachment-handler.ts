// src/utils/attachment-handler.ts
// Gmail attachment encoding/decoding utilities

import { readFile, writeFile } from 'fs/promises';
import { gmail_v1 } from 'googleapis';

/**
 * Maximum attachment size (25MB for Gmail)
 */
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB in bytes

/**
 * Decoded attachment data
 */
export interface DecodedAttachment {
  filename: string;
  mimeType: string;
  data: Buffer;
  size: number;
}

/**
 * Common MIME type mappings
 */
export const MIME_TYPES: Record<string, string> = {
  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',

  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  webp: 'image/webp',

  // Archives
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',

  // Other
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
};

/**
 * Decodes base64url encoded data to Buffer
 * @param encoded - Base64url encoded string
 * @returns Decoded Buffer
 */
export function decodeBase64Url(encoded: string): Buffer {
  // Convert base64url to base64
  const base64 = encoded
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding if needed
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const paddedBase64 = base64 + padding;

  return Buffer.from(paddedBase64, 'base64');
}

/**
 * Encodes Buffer to base64url
 * @param buffer - Data to encode
 * @returns Base64url encoded string
 */
export function encodeBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a Gmail attachment from the API response
 * @param attachment - Gmail API attachment object
 * @param filename - Original filename
 * @param mimeType - MIME type of the attachment
 * @returns Decoded attachment with data buffer
 */
export function decodeAttachment(
  attachment: gmail_v1.Schema$MessagePartBody,
  filename: string,
  mimeType: string
): DecodedAttachment {
  if (!attachment.data) {
    throw new Error(`Attachment ${filename} has no data`);
  }

  const data = decodeBase64Url(attachment.data);
  const size = data.length;

  return {
    filename,
    mimeType,
    data,
    size,
  };
}

/**
 * Encodes a file to base64 for sending as Gmail attachment
 * @param filePath - Path to the file
 * @returns Promise resolving to base64 encoded file data
 */
export async function encodeFileToBase64(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath);

    // Check size
    if (buffer.length > MAX_ATTACHMENT_SIZE) {
      throw new Error(
        `File size (${formatBytes(buffer.length)}) exceeds Gmail's ` +
        `maximum attachment size (${formatBytes(MAX_ATTACHMENT_SIZE)})`
      );
    }

    return buffer.toString('base64');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Encodes a Buffer to base64 for sending as Gmail attachment
 * @param buffer - Data buffer
 * @param validateSize - Whether to validate size against Gmail limits
 * @returns Base64 encoded string
 */
export function encodeBufferToBase64(
  buffer: Buffer,
  validateSize: boolean = true
): string {
  if (validateSize && buffer.length > MAX_ATTACHMENT_SIZE) {
    throw new Error(
      `Buffer size (${formatBytes(buffer.length)}) exceeds Gmail's ` +
      `maximum attachment size (${formatBytes(MAX_ATTACHMENT_SIZE)})`
    );
  }

  return buffer.toString('base64');
}

/**
 * Saves a decoded attachment to a file
 * @param attachment - Decoded attachment
 * @param outputPath - Path where to save the file
 */
export async function saveAttachment(
  attachment: DecodedAttachment,
  outputPath: string
): Promise<void> {
  try {
    await writeFile(outputPath, new Uint8Array(attachment.data));
  } catch (error) {
    throw new Error(
      `Failed to save attachment to ${outputPath}: ${(error as Error).message}`
    );
  }
}

/**
 * Gets MIME type from filename extension
 * @param filename - Filename with extension
 * @returns MIME type or 'application/octet-stream' if unknown
 */
export function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return (ext && MIME_TYPES[ext]) || 'application/octet-stream';
}

/**
 * Gets file extension from MIME type
 * @param mimeType - MIME type
 * @returns File extension (without dot) or undefined if unknown
 */
export function getExtensionFromMimeType(mimeType: string): string | undefined {
  const entry = Object.entries(MIME_TYPES).find(
    ([_, mime]) => mime === mimeType
  );
  return entry?.[0];
}

/**
 * Validates attachment size
 * @param size - Size in bytes
 * @returns True if size is valid for Gmail
 */
export function isValidAttachmentSize(size: number): boolean {
  return size > 0 && size <= MAX_ATTACHMENT_SIZE;
}

/**
 * Validates total attachments size for an email
 * @param attachments - Array of attachment sizes
 * @returns Object with validation result and total size
 */
export function validateTotalAttachmentSize(
  attachments: Array<{ size: number }>
): { valid: boolean; totalSize: number; message?: string } {
  const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);

  if (totalSize === 0) {
    return { valid: true, totalSize: 0 };
  }

  if (totalSize > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      totalSize,
      message: `Total attachment size (${formatBytes(totalSize)}) exceeds ` +
        `Gmail's limit (${formatBytes(MAX_ATTACHMENT_SIZE)})`,
    };
  }

  return { valid: true, totalSize };
}

/**
 * Checks if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Checks if a MIME type is a document
 */
export function isDocumentMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('application/pdf') ||
    mimeType.startsWith('application/msword') ||
    mimeType.startsWith('application/vnd.openxmlformats-officedocument') ||
    mimeType.startsWith('application/vnd.ms-') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv'
  );
}

/**
 * Checks if a MIME type is an archive
 */
export function isArchiveMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('application/zip') ||
    mimeType.startsWith('application/x-rar') ||
    mimeType.startsWith('application/x-7z') ||
    mimeType.startsWith('application/x-tar') ||
    mimeType.startsWith('application/gzip')
  );
}

/**
 * Formats bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Creates attachment metadata for Gmail API
 * @param filename - Attachment filename
 * @param mimeType - MIME type (will be inferred if not provided)
 * @param base64Data - Base64 encoded file data
 * @returns Attachment object for nodemailer
 */
export function createAttachmentMetadata(
  filename: string,
  base64Data: string,
  mimeType?: string
): {
  filename: string;
  content: string;
  contentType: string;
  encoding: string;
} {
  const inferredMimeType = mimeType || getMimeTypeFromFilename(filename);

  // Validate base64 data
  if (!base64Data || base64Data.length === 0) {
    throw new Error('Attachment data cannot be empty');
  }

  return {
    filename,
    content: base64Data,
    contentType: inferredMimeType,
    encoding: 'base64',
  };
}

/**
 * Reads a file and creates attachment metadata
 * @param filePath - Path to the file
 * @param filename - Optional custom filename (uses file's basename if not provided)
 * @param mimeType - Optional MIME type (inferred if not provided)
 * @returns Promise resolving to attachment metadata
 */
export async function createAttachmentFromFile(
  filePath: string,
  filename?: string,
  mimeType?: string
): Promise<{
  filename: string;
  content: string;
  contentType: string;
  encoding: string;
}> {
  const base64Data = await encodeFileToBase64(filePath);
  const finalFilename = filename || filePath.split('/').pop() || 'attachment';

  return createAttachmentMetadata(finalFilename, base64Data, mimeType);
}

/**
 * Error class for attachment-related errors
 */
export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validates attachment data before sending
 * @param filename - Attachment filename
 * @param data - Attachment data (base64 string or Buffer)
 * @throws AttachmentError if validation fails
 */
export function validateAttachment(
  filename: string,
  data: string | Buffer
): void {
  if (!filename || filename.trim().length === 0) {
    throw new AttachmentError('Attachment filename cannot be empty');
  }

  const dataSize = typeof data === 'string'
    ? Buffer.from(data, 'base64').length
    : data.length;

  if (dataSize === 0) {
    throw new AttachmentError(`Attachment ${filename} has no data`);
  }

  if (!isValidAttachmentSize(dataSize)) {
    throw new AttachmentError(
      `Attachment ${filename} size (${formatBytes(dataSize)}) exceeds ` +
      `maximum allowed size (${formatBytes(MAX_ATTACHMENT_SIZE)})`
    );
  }
}
