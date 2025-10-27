// src/tools/read-message.ts
// Reads full Gmail message content by ID

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import {
  parseMessage,
  handleGmailError,
  getMessageBody,
  messageToText,
} from "../utils/index.js";

const ReadMessageSchema = z.object({
  messageId: z
    .string()
    .min(1)
    .describe("Gmail message ID to retrieve (from list_messages or search_messages)"),
  format: z
    .enum(["full", "simple", "text"])
    .optional()
    .describe(
      "Response format: 'full' (complete parsed message, default), 'simple' (key fields only), 'text' (human-readable text)"
    ),
});

export default class ReadMessageTool extends MCPTool {
  name = "getMessage";
  description =
    "Gets the full content of a message by ID. " +
    "Returns complete details including headers, body (plain text and HTML), attachments, labels, and thread info. " +
    "Supports three formats: 'full' (default), 'simple', or 'text'.";
  schema = ReadMessageSchema;

  async execute(input: MCPInput<this>) {
    try {
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Apply defaults
      const format = input.format ?? "full";

      // Fetch the full message
      const response = await gmail.users.messages.get({
        userId: "me",
        id: input.messageId,
        format: "full",
      });

      const message = response.data;

      if (!message.id) {
        return {
          success: false,
          error: "Invalid message response from Gmail API",
        };
      }

      // Parse the message
      const parsed = parseMessage(message);

      // Return different formats based on input
      if (format === "text") {
        return {
          success: true,
          messageId: parsed.id,
          text: messageToText(parsed),
        };
      }

      if (format === "simple") {
        return {
          success: true,
          message: {
            id: parsed.id,
            threadId: parsed.threadId,
            subject: parsed.subject || "(No subject)",
            from: parsed.from || "(Unknown sender)",
            to: parsed.to,
            cc: parsed.cc,
            date: parsed.date,
            body: getMessageBody(parsed),
            snippet: parsed.snippet,
            labelIds: parsed.labelIds,
            attachmentCount: parsed.attachments.length,
            attachments: parsed.attachments.map((att) => ({
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
            })),
          },
        };
      }

      // Full format (default)
      return {
        success: true,
        message: {
          id: parsed.id,
          threadId: parsed.threadId,
          labelIds: parsed.labelIds,
          snippet: parsed.snippet,
          historyId: parsed.historyId,
          internalDate: parsed.internalDate,
          sizeEstimate: parsed.sizeEstimate,
          // Headers
          subject: parsed.subject,
          from: parsed.from,
          to: parsed.to,
          cc: parsed.cc,
          bcc: parsed.bcc,
          date: parsed.date,
          replyTo: parsed.replyTo,
          messageId: parsed.messageId,
          inReplyTo: parsed.inReplyTo,
          references: parsed.references,
          // Body
          body: {
            plain: parsed.body.plain,
            html: parsed.body.html,
          },
          // Attachments
          attachments: parsed.attachments.map((att) => ({
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            attachmentId: att.attachmentId,
          })),
          // Flags
          isUnread: parsed.labelIds.includes("UNREAD"),
          isStarred: parsed.labelIds.includes("STARRED"),
          isInInbox: parsed.labelIds.includes("INBOX"),
          isImportant: parsed.labelIds.includes("IMPORTANT"),
        },
      };
    } catch (error) {
      const gmailError = handleGmailError(error);
      return {
        success: false,
        error: gmailError.message,
        errorType: gmailError.name,
        errorCode: gmailError.code,
      };
    }
  }
}
