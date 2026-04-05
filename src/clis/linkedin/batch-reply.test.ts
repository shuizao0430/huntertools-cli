import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './batch-reply.js';

const { parseBatchReplyTargets, resolveBatchReplyTargetUrl } = await import('./batch-reply.js').then(
  (m) => (m as any).__test__,
);

describe('linkedin batch-reply adapter', () => {
  it('registers batch-reply', () => {
    const command = getRegistry().get('linkedin/batch-reply');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining(['targets', 'text', 'profile-url', 'delay-ms', 'retries', 'limit', 'dry-run']),
    );
    expect(command!.columns).toEqual(
      expect.arrayContaining(['conversation_id', 'candidate_id', 'profile_url', 'status', 'detail', 'list_source']),
    );
  });

  it('parses batch reply targets and deduplicates them', () => {
    expect(parseBatchReplyTargets(
      'conv-1|candidate-a|https://www.linkedin.com/in/a/\nconv-1|candidate-a|https://www.linkedin.com/in/a/\nconv-2',
    )).toEqual([
      {
        conversationId: 'conv-1',
        candidateId: 'candidate-a',
        profileUrl: 'https://www.linkedin.com/in/a/',
      },
      {
        conversationId: 'conv-2',
        candidateId: undefined,
        profileUrl: undefined,
      },
    ]);
  });

  it('uses fallback profile urls and resolves thread routes', () => {
    const targets = parseBatchReplyTargets('conv-3||', 'https://www.linkedin.com/in/fallback/');
    expect(targets[0]).toEqual({
      conversationId: 'conv-3',
      candidateId: undefined,
      profileUrl: 'https://www.linkedin.com/in/fallback/',
    });
    expect(resolveBatchReplyTargetUrl(targets[0])).toBe(
      'https://www.linkedin.com/talent/inbox/0/main/id/conv-3',
    );
    expect(resolveBatchReplyTargetUrl({ candidateId: 'candidate-a' })).toBe(
      'https://www.linkedin.com/talent/inbox/0/main',
    );
  });
});
