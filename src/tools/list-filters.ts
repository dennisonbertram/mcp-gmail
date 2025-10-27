// src/tools/list-filters.ts
// Gmail MCP Tool - List all email filters
// Returns array of filters with their criteria and actions

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const ListFiltersSchema = z.object({});

export default class ListFiltersTool extends MCPTool {
  name = "listFilters";
  description = "Lists all email filters with their criteria and actions. Use to review existing automation rules.";
  schema = ListFiltersSchema;

  async execute(_input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // List all filters
      const response = await gmail.users.settings.filters.list({
        userId: 'me',
      });

      const filters = response.data.filter || [];

      if (filters.length === 0) {
        return "No email filters found.";
      }

      // Format output
      const output = [`Found ${filters.length} email filter(s):\n`];

      filters.forEach((filter, idx) => {
        output.push(`${idx + 1}. Filter ID: ${filter.id}`);

        // Display criteria
        if (filter.criteria) {
          output.push("   Criteria:");
          if (filter.criteria.from) output.push(`     - From: ${filter.criteria.from}`);
          if (filter.criteria.to) output.push(`     - To: ${filter.criteria.to}`);
          if (filter.criteria.subject) output.push(`     - Subject: ${filter.criteria.subject}`);
          if (filter.criteria.query) output.push(`     - Query: ${filter.criteria.query}`);
          if (filter.criteria.negatedQuery) output.push(`     - Negated Query: ${filter.criteria.negatedQuery}`);
          if (filter.criteria.hasAttachment !== undefined) {
            output.push(`     - Has Attachment: ${filter.criteria.hasAttachment}`);
          }
          if (filter.criteria.excludeChats !== undefined) {
            output.push(`     - Exclude Chats: ${filter.criteria.excludeChats}`);
          }
          if (filter.criteria.size) output.push(`     - Size: ${filter.criteria.size}`);
          if (filter.criteria.sizeComparison) output.push(`     - Size Comparison: ${filter.criteria.sizeComparison}`);
        }

        // Display actions
        if (filter.action) {
          output.push("   Actions:");
          if (filter.action.addLabelIds && filter.action.addLabelIds.length > 0) {
            output.push(`     - Add Labels: ${filter.action.addLabelIds.join(', ')}`);
          }
          if (filter.action.removeLabelIds && filter.action.removeLabelIds.length > 0) {
            output.push(`     - Remove Labels: ${filter.action.removeLabelIds.join(', ')}`);
          }
          if (filter.action.forward) {
            output.push(`     - Forward to: ${filter.action.forward}`);
          }
        }

        output.push(""); // Empty line between filters
      });

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error listing filters: ${gmailError.message}`;
    }
  }
}
