import { writeFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { cli, Strategy, type CommandArgs } from '../../registry.js';
import { sendCommand } from '../../browser/daemon-client.js';
import type { BrowserSessionInfo, IPage } from '../../types.js';
import {
  adoptLinkedinTab,
  buildRecruiterProjectMembersUrl,
  buildRecruiterSearchUrl,
  collectRecruiterPeopleViaCurrentSearchApis,
  detectRecruiterSurface,
  ensureLinkedinSession,
  ensureRecruiterSurface,
  extractRecruiterProfileHistoryItems,
  extractRecruiterProfile,
  extractRecruiterProjectId,
  isLinkedinProfileUrl,
  normalizeWhitespace,
  openRecruiterProfileFromCurrentPage,
  primeRecruiterSearchHitsCapture,
  probeRecruiterSearchState,
  resolveRecruiterProfileUrl,
  trySeedRecruiterSearch,
  trySeedRecruiterSearchInteractively,
  type RecruiterCandidateProfile,
  type RecruiterCandidateSummary,
  type RecruiterPeopleSearchInput,
} from './recruiter-utils.js';

interface BrowserTabMatch {
  tabId?: number;
  url?: string;
  active?: boolean;
}

interface RecruiterCandidateDetailedRow extends RecruiterCandidateSummary {
  work_history_items?: string[];
  education_items?: string[];
}

interface RecruiterPeopleSearchExecutionOptions {
  forceDetailedOutput?: boolean;
  forceCsvOutput?: boolean;
}

export const PEOPLE_SEARCH_SUMMARY_COLUMNS = [
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
] as const;

export const PEOPLE_SEARCH_EXPORT_COLUMNS = [
  'rank',
  'candidate_id',
  'profile_url',
  'name',
  'headline',
  'location',
  'current_company',
  'current_title',
  'connection_degree',
  'open_to_work',
  'match_signals',
  'work_history_1',
  'work_history_2',
  'work_history_3',
  'work_history_4',
  'work_history_5',
  'work_company_1',
  'work_company_2',
  'work_company_3',
  'work_company_4',
  'work_company_5',
  'work_duration_1',
  'work_duration_2',
  'work_duration_3',
  'work_duration_4',
  'work_duration_5',
  'work_type_1',
  'work_type_2',
  'work_type_3',
  'work_type_4',
  'work_type_5',
  'education_1',
  'education_2',
  'education_3',
  'education_4',
  'education_5',
  'list_source',
] as const;

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

function splitProfileHistory(value: unknown, maxItems = 5): string[] {
  return extractRecruiterProfileHistoryItems(value, 'work', maxItems);
}

function splitEducationHistory(value: unknown, maxItems = 5): string[] {
  return extractRecruiterProfileHistoryItems(value, 'education', maxItems);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWorkHistoryItems(
  items: string[],
  currentTitle: string,
  currentCompany: string,
): string[] {
  const safeTitle = normalizeWhitespace(currentTitle);
  const safeCompany = normalizeWhitespace(currentCompany);
  if (items.length === 0 || !safeTitle || !safeCompany) return items;
  const firstItem = normalizeWhitespace(items[0]);
  if (!firstItem) return items;
  const normalizedFirstItem = firstItem.toLowerCase();
  const normalizedSafeTitle = safeTitle.toLowerCase();
  if (!normalizedFirstItem.startsWith(normalizedSafeTitle.toLowerCase())) return items;
  if (new RegExp(`^${escapeRegExp(safeTitle)}\\s*@\\s*${escapeRegExp(safeCompany)}(?:\\s*[|·]|$)`, 'i').test(firstItem)) {
    return items;
  }
  const correctedFirstItem = firstItem.replace(
    new RegExp(`^(${escapeRegExp(safeTitle)})\\s*@\\s*([^|·]+)`, 'i'),
    `$1 @ ${safeCompany}`,
  );
  if (correctedFirstItem === firstItem) {
    return [`${safeTitle} @ ${safeCompany}`, ...items.slice(1)];
  }
  return [correctedFirstItem, ...items.slice(1)];
}

interface ParsedWorkHistoryItem {
  raw: string;
  title: string;
  company: string;
  duration: string;
  employmentType: string;
}

function looksLikeEmploymentType(value: string): boolean {
  return /^(?:full[- ]?time|part[- ]?time|contract|internship|temporary|self-employed|freelance|鍏ㄨ亴|鍏艰亴|鍚堝悓|瀹炰範)$/i.test(
    normalizeWhitespace(value),
  );
}

function looksLikeDuration(value: string): boolean {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return /\b(?:\d{4}|present|current|yr|yrs|year|years|mo|mos|month|months)\b/.test(normalized)
    || /[·•]/.test(normalized) && /\d/.test(normalized);
}

function parseWorkHistoryItem(raw: string): ParsedWorkHistoryItem {
  const normalized = normalizeWhitespace(raw);
  if (!normalized) {
    return {
      raw: '',
      title: '',
      company: '',
      duration: '',
      employmentType: '',
    };
  }

  const pipeSegments = normalized.split(/\s+\|\s+/).map((part) => normalizeWhitespace(part)).filter(Boolean);
  const head = pipeSegments.shift() || normalized;
  let duration = '';
  let employmentType = '';

  for (const segment of pipeSegments) {
    if (!duration && looksLikeDuration(segment)) {
      duration = segment;
      continue;
    }
    if (!employmentType && looksLikeEmploymentType(segment)) {
      employmentType = segment;
    }
  }

  let title = head;
  let company = '';
  const atIndex = head.lastIndexOf(' @ ');
  if (atIndex >= 0) {
    title = normalizeWhitespace(head.slice(0, atIndex));
    company = normalizeWhitespace(head.slice(atIndex + 3));
  }

  const trailingTypeMatch = company.match(/^(.*?)(?:\s+[·•路|]\s+|\s+)(Full-time|Part-time|Contract|Internship|Temporary|Self-employed|Freelance|全职|兼职|合同|实习)$/i);
  if (trailingTypeMatch && !employmentType) {
    company = normalizeWhitespace(trailingTypeMatch[1]);
    employmentType = normalizeWhitespace(trailingTypeMatch[2]);
  }

  const dotSegments = company
    .split(/\s+[·•路]\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  if (dotSegments.length > 1 && !employmentType) {
    const maybeType = dotSegments[dotSegments.length - 1];
    if (looksLikeEmploymentType(maybeType)) {
      employmentType = maybeType;
      company = dotSegments.slice(0, -1).join(' · ');
    }
  }

  return {
    raw: normalized,
    title,
    company,
    duration,
    employmentType,
  };
}

function buildDetailedCandidateRow(
  candidate: RecruiterCandidateSummary,
  profile: Pick<RecruiterCandidateProfile, 'work_history' | 'education'> | null,
): RecruiterCandidateDetailedRow {
  const workHistoryItems = normalizeWorkHistoryItems(
    splitProfileHistory(profile?.work_history),
    candidate.current_title,
    candidate.current_company,
  );
  return {
    ...candidate,
    work_history_items: workHistoryItems,
    education_items: splitEducationHistory(profile?.education),
  };
}

function toPeopleSearchExportRow(row: RecruiterCandidateDetailedRow): Record<string, string | number> {
  const workHistory = row.work_history_items ?? [];
  const education = row.education_items ?? [];
  const parsedWorkHistory = Array.from({ length: 5 }, (_, index) => parseWorkHistoryItem(workHistory[index] ?? ''));
  return {
    rank: row.rank ?? '',
    candidate_id: row.candidate_id,
    profile_url: row.profile_url,
    name: row.name,
    headline: row.headline,
    location: row.location,
    current_company: row.current_company,
    current_title: row.current_title,
    connection_degree: row.connection_degree,
    open_to_work: row.open_to_work,
    match_signals: row.match_signals,
    work_history_1: workHistory[0] ?? '',
    work_history_2: workHistory[1] ?? '',
    work_history_3: workHistory[2] ?? '',
    work_history_4: workHistory[3] ?? '',
    work_history_5: workHistory[4] ?? '',
    work_company_1: parsedWorkHistory[0].company,
    work_company_2: parsedWorkHistory[1].company,
    work_company_3: parsedWorkHistory[2].company,
    work_company_4: parsedWorkHistory[3].company,
    work_company_5: parsedWorkHistory[4].company,
    work_duration_1: parsedWorkHistory[0].duration,
    work_duration_2: parsedWorkHistory[1].duration,
    work_duration_3: parsedWorkHistory[2].duration,
    work_duration_4: parsedWorkHistory[3].duration,
    work_duration_5: parsedWorkHistory[4].duration,
    work_type_1: parsedWorkHistory[0].employmentType,
    work_type_2: parsedWorkHistory[1].employmentType,
    work_type_3: parsedWorkHistory[2].employmentType,
    work_type_4: parsedWorkHistory[3].employmentType,
    work_type_5: parsedWorkHistory[4].employmentType,
    education_1: education[0] ?? '',
    education_2: education[1] ?? '',
    education_3: education[2] ?? '',
    education_4: education[3] ?? '',
    education_5: education[4] ?? '',
    list_source: row.list_source,
  };
}

function renderCsv(rows: Record<string, string | number>[], columns: readonly string[]): string {
  if (rows.length === 0) return `${columns.join(',')}\n`;
  const lines = [columns.join(',')];
  for (const row of rows) {
    const values = columns.map((column) => {
      const value = String(row[column] ?? '');
      return value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    });
    lines.push(values.join(','));
  }
  return `${lines.join('\n')}\n`;
}

function shouldIncludeDetailedFields(kwargs: CommandArgs, options: RecruiterPeopleSearchExecutionOptions = {}): boolean {
  if (options.forceDetailedOutput) return true;
  if (kwargs['include-profile-details'] === true) return true;
  if (String(kwargs.format ?? '').trim().toLowerCase() === 'csv') return true;
  return Boolean(String(kwargs.output ?? '').trim());
}

function resolvePeopleSearchColumns(kwargs: CommandArgs, _result: unknown): string[] {
  return String(kwargs.format ?? '').trim().toLowerCase() === 'csv'
    ? [...PEOPLE_SEARCH_EXPORT_COLUMNS]
    : [...PEOPLE_SEARCH_SUMMARY_COLUMNS];
}

async function enrichCandidateWithProfileDetails(
  page: IPage,
  candidate: RecruiterCandidateSummary,
): Promise<RecruiterCandidateDetailedRow> {
  const candidateId = normalizeWhitespace(candidate.candidate_id);
  const profileUrl = resolveRecruiterProfileUrl(candidateId, candidate.profile_url);
  if (!profileUrl) return buildDetailedCandidateRow(candidate, null);

  try {
    await adoptLinkedinTab(page, profileUrl, ['/talent/profile/', '/in/']);
    await ensureLinkedinSession(page, profileUrl);
    return buildDetailedCandidateRow(candidate, await extractRecruiterProfile(page, candidateId, 'people-search:profile'));
  } catch (error) {
    try {
      const projectId = extractRecruiterProjectId(profileUrl);
      if (!projectId || !isLinkedinProfileUrl(profileUrl)) throw error;
      await ensureRecruiterSurface(page, buildRecruiterProjectMembersUrl(projectId));
      const opened = await openRecruiterProfileFromCurrentPage(page, candidateId, profileUrl);
      if (!opened) throw error;
      return buildDetailedCandidateRow(candidate, await extractRecruiterProfile(page, candidateId, 'people-search:profile'));
    } catch {
      return buildDetailedCandidateRow(candidate, null);
    }
  }
}

async function enrichCandidatesWithProfileDetails(
  page: IPage,
  candidates: RecruiterCandidateSummary[],
): Promise<RecruiterCandidateDetailedRow[]> {
  const enriched: RecruiterCandidateDetailedRow[] = [];
  for (const candidate of candidates) {
    enriched.push(await enrichCandidateWithProfileDetails(page, candidate));
  }
  return enriched;
}

async function writePeopleSearchCsv(
  outputPath: string,
  rows: RecruiterCandidateDetailedRow[],
): Promise<void> {
  const resolvedPath = resolvePath(outputPath);
  const csv = renderCsv(rows.map(toPeopleSearchExportRow), PEOPLE_SEARCH_EXPORT_COLUMNS);
  await writeFile(resolvedPath, `\uFEFF${csv}`, 'utf-8');
}

export async function executePeopleSearch(
  page: IPage,
  kwargs: CommandArgs,
  options: RecruiterPeopleSearchExecutionOptions = {},
): Promise<unknown> {
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

  const summaryRows = await collectRecruiterPeopleViaCurrentSearchApis(page, input, 'search', {
    skipReseed: shouldReuseCurrentSearch,
  });

  const includeDetailedFields = shouldIncludeDetailedFields(kwargs, options);
  const detailedRows = includeDetailedFields
    ? await enrichCandidatesWithProfileDetails(page, summaryRows)
    : summaryRows;

  const outputPath = String(kwargs.output ?? '').trim();
  if (outputPath) {
    const exportRows = includeDetailedFields
      ? detailedRows as RecruiterCandidateDetailedRow[]
      : summaryRows.map((candidate) => buildDetailedCandidateRow(candidate, null));
    await writePeopleSearchCsv(outputPath, exportRows);
  }

  const forceCsvOutput = options.forceCsvOutput || String(kwargs.format ?? '').trim().toLowerCase() === 'csv';
  if (forceCsvOutput) {
    const exportRows = includeDetailedFields
      ? detailedRows as RecruiterCandidateDetailedRow[]
      : summaryRows.map((candidate) => buildDetailedCandidateRow(candidate, null));
    return exportRows.map(toPeopleSearchExportRow);
  }

  return detailedRows;
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
    { name: 'include-profile-details', type: 'bool', default: false, help: 'Fetch profile details for the final result window, including work and education history' },
    { name: 'output', type: 'string', help: 'Optional CSV export path for Excel-friendly output' },
  ],
  columns: [...PEOPLE_SEARCH_SUMMARY_COLUMNS],
  resolveColumns: resolvePeopleSearchColumns,
  footerExtra: (kwargs) => {
    const outputPath = String(kwargs.output ?? '').trim();
    return outputPath ? `exported csv: ${resolvePath(outputPath)}` : undefined;
  },
  func: async (page, kwargs) => executePeopleSearch(page, kwargs),
});

export const __test__ = {
  chooseBestRecruiterTab,
  resolveRecruiterSeedTarget,
  splitProfileHistory,
  splitEducationHistory,
  normalizeWorkHistoryItems,
  parseWorkHistoryItem,
  buildDetailedCandidateRow,
  toPeopleSearchExportRow,
  renderCsv,
  writePeopleSearchCsv,
  shouldIncludeDetailedFields,
  resolvePeopleSearchColumns,
  executePeopleSearch,
  PEOPLE_SEARCH_SUMMARY_COLUMNS,
  PEOPLE_SEARCH_EXPORT_COLUMNS,
};
