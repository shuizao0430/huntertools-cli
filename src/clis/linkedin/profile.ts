import { ArgumentError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import { sendCommand } from '../../browser/daemon-client.js';
import type { BrowserSessionInfo } from '../../types.js';
import {
  adoptLinkedinTab,
  buildRecruiterProjectMembersUrl,
  ensureLinkedinSession,
  ensureRecruiterSurface,
  extractRecruiterProfile,
  extractRecruiterProjectId,
  isLinkedinProfileUrl,
  openRecruiterProfileFromCurrentPage,
  resolveRecruiterProfileUrl,
} from './recruiter-utils.js';

interface BrowserTabMatch {
  tabId?: number;
  url?: string;
  active?: boolean;
}

function resolveProfileUrl(candidateId: string | undefined, profileUrl: string | undefined): string {
  const resolved = resolveRecruiterProfileUrl(candidateId, profileUrl);
  if (resolved) return resolved;
  throw new ArgumentError('candidate-id or --profile-url is required');
}

function chooseBestProfileTab(tabs: BrowserTabMatch[], profileUrl: string): BrowserTabMatch | undefined {
  const normalizedProfileUrl = profileUrl.trim().toLowerCase();
  const recruiterTabs = tabs.filter((tab) => {
    const url = String(tab.url || '').toLowerCase();
    return url.includes('/talent/profile/') || url.includes('/in/');
  });
  return recruiterTabs.find((tab) => String(tab.url || '').toLowerCase() === normalizedProfileUrl && tab.active)
    || recruiterTabs.find((tab) => String(tab.url || '').toLowerCase() === normalizedProfileUrl)
    || recruiterTabs.find((tab) => tab.active)
    || recruiterTabs.find((tab) => tab.url);
}

async function resolveProfileTab(profileUrl: string, workspace: string): Promise<BrowserTabMatch | undefined> {
  try {
    const discovered = await sendCommand('tabs', { op: 'list', workspace });
    const tabs = Array.isArray(discovered) ? discovered as BrowserTabMatch[] : [];
    const preferred = chooseBestProfileTab(tabs, profileUrl);
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
      const candidate = chooseBestProfileTab(candidateTabs, profileUrl);
      if (candidate?.url) return candidate;
    }
  } catch {
    // Best effort only. We can still fall back to direct navigation below.
  }
  return undefined;
}

cli({
  site: 'linkedin',
  name: 'profile',
  description: 'Read a LinkedIn Recruiter candidate profile',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'candidate-id', type: 'string', positional: true, help: 'Candidate ID from linkedin people-search' },
    { name: 'profile-url', type: 'string', help: 'Explicit public or Recruiter profile URL' },
  ],
  columns: [
    'candidate_id',
    'name',
    'headline',
    'location',
    'current_company',
    'current_title',
    'open_to_work',
    'connection_degree',
    'mutual_connections',
    'recent_activity',
    'contact_visibility',
    'profile_url',
    'about',
    'skills',
    'languages',
    'education',
    'work_history',
    'list_source',
  ],
  func: async (page, kwargs) => {
    const candidateId = String(kwargs['candidate-id'] ?? '').trim();
    const profileUrl = resolveProfileUrl(candidateId, String(kwargs['profile-url'] ?? '').trim() || undefined);
    const pageWorkspace = String((page as any).workspace || 'default');
    await adoptLinkedinTab(page, profileUrl, ['/talent/profile/', '/in/']);
    const seed = await resolveProfileTab(profileUrl, pageWorkspace);
    if (seed?.tabId) (page as any)._tabId = seed.tabId;
    await ensureLinkedinSession(page, profileUrl);

    try {
      return [await extractRecruiterProfile(page, candidateId)];
    } catch (error) {
      const projectId = extractRecruiterProjectId(profileUrl);
      if (!projectId || !isLinkedinProfileUrl(profileUrl)) throw error;

      await ensureRecruiterSurface(page, buildRecruiterProjectMembersUrl(projectId));
      const opened = await openRecruiterProfileFromCurrentPage(page, candidateId, profileUrl);
      if (!opened) throw error;
      return [await extractRecruiterProfile(page, candidateId)];
    }
  },
});

export const __test__ = {
  resolveProfileUrl,
  chooseBestProfileTab,
};
