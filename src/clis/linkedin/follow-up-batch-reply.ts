import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import {
  buildRecruiterFollowUpQueue,
  buildRecruiterInboxThreadUrl,
  buildRecruiterInboxUrl,
  collectRecruiterInboxThreads,
  ensureRecruiterSurface,
  renderRecruiterFollowUpTemplate,
  type RecruiterFollowUpQueueItem,
  type RecruiterInboxReplyResult,
  replyRecruiterInboxConversation,
} from './recruiter-utils.js';

interface FollowUpBatchReplyOptions {
  priorities: string[];
  unreadOnly: boolean;
  requireCandidateId: boolean;
  requireProfileUrl: boolean;
  conversationIds: string[];
  limit: number;
}

function parsePriorities(value: unknown): string[] {
  const normalized = String(value ?? 'high,medium')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : ['high', 'medium'];
}

function parseConversationIds(value: unknown): string[] {
  const normalized = String(value ?? '')
    .split(/[,\r\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
  return [...new Set(normalized)];
}

function filterFollowUpQueueForBatchReply(
  queue: RecruiterFollowUpQueueItem[],
  options: FollowUpBatchReplyOptions,
): RecruiterFollowUpQueueItem[] {
  const requestedIds = new Set(options.conversationIds.map(item => String(item).trim()).filter(Boolean));
  return queue
    .filter((item) => {
      if (requestedIds.size === 0) return true;
      return requestedIds.has(String(item.conversation_id ?? '').trim());
    })
    .filter(item => options.priorities.includes(String(item.priority ?? '').toLowerCase()))
    .filter((item) => {
      if (options.unreadOnly) {
        const unread = String(item.unread ?? '').trim().toLowerCase();
        if (!(unread === 'unread' || unread === 'new' || /^\d+$/.test(unread))) return false;
      }
      if (options.requireCandidateId && !String(item.candidate_id ?? '').trim()) return false;
      if (options.requireProfileUrl && !String(item.profile_url ?? '').trim()) return false;
      return true;
    })
    .slice(0, options.limit);
}

function resolveFollowUpBatchReplyTargetUrl(item: RecruiterFollowUpQueueItem): string {
  const conversationId = String(item.conversation_id ?? '').trim();
  if (conversationId) return buildRecruiterInboxThreadUrl(conversationId);

  const candidateId = String(item.candidate_id ?? '').trim();
  const profileUrl = String(item.profile_url ?? '').trim();
  if (candidateId || profileUrl) return buildRecruiterInboxUrl();
  return '';
}

async function replyQueueItemWithRetry(
  page: IPage,
  item: RecruiterFollowUpQueueItem,
  text: string,
  retries: number,
): Promise<RecruiterInboxReplyResult> {
  const targetUrl = resolveFollowUpBatchReplyTargetUrl(item);
  if (!targetUrl) {
    return {
      conversation_id: item.conversation_id || '',
      candidate_id: item.candidate_id || '',
      profile_url: item.profile_url || '',
      status: 'failed',
      detail: 'conversation_id, candidate_id, or profile_url could not be resolved',
      list_source: 'follow-up-batch-reply',
    };
  }

  let lastError = 'unknown error';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await ensureRecruiterSurface(page, targetUrl);
      return await replyRecruiterInboxConversation(page, {
        conversationId: item.conversation_id || undefined,
        candidateId: item.candidate_id || undefined,
        profileUrl: item.profile_url || undefined,
        text,
      }, 'follow-up-batch-reply');
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        await page.wait({ time: 2 });
      }
    }
  }

  return {
    conversation_id: item.conversation_id || '',
    candidate_id: item.candidate_id || '',
    profile_url: item.profile_url || '',
    status: 'failed',
    detail: lastError,
    list_source: 'follow-up-batch-reply',
  };
}

