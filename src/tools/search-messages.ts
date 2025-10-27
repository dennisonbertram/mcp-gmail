// src/tools/search-messages.ts
// Searches Gmail messages using Gmail query syntax

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import {
  parseMessage,
  handleGmailError,
  getMessageBody,
} from "../utils/index.js";

const SearchMessagesSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Gmail search query using Gmail search operators. " +
        "Examples: 'from:example@gmail.com', 'subject:invoice', " +
        "'is:unread after:2024/01/01', 'has:attachment larger:10M', " +
        "'in:inbox OR in:sent', 'to:me -from:notifications@example.com'"
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Maximum number of messages to return (1-500, default: 20)"),
  includeBody: z
    .boolean()
    .optional()
    .describe(
      "Include message body in results (slower but more detailed). Default: false (returns only metadata)"
    ),
});

interface SearchResult {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to?: string;
  cc?: string;
  date: string;
  snippet: string;
  labelIds: string[];
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  body?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
}

export default class SearchMessagesTool extends MCPTool {
  name = "searchMessages";
  description =
    "Searches messages using Gmail's query syntax. " +
    "Supports operators like from:, to:, subject:, has:attachment, is:unread, is:starred, " +
    "before:, after:, larger:, in:, label:, and boolean operators (OR, -, quotes). " +
    "Returns matching messages with full details.";
  schema = SearchMessagesSchema;

  async execute(input: MCPInput<this>): Promise<unknown> {
    try {
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Apply defaults
      const maxResults = input.maxResults ?? 20;
      const includeBody = input.includeBody ?? false;

      // Search for messages using the query
      const searchResponse = await gmail.users.messages.list({
        userId: "me",
        q: input.query,
        maxResults: maxResults,
      });

      const messages = searchResponse.data.messages || [];

      if (messages.length === 0) {
        return {
          success: true,
          count: 0,
          query: input.query,
          messages: [],
          message: `No messages found matching query: "${input.query}"`,
        };
      }

      // Fetch full details for each message
      const messagePromises = messages.map(async (msg) => {
        const fullMessage = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: includeBody ? "full" : "metadata",
          metadataHeaders: [
            "From",
            "To",
            "Cc",
            "Subject",
            "Date",
            "Message-ID",
          ],
        });
        return fullMessage.data;
      });

      const fullMessages = await Promise.all(messagePromises);

      // Parse messages
      const parsedMessages = fullMessages.map((msg) => {
        const parsed = parseMessage(msg);

        const result: SearchResult = {
          id: parsed.id,
          threadId: parsed.threadId,
          subject: parsed.subject || "(No subject)",
          from: parsed.from || "(Unknown sender)",
          date: parsed.date || "(Unknown date)",
          snippet: parsed.snippet,
          labelIds: parsed.labelIds,
          isUnread: parsed.labelIds.includes("UNREAD"),
          isStarred: parsed.labelIds.includes("STARRED"),
          isImportant: parsed.labelIds.includes("IMPORTANT"),
          hasAttachments: parsed.attachments.length > 0,
        };

        // Set optional properties only if they have values (exactOptionalPropertyTypes compliance)
        if (parsed.to && parsed.to.length > 0) {
          result.to = parsed.to.join(", ");
        }
        if (parsed.cc && parsed.cc.length > 0) {
          result.cc = parsed.cc.join(", ");
        }

        // Include body if requested
        if (includeBody) {
          result.body = getMessageBody(parsed);
        }

        // Include attachment details if present
        if (parsed.attachments.length > 0) {
          result.attachments = parsed.attachments.map((att) => ({
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            attachmentId: att.attachmentId,
          }));
        }

        return result;
      });

      return {
        success: true,
        query: input.query,
        count: parsedMessages.length,
        resultCount: `${parsedMessages.length} of ${searchResponse.data.resultSizeEstimate || messages.length}`,
        messages: parsedMessages,
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
