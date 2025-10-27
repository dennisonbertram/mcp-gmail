// src/tools/list-messages.ts
// Lists Gmail messages with optional filters

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { gmail_v1 } from "googleapis";
import { createGmailAuth } from "../auth/index.js";
import { parseMessage, handleGmailError } from "../utils/index.js";

const ListMessagesSchema = z.object({
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Maximum number of messages to return (1-500, default: 10)"),
  query: z
    .string()
    .optional()
    .describe("Gmail search query (e.g., 'is:unread', 'from:example@gmail.com', 'subject:invoice')"),
  labelIds: z
    .array(z.string())
    .optional()
    .describe("Filter by label IDs (e.g., ['INBOX', 'UNREAD', 'STARRED'])"),
});

export default class ListMessagesTool extends MCPTool {
  name = "listMessages";
  description =
    "Lists recent messages with optional filters by label or query. " +
    "Returns message metadata including ID, subject, snippet, sender, and date. " +
    "Use this for browsing; use searchMessages for complex queries.";
  schema = ListMessagesSchema;

  async execute(input: MCPInput<this>) {
    try {
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Apply defaults
      const maxResults = input.maxResults ?? 10;

      // Build list parameters
      const listParams: gmail_v1.Params$Resource$Users$Messages$List = {
        userId: "me",
        maxResults: maxResults,
      };

      if (input.query) {
        listParams.q = input.query;
      }

      if (input.labelIds && input.labelIds.length > 0) {
        listParams.labelIds = input.labelIds;
      }

      // List messages
      const listResponse = await gmail.users.messages.list(listParams);

      const messages = listResponse.data.messages || [];

      if (messages.length === 0) {
        return {
          success: true,
          count: 0,
          messages: [],
          message: "No messages found matching the criteria.",
        };
      }

      // Fetch full details for each message (in parallel for better performance)
      const messagePromises = messages.map(async (msg) => {
        const fullMessage = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date"],
        });
        return fullMessage.data;
      });

      const fullMessages = await Promise.all(messagePromises);

      // Parse messages to extract key information
      const parsedMessages = fullMessages.map((msg) => {
        const parsed = parseMessage(msg);
        return {
          id: parsed.id,
          threadId: parsed.threadId,
          subject: parsed.subject || "(No subject)",
          from: parsed.from || "(Unknown sender)",
          date: parsed.date,
          snippet: parsed.snippet,
          labelIds: parsed.labelIds,
          isUnread: parsed.labelIds.includes("UNREAD"),
          isStarred: parsed.labelIds.includes("STARRED"),
        };
      });

      return {
        success: true,
        count: parsedMessages.length,
        resultCount: `${parsedMessages.length} of ${listResponse.data.resultSizeEstimate || messages.length}`,
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
