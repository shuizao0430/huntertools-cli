import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import {
  buildRecruiterInboxThreadUrl,
  buildRecruiterInboxUrl,
  ensureRecruiterSurface,
  type RecruiterInboxReplyResult,
  replyRecruiterInboxConversation,
} from './recruiter-utils.js';

interface BatchReplyTarget {
  conversationId?: string;
  candidateId?: string;
  profileUrl?: string;
}

function parseBatchReplyTargets(value: unknown, fallbackProfileUrl?: string): BatchReplyTarget[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  const parts = raw
    .split(/[\r\n,]+/)
    .map(item => item.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const targets: BatchReplyTarget[] = [];
  for (const part of parts) {
    const [conversationIdRaw, candidateIdRaw, profileUrlRaw] = part.split('|').map(item => item.trim());
    const conversationId = conversationIdRaw || '';
    const candidateId = candidateIdRaw || '';
    const profileUrl = profileUrlRaw || fallbackProfileUrl || '';
    const dedupeKey = `${conversationId}::${candidateId}::${profileUrl}`;
    if ((!conversationId && !candidateId && !profileUrl) || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    targets.push({
      conversationId: conversationId || undefined,
      candidateId: candidateId || undefined,
      profileUrl: profileUrl || undefined,
    });
  }
  return targets;
}

function resolveBatchReplyTargetUrl(target: BatchReplyTarget): string {
  if (target.conversationId) return buildRecruiterInboxThreadUrl(target.conversationId);
  if (target.candidateId || target.profileUrl) return buildRecruiterInboxUrl();
  return '';
}

async function replyWithRetry(
  page: Parameters<NonNullable<ReturnType<typeof cli>['func']>>[0],
  target: BatchReplyTarget,
  text: string,
  retries: number,
): Promise<RecruiterInboxReplyResult> {
  const targetUrl = resolveBatchReplyTargetUrl(target);
  if (!targetUrl) {
    return {
      conversation_id: target.conversationId || '',
      candidate_id: target.candidateId || '',
      profile_url: target.profileUrl || '',
      status: 'failed',
      detail: 'conversation-id, candidate-id, or profile-url could not be resolved',
      list_source: 'batch-reply',
    };
  }

  let lastError = 'unknown error';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await ensureRecruiterSurface(page, targetUrl);
      return await replyRecruiterInboxConversation(page, {
        conversationId: target.conversationId,
        candidateId: target.candidateId,
        profileUrl: target.profileUrl,
        text,
      }, 'batch-reply');
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        await page.wait({ time: 2 });
      }
    }
  }

  return {
    conversation_id: target.conversationId || '',
    candidate_id: target.candidateId || '',
    profile_url: target.profileUrl || targetUrl,
    status: 'failed',
    detail: lastError,
    list_source: 'batch-reply',
  };
}

cli({
  site: 'linkedin',
  name: 'batch-reply',
  description: 'Reply to multiple LinkedIn Recruiter inbox conversations with the same text',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    {
      name: 'targets',
      type: 'string',
      positional: true,
      required: true,
      help: 'Comma or newline separated conversation targets. Format per item: conversation_id|candidate_id|profile_url',
    },
    { name: 'text', type: 'string', positional: true, required: true, help: 'Reply text to send' },
    { name: 'profile-url', type: 'string', help: 'Fallback profile URL to use for every target' },
    { name: 'delay-ms', type: 'int', default: 1500, help: 'Delay between replies in milliseconds' },
    { name: 'retries', type: 'int', default: 1, help: 'Retry count for each conversation' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum conversations to process after dedupe' },
    { name: 'dry-run', type: 'bool', default: false, help: 'Preview the resolved target list without sending' },
  ],
  columns: ['conversation_id', 'candidate_id', 'profile_url', 'status', 'detail', 'list_source'],
  func: async (page, kwargs) => {
    const text = String(kwargs.text ?? '').trim();
    if (!text) throw new ArgumentError('text is required');

    const delayMs = Math.max(0, Number(kwargs['delay-ms'] ?? 1500));
    const retries = Math.max(0, Number(kwargs.retries ?? 1));
    const limit = Math.max(1, Math.min(Number(kwargs.limit ?? 20), 200));
    const fallbackProfileUrl = String(kwargs['profile-url'] ?? '').trim() || undefined;
    const dryRun = Boolean(kwargs['dry-run']);

    const targets = parseBatchReplyTargets(kwargs.targets, fallbackProfileUrl).slice(0, limit);
    if (targets.length === 0) {
      throw new ArgumentError('targets must contain at least one conversation-id, candidate-id, or profile-url');
    }

    if (dryRun) {
      return targets.map((target, index) => ({
        conversation_id: target.conversationId || '',
        candidate_id: target.candidateId || '',
        profile_url: target.profileUrl || '',
        status: 'dry-run',
        detail: `Would send batch reply #${index + 1}`,
        list_source: 'batch-reply',
      }));
    }

    const results: RecruiterInboxReplyResult[] = [];
    for (const [index, target] of targets.entries()) {
      const result = await replyWithRetry(page, target, text, retries);
      results.push(result);
      if (index < targets.length - 1 && delayMs > 0) {
        await page.wait({ time: delayMs / 1000 });
      }
    }

    return results;
  },
});

export const __test__ = {
  parseBatchReplyTargets,
  resolveBatchReplyTargetUrl,
};
