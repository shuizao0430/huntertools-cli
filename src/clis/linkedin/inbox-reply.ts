import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterInboxThreadUrl,
  buildRecruiterInboxUrl,
  buildRecruiterProfileMessagesUrl,
  ensureRecruiterSurface,
  replyRecruiterInboxConversation,
} from './recruiter-utils.js';

function resolveInboxReplyTarget(
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
  name: 'inbox-reply',
  aliases: ['reply'],
  description: 'Reply to a LinkedIn Recruiter inbox conversation',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'conversation-id', type: 'string', positional: true, help: 'Conversation ID from linkedin inbox-list' },
    { name: 'text', type: 'string', positional: true, help: 'Reply text to send' },
    { name: 'reply-text', type: 'string', help: 'Reply text when targeting by --candidate-id or --profile-url without a positional conversation-id' },
    { name: 'candidate-id', type: 'string', help: 'Fallback candidate ID when matching a visible thread' },
    { name: 'profile-url', type: 'string', help: 'Fallback public or Recruiter profile URL when matching a visible thread' },
  ],
  columns: ['conversation_id', 'candidate_id', 'profile_url', 'status', 'detail', 'list_source'],
  func: async (page, kwargs) => {
    const conversationId = String(kwargs['conversation-id'] ?? '').trim();
    const text = String(kwargs.text ?? kwargs['reply-text'] ?? '').trim();
    const candidateId = String(kwargs['candidate-id'] ?? '').trim();
    const profileUrl = String(kwargs['profile-url'] ?? '').trim();
    if (!text) throw new ArgumentError('text is required');

    const targetUrl = resolveInboxReplyTarget(conversationId, candidateId, profileUrl);
    await ensureRecruiterSurface(page, targetUrl);
    return [await replyRecruiterInboxConversation(page, {
      conversationId: conversationId || undefined,
      candidateId: candidateId || undefined,
      profileUrl: profileUrl || undefined,
      text,
    })];
  },
});

export const __test__ = {
  resolveInboxReplyTarget,
};
