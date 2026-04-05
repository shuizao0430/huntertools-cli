import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './batch-message.js';

const { parseBatchTargets } = await import('./batch-message.js').then((m) => (m as any).__test__);

describe('linkedin batch-message adapter', () => {
  const command = getRegistry().get('linkedin/batch-message');

  it('registers the command', () => {
    expect(command).toBeDefined();
    expect(command!.site).toBe('linkedin');
    expect(command!.name).toBe('batch-message');
    expect(command!.strategy).toBe('cookie');
    expect(command!.browser).toBe(true);
  });

  it('defines batch sending arguments', () => {
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining(['targets', 'text', 'profile-url', 'delay-ms', 'retries', 'limit', 'dry-run']),
    );
    expect(command!.args.find((arg) => arg.name === 'delay-ms')?.default).toBe(1500);
    expect(command!.args.find((arg) => arg.name === 'retries')?.default).toBe(1);
    expect(command!.args.find((arg) => arg.name === 'dry-run')?.default).toBe(false);
  });

  it('includes batch message result columns', () => {
    expect(command!.columns).toEqual(
      expect.arrayContaining(['candidate_id', 'conversation_id', 'profile_url', 'status', 'detail', 'list_source']),
    );
  });
});

describe('parseBatchTargets', () => {
  it('parses comma-separated candidate ids', () => {
    expect(parseBatchTargets('one,two,three')).toEqual([
      { candidateId: 'one', profileUrl: undefined },
      { candidateId: 'two', profileUrl: undefined },
      { candidateId: 'three', profileUrl: undefined },
    ]);
  });

  it('supports candidate_id|profile_url format and deduplicates', () => {
    expect(
      parseBatchTargets(
        'one|https://www.linkedin.com/in/one/\none|https://www.linkedin.com/in/one/\ntwo',
      ),
    ).toEqual([
      { candidateId: 'one', profileUrl: 'https://www.linkedin.com/in/one/' },
      { candidateId: 'two', profileUrl: undefined },
    ]);
  });

  it('applies a fallback profile url when given', () => {
    expect(parseBatchTargets('one,two', 'https://www.linkedin.com/in/shared/')).toEqual([
      { candidateId: 'one', profileUrl: 'https://www.linkedin.com/in/shared/' },
      { candidateId: 'two', profileUrl: 'https://www.linkedin.com/in/shared/' },
    ]);
  });
});
