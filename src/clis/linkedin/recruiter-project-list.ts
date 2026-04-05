import { cli, Strategy } from '../../registry.js';
import { collectRecruiterProjects, ensureRecruiterSurface } from './recruiter-utils.js';

cli({
  site: 'linkedin',
  name: 'recruiter-project-list',
  description: 'List LinkedIn Recruiter projects or pipeline folders',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [],
  columns: ['rank', 'project_id', 'name', 'description', 'status', 'candidate_count', 'updated_at', 'url'],
  func: async (page) => {
    await ensureRecruiterSurface(page, 'https://www.linkedin.com/talent/projects');
    return collectRecruiterProjects(page);
  },
});
