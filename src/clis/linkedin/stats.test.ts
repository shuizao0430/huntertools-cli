import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './stats.js';
import './recruiter-utils.js';

const {
  summarizeRecruiterPeopleStats,
  summarizeRecruiterInboxStats,
} = await import('./recruiter-utils.js').then((m) => (m as any).__test__);

describe('linkedin stats adapter', () => {
  it('registers stats', () => {
    const command = getRegistry().get('linkedin/stats');
    expect(command).toBeDefined();
    expect(command!.browser).toBe(true);
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining(['query', 'search-limit', 'inbox-limit']),
    );
    expect(command!.columns).toEqual(
      expect.arrayContaining(['category', 'metric', 'value', 'detail', 'list_source']),
    );
  });
});

describe('recruiter stats summaries', () => {
  it('summarizes visible people-search metrics', () => {
    const rows = summarizeRecruiterPeopleStats([
      {
        candidate_id: 'url:one',
        profile_url: 'https://www.linkedin.com/in/one/',
        name: 'Jane',
        headline: 'Senior Technical Recruiter at Globex',
        location: 'Singapore',
        current_company: 'Globex',
        current_title: 'Senior Technical Recruiter',
        connection_degree: '2nd',
        open_to_work: 'yes',
        match_signals: 'open to work; recently active',
        list_source: 'search',
      },
      {
        candidate_id: 'url:two',
        profile_url: 'https://www.linkedin.com/in/two/',
        name: 'John',
        headline: 'Talent Partner at Initech',
        location: 'London',
        current_company: 'Initech',
        current_title: 'Talent Partner',
        connection_degree: '',
        open_to_work: 'no',
        match_signals: '',
        list_source: 'search',
      },
    ]);

    expect(rows.find((row: any) => row.metric === 'visible_candidates')?.value).toBe('2');
    expect(rows.find((row: any) => row.metric === 'open_to_work_yes')?.value).toBe('1');
    expect(rows.find((row: any) => row.metric === 'unique_companies')?.value).toBe('2');
  });

  it('summarizes visible inbox metrics', () => {
    const rows = summarizeRecruiterInboxStats([
      {
        conversation_id: 'conv-1',
        candidate_id: 'url:one',
        profile_url: 'https://www.linkedin.com/in/one/',
        name: 'Jane',
        headline: 'Recruiter',
        last_message: 'Sounds good',
        last_time: 'Today',
        unread: '1',
        list_source: 'inbox',
      },
      {
        conversation_id: 'conv-2',
        candidate_id: '',
        profile_url: '',
        name: 'John',
        headline: 'Sourcer',
        last_message: 'Thanks',
        last_time: '2d ago',
        unread: '',
        list_source: 'inbox',
      },
    ]);

    expect(rows.find((row: any) => row.metric === 'visible_threads')?.value).toBe('2');
    expect(rows.find((row: any) => row.metric === 'unread_threads')?.value).toBe('1');
    expect(rows.find((row: any) => row.metric === 'threads_with_candidate_id')?.value).toBe('1');
  });
});
