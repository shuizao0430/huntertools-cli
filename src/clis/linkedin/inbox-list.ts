import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterInboxUrl,
  collectRecruiterInboxThreads,
  ensureRecruiterSurface,
} from './recruiter-utils.js';

cli({
  site: 'linkedin',
  name: 'inbox-list',
  description: 'List LinkedIn Recruiter inbox conversations',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'limit', type: 'int', default: 20, help: 'Number of conversations to return (max 100)' },
    { name: 'start', type: 'int', default: 0, help: 'Result offset after dedupe' },
  ],
  columns: [
    'rank',
    'conversation_id',
    'candidate_id',
    'name',
    'headline',
    'last_message',
    'last_time',
    'unread',
    'profile_url',
    'list_source',
  ],
  func: async (page, kwargs) => {
    const limit = Math.max(1, Math.min(Number(kwargs.limit ?? 20), 100));
    const start = Math.max(0, Number(kwargs.start ?? 0));
    await ensureRecruiterSurface(page, buildRecruiterInboxUrl());
    return collectRecruiterInboxThreads(page, limit, start);
  },
});

export const __test__ = {
  buildInboxUrl: buildRecruiterInboxUrl,
};
