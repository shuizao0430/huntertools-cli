import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './inbox-reply.js';

const { resolveInboxReplyTarget } = await import('./inbox-reply.js').then((m) => (m as any).__test__);

describe('linkedin inbox-reply adapter', () => {
  it('registers recruiter inbox reply with alias', () => {
    const command = getRegistry().get('linkedin/inbox-reply');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.aliases).toContain('reply');
    expect(getRegistry().get('linkedin/reply')).toBe(command);
    expect(command!.args.find((arg) => arg.name === 'reply-text')).toBeDefined();
    expect(command!.columns).toEqual(
      expect.arrayContaining(['conversation_id', 'candidate_id', 'profile_url', 'status', 'detail', 'list_source']),
    );
  });

  it('resolves direct thread urls for replies', () => {
    expect(resolveInboxReplyTarget('conv-123', undefined, undefined)).toBe(
      'https://www.linkedin.com/talent/inbox/0/main/id/conv-123',
    );
  });

  it('falls back to recruiter profile messages for recruiter profile replies', () => {
    expect(resolveInboxReplyTarget(
      '',
      'url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL3RhbGVudC9wcm9maWxlL0FFTUFBQUpsMXhVQnd1WFpheHFtc2RvZnRSaENVM21uVDM4RlI3OD9wcm9qZWN0PTM3NjEyNDk0NiZ0cms9UFJPSkVDVF9QSVBFTElORQ',
      undefined,
    )).toBe(
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78/messages?project=376124946',
    );
    expect(resolveInboxReplyTarget(
      '',
      '',
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78?project=376124946&trk=PROJECT_PIPELINE',
    )).toBe(
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78/messages?project=376124946&trk=PROJECT_PIPELINE',
    );
  });
});
