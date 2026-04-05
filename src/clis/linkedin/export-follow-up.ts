import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterFollowUpQueue,
  buildRecruiterInboxUrl,
  collectRecruiterInboxThreads,
  ensureRecruiterSurface,
  exportRecruiterFollowUpQueue,
  normalizeRecruiterFollowUpFieldMappings,
} from './recruiter-utils.js';

function parseExportFields(value: unknown): string[] {
  return String(value ?? '')
    .split(/[,\r\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

cli({
  site: 'linkedin',
  name: 'export-follow-up',
  description: 'Export the Recruiter follow-up queue with ATS or spreadsheet schema presets',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  defaultFormat: 'csv',
  args: [
    { name: 'preset', type: 'string', default: 'ats', help: 'Schema preset: ats, sheet, or opencli' },
    { name: 'fields', type: 'string', help: 'Comma or newline separated target=source field mappings' },
    { name: 'template', type: 'string', help: 'Optional reply template to export as next_message' },
    { name: 'limit', type: 'int', default: 50, help: 'Maximum follow-up rows to export after prioritization' },
    { name: 'inbox-limit', type: 'int', default: 100, help: 'Visible inbox threads to sample before ranking' },
    { name: 'unread-only', type: 'bool', default: false, help: 'Only include unread or newly updated threads' },
    { name: 'require-candidate-id', type: 'bool', default: true, help: 'Only include rows with a reusable candidate_id' },
    { name: 'require-profile-url', type: 'bool', default: false, help: 'Only include rows with a reusable profile_url' },
  ],
  func: async (page, kwargs) => {
    const limit = Math.max(1, Math.min(Number(kwargs.limit ?? 50), 200));
    const inboxLimit = Math.max(limit, Math.min(Number(kwargs['inbox-limit'] ?? 100), 250));
    const preset = String(kwargs.preset ?? 'ats').trim() || 'ats';
    const fields = parseExportFields(kwargs.fields);
    const template = String(kwargs.template ?? '').trim();

    await ensureRecruiterSurface(page, buildRecruiterInboxUrl());
    const threads = await collectRecruiterInboxThreads(page, inboxLimit, 0, 'export-follow-up:inbox');
    const queue = buildRecruiterFollowUpQueue(threads, {
      unreadOnly: Boolean(kwargs['unread-only']),
      requireCandidateId: Boolean(kwargs['require-candidate-id']),
      requireProfileUrl: Boolean(kwargs['require-profile-url']),
    }).slice(0, limit);

    const rows = exportRecruiterFollowUpQueue(queue, {
      preset,
      fields,
      template,
    });

    const mappings = normalizeRecruiterFollowUpFieldMappings(fields, preset);
    return rows.map((row) => {
      const ordered: Record<string, string> = {};
      for (const mapping of mappings) {
        ordered[mapping.target] = row[mapping.target] ?? '';
      }
      if (template) ordered.next_message = row.next_message ?? '';
      return ordered;
    });
  },
});

export const __test__ = {
  parseExportFields,
};
