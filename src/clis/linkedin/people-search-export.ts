import { cli, Strategy } from '../../registry.js';
import { executePeopleSearch, PEOPLE_SEARCH_EXPORT_COLUMNS } from './people-search.js';

cli({
  site: 'linkedin',
  name: 'people-search-export',
  description: 'Export LinkedIn Recruiter candidate results with expanded work and education columns',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  defaultFormat: 'csv',
  args: [
    { name: 'query', type: 'string', required: true, positional: true, help: 'Candidate keywords, title, or talent query' },
    { name: 'location', type: 'string', help: 'Location filter such as London or Singapore' },
    { name: 'current-title', type: 'string', help: 'Current title filter' },
    { name: 'past-company', type: 'string', help: 'Past or current company filter' },
    { name: 'industry', type: 'string', help: 'Industry filter' },
    { name: 'seniority', type: 'string', help: 'Seniority filter such as manager, director, staff' },
    { name: 'skills', type: 'string', help: 'Comma-separated skill filters' },
    { name: 'language', type: 'string', help: 'Comma-separated language filters' },
    { name: 'open-to-work', type: 'bool', default: undefined, help: 'Require candidates marked as open to work' },
    { name: 'limit', type: 'int', default: 10, help: 'Number of candidates to return (max 100)' },
    { name: 'start', type: 'int', default: 0, help: 'Result offset after visible filtering' },
    { name: 'output', type: 'string', help: 'Optional CSV export path for Excel-friendly output' },
  ],
  columns: [...PEOPLE_SEARCH_EXPORT_COLUMNS],
  footerExtra: (kwargs) => {
    const outputPath = String(kwargs.output ?? '').trim();
    return outputPath ? `exported csv: ${outputPath}` : undefined;
  },
  func: async (page, kwargs) => executePeopleSearch(page, kwargs, {
    forceDetailedOutput: true,
    forceCsvOutput: true,
  }),
});
