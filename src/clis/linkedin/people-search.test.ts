import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './people-search.js';

const {
  splitProfileHistory,
  splitEducationHistory,
  normalizeWorkHistoryItems,
  parseWorkHistoryItem,
  buildDetailedCandidateRow,
  toPeopleSearchExportRow,
  shouldIncludeDetailedFields,
  resolvePeopleSearchColumns,
  PEOPLE_SEARCH_SUMMARY_COLUMNS,
  PEOPLE_SEARCH_EXPORT_COLUMNS,
  writePeopleSearchCsv,
} = await import('./people-search.js').then((m) => (m as any).__test__);

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

  it('defines recruiter search arguments including export/detail controls', () => {
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
        'include-profile-details',
        'output',
      ]),
    );

    expect(command!.args.find((arg) => arg.name === 'limit')?.default).toBe(10);
    expect(command!.args.find((arg) => arg.name === 'start')?.default).toBe(0);
  });

  it('uses summary columns by default and resolves export columns for csv', () => {
    expect(command!.columns).toEqual(expect.arrayContaining([
      'candidate_id',
      'name',
      'current_company',
      'current_title',
      'match_signals',
      'profile_url',
      'list_source',
    ]));
    expect(resolvePeopleSearchColumns({ format: 'table' }, [])).toEqual([...PEOPLE_SEARCH_SUMMARY_COLUMNS]);
    expect(resolvePeopleSearchColumns({ format: 'csv' }, [])).toEqual([...PEOPLE_SEARCH_EXPORT_COLUMNS]);
  });
});

