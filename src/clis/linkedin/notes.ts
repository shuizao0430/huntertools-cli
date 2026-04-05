import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import {
  addRecruiterNote,
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
  name: 'notes',
  description: 'Save a LinkedIn Recruiter note on a candidate',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'candidate-id', type: 'string', positional: true, help: 'Candidate ID from linkedin people-search' },
    { name: 'text', type: 'string', required: true, positional: true, help: 'Recruiter note text to save' },
    { name: 'profile-url', type: 'string', help: 'Explicit Recruiter profile URL' },
  ],
  columns: ['candidate_id', 'note', 'profile_url', 'status', 'detail', 'list_source'],
  func: async (page, kwargs) => {
    const candidateId = String(kwargs['candidate-id'] ?? '').trim();
    const text = String(kwargs.text ?? '').trim();
    if (!text) throw new ArgumentError('text is required');

    const targetUrl = resolveTargetUrl(candidateId, String(kwargs['profile-url'] ?? '').trim() || undefined);
    await ensureRecruiterSurface(page, targetUrl);
    return [await addRecruiterNote(page, candidateId, text)];
  },
});

export const __test__ = {
  resolveTargetUrl,
};
