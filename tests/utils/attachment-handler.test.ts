import { describe, it, expect } from '@jest/globals';
import {
  decodeBase64Url,
  encodeBase64Url,
  decodeAttachment,
  getMimeTypeFromFilename,
  getExtensionFromMimeType,
  isValidAttachmentSize,
  validateTotalAttachmentSize,
  isImageMimeType,
  isDocumentMimeType,
  isArchiveMimeType,
  formatBytes,
  createAttachmentMetadata,
  validateAttachment,
  AttachmentError,
  MAX_ATTACHMENT_SIZE,
} from '../../src/utils/attachment-handler.js';
import { gmail_v1 } from 'googleapis';

describe('Attachment Handler', () => {
  describe('Base64url Encoding/Decoding', () => {
    it('should encode Buffer to base64url', () => {
      const buffer = Buffer.from('Hello, World!');
      const encoded = encodeBase64Url(buffer);

      // Base64url should not contain +, /, or =
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should decode base64url to Buffer', () => {
      const original = 'Hello, World!';
      const encoded = Buffer.from(original)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const decoded = decodeBase64Url(encoded);

      expect(decoded.toString('utf-8')).toBe(original);
    });

    it('should handle round-trip encoding/decoding', () => {
      const original = Buffer.from('Test data with special chars: +/=');
      const encoded = encodeBase64Url(original);
      const decoded = decodeBase64Url(encoded);

      expect(decoded.toString()).toBe(original.toString());
    });

    it('should handle base64url with missing padding', () => {
      // Base64url without padding
      const encoded = 'SGVsbG8';
      const decoded = decodeBase64Url(encoded);

      expect(decoded.toString('utf-8')).toBe('Hello');
    });

    it('should handle binary data', () => {
      const binaryData = Buffer.from([0, 1, 2, 255, 254, 253]);
      const encoded = encodeBase64Url(binaryData);
      const decoded = decodeBase64Url(encoded);

      expect(decoded).toEqual(binaryData);
    });
  });

  describe('decodeAttachment', () => {
    it('should decode attachment from Gmail API response', () => {
      const attachmentData = Buffer.from('Attachment content');
      const base64url = encodeBase64Url(attachmentData);

      const gmailAttachment: gmail_v1.Schema$MessagePartBody = {
        data: base64url,
        size: attachmentData.length,
      };

      const result = decodeAttachment(gmailAttachment, 'test.txt', 'text/plain');

      expect(result.filename).toBe('test.txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.data.toString()).toBe('Attachment content');
      expect(result.size).toBe(attachmentData.length);
    });

    it('should throw error if attachment has no data', () => {
      const gmailAttachment: gmail_v1.Schema$MessagePartBody = {
        size: 100,
      };

      expect(() => decodeAttachment(gmailAttachment, 'test.txt', 'text/plain')).toThrow(
        'Attachment test.txt has no data'
      );
    });
  });

  describe('MIME Type Detection', () => {
    describe('getMimeTypeFromFilename', () => {
      it('should detect common document types', () => {
        expect(getMimeTypeFromFilename('document.pdf')).toBe('application/pdf');
        expect(getMimeTypeFromFilename('report.docx')).toBe(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        expect(getMimeTypeFromFilename('spreadsheet.xlsx')).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        expect(getMimeTypeFromFilename('text.txt')).toBe('text/plain');
      });

      it('should detect common image types', () => {
        expect(getMimeTypeFromFilename('photo.jpg')).toBe('image/jpeg');
        expect(getMimeTypeFromFilename('photo.jpeg')).toBe('image/jpeg');
        expect(getMimeTypeFromFilename('image.png')).toBe('image/png');
        expect(getMimeTypeFromFilename('animation.gif')).toBe('image/gif');
        expect(getMimeTypeFromFilename('icon.svg')).toBe('image/svg+xml');
      });

      it('should detect archive types', () => {
        expect(getMimeTypeFromFilename('archive.zip')).toBe('application/zip');
        expect(getMimeTypeFromFilename('archive.rar')).toBe('application/x-rar-compressed');
        expect(getMimeTypeFromFilename('archive.7z')).toBe('application/x-7z-compressed');
        expect(getMimeTypeFromFilename('archive.tar')).toBe('application/x-tar');
        expect(getMimeTypeFromFilename('archive.gz')).toBe('application/gzip');
      });

      it('should handle case insensitive extensions', () => {
        expect(getMimeTypeFromFilename('FILE.PDF')).toBe('application/pdf');
        expect(getMimeTypeFromFilename('Image.PNG')).toBe('image/png');
      });

      it('should return default for unknown extensions', () => {
        expect(getMimeTypeFromFilename('unknown.xyz')).toBe('application/octet-stream');
        expect(getMimeTypeFromFilename('noextension')).toBe('application/octet-stream');
      });
    });

    describe('getExtensionFromMimeType', () => {
      it('should get extension from MIME type', () => {
        expect(getExtensionFromMimeType('application/pdf')).toBe('pdf');
        expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg');
        expect(getExtensionFromMimeType('text/plain')).toBe('txt');
      });

      it('should return undefined for unknown MIME types', () => {
        expect(getExtensionFromMimeType('application/unknown')).toBeUndefined();
      });
    });
  });

  describe('MIME Type Categories', () => {
    describe('isImageMimeType', () => {
      it('should identify image MIME types', () => {
        expect(isImageMimeType('image/jpeg')).toBe(true);
        expect(isImageMimeType('image/png')).toBe(true);
        expect(isImageMimeType('image/gif')).toBe(true);
        expect(isImageMimeType('image/svg+xml')).toBe(true);
      });

      it('should reject non-image types', () => {
        expect(isImageMimeType('application/pdf')).toBe(false);
        expect(isImageMimeType('text/plain')).toBe(false);
      });
    });

    describe('isDocumentMimeType', () => {
      it('should identify document MIME types', () => {
        expect(isDocumentMimeType('application/pdf')).toBe(true);
        expect(isDocumentMimeType('application/msword')).toBe(true);
        expect(
          isDocumentMimeType(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          )
        ).toBe(true);
        expect(isDocumentMimeType('text/plain')).toBe(true);
        expect(isDocumentMimeType('text/csv')).toBe(true);
      });

      it('should reject non-document types', () => {
        expect(isDocumentMimeType('image/jpeg')).toBe(false);
        expect(isDocumentMimeType('application/zip')).toBe(false);
      });
    });

    describe('isArchiveMimeType', () => {
      it('should identify archive MIME types', () => {
        expect(isArchiveMimeType('application/zip')).toBe(true);
        expect(isArchiveMimeType('application/x-rar-compressed')).toBe(true);
        expect(isArchiveMimeType('application/x-7z-compressed')).toBe(true);
        expect(isArchiveMimeType('application/gzip')).toBe(true);
      });

      it('should reject non-archive types', () => {
        expect(isArchiveMimeType('application/pdf')).toBe(false);
        expect(isArchiveMimeType('image/png')).toBe(false);
      });
    });
  });

  describe('Size Validation', () => {
    describe('isValidAttachmentSize', () => {
      it('should validate sizes within limit', () => {
        expect(isValidAttachmentSize(1024)).toBe(true);
        expect(isValidAttachmentSize(10 * 1024 * 1024)).toBe(true);
        expect(isValidAttachmentSize(MAX_ATTACHMENT_SIZE)).toBe(true);
      });

      it('should reject sizes exceeding limit', () => {
        expect(isValidAttachmentSize(MAX_ATTACHMENT_SIZE + 1)).toBe(false);
        expect(isValidAttachmentSize(100 * 1024 * 1024)).toBe(false);
      });

      it('should reject zero and negative sizes', () => {
        expect(isValidAttachmentSize(0)).toBe(false);
        expect(isValidAttachmentSize(-1)).toBe(false);
      });
    });

    describe('validateTotalAttachmentSize', () => {
      it('should validate total size within limit', () => {
        const attachments = [{ size: 5 * 1024 * 1024 }, { size: 10 * 1024 * 1024 }];

        const result = validateTotalAttachmentSize(attachments);

        expect(result.valid).toBe(true);
        expect(result.totalSize).toBe(15 * 1024 * 1024);
      });

      it('should reject total size exceeding limit', () => {
        const attachments = [{ size: 20 * 1024 * 1024 }, { size: 10 * 1024 * 1024 }];

        const result = validateTotalAttachmentSize(attachments);

        expect(result.valid).toBe(false);
        expect(result.totalSize).toBe(30 * 1024 * 1024);
        expect(result.message).toContain('exceeds');
      });

      it('should handle empty attachments array', () => {
        const result = validateTotalAttachmentSize([]);

        expect(result.valid).toBe(true);
        expect(result.totalSize).toBe(0);
      });

      it('should handle exact limit', () => {
        const attachments = [{ size: MAX_ATTACHMENT_SIZE }];

        const result = validateTotalAttachmentSize(attachments);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1500)).toBe('1.46 KB');
    });
  });

  describe('createAttachmentMetadata', () => {
    it('should create attachment metadata with explicit MIME type', () => {
      const base64Data = Buffer.from('Test content').toString('base64');

      const result = createAttachmentMetadata('test.txt', base64Data, 'text/plain');

      expect(result.filename).toBe('test.txt');
      expect(result.content).toBe(base64Data);
      expect(result.contentType).toBe('text/plain');
      expect(result.encoding).toBe('base64');
    });

    it('should infer MIME type from filename if not provided', () => {
      const base64Data = Buffer.from('PDF content').toString('base64');

      const result = createAttachmentMetadata('document.pdf', base64Data);

      expect(result.contentType).toBe('application/pdf');
    });

    it('should throw error for empty data', () => {
      expect(() => createAttachmentMetadata('test.txt', '')).toThrow(
        'Attachment data cannot be empty'
      );
    });

    it('should handle various file types', () => {
      const base64Data = Buffer.from('Data').toString('base64');

      expect(createAttachmentMetadata('image.png', base64Data).contentType).toBe('image/png');
      expect(createAttachmentMetadata('data.json', base64Data).contentType).toBe(
        'application/json'
      );
      expect(createAttachmentMetadata('archive.zip', base64Data).contentType).toBe(
        'application/zip'
      );
    });
  });

  describe('validateAttachment', () => {
    it('should validate correct attachment with base64 string', () => {
      const base64Data = Buffer.from('Valid content').toString('base64');

      expect(() => validateAttachment('test.txt', base64Data)).not.toThrow();
    });

    it('should validate correct attachment with Buffer', () => {
      const buffer = Buffer.from('Valid content');

      expect(() => validateAttachment('test.txt', buffer)).not.toThrow();
    });

    it('should throw error for empty filename', () => {
      const base64Data = Buffer.from('Content').toString('base64');

      expect(() => validateAttachment('', base64Data)).toThrow(
        'Attachment filename cannot be empty'
      );
      expect(() => validateAttachment('   ', base64Data)).toThrow(
        'Attachment filename cannot be empty'
      );
    });

    it('should throw error for empty data', () => {
      expect(() => validateAttachment('test.txt', '')).toThrow('has no data');
      expect(() => validateAttachment('test.txt', Buffer.alloc(0))).toThrow('has no data');
    });

    it('should throw error for oversized attachment', () => {
      // Create a large buffer exceeding the limit
      const largeBuffer = Buffer.alloc(MAX_ATTACHMENT_SIZE + 1);

      expect(() => validateAttachment('large.bin', largeBuffer)).toThrow('exceeds maximum');
    });

    it('should validate attachment at exactly the size limit', () => {
      const maxBuffer = Buffer.alloc(MAX_ATTACHMENT_SIZE);

      expect(() => validateAttachment('max.bin', maxBuffer)).not.toThrow();
    });
  });

  describe('AttachmentError', () => {
    it('should create AttachmentError with correct properties', () => {
      const error = new AttachmentError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AttachmentError);
      expect(error.name).toBe('AttachmentError');
      expect(error.message).toBe('Test error message');
      expect(error.stack).toBeDefined();
    });

    it('should be catchable as Error', () => {
      try {
        throw new AttachmentError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as AttachmentError).message).toBe('Test error');
      }
    });
  });

  describe('MAX_ATTACHMENT_SIZE constant', () => {
    it('should be set to 25MB', () => {
      expect(MAX_ATTACHMENT_SIZE).toBe(25 * 1024 * 1024);
    });
  });

  describe('Edge Cases', () => {
    it('should handle filenames with multiple dots', () => {
      const mimeType = getMimeTypeFromFilename('my.backup.file.tar.gz');
      expect(mimeType).toBe('application/gzip'); // Uses last extension
    });

    it('should handle filenames with no extension', () => {
      const mimeType = getMimeTypeFromFilename('README');
      expect(mimeType).toBe('application/octet-stream');
    });

    it('should handle Unicode in filenames', () => {
      const base64Data = Buffer.from('Content').toString('base64');
      const result = createAttachmentMetadata('文件.txt', base64Data);
      expect(result.filename).toBe('文件.txt');
    });

    it('should handle very small attachments', () => {
      const result = validateTotalAttachmentSize([{ size: 1 }]);
      expect(result.valid).toBe(true);
      expect(result.totalSize).toBe(1);
    });
  });
});
