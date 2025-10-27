// src/tools/get-settings.ts
// Gmail MCP Tool - Get user settings
// Retrieves comprehensive Gmail settings including signatures, vacation responder, forwarding, etc.

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const GetSettingsSchema = z.object({});

export default class GetSettingsTool extends MCPTool {
  name = "getSettings";
  description = "Gets comprehensive Gmail settings including email signatures, vacation responder, forwarding addresses, IMAP/POP settings, and language preferences.";
  schema = GetSettingsSchema;

  async execute(_input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      const output: string[] = ["Gmail Settings:\n"];

      // Get SendAs settings (includes signatures)
      try {
        const sendAsResponse = await gmail.users.settings.sendAs.list({
          userId: 'me',
        });

        const sendAsAddresses = sendAsResponse.data.sendAs || [];
        output.push("=== Email Addresses & Signatures ===");

        sendAsAddresses.forEach((sendAs, idx) => {
          output.push(`\n${idx + 1}. Email: ${sendAs.sendAsEmail}`);
          if (sendAs.displayName) output.push(`   Display Name: ${sendAs.displayName}`);
          if (sendAs.replyToAddress) output.push(`   Reply-To: ${sendAs.replyToAddress}`);
          output.push(`   Is Default: ${sendAs.isDefault ? 'Yes' : 'No'}`);
          output.push(`   Is Primary: ${sendAs.isPrimary ? 'Yes' : 'No'}`);

          if (sendAs.signature) {
            output.push(`   Signature: ${sendAs.signature.substring(0, 200)}${sendAs.signature.length > 200 ? '...' : ''}`);
          } else {
            output.push(`   Signature: (none)`);
          }

          if (sendAs.verificationStatus) {
            output.push(`   Verification Status: ${sendAs.verificationStatus}`);
          }
        });
      } catch (error) {
        output.push("=== Email Addresses & Signatures ===");
        output.push("Error retrieving SendAs settings");
      }

      // Get Vacation responder settings
      try {
        const vacationResponse = await gmail.users.settings.getVacation({
          userId: 'me',
        });

        const vacation = vacationResponse.data;
        output.push("\n\n=== Vacation Responder (Auto-Reply) ===");
        output.push(`Enabled: ${vacation.enableAutoReply ? 'Yes' : 'No'}`);

        if (vacation.enableAutoReply) {
          if (vacation.responseSubject) {
            output.push(`Subject: ${vacation.responseSubject}`);
          }
          if (vacation.responseBodyPlainText) {
            output.push(`Message: ${vacation.responseBodyPlainText.substring(0, 200)}${vacation.responseBodyPlainText.length > 200 ? '...' : ''}`);
          } else if (vacation.responseBodyHtml) {
            output.push(`Message (HTML): ${vacation.responseBodyHtml.substring(0, 200)}${vacation.responseBodyHtml.length > 200 ? '...' : ''}`);
          }
          if (vacation.startTime) {
            output.push(`Start Time: ${new Date(parseInt(vacation.startTime)).toLocaleString()}`);
          }
          if (vacation.endTime) {
            output.push(`End Time: ${new Date(parseInt(vacation.endTime)).toLocaleString()}`);
          }
          if (vacation.restrictToContacts !== undefined) {
            output.push(`Restrict to Contacts: ${vacation.restrictToContacts ? 'Yes' : 'No'}`);
          }
          if (vacation.restrictToDomain !== undefined) {
            output.push(`Restrict to Domain: ${vacation.restrictToDomain ? 'Yes' : 'No'}`);
          }
        }
      } catch (error) {
        output.push("\n\n=== Vacation Responder (Auto-Reply) ===");
        output.push("Error retrieving vacation settings");
      }

      // Get Forwarding settings
      try {
        const forwardingResponse = await gmail.users.settings.forwardingAddresses.list({
          userId: 'me',
        });

        const forwardingAddresses = forwardingResponse.data.forwardingAddresses || [];
        output.push("\n\n=== Forwarding Addresses ===");

        if (forwardingAddresses.length === 0) {
          output.push("No forwarding addresses configured");
        } else {
          forwardingAddresses.forEach((addr, idx) => {
            output.push(`${idx + 1}. ${addr.forwardingEmail}`);
            if (addr.verificationStatus) {
              output.push(`   Verification Status: ${addr.verificationStatus}`);
            }
          });
        }
      } catch (error) {
        output.push("\n\n=== Forwarding Addresses ===");
        output.push("Error retrieving forwarding settings");
      }

      // Get Auto-forwarding setting
      try {
        const autoForwardResponse = await gmail.users.settings.getAutoForwarding({
          userId: 'me',
        });

        const autoForward = autoForwardResponse.data;
        output.push("\n\n=== Auto-Forwarding ===");
        output.push(`Enabled: ${autoForward.enabled ? 'Yes' : 'No'}`);
        if (autoForward.enabled && autoForward.emailAddress) {
          output.push(`Forward to: ${autoForward.emailAddress}`);
          if (autoForward.disposition) {
            output.push(`Disposition: ${autoForward.disposition}`);
          }
        }
      } catch (error) {
        output.push("\n\n=== Auto-Forwarding ===");
        output.push("Auto-forwarding not available or error retrieving settings");
      }

      // Get IMAP settings
      try {
        const imapResponse = await gmail.users.settings.getImap({
          userId: 'me',
        });

        const imap = imapResponse.data;
        output.push("\n\n=== IMAP Settings ===");
        output.push(`Enabled: ${imap.enabled ? 'Yes' : 'No'}`);
        if (imap.autoExpunge !== undefined) {
          output.push(`Auto Expunge: ${imap.autoExpunge ? 'Yes' : 'No'}`);
        }
        if (imap.expungeBehavior) {
          output.push(`Expunge Behavior: ${imap.expungeBehavior}`);
        }
        if (imap.maxFolderSize) {
          output.push(`Max Folder Size: ${imap.maxFolderSize}`);
        }
      } catch (error) {
        output.push("\n\n=== IMAP Settings ===");
        output.push("Error retrieving IMAP settings");
      }

      // Get POP settings
      try {
        const popResponse = await gmail.users.settings.getPop({
          userId: 'me',
        });

        const pop = popResponse.data;
        output.push("\n\n=== POP Settings ===");
        if (pop.accessWindow) {
          output.push(`Access Window: ${pop.accessWindow}`);
        }
        if (pop.disposition) {
          output.push(`Disposition: ${pop.disposition}`);
        }
      } catch (error) {
        output.push("\n\n=== POP Settings ===");
        output.push("Error retrieving POP settings");
      }

      // Get Language settings
      try {
        const languageResponse = await gmail.users.settings.getLanguage({
          userId: 'me',
        });

        const language = languageResponse.data;
        output.push("\n\n=== Language Settings ===");
        if (language.displayLanguage) {
          output.push(`Display Language: ${language.displayLanguage}`);
        }
      } catch (error) {
        output.push("\n\n=== Language Settings ===");
        output.push("Error retrieving language settings");
      }

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error retrieving settings: ${gmailError.message}`;
    }
  }
}