cli({
  site: 'linkedin',
  name: 'follow-up-batch-reply',
  description: 'Filter the Recruiter follow-up queue by priority, render a template, and send replies in batch',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    {
      name: 'template',
      type: 'string',
      positional: true,
      required: true,
      help: 'Reply template with placeholders like {{first_name}}, {{priority}}, {{reason}}, and {{last_message}}',
    },
    { name: 'priorities', type: 'string', default: 'high,medium', help: 'Comma separated priority levels to include' },
    { name: 'conversation-ids', type: 'string', help: 'Comma or newline separated conversation_id values to target exactly within the follow-up queue' },
    { name: 'limit', type: 'int', default: 10, help: 'Maximum queue rows to process after ranking and filtering' },
    { name: 'inbox-limit', type: 'int', default: 75, help: 'Visible inbox threads to sample before ranking' },
    { name: 'unread-only', type: 'bool', default: true, help: 'Only reply to unread or newly updated threads' },
    { name: 'require-candidate-id', type: 'bool', default: false, help: 'Only process queue rows with a reusable candidate_id' },
    { name: 'require-profile-url', type: 'bool', default: false, help: 'Only process queue rows with a reusable profile_url' },
    { name: 'delay-ms', type: 'int', default: 1500, help: 'Delay between replies in milliseconds' },
    { name: 'retries', type: 'int', default: 1, help: 'Retry count for each conversation' },
    { name: 'dry-run', type: 'bool', default: false, help: 'Preview the rendered queue replies without sending' },
  ],
  columns: [
    'rank',
    'priority',
    'priority_score',
    'recommended_action',
    'conversation_id',
    'candidate_id',
    'name',
    'rendered_text',
    'status',
    'detail',
    'profile_url',
    'list_source',
  ],
  func: async (page, kwargs) => {
    const template = String(kwargs.template ?? '').trim();
    if (!template) throw new ArgumentError('template is required');

    const priorities = parsePriorities(kwargs.priorities);
    const conversationIds = parseConversationIds(kwargs['conversation-ids']);
    const limit = Math.max(1, Math.min(Number(kwargs.limit ?? 10), 200));
    const inboxLimit = Math.max(limit, Math.min(Number(kwargs['inbox-limit'] ?? 75), 250));
    const delayMs = Math.max(0, Number(kwargs['delay-ms'] ?? 1500));
    const retries = Math.max(0, Number(kwargs.retries ?? 1));
    const unreadOnly = Boolean(kwargs['unread-only']);
    const requireCandidateId = Boolean(kwargs['require-candidate-id']);
    const requireProfileUrl = Boolean(kwargs['require-profile-url']);
    const dryRun = Boolean(kwargs['dry-run']);

    await ensureRecruiterSurface(page, buildRecruiterInboxUrl());
    const threads = await collectRecruiterInboxThreads(page, inboxLimit, 0, 'follow-up-batch-reply:inbox');
    const queue = buildRecruiterFollowUpQueue(threads, {
      unreadOnly,
      requireCandidateId,
      requireProfileUrl,
    });
    const filteredQueue = filterFollowUpQueueForBatchReply(queue, {
      priorities,
      unreadOnly,
      requireCandidateId,
      requireProfileUrl,
      conversationIds,
      limit,
    });

    if (filteredQueue.length === 0) {
      throw new ArgumentError('No follow-up queue rows matched the requested priority and identity filters');
    }

    const renderedQueue = filteredQueue.map(item => ({
      ...item,
      rendered_text: renderRecruiterFollowUpTemplate(template, item),
    }));

    if (dryRun) {
      return renderedQueue.map(item => ({
        rank: item.rank,
        priority: item.priority,
        priority_score: item.priority_score,
        recommended_action: item.recommended_action,
        conversation_id: item.conversation_id,
        candidate_id: item.candidate_id,
        name: item.name,
        rendered_text: item.rendered_text,
        status: 'dry-run',
        detail: `Would send follow-up reply to ${item.name || item.conversation_id || 'thread'}`,
        profile_url: item.profile_url,
        list_source: 'follow-up-batch-reply',
      }));
    }

    const results = [];
    for (const [index, item] of renderedQueue.entries()) {
      const replyResult = await replyQueueItemWithRetry(page, item, item.rendered_text, retries);
      results.push({
        rank: item.rank,
        priority: item.priority,
        priority_score: item.priority_score,
        recommended_action: item.recommended_action,
        conversation_id: replyResult.conversation_id,
        candidate_id: replyResult.candidate_id,
        name: item.name,
        rendered_text: item.rendered_text,
        status: replyResult.status,
        detail: replyResult.detail,
        profile_url: replyResult.profile_url,
        list_source: replyResult.list_source,
      });
      if (index < renderedQueue.length - 1 && delayMs > 0) {
        await page.wait({ time: delayMs / 1000 });
      }
    }

    return results;
  },
});

export const __test__ = {
  parsePriorities,
  parseConversationIds,
  filterFollowUpQueueForBatchReply,
  resolveFollowUpBatchReplyTargetUrl,
};
