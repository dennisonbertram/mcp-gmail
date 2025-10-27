// src/utils/index.ts
// Central export point for all Gmail utilities

// Error handling
export {
  GmailAPIError,
  GmailRateLimitError,
  GmailAuthError,
  GmailPermissionError,
  GmailNotFoundError,
  handleGmailError,
  wrapGmailCall,
  isRateLimitError,
  isAuthError,
  isPermissionError,
  isNotFoundError,
} from './error-handler.js';

// MIME message builder
export {
  buildMimeMessage,
  buildPlainTextEmail,
  buildHtmlEmail,
  buildReplyEmail,
  isValidEmail,
  extractEmail,
} from './mime-builder.js';

export type {
  EmailAddress,
  EmailAttachment,
  EmailParams,
} from './mime-builder.js';

// Message parser
export {
  parseMessage,
  parseMessages,
  messageToText,
  htmlToText,
  getMessageBody,
  hasAttachments,
  getAllRecipients,
  isUnread,
  isStarred,
  isInInbox,
  isImportant,
} from './message-parser.js';

export type {
  ParsedMessage,
  AttachmentInfo,
} from './message-parser.js';

// Attachment handler
export {
  decodeBase64Url,
  encodeBase64Url,
  decodeAttachment,
  encodeFileToBase64,
  encodeBufferToBase64,
  saveAttachment,
  getMimeTypeFromFilename,
  getExtensionFromMimeType,
  isValidAttachmentSize,
  validateTotalAttachmentSize,
  isImageMimeType,
  isDocumentMimeType,
  isArchiveMimeType,
  formatBytes,
  createAttachmentMetadata,
  createAttachmentFromFile,
  AttachmentError,
  validateAttachment,
  MAX_ATTACHMENT_SIZE,
  MIME_TYPES,
} from './attachment-handler.js';

export type {
  DecodedAttachment,
} from './attachment-handler.js';
