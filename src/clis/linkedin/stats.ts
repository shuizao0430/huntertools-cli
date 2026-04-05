import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterInboxUrl,
  buildRecruiterSearchUrl,
  collectRecruiterInboxThreads,
  collectRecruiterPeople,
  ensureRecruiterSurface,
  summarizeRecruiterInboxStats,
  summarizeRecruiterPeopleStats,
  trySeedRecruiterSearch,
  type RecruiterPeopleSearchInput,
  type RecruiterStatsRow,
} from './recruiter-utils.js';

cli({
  site: 'linkedin',
  name: 'stats',
  description: 'Summarize live LinkedIn Recruiter search and inbox operating metrics',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'query', type: 'string', help: 'Optional recruiter search query to summarize people-search results' },
    { name: 'location', type: 'string', help: 'Location filter for the search summary' },
    { name: 'current-title', type: 'string', help: 'Current title filter for the search summary' },
    { name: 'past-company', type: 'string', help: 'Past or current company filter for the search summary' },
    { name: 'industry', type: 'string', help: 'Industry filter for the search summary' },
    { name: 'seniority', type: 'string', help: 'Seniority filter for the search summary' },
    { name: 'skills', type: 'string', help: 'Comma-separated skill filters for the search summary' },
    { name: 'language', type: 'string', help: 'Comma-separated language filters for the search summary' },
    { name: 'open-to-work', type: 'bool', default: undefined, help: 'Require candidates marked as open to work' },
    { name: 'search-limit', type: 'int', default: 25, help: 'Visible candidate count to sample for search stats' },
    { name: 'inbox-limit', type: 'int', default: 50, help: 'Visible thread count to sample for inbox stats' },
  ],
  columns: ['category', 'metric', 'value', 'detail', 'list_source'],
  func: async (page, kwargs) => {
    const rows: RecruiterStatsRow[] = [];
    const query = String(kwargs.query ?? '').trim();
    const searchLimit = Math.max(1, Math.min(Number(kwargs['search-limit'] ?? 25), 100));
    const inboxLimit = Math.max(1, Math.min(Number(kwargs['inbox-limit'] ?? 50), 200));

    if (query) {
      const searchInput: RecruiterPeopleSearchInput = {
        query,
        location: String(kwargs.location ?? '').trim() || undefined,
        currentTitle: String(kwargs['current-title'] ?? '').trim() || undefined,
        pastCompany: String(kwargs['past-company'] ?? '').trim() || undefined,
        industry: String(kwargs.industry ?? '').trim() || undefined,
        seniority: String(kwargs.seniority ?? '').trim() || undefined,
        skills: String(kwargs.skills ?? '').trim() || undefined,
        language: String(kwargs.language ?? '').trim() || undefined,
        openToWork: typeof kwargs['open-to-work'] === 'boolean' ? kwargs['open-to-work'] : undefined,
        limit: searchLimit,
        start: 0,
      };

      await ensureRecruiterSurface(page, buildRecruiterSearchUrl(searchInput));
      await trySeedRecruiterSearch(page, searchInput);
      const candidates = await collectRecruiterPeople(page, searchInput, 'stats:search');
      rows.push(...summarizeRecruiterPeopleStats(candidates, 'stats:search'));
    }

    await ensureRecruiterSurface(page, buildRecruiterInboxUrl());
    const threads = await collectRecruiterInboxThreads(page, inboxLimit, 0, 'stats:inbox');
    rows.push(...summarizeRecruiterInboxStats(threads, 'stats:inbox'));

    return rows;
  },
});
