import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterFollowUpQueue,
  buildRecruiterInboxUrl,
  collectRecruiterInboxThreads,
  ensureRecruiterSurface,
} from './recruiter-utils.js';

cli({
  site: 'linkedin',
  name: 'follow-up-queue',
  description: 'Build a prioritized Recruiter follow-up queue from visible inbox conversations',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'limit', type: 'int', default: 25, help: 'Maximum follow-up rows to return after prioritization' },
    { name: 'inbox-limit', type: 'int', default: 75, help: 'Visible inbox threads to sample before ranking' },
    { name: 'unread-only', type: 'bool', default: false, help: 'Only include unread or newly updated threads' },
    { name: 'require-candidate-id', type: 'bool', default: false, help: 'Only include rows with a reusable candidate_id' },
    { name: 'require-profile-url', type: 'bool', default: false, help: 'Only include rows with a reusable profile_url' },
  ],
  columns: [
    'rank',
    'priority',
    'priority_score',
    'recommended_action',
    'reason',
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
    const limit = Math.max(1, Math.min(Number(kwargs.limit ?? 25), 200));
    const inboxLimit = Math.max(limit, Math.min(Number(kwargs['inbox-limit'] ?? 75), 250));

    await ensureRecruiterSurface(page, buildRecruiterInboxUrl());
    const threads = await collectRecruiterInboxThreads(page, inboxLimit, 0, 'follow-up-queue:inbox');
    return buildRecruiterFollowUpQueue(threads, {
      unreadOnly: Boolean(kwargs['unread-only']),
      requireCandidateId: Boolean(kwargs['require-candidate-id']),
      requireProfileUrl: Boolean(kwargs['require-profile-url']),
    }).slice(0, limit);
  },
});
