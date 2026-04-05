import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterSavedSearchesUrl,
  collectRecruiterSavedSearches,
  ensureRecruiterSurface,
} from './recruiter-utils.js';

cli({
  site: 'linkedin',
  name: 'recruiter-saved-searches',
  description: 'List LinkedIn Recruiter saved searches',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['rank', 'search_id', 'name', 'query', 'cadence', 'result_count', 'url'],
  func: async (page) => {
    await ensureRecruiterSurface(page, buildRecruiterSavedSearchesUrl());
    return collectRecruiterSavedSearches(page);
  },
});
