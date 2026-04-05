import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './export-follow-up.js';
import './recruiter-utils.js';

const { parseExportFields } = await import('./export-follow-up.js').then((m) => (m as any).__test__);
const {
  presetRecruiterFollowUpExportFields,
  normalizeRecruiterFollowUpFieldMappings,
  exportRecruiterFollowUpQueue,
} = await import('./recruiter-utils.js').then((m) => (m as any).__test__);

describe('linkedin export-follow-up adapter', () => {
  it('registers export-follow-up with csv default output', () => {
    const command = getRegistry().get('linkedin/export-follow-up');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.defaultFormat).toBe('csv');
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining([
        'preset',
        'fields',
        'template',
        'limit',
        'inbox-limit',
        'unread-only',
        'require-candidate-id',
        'require-profile-url',
      ]),
    );
  });

  it('parses export field mappings', () => {
    expect(parseExportFields('candidateId=candidate_id,\nfullName=name')).toEqual([
      'candidateId=candidate_id',
      'fullName=name',
    ]);
  });

  it('builds preset mappings and exports ats rows', () => {
    expect(presetRecruiterFollowUpExportFields('ats')).toEqual(
      expect.arrayContaining(['candidateId=candidate_id', 'fullName=name', 'followUpReason=reason']),
    );
    expect(normalizeRecruiterFollowUpFieldMappings(['Candidate ID=candidate_id', 'Name=name'])).toEqual([
      { target: 'Candidate ID', source: 'candidate_id' },
      { target: 'Name', source: 'name' },
    ]);

    const rows = exportRecruiterFollowUpQueue([
      {
        rank: 1,
        priority: 'high',
        priority_score: 9,
        recommended_action: 'reply-now',
        reason: 'thread marked unread',
        conversation_id: 'conv-1',
        candidate_id: 'candidate-1',
        name: 'Jane Doe',
        headline: 'Senior Recruiter',
        last_message: 'Interested',
        last_time: 'Today',
        unread: '1',
        profile_url: 'https://www.linkedin.com/in/a/',
        list_source: 'follow-up-queue',
      },
    ], {
      preset: 'ats',
      template: 'Hi {{first_name}}, following up.',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        candidateId: 'candidate-1',
        fullName: 'Jane Doe',
        firstName: 'Jane',
        followUpReason: 'thread marked unread',
        next_message: 'Hi Jane, following up.',
      }),
    ]);
  });
});
