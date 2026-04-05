import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './people-search.js';

describe('linkedin people-search adapter', () => {
  const command = getRegistry().get('linkedin/people-search');

  it('registers the command with recruiter browser shape', () => {
    expect(command).toBeDefined();
    expect(command!.site).toBe('linkedin');
    expect(command!.name).toBe('people-search');
    expect(command!.domain).toBe('www.linkedin.com');
    expect(command!.strategy).toBe('cookie');
    expect(command!.browser).toBe(true);
    expect(typeof command!.func).toBe('function');
  });

  it('defines recruiter search arguments', () => {
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining([
        'query',
        'location',
        'current-title',
        'past-company',
        'industry',
        'seniority',
        'skills',
        'language',
        'open-to-work',
        'limit',
        'start',
      ]),
    );

    expect(command!.args.find((arg) => arg.name === 'limit')?.default).toBe(10);
    expect(command!.args.find((arg) => arg.name === 'start')?.default).toBe(0);
  });

  it('includes candidate pipeline columns', () => {
    expect(command!.columns).toEqual(
      expect.arrayContaining([
        'candidate_id',
        'name',
        'current_company',
        'current_title',
        'match_signals',
        'profile_url',
        'list_source',
      ]),
    );
  });
});
