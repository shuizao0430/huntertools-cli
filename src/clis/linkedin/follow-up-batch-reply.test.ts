import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './follow-up-batch-reply.js';
import './recruiter-utils.js';

const {
  parsePriorities,
  parseConversationIds,
  filterFollowUpQueueForBatchReply,
  resolveFollowUpBatchReplyTargetUrl,
} = await import('./follow-up-batch-reply.js').then((m) => (m as any).__test__);
const { renderRecruiterFollowUpTemplate } = await import('./recruiter-utils.js').then((m) => (m as any).__test__);

describe('linkedin follow-up-batch-reply adapter', () => {
  it('registers follow-up-batch-reply', () => {
    const command = getRegistry().get('linkedin/follow-up-batch-reply');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining([
        'template',
        'priorities',
        'conversation-ids',
        'limit',
        'inbox-limit',
        'unread-only',
        'require-candidate-id',
        'require-profile-url',
        'delay-ms',
        'retries',
        'dry-run',
      ]),
    );
    expect(command!.columns).toEqual(
      expect.arrayContaining([
        'priority',
        'priority_score',
        'recommended_action',
        'conversation_id',
        'candidate_id',
        'rendered_text',
        'status',
      ]),
    );
  });

  it('parses priorities and filters ranked queue rows', () => {
    expect(parsePriorities('high,medium,high')).toEqual(['high', 'medium']);
    expect(parseConversationIds('conv-1,\nconv-2,conv-1')).toEqual(['conv-1', 'conv-2']);

    const filtered = filterFollowUpQueueForBatchReply([
      {
        rank: 1,
        priority: 'high',
        priority_score: 9,
        recommended_action: 'reply-now',
        reason: 'thread marked unread',
        conversation_id: 'conv-1',
        candidate_id: 'candidate-1',
        name: 'Jane',
        headline: 'Recruiter',
        last_message: 'Interested',
        last_time: 'Today',
        unread: '1',
        profile_url: 'https://www.linkedin.com/in/a/',
        list_source: 'follow-up-queue',
      },
      {
        rank: 2,
        priority: 'low',
        priority_score: 1,
        recommended_action: 'monitor',
        reason: 'visible recruiter thread',
        conversation_id: 'conv-2',
        candidate_id: '',
        name: 'John',
        headline: 'Sourcer',
        last_message: 'Later',
        last_time: '1w ago',
        unread: '',
        profile_url: '',
        list_source: 'follow-up-queue',
      },
    ], {
      priorities: ['high'],
      unreadOnly: true,
      requireCandidateId: false,
      requireProfileUrl: false,
      conversationIds: ['conv-1'],
      limit: 10,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].conversation_id).toBe('conv-1');
  });

  it('renders template variables from queue items and resolves reply urls', () => {
    const item = {
      rank: 1,
      priority: 'high',
      priority_score: 9,
      recommended_action: 'reply-now',
      reason: 'thread marked unread; active today',
      conversation_id: 'conv-1',
      candidate_id: 'candidate-1',
      name: 'Jane Doe',
      headline: 'Senior Recruiter',
      last_message: 'Thanks, sounds good',
      last_time: 'Today',
      unread: '1',
      profile_url: 'https://www.linkedin.com/in/a/',
      list_source: 'follow-up-queue',
    };

    expect(renderRecruiterFollowUpTemplate(
      'Hi {{first_name}}, following up because {{reason}}.',
      item,
    )).toBe('Hi Jane, following up because thread marked unread; active today.');
    expect(resolveFollowUpBatchReplyTargetUrl(item)).toBe(
      'https://www.linkedin.com/talent/inbox/0/main/id/conv-1',
    );
  });
});
