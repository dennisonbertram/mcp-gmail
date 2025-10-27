// src/tools/create-filter.ts
// Gmail MCP Tool - Create email filter rule
// Creates a new filter with criteria and actions

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { gmail_v1 } from "googleapis";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const CreateFilterSchema = z.object({
  // Criteria (at least one must be specified)
  from: z.string().optional().describe("Filter emails from this sender (e.g., 'user@example.com')"),
  to: z.string().optional().describe("Filter emails to this recipient"),
  subject: z.string().optional().describe("Filter emails with this subject text"),
  query: z.string().optional().describe("Gmail search query (e.g., 'has:attachment', 'is:important')"),
  negatedQuery: z.string().optional().describe("Negated Gmail search query (emails NOT matching this)"),
  hasAttachment: z.boolean().optional().describe("Filter emails with/without attachments"),
  excludeChats: z.boolean().optional().describe("Exclude chats from this filter"),
  size: z.number().optional().describe("Filter by message size in bytes"),
  sizeComparison: z.enum(['larger', 'smaller']).optional().describe("Size comparison type"),

  // Actions (at least one must be specified)
  addLabelIds: z.array(z.string()).optional().describe("Label IDs to add (e.g., ['INBOX', 'IMPORTANT'])"),
  removeLabelIds: z.array(z.string()).optional().describe("Label IDs to remove (e.g., ['SPAM', 'TRASH'])"),
  forward: z.string().optional().describe("Email address to forward matching messages to"),
});

export default class CreateFilterTool extends MCPTool {
  name = "createFilter";
  description = "Creates an email filter with criteria (from, to, subject, query, etc.) and actions (add/remove labels, forward). Automatically processes matching messages.";
  schema = CreateFilterSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Validate that at least one criteria is specified
      const hasCriteria = input.from || input.to || input.subject || input.query ||
                         input.negatedQuery || input.hasAttachment !== undefined ||
                         input.size !== undefined;

      if (!hasCriteria) {
        return "Error: At least one filter criteria must be specified (from, to, subject, query, etc.)";
      }

      // Validate that at least one action is specified
      const hasAction = (input.addLabelIds && input.addLabelIds.length > 0) ||
                       (input.removeLabelIds && input.removeLabelIds.length > 0) ||
                       input.forward;

      if (!hasAction) {
        return "Error: At least one filter action must be specified (addLabelIds, removeLabelIds, or forward)";
      }

      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Build filter criteria
      const criteria: gmail_v1.Schema$FilterCriteria = {};
      if (input.from) criteria.from = input.from;
      if (input.to) criteria.to = input.to;
      if (input.subject) criteria.subject = input.subject;
      if (input.query) criteria.query = input.query;
      if (input.negatedQuery) criteria.negatedQuery = input.negatedQuery;
      if (input.hasAttachment !== undefined) criteria.hasAttachment = input.hasAttachment;
      if (input.excludeChats !== undefined) criteria.excludeChats = input.excludeChats;
      if (input.size !== undefined) criteria.size = input.size;
      if (input.sizeComparison) criteria.sizeComparison = input.sizeComparison;

      // Build filter action
      const action: gmail_v1.Schema$FilterAction = {};
      if (input.addLabelIds && input.addLabelIds.length > 0) {
        action.addLabelIds = input.addLabelIds;
      }
      if (input.removeLabelIds && input.removeLabelIds.length > 0) {
        action.removeLabelIds = input.removeLabelIds;
      }
      if (input.forward) action.forward = input.forward;

      // Create the filter
      const response = await gmail.users.settings.filters.create({
        userId: 'me',
        requestBody: {
          criteria,
          action,
        },
      });

      const filter = response.data;

      // Format success message
      const output = ["Filter created successfully!\n"];
      output.push(`Filter ID: ${filter.id}\n`);

      output.push("Criteria:");
      if (filter.criteria) {
        if (filter.criteria.from) output.push(`  - From: ${filter.criteria.from}`);
        if (filter.criteria.to) output.push(`  - To: ${filter.criteria.to}`);
        if (filter.criteria.subject) output.push(`  - Subject: ${filter.criteria.subject}`);
        if (filter.criteria.query) output.push(`  - Query: ${filter.criteria.query}`);
        if (filter.criteria.negatedQuery) output.push(`  - Negated Query: ${filter.criteria.negatedQuery}`);
        if (filter.criteria.hasAttachment !== undefined) {
          output.push(`  - Has Attachment: ${filter.criteria.hasAttachment}`);
        }
      }

      output.push("\nActions:");
      if (filter.action) {
        if (filter.action.addLabelIds && filter.action.addLabelIds.length > 0) {
          output.push(`  - Add Labels: ${filter.action.addLabelIds.join(', ')}`);
        }
        if (filter.action.removeLabelIds && filter.action.removeLabelIds.length > 0) {
          output.push(`  - Remove Labels: ${filter.action.removeLabelIds.join(', ')}`);
        }
        if (filter.action.forward) {
          output.push(`  - Forward to: ${filter.action.forward}`);
        }
      }

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error creating filter: ${gmailError.message}`;
    }
  }
}
