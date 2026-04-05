import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './inbox-msg.js';

const { resolveInboxTarget } = await import('./inbox-msg.js').then((m) => (m as any).__test__);

describe('linkedin inbox-msg adapter', () => {
  it('registers recruiter inbox message reader', () => {
    const command = getRegistry().get('linkedin/inbox-msg');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.args.find((arg) => arg.name === 'limit')?.default).toBe(20);
    expect(command!.columns).toEqual(
      expect.arrayContaining([
        'conversation_id',
        'candidate_id',
        'from',
        'direction',
        'type',
        'text',
        'time',
        'profile_url',
        'list_source',
      ]),
    );
  });

  it('resolves a direct recruiter thread url from conversation id', () => {
    expect(resolveInboxTarget('conv-123', undefined, undefined)).toBe(
      'https://www.linkedin.com/talent/inbox/0/main/id/conv-123',
    );
  });

  it('falls back to recruiter profile messages when matching a recruiter profile target', () => {
    expect(resolveInboxTarget(
      '',
      'url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL3RhbGVudC9wcm9maWxlL0FFTUFBQUpsMXhVQnd1WFpheHFtc2RvZnRSaENVM21uVDM4RlI3OD9wcm9qZWN0PTM3NjEyNDk0NiZ0cms9UFJPSkVDVF9QSVBFTElORQ',
      undefined,
    )).toBe(
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78/messages?project=376124946',
    );
    expect(resolveInboxTarget('', '', 'https://www.linkedin.com/in/jane-doe/')).toBe(
      'https://www.linkedin.com/talent/inbox/0/main',
    );
    expect(resolveInboxTarget(
      '',
      '',
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78?project=376124946&trk=PROJECT_PIPELINE',
    )).toBe(
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78/messages?project=376124946&trk=PROJECT_PIPELINE',
    );
  });
});
