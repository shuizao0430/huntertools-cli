import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterProjectMembersUrl,
  collectRecruiterPeople,
  ensureRecruiterSurface,
  type RecruiterPeopleSearchInput,
} from './recruiter-utils.js';

function buildProjectUrl(projectId: string): string {
  return buildRecruiterProjectMembersUrl(projectId);
}

cli({
  site: 'linkedin',
  name: 'recruiter-project-members',
  description: 'List candidate members from a LinkedIn Recruiter project',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'project-id', type: 'string', required: true, positional: true, help: 'Recruiter project ID' },
    { name: 'limit', type: 'int', default: 25, help: 'Number of members to return (max 100)' },
    { name: 'start', type: 'int', default: 0, help: 'Result offset after visible filtering' },
  ],
  columns: [
    'rank',
    'candidate_id',
    'name',
    'headline',
    'location',
    'current_company',
    'current_title',
    'connection_degree',
    'open_to_work',
    'match_signals',
    'profile_url',
    'list_source',
  ],
  func: async (page, kwargs) => {
    const projectId = String(kwargs['project-id'] ?? '').trim();
    if (!projectId) throw new ArgumentError('project-id is required');

    const input: RecruiterPeopleSearchInput = {
      query: '',
      limit: Math.max(1, Math.min(Number(kwargs.limit ?? 25), 100)),
      start: Math.max(0, Number(kwargs.start ?? 0)),
    };

    await ensureRecruiterSurface(page, buildProjectUrl(projectId));
    return collectRecruiterPeople(page, input, `project:${projectId}`);
  },
});

export const __test__ = {
  buildProjectUrl,
};
