import { cli, Strategy } from '../../registry.js';
import { sendCommand } from '../../browser/daemon-client.js';
import type { BrowserSessionInfo } from '../../types.js';
import {
  buildRecruiterSearchUrl,
  collectRecruiterPeopleViaCurrentSearchApis,
  detectRecruiterSurface,
  ensureRecruiterSurface,
  primeRecruiterSearchHitsCapture,
  probeRecruiterSearchState,
  trySeedRecruiterSearch,
  trySeedRecruiterSearchInteractively,
  type RecruiterPeopleSearchInput,
} from './recruiter-utils.js';

interface BrowserTabMatch {
  tabId?: number;
  url?: string;
  active?: boolean;
}

function chooseBestRecruiterTab(tabs: BrowserTabMatch[]): BrowserTabMatch | undefined {
  const recruiterTabs = tabs.filter((tab) => {
    const url = String(tab.url || '');
    return /www\.linkedin\.com\/talent\/search/i.test(url);
  });
  return recruiterTabs.find((tab) => {
    const url = String(tab.url || '');
    return tab.active && /(searchContextId|searchHistoryId|searchRequestId)/i.test(url);
  }) || recruiterTabs.find((tab) => {
    const url = String(tab.url || '');
    return tab.active && /keywords=/i.test(url);
  }) || recruiterTabs.find((tab) => tab.active && tab.url)
    || recruiterTabs.find((tab) => /(searchContextId|searchHistoryId|searchRequestId)/i.test(String(tab.url || '')))
    || recruiterTabs.find((tab) => /keywords=/i.test(String(tab.url || '')))
    || recruiterTabs.find((tab) => tab.url);
}

async function resolveRecruiterSeedTarget(
  input: RecruiterPeopleSearchInput,
  workspace: string,
): Promise<BrowserTabMatch> {
  try {
    const discovered = await sendCommand('tabs', { op: 'list', workspace });
    const tabs = Array.isArray(discovered) ? discovered as BrowserTabMatch[] : [];
    const preferred = chooseBestRecruiterTab(tabs);
    if (preferred?.url) return preferred;

    const sessions = await sendCommand('sessions');
    const workspaces = Array.isArray(sessions)
      ? (sessions as BrowserSessionInfo[])
        .map((session) => String(session.workspace || ''))
        .filter(Boolean)
        .filter((name, index, names) => names.indexOf(name) === index)
      : [];

    for (const candidateWorkspace of workspaces) {
      if (candidateWorkspace === workspace) continue;
      const candidateTabsRaw = await sendCommand('tabs', { op: 'list', workspace: candidateWorkspace });
      const candidateTabs = Array.isArray(candidateTabsRaw) ? candidateTabsRaw as BrowserTabMatch[] : [];
      const candidate = chooseBestRecruiterTab(candidateTabs);
      if (candidate?.url) return candidate;
    }
  } catch {
    // Best effort only. Fall back to the generic recruiter search route.
  }
  return { url: buildRecruiterSearchUrl(input) };
}

cli({
  site: 'linkedin',
  name: 'people-search',
  description: 'Search LinkedIn Recruiter candidate results',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'query', type: 'string', required: true, positional: true, help: 'Candidate keywords, title, or talent query' },
    { name: 'location', type: 'string', help: 'Location filter such as London or Singapore' },
    { name: 'current-title', type: 'string', help: 'Current title filter' },
    { name: 'past-company', type: 'string', help: 'Past or current company filter' },
    { name: 'industry', type: 'string', help: 'Industry filter' },
    { name: 'seniority', type: 'string', help: 'Seniority filter such as manager, director, staff' },
    { name: 'skills', type: 'string', help: 'Comma-separated skill filters' },
    { name: 'language', type: 'string', help: 'Comma-separated language filters' },
    { name: 'open-to-work', type: 'bool', default: undefined, help: 'Require candidates marked as open to work' },
    { name: 'limit', type: 'int', default: 10, help: 'Number of candidates to return (max 100)' },
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
    const input: RecruiterPeopleSearchInput = {
      query: String(kwargs.query ?? '').trim(),
      location: String(kwargs.location ?? '').trim() || undefined,
      currentTitle: String(kwargs['current-title'] ?? '').trim() || undefined,
      pastCompany: String(kwargs['past-company'] ?? '').trim() || undefined,
      industry: String(kwargs.industry ?? '').trim() || undefined,
      seniority: String(kwargs.seniority ?? '').trim() || undefined,
      skills: String(kwargs.skills ?? '').trim() || undefined,
      language: String(kwargs.language ?? '').trim() || undefined,
      openToWork: typeof kwargs['open-to-work'] === 'boolean' ? kwargs['open-to-work'] : undefined,
      limit: Math.max(1, Math.min(Number(kwargs.limit ?? 10), 100)),
      start: Math.max(0, Number(kwargs.start ?? 0)),
    };

    const pageWorkspace = String((page as any).workspace || 'default');
    const seed = await resolveRecruiterSeedTarget(input, pageWorkspace);
    const targetUrl = String(seed.url || buildRecruiterSearchUrl(input));
    if (seed.tabId) {
      try {
        await sendCommand('tabs', {
          op: 'adopt',
          workspace: pageWorkspace,
          tabId: seed.tabId,
        });
        (page as any)._tabId = seed.tabId;
      } catch {
        // Best effort only. We can still fall back to normal navigation below.
      }
    }
    await primeRecruiterSearchHitsCapture(page);
    if (seed.tabId) {
      try {
        await detectRecruiterSurface(page);
      } catch {
        await ensureRecruiterSurface(page, targetUrl);
      }
    } else {
      await ensureRecruiterSurface(page, targetUrl);
    }
    const probe = await probeRecruiterSearchState(page, input).catch(() => null);
    const shouldReuseCurrentSearch = Boolean(probe?.shouldReuseCurrentSearch);
    if (!shouldReuseCurrentSearch) {
      await trySeedRecruiterSearch(page, input);
      const afterDomSeed = await probeRecruiterSearchState(page, input).catch(() => null);
      if (!afterDomSeed?.hasVisibleResults && !afterDomSeed?.hasSearchApiTraffic) {
        await trySeedRecruiterSearchInteractively(page, input).catch(() => false);
      }
    }
    return collectRecruiterPeopleViaCurrentSearchApis(page, input, 'search', {
      skipReseed: shouldReuseCurrentSearch,
    });
  },
});
