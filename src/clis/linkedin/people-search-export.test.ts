import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './people-search.js';
import './people-search-export.js';

describe('linkedin people-search-export adapter', () => {
  const command = getRegistry().get('linkedin/people-search-export');

  it('registers the export command with csv default output', () => {
    expect(command).toBeDefined();
    expect(command!.site).toBe('linkedin');
    expect(command!.name).toBe('people-search-export');
    expect(command!.defaultFormat).toBe('csv');
    expect(command!.browser).toBe(true);
  });

  it('defines export-friendly columns and output argument', () => {
    expect(command!.columns).toEqual(expect.arrayContaining([
      'candidate_id',
      'name',
      'current_title',
      'work_history_1',
      'education_1',
      'list_source',
    ]));
    expect(command!.args.map((arg) => arg.name)).toEqual(expect.arrayContaining([
      'query',
      'output',
      'limit',
      'start',
    ]));
  });
});