describe('people-search detail shaping helpers', () => {
  it('splits multiline history fields into up to five items', () => {
    expect(splitProfileHistory('a\nb\n\nc\nd\ne\nf')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('filters recruiter field labels out of work history arrays', () => {
    expect(splitProfileHistory([
      '已添加简历进行完善',
      '简历中的亮点信息',
      '职位名称',
      'Fractional CTO | Technology Advisor & Startup Growth',
      '公司名称',
      'IT ART LLC',
      '学校名称',
      '英国利物浦大学',
      '学位详情',
      '学位名称',
      'Master’s Degree •',
    ].join('\n'))).toEqual([
      'Fractional CTO | Technology Advisor & Startup Growth @ IT ART LLC',
    ]);
  });

  it('filters recruiter field labels out of education history arrays', () => {
    expect(splitEducationHistory([
      '学校名称',
      '英国利物浦大学',
      '学位详情',
      'Master’s Degree •',
      '学位名称',
      'Computer Science',
    ].join('\n'))).toEqual([
      '英国利物浦大学 | Computer Science | Master’s Degree •',
    ]);
  });

  it('builds a detailed row with expanded history arrays', () => {
    const row = buildDetailedCandidateRow({
      rank: 1,
      candidate_id: 'cand-1',
      profile_url: 'https://www.linkedin.com/talent/profile/1',
      name: 'Alice',
      headline: 'Recruiter',
      location: 'Singapore',
      current_company: 'LinkedIn',
      current_title: 'Senior Recruiter',
      connection_degree: '2nd',
      open_to_work: 'no',
      match_signals: 'Open to relocation',
      list_source: 'search',
    }, {
      work_history: 'Role A\nRole B',
      education: 'School A\nSchool B\nSchool C',
    });

    expect(row.work_history_items).toEqual(['Role A', 'Role B']);
    expect(row.education_items).toEqual(['School A', 'School B', 'School C']);
  });

  it('corrects the first work-history company when the title matches the current role summary', () => {
    expect(normalizeWorkHistoryItems([
      'Regional VP, Crossborder Logistics & LEX @ Amazon',
      'Regional Senior Manager, Crossborder @ Amazon',
    ], 'Regional VP, Crossborder Logistics & LEX', 'Lazada')).toEqual([
      'Regional VP, Crossborder Logistics & LEX @ Lazada',
      'Regional Senior Manager, Crossborder @ Amazon',
    ]);
  });

  it('parses company, duration, and employment type from flattened work-history cells', () => {
    expect(parseWorkHistoryItem('Chief Technology Officer @ Yojee | 2022 - 2024 · 2 yrs | Full-time')).toEqual({
      raw: 'Chief Technology Officer @ Yojee | 2022 - 2024 · 2 yrs | Full-time',
      title: 'Chief Technology Officer',
      company: 'Yojee',
      duration: '2022 - 2024 · 2 yrs',
      employmentType: 'Full-time',
    });

    expect(parseWorkHistoryItem('VP of Product Engineering @ Needl.ai · Full-time')).toEqual({
      raw: 'VP of Product Engineering @ Needl.ai · Full-time',
      title: 'VP of Product Engineering',
      company: 'Needl.ai',
      duration: '',
      employmentType: 'Full-time',
    });

    expect(parseWorkHistoryItem('Engineering Manager @ Lazada 路 全职')).toEqual({
      raw: 'Engineering Manager @ Lazada 路 全职',
      title: 'Engineering Manager',
      company: 'Lazada',
      duration: '',
      employmentType: '全职',
    });
  });

  it('flattens detailed rows into excel-friendly export columns', () => {
    const flattened = toPeopleSearchExportRow({
      rank: 2,
      candidate_id: 'cand-2',
      profile_url: 'https://www.linkedin.com/talent/profile/2',
      name: 'Bob',
      headline: 'Engineer',
      location: 'Shanghai',
      current_company: 'Meta',
      current_title: 'Staff Engineer',
      connection_degree: '1st',
      open_to_work: 'yes',
      match_signals: 'Mutual connections',
      list_source: 'search',
      work_history_items: ['Meta Staff Engineer', 'Snap Senior Engineer'],
      education_items: ['CMU MSCS'],
    });

    expect(flattened.work_history_1).toBe('Meta Staff Engineer');
    expect(flattened.work_history_2).toBe('Snap Senior Engineer');
    expect(flattened.work_history_5).toBe('');
    expect(flattened.work_company_1).toBe('');
    expect(flattened.work_duration_1).toBe('');
    expect(flattened.work_type_1).toBe('');
    expect(flattened.education_1).toBe('CMU MSCS');
    expect(flattened.education_5).toBe('');
  });

  it('adds structured work export columns for downstream filtering', () => {
    const flattened = toPeopleSearchExportRow({
      rank: 1,
      candidate_id: 'cand-3',
      profile_url: 'https://www.linkedin.com/talent/profile/3',
      name: 'Carol',
      headline: 'VP Engineering',
      location: 'Singapore',
      current_company: 'Lazada',
      current_title: 'VP Engineering',
      connection_degree: '2nd',
      open_to_work: 'yes',
      match_signals: 'open to work',
      list_source: 'search',
      work_history_items: [
        'VP Engineering @ Lazada | 2022 - Present · 3 yrs | Full-time',
        'Engineering Manager @ Alibaba · Full-time',
      ],
      education_items: [],
    });

    expect(flattened.work_company_1).toBe('Lazada');
    expect(flattened.work_duration_1).toBe('2022 - Present · 3 yrs');
    expect(flattened.work_type_1).toBe('Full-time');
    expect(flattened.work_company_2).toBe('Alibaba');
    expect(flattened.work_duration_2).toBe('');
    expect(flattened.work_type_2).toBe('Full-time');
  });

  it('enables detailed mode for csv, explicit flag, or output path', () => {
    expect(shouldIncludeDetailedFields({ format: 'csv' })).toBe(true);
    expect(shouldIncludeDetailedFields({ format: 'json', 'include-profile-details': true })).toBe(true);
    expect(shouldIncludeDetailedFields({ format: 'table', output: '.\\people.csv' })).toBe(true);
    expect(shouldIncludeDetailedFields({ format: 'table' })).toBe(false);
  });

  it('writes csv exports with a utf-8 bom for excel compatibility', async () => {
    const outputPath = join(tmpdir(), `people-search-${Date.now()}.csv`);
    try {
      await writePeopleSearchCsv(outputPath, [{
        rank: 1,
        candidate_id: 'cand-1',
        profile_url: 'https://www.linkedin.com/talent/profile/1',
        name: '张三',
        headline: 'VP Engineering',
        location: '新加坡',
        current_company: 'Example',
        current_title: 'VP Engineering',
        connection_degree: '2nd',
        open_to_work: 'yes',
        match_signals: 'open to work',
        list_source: 'search',
        work_history_items: ['Role A'],
        education_items: ['School A'],
      }]);

      const bytes = await readFile(outputPath);
      expect(Array.from(bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
      expect(bytes.toString('utf8')).toContain('张三');
    } finally {
      await rm(outputPath, { force: true });
    }
  });
});
