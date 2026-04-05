import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './inbox-list.js';

const { buildInboxUrl } = await import('./inbox-list.js').then((m) => (m as any).__test__);

describe('linkedin inbox-list adapter', () => {
  it('registers recruiter inbox list', () => {
    const command = getRegistry().get('linkedin/inbox-list');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.args.find((arg) => arg.name === 'limit')?.default).toBe(20);
    expect(command!.args.find((arg) => arg.name === 'start')?.default).toBe(0);
    expect(command!.columns).toEqual(
      expect.arrayContaining([
        'conversation_id',
        'candidate_id',
        'name',
        'last_message',
        'last_time',
        'unread',
        'profile_url',
        'list_source',
      ]),
    );
  });

  it('builds recruiter inbox url', () => {
    expect(buildInboxUrl()).toBe('https://www.linkedin.com/talent/inbox/0/main');
  });
});
