import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './follow-up-queue.js';
import './recruiter-utils.js';

const { buildRecruiterFollowUpQueue } = await import('./recruiter-utils.js').then((m) => (m as any).__test__);

describe('linkedin follow-up-queue adapter', () => {
  it('registers follow-up-queue', () => {
    const command = getRegistry().get('linkedin/follow-up-queue');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining(['limit', 'inbox-limit', 'unread-only', 'require-candidate-id', 'require-profile-url']),
    );
    expect(command!.columns).toEqual(
      expect.arrayContaining(['priority', 'priority_score', 'recommended_action', 'conversation_id', 'candidate_id']),
    );
  });
});

describe('follow-up queue ranking', () => {
  it('prioritizes unread and recent conversations', () => {
    const queue = buildRecruiterFollowUpQueue([
      {
        conversation_id: 'conv-1',
        candidate_id: 'candidate-1',
        profile_url: 'https://www.linkedin.com/in/a/',
        name: 'Jane',
        headline: 'Recruiter',
        last_message: 'Thanks, I am interested',
        last_time: 'Today',
        unread: '2',
        list_source: 'inbox',
      },
      {
        conversation_id: 'conv-2',
        candidate_id: 'candidate-2',
        profile_url: 'https://www.linkedin.com/in/b/',
        name: 'John',
        headline: 'Sourcer',
        last_message: 'Will review later',
        last_time: '1w ago',
        unread: '',
        list_source: 'inbox',
      },
    ]);

    expect(queue[0].conversation_id).toBe('conv-1');
    expect(queue[0].priority).toBe('high');
    expect(queue[0].recommended_action).toBe('reply-now');
  });

  it('supports unread-only and identity requirements', () => {
    const queue = buildRecruiterFollowUpQueue([
      {
        conversation_id: 'conv-1',
        candidate_id: '',
        profile_url: '',
        name: 'Jane',
        headline: 'Recruiter',
        last_message: 'Hello',
        last_time: 'Today',
        unread: '1',
        list_source: 'inbox',
      },
      {
        conversation_id: 'conv-2',
        candidate_id: 'candidate-2',
        profile_url: 'https://www.linkedin.com/in/b/',
        name: 'John',
        headline: 'Sourcer',
        last_message: 'Hello',
        last_time: 'Today',
        unread: '',
        list_source: 'inbox',
      },
    ], {
      unreadOnly: true,
      requireCandidateId: true,
    });

    expect(queue).toHaveLength(0);
  });
});
