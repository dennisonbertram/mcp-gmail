import { describe, it, expect } from '@jest/globals';
import {
  buildMimeMessage,
  buildPlainTextEmail,
  buildHtmlEmail,
  buildReplyEmail,
  isValidEmail,
  extractEmail,
  EmailParams,
} from '../../src/utils/mime-builder.js';

describe('MIME Builder', () => {
  describe('buildMimeMessage', () => {
    it('should build a plain text email', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test Email',
        text: 'Hello, this is a test email.',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Base64url encoded strings should not contain +, /, or =
      expect(result).not.toMatch(/[+/=]/);
    });

    it('should build an HTML email', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'HTML Test',
        html: '<h1>Hello</h1><p>This is HTML</p>',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should build email with both plain text and HTML', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Multipart Test',
        text: 'Plain text version',
        html: '<p>HTML version</p>',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      // Decode to verify it contains both parts
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('Plain text version');
      expect(decoded).toContain('HTML version');
    });

    it('should build email with CC recipients', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'CC Test',
        text: 'Test message',
        cc: ['cc1@example.com', 'cc2@example.com'],
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('cc1@example.com');
      expect(decoded).toContain('cc2@example.com');
    });

    it('should build email with BCC recipients', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'BCC Test',
        text: 'Test message',
        bcc: 'bcc@example.com',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
    });

    it('should build email with named recipients', async () => {
      const params: EmailParams = {
        to: { email: 'recipient@example.com', name: 'John Doe' },
        from: { email: 'sender@example.com', name: 'Jane Smith' },
        subject: 'Named Recipients',
        text: 'Test message',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('John Doe');
      expect(decoded).toContain('Jane Smith');
    });

    it('should build email with multiple recipients', async () => {
      const params: EmailParams = {
        to: ['user1@example.com', 'user2@example.com'],
        from: 'sender@example.com',
        subject: 'Multiple To',
        text: 'Test message',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('user1@example.com');
      expect(decoded).toContain('user2@example.com');
    });

    it('should build email with reply-to header', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Reply-To Test',
        text: 'Test message',
        replyTo: 'replyto@example.com',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('replyto@example.com');
    });

    it('should build reply email with threading headers', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Re: Original Subject',
        text: 'This is a reply',
        inReplyTo: '<original-message-id@example.com>',
        references: '<ref1@example.com> <ref2@example.com>',
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('In-Reply-To');
      expect(decoded).toContain('References');
    });

    it('should build email with attachments (Buffer)', async () => {
      const params: EmailParams = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Attachment Test',
        text: 'Email with attachment',
        attachments: [
          {
            filename: 'test.txt',
            content: Buffer.from('Test file content'),
            contentType: 'text/plain',
          },
        ],
      };

      const result = await buildMimeMessage(params);

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('test.txt');
    });

    it('should throw error if "to" field is missing', async () => {
      const params: any = {
        from: 'sender@example.com',
        subject: 'Test',
        text: 'Body',
      };

      await expect(buildMimeMessage(params)).rejects.toThrow('Email "to" field is required');
    });

    it('should throw error if "to" field is empty array', async () => {
      const params: EmailParams = {
        to: [],
        from: 'sender@example.com',
        subject: 'Test',
        text: 'Body',
      };

      await expect(buildMimeMessage(params)).rejects.toThrow('Email "to" field is required');
    });

    it('should throw error if "from" field is missing', async () => {
      const params: any = {
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Body',
      };

      await expect(buildMimeMessage(params)).rejects.toThrow('Email "from" field is required');
    });

    it('should throw error if "subject" field is missing', async () => {
      const params: any = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        text: 'Body',
      };

      await expect(buildMimeMessage(params)).rejects.toThrow('Email "subject" field is required');
    });

    it('should throw error if both text and html are missing', async () => {
      const params: any = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test',
      };

      await expect(buildMimeMessage(params)).rejects.toThrow(
        'Email must have either "text" or "html" body'
      );
    });
  });

  describe('buildPlainTextEmail', () => {
    it('should build a simple plain text email', async () => {
      const result = await buildPlainTextEmail(
        'to@example.com',
        'from@example.com',
        'Simple Test',
        'Plain text body'
      );

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('Simple Test');
      expect(decoded).toContain('Plain text body');
    });
  });

  describe('buildHtmlEmail', () => {
    it('should build HTML email with text fallback', async () => {
      const result = await buildHtmlEmail(
        'to@example.com',
        'from@example.com',
        'HTML Test',
        '<h1>HTML Body</h1>',
        'Plain fallback'
      );

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('HTML Body');
      expect(decoded).toContain('Plain fallback');
    });

    it('should auto-generate text fallback from HTML', async () => {
      const result = await buildHtmlEmail(
        'to@example.com',
        'from@example.com',
        'HTML Test',
        '<h1>Title</h1><p>Paragraph</p>'
      );

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      // Stripped HTML should be present as text fallback
      expect(decoded).toContain('Title');
      expect(decoded).toContain('Paragraph');
    });
  });

  describe('buildReplyEmail', () => {
    it('should build reply with proper threading headers', async () => {
      const result = await buildReplyEmail(
        '<original@example.com>',
        undefined,
        {
          to: 'original-sender@example.com',
          from: 'replier@example.com',
          subject: 'Re: Original',
          text: 'This is a reply',
        }
      );

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('In-Reply-To');
      expect(decoded).toContain('<original@example.com>');
    });

    it('should build reply with existing references chain', async () => {
      const result = await buildReplyEmail(
        '<msg3@example.com>',
        '<msg1@example.com> <msg2@example.com>',
        {
          to: 'sender@example.com',
          from: 'replier@example.com',
          subject: 'Re: Thread',
          text: 'Reply in thread',
        }
      );

      expect(result).toBeTruthy();
      const decoded = Buffer.from(
        result.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();
      expect(decoded).toContain('References');
      expect(decoded).toContain('msg1@example.com');
      expect(decoded).toContain('msg2@example.com');
      expect(decoded).toContain('msg3@example.com');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('user_name@example-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('extractEmail', () => {
    it('should extract email from "Name <email>" format', () => {
      expect(extractEmail('John Doe <john@example.com>')).toBe('john@example.com');
      expect(extractEmail('Jane Smith <jane.smith@example.com>')).toBe(
        'jane.smith@example.com'
      );
    });

    it('should return email as-is if no brackets', () => {
      expect(extractEmail('user@example.com')).toBe('user@example.com');
      expect(extractEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should handle edge cases', () => {
      expect(extractEmail('<email@example.com>')).toBe('email@example.com');
      // Empty brackets returns the original string trimmed (which is "Name <>")
      expect(extractEmail('Name <>')).toBe('Name <>');
    });
  });

  describe('Base64url Encoding', () => {
    it('should encode to base64url without +, /, or = characters', async () => {
      const params: EmailParams = {
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test + / = characters',
        text: 'Body with special chars: + / =',
      };

      const result = await buildMimeMessage(params);

      // Base64url should not have these characters
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
      // But should have the replacements
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be decodable back to original content', async () => {
      const originalText = 'This is a test message with special characters: +/=';
      const params: EmailParams = {
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Encoding Test',
        text: originalText,
      };

      const encoded = await buildMimeMessage(params);

      // Convert base64url back to base64 and decode
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(base64, 'base64').toString();

      expect(decoded).toContain(originalText);
    });
  });
});
