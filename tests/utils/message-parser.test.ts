import { describe, it, expect } from '@jest/globals';
import {
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
  ParsedMessage,
} from '../../src/utils/message-parser.js';
import { gmail_v1 } from 'googleapis';

describe('Message Parser', () => {
  describe('parseMessage', () => {
    it('should parse a simple plain text message', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX', 'UNREAD'],
        snippet: 'This is a snippet...',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
            { name: 'Subject', value: 'Test Subject' },
            { name: 'Date', value: 'Mon, 1 Jan 2024 12:00:00 +0000' },
          ],
          mimeType: 'text/plain',
          body: {
            data: Buffer.from('Hello, this is a test message.').toString('base64'),
          },
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.id).toBe('msg123');
      expect(result.threadId).toBe('thread456');
      expect(result.labelIds).toEqual(['INBOX', 'UNREAD']);
      expect(result.snippet).toBe('This is a snippet...');
      expect(result.from).toBe('sender@example.com');
      expect(result.to).toEqual(['recipient@example.com']);
      expect(result.subject).toBe('Test Subject');
      expect(result.date).toBe('Mon, 1 Jan 2024 12:00:00 +0000');
      expect(result.body.plain).toBe('Hello, this is a test message.');
      expect(result.body.html).toBeUndefined();
      expect(result.attachments).toEqual([]);
    });

    it('should parse an HTML message', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'HTML preview',
        payload: {
          headers: [
            { name: 'Subject', value: 'HTML Email' },
            { name: 'From', value: 'sender@example.com' },
          ],
          mimeType: 'text/html',
          body: {
            data: Buffer.from('<h1>Hello</h1><p>HTML content</p>').toString('base64'),
          },
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.body.html).toBe('<h1>Hello</h1><p>HTML content</p>');
      expect(result.body.plain).toBeUndefined();
    });

    it('should parse a multipart message with both plain and HTML', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'Multipart message',
        payload: {
          headers: [
            { name: 'Subject', value: 'Multipart' },
            { name: 'From', value: 'sender@example.com' },
          ],
          mimeType: 'multipart/alternative',
          parts: [
            {
              mimeType: 'text/plain',
              body: {
                data: Buffer.from('Plain text version').toString('base64'),
              },
            },
            {
              mimeType: 'text/html',
              body: {
                data: Buffer.from('<p>HTML version</p>').toString('base64'),
              },
            },
          ],
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.body.plain).toBe('Plain text version');
      expect(result.body.html).toBe('<p>HTML version</p>');
    });

    it('should parse message with attachments', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'Message with attachment',
        payload: {
          headers: [
            { name: 'Subject', value: 'Attachment Test' },
            { name: 'From', value: 'sender@example.com' },
          ],
          mimeType: 'multipart/mixed',
          parts: [
            {
              mimeType: 'text/plain',
              body: {
                data: Buffer.from('Message body').toString('base64'),
              },
            },
            {
              filename: 'document.pdf',
              mimeType: 'application/pdf',
              body: {
                attachmentId: 'att123',
                size: 12345,
              },
            },
          ],
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]).toEqual({
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 12345,
        attachmentId: 'att123',
      });
    });

    it('should parse message with multiple recipients', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'Multiple recipients',
        payload: {
          headers: [
            { name: 'To', value: 'user1@example.com, user2@example.com' },
            { name: 'Cc', value: 'cc1@example.com, cc2@example.com' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Test' },
          ],
          body: {
            data: Buffer.from('Body').toString('base64'),
          },
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.to).toEqual(['user1@example.com', 'user2@example.com']);
      expect(result.cc).toEqual(['cc1@example.com', 'cc2@example.com']);
    });

    it('should parse threading headers', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'Reply message',
        payload: {
          headers: [
            { name: 'Message-ID', value: '<msg123@example.com>' },
            { name: 'In-Reply-To', value: '<original@example.com>' },
            { name: 'References', value: '<ref1@example.com> <ref2@example.com>' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Re: Original' },
          ],
          body: {
            data: Buffer.from('Reply body').toString('base64'),
          },
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.messageId).toBe('<msg123@example.com>');
      expect(result.inReplyTo).toBe('<original@example.com>');
      expect(result.references).toEqual(['<ref1@example.com>', '<ref2@example.com>']);
    });

    it('should handle base64url encoding', () => {
      // Base64url uses - and _ instead of + and /
      const base64urlData = Buffer.from('Test message')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'Base64url test',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Test' },
          ],
          mimeType: 'text/plain',
          body: {
            data: base64urlData,
          },
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.body.plain).toBe('Test message');
    });

    it('should handle nested multipart messages', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'Nested multipart',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Nested' },
          ],
          mimeType: 'multipart/mixed',
          parts: [
            {
              mimeType: 'multipart/alternative',
              parts: [
                {
                  mimeType: 'text/plain',
                  body: {
                    data: Buffer.from('Plain text').toString('base64'),
                  },
                },
                {
                  mimeType: 'text/html',
                  body: {
                    data: Buffer.from('<p>HTML</p>').toString('base64'),
                  },
                },
              ],
            },
            {
              filename: 'file.txt',
              mimeType: 'text/plain',
              body: {
                attachmentId: 'att456',
                size: 100,
              },
            },
          ],
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.body.plain).toBe('Plain text');
      expect(result.body.html).toBe('<p>HTML</p>');
      expect(result.attachments).toHaveLength(1);
    });

    it('should throw error if message is missing id', () => {
      const invalidMessage: any = {
        threadId: 'thread456',
      };

      expect(() => parseMessage(invalidMessage)).toThrow('Invalid message: missing id or threadId');
    });

    it('should throw error if message is missing threadId', () => {
      const invalidMessage: any = {
        id: 'msg123',
      };

      expect(() => parseMessage(invalidMessage)).toThrow('Invalid message: missing id or threadId');
    });

    it('should handle message with no body data', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'No body',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Empty' },
          ],
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.body.plain).toBeUndefined();
      expect(result.body.html).toBeUndefined();
      expect(result.snippet).toBe('No body');
    });

    it('should handle optional fields', () => {
      const gmailMessage: gmail_v1.Schema$Message = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX'],
        snippet: 'Minimal message',
        historyId: 'hist789',
        internalDate: '1609459200000',
        sizeEstimate: 2048,
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Test' },
          ],
          body: {
            data: Buffer.from('Body').toString('base64'),
          },
        },
      };

      const result = parseMessage(gmailMessage);

      expect(result.historyId).toBe('hist789');
      expect(result.internalDate).toBe('1609459200000');
      expect(result.sizeEstimate).toBe(2048);
    });
  });

  describe('parseMessages', () => {
    it('should parse multiple messages', () => {
      const messages: gmail_v1.Schema$Message[] = [
        {
          id: 'msg1',
          threadId: 'thread1',
          labelIds: ['INBOX'],
          snippet: 'First message',
          payload: {
            headers: [
              { name: 'From', value: 'sender1@example.com' },
              { name: 'Subject', value: 'Subject 1' },
            ],
            body: {
              data: Buffer.from('Body 1').toString('base64'),
            },
          },
        },
        {
          id: 'msg2',
          threadId: 'thread2',
          labelIds: ['INBOX'],
          snippet: 'Second message',
          payload: {
            headers: [
              { name: 'From', value: 'sender2@example.com' },
              { name: 'Subject', value: 'Subject 2' },
            ],
            body: {
              data: Buffer.from('Body 2').toString('base64'),
            },
          },
        },
      ];

      const results = parseMessages(messages);

      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe('msg1');
      expect(results[1]!.id).toBe('msg2');
    });
  });

  describe('Helper Functions', () => {
    const sampleMessage: ParsedMessage = {
      id: 'msg123',
      threadId: 'thread456',
      labelIds: ['INBOX', 'UNREAD', 'STARRED'],
      snippet: 'Sample snippet',
      subject: 'Test Subject',
      from: 'sender@example.com',
      to: ['recipient1@example.com', 'recipient2@example.com'],
      cc: ['cc@example.com'],
      date: 'Mon, 1 Jan 2024 12:00:00 +0000',
      body: {
        plain: 'Plain text body',
        html: '<p>HTML body</p>',
      },
      attachments: [
        {
          filename: 'file.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          attachmentId: 'att123',
        },
      ],
    };

    describe('isUnread', () => {
      it('should return true for unread messages', () => {
        expect(isUnread(sampleMessage)).toBe(true);
      });

      it('should return false for read messages', () => {
        const readMessage = { ...sampleMessage, labelIds: ['INBOX'] };
        expect(isUnread(readMessage)).toBe(false);
      });
    });

    describe('isStarred', () => {
      it('should return true for starred messages', () => {
        expect(isStarred(sampleMessage)).toBe(true);
      });

      it('should return false for non-starred messages', () => {
        const unstarredMessage = { ...sampleMessage, labelIds: ['INBOX'] };
        expect(isStarred(unstarredMessage)).toBe(false);
      });
    });

    describe('isInInbox', () => {
      it('should return true for inbox messages', () => {
        expect(isInInbox(sampleMessage)).toBe(true);
      });

      it('should return false for non-inbox messages', () => {
        const archivedMessage = { ...sampleMessage, labelIds: ['ARCHIVED'] };
        expect(isInInbox(archivedMessage)).toBe(false);
      });
    });

    describe('isImportant', () => {
      it('should return true for important messages', () => {
        const importantMessage = { ...sampleMessage, labelIds: ['INBOX', 'IMPORTANT'] };
        expect(isImportant(importantMessage)).toBe(true);
      });

      it('should return false for non-important messages', () => {
        expect(isImportant(sampleMessage)).toBe(false);
      });
    });

    describe('hasAttachments', () => {
      it('should return true for messages with attachments', () => {
        expect(hasAttachments(sampleMessage)).toBe(true);
      });

      it('should return false for messages without attachments', () => {
        const noAttachments = { ...sampleMessage, attachments: [] };
        expect(hasAttachments(noAttachments)).toBe(false);
      });
    });

    describe('getAllRecipients', () => {
      it('should return all to and cc recipients', () => {
        const recipients = getAllRecipients(sampleMessage);
        expect(recipients).toEqual([
          'recipient1@example.com',
          'recipient2@example.com',
          'cc@example.com',
        ]);
      });

      it('should handle messages with only to recipients', () => {
        const message: ParsedMessage = { ...sampleMessage };
        delete message.cc;
        const recipients = getAllRecipients(message);
        expect(recipients).toEqual(['recipient1@example.com', 'recipient2@example.com']);
      });

      it('should handle messages with only cc recipients', () => {
        const message: ParsedMessage = { ...sampleMessage };
        delete message.to;
        const recipients = getAllRecipients(message);
        expect(recipients).toEqual(['cc@example.com']);
      });
    });

    describe('getMessageBody', () => {
      it('should prefer plain text body', () => {
        const body = getMessageBody(sampleMessage);
        expect(body).toBe('Plain text body');
      });

      it('should fall back to HTML converted to text', () => {
        const htmlOnlyMessage = { ...sampleMessage, body: { html: '<h1>Title</h1><p>Text</p>' } };
        const body = getMessageBody(htmlOnlyMessage);
        expect(body).toContain('Title');
        expect(body).toContain('Text');
      });

      it('should use snippet if no body', () => {
        const noBodyMessage = { ...sampleMessage, body: {} };
        const body = getMessageBody(noBodyMessage);
        expect(body).toBe('Sample snippet');
      });

      it('should return fallback if no content', () => {
        const emptyMessage = { ...sampleMessage, body: {}, snippet: '' };
        const body = getMessageBody(emptyMessage);
        expect(body).toBe('(No content)');
      });
    });
  });

  describe('htmlToText', () => {
    it('should convert basic HTML to text', () => {
      const html = '<h1>Title</h1><p>Paragraph</p>';
      const text = htmlToText(html);
      expect(text).toContain('Title');
      expect(text).toContain('Paragraph');
      expect(text).not.toContain('<h1>');
    });

    it('should convert br tags to newlines', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3';
      const text = htmlToText(html);
      expect(text).toContain('Line 1\n');
      expect(text).toContain('Line 2\n');
    });

    it('should convert list items', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const text = htmlToText(html);
      expect(text).toContain('• Item 1');
      expect(text).toContain('• Item 2');
    });

    it('should handle HTML entities', () => {
      const html = 'Test &lt;tag&gt; &amp; &quot;quote&quot; &nbsp;';
      const text = htmlToText(html);
      expect(text).toContain('<tag>');
      expect(text).toContain('&');
      expect(text).toContain('"quote"');
    });

    it('should remove script and style tags', () => {
      const html = '<style>body{color:red}</style><p>Text</p><script>alert("hi")</script>';
      const text = htmlToText(html);
      expect(text).not.toContain('color:red');
      expect(text).not.toContain('alert');
      expect(text).toContain('Text');
    });
  });

  describe('messageToText', () => {
    it('should format message as readable text', () => {
      const message: ParsedMessage = {
        id: 'msg123',
        threadId: 'thread456',
        labelIds: ['INBOX', 'UNREAD'],
        snippet: 'Snippet',
        subject: 'Test Subject',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: 'Mon, 1 Jan 2024 12:00:00 +0000',
        body: {
          plain: 'This is the email body.',
        },
        attachments: [
          {
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            size: 102400,
            attachmentId: 'att123',
          },
        ],
      };

      const text = messageToText(message);

      expect(text).toContain('Message ID: msg123');
      expect(text).toContain('Thread ID: thread456');
      expect(text).toContain('Subject: Test Subject');
      expect(text).toContain('From: sender@example.com');
      expect(text).toContain('To: recipient@example.com');
      expect(text).toContain('Date: Mon, 1 Jan 2024 12:00:00 +0000');
      expect(text).toContain('Labels: INBOX, UNREAD');
      expect(text).toContain('This is the email body');
      expect(text).toContain('document.pdf');
      expect(text).toContain('100 KB');
    });
  });
});
