import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import {
  ensureLinkedinSession,
  type RecruiterMessageResult,
  resolveRecruiterProfileUrl,
  sendRecruiterMessage,
} from './recruiter-utils.js';

interface BatchTarget {
  candidateId: string;
  profileUrl?: string;
}

function parseBatchTargets(value: unknown, fallbackProfileUrl?: string): BatchTarget[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  const parts = raw
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const targets: BatchTarget[] = [];
  for (const part of parts) {
    const [candidateIdRaw, profileUrlRaw] = part.split('|').map((item) => item.trim());
    const candidateId = candidateIdRaw || '';
    const profileUrl = profileUrlRaw || fallbackProfileUrl || '';
    const dedupeKey = `${candidateId}::${profileUrl}`;
    if (!candidateId || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    targets.push({ candidateId, profileUrl: profileUrl || undefined });
  }
  return targets;
}

async function sendWithRetry(
  page: Parameters<NonNullable<ReturnType<typeof cli>['func']>>[0],
  target: BatchTarget,
  text: string,
  retries: number,
): Promise<RecruiterMessageResult> {
  const targetUrl = resolveRecruiterProfileUrl(target.candidateId, target.profileUrl);
  if (!targetUrl) {
    return {
      candidate_id: target.candidateId,
      conversation_id: '',
      profile_url: target.profileUrl || '',
      status: 'failed',
      detail: 'candidate-id or profile-url could not be resolved',
      list_source: 'batch',
    };
  }

  let lastError = 'unknown error';
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await ensureLinkedinSession(page, targetUrl);
      return await sendRecruiterMessage(page, target.candidateId, text, 'batch');
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        await page.wait({ time: 2 });
      }
    }
  }

  return {
    candidate_id: target.candidateId,
    conversation_id: '',
    profile_url: targetUrl,
    status: 'failed',
    detail: lastError,
    list_source: 'batch',
  };
}

cli({
  site: 'linkedin',
  name: 'batch-message',
  description: 'Send the same LinkedIn Recruiter message to multiple candidates',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    {
      name: 'targets',
      type: 'string',
      positional: true,
      required: true,
      help: 'Comma or newline separated candidate IDs. Optional format per item: candidate_id|profile_url',
    },
    { name: 'text', type: 'string', positional: true, required: true, help: 'Message text to send' },
    { name: 'profile-url', type: 'string', help: 'Fallback profile URL to use for every target' },
    { name: 'delay-ms', type: 'int', default: 1500, help: 'Delay between sends in milliseconds' },
    { name: 'retries', type: 'int', default: 1, help: 'Retry count for each candidate' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum candidates to process after dedupe' },
    { name: 'dry-run', type: 'bool', default: false, help: 'Preview the resolved target list without sending' },
  ],
  columns: ['candidate_id', 'conversation_id', 'profile_url', 'status', 'detail', 'list_source'],
  func: async (page, kwargs) => {
    const text = String(kwargs.text ?? '').trim();
    if (!text) throw new ArgumentError('text is required');

    const delayMs = Math.max(0, Number(kwargs['delay-ms'] ?? 1500));
    const retries = Math.max(0, Number(kwargs.retries ?? 1));
    const limit = Math.max(1, Math.min(Number(kwargs.limit ?? 20), 200));
    const fallbackProfileUrl = String(kwargs['profile-url'] ?? '').trim() || undefined;
    const dryRun = Boolean(kwargs['dry-run']);

    const targets = parseBatchTargets(kwargs.targets, fallbackProfileUrl).slice(0, limit);
    if (targets.length === 0) {
      throw new ArgumentError('targets must contain at least one candidate-id');
    }

    if (dryRun) {
      return targets.map((target, index) => ({
        candidate_id: target.candidateId,
        conversation_id: '',
        profile_url: resolveRecruiterProfileUrl(target.candidateId, target.profileUrl),
        status: 'dry-run',
        detail: `Would send batch message #${index + 1}`,
        list_source: 'batch',
      }));
    }

    const results: RecruiterMessageResult[] = [];
    for (const [index, target] of targets.entries()) {
      const result = await sendWithRetry(page, target, text, retries);
      results.push(result);
      if (index < targets.length - 1 && delayMs > 0) {
        await page.wait({ time: delayMs / 1000 });
      }
    }

    return results;
  },
});

export const __test__ = {
  parseBatchTargets,
};
