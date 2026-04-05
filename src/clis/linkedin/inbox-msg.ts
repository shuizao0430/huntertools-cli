import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterInboxThreadUrl,
  buildRecruiterInboxUrl,
  buildRecruiterProfileMessagesUrl,
  ensureRecruiterSurface,
  readRecruiterInboxMessages,
} from './recruiter-utils.js';

function resolveInboxTarget(
  conversationId: string | undefined,
  candidateId: string | undefined,
  profileUrl: string | undefined,
): string {
  const normalizedConversationId = String(conversationId ?? '').trim();
  if (normalizedConversationId) return buildRecruiterInboxThreadUrl(normalizedConversationId);

  const normalizedCandidateId = String(candidateId ?? '').trim();
  const normalizedProfileUrl = String(profileUrl ?? '').trim();
  if (normalizedCandidateId || normalizedProfileUrl) {
    return buildRecruiterProfileMessagesUrl(normalizedCandidateId, normalizedProfileUrl) || buildRecruiterInboxUrl();
  }

  throw new ArgumentError('conversation-id, --candidate-id, or --profile-url is required');
}

cli({
  site: 'linkedin',
  name: 'inbox-msg',
  description: 'Read messages from a LinkedIn Recruiter inbox conversation',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'conversation-id', type: 'string', positional: true, help: 'Conversation ID from linkedin inbox-list' },
    { name: 'candidate-id', type: 'string', help: 'Fallback candidate ID from linkedin people-search or inbox-list' },
    { name: 'profile-url', type: 'string', help: 'Fallback public or Recruiter profile URL for thread matching' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum visible messages to return' },
  ],
  columns: [
    'rank',
    'conversation_id',
    'candidate_id',
    'from',
    'direction',
    'type',
    'text',
    'time',
    'profile_url',
    'list_source',
  ],
  func: async (page, kwargs) => {
    const conversationId = String(kwargs['conversation-id'] ?? '').trim();
    const candidateId = String(kwargs['candidate-id'] ?? '').trim();
    const profileUrl = String(kwargs['profile-url'] ?? '').trim();
    const limit = Math.max(1, Math.min(Number(kwargs.limit ?? 20), 100));

    const targetUrl = resolveInboxTarget(conversationId, candidateId, profileUrl);
    await ensureRecruiterSurface(page, targetUrl);
    return readRecruiterInboxMessages(page, {
      conversationId: conversationId || undefined,
      candidateId: candidateId || undefined,
      profileUrl: profileUrl || undefined,
      limit,
    });
  },
});

export const __test__ = {
  resolveInboxTarget,
};
