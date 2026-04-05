import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import {
  addRecruiterTag,
  ensureRecruiterSurface,
  resolveRecruiterProfileUrl,
} from './recruiter-utils.js';

function resolveTargetUrl(candidateId: string | undefined, profileUrl: string | undefined): string {
  const resolved = resolveRecruiterProfileUrl(candidateId, profileUrl);
  if (resolved) return resolved;
  throw new ArgumentError('candidate-id or --profile-url is required');
}

cli({
  site: 'linkedin',
  name: 'tag',
  description: 'Add a LinkedIn Recruiter tag to a candidate',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'candidate-id', type: 'string', positional: true, help: 'Candidate ID from linkedin people-search' },
    { name: 'tag', type: 'string', required: true, positional: true, help: 'Recruiter tag or label to add' },
    { name: 'profile-url', type: 'string', help: 'Explicit Recruiter profile URL' },
  ],
  columns: ['candidate_id', 'tag', 'profile_url', 'status', 'detail', 'list_source'],
  func: async (page, kwargs) => {
    const candidateId = String(kwargs['candidate-id'] ?? '').trim();
    const tag = String(kwargs.tag ?? '').trim();
    if (!tag) throw new ArgumentError('tag is required');

    const targetUrl = resolveTargetUrl(candidateId, String(kwargs['profile-url'] ?? '').trim() || undefined);
    await ensureRecruiterSurface(page, targetUrl);
    return [await addRecruiterTag(page, candidateId, tag)];
  },
});

export const __test__ = {
  resolveTargetUrl,
};
