import { AuthRequiredError, CommandExecutionError, EmptyResultError } from '../../errors.js';
import { generateInterceptorJs } from '../../interceptor.js';
import { sendCommand } from '../../browser/daemon-client.js';
import type { BrowserSessionInfo, IPage } from '../../types.js';

export interface RecruiterPeopleSearchInput {
  query: string;
  location?: string;
  currentTitle?: string;
  pastCompany?: string;
  industry?: string;
  seniority?: string;
  skills?: string;
  language?: string;
  openToWork?: boolean;
  limit: number;
  start: number;
}

export interface RecruiterCandidateSummary {
  rank?: number;
  candidate_id: string;
  profile_url: string;
  name: string;
  headline: string;
  location: string;
  current_company: string;
  current_title: string;
  connection_degree: string;
  open_to_work: string;
  match_signals: string;
  list_source: string;
}

export interface RecruiterCandidateProfile {
  candidate_id: string;
  profile_url: string;
  name: string;
  headline: string;
  location: string;
  about: string;
  current_company: string;
  current_title: string;
  connection_degree: string;
  open_to_work: string;
  mutual_connections: string;
  recent_activity: string;
  contact_visibility: string;
  skills: string;
  languages: string;
  education: string;
  work_history: string;
  list_source: string;
}

export interface RecruiterProjectSummary {
  rank?: number;
  project_id: string;
  name: string;
  description: string;
  status: string;
  candidate_count: string;
  updated_at: string;
  url: string;
}

export interface RecruiterSavedSearchSummary {
  rank?: number;
  search_id: string;
  name: string;
  query: string;
  cadence: string;
  result_count: string;
  url: string;
}

export interface RecruiterInboxThreadSummary {
  rank?: number;
  conversation_id: string;
  candidate_id: string;
  profile_url: string;
  name: string;
  headline: string;
  last_message: string;
  last_time: string;
  unread: string;
  list_source: string;
}

export interface RecruiterInboxMessage {
  rank?: number;
  conversation_id: string;
  candidate_id: string;
  profile_url: string;
  from: string;
  direction: string;
  type: string;
  text: string;
  time: string;
  list_source: string;
}

export interface RecruiterInboxReplyResult {
  conversation_id: string;
  candidate_id: string;
  profile_url: string;
  status: string;
  detail: string;
  list_source: string;
}

export interface RecruiterStatsRow {
  category: string;
  metric: string;
  value: string;
  detail: string;
  list_source: string;
}

export interface RecruiterFollowUpQueueItem {
  rank?: number;
  priority: string;
  priority_score: number;
  recommended_action: string;
  reason: string;
  conversation_id: string;
  candidate_id: string;
  name: string;
  headline: string;
  last_message: string;
  last_time: string;
  unread: string;
  profile_url: string;
  list_source: string;
}

export interface RecruiterFollowUpTemplateContext extends RecruiterFollowUpQueueItem {
  first_name: string;
}

export interface RecruiterFollowUpExportOptions {
  preset?: string;
  fields?: string[];
  template?: string;
}

export interface RecruiterMessageResult {
  candidate_id: string;
  conversation_id: string;
  profile_url: string;
  status: string;
  detail: string;
  list_source: string;
}

export interface RecruiterSaveToProjectResult {
  candidate_id: string;
  project_id: string;
  project_name: string;
  profile_url: string;
  status: string;
  detail: string;
  list_source: string;
}

export interface RecruiterTagResult {
  candidate_id: string;
  tag: string;
  profile_url: string;
  status: string;
  detail: string;
  list_source: string;
}

export interface RecruiterNoteResult {
  candidate_id: string;
  note: string;
  profile_url: string;
  status: string;
  detail: string;
  list_source: string;
}

interface RecruiterMoreActionsDropdownState {
  opened: boolean;
  ariaHidden: string;
  childCount: number;
  text: string;
  visibility: string;
  opacity: string;
  zIndex: string;
}

interface SurfaceDetectionResult {
  currentUrl: string;
  loginRequired: boolean;
  recruiterDetected: boolean;
  publicProfileDetected: boolean;
}

interface BrowserTabMatch {
  tabId?: number;
  url?: string;
  active?: boolean;
}

export interface RecruiterSearchStateProbe {
  currentUrl: string;
  currentKeywords: string;
  visibleKeywords: string;
  recentApiKeywords: string[];
  hasSearchApiTraffic: boolean;
  hasVisibleResults: boolean;
  matchingQuery: boolean;
  shouldReuseCurrentSearch: boolean;
}

export function normalizeWhitespace(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function describeRecruiterProjectChooserBlocker(options: {
  stageButtons: string[];
  visibleButtons: string[];
  moreActions?: RecruiterMoreActionsDropdownState | null;
}): string {
  const stageButtons = options.stageButtons.map(item => normalizeWhitespace(item)).filter(Boolean);
  const visibleButtons = options.visibleButtons.map(item => normalizeWhitespace(item)).filter(Boolean);
  const moreActions = options.moreActions;
  const renderedText = normalizeWhitespace(moreActions?.text);
  if (moreActions?.opened && (moreActions.childCount ?? 0) === 0 && !renderedText) {
    const state = [
      `childCount=${moreActions.childCount ?? 0}`,
      `ariaHidden=${normalizeWhitespace(moreActions.ariaHidden) || '(unset)'}`,
      `visibility=${normalizeWhitespace(moreActions.visibility) || '(unset)'}`,
      `opacity=${normalizeWhitespace(moreActions.opacity) || '(unset)'}`,
      `zIndex=${normalizeWhitespace(moreActions.zIndex) || '(unset)'}`,
    ].join(', ');
    const stageSuffix = stageButtons.length > 0
      ? ` Only stage-save actions were visible elsewhere: ${stageButtons.join(' | ')}.`
      : '';
    return `Recruiter more-actions opened, but LinkedIn did not populate a visible cross-project menu on this profile. Dropdown state: ${state}.${stageSuffix}`;
  }
  if (stageButtons.length > 0) {
    return `Only stage-save actions were visible on the current Recruiter profile, not a cross-project chooser. Visible save actions: ${stageButtons.join(' | ')}`;
  }
  return `No visible Recruiter cross-project chooser was found on the current profile page. Visible buttons: ${visibleButtons.join(' | ') || '(none)'}`;
}

export function parseCsvArg(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map(item => normalizeWhitespace(item))
    .filter(Boolean);
}

export function toYesNo(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) return '';
  if (['true', '1', 'yes', 'y', 'open'].includes(normalized)) return 'yes';
  if (['false', '0', 'no', 'n', 'closed'].includes(normalized)) return 'no';
  return normalized;
}

function looksLikeRecruiterNoteReplySurface(descriptor: unknown): boolean {
  const normalized = normalizeWhitespace(descriptor).toLowerCase();
  return /note|notes|备注|输入备注文本/.test(normalized);
}

function looksLikeRecruiterReplyComposer(descriptor: unknown): boolean {
  const normalized = normalizeWhitespace(descriptor).toLowerCase();
  return /reply|message|inmail|写新消息|回复|消息|发送消息/.test(normalized);
}

function tokenizeRecruiterSearchQuery(value: unknown): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(token => token.length >= 2);
}

export function queriesLookCompatible(expected: unknown, candidate: unknown): boolean {
  const expectedTokens = tokenizeRecruiterSearchQuery(expected);
  const candidateTokens = tokenizeRecruiterSearchQuery(candidate);
  if (expectedTokens.length === 0 || candidateTokens.length === 0) return false;
  const candidateSet = new Set(candidateTokens);
  return expectedTokens.every(token => candidateSet.has(token));
}

export function namesLookCompatible(expected: unknown, candidate: unknown): boolean {
  const tokenize = (value: unknown) => normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const compact = (tokens: string[]) => tokens.join('');
  const editDistance = (left: string, right: string) => {
    if (left === right) return 0;
    if (!left) return right.length;
    if (!right) return left.length;
    const prev = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      let diagonal = prev[0];
      prev[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const temp = prev[j];
        prev[j] = Math.min(
          prev[j] + 1,
          prev[j - 1] + 1,
          diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
        );
        diagonal = temp;
      }
    }
    return prev[right.length];
  };
  const similarToken = (left: string, right: string) => {
    if (!left || !right) return false;
    if (left === right) return true;
    if (left.startsWith(right) || right.startsWith(left)) return true;
    if (left.length >= 4 && right.length >= 4 && left.slice(0, 4) === right.slice(0, 4)) return true;
    const distance = editDistance(left, right);
    return Math.max(left.length, right.length) >= 5
      && distance <= Math.max(1, Math.floor(Math.max(left.length, right.length) / 4))
      && left[0] === right[0];
  };

  const expectedTokens = tokenize(expected);
  const candidateTokens = tokenize(candidate);
  if (expectedTokens.length === 0 || candidateTokens.length === 0) return false;

  const expectedCompact = compact(expectedTokens);
  const candidateCompact = compact(candidateTokens);
  if (expectedCompact === candidateCompact) return true;
  if (expectedCompact.length >= 6 && candidateCompact.includes(expectedCompact)) return true;
  if (candidateCompact.length >= 6 && expectedCompact.includes(candidateCompact)) return true;

  if (expectedTokens.length === 1 || candidateTokens.length === 1) {
    return similarToken(expectedCompact, candidateCompact);
  }

  if (
    similarToken(expectedTokens[0], candidateTokens[0])
    && similarToken(compact(expectedTokens.slice(1)), compact(candidateTokens.slice(1)))
  ) {
    return true;
  }

  return similarToken(expectedTokens[0], candidateTokens[0])
    && similarToken(expectedTokens[expectedTokens.length - 1], candidateTokens[candidateTokens.length - 1]);
}

export function canonicalizeLinkedinUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'https://www.linkedin.com');
    parsed.hash = '';
    for (const key of ['trk', 'trackingId', 'lipi']) parsed.searchParams.delete(key);
    return parsed.toString();
  } catch {
    return normalizeWhitespace(url);
  }
}

export function decodeLinkedinRedirect(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'https://www.linkedin.com');
    if (parsed.pathname === '/redir/redirect/') {
      return canonicalizeLinkedinUrl(parsed.searchParams.get('url') || url);
    }
  } catch {}
  return canonicalizeLinkedinUrl(url);
}

export function candidateIdFromProfileUrl(profileUrl: string): string {
  const canonical = canonicalizeLinkedinUrl(profileUrl);
  const encoded = Buffer.from(canonical, 'utf8').toString('base64url');
  return `url:${encoded}`;
}

export function decodeCandidateId(candidateId: string): string | null {
  const value = normalizeWhitespace(candidateId);
  if (!value) return null;
  if (value.startsWith('url:')) {
    try {
      return canonicalizeLinkedinUrl(Buffer.from(value.slice(4), 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(value)) return canonicalizeLinkedinUrl(value);
  if (value.includes('/in/')) return canonicalizeLinkedinUrl(`https://www.linkedin.com${value}`);
  if (/^[a-z0-9][a-z0-9-]{2,}$/i.test(value)) {
    return canonicalizeLinkedinUrl(`https://www.linkedin.com/in/${value}`);
  }
  return null;
}

export function candidateIdFromArtifacts(profileUrl: string, fallbackUrn?: string): string {
  const canonicalUrl = decodeLinkedinRedirect(profileUrl);
  if (canonicalUrl) return candidateIdFromProfileUrl(canonicalUrl);
  return normalizeWhitespace(fallbackUrn);
}

function normalizeRecruiterInboxReplyResult(
  result: RecruiterInboxReplyResult,
): RecruiterInboxReplyResult {
  const profileUrl = decodeLinkedinRedirect(result.profile_url);
  const candidateId = normalizeWhitespace(result.candidate_id) || candidateIdFromArtifacts(profileUrl, '');
  return {
    ...result,
    candidate_id: candidateId,
    profile_url: profileUrl,
  };
}

export function resolveRecruiterProfileUrl(
  candidateId: string | undefined,
  profileUrl: string | undefined,
): string {
  const explicitUrl = normalizeWhitespace(profileUrl);
  if (explicitUrl) return explicitUrl;

  const raw = normalizeWhitespace(candidateId);
  if (!raw) return '';

  const looksLikePublicProfileRef = raw.startsWith('url:')
    || /^https?:\/\//i.test(raw)
    || raw.includes('/in/');
  if (looksLikePublicProfileRef) {
    const decoded = decodeCandidateId(raw);
    if (decoded) return decoded;
  }

  return `https://www.linkedin.com/talent/profile/${encodeURIComponent(raw)}`;
}

export function isLinkedinProfileUrl(url: string | undefined): boolean {
  const normalized = normalizeWhitespace(url);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized, 'https://www.linkedin.com');
    return /^\/in\/[^/]+\/?$/i.test(parsed.pathname) || /\/talent\/profile\//i.test(parsed.pathname);
  } catch {
    return /^https?:\/\/[^/]*linkedin\.com\/(?:in\/[^/]+\/?|talent\/profile\/)/i.test(normalized);
  }
}

export function buildRecruiterProjectUrl(projectId: string): string {
  return `https://www.linkedin.com/talent/hire/${encodeURIComponent(normalizeWhitespace(projectId))}/overview`;
}

export function buildRecruiterProjectMembersUrl(projectId: string): string {
  return `https://www.linkedin.com/talent/hire/${encodeURIComponent(normalizeWhitespace(projectId))}/manage/all`;
}

export function buildRecruiterInboxUrl(): string {
  return 'https://www.linkedin.com/talent/inbox/0/main';
}

export function buildRecruiterSavedSearchesUrl(): string {
  return 'https://www.linkedin.com/talent/search/saved-searches';
}

export function buildRecruiterInboxThreadUrl(conversationId: string): string {
  const normalized = normalizeWhitespace(conversationId);
  const base = buildRecruiterInboxUrl();
  if (!normalized) return base;
  return `${base}/id/${encodeURIComponent(normalized)}`;
}

export function buildRecruiterProfileMessagesUrl(
  candidateId: string | undefined,
  profileUrl: string | undefined,
): string {
  const resolvedProfileUrl = resolveRecruiterProfileUrl(candidateId, profileUrl);
  const profileToken = extractRecruiterProfileToken(resolvedProfileUrl);
  if (!profileToken) return '';

  try {
    const parsed = new URL(resolvedProfileUrl, 'https://www.linkedin.com');
    parsed.pathname = `/talent/profile/${encodeURIComponent(profileToken)}/messages`;
    parsed.searchParams.delete('rightRail');
    return parsed.toString();
  } catch {
    return `https://www.linkedin.com/talent/profile/${encodeURIComponent(profileToken)}/messages`;
  }
}

export function extractRecruiterProjectId(profileUrl: string | undefined): string {
  const normalized = normalizeWhitespace(profileUrl);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized, 'https://www.linkedin.com');
    return normalizeWhitespace(parsed.searchParams.get('project'));
  } catch {
    return '';
  }
}

export function extractRecruiterProfileToken(profileUrl: string | undefined): string {
  const normalized = normalizeWhitespace(profileUrl);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized, 'https://www.linkedin.com');
    return normalizeWhitespace(parsed.pathname.match(/\/talent\/profile\/([^/?#]+)/i)?.[1]);
  } catch {
    return normalizeWhitespace(normalized.match(/\/talent\/profile\/([^/?#]+)/i)?.[1]);
  }
}

function chooseMatchingLinkedinTab(
  tabs: BrowserTabMatch[],
  targetUrl: string,
  fallbackPatterns: string[],
): BrowserTabMatch | undefined {
  const normalizedTargetUrl = normalizeWhitespace(targetUrl).toLowerCase();
  const normalizedPatterns = fallbackPatterns.map(pattern => normalizeWhitespace(pattern).toLowerCase()).filter(Boolean);
  const matchingTabs = tabs.filter((tab) => {
    const url = String(tab.url || '').toLowerCase();
    return Boolean(
      (normalizedTargetUrl && url === normalizedTargetUrl)
      || normalizedPatterns.some(pattern => url.includes(pattern)),
    );
  });

  return matchingTabs.find((tab) => String(tab.url || '').toLowerCase() === normalizedTargetUrl && tab.active)
    || matchingTabs.find((tab) => String(tab.url || '').toLowerCase() === normalizedTargetUrl)
    || matchingTabs.find((tab) => tab.active)
    || matchingTabs.find((tab) => tab.url);
}

export function buildRecruiterSearchUrl(input: RecruiterPeopleSearchInput): string {
  const params = new URLSearchParams();
  params.set('keywords', input.query);
  if (input.location) params.set('location', input.location);
  if (input.currentTitle) params.set('currentTitle', input.currentTitle);
  if (input.pastCompany) params.set('pastCompany', input.pastCompany);
  if (input.industry) params.set('industry', input.industry);
  if (input.seniority) params.set('seniority', input.seniority);
  if (input.skills) params.set('skills', input.skills);
  if (input.language) params.set('language', input.language);
  if (typeof input.openToWork === 'boolean') params.set('openToWork', input.openToWork ? 'true' : 'false');
  if (input.start > 0) params.set('start', String(input.start));
  return `https://www.linkedin.com/talent/search?${params.toString()}`;
}

function normalizeRecruiterSignal(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return '';
  const mutualCount = normalized.match(/(\d+)\s*(?:位好友|好友|mutual connections?)/i);
  if (mutualCount) return `${mutualCount[1]} mutual connections`;
  if (/进入就业市场|open to work/i.test(normalized)) return 'open to work';
  if (/极有可能有意向|likely interested/i.test(normalized)) return 'likely interested';
  if (/can send inmail/i.test(normalized)) return 'can send inmail';
  if (/recently active/i.test(normalized)) return 'recently active';
  if (/actively hiring/i.test(normalized)) return 'actively hiring';
  if (/actively interviewing/i.test(normalized)) return 'actively interviewing';
  return normalized;
}

export function summarizeSignals(parts: string[]): string {
  const noisyActionPattern = /^(?:发消息给|message\s+\S|send message|send inmail|inmail\s+\S|view profile|查看资料|查看档案|邀请候选人|邀请)/i;
  return [...new Set(
    parts
      .map(part => normalizeRecruiterSignal(part))
      .filter(Boolean)
      .filter(part => !noisyActionPattern.test(part)),
  )].join('; ');
}

function formatNetworkDistance(value: unknown): string {
  const raw = normalizeWhitespace(value);
  const normalized = raw.toUpperCase();
  if (!normalized) return '';
  if (normalized === 'FIRST_DEGREE' || normalized === '1ST' || normalized === '1ST_DEGREE') return '1st';
  if (normalized === 'SECOND_DEGREE' || normalized === '2ND' || normalized === '2ND_DEGREE') return '2nd';
  if (normalized === 'THIRD_DEGREE' || normalized === '3RD' || normalized === '3RD_DEGREE') return '3rd';
  const chineseDegree = raw.match(/([123])\s*度/);
  if (chineseDegree) return `${chineseDegree[1]}${chineseDegree[1] === '1' ? 'st' : chineseDegree[1] === '2' ? 'nd' : 'rd'}`;
  return raw;
}

function firstCurrentWorkExperience(source: unknown): { company: string; title: string } {
  const list = Array.isArray((source as any)?.workExperience)
    ? (source as any).workExperience
    : Array.isArray((source as any)?.positions)
      ? (source as any).positions
      : [];
  for (const entry of list) {
    const company = normalizeWhitespace(
      entry?.companyName
      || entry?.company?.name
      || entry?.companyResolutionResult?.name,
    );
    const title = normalizeWhitespace(entry?.title || entry?.positionTitle);
    if (company || title) return { company, title };
  }
  return { company: '', title: '' };
}

function readNestedText(source: unknown, paths: string[]): string {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((current, part) => current?.[part], source as any);
    if (value && typeof value === 'object') continue;
    const normalized = normalizeWhitespace(value);
    if (normalized) return normalized;
  }
  return '';
}

function extractUrnTail(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return '';
  const tail = normalized.split(':').filter(Boolean).pop() || '';
  try {
    return normalizeWhitespace(decodeURIComponent(tail));
  } catch {
    return normalizeWhitespace(tail);
  }
}

function flattenObjects(root: unknown, limit = 1500): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const stack: unknown[] = [root];
  const seen = new Set<unknown>();

  while (stack.length > 0 && results.length < limit) {
    const current = stack.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }
    const record = current as Record<string, unknown>;
    results.push(record);
    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') stack.push(value);
    }
  }

  return results;
}

function candidateFromSearchHitNode(
  node: Record<string, unknown>,
  listSource: string,
): RecruiterCandidateSummary | null {
  const profileUrl = decodeLinkedinRedirect(readNestedText(node, [
    'publicProfileUrl',
    'profileUrl',
    'member.publicProfileUrl',
    'profile.publicProfileUrl',
    'candidate.publicProfileUrl',
  ]));
  const entityUrn = readNestedText(node, [
    'entityUrn',
    'memberUrn',
    'profileUrn',
    'candidateUrn',
    'member.entityUrn',
    'profile.entityUrn',
    'candidate.entityUrn',
  ]);
  const memberId = extractUrnTail(entityUrn);
  const candidateId = normalizeWhitespace(
    memberId
    || candidateIdFromArtifacts(profileUrl, entityUrn)
    || readNestedText(node, ['candidateId', 'memberId', 'id'])
  );
  const name = normalizeWhitespace(
    readNestedText(node, [
      'fullName',
      'name',
      'member.fullName',
      'profile.fullName',
      'candidate.fullName',
    ])
    || [readNestedText(node, ['firstName', 'member.firstName', 'profile.firstName']), readNestedText(node, ['lastName', 'member.lastName', 'profile.lastName'])].filter(Boolean).join(' ')
  );
  const headline = readNestedText(node, [
    'headline',
    'subTitle',
    'occupation',
    'member.headline',
    'profile.headline',
    'candidate.headline',
    'defaultPosition.title',
    'defaultPosition.headline',
  ]);
  const location = readNestedText(node, [
    'location',
    'locationName',
    'geoLocationName',
    'geo.locationName',
    'member.locationName',
    'profile.locationName',
    'candidate.locationName',
  ]);
  const currentCompany = readNestedText(node, [
    'currentCompany.name',
    'defaultPosition.companyName',
    'defaultPosition.company.name',
    'member.currentCompany.name',
    'profile.currentCompany.name',
    'candidate.currentCompany.name',
    'workExperience.0.companyName',
    'workExperience.0.company.name',
    'workExperience.0.companyResolutionResult.name',
  ]);
  const currentTitle = readNestedText(node, [
    'currentTitle',
    'defaultPosition.title',
    'member.currentTitle',
    'profile.currentTitle',
    'candidate.currentTitle',
    'memberPreferences.titles.0',
    'workExperience.0.title',
  ]);
  const connectionDegree = formatNetworkDistance(readNestedText(node, [
    'networkDistance',
    'connectionDegree',
    'distance',
    'member.networkDistance',
  ]));
  const openToWorkValue = readNestedText(node, [
    'memberPreferences.openToNewOpportunities',
    'openToWork',
    'openToWorkPreference',
    'candidate.openToWork',
  ]);
  const mutualCount = readNestedText(node, [
    'highlights.connections.totalCount',
    'connections.totalCount',
    'mutualConnectionsCount',
    'socialProof.mutualConnectionsCount',
  ]);
  const signalParts = [
    readNestedText(node, ['interestHeadline', 'signals.interestHeadline']),
    openToWorkValue === 'true' ? 'open to work' : '',
    mutualCount ? `${mutualCount} mutual connections` : '',
    readNestedText(node, ['canSendInMail']) === 'true' ? 'can send inmail' : '',
    readNestedText(node, ['signals.summary', 'socialProof.text', 'recentActivity']),
  ];

  if (!name) return null;
  if (!candidateId && !profileUrl) return null;
  if (!(headline || location || currentCompany || currentTitle || signalParts.some(Boolean))) return null;

  return {
    candidate_id: candidateId,
    profile_url: profileUrl || resolveRecruiterProfileUrl(candidateId, profileUrl),
    name,
    headline,
    location,
    current_company: currentCompany,
    current_title: currentTitle,
    connection_degree: connectionDegree,
    open_to_work: toYesNo(openToWorkValue),
    match_signals: summarizeSignals(signalParts),
    list_source: listSource,
  };
}

export function extractRecruiterPeopleFromSearchHitsPayload(
  payload: unknown,
  listSource = 'search',
): RecruiterCandidateSummary[] {
  const records = flattenObjects(payload);
  let merged: RecruiterCandidateSummary[] = [];
  for (const record of records) {
    const candidate = candidateFromSearchHitNode(record, listSource);
    if (!candidate) continue;
    merged = mergeCandidates(merged, [candidate]);
  }
  return merged;
}

export function mergeCandidates(
  existing: RecruiterCandidateSummary[],
  incoming: RecruiterCandidateSummary[],
): RecruiterCandidateSummary[] {
  const keyOf = (item: RecruiterCandidateSummary) => item.candidate_id || item.profile_url;
  const merged = [...existing];
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < merged.length; i++) {
    const key = keyOf(merged[i]);
    if (key) indexByKey.set(key, i);
  }
  const mergeField = (current: string, next: string): string => {
    const a = normalizeWhitespace(current);
    const b = normalizeWhitespace(next);
    if (!a) return b;
    if (!b) return a;
    return b.length > a.length ? b : a;
  };

  for (const item of incoming) {
    const key = keyOf(item);
    if (!key) continue;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(item);
      continue;
    }
    const current = merged[existingIndex];
    merged[existingIndex] = {
      ...current,
      ...item,
      profile_url: mergeField(current.profile_url, item.profile_url),
      name: mergeField(current.name, item.name),
      headline: mergeField(current.headline, item.headline),
      location: mergeField(current.location, item.location),
      current_company: mergeField(current.current_company, item.current_company),
      current_title: mergeField(current.current_title, item.current_title),
      connection_degree: formatNetworkDistance(mergeField(current.connection_degree, item.connection_degree)),
      open_to_work: mergeField(current.open_to_work, item.open_to_work),
      match_signals: summarizeSignals([
        ...parseCsvArg(current.match_signals.replace(/;\s*/g, ',')),
        ...parseCsvArg(item.match_signals.replace(/;\s*/g, ',')),
      ]),
    };
  }

  return merged;
}

export function mergeInboxThreads(
  existing: RecruiterInboxThreadSummary[],
  incoming: RecruiterInboxThreadSummary[],
): RecruiterInboxThreadSummary[] {
  const keyOf = (item: RecruiterInboxThreadSummary) => item.conversation_id || item.candidate_id || item.profile_url;
  const seen = new Set(existing.map(keyOf).filter(Boolean));
  const merged = [...existing];

  for (const item of incoming) {
    const key = keyOf(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export function summarizeRecruiterPeopleStats(
  candidates: RecruiterCandidateSummary[],
  listSource = 'stats:search',
): RecruiterStatsRow[] {
  const normalized = candidates.filter(candidate => candidate && candidate.name);
  const yesOpenToWork = normalized.filter(candidate => toYesNo(candidate.open_to_work) === 'yes').length;
  const withConnection = normalized.filter(candidate => normalizeWhitespace(candidate.connection_degree)).length;
  const uniqueCompanies = new Set(normalized.map(candidate => normalizeWhitespace(candidate.current_company)).filter(Boolean));
  const uniqueLocations = new Set(normalized.map(candidate => normalizeWhitespace(candidate.location)).filter(Boolean));
  const withSignals = normalized.filter(candidate => normalizeWhitespace(candidate.match_signals)).length;

  return [
    {
      category: 'search',
      metric: 'visible_candidates',
      value: String(normalized.length),
      detail: 'Visible recruiter candidates collected from the current search result set',
      list_source: listSource,
    },
    {
      category: 'search',
      metric: 'open_to_work_yes',
      value: String(yesOpenToWork),
      detail: 'Candidates currently marked as open to work',
      list_source: listSource,
    },
    {
      category: 'search',
      metric: 'with_connection_degree',
      value: String(withConnection),
      detail: 'Candidates showing a visible LinkedIn connection degree',
      list_source: listSource,
    },
    {
      category: 'search',
      metric: 'unique_companies',
      value: String(uniqueCompanies.size),
      detail: 'Distinct current companies across the visible candidate set',
      list_source: listSource,
    },
    {
      category: 'search',
      metric: 'unique_locations',
      value: String(uniqueLocations.size),
      detail: 'Distinct visible locations across the current candidate set',
      list_source: listSource,
    },
    {
      category: 'search',
      metric: 'candidates_with_match_signals',
      value: String(withSignals),
      detail: 'Candidates exposing match or activity signals in the visible cards',
      list_source: listSource,
    },
  ];
}

export function summarizeRecruiterInboxStats(
  threads: RecruiterInboxThreadSummary[],
  listSource = 'stats:inbox',
): RecruiterStatsRow[] {
  const normalized = threads.filter(thread => thread && (thread.conversation_id || thread.candidate_id || thread.name));
  const unreadThreads = normalized.filter((thread) => {
    const unread = normalizeWhitespace(thread.unread).toLowerCase();
    return unread === 'unread' || unread === 'new' || /^\d+$/.test(unread);
  }).length;
  const linkedCandidates = normalized.filter(thread => normalizeWhitespace(thread.candidate_id)).length;
  const withProfiles = normalized.filter(thread => normalizeWhitespace(thread.profile_url)).length;
  const recentThreads = normalized.filter((thread) => {
    const lastTime = normalizeWhitespace(thread.last_time).toLowerCase();
    return /\b(today|yesterday|ago|mon|tue|wed|thu|fri|sat|sun)\b/.test(lastTime);
  }).length;

  return [
    {
      category: 'inbox',
      metric: 'visible_threads',
      value: String(normalized.length),
      detail: 'Visible recruiter inbox conversations collected from the thread list',
      list_source: listSource,
    },
    {
      category: 'inbox',
      metric: 'unread_threads',
      value: String(unreadThreads),
      detail: 'Visible conversations that appear unread or newly updated',
      list_source: listSource,
    },
    {
      category: 'inbox',
      metric: 'threads_with_candidate_id',
      value: String(linkedCandidates),
      detail: 'Visible conversations linked to a reusable candidate identifier',
      list_source: listSource,
    },
    {
      category: 'inbox',
      metric: 'threads_with_profile_url',
      value: String(withProfiles),
      detail: 'Visible conversations linked to a public or recruiter profile URL',
      list_source: listSource,
    },
    {
      category: 'inbox',
      metric: 'recently_active_threads',
      value: String(recentThreads),
      detail: 'Visible conversations with a recent last activity timestamp',
      list_source: listSource,
    },
  ];
}

export function buildRecruiterFollowUpQueue(
  threads: RecruiterInboxThreadSummary[],
  options?: { unreadOnly?: boolean; requireCandidateId?: boolean; requireProfileUrl?: boolean },
): RecruiterFollowUpQueueItem[] {
  const unreadOnly = Boolean(options?.unreadOnly);
  const requireCandidateId = Boolean(options?.requireCandidateId);
  const requireProfileUrl = Boolean(options?.requireProfileUrl);

  const classifyPriority = (thread: RecruiterInboxThreadSummary) => {
    const unread = normalizeWhitespace(thread.unread).toLowerCase();
    const lastTime = normalizeWhitespace(thread.last_time).toLowerCase();
    const hasCandidateId = Boolean(normalizeWhitespace(thread.candidate_id));
    const hasProfileUrl = Boolean(normalizeWhitespace(thread.profile_url));
    let score = 0;
    const reasons: string[] = [];

    if (unread === 'unread' || unread === 'new') {
      score += 4;
      reasons.push('thread marked unread');
    } else if (/^\d+$/.test(unread)) {
      score += 4;
      reasons.push(`unread count ${unread}`);
    }

    if (/\btoday\b/.test(lastTime)) {
      score += 3;
      reasons.push('active today');
    } else if (/\byesterday\b/.test(lastTime)) {
      score += 2;
      reasons.push('active yesterday');
    } else if (/\b\d+\s*[hdw]\b/.test(lastTime) || /\bago\b/.test(lastTime)) {
      score += 1;
      reasons.push('recently active');
    }

    if (hasCandidateId) score += 1;
    if (hasProfileUrl) score += 1;

    const lastMessage = normalizeWhitespace(thread.last_message).toLowerCase();
    if (/interested|sounds good|available|yes|sure|thanks|thank you|let's|lets/i.test(lastMessage)) {
      score += 2;
      reasons.push('positive engagement signal');
    }

    let priority = 'low';
    let recommendedAction = 'monitor';
    if (score >= 7) {
      priority = 'high';
      recommendedAction = 'reply-now';
    } else if (score >= 4) {
      priority = 'medium';
      recommendedAction = 'follow-up-soon';
    }

    if (!hasCandidateId && !hasProfileUrl) {
      recommendedAction = priority === 'high' ? 'review-thread-manually' : 'resolve-identity';
      reasons.push('missing reusable candidate reference');
    }

    return {
      priority,
      score,
      recommendedAction,
      reason: reasons.join('; ') || 'visible recruiter thread',
    };
  };

  return threads
    .filter((thread) => {
      const unread = normalizeWhitespace(thread.unread).toLowerCase();
      if (unreadOnly && !(unread === 'unread' || unread === 'new' || /^\d+$/.test(unread))) return false;
      if (requireCandidateId && !normalizeWhitespace(thread.candidate_id)) return false;
      if (requireProfileUrl && !normalizeWhitespace(thread.profile_url)) return false;
      return true;
    })
    .map((thread) => {
      const classification = classifyPriority(thread);
      return {
        priority: classification.priority,
        priority_score: classification.score,
        recommended_action: classification.recommendedAction,
        reason: classification.reason,
        conversation_id: normalizeWhitespace(thread.conversation_id),
        candidate_id: normalizeWhitespace(thread.candidate_id),
        name: normalizeWhitespace(thread.name),
        headline: normalizeWhitespace(thread.headline),
        last_message: normalizeWhitespace(thread.last_message),
        last_time: normalizeWhitespace(thread.last_time),
        unread: normalizeWhitespace(thread.unread),
        profile_url: normalizeWhitespace(thread.profile_url),
        list_source: 'follow-up-queue',
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score || a.name.localeCompare(b.name))
    .map((item, index) => ({ rank: index + 1, ...item }));
}

export function toRecruiterFollowUpTemplateContext(
  item: RecruiterFollowUpQueueItem,
): RecruiterFollowUpTemplateContext {
  const name = normalizeWhitespace(item.name);
  const firstName = name.split(/\s+/).filter(Boolean)[0] || name;
  return {
    ...item,
    first_name: firstName,
  };
}

export function renderRecruiterFollowUpTemplate(
  template: string,
  item: RecruiterFollowUpQueueItem,
): string {
  const normalizedTemplate = String(template ?? '').trim();
  if (!normalizedTemplate) return '';

  const context = toRecruiterFollowUpTemplateContext(item) as unknown as Record<string, unknown>;
  return normalizedTemplate.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const value = context[key];
    return normalizeWhitespace(value);
  }).trim();
}

export function getRecruiterFollowUpFieldValue(
  item: RecruiterFollowUpQueueItem,
  field: string,
): string {
  const key = normalizeWhitespace(field).toLowerCase();
  const context = toRecruiterFollowUpTemplateContext(item) as unknown as Record<string, unknown>;
  return normalizeWhitespace(context[key]);
}

export function presetRecruiterFollowUpExportFields(preset: string): string[] {
  switch (normalizeWhitespace(preset).toLowerCase()) {
    case 'ats':
      return [
        'candidateId=candidate_id',
        'conversationId=conversation_id',
        'fullName=name',
        'firstName=first_name',
        'headline=headline',
        'priority=priority',
        'priorityScore=priority_score',
        'recommendedAction=recommended_action',
        'followUpReason=reason',
        'profileUrl=profile_url',
        'lastMessage=last_message',
        'lastActivity=last_time',
        'unreadState=unread',
        'listSource=list_source',
      ];
    case 'sheet':
    case 'spreadsheet':
      return [
        'candidate_id=candidate_id',
        'name=name',
        'first_name=first_name',
        'headline=headline',
        'priority=priority',
        'priority_score=priority_score',
        'recommended_action=recommended_action',
        'reason=reason',
        'last_time=last_time',
        'last_message=last_message',
        'conversation_id=conversation_id',
        'profile_url=profile_url',
        'unread=unread',
        'list_source=list_source',
      ];
    default:
      return [
        'rank=rank',
        'priority=priority',
        'priority_score=priority_score',
        'recommended_action=recommended_action',
        'reason=reason',
        'conversation_id=conversation_id',
        'candidate_id=candidate_id',
        'name=name',
        'headline=headline',
        'last_message=last_message',
        'last_time=last_time',
        'unread=unread',
        'profile_url=profile_url',
        'list_source=list_source',
      ];
  }
}

export function normalizeRecruiterFollowUpFieldMappings(
  fields: string[] | undefined,
  preset = 'opencli',
): Array<{ target: string; source: string }> {
  const rawFields = Array.isArray(fields) && fields.length > 0 ? fields : presetRecruiterFollowUpExportFields(preset);
  return rawFields
    .map((field) => {
      const normalized = normalizeWhitespace(field);
      if (!normalized) return null;
      const [targetRaw, sourceRaw] = normalized.includes('=')
        ? normalized.split('=')
        : normalized.includes(':')
          ? normalized.split(':')
          : [normalized, normalized];
      const target = normalizeWhitespace(targetRaw);
      const source = normalizeWhitespace(sourceRaw);
      if (!target || !source) return null;
      return { target, source };
    })
    .filter(Boolean) as Array<{ target: string; source: string }>;
}

export function exportRecruiterFollowUpQueue(
  queue: RecruiterFollowUpQueueItem[],
  options?: RecruiterFollowUpExportOptions,
): Array<Record<string, string>> {
  const mappings = normalizeRecruiterFollowUpFieldMappings(options?.fields, options?.preset);
  const template = normalizeWhitespace(options?.template);

  return queue.map((item) => {
    const row: Record<string, string> = {};
    for (const mapping of mappings) {
      row[mapping.target] = getRecruiterFollowUpFieldValue(item, mapping.source);
    }
    if (template) {
      row.next_message = renderRecruiterFollowUpTemplate(template, item);
    }
    return row;
  });
}

export function applyVisibleFilters(
  candidates: RecruiterCandidateSummary[],
  input: RecruiterPeopleSearchInput,
): RecruiterCandidateSummary[] {
  const queryTerms = parseCsvArg(input.query?.toLowerCase());
  const locationTerms = parseCsvArg(input.location?.toLowerCase());
  const titleTerms = parseCsvArg(input.currentTitle?.toLowerCase());
  const companyTerms = parseCsvArg(input.pastCompany?.toLowerCase());
  const skillTerms = parseCsvArg(input.skills?.toLowerCase());
  const languageTerms = parseCsvArg(input.language?.toLowerCase());
  const industryTerms = parseCsvArg(input.industry?.toLowerCase());
  const seniorityTerms = parseCsvArg(input.seniority?.toLowerCase());

  return candidates.filter((candidate) => {
    const haystack = [
      candidate.name,
      candidate.headline,
      candidate.location,
      candidate.current_company,
      candidate.current_title,
      candidate.match_signals,
    ].join(' ').toLowerCase();

    const openToWork = toYesNo(candidate.open_to_work);
    const matchesAll = (terms: string[]) => terms.every(term => haystack.includes(term));

    if (queryTerms.length > 0 && !matchesAll(queryTerms)) return false;
    if (locationTerms.length > 0 && !matchesAll(locationTerms)) return false;
    if (titleTerms.length > 0 && !matchesAll(titleTerms)) return false;
    if (companyTerms.length > 0 && !matchesAll(companyTerms)) return false;
    if (skillTerms.length > 0 && !matchesAll(skillTerms)) return false;
    if (languageTerms.length > 0 && !matchesAll(languageTerms)) return false;
    if (industryTerms.length > 0 && !matchesAll(industryTerms)) return false;
    if (seniorityTerms.length > 0 && !matchesAll(seniorityTerms)) return false;
    if (typeof input.openToWork === 'boolean' && openToWork && openToWork !== toYesNo(input.openToWork)) return false;

    return true;
  });
}

export function listToMultiline(items: string[]): string {
  return items.map(item => normalizeWhitespace(item)).filter(Boolean).join('\n');
}

function serializeArg(value: unknown): string {
  return JSON.stringify(value).replace(/<\/(script)/gi, '<\\/$1');
}

export function buildPageEval<TArgs extends unknown[]>(
  fn: (...args: TArgs) => unknown,
  ...args: TArgs
): string {
  return `(${fn.toString()})(${args.map(arg => serializeArg(arg)).join(',')})`;
}

function detectLinkedinSurfaceInPage(): SurfaceDetectionResult {
  const path = String(window.location.pathname || '');
  const currentUrl = window.location.href;
  const bodyText = String(document.body?.innerText || '').replace(/\s+/g, ' ').toLowerCase();
  const loginRequired = path.includes('/login')
    || path.includes('/checkpoint/')
    || Boolean(document.querySelector('input[name="session_key"], form.login__form'));
  const recruiterDetected = path.includes('/talent/')
    || path.includes('/recruiter/')
    || Boolean(document.querySelector([
      '[href*="/talent/search"]',
      '[href*="/talent/projects"]',
      '[href*="/talent/messages"]',
      '[href*="/talent/inbox"]',
      '[href*="/talent/saved-searches"]',
      '[href*="/talent/search/saved-searches"]',
      '[data-test-recruiter-layout]',
      '[data-live-test-recruiter]',
      '[data-test-search-results]',
      '[data-test-conversation-list-item]',
    ].join(', ')))
    || (/linkedin recruiter|recruiter lite|talent search|saved searches|inmail|candidate|项目|候选人|消息/.test(bodyText)
      && /talent|recruiter|项目|候选人|消息/.test(currentUrl.toLowerCase() + ' ' + bodyText));
  const publicProfileDetected = /^\/in\/[^/]+\/?$/.test(path)
    || Boolean(document.querySelector('main h1, .pv-top-card, [data-view-name="profile-component-entity"]'));

  return { currentUrl, loginRequired, recruiterDetected, publicProfileDetected };
}

function inspectRecruiterSearchStateInPage(input: RecruiterPeopleSearchInput): RecruiterSearchStateProbe {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const tokenize = (value: unknown) => normalize(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(token => token.length >= 2);
  const looksCompatible = (expected: unknown, candidate: unknown) => {
    const expectedTokens = tokenize(expected);
    const candidateTokens = tokenize(candidate);
    if (expectedTokens.length === 0 || candidateTokens.length === 0) return false;
    const candidateSet = new Set(candidateTokens);
    return expectedTokens.every(token => candidateSet.has(token));
  };
  const resourceNames = (() => {
    try {
      return performance.getEntriesByType('resource')
        .map(entry => normalize((entry as PerformanceResourceTiming).name))
        .filter(name => /\/talent\/api\/talentProfiles|talentRecruiterSearchHits/i.test(name))
        .slice(-20);
    } catch {
      return [];
    }
  })();
  const extractKeyword = (value: string): string => {
    if (!value) return '';
    try {
      const parsed = new URL(value, window.location.origin);
      return normalize(
        parsed.searchParams.get('keywords')
        || parsed.searchParams.get('query')
        || parsed.searchParams.get('searchTerm')
        || parsed.searchParams.get('freeText')
        || '',
      );
    } catch {
      return '';
    }
  };
  const currentUrl = window.location.href;
  const currentKeywords = extractKeyword(currentUrl);
  const visibleKeywords = normalize(
    document.querySelector<HTMLInputElement>(
      'input[placeholder*="Search"], input[aria-label*="Search"], input[data-test-search-input], input[role="combobox"]',
    )?.value || '',
  );
  const recentApiKeywords = [...new Set(resourceNames.map(extractKeyword).filter(Boolean))];
  const hasVisibleResults = document.querySelectorAll(
    'a[data-test-link-to-profile-link="true"], a[href*="/talent/profile/"], a[href*="/in/"]',
  ).length > 0;
  const matchingQuery = (
    looksCompatible(input.query, currentKeywords)
    || looksCompatible(input.query, visibleKeywords)
    || recentApiKeywords.some(keyword => looksCompatible(input.query, keyword))
  );
  const hasSearchApiTraffic = recentApiKeywords.length > 0;

  return {
    currentUrl,
    currentKeywords,
    visibleKeywords,
    recentApiKeywords,
    hasSearchApiTraffic,
    hasVisibleResults,
    matchingQuery,
    shouldReuseCurrentSearch: matchingQuery && (hasSearchApiTraffic || hasVisibleResults),
  };
}

function seedRecruiterSearchInPage(input: RecruiterPeopleSearchInput): { applied: boolean; attempted: string[] } {
  const attempted: string[] = [];
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const clickSearchTrigger = () => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a'));
    const trigger = candidates.find(element => {
      const label = normalize(
        element.getAttribute('aria-label')
        || element.getAttribute('title')
        || element.textContent,
      ).toLowerCase();
      if (!label) return false;
      return (
        label === 'search'
        || label === 'start search'
        || label.includes('start search')
        || label.includes('search candidates')
        || label.includes('开始搜索')
        || label.includes('搜索候选人')
        || label.includes('search people')
      );
    });
    if (!trigger) return false;
    attempted.push(`click:${normalize(trigger.textContent || trigger.getAttribute('aria-label') || 'search-trigger')}`);
    trigger.click();
    return true;
  };
  const setInputValue = (selectors: string[], value: string) => {
    if (!value) return false;
    for (const selector of selectors) {
      const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
      if (!element) continue;
      attempted.push(selector);
      element.focus();
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      return true;
    }
    return false;
  };

  const appliedKeyword = setInputValue([
    'input[placeholder*="Search"]',
    'input[aria-label*="Search"]',
    'input[data-test-search-input]',
    'input[role="combobox"]',
  ], input.query);
  const appliedLocation = setInputValue([
    'input[placeholder*="Location"]',
    'input[aria-label*="Location"]',
  ], input.location || '');

  if (appliedKeyword || appliedLocation) {
    clickSearchTrigger();
  }

  return { applied: appliedKeyword || appliedLocation, attempted };
}

function buildRecruiterInteractiveSearchText(input: RecruiterPeopleSearchInput): string {
  return [
    input.query,
    input.location,
    input.currentTitle,
    input.pastCompany,
    input.industry,
    input.seniority,
  ]
    .map(part => normalizeWhitespace(part))
    .filter(Boolean)
    .join(' ');
}

export async function trySeedRecruiterSearchInteractively(
  page: IPage,
  input: RecruiterPeopleSearchInput,
): Promise<boolean> {
  const typedValue = buildRecruiterInteractiveSearchText(input);
  if (!typedValue || !page.nativeType || !page.nativeKeyPress) return false;

  const focused = await page.evaluate(`(() => {
    const candidates = [...document.querySelectorAll('input')]
      .filter((node) => {
        const rect = node.getBoundingClientRect?.();
        if (!rect) return false;
        const aria = String(node.getAttribute('aria-label') || '');
        const placeholder = String(node.getAttribute('placeholder') || '');
        const cls = String(node.className || '');
        return rect.top < 120
          && rect.width > 120
          && (
            aria.includes('Search')
            || aria.includes('搜索')
            || placeholder.includes('Search')
            || placeholder.includes('搜索')
            || placeholder.includes('输入任意内容')
            || cls.includes('ts-common-typeahead__input')
          );
      });
    const target = candidates[0];
    if (!target) return false;
    target.focus();
    target.value = '';
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return document.activeElement === target;
  })()`);
  if (!focused) return false;

  await page.nativeType(typedValue);
  await page.wait({ time: 1 });
  const clickedSuggestion = await page.evaluate(`(() => {
    const normalize = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
    const expected = normalize(${JSON.stringify(typedValue)});
    const items = [...document.querySelectorAll('li.artdeco-typeahead__result, [role="link"].artdeco-typeahead__result')];
    const target = items.find((item) => {
      const text = normalize(item.textContent || '');
      if (!text) return false;
      const mentionsKeywordSearch = text.includes('keyword search') || text.includes('关键词搜索');
      if (mentionsKeywordSearch && (!expected || text.includes(expected))) return true;
      return false;
    }) || items[items.length - 1];
    if (!target) return false;
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  })()`);
  if (clickedSuggestion) {
    await page.wait({ time: 4 });
    return true;
  }
  await page.nativeKeyPress('ArrowDown');
  await page.nativeKeyPress('ArrowDown');
  await page.nativeKeyPress('Enter');
  await page.wait({ time: 4 });
  return true;
}

function extractRecruiterPeopleCardsInPage(listSource: string): RecruiterCandidateSummary[] {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const uniq = (values: string[]) => [...new Set(values.map(value => normalize(value)).filter(Boolean))];
  const normalizeSignal = (value: string) => {
    const normalized = normalize(value);
    if (!normalized) return '';
    const mutualCount = normalized.match(/(\d+)\s*(?:位好友|好友|mutual connections?)/i);
    if (mutualCount) return `${mutualCount[1]} mutual connections`;
    if (/进入就业市场|open to work/i.test(normalized)) return 'open to work';
    if (/极有可能有意向|likely interested/i.test(normalized)) return 'likely interested';
    return normalized;
  };
  const summarize = (values: string[]) => {
    const noisyActionPattern = /^(?:发消息给|message\s+\S|send message|send inmail|inmail\s+\S|view profile|查看资料|查看档案|邀请候选人|邀请)/i;
    return [...new Set(values.map(value => normalizeSignal(value)).filter(Boolean).filter(value => !noisyActionPattern.test(value)))].join('; ');
  };
  const base64UrlEncode = (value: string) => btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const decodeRedirect = (href: string) => {
    try {
      const parsed = new URL(href, window.location.origin);
      if (parsed.pathname === '/redir/redirect/') {
        return parsed.searchParams.get('url') || href;
      }
      return parsed.toString();
    } catch {
      return href;
    }
  };
  const pickProfileLink = (root: Element): HTMLAnchorElement | null => {
    const direct = root.querySelector('a[data-test-link-to-profile-link="true"]') as HTMLAnchorElement | null;
    if (direct?.href) return direct;
    const links = Array.from(root.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    return links.find(link => /\/in\/|\/talent\/profile\//.test(link.href)) || null;
  };
  const readText = (root: Element, selectors: string[]): string => {
    for (const selector of selectors) {
      const value = normalize(root.querySelector(selector)?.textContent);
      if (value) return value;
    }
    return '';
  };
  const parseHistoryLine = (value: string): { company: string; title: string } => {
    const normalized = normalize(value);
    if (!normalized) return { company: '', title: '' };
    const [primary] = normalized.split(' · ').map(part => normalize(part));
    if (!primary) return { company: '', title: '' };
    const dashMatch = primary.match(/^(.+?)\s+-\s+(.+)$/);
    if (dashMatch) return { company: normalize(dashMatch[1]), title: normalize(dashMatch[2]) };
    const atMatch = primary.match(/^(.+?)\s+@\s+(.+)$/);
    if (atMatch) return { title: normalize(atMatch[1]), company: normalize(atMatch[2]) };
    return { company: '', title: primary };
  };
  const inferCurrentRole = (headline: string): { title: string; company: string } => {
    const normalized = normalize(headline);
    const atMatch = normalized.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (atMatch) return { title: normalize(atMatch[1]), company: normalize(atMatch[2]) };
    const dotMatch = normalized.split(' · ');
    if (dotMatch.length >= 2) return { title: dotMatch[0], company: dotMatch.slice(1).join(' · ') };
    return { title: normalized, company: '' };
  };

  const roots = new Set<Element>();
  for (const link of Array.from(document.querySelectorAll('a[href*="/in/"], a[href*="/talent/profile/"]'))) {
    const root = link.closest(
      'li, article, [data-test-search-result-card], [data-testid*="candidate"], [data-urn], .artdeco-list__item',
    ) || link.parentElement;
    if (root) roots.add(root);
  }

  const candidates: RecruiterCandidateSummary[] = [];
  for (const root of roots) {
    const profileLink = pickProfileLink(root);
    const profileUrl = profileLink ? decodeRedirect(profileLink.href) : '';
    const candidateIdAttr = root.getAttribute('data-urn')
      || root.getAttribute('data-member-urn')
      || root.getAttribute('data-profile-urn')
      || '';
    const candidateId = profileUrl ? `url:${base64UrlEncode(profileUrl)}` : normalize(candidateIdAttr);
    const textLines = uniq(String((root as HTMLElement).innerText || '').split('\n'));
    const name = normalize(
      readText(root, [
        '[data-test-row-lockup-full-name]',
        '[data-anonymize="person-name"]',
        '[data-test-person-name]',
      ])
      || profileLink?.textContent
      || textLines[0]
      || ''
    );
    if (!name) continue;

    const connectionDegree = normalize(
      readText(root, [
        '[data-test-lockup-degree]',
        '[data-test-connection-degree]',
      ])
      || textLines.find(line => /(?:^|\s)(1st|2nd|3rd)(?:\s|$)|\d+\s*度人脉/i.test(line))
      || ''
    );
    const location = normalize(
      readText(root, [
        '[data-test-row-lockup-location]',
        '[data-anonymize="location"]',
        '[data-test-location]',
      ])
      || textLines.find(line => /,/.test(line) || /(united states|europe|singapore|london|berlin|dubai|remote|新加坡)/i.test(line))
      || ''
    );
    const headline = normalize(
      readText(root, [
        '[data-test-row-lockup-headline]',
        '[data-anonymize="headline"]',
        '[data-test-headline]',
        '[data-test-job-title]',
      ])
      || textLines.find(line => line !== name && line !== connectionDegree && line !== location)
      || ''
    );
    const historyLine = readText(root, [
      'div[data-test-history] li[data-test-description-description]',
      'div[data-test-history] [data-test-description-description]',
      'div[data-test-history] li',
    ]);
    const historyRole = parseHistoryLine(historyLine);
    const inferredRole = inferCurrentRole(headline);
    const signalCandidates = [
      readText(root, ['[data-test-interest-headline]']),
      ...Array.from(root.querySelectorAll('button,[role="button"]'))
        .map(node => normalize(node.textContent))
        .filter(line => /(?:进入就业市场|open to work|mutual|好友|connections?|消息|views?|浏览|interested|active)/i.test(line)),
      ...textLines.filter(line => /open to work|shared|mutual|recently active|actively hiring|actively interviewing|skills?|进入就业市场|好友|消息|浏览/i.test(line)),
    ];
    const matchSignals = summarize(signalCandidates);
    const openToWork = /open to work|进入就业市场/i.test(`${headline} ${matchSignals}`) ? 'yes' : 'no';

    candidates.push({
      candidate_id: candidateId,
      profile_url: profileUrl,
      name,
      headline,
      location,
      current_company: historyRole.company || inferredRole.company,
      current_title: historyRole.title || inferredRole.title,
      connection_degree: connectionDegree,
      open_to_work: openToWork,
      match_signals: matchSignals,
      list_source: listSource,
    });
  }

  return candidates;
}

async function extractRecruiterPeopleViaApisInPage(listSource: string): Promise<RecruiterCandidateSummary[]> {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const uniq = (values: string[]) => [...new Set(values.map(value => normalize(value)).filter(Boolean))];
  const normalizeSignal = (value: string) => {
    const normalized = normalize(value);
    if (!normalized) return '';
    const mutualCount = normalized.match(/(\d+)\s*(?:位好友|好友|mutual connections?)/i);
    if (mutualCount) return `${mutualCount[1]} mutual connections`;
    if (/进入就业市场|open to work/i.test(normalized)) return 'open to work';
    if (/极有可能有意向|likely interested/i.test(normalized)) return 'likely interested';
    return normalized;
  };
  const summarize = (values: string[]) => {
    const noisyActionPattern = /^(?:发消息给|message\s+\S|send message|send inmail|inmail\s+\S|view profile|查看资料|查看档案|邀请候选人|邀请)/i;
    return [...new Set(values.map(value => normalizeSignal(value)).filter(Boolean).filter(value => !noisyActionPattern.test(value)))].join('; ');
  };
  const decodeRedirect = (href: string) => {
    try {
      const parsed = new URL(href, window.location.origin);
      if (parsed.pathname === '/redir/redirect/') {
        return parsed.searchParams.get('url') || href;
      }
      return parsed.toString();
    } catch {
      return href;
    }
  };
  const inferCurrentRole = (headline: string): { title: string; company: string } => {
    const normalized = normalize(headline);
    const atMatch = normalized.match(/^(.+?)\s+at\s+(.+)$/i);
    if (atMatch) return { title: normalize(atMatch[1]), company: normalize(atMatch[2]) };
    const dotParts = normalized.split(' · ');
    if (dotParts.length >= 2) return { title: dotParts[0], company: dotParts.slice(1).join(' · ') };
    return { title: normalized, company: '' };
  };
  const normalizeNetworkDistance = (value: unknown): string => {
    const raw = normalize(value);
    const normalized = raw.toUpperCase();
    if (!normalized) return '';
    if (normalized === 'FIRST_DEGREE' || normalized === '1ST' || normalized === '1ST_DEGREE') return '1st';
    if (normalized === 'SECOND_DEGREE' || normalized === '2ND' || normalized === '2ND_DEGREE') return '2nd';
    if (normalized === 'THIRD_DEGREE' || normalized === '3RD' || normalized === '3RD_DEGREE') return '3rd';
    const chineseDegree = raw.match(/([123])\s*度/);
    if (chineseDegree) return `${chineseDegree[1]}${chineseDegree[1] === '1' ? 'st' : chineseDegree[1] === '2' ? 'nd' : 'rd'}`;
    return raw;
  };
  const firstWorkExperience = (source: any): { company: string; title: string } => {
    const list = Array.isArray(source?.workExperience)
      ? source.workExperience
      : Array.isArray(source?.positions)
        ? source.positions
        : [];
    for (const entry of list) {
      const company = normalize(entry?.companyName || entry?.company?.name || entry?.companyResolutionResult?.name);
      const title = normalize(entry?.title || entry?.positionTitle);
      if (company || title) return { company, title };
    }
    return { company: '', title: '' };
  };
  const parseListParam = (value: string): string[] => {
    const normalized = normalize(value);
    const match = normalized.match(/^List\((.*)\)$/);
    const payload = match ? match[1] : normalized;
    return payload.split(',').map(item => normalize(item)).filter(Boolean);
  };
  const parseMemberId = (urn: string): string => {
    const normalized = normalize(urn);
    if (!normalized) return '';
    const tail = normalized.split(':').filter(Boolean).pop() || '';
    return normalize(decodeURIComponent(tail));
  };
  const extractVisibleCards = (): RecruiterCandidateSummary[] => {
    const base64UrlEncode = (value: string) => btoa(unescape(encodeURIComponent(value)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const pickProfileLink = (root: Element): HTMLAnchorElement | null => {
      const direct = root.querySelector('a[data-test-link-to-profile-link="true"]') as HTMLAnchorElement | null;
      if (direct?.href) return direct;
      const links = Array.from(root.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      return links.find(link => /\/in\/|\/talent\/profile\//.test(link.href)) || null;
    };
    const readText = (root: Element, selectors: string[]): string => {
      for (const selector of selectors) {
        const value = normalize(root.querySelector(selector)?.textContent);
        if (value) return value;
      }
      return '';
    };
    const parseHistoryLine = (value: string): { company: string; title: string } => {
      const normalized = normalize(value);
      if (!normalized) return { company: '', title: '' };
      const [primary] = normalized.split(' · ').map(part => normalize(part));
      if (!primary) return { company: '', title: '' };
      const dashMatch = primary.match(/^(.+?)\s+-\s+(.+)$/);
      if (dashMatch) return { company: normalize(dashMatch[1]), title: normalize(dashMatch[2]) };
      const atMatch = primary.match(/^(.+?)\s+@\s+(.+)$/);
      if (atMatch) return { title: normalize(atMatch[1]), company: normalize(atMatch[2]) };
      return { company: '', title: primary };
    };
    const roots = new Set<Element>();
    for (const link of Array.from(document.querySelectorAll('a[href*="/in/"], a[href*="/talent/profile/"]'))) {
      const root = link.closest(
        'li, article, [data-test-search-result-card], [data-testid*="candidate"], [data-urn], .artdeco-list__item',
      ) || link.parentElement;
      if (root) roots.add(root);
    }

    const candidates: RecruiterCandidateSummary[] = [];
    for (const root of roots) {
      const profileLink = pickProfileLink(root);
      const profileUrl = profileLink ? decodeRedirect(profileLink.href) : '';
      const candidateIdAttr = root.getAttribute('data-urn')
        || root.getAttribute('data-member-urn')
        || root.getAttribute('data-profile-urn')
        || '';
      const candidateId = profileUrl ? `url:${base64UrlEncode(profileUrl)}` : normalize(candidateIdAttr);
      const textLines = uniq(String((root as HTMLElement).innerText || '').split('\n'));
      const name = normalize(
        readText(root, [
          '[data-test-row-lockup-full-name]',
          '[data-anonymize="person-name"]',
          '[data-test-person-name]',
        ])
        || profileLink?.textContent
        || textLines[0]
        || ''
      );
      if (!name) continue;
      const connectionDegree = normalize(
        readText(root, [
          '[data-test-lockup-degree]',
          '[data-test-connection-degree]',
        ])
        || textLines.find(line => /(?:^|\s)(1st|2nd|3rd)(?:\s|$)|\d+\s*度人脉/i.test(line))
        || ''
      );
      const location = normalize(
        readText(root, [
          '[data-test-row-lockup-location]',
          '[data-anonymize="location"]',
          '[data-test-location]',
        ])
        || textLines.find(line => /,/.test(line) || /(united states|europe|singapore|london|berlin|dubai|remote|新加坡)/i.test(line))
        || ''
      );
      const headline = normalize(
        readText(root, [
          '[data-test-row-lockup-headline]',
          '[data-anonymize="headline"]',
          '[data-test-headline]',
          '[data-test-job-title]',
        ])
        || textLines.find(line => line !== name && line !== connectionDegree && line !== location)
        || ''
      );
      const historyLine = readText(root, [
        'div[data-test-history] li[data-test-description-description]',
        'div[data-test-history] [data-test-description-description]',
        'div[data-test-history] li',
      ]);
      const historyRole = parseHistoryLine(historyLine);
      const inferredRole = inferCurrentRole(headline);
      const signalCandidates = [
        readText(root, ['[data-test-interest-headline]']),
        ...Array.from(root.querySelectorAll('button,[role="button"]'))
          .map(node => normalize(node.textContent))
          .filter(line => /(?:进入就业市场|open to work|mutual|好友|connections?|消息|views?|浏览|interested|active)/i.test(line)),
        ...textLines.filter(line => /open to work|shared|mutual|recently active|actively hiring|actively interviewing|skills?|进入就业市场|好友|消息|浏览/i.test(line)),
      ];
      const matchSignals = summarize(signalCandidates);
      const openToWork = /open to work|进入就业市场/i.test(`${headline} ${matchSignals}`) ? 'yes' : 'no';

      candidates.push({
        candidate_id: candidateId,
        profile_url: profileUrl,
        name,
        headline,
        location,
        current_company: historyRole.company || inferredRole.company,
        current_title: historyRole.title || inferredRole.title,
        connection_degree: connectionDegree,
        open_to_work: openToWork,
        match_signals: matchSignals,
        list_source: listSource,
      });
    }
    return candidates;
  };
  const buildDomMap = () => {
    const map = new Map<string, RecruiterCandidateSummary>();
    const cards = extractVisibleCards();
    for (const card of cards) {
      const memberIdFromUrl = (() => {
        try {
          const parsed = new URL(card.profile_url, window.location.origin);
          const talentMatch = parsed.pathname.match(/\/talent\/profile\/([^/?]+)/i);
          if (talentMatch) return normalize(decodeURIComponent(talentMatch[1]));
        } catch {}
        return '';
      })();
      const candidateId = normalize(card.candidate_id);
      if (candidateId) map.set(candidateId, card);
      if (memberIdFromUrl) map.set(memberIdFromUrl, card);
      if (card.profile_url) map.set(normalize(card.profile_url), card);
    }
    return map;
  };
  const readResourceUrl = (needle: string) => {
    const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
    return [...resources].reverse().find((name) => name.includes(needle)) || '';
  };

  const profileUrl = readResourceUrl('/talent/api/talentProfiles');
  if (!profileUrl) return extractVisibleCards();

  const jsession = document.cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('JSESSIONID='))?.slice('JSESSIONID='.length)
    ?.replace(/^"|"$/g, '') || '';
  const headers: Record<string, string> = { 'x-restli-protocol-version': '2.0.0' };
  if (jsession) headers['csrf-token'] = jsession;

  const profileRes = await fetch(profileUrl, { credentials: 'include', headers });
  if (!profileRes.ok) return extractVisibleCards();

  const payload = await profileRes.json() as {
    results?: Record<string, any>;
    elements?: any[];
  };
  const parsedProfileUrl = new URL(profileUrl, window.location.origin);
  const orderedUrns = parseListParam(parsedProfileUrl.searchParams.get('ids') || '');
  const domMap = buildDomMap();
  const rows: RecruiterCandidateSummary[] = [];
  const readPath = (source: any, path: string): string => {
    const value = path.split('.').reduce<any>((current, part) => current?.[part], source);
    if (value && typeof value === 'object') return '';
    return normalize(value);
  };
  const pickFirst = (source: any, paths: string[]): string => {
    for (const path of paths) {
      const value = readPath(source, path);
      if (value) return value;
    }
    return '';
  };

  const orderedProfiles = orderedUrns.length > 0
    ? orderedUrns
      .map((urn) => ({ urn, profile: payload?.results?.[urn] }))
      .filter((entry) => entry.profile)
    : Array.isArray(payload?.elements)
      ? payload.elements.map((profile) => ({
        urn: normalize(profile?.entityUrn),
        profile,
      }))
      : [];

  for (const { urn, profile } of orderedProfiles) {
    if (!profile) continue;

    const memberId = parseMemberId(profile.entityUrn || urn);
    const dom = domMap.get(memberId) || domMap.get(normalize(profile.publicProfileUrl || '')) || null;
    const name = normalize([profile.firstName, profile.lastName].filter(Boolean).join(' ')) || normalize(dom?.name);
    if (!name) continue;

    const profileUrlValue = normalize(dom?.profile_url) || (memberId
      ? `https://www.linkedin.com/talent/profile/${encodeURIComponent(memberId)}`
      : normalize(profile.publicProfileUrl));
    const workExperience = firstWorkExperience(profile);
    const headline = normalize(dom?.headline) || pickFirst(profile, [
      'headline',
      'profile.headline',
      'member.headline',
      'memberProfile.headline',
      'defaultPosition.title',
    ]);
    const location = normalize(dom?.location) || pickFirst(profile, [
      'location',
      'locationName',
      'geoLocationName',
      'geo.locationName',
      'profile.locationName',
      'member.locationName',
      'location.displayName',
    ]);
    const role = inferCurrentRole(headline);
    const apiCurrentCompany = pickFirst(profile, [
      'currentCompany.name',
      'defaultPosition.companyName',
      'profile.currentCompany.name',
      'member.currentCompany.name',
      'positionView.currentCompanyName',
    ]);
    const apiCurrentTitle = pickFirst(profile, [
      'currentTitle',
      'defaultPosition.title',
      'profile.currentTitle',
      'member.currentTitle',
      'positionView.currentTitle',
      'memberPreferences.titles.0',
    ]);
    const mutualCount = Number(profile?.highlights?.connections?.totalCount || 0);
    const preferredLocation = normalize(
      Object.values(profile?.memberPreferences?.geoLocationsResolutionResults || {})
        .map((item: any) => item?.standardGeoStyleName)
        .find(Boolean),
    );
    const connectionDegree = normalizeNetworkDistance(profile?.networkDistance || dom?.connection_degree);
    const signalParts = [
      ...(normalize(dom?.match_signals) ? normalize(dom?.match_signals).split(';') : []),
      profile?.memberPreferences?.openToNewOpportunities ? 'open to work' : '',
      profile?.signaledInterest?.signaledInterest ? 'signaled interest' : '',
      mutualCount > 0 ? `${mutualCount} mutual connections` : '',
      profile?.viewerCompanyFollowing?.followingViewerCompany ? 'follows your company' : '',
      profile?.canSendInMail ? 'can send inmail' : '',
    ];

    rows.push({
      candidate_id: memberId || normalize(dom?.candidate_id),
      profile_url: profileUrlValue,
      name,
      headline,
      location: location || preferredLocation,
      current_company: normalize(dom?.current_company) || apiCurrentCompany || workExperience.company || role.company,
      current_title: normalize(dom?.current_title) || apiCurrentTitle || workExperience.title || role.title,
      connection_degree: connectionDegree,
      open_to_work: profile?.memberPreferences?.openToNewOpportunities ? 'yes' : normalize(dom?.open_to_work) || 'no',
      match_signals: summarize(signalParts),
      list_source: listSource,
    });
  }

  return rows.length ? rows : extractVisibleCards();
}

function extractRecruiterProfileInPage(candidateIdHint: string, listSource: string): RecruiterCandidateProfile | null {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const uniq = (values: string[]) => [...new Set(values.map(value => normalize(value)).filter(Boolean))];
  const base64UrlEncode = (value: string) => btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const currentUrl = window.location.href;
  const isProfileUrl = (value: string) => /^https?:\/\/[^/]*linkedin\.com\/(?:in\/[^/]+\/?|talent\/profile\/)/i.test(value);
  const looksLikeNoise = (value: string) => /^(?:skip to main content|跳到主要内容|共\s*\d+\s*个通知|notifications?)$/i.test(normalize(value));

  if (!isProfileUrl(currentUrl)) return null;

  const canonicalLink = currentUrl;
  const normalizeHeading = (value: string) => normalize(value)
    .replace(/\s*\(\d+\)\s*$/g, '')
    .replace(/\s*\[\d+\]\s*$/g, '')
    .toLowerCase();
  const headingAliases = new Map<string, string>([
    ['about', 'about'],
    ['summary', 'about'],
    ['摘要', 'about'],
    ['experience', 'experience'],
    ['work experience', 'experience'],
    ['工作经历', 'experience'],
    ['education', 'education'],
    ['教育经历', 'education'],
    ['skills', 'skills'],
    ['技能', 'skills'],
    ['languages', 'languages'],
    ['language proficiency', 'languages'],
    ['语言', 'languages'],
    ['location', 'location'],
    ['所在地点', 'location'],
    ['personal information', 'personal'],
    ['个人信息', 'personal'],
    ['recent activity', 'activity'],
    ['近期动态', 'activity'],
    ['最近动态', 'activity'],
  ]);
  const isActionLine = (value: string) => /^(?:添加邮箱|添加电话号码|公开档案|更改阶段|归档|发消息给|分享.+获取评价|message|inmail|save to project|add tag|add note)/i.test(normalize(value));
  const isMetaLine = (value: string) => /(?:^|\s)(?:1st|2nd|3rd)(?:\s|$)|\d+\s*度人脉|\d+\s*度|mutual connection|共同联系人|recently active|近期活跃|项目\s*\(\d+\)|messages?\s*\(\d+\)|inmail/i.test(normalize(value));
  const readSections = () => {
    const sections = new Map<string, string[]>();
    const roots = Array.from(document.querySelectorAll('section, article'));
    for (const root of roots) {
      const rootLines = uniq(String((root as HTMLElement).innerText || '').split('\n'));
      if (rootLines.length === 0) continue;
      const explicitHeading = normalize(root.querySelector('h1, h2, h3, h4, header, [role="heading"]')?.textContent || '');
      const headingLine = explicitHeading || rootLines.find(line => headingAliases.has(normalizeHeading(line))) || '';
      const sectionKey = headingAliases.get(normalizeHeading(headingLine));
      if (!sectionKey) continue;
      const lines = uniq(rootLines.filter(line => normalizeHeading(line) !== normalizeHeading(headingLine)));
      if (lines.length > 0) sections.set(sectionKey, lines);
    }
    return sections;
  };
  const textLines = uniq(String((document.body as HTMLElement).innerText || '').split('\n'));
  const sections = readSections();
  const readBodySection = (aliases: string[]) => {
    const normalizedAliases = aliases.map(alias => normalizeHeading(alias));
    const startIndex = textLines.findIndex(line => normalizedAliases.includes(normalizeHeading(line)));
    if (startIndex < 0) return [];
    const lines: string[] = [];
    for (let index = startIndex + 1; index < textLines.length; index += 1) {
      const line = textLines[index];
      if (headingAliases.has(normalizeHeading(line))) break;
      lines.push(line);
    }
    return uniq(lines);
  };
  const documentTitle = normalize(document.title).replace(/\s*\|\s*LinkedIn.*$/i, '');
  const fallbackName = textLines.find((line) => {
    const normalized = normalize(line);
    if (!normalized) return false;
    if (headingAliases.has(normalizeHeading(normalized))) return false;
    if (looksLikeNoise(normalized) || isActionLine(normalized) || isMetaLine(normalized)) return false;
    if (normalized.length > 80) return false;
    return /[\p{L}]/u.test(normalized);
  }) || '';
  const name = normalize(
    documentTitle
    || document.querySelector('main h1, h1[data-anonymize="person-name"], [data-test-person-name], h1')?.textContent
    || fallbackName
    || ''
  );
  if (!name || looksLikeNoise(name)) return null;

  const nameIndex = textLines.findIndex(line => normalize(line) === name);
  const introWindow = nameIndex >= 0 ? textLines.slice(nameIndex + 1, nameIndex + 12) : textLines;
  const introLines = introWindow.filter((line) => {
    const normalized = normalize(line);
    if (!normalized || normalized === name) return false;
    if (headingAliases.has(normalizeHeading(normalized))) return false;
    if (isActionLine(normalized)) return false;
    if (/^(?:search|档案|jobadder|更多)$/i.test(normalized)) return false;
    return true;
  });
  const headlineCandidate = normalize(
    document.querySelector('[data-anonymize="headline"], [data-test-headline], .text-body-medium')?.textContent
    || introLines.find(line => !isMetaLine(line))
    || ''
  );
  const headline = /^(?:搜索|search)$/i.test(headlineCandidate)
    ? normalize(introLines.find(line => !isMetaLine(line) && !/^(?:搜索|search)$/i.test(normalize(line))) || '')
    : headlineCandidate;
  const headlineLine = introLines.find(line => normalize(line) === headline) || '';
  const detailLine = introLines.find((line) => {
    const normalized = normalize(line);
    return normalized && normalized !== headlineLine && !isMetaLine(normalized);
  }) || '';
  const detailSegments = detailLine.split('·').map(segment => normalize(segment)).filter(Boolean);
  const location = normalize(
    document.querySelector('[data-anonymize="location"], [data-test-location]')?.textContent
    || (sections.get('location') || [])[0]
    || detailSegments.find(segment => /(湾区|地区|市|省|州|区|县|国|美国|中国|新加坡|香港|东京|伦敦|berlin|singapore|tokyo|london|bay area|remote)/i.test(segment))
    || introLines.find(line => /(remote|united states|canada|europe|uk|singapore|germany|france|india|australia|china|beijing|shanghai|shenzhen|hong kong|tokyo)/i.test(line))
    || ''
  );
  const aboutLines = sections.get('about') || readBodySection(['about', 'summary', '摘要']);
  const workHistoryLines = sections.get('experience') || readBodySection(['experience', 'work experience', '工作经历']);
  const educationLines = sections.get('education') || readBodySection(['education', '教育经历']);
  const skillLines = sections.get('skills') || readBodySection(['skills', '技能']);
  const languageLines = sections.get('languages') || readBodySection(['languages', 'language proficiency', '语言']);
  const activityLines = sections.get('activity') || readBodySection(['recent activity', '近期动态', '最近动态']);
  const personalLines = sections.get('personal') || readBodySection(['personal information', '个人信息']);
  const about = normalize(aboutLines.join(' '));

  const topSignals = textLines.filter(line => /open to work|进入就业市场|mutual connection|共同联系人|recently active|近期活跃|email available|添加邮箱|message candidate|发消息给|inmail|公开档案/i.test(line));
  const connectionDegree = textLines.find(line => /(?:^|\s)(1st|2nd|3rd)(?:\s|$)|\d+\s*度人脉|\d+\s*度/i.test(line)) || '';
  const mutualConnections = textLines.find(line => /mutual connection|共同联系人/i.test(line)) || '';
  const recentActivity = activityLines[0] || textLines.find(line => /recently active|active today|active this week|近期活跃/i.test(line)) || '';
  const contactVisibility = uniq([
    ...textLines.flatMap((line) => {
      const normalized = normalize(line);
      if (!/(添加邮箱|添加电话号码|公开档案|message|发消息给|inmail|email available|open profile|connect)/i.test(normalized)) return [];
      const matches = normalized.match(/添加邮箱|添加电话号码|公开档案|发消息给[^，,;；]*|message(?: candidate)?|inmail|email available|open profile|connect/ig);
      return matches || [normalized];
    }),
    ...personalLines.filter(line => /(邮箱|email|phone|电话号码|公开档案|profile)/i.test(line)),
  ]).join('; ');
  const openToWork = /open to work|进入就业市场/i.test(`${headline} ${topSignals.join(' ')}`) ? 'yes' : 'no';

  const parsedExperienceLabels = new Set(['职位名称', '公司名称', '招聘日期', '工作地点', '职位简介', '职位招聘状况', '展开']);
  const parsedTitleIndex = workHistoryLines.findIndex(line => normalize(line) === '职位名称');
  const parsedCompanyIndex = workHistoryLines.findIndex(line => normalize(line) === '公司名称');
  const parsedCurrentTitle = parsedTitleIndex >= 0
    ? normalize(workHistoryLines.slice(parsedTitleIndex + 1).find(line => !parsedExperienceLabels.has(normalize(line))) || '')
    : '';
  const parsedCurrentCompanyRaw = parsedCompanyIndex >= 0
    ? normalize(workHistoryLines.slice(parsedCompanyIndex + 1).find(line => !parsedExperienceLabels.has(normalize(line))) || '')
    : '';
  const parsedCurrentCompany = normalize(parsedCurrentCompanyRaw.split('·')[0] || '');
  const parsedFirstExperience = parsedCurrentTitle || workHistoryLines[0] || headline;
  const parsedAtMatch = normalize(parsedFirstExperience).match(/^(.+?)\s+at\s+(.+)$/i);
  const currentTitleResolved = parsedCurrentTitle || (parsedAtMatch ? normalize(parsedAtMatch[1]) : normalize(parsedFirstExperience.split(' 路 ')[0] || headline));
  const currentCompanyResolved = parsedCurrentCompany || (parsedAtMatch ? normalize(parsedAtMatch[2]) : normalize(parsedFirstExperience.split(' 路 ').slice(1).join(' 路 ')));

  const profileUrl = canonicalLink;
  const candidateId = candidateIdHint || `url:${base64UrlEncode(profileUrl)}`;

  return {
    candidate_id: candidateId,
    profile_url: profileUrl,
    name,
    headline,
    location,
    about,
    current_company: currentCompanyResolved,
    current_title: currentTitleResolved,
    connection_degree: normalize(connectionDegree),
    open_to_work: openToWork,
    mutual_connections: normalize(mutualConnections),
    recent_activity: normalize(recentActivity),
    contact_visibility: contactVisibility,
    skills: skillLines.join('\n'),
    languages: languageLines.join('\n'),
    education: educationLines.join('\n'),
    work_history: workHistoryLines.join('\n'),
    list_source: listSource,
  };
}

function openRecruiterProfileFromCurrentPageInPage(
  candidateIdHint: string,
  profileUrlHint: string,
): { opened: boolean; href: string } {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const decodeCandidate = (value: string) => {
    const raw = normalize(value);
    if (!raw.startsWith('url:')) return raw;
    const base64 = raw.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    try {
      return decodeURIComponent(escape(atob(base64 + '='.repeat(padding))));
    } catch {
      return '';
    }
  };
  const explicitUrl = normalize(profileUrlHint);
  const decodedCandidateUrl = decodeCandidate(candidateIdHint);
  const candidateUrl = explicitUrl || decodedCandidateUrl;
  const candidateToken = normalize(candidateUrl.match(/\/talent\/profile\/([^/?#]+)/i)?.[1]);
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
  const normalizedCandidateUrl = candidateUrl.toLowerCase();

  const match = anchors.find((anchor) => {
    const href = normalize(anchor.href);
    if (!href) return false;
    const lowerHref = href.toLowerCase();
    if (normalizedCandidateUrl && lowerHref.includes(normalizedCandidateUrl)) return true;
    if (candidateToken && lowerHref.includes(`/talent/profile/${candidateToken.toLowerCase()}`)) return true;
    return false;
  });

  if (!match) return { opened: false, href: '' };
  window.location.assign(match.href);
  return { opened: true, href: match.href };
}

function extractRecruiterProjectsInPage(): RecruiterProjectSummary[] {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const uniq = (values: string[]) => [...new Set(values.map(value => normalize(value)).filter(Boolean))];
  const looksLikeUiNoise = (value: string) => /^(项目|前进到第\s*\d+\s*页|\d+\s*第\s*\d+\s*页|next|previous|上一页|下一页|展开项目菜单|open project menu)$/i.test(value);
  const projects: RecruiterProjectSummary[] = [];
  const roots = new Map<string, Element>();

  for (const root of Array.from(document.querySelectorAll('li.hp-project-list-item, .hp-project-list-item, li, article, section'))) {
    const text = normalize((root as HTMLElement).innerText || '');
    if (!text || !/(项目所有者|创建时间|创建日期|位候选人|人才推荐|Company|Location)/i.test(text)) continue;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const primaryLink = links.find(link => /\/talent\/hire\/\d+\/overview/i.test(link.href))
      || links.find(link => /\/talent\/hire\/\d+\//i.test(link.href))
      || null;
    const projectId = root.getAttribute('data-project-id')
      || primaryLink?.href.match(/\/talent\/hire\/(\d+)(?:\/|$)/i)?.[1]
      || '';
    if (projectId) roots.set(projectId, root);
  }

  for (const [projectId, root] of roots) {
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const link = links.find(node => /\/talent\/hire\/\d+\/overview/i.test(node.href))
      || links.find(node => /\/talent\/hire\/\d+\//i.test(node.href))
      || links.find(node => normalize(node.textContent || '') && !/人才推荐|discover|review/i.test(normalize(node.textContent || '')))
      || null;
    const href = link?.href || '';
    const lines = uniq(String((root as HTMLElement).innerText || '').split('\n'));
    if (lines.length === 0) continue;

    const nameCandidates = [
      normalize(link?.textContent || ''),
      ...lines,
    ].filter(Boolean);
    const name = nameCandidates.find(candidate => !looksLikeUiNoise(candidate)) || '';
    if (!name || looksLikeUiNoise(name)) continue;

    const description = lines.find(line => !looksLikeUiNoise(line) && line !== name) || '';
    const status = lines.find(line => /open|active|closed|archived|draft|进行中|已归档|关闭/i.test(line)) || '';
    const candidateCount = lines.find(line => /\d+/.test(line) && /candidate|profile|lead|候选人|人才|profiles?/i.test(line)) || '';
    const updatedAt = lines.find(line => /查看日期|updated|ago|today|yesterday|刚刚|昨天|今天|更新/i.test(line)) || '';

    projects.push({
      project_id: projectId,
      name,
      description: normalize(description),
      status: normalize(status),
      candidate_count: normalize(candidateCount),
      updated_at: normalize(updatedAt),
      url: href,
    });
  }

  return projects;
}

function extractRecruiterSavedSearchesInPage(): RecruiterSavedSearchSummary[] {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const uniq = (values: string[]) => [...new Set(values.map(value => normalize(value)).filter(Boolean))];
  const absoluteUrl = (value: string) => {
    const normalized = normalize(value);
    if (!normalized) return '';
    try {
      return new URL(normalized, window.location.origin).toString();
    } catch {
      return normalized;
    }
  };
  const selectedCadence = (() => {
    const selected = document.querySelector<HTMLInputElement>(
      'input[name="email-frequency"]:checked, [data-test-frequency-daily]:checked, [data-test-frequency-weekly]:checked',
    );
    const value = normalize(selected?.value || selected?.id || '');
    if (/daily/i.test(value) || /每天/.test(value)) return 'daily';
    if (/weekly/i.test(value) || /每周/.test(value)) return 'weekly';
    return '';
  })();
  const searches: RecruiterSavedSearchSummary[] = [];
  const roots = new Set<Element>(Array.from(
    document.querySelectorAll('tbody tr.saved-searches__result, tr.saved-searches__result, [data-test-results-table] tbody tr'),
  ));

  if (roots.size === 0) {
    for (const link of Array.from(document.querySelectorAll('a[href*="saved"], a[href*="search"]'))) {
      const root = link.closest('li, article, section, [data-search-id], .artdeco-list__item') || link.parentElement;
      if (root && /saved search|alert|已保存的搜索|提醒/i.test(String((root as HTMLElement).innerText || ''))) roots.add(root);
    }
  }

  for (const root of roots) {
    const nameLink = root.querySelector<HTMLAnchorElement>(
      '[data-test-result-row-name] a[href], a.saved-searches__result-link[href], a[href*="savedSearch="]',
    );
    const resultsLink = root.querySelector<HTMLAnchorElement>(
      '[data-test-result-row-link] a[href], a.saved-searches__result-new-link[href]',
    );
    const href = absoluteUrl(nameLink?.getAttribute('href') || resultsLink?.getAttribute('href') || '');
    const searchId = normalize(
      root.getAttribute('data-search-id')
      || root.querySelector<HTMLInputElement>('input[id^="select-"]')?.id.replace(/^select-/, '')
      || href.match(/savedSearch=urn%3Ali%3Ats_cap_saved_search%3A(\d+)/i)?.[1]
      || href.match(/savedSearch=urn:li:ts_cap_saved_search:(\d+)/i)?.[1]
      || href.match(/[?&]searchId=([^&]+)/i)?.[1]
      || '',
    );
    const lines = uniq(String((root as HTMLElement).innerText || '').split('\n'));
    if (!searchId && lines.length === 0) continue;

    const alertText = normalize(
      root.querySelector('[data-test-result-row-alert-button]')?.getAttribute('title')
      || root.querySelector('[data-test-result-row-alert-button] .a11y-text')?.textContent
      || lines.find(line => /提醒|alert/i.test(line))
      || '',
    );
    const cadence = /关闭.*提醒|提醒已开启|active/i.test(alertText)
      ? (selectedCadence || 'on')
      : /开启.*提醒|alert.*off/i.test(alertText)
        ? 'off'
        : selectedCadence;
    const projectOrQuery = normalize(
      root.querySelector('[data-test-result-project-name]')?.textContent
      || lines.find(line => /显示.*搜索条件/.test(line))
      || lines[2]
      || '',
    );
    const resultCount = normalize(
      root.querySelector('[data-test-result-row-link]')?.textContent
      || lines.find(line => /\d/.test(line) && /新|result|candidate|profile|结果/.test(line))
      || '',
    );

    searches.push({
      search_id: searchId,
      name: normalize(nameLink?.textContent || lines.find(line => !/^选择/.test(line)) || lines[0] || ''),
      query: projectOrQuery,
      cadence,
      result_count: resultCount,
      url: href,
    });
  }

  return searches;
}

function extractRecruiterInboxThreadsInPage(listSource: string): RecruiterInboxThreadSummary[] {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const uniq = (values: string[]) => [...new Set(values.map(value => normalize(value)).filter(Boolean))];
  const base64UrlEncode = (value: string) => btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const decodeRedirect = (href: string) => {
    try {
      const parsed = new URL(href, window.location.origin);
      if (parsed.pathname === '/redir/redirect/') {
        return parsed.searchParams.get('url') || href;
      }
      return parsed.toString();
    } catch {
      return href;
    }
  };
  const textOf = (root: Element | null | undefined) => normalize(
    `${(root as HTMLElement | null)?.innerText || ''} ${(root as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(root as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const roots = new Set<Element>();
  const threadLikeSelectors = [
    '[data-conversation-id]',
    'a[href*="/talent/messages"]',
    'a[href*="/talent/inbox/"][href*="/id/"]',
    'a[href*="/messaging/thread"]',
    'a[href*="/messages/thread"]',
    'a[href*="conversationId="]',
    '[data-test-conversation-list-item]',
    '[data-testid*="conversation"]',
  ];

  for (const selector of threadLikeSelectors) {
    for (const node of Array.from(document.querySelectorAll(selector))) {
      const root = node.closest('li, article, section, [role="listitem"], .artdeco-list__item, aside > div') || node.parentElement;
      if (root && isVisible(root)) roots.add(root);
    }
  }

  const threads: RecruiterInboxThreadSummary[] = [];
  for (const root of roots) {
    const links = Array.from(root.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    const profileLink = links.find(link => /\/in\/|\/talent\/profile\//.test(link.href));
    const messageLink = links.find(link => /\/talent\/messages|\/talent\/inbox\/|\/messaging\/thread|\/messages\/thread|conversationId=/.test(link.href));
    const profileUrl = profileLink ? decodeRedirect(profileLink.href) : '';
    const conversationId = normalize(
      root.getAttribute('data-conversation-id')
      || root.getAttribute('data-thread-id')
      || root.getAttribute('data-id')
      || messageLink?.href.match(/conversation(?:Id)?[=/]([^&#/?]+)/i)?.[1]
      || messageLink?.href.match(/\/talent\/inbox\/[^?#]*\/id\/([^?#/]+)/i)?.[1]
      || messageLink?.href.match(/messages\/thread\/([^/?#]+)/i)?.[1]
      || '',
    );
    const candidateUrn = root.getAttribute('data-member-urn')
      || root.getAttribute('data-profile-urn')
      || root.getAttribute('data-urn')
      || '';
    const candidateId = profileUrl ? `url:${base64UrlEncode(profileUrl)}` : normalize(candidateUrn);
    const textLines = uniq(String((root as HTMLElement).innerText || '').split('\n'));
    const name = normalize(
      profileLink?.textContent
      || root.querySelector('[data-anonymize="person-name"], [data-test-person-name], [data-test-participant-name], strong')?.textContent
      || textLines[0]
      || ''
    );
    const headline = normalize(root.querySelector('[data-anonymize="headline"], [data-test-headline], [data-test-job-title], [data-test-participant-headline]')?.textContent || '');
    const lastTime = normalize(
      root.querySelector('[data-test-last-activity-time], time')?.textContent
      || textLines.find(line => /\b(today|yesterday|ago|mon|tue|wed|thu|fri|sat|sun|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2})\b/i.test(line))
      || ''
    );
    const unread = normalize(
      root.querySelector('[aria-label*="unread"], [data-test-unread-count], [data-testid*="unread"]')?.textContent
      || textLines.find(line => /^(\d+|unread|new)$/i.test(line))
      || ''
    );
    const lastMessage = normalize(
      root.querySelector('[data-test-conversation-snippet], [data-test-last-message], [data-testid*="message-snippet"], [data-test-message-deleted], [class*="conversation-snippet"]')?.textContent
      || [...textLines].reverse().find(line => line !== name && line !== headline && line !== lastTime && line !== unread)
      || ''
    );

    if (!name && !conversationId && !candidateId) continue;

    threads.push({
      conversation_id: conversationId,
      candidate_id: candidateId,
      profile_url: profileUrl,
      name,
      headline,
      last_message: lastMessage,
      last_time: lastTime,
      unread,
      list_source: listSource,
    });
  }

  return threads;
}

function enrichRecruiterInboxThreadIdentitiesInPage(
  threads: Array<Pick<RecruiterInboxThreadSummary, 'conversation_id' | 'candidate_id' | 'profile_url' | 'name' | 'headline' | 'last_message' | 'last_time' | 'unread' | 'list_source'>>,
): Promise<RecruiterInboxThreadSummary[]> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const base64UrlEncode = (value: string) => btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const activate = (target: HTMLElement | null | undefined) => {
    if (!target) return false;
    target.scrollIntoView?.({ block: 'center', inline: 'center' });
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    target.click?.();
    return true;
  };
  const canonicalizeProfileUrl = (href: string) => {
    try {
      const parsed = new URL(href, window.location.origin);
      const redirected = parsed.pathname === '/redir/redirect/'
        ? parsed.searchParams.get('url') || href
        : parsed.toString();
      const finalUrl = new URL(redirected, window.location.origin);
      finalUrl.hash = '';
      for (const key of ['trk', 'trackingId', 'lipi']) finalUrl.searchParams.delete(key);
      return finalUrl.toString();
    } catch {
      return normalize(href);
    }
  };
  const textOf = (root: Element | null | undefined) => normalize(
    `${(root as HTMLElement | null)?.innerText || ''} ${(root as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(root as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const findThreadAnchor = (conversationId: string) => {
    const normalizedConversationId = normalize(conversationId);
    if (!normalizedConversationId) return null;
    return Array.from(document.querySelectorAll('a[href]')).find((link) => {
      if (!isVisible(link)) return false;
      const href = (link as HTMLAnchorElement).href || '';
      return href.includes('/talent/inbox/') && href.includes('/id/') && href.includes(normalizedConversationId);
    }) as HTMLAnchorElement | null;
  };
  const findThreadDetailIdentity = async () => {
    const findProfileLink = () => {
      const target = document.getElementById('thread-detail-jump-target');
      return (
        target?.querySelector('a[data-test-link-to-profile-link], a[data-live-test-link-to-profile-link], a[href*="/talent/profile/"], a[href*="/in/"]')
        || Array.from(document.querySelectorAll('a[href]')).find((link) => {
          const href = (link as HTMLAnchorElement).href || '';
          return /\/talent\/profile\/|\/in\//.test(href);
        })
        || null
      ) as HTMLAnchorElement | null;
    };
    const jumpLink = document.querySelector('a[data-test-jump-link], a[href="#thread-detail-jump-target"]') as HTMLElement | null;
    if (jumpLink) activate(jumpLink);

    let profileLink = findProfileLink();
    for (let attempt = 0; attempt < 6 && !profileLink; attempt += 1) {
      await sleep(800);
      profileLink = findProfileLink();
    }

    const target = document.getElementById('thread-detail-jump-target');
    const name = normalize(
      target?.querySelector('[data-test-row-lockup-full-name], [data-live-test-row-lockup-full-name]')?.textContent
      || profileLink?.textContent
      || '',
    );
    const headline = normalize(
      target?.querySelector('[data-test-row-lockup-headline], [data-live-test-row-lockup-headline]')?.textContent
      || '',
    );
    return {
      profileUrl: profileLink ? canonicalizeProfileUrl(profileLink.href) : '',
      name,
      headline,
      targetText: textOf(target),
    };
  };

  return (async () => {
    const results: RecruiterInboxThreadSummary[] = [];
    for (const thread of threads) {
      const current: RecruiterInboxThreadSummary = {
        conversation_id: normalize(thread.conversation_id),
        candidate_id: normalize(thread.candidate_id),
        profile_url: normalize(thread.profile_url),
        name: normalize(thread.name),
        headline: normalize(thread.headline),
        last_message: normalize(thread.last_message),
        last_time: normalize(thread.last_time),
        unread: normalize(thread.unread),
        list_source: normalize(thread.list_source),
      };
      if (current.conversation_id && (!current.profile_url || !current.candidate_id)) {
        const anchor = findThreadAnchor(current.conversation_id);
        if (anchor) {
          activate(anchor);
          await sleep(1500);
          const detail = await findThreadDetailIdentity();
          const profileUrl = detail.profileUrl;
          if (profileUrl) {
            current.profile_url = profileUrl;
            if (!current.candidate_id) current.candidate_id = `url:${base64UrlEncode(profileUrl)}`;
          }
          if (!current.name && detail.name) current.name = detail.name;
          if (!current.headline && detail.headline) current.headline = detail.headline;
        }
      }
      results.push(current);
    }
    return results;
  })();
}

function extractRecruiterInboxThreadIdentityInPage(
  conversationId: string,
  listSource: string,
): Promise<RecruiterInboxThreadSummary | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const base64UrlEncode = (value: string) => btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const canonicalizeProfileUrl = (href: string) => {
    try {
      const parsed = new URL(href, window.location.origin);
      const redirected = parsed.pathname === '/redir/redirect/'
        ? parsed.searchParams.get('url') || href
        : parsed.toString();
      const finalUrl = new URL(redirected, window.location.origin);
      finalUrl.hash = '';
      for (const key of ['trk', 'trackingId', 'lipi']) finalUrl.searchParams.delete(key);
      return finalUrl.toString();
    } catch {
      return normalize(href);
    }
  };
  const activate = (target: HTMLElement | null | undefined) => {
    if (!target) return false;
    target.scrollIntoView?.({ block: 'center', inline: 'center' });
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    target.click?.();
    return true;
  };
  const findProfileLink = () => {
    const target = document.getElementById('thread-detail-jump-target');
    return (
      target?.querySelector('a[data-test-link-to-profile-link], a[data-live-test-link-to-profile-link], a[href*="/talent/profile/"], a[href*="/in/"]')
      || Array.from(document.querySelectorAll('a[href]')).find((link) => {
        const href = (link as HTMLAnchorElement).href || '';
        return /\/talent\/profile\/|\/in\//.test(href);
      })
      || null
    ) as HTMLAnchorElement | null;
  };

  return (async () => {
    const jumpLink = document.querySelector('a[data-test-jump-link], a[href="#thread-detail-jump-target"]') as HTMLElement | null;
    if (jumpLink) activate(jumpLink);

    let profileLink = findProfileLink();
    for (let attempt = 0; attempt < 6 && !profileLink; attempt += 1) {
      await sleep(800);
      profileLink = findProfileLink();
    }

    const target = document.getElementById('thread-detail-jump-target');
    const profileUrl = profileLink ? canonicalizeProfileUrl(profileLink.href) : '';
    if (!profileUrl) {
      return { error: 'No visible profile link was found on the current Recruiter thread page.' };
    }
    const name = normalize(
      target?.querySelector('[data-test-row-lockup-full-name], [data-live-test-row-lockup-full-name]')?.textContent
      || profileLink?.textContent
      || document.querySelector('[data-test-participant-name], [data-anonymize="person-name"], h1, h2')?.textContent
      || '',
    );
    const headline = normalize(
      target?.querySelector('[data-test-row-lockup-headline], [data-live-test-row-lockup-headline]')?.textContent
      || '',
    );
    return {
      conversation_id: normalize(conversationId),
      candidate_id: `url:${base64UrlEncode(profileUrl)}`,
      profile_url: profileUrl,
      name,
      headline,
      last_message: '',
      last_time: '',
      unread: '',
      list_source: normalize(listSource),
    };
  })();
}

function readRecruiterConversationMessagesInPage(
  conversationId: string,
  candidateId: string,
  profileUrl: string,
  limit: number,
  listSource: string,
): Promise<RecruiterInboxMessage[] | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const textOf = (root: Element | null | undefined) => normalize(
    `${(root as HTMLElement | null)?.innerText || ''} ${(root as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(root as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const hrefMatches = (href: string, target: string) => normalize(href).toLowerCase().includes(normalize(target).toLowerCase());
  const findThreadRoot = () => {
    const threadRoots = Array.from(document.querySelectorAll(
      '[data-conversation-id], [data-test-conversation-list-item], [data-testid*="conversation"], li, article, [role="listitem"], .artdeco-list__item',
    ));
    const normalizedConversationId = normalize(conversationId);
    const normalizedCandidateId = normalize(candidateId);
    const normalizedProfileUrl = normalize(profileUrl);

    return threadRoots.find((root) => {
      if (!isVisible(root)) return false;
      const links = Array.from(root.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const rootConversationId = normalize(
        root.getAttribute('data-conversation-id')
        || root.getAttribute('data-thread-id')
        || root.getAttribute('data-id')
        || links.find(link => /conversationId=|\/talent\/inbox\/|\/messages\/thread\/|\/messaging\/thread\//.test(link.href))?.href.match(/conversation(?:Id)?[=/]([^&#/?]+)/i)?.[1]
        || links.find(link => /\/talent\/inbox\/[^?#]*\/id\/|\/messages\/thread\/|\/messaging\/thread\//.test(link.href))?.href.match(/\/talent\/inbox\/[^?#]*\/id\/([^?#/]+)/i)?.[1]
        || links.find(link => /\/messages\/thread\/|\/messaging\/thread\//.test(link.href))?.href.match(/messages\/thread\/([^/?#]+)/i)?.[1]
        || '',
      );
      const rootProfileUrl = normalize(
        links.find(link => /\/in\/|\/talent\/profile\//.test(link.href))?.href || '',
      );
      const rootCandidateId = normalize(
        root.getAttribute('data-member-urn')
        || root.getAttribute('data-profile-urn')
        || root.getAttribute('data-urn')
        || '',
      );
      return Boolean(
        (normalizedConversationId && rootConversationId === normalizedConversationId)
        || (normalizedProfileUrl && rootProfileUrl && hrefMatches(rootProfileUrl, normalizedProfileUrl))
        || (normalizedCandidateId && (rootCandidateId === normalizedCandidateId || textOf(root).includes(normalizedCandidateId))),
      );
    }) as HTMLElement | undefined;
  };
  const findMessagesRegion = () => {
    const selectors = [
      '[data-test-conversation-view]',
      '[data-testid*="conversation-view"]',
      '[role="main"]',
      'main',
      '.msg-thread',
      '.conversation-view',
      'section',
    ];
    for (const selector of selectors) {
      const regions = Array.from(document.querySelectorAll(selector));
      const target = regions.find((region) => {
        if (!isVisible(region)) return false;
        const text = textOf(region).toLowerCase();
        return /message|reply|inmail|conversation/.test(text);
      });
      if (target) return target as HTMLElement;
    }
    return null;
  };
  const collectMessages = (root: ParentNode): RecruiterInboxMessage[] => {
    const nodes = Array.from(root.querySelectorAll(
      '[data-message-id], [data-testid*="message"], [role="listitem"], li, article, .msg-s-message-list__event',
    ));
    const seen = new Set<string>();
    const messages: RecruiterInboxMessage[] = [];
    for (const node of nodes) {
      if (!isVisible(node)) continue;
      const container = (node.closest('[data-message-id], [data-testid*="message"], li, article, .msg-s-message-list__event') || node) as HTMLElement;
      const lines = String(container.innerText || '')
        .split('\n')
        .map(value => normalize(value))
        .filter(Boolean);
      if (lines.length === 0) continue;

      const from = normalize(
        container.getAttribute('data-sender-name')
        || container.querySelector('[data-test-message-sender], [data-testid*="sender"], strong, h4')?.textContent
        || lines[0]
        || ''
      );
      const time = normalize(
        container.querySelector('time')?.textContent
        || lines.find(line => /\b(today|yesterday|ago|am|pm|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2})\b/i.test(line))
        || ''
      );
      const text = normalize(
        container.querySelector('[data-test-message-body], [data-testid*="message-body"], p, [dir="ltr"]')?.textContent
        || lines.filter(line => line !== from && line !== time).join(' ')
      );
      const lowerText = textOf(container).toLowerCase();
      const direction = /self|me|outgoing|sent/.test(
        `${container.getAttribute('data-message-direction') || ''} ${container.className || ''} ${lowerText}`,
      ) ? 'outgoing' : 'incoming';
      const type = /inmail/i.test(lowerText) ? 'inmail' : 'text';
      const dedupeKey = [from, time, text].join('::');
      if (!text || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      messages.push({
        conversation_id: normalize(conversationId),
        candidate_id: normalize(candidateId),
        profile_url: normalize(profileUrl),
        from,
        direction,
        type,
        text,
        time,
        list_source: listSource,
      });
    }
    return messages;
  };

  return (async () => {
    const thread = findThreadRoot();
    if (thread) {
      thread.click();
      await sleep(900);
    } else if (!normalize(conversationId) && !normalize(candidateId) && !normalize(profileUrl)) {
      return { error: 'conversation-id, candidate-id, or profile-url is required.' };
    }

    let region = findMessagesRegion();
    if (!region) {
      await sleep(700);
      region = findMessagesRegion();
    }
    if (!region) {
      return { error: 'No visible LinkedIn Recruiter conversation view was found.' };
    }

    const messages = collectMessages(region).slice(-Math.max(1, limit));
    if (messages.length === 0) {
      return { error: 'No visible messages were found in the selected Recruiter conversation.' };
    }
    return messages;
  })();
}

function replyRecruiterConversationInPage(
  conversationId: string,
  candidateId: string,
  profileUrl: string,
  text: string,
  listSource: string,
): Promise<RecruiterInboxReplyResult | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const textOf = (root: Element | null | undefined) => normalize(
    `${(root as HTMLElement | null)?.innerText || ''} ${(root as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(root as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const hrefMatches = (href: string, target: string) => normalize(href).toLowerCase().includes(normalize(target).toLowerCase());
  const findThreadRoot = () => {
    const threadRoots = Array.from(document.querySelectorAll(
      '[data-conversation-id], [data-test-conversation-list-item], [data-testid*="conversation"], li, article, [role="listitem"], .artdeco-list__item',
    ));
    const normalizedConversationId = normalize(conversationId);
    const normalizedCandidateId = normalize(candidateId);
    const normalizedProfileUrl = normalize(profileUrl);

    return threadRoots.find((root) => {
      if (!isVisible(root)) return false;
      const links = Array.from(root.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const rootConversationId = normalize(
        root.getAttribute('data-conversation-id')
        || root.getAttribute('data-thread-id')
        || root.getAttribute('data-id')
        || links.find(link => /conversationId=|\/talent\/inbox\/|\/messages\/thread\/|\/messaging\/thread\//.test(link.href))?.href.match(/conversation(?:Id)?[=/]([^&#/?]+)/i)?.[1]
        || links.find(link => /\/talent\/inbox\/[^?#]*\/id\/|\/messages\/thread\/|\/messaging\/thread\//.test(link.href))?.href.match(/\/talent\/inbox\/[^?#]*\/id\/([^?#/]+)/i)?.[1]
        || links.find(link => /\/messages\/thread\/|\/messaging\/thread\//.test(link.href))?.href.match(/messages\/thread\/([^/?#]+)/i)?.[1]
        || '',
      );
      const rootProfileUrl = normalize(
        links.find(link => /\/in\/|\/talent\/profile\//.test(link.href))?.href || '',
      );
      const rootCandidateId = normalize(
        root.getAttribute('data-member-urn')
        || root.getAttribute('data-profile-urn')
        || root.getAttribute('data-urn')
        || '',
      );
      return Boolean(
        (normalizedConversationId && rootConversationId === normalizedConversationId)
        || (normalizedProfileUrl && rootProfileUrl && hrefMatches(rootProfileUrl, normalizedProfileUrl))
        || (normalizedCandidateId && (rootCandidateId === normalizedCandidateId || textOf(root).includes(normalizedCandidateId))),
      );
    }) as HTMLElement | undefined;
  };
  const findReplyComposer = () => {
    const isNoteReplySurface = (el: Element) => {
      const noteRoot = el.closest('.note__reply, .create-edit-note, .create-edit-note__form, [data-test-create-edit-note-form], [data-live-test-create-edit-note-form]');
      if (!noteRoot) return false;
      const descriptor = textOf(noteRoot).toLowerCase();
      const className = normalize((noteRoot as HTMLElement).className).toLowerCase();
      return /note|notes|备注|输入备注文本/.test(`${descriptor} ${className}`);
    };
    const selectors = [
      'textarea',
      'div[role="textbox"][contenteditable="true"]',
      '[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      '[role="textbox"]',
    ];
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      const target = nodes.find((el) => {
        if (!isVisible(el)) return false;
        if (isNoteReplySurface(el)) return false;
        const text = textOf(el).toLowerCase();
        const placeholder = normalize((el as HTMLElement).getAttribute?.('placeholder') || (el as HTMLElement).getAttribute?.('data-placeholder') || '').toLowerCase();
        const className = normalize((el as HTMLElement).className).toLowerCase();
        return /reply|message|inmail|写新消息|回复|消息|发送消息/.test(`${text} ${placeholder} ${className}`);
      });
      if (target) return target as HTMLElement;
    }
    return null;
  };
  const setComposerValue = (el: HTMLElement, value: string) => {
    el.focus();
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      el.value = value;
    } else {
      el.textContent = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const clickFirst = (terms: string[], root: ParentNode = document) => {
    const candidates = Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
      .filter((el) => isVisible(el) && terms.some(term => textOf(el).toLowerCase().includes(term)));
    const target = candidates[0] as HTMLElement | undefined;
    if (target) {
      target.click();
      return true;
    }
    return false;
  };

  return (async () => {
    const normalizedText = normalize(text);
    if (!normalizedText) return { error: 'text is required.' };

    const thread = findThreadRoot();
    if (thread) {
      thread.click();
      await sleep(900);
    } else if (!normalize(conversationId) && !normalize(candidateId) && !normalize(profileUrl)) {
      return { error: 'conversation-id, candidate-id, or profile-url is required.' };
    }

    let composer = findReplyComposer();
    if (!composer) {
      clickFirst(['reply', 'message', 'send message', 'inmail', '回复', '消息', '发消息']);
      await sleep(700);
      composer = findReplyComposer();
    }
    if (!composer) {
      return { error: 'No visible Recruiter reply composer was found for the selected conversation.' };
    }

    setComposerValue(composer, normalizedText);
    await sleep(250);

    const sent = clickFirst(['send', 'send message', 'send inmail', '发送', '发送消息']);
    if (!sent) {
      return { error: 'Reply composer opened, but no send button was found.' };
    }

    await sleep(900);

    const resolvedConversationId = normalize(
      conversationId
      || document.body.getAttribute('data-conversation-id')
      || window.location.href.match(/conversation(?:Id)?[=/]([^&#/?]+)/i)?.[1]
      || window.location.href.match(/\/talent\/inbox\/[^?#]*\/id\/([^?#/]+)/i)?.[1]
      || window.location.href.match(/messages\/thread\/([^/?#]+)/i)?.[1]
      || '',
    );
    const resolvedProfileUrl = normalize(
      profileUrl
      || document.querySelector<HTMLAnchorElement>('a[href*="/in/"], a[href*="/talent/profile/"]')?.href
      || '',
    );

    return {
      conversation_id: resolvedConversationId,
      candidate_id: normalize(candidateId),
      profile_url: resolvedProfileUrl,
      status: 'sent',
      detail: `Sent recruiter reply: ${normalizedText}`,
      list_source: listSource,
    };
  })();
}

function sendRecruiterMessageInPage(
  text: string,
  candidateId: string,
  listSource: string,
): Promise<RecruiterMessageResult | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const messageTriggerTerms = ['message', 'send message', 'inmail', 'send inmail', 'contact', '发消息', '发送消息', '发送 inmail', '联系候选人'];
  const sendTerms = ['send inmail', 'send message', 'send', '发消息', '发送', '立即发送'];
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const actionTextOf = (el: Element | null | undefined) => normalize(
    `${(el as HTMLElement | null)?.innerText || ''} ${(el as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(el as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const metadataOf = (el: Element | null | undefined) => normalize(
    `${(el as HTMLElement | null)?.innerText || ''} ${(el as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(el as HTMLElement | null)?.getAttribute?.('title') || ''} ${(el as HTMLElement | null)?.getAttribute?.('placeholder') || ''} ${(el as HTMLElement | null)?.getAttribute?.('data-placeholder') || ''} ${(el as HTMLElement | null)?.className || ''}`,
  );
  const matchesTerms = (el: Element, terms: string[]) => terms.some(term => actionTextOf(el).toLowerCase().includes(term));
  const clickFirst = (terms: string[], root: ParentNode = document) => {
    const candidates = Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
      .filter((el) => isVisible(el) && matchesTerms(el, terms));
    const target = candidates[0] as HTMLElement | undefined;
    if (target) {
      target.click();
      return true;
    }
    return false;
  };
  const visibleButtons = (root: ParentNode = document) => Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
    .filter((el) => isVisible(el))
    .map((el) => actionTextOf(el))
    .filter(Boolean)
    .slice(0, 20);
  const findComposerSurface = () => Array.from(document.querySelectorAll('aside, [role="dialog"], section, [data-test-rich-text-editor], [data-live-test-rich-text-editor]'))
    .find((el) => isVisible(el) && /close editor|preview|send message|send inmail|发消息|发送|关闭编辑器|预览/i.test(metadataOf(el)));
  const isComposerLike = (el: Element) => {
    const metadata = metadataOf(el).toLowerCase();
    const className = normalize((el as HTMLElement).className).toLowerCase();
    if (/\bql-editor\b/.test(className)) return true;
    if (/(^|[^a-z])search([^a-z]|$)|搜索/.test(metadata) && !/message|compose|draft|inmail|发消息|撰写消息|写新消息|草稿/.test(metadata)) {
      return false;
    }
    if (/message|compose|draft|inmail|发消息|发送消息|写新消息|撰写消息|草稿/.test(metadata)) return true;
    const parentSurface = el.closest('aside, [role="dialog"], [data-test-rich-text-editor], [data-live-test-rich-text-editor]');
    return Boolean(parentSurface && /close editor|preview|send|关闭编辑器|预览|发送|发消息/.test(metadataOf(parentSurface).toLowerCase()));
  };
  const findComposer = (root: ParentNode = document) => {
    const selectors = [
      '[data-test-rich-text-editor] .ql-editor[contenteditable="true"]',
      '[data-live-test-rich-text-editor] .ql-editor[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      'textarea',
      'div[role="textbox"][contenteditable="true"]',
      '[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      '[role="textbox"]',
      'input',
    ];
    for (const selector of selectors) {
      const nodes = Array.from(root.querySelectorAll(selector));
      const target = nodes.find((el) => isVisible(el) && isComposerLike(el));
      if (target) return target as HTMLElement;
    }
    return null;
  };
  const waitForComposer = async () => {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const surface = findComposerSurface() || document;
      const candidate = findComposer(surface);
      if (candidate) return candidate;
      const composerMarkersVisible = window.location.href.includes('rightRail=composer')
        || visibleButtons(document).some(label => /close editor|preview|send|关闭编辑器|预览|发送|发消息/i.test(label));
      if (!composerMarkersVisible && attempt >= 6) break;
      await sleep(250);
    }
    return null;
  };
  const setComposerValue = (el: HTMLElement, value: string) => {
    el.focus();
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      el.value = value;
    } else if (el.classList.contains('ql-editor')) {
      const paragraph = document.createElement('p');
      paragraph.textContent = value;
      el.replaceChildren(paragraph);
    } else {
      el.textContent = value;
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const decodeCandidate = (value: string) => {
    const raw = normalize(value);
    if (!raw.startsWith('url:')) return raw;
    const base64 = raw.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    try {
      return decodeURIComponent(escape(atob(base64 + '='.repeat(padding))));
    } catch {
      return '';
    }
  };
  const findCandidateRoot = () => {
    const candidateUrl = decodeCandidate(candidateId);
    const candidateToken = normalize(candidateUrl.match(/\/talent\/profile\/([^/?#]+)/i)?.[1]);
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const link = anchors.find((anchor) => {
      const href = normalize(anchor.href);
      if (!href) return false;
      if (candidateUrl && href === candidateUrl) return true;
      if (candidateToken && href.includes(`/talent/profile/${candidateToken}`)) return true;
      return false;
    });
    return link?.closest('li, article, section, div') || null;
  };

  return (async () => {
    const trimmed = normalize(text);
    if (!trimmed) return { error: 'Message text is required.' };

    let composer = findComposer();
    if (!composer) {
      const candidateRoot = findCandidateRoot() || document;
      clickFirst(messageTriggerTerms, candidateRoot);
      for (let attempt = 0; attempt < 6 && !composer; attempt += 1) {
        await sleep(250);
        const surface = findComposerSurface();
        composer = findComposer(surface || document);
        if (!composer && !window.location.href.includes('rightRail=composer') && attempt === 2) {
          clickFirst(messageTriggerTerms);
        }
      }
    }
    if (!composer) {
      composer = await waitForComposer();
    }

    const dialog = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, aside'))
      .find((el) => isVisible(el));
    const composerSurface = findComposerSurface() || dialog || document;
    if (!composer && composerSurface) {
      composer = findComposer(composerSurface);
    }
    if (!composer) {
      composer = await waitForComposer();
    }
    if (!composer) {
      return { error: 'No visible message composer was found on the current LinkedIn page.' };
    }

    setComposerValue(composer, trimmed);
    await sleep(250);

    const sent = clickFirst(sendTerms, composerSurface) || (composerSurface !== document && clickFirst(sendTerms, document));
    if (!sent) {
      return {
        error: `Message composer opened, but no send button was found. Visible buttons: ${visibleButtons(composerSurface).join(' | ') || visibleButtons(document).join(' | ') || '(none)'}`,
      };
    }

    await sleep(1000);

    const conversationId = normalize(
      (dialog?.getAttribute('data-conversation-id') || '')
      || (document.body.getAttribute('data-conversation-id') || '')
      || (window.location.href.match(/conversation(?:Id)?[=/]([^&#/?]+)/i)?.[1] || '')
      || (window.location.href.match(/\/talent\/inbox\/[^?#]*\/id\/([^?#/]+)/i)?.[1] || '')
      || (window.location.href.match(/messages\/thread\/([^/?#]+)/i)?.[1] || ''),
    );
    const profileUrl = normalize(
      (document.querySelector<HTMLAnchorElement>('a[href*="/in/"], a[href*="/talent/profile/"]')?.href || '')
      || window.location.href,
    );

    return {
      candidate_id: normalize(candidateId),
      conversation_id: conversationId,
      profile_url: profileUrl,
      status: 'sent',
      detail: `Sent LinkedIn message: ${trimmed}`,
      list_source: listSource,
    };
  })();
}

function saveCandidateToProjectInPage(
  projectRef: string,
  candidateId: string,
  listSource: string,
): Promise<RecruiterSaveToProjectResult | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normRef = normalize(projectRef).toLowerCase();
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const textOf = (el: Element | null | undefined) => normalize(
    `${(el as HTMLElement | null)?.innerText || ''} ${(el as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(el as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const visibleButtons = (root: ParentNode = document) => Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
    .filter((el) => isVisible(el))
    .map((el) => textOf(el))
    .filter(Boolean)
    .slice(0, 20);
  const isProfileSurface = () => /\/talent\/profile\//i.test(window.location.href);
  const isStageSaveLabel = (value: string) => /save to pipeline|save to stage|保存到备选人才|备选人才阶段|选择要保存至的备选人才阶段/i.test(normalize(value));
  const isCrossProjectLabel = (value: string) => /save to project|add to project|project chooser|保存到项目|添加到项目/i.test(normalize(value));
  const clickFirst = (terms: string[], root: ParentNode = document) => {
    const normalizedTerms = terms.map(term => normalize(term).toLowerCase()).filter(Boolean);
    const nodes = Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
      .filter((el) => isVisible(el) && normalizedTerms.some(term => textOf(el).toLowerCase().includes(term)));
    const target = nodes[0] as HTMLElement | undefined;
    if (target) {
      target.click();
      return true;
    }
    return false;
  };
  const clickMoreActionsTrigger = (root: ParentNode = document) => {
    const trigger = (root.querySelector('.more-actions__trigger') || document.querySelector('.more-actions__trigger')) as HTMLElement | null;
    if (!trigger || !isVisible(trigger)) return false;
    trigger.click();
    return true;
  };
  const findProjectPanel = () => Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, aside, section'))
    .find((el) => {
      if (!isVisible(el)) return false;
      const label = textOf(el);
      return isCrossProjectLabel(label) && !isStageSaveLabel(label);
    });
  const inspectMoreActionsDropdown = (): RecruiterMoreActionsDropdownState | null => {
    const trigger = document.querySelector('.more-actions__trigger');
    const dropdown = document.querySelector('.more-actions__dropdown-content') as HTMLElement | null;
    if (!trigger && !dropdown) return null;
    const style = dropdown ? window.getComputedStyle(dropdown) : null;
    const wrapper = trigger?.closest('.more-actions');
    return {
      opened: Boolean(
        wrapper?.classList.contains('artdeco-dropdown--is-open')
        || trigger?.getAttribute('aria-expanded') === 'true'
        || dropdown?.getAttribute('aria-hidden') === 'false',
      ),
      ariaHidden: normalize(dropdown?.getAttribute('aria-hidden') || ''),
      childCount: dropdown?.children?.length || 0,
      text: textOf(dropdown),
      visibility: normalize(style?.visibility || ''),
      opacity: normalize(style?.opacity || ''),
      zIndex: normalize(style?.zIndex || ''),
    };
  };
  const describeBlocker = (stageButtons: string[], buttonLabels: string[], moreActions: RecruiterMoreActionsDropdownState | null) => {
    const renderedText = normalize(moreActions?.text);
    if (moreActions?.opened && (moreActions.childCount ?? 0) === 0 && !renderedText) {
      const state = [
        `childCount=${moreActions.childCount ?? 0}`,
        `ariaHidden=${normalize(moreActions.ariaHidden) || '(unset)'}`,
        `visibility=${normalize(moreActions.visibility) || '(unset)'}`,
        `opacity=${normalize(moreActions.opacity) || '(unset)'}`,
        `zIndex=${normalize(moreActions.zIndex) || '(unset)'}`,
      ].join(', ');
      const stageSuffix = stageButtons.length > 0
        ? ` Only stage-save actions were visible elsewhere: ${stageButtons.join(' | ')}.`
        : '';
      return `Recruiter more-actions opened, but LinkedIn did not populate a visible cross-project menu on this profile. Dropdown state: ${state}.${stageSuffix}`;
    }
    if (stageButtons.length > 0) {
      return `Only stage-save actions were visible on the current Recruiter profile, not a cross-project chooser. Visible save actions: ${stageButtons.join(' | ')}`;
    }
    return `No visible Recruiter cross-project chooser was found on the current profile page. Visible buttons: ${buttonLabels.join(' | ') || '(none)'}`;
  };
  const findProjectOption = (root: ParentNode) => {
    const candidates = Array.from(root.querySelectorAll('label, li, button, [role="option"], [data-project-id], input[type="checkbox"], input[type="radio"]'));
    for (const node of candidates) {
      const el = node as HTMLElement;
      const datasetBits = [
        el.getAttribute('data-project-id') || '',
        el.getAttribute('data-id') || '',
        el.getAttribute('value') || '',
        textOf(el),
      ].join(' ').toLowerCase();
      if (!datasetBits || !datasetBits.includes(normRef)) continue;
      const clickable = (el.closest('label, button, li, [role="option"]') || el) as HTMLElement;
      return { clickable, name: textOf(clickable) || normalize(projectRef) };
    }
    return null;
  };
  const decodeCandidate = (value: string) => {
    const raw = normalize(value);
    if (!raw.startsWith('url:')) return raw;
    const base64 = raw.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    try {
      return decodeURIComponent(escape(atob(base64 + '='.repeat(padding))));
    } catch {
      return '';
    }
  };
  const findCandidateRoot = () => {
    const candidateUrl = decodeCandidate(candidateId);
    const candidateToken = normalize(candidateUrl.match(/\/talent\/profile\/([^/?#]+)/i)?.[1]);
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const link = anchors.find((anchor) => {
      const href = normalize(anchor.href);
      if (!href) return false;
      if (candidateUrl && href === candidateUrl) return true;
      if (candidateToken && href.includes(`/talent/profile/${candidateToken}`)) return true;
      return false;
    });
    return link?.closest('li, article, section, div') || null;
  };

  return (async () => {
    if (!normRef) return { error: 'project-id is required.' };
    if (!isProfileSurface()) {
      return { error: 'Cross-project save must start from a visible LinkedIn Recruiter candidate profile page.' };
    }

    let panel = findProjectPanel();
    if (!panel) {
      const candidateRoot = findCandidateRoot() || document;
      clickMoreActionsTrigger(candidateRoot) || clickFirst(['more actions', '更多操作'], candidateRoot);
      await sleep(900);
      clickFirst(['save to project', 'add to project', '保存到项目', '添加到项目']);
      await sleep(900);
      panel = findProjectPanel();
    }
    if (!panel) {
      const buttons = visibleButtons();
      const stageButtons = buttons.filter(label => isStageSaveLabel(label));
      return {
        error: describeBlocker(stageButtons, buttons, inspectMoreActionsDropdown()),
      };
    }

    let option = findProjectOption(panel);
    if (!option) {
      const searchInput = Array.from(panel.querySelectorAll('input, textarea'))
        .find((el) => isVisible(el) && /search|project|搜索|项目/i.test(textOf(el) || el.getAttribute('placeholder') || '')) as HTMLInputElement | undefined;
      if (searchInput) {
        searchInput.focus();
        searchInput.value = normalize(projectRef);
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(800);
        option = findProjectOption(panel);
      }
    }
    if (!option) {
      return { error: `Project "${projectRef}" was not visible in the Recruiter project chooser.` };
    }

    option.clickable.click();
    await sleep(300);

    const confirmed = clickFirst(['save', 'add', 'done', 'confirm', '保存', '添加', '完成', '确认'], panel);
    if (!confirmed) {
      const checkbox = option.clickable.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');
      if (checkbox && !checkbox.checked) checkbox.click();
    }
    await sleep(800);

    const profileUrl = normalize(
      (document.querySelector<HTMLAnchorElement>('a[href*="/in/"], a[href*="/talent/profile/"]')?.href || '')
      || window.location.href,
    );

    return {
      candidate_id: normalize(candidateId),
      project_id: normalize(projectRef),
      project_name: option.name,
      profile_url: profileUrl,
      status: 'saved',
      detail: `Saved candidate to project ${option.name}`,
      list_source: listSource,
    };
  })();
}

function saveCandidateToProjectInPageV2(
  projectRef: string,
  candidateId: string,
  listSource: string,
): Promise<RecruiterSaveToProjectResult | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normRef = normalize(projectRef).toLowerCase();
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const textOf = (el: Element | null | undefined) => normalize(
    `${(el as HTMLElement | null)?.innerText || ''} ${(el as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(el as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const visibleButtons = (root: ParentNode = document) => Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
    .filter((el) => isVisible(el))
    .map((el) => textOf(el))
    .filter(Boolean)
    .slice(0, 20);
  const isProfileSurface = () => /\/talent\/profile\//i.test(window.location.href);
  const isStageSaveLabel = (value: string) => /save to pipeline|save to stage|save to prospects|move stage|change stage|保存到备选人才|更改阶段|候选人阶段/i.test(normalize(value));
  const isCrossProjectLabel = (value: string) => /save to project|add to project|project chooser|existing project|select existing project|保存到项目|添加到项目|选择现有项目/i.test(normalize(value));
  const activateElement = (target: HTMLElement | null | undefined) => {
    if (!target) return false;
    target.scrollIntoView?.({ block: 'center', inline: 'center' });
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    target.click();
    return true;
  };
  const clickFirst = (terms: string[], root: ParentNode = document) => {
    const normalizedTerms = terms.map(term => normalize(term).toLowerCase()).filter(Boolean);
    const nodes = Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
      .filter((el) => isVisible(el) && normalizedTerms.some(term => textOf(el).toLowerCase().includes(term)));
    const target = nodes[0] as HTMLElement | undefined;
    return activateElement(target);
  };
  const clickVisibleProjectSaveButton = (root: ParentNode = document) => clickFirst(
    ['save to project', 'add to project', '保存到项目', '添加到项目'],
    root,
  );
  const clickMoreActionsTrigger = (root: ParentNode = document) => {
    const trigger = (root.querySelector('.more-actions__trigger') || document.querySelector('.more-actions__trigger')) as HTMLElement | null;
    if (!trigger || !isVisible(trigger)) return false;
    return activateElement(trigger);
  };
  const findProjectPanel = () => {
    const allPanels = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, aside, section'))
      .filter((el) => isVisible(el));
    const rightRailPanels = allPanels.filter((el) => {
      const label = textOf(el);
      const classBits = normalize((el as HTMLElement).className || '');
      const tagName = normalize(el.tagName || '');
      return /aside/i.test(tagName)
        || /right-rail|rightrail|drawer|flyout|side-panel|sidepanel/i.test(classBits)
        || /new project|project name|existing project|select existing project|新建项目|项目名称|选择现有项目/i.test(label);
    });
    const candidates = /rightRail=saveToProject/i.test(window.location.href) && rightRailPanels.length > 0
      ? rightRailPanels
      : allPanels;

    return candidates.find((el) => {
      const label = textOf(el);
      const looksLikeSaveRightRail = /rightRail=saveToProject/i.test(window.location.href)
        && /new project|project name|existing project|select existing project|新建项目|项目名称|选择现有项目|收藏/i.test(label);
      return (isCrossProjectLabel(label) || looksLikeSaveRightRail) && !isStageSaveLabel(label);
    });
  };
  const inspectMoreActionsDropdown = (): RecruiterMoreActionsDropdownState | null => {
    const trigger = document.querySelector('.more-actions__trigger');
    const dropdown = document.querySelector('.more-actions__dropdown-content') as HTMLElement | null;
    if (!trigger && !dropdown) return null;
    const style = dropdown ? window.getComputedStyle(dropdown) : null;
    const wrapper = trigger?.closest('.more-actions');
    return {
      opened: Boolean(
        wrapper?.classList.contains('artdeco-dropdown--is-open')
        || trigger?.getAttribute('aria-expanded') === 'true'
        || dropdown?.getAttribute('aria-hidden') === 'false',
      ),
      ariaHidden: normalize(dropdown?.getAttribute('aria-hidden') || ''),
      childCount: dropdown?.children?.length || 0,
      text: textOf(dropdown),
      visibility: normalize(style?.visibility || ''),
      opacity: normalize(style?.opacity || ''),
      zIndex: normalize(style?.zIndex || ''),
    };
  };
  const describeBlocker = (stageButtons: string[], buttonLabels: string[], moreActions: RecruiterMoreActionsDropdownState | null) => {
    const renderedText = normalize(moreActions?.text);
    if (moreActions?.opened && (moreActions.childCount ?? 0) === 0 && !renderedText) {
      const state = [
        `childCount=${moreActions.childCount ?? 0}`,
        `ariaHidden=${normalize(moreActions.ariaHidden) || '(unset)'}`,
        `visibility=${normalize(moreActions.visibility) || '(unset)'}`,
        `opacity=${normalize(moreActions.opacity) || '(unset)'}`,
        `zIndex=${normalize(moreActions.zIndex) || '(unset)'}`,
      ].join(', ');
      const stageSuffix = stageButtons.length > 0
        ? ` Only stage-save actions were visible elsewhere: ${stageButtons.join(' | ')}.`
        : '';
      return `Recruiter more-actions opened, but LinkedIn did not populate a visible cross-project menu on this profile. Dropdown state: ${state}.${stageSuffix}`;
    }
    if (stageButtons.length > 0) {
      return `Only stage-save actions were visible on the current Recruiter profile, not a cross-project chooser. Visible save actions: ${stageButtons.join(' | ')}`;
    }
    return `No visible Recruiter cross-project chooser was found on the current profile page. Visible buttons: ${buttonLabels.join(' | ') || '(none)'}`;
  };
  const findProjectOption = (root: ParentNode) => {
    const candidates = Array.from(root.querySelectorAll('label, li, button, [role="option"], [data-project-id], [data-id], input[type="checkbox"], input[type="radio"], a'));
    for (const node of candidates) {
      const el = node as HTMLElement;
      const datasetBits = [
        el.getAttribute('data-project-id') || '',
        el.getAttribute('data-id') || '',
        el.getAttribute('value') || '',
        textOf(el),
      ].join(' ').toLowerCase();
      if (!datasetBits || !datasetBits.includes(normRef)) continue;
      const clickable = (el.closest('label, button, li, [role="option"], a') || el) as HTMLElement;
      return { clickable, name: textOf(clickable) || normalize(projectRef) };
    }
    return null;
  };
  const findProjectOptionAnywhere = () => findProjectOption(document);
  const setInputValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const prototype = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(input, value);
    if (!descriptor?.set) input.value = value;
  };
  const describeProjectPanelState = (root: ParentNode) => {
    const panel = root as Element;
    const text = textOf(panel).slice(0, 320) || '(none)';
    const container = panel as HTMLElement;
    const inputs = Array.from(root.querySelectorAll('input, textarea'))
      .map((node) => {
        const el = node as HTMLInputElement | HTMLTextAreaElement;
        if (!isVisible(el)) return '';
        return normalize([
          el.getAttribute('type') || '',
          el.getAttribute('placeholder') || '',
          el.getAttribute('aria-label') || '',
          el.getAttribute('name') || '',
          el.getAttribute('id') || '',
        ].join(' '));
      })
      .filter(Boolean)
      .slice(0, 6);
    const options = Array.from(root.querySelectorAll('label, li, button, [role="option"], a'))
      .map((node) => textOf(node as Element))
      .filter(Boolean)
      .slice(0, 10);
    return `Chooser state: url=${normalize(window.location.href) || '(unknown)'}; tag=${normalize(panel.tagName || '') || '(unknown)'}; class=${normalize(container.className || '') || '(none)'}; text=${text}; inputs=${inputs.join(' | ') || '(none)'}; options=${options.join(' | ') || '(none)'}`;
  };
  const ensureExistingProjectMode = async (root: ParentNode) => {
    const rawPanelLabel = textOf(root as Element);
    const panelLabel = `${rawPanelLabel} ${/select existing project|existing project|选择现有项目/i.test(rawPanelLabel) ? '閫夋嫨鐜版湁椤圭洰' : ''}`.trim();
    if (!/select existing project|existing project|选择现有项目/i.test(panelLabel)) return;
    const controls = Array.from(root.querySelectorAll('label, button, span, div, [role="button"], [role="tab"], [role="radio"], input[type="radio"]'));
    const target = controls.find((node) => {
      const el = node as HTMLElement;
      const label = `${textOf(el)} ${textOf(el.closest('label'))}`;
      const matchesExistingProject = /select existing project|existing project|选择现有项目/i.test(label);
      return matchesExistingProject
        && isVisible((el.closest('label, button, [role="button"], [role="tab"], [role="radio"]') as HTMLElement | null) || el);
      return /select existing project|existing project|选择现有项目/i.test(label);
    }) as HTMLElement | undefined;
    if (!target) return;

    const radio = target.matches('input[type="radio"]')
      ? target as HTMLInputElement
      : target.querySelector<HTMLInputElement>('input[type="radio"]');
    if (radio?.checked) return;

    (target.closest('label, button, [role="button"], [role="tab"], [role="radio"]') as HTMLElement | null || target).click();
    await sleep(500);
  };
  const ensureExistingProjectModeV2 = async (root: ParentNode) => {
    const panelLabel = textOf(root as Element);
    if (!/select existing project|existing project|选择现有项目/i.test(panelLabel)) return;
    const controls = Array.from(root.querySelectorAll('label, button, span, div, [role="button"], [role="tab"], [role="radio"], input[type="radio"]'));
    const target = controls.find((node) => {
      const el = node as HTMLElement;
      const label = `${textOf(el)} ${textOf(el.closest('label'))}`;
      const matchesExistingProject = /select existing project|existing project|选择现有项目/i.test(label);
      return matchesExistingProject
        && isVisible((el.closest('label, button, [role="button"], [role="tab"], [role="radio"]') as HTMLElement | null) || el);
    }) as HTMLElement | undefined;
    if (!target) return;

    const clickable = (target.closest('label, button, [role="button"], [role="tab"], [role="radio"]') as HTMLElement | null || target);
    const explicitRadio = root.querySelector<HTMLInputElement>('input[type="radio"][id*="choose-existing"], input[type="radio"][name*="choose-existing"], input[type="radio"][value*="choose-existing"]');
    if (!explicitRadio?.checked) {
      activateElement(clickable);
      await sleep(500);
    }
    if (explicitRadio && !explicitRadio.checked) {
      activateElement(explicitRadio);
      await sleep(500);
    }
  };
  const findProjectSearchInput = (root: ParentNode) => Array.from(root.querySelectorAll('input, textarea'))
    .find((node) => {
      const el = node as HTMLInputElement | HTMLTextAreaElement;
      if (!isVisible(el)) return false;
      const descriptor = [
        textOf(el),
        el.getAttribute('placeholder') || '',
        el.getAttribute('aria-label') || '',
        el.getAttribute('name') || '',
        el.getAttribute('id') || '',
        textOf(el.closest('label')),
        textOf(el.parentElement),
      ].join(' ');
      const boostedDescriptor = /选择现有项目|项目|项目名称/i.test(descriptor)
        ? `${descriptor} existing project project`
        : descriptor;
      return /search|find|project|existing project|选择现有项目|项目|项目名称/i.test(descriptor);
    }) as HTMLInputElement | HTMLTextAreaElement | undefined;
  const decodeCandidate = (value: string) => {
    const raw = normalize(value);
    if (!raw.startsWith('url:')) return raw;
    const base64 = raw.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    try {
      return decodeURIComponent(escape(atob(base64 + '='.repeat(padding))));
    } catch {
      return '';
    }
  };
  const findCandidateRoot = () => {
    const candidateUrl = decodeCandidate(candidateId);
    const candidateToken = normalize(candidateUrl.match(/\/talent\/profile\/([^/?#]+)/i)?.[1]);
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const link = anchors.find((anchor) => {
      const href = normalize(anchor.href);
      if (!href) return false;
      if (candidateUrl && href === candidateUrl) return true;
      if (candidateToken && href.includes(`/talent/profile/${candidateToken}`)) return true;
      return false;
    });
    return link?.closest('li, article, section, div') || null;
  };

  return (async () => {
    if (!normRef) return { error: 'project-id is required.' };
    if (!isProfileSurface()) {
      return { error: 'Cross-project save must start from a visible LinkedIn Recruiter candidate profile page.' };
    }

    let panel = findProjectPanel();
    if (!panel && /rightRail=saveToProject/i.test(window.location.href)) {
      clickVisibleProjectSaveButton();
      await sleep(1200);
      panel = findProjectPanel();
    }
    if (!panel) {
      clickVisibleProjectSaveButton();
      await sleep(1200);
      if (!findProjectPanel()) {
        clickVisibleProjectSaveButton();
        await sleep(1500);
      }
      panel = findProjectPanel();
    }
    if (!panel) {
      const candidateRoot = findCandidateRoot() || document;
      clickMoreActionsTrigger(candidateRoot) || clickFirst(['more actions', '更多操作'], candidateRoot);
      await sleep(900);
      clickVisibleProjectSaveButton();
      await sleep(900);
      panel = findProjectPanel();
    }
    if (!panel) {
      const buttons = visibleButtons();
      const stageButtons = buttons.filter(label => isStageSaveLabel(label));
      return {
        error: describeBlocker(stageButtons, buttons, inspectMoreActionsDropdown()),
      };
    }

    await ensureExistingProjectModeV2(panel);
    panel = findProjectPanel() || panel;

    let option = findProjectOption(panel) || findProjectOptionAnywhere();
    if (!option) {
      const searchInput = findProjectSearchInput(panel);
      if (searchInput) {
        searchInput.focus();
        searchInput.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        await sleep(250);
        option = findProjectOption(panel) || findProjectOptionAnywhere();
        if (!option) {
          const existingValue = normalize((searchInput as HTMLInputElement | HTMLTextAreaElement).value || '');
          if (existingValue.toLowerCase() !== normRef) {
            setInputValue(searchInput, '');
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
            setInputValue(searchInput, normalize(projectRef));
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          searchInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
          searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowDown' }));
          await sleep(1200);
          option = findProjectOption(panel) || findProjectOptionAnywhere();
        }
      }
    }
    if (!option) {
      return { error: `Project "${projectRef}" was not visible in the Recruiter project chooser. ${describeProjectPanelState(panel)}` };
    }

    option.clickable.click();
    await sleep(500);

    const confirmed = clickFirst(['save', 'add', 'done', 'confirm', '收藏', '保存', '添加', '完成', '确认'], panel)
      || clickFirst(['save', 'add', 'done', 'confirm', '收藏', '保存', '添加', '完成', '确认']);
    if (!confirmed) {
      const checkbox = option.clickable.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');
      if (checkbox && !checkbox.checked) checkbox.click();
    }
    await sleep(800);

    const profileUrl = normalize(
      (document.querySelector<HTMLAnchorElement>('a[href*="/in/"], a[href*="/talent/profile/"]')?.href || '')
      || window.location.href,
    );

    return {
      candidate_id: normalize(candidateId),
      project_id: normalize(projectRef),
      project_name: option.name,
      profile_url: profileUrl,
      status: 'saved',
      detail: `Saved candidate to project ${option.name}`,
      list_source: listSource,
    };
  })();
}

function addRecruiterTagInPage(
  tag: string,
  candidateId: string,
  listSource: string,
): Promise<RecruiterTagResult | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const textOf = (el: Element | null | undefined) => normalize(
    `${(el as HTMLElement | null)?.innerText || ''} ${(el as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(el as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const clickFirst = (terms: string[], root: ParentNode = document) => {
    const nodes = Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
      .filter((el) => isVisible(el) && terms.some(term => textOf(el).toLowerCase().includes(term)));
    const target = nodes[0] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView?.({ block: 'center', inline: 'center' });
      for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
      target.click();
      return true;
    }
    return false;
  };
  const findPanel = () => Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, aside, section, div'))
    .find((el) => isVisible(el) && /tag|label|标签|搜索标签/i.test(textOf(el)));
  const findTagInput = (root: ParentNode = document) => Array.from(root.querySelectorAll('input, textarea'))
    .find((node) => {
      const el = node as HTMLInputElement | HTMLTextAreaElement;
      if (!isVisible(el)) return false;
      const descriptor = [
        textOf(el),
        el.getAttribute('placeholder') || '',
        el.getAttribute('aria-label') || '',
        el.getAttribute('name') || '',
        el.getAttribute('id') || '',
        textOf(el.closest('section, aside, div, form')),
      ].join(' ');
      return /tag|label|标签|搜索标签|添加标签/i.test(descriptor);
    }) as HTMLInputElement | HTMLTextAreaElement | undefined;

  return (async () => {
    const normalizedTag = normalize(tag);
    if (!normalizedTag) return { error: 'tag is required.' };

    let panel = findPanel();
    if (!panel) {
      clickFirst(['tag', 'add tag', 'label', '标签', '添加标签']);
      await sleep(900);
      panel = findPanel();
    }
    const inlineInput = findTagInput(panel || document);
    const workingRoot = panel || inlineInput?.closest('section, div, aside, form') || document;
    if (!panel && !inlineInput) {
      return { error: 'No visible Recruiter tag chooser was found on the current page.' };
    }

    const input = inlineInput || findTagInput(workingRoot);
    if (input) {
      input.focus();
      input.value = normalizedTag;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(700);
    }

    const lowerTag = normalizedTag.toLowerCase();
    const options = Array.from(document.querySelectorAll('label, li, button, [role="option"], [data-tag-id], input[type="checkbox"], input[type="radio"], .artdeco-typeahead__result, .artdeco-typeahead__results-list li'));
    const option = options.find((el) => textOf(el).toLowerCase().includes(lowerTag)) as HTMLElement | undefined;
    if (option) {
      (option.closest('label, button, li, [role="option"]') as HTMLElement | null || option).click();
      await sleep(250);
    }

    const confirmed = clickFirst(['save', 'add', 'done', 'apply', 'create', '保存', '添加', '完成', '应用', '创建'], workingRoot)
      || clickFirst(['save', 'add', 'done', 'apply', 'create', '保存', '添加', '完成', '应用', '创建']);
    if (!confirmed && !option) {
      return { error: `Tag "${normalizedTag}" was not visible and no confirm button was available.` };
    }

    await sleep(700);
    const profileUrl = normalize(
      (document.querySelector<HTMLAnchorElement>('a[href*="/in/"], a[href*="/talent/profile/"]')?.href || '')
      || window.location.href,
    );

    return {
      candidate_id: normalize(candidateId),
      tag: normalizedTag,
      profile_url: profileUrl,
      status: 'tagged',
      detail: `Added tag ${normalizedTag}`,
      list_source: listSource,
    };
  })();
}

function addRecruiterNoteInPage(
  note: string,
  candidateId: string,
  listSource: string,
): Promise<RecruiterNoteResult | { error: string }> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const isVisible = (el: Element | null | undefined) => {
    if (!el) return false;
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    const style = window.getComputedStyle(el as Element);
    return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
  };
  const textOf = (el: Element | null | undefined) => normalize(
    `${(el as HTMLElement | null)?.innerText || ''} ${(el as HTMLElement | null)?.getAttribute?.('aria-label') || ''} ${(el as HTMLElement | null)?.getAttribute?.('title') || ''}`,
  );
  const clickFirst = (terms: string[], root: ParentNode = document) => {
    const nodes = Array.from(root.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
      .filter((el) => isVisible(el) && terms.some(term => textOf(el).toLowerCase().includes(term)));
    const target = nodes[0] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView?.({ block: 'center', inline: 'center' });
      for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
      target.click();
      return true;
    }
    return false;
  };
  const findComposer = () => {
    const selectors = [
      'textarea',
      'div[role="textbox"][contenteditable="true"]',
      '[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      '[role="textbox"]',
    ];
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      const target = nodes.find((el) => {
        if (!isVisible(el)) return false;
        const selfDescriptor = [
          textOf(el),
          (el as HTMLElement).getAttribute?.('placeholder') || '',
          (el as HTMLElement).getAttribute?.('data-placeholder') || '',
          (el as HTMLElement).getAttribute?.('aria-label') || '',
          textOf(el.closest('section, aside, div')),
        ].join(' ');
        return /note|notes|add note|备注|输入备注文本|添加备注|添加有关|备注可见范围|reply|回复/i.test(selfDescriptor);
      });
      if (target) return target as HTMLElement;
    }
    return null;
  };

  return (async () => {
    const normalizedNote = normalize(note);
    if (!normalizedNote) return { error: 'note is required.' };

    let composer = findComposer();
    if (!composer) {
      clickFirst(['add note', 'note', 'notes', '备注', '添加备注', '添加有关']);
      await sleep(900);
      composer = findComposer();
    }
    if (!composer) {
      return { error: 'No visible Recruiter note editor was found on the current page.' };
    }

    composer.focus();
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      composer.value = normalizedNote;
    } else {
      composer.textContent = normalizedNote;
    }
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(250);

    const saved = clickFirst(['save note', 'save', 'done', 'add note', '保存备注', '保存', '完成', '添加备注', '添加']);
    if (!saved) {
      return { error: 'Note editor opened, but no save button was found.' };
    }

    await sleep(700);
    const profileUrl = normalize(
      (document.querySelector<HTMLAnchorElement>('a[href*="/in/"], a[href*="/talent/profile/"]')?.href || '')
      || window.location.href,
    );

    return {
      candidate_id: normalize(candidateId),
      note: normalizedNote,
      profile_url: profileUrl,
      status: 'saved',
      detail: `Saved recruiter note: ${normalizedNote}`,
      list_source: listSource,
    };
  })();
}

export async function ensureRecruiterSurface(page: IPage, targetUrl: string): Promise<SurfaceDetectionResult> {
  await page.goto(targetUrl);
  await page.wait({ time: 2 });
  return detectRecruiterSurface(page);
}

export async function detectRecruiterSurface(page: IPage): Promise<SurfaceDetectionResult> {
  const surface = await page.evaluate(buildPageEval(detectLinkedinSurfaceInPage));
  if (surface.loginRequired) {
    throw new AuthRequiredError('linkedin.com', 'LinkedIn Recruiter requires an active signed-in browser session');
  }
  if (!surface.recruiterDetected) {
    throw new CommandExecutionError(
      'LinkedIn Recruiter surface not detected',
      'Open LinkedIn Recruiter in Chrome and make sure your account has Recruiter access.',
    );
  }
  return surface;
}

export async function primeRecruiterSearchHitsCapture(page: IPage): Promise<void> {
  if (!page.cdp) return;
  try {
    await page.cdp('Page.addScriptToEvaluateOnNewDocument', {
      source: `(${generateInterceptorJs(JSON.stringify('talentRecruiterSearchHits'), {
        arrayName: '__opencli_xhr',
        patchGuard: '__opencli_interceptor_patched',
      })})()`,
    });
  } catch {
    // Best effort only. We still have page.installInterceptor as a fallback.
  }
}

export async function ensureLinkedinSession(page: IPage, targetUrl: string): Promise<SurfaceDetectionResult> {
  await page.goto(targetUrl);
  await page.wait({ time: 2 });
  const surface = await page.evaluate(buildPageEval(detectLinkedinSurfaceInPage));
  if (surface.loginRequired) {
    throw new AuthRequiredError('linkedin.com', 'LinkedIn requires an active signed-in browser session');
  }
  return surface;
}

export async function ensureLinkedinProfilePage(page: IPage, targetUrl: string): Promise<SurfaceDetectionResult> {
  const surface = await ensureLinkedinSession(page, targetUrl);
  const currentUrl = await page.getCurrentUrl?.().catch(() => null) || surface.currentUrl;
  if (isLinkedinProfileUrl(currentUrl)) return surface;

  await page.wait({ time: 1 });
  const retriedUrl = await page.getCurrentUrl?.().catch(() => null) || currentUrl;
  if (isLinkedinProfileUrl(retriedUrl)) return surface;

  throw new CommandExecutionError(
    'LinkedIn profile page did not open',
    'Open the target candidate profile in Chrome and verify Recruiter can access it before retrying.',
  );
}

export async function adoptLinkedinTab(
  page: IPage,
  targetUrl: string,
  fallbackPatterns: string[] = [],
): Promise<boolean> {
  const pageWorkspace = String((page as any).workspace || 'default');
  try {
    const discovered = await sendCommand('tabs', { op: 'list', workspace: pageWorkspace });
    const tabs = Array.isArray(discovered) ? discovered as BrowserTabMatch[] : [];
    let preferred = chooseMatchingLinkedinTab(tabs, targetUrl, fallbackPatterns);

    if (!preferred?.tabId) {
      const externalMatches = await sendCommand('tabs', {
        op: 'find',
        urlContains: targetUrl,
        activeOnly: false,
      });
      const externalTabs = Array.isArray(externalMatches) ? externalMatches as BrowserTabMatch[] : [];
      preferred = chooseMatchingLinkedinTab(externalTabs, targetUrl, fallbackPatterns);
    }

    if (!preferred?.tabId) {
      for (const pattern of fallbackPatterns) {
        const externalMatches = await sendCommand('tabs', {
          op: 'find',
          urlContains: pattern,
          activeOnly: false,
        });
        const externalTabs = Array.isArray(externalMatches) ? externalMatches as BrowserTabMatch[] : [];
        preferred = chooseMatchingLinkedinTab(externalTabs, targetUrl, fallbackPatterns);
        if (preferred?.tabId) break;
      }
    }

    if (!preferred?.tabId) {
      const sessions = await sendCommand('sessions');
      const workspaces = Array.isArray(sessions)
        ? (sessions as BrowserSessionInfo[])
          .map((session) => String(session.workspace || ''))
          .filter(Boolean)
          .filter((name, index, names) => names.indexOf(name) === index)
        : [];

      for (const candidateWorkspace of workspaces) {
        if (candidateWorkspace === pageWorkspace) continue;
        const candidateTabsRaw = await sendCommand('tabs', { op: 'list', workspace: candidateWorkspace });
        const candidateTabs = Array.isArray(candidateTabsRaw) ? candidateTabsRaw as BrowserTabMatch[] : [];
        const candidate = chooseMatchingLinkedinTab(candidateTabs, targetUrl, fallbackPatterns);
        if (candidate?.tabId) {
          preferred = candidate;
          break;
        }
      }
    }

    if (!preferred?.tabId) return false;

    await sendCommand('tabs', {
      op: 'adopt',
      workspace: pageWorkspace,
      tabId: preferred.tabId,
    });
    (page as any)._tabId = preferred.tabId;
    return true;
  } catch {
    return false;
  }
}

export async function trySeedRecruiterSearch(page: IPage, input: RecruiterPeopleSearchInput): Promise<void> {
  await page.evaluate(buildPageEval(seedRecruiterSearchInPage, input));
  await page.wait({ time: 1 });
}

export async function probeRecruiterSearchState(
  page: IPage,
  input: RecruiterPeopleSearchInput,
): Promise<RecruiterSearchStateProbe> {
  const result = await page.evaluate(buildPageEval(inspectRecruiterSearchStateInPage, input));
  return result as RecruiterSearchStateProbe;
}

export async function collectRecruiterPeople(
  page: IPage,
  input: RecruiterPeopleSearchInput,
  listSource = 'search',
): Promise<RecruiterCandidateSummary[]> {
  let collected: RecruiterCandidateSummary[] = [];

  for (let i = 0; i < 6 && collected.length < input.limit + input.start; i++) {
    const batch = await page.evaluate(buildPageEval(extractRecruiterPeopleCardsInPage, listSource));
    collected = mergeCandidates(collected, Array.isArray(batch) ? batch : []);
    if (collected.length >= input.limit + input.start) break;
    await page.autoScroll({ times: 1, delayMs: 1200 });
    await page.wait({ time: 1 });
  }

  const filtered = applyVisibleFilters(collected, input);
  const sliced = filtered.slice(input.start, input.start + input.limit);
  if (sliced.length === 0) {
    throw new EmptyResultError(
      'linkedin people-search',
      'No visible recruiter candidates matched the current search. Open the Recruiter search page in Chrome and verify results are visible.',
    );
  }

  return sliced.map((candidate, index) => ({
    rank: input.start + index + 1,
    ...candidate,
  }));
}

export async function collectRecruiterPeopleViaCurrentSearchApis(
  page: IPage,
  input: RecruiterPeopleSearchInput,
  listSource = 'search',
  options?: { skipReseed?: boolean },
): Promise<RecruiterCandidateSummary[]> {
  try {
    await page.installInterceptor('talentRecruiterSearchHits');
  } catch {
    // Non-fatal: current-page interception is best-effort.
  }
  let collected: RecruiterCandidateSummary[] = [];
  const targetCount = input.start + input.limit;
  const needsMoreEnrichment = (items: RecruiterCandidateSummary[]) => items
    .slice(input.start, input.start + input.limit)
    .some(item => !(normalizeWhitespace(item.headline)
      || normalizeWhitespace(item.location)
      || normalizeWhitespace(item.current_company)
      || normalizeWhitespace(item.current_title)));

  for (let i = 0; i < 4; i++) {
    if (i > 0 && !options?.skipReseed) {
      try {
        await trySeedRecruiterSearch(page, input);
      } catch {
        // Keep going with any data we already have.
      }
    }
    const intercepted = await page.getInterceptedRequests().catch(() => []);
    const fromSearchHits = Array.isArray(intercepted)
      ? intercepted.flatMap((payload) => extractRecruiterPeopleFromSearchHitsPayload(payload, listSource))
      : [];
    collected = mergeCandidates(collected, fromSearchHits);
    const batch = await page.evaluate(buildPageEval(extractRecruiterPeopleViaApisInPage, listSource));
    collected = mergeCandidates(collected, Array.isArray(batch) ? batch as RecruiterCandidateSummary[] : []);
    const filtered = applyVisibleFilters(collected, input);
    const usable = filtered.length > 0 ? filtered : collected;
    const sliced = usable.slice(input.start, input.start + input.limit);
    if (sliced.length >= input.limit && !needsMoreEnrichment(usable)) {
      return sliced.map((candidate, index) => ({
        rank: input.start + index + 1,
        ...candidate,
      }));
    }
    if (usable.length >= targetCount && i >= 2 && !needsMoreEnrichment(usable)) break;
    await page.autoScroll({ times: 1, delayMs: 1200 });
    await page.wait({ time: 1 });
  }

  const filtered = applyVisibleFilters(collected, input);
  const usable = filtered.length > 0 ? filtered : collected;
  const sliced = usable.slice(input.start, input.start + input.limit);
  if (sliced.length > 0) {
    return sliced.map((candidate, index) => ({
      rank: input.start + index + 1,
      ...candidate,
    }));
  }
  return collectRecruiterPeople(page, input, listSource);
}

export async function extractRecruiterProfile(
  page: IPage,
  candidateId: string,
  listSource = 'profile',
): Promise<RecruiterCandidateProfile> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const profile = await page.evaluate(buildPageEval(extractRecruiterProfileInPage, candidateId, listSource));
    const name = normalizeWhitespace(profile?.name);
    const hasMeaningfulDetails = Boolean(
      normalizeWhitespace(profile?.headline)
      || normalizeWhitespace(profile?.about)
      || normalizeWhitespace(profile?.current_title)
      || normalizeWhitespace(profile?.work_history),
    );
    if (profile && name && !/^(?:loading|正在加载)$/i.test(name) && hasMeaningfulDetails) {
      return profile as RecruiterCandidateProfile;
    }
    if (attempt < 3) await page.wait({ time: 2 });
  }
  throw new EmptyResultError(
    'linkedin profile',
    'No profile data was found on the current page. Open a recruiter candidate profile or public LinkedIn profile in Chrome and try again.',
  );
}

export async function openRecruiterProfileFromCurrentPage(
  page: IPage,
  candidateId: string,
  profileUrl: string,
): Promise<boolean> {
  const result = await page.evaluate(buildPageEval(openRecruiterProfileFromCurrentPageInPage, candidateId, profileUrl));
  if (result?.opened) {
    await page.wait({ time: 5 });
    return true;
  }
  return false;
}

export async function collectRecruiterProjects(page: IPage): Promise<RecruiterProjectSummary[]> {
  const items = await page.evaluate(buildPageEval(extractRecruiterProjectsInPage));
  if (!Array.isArray(items) || items.length === 0) {
    throw new EmptyResultError(
      'linkedin recruiter-project-list',
      'No Recruiter projects were visible. Open the Projects page in LinkedIn Recruiter and try again.',
    );
  }
  return items.map((item, index) => ({ rank: index + 1, ...(item as RecruiterProjectSummary) }));
}

export async function collectRecruiterSavedSearches(page: IPage): Promise<RecruiterSavedSearchSummary[]> {
  const items = await page.evaluate(buildPageEval(extractRecruiterSavedSearchesInPage));
  if (!Array.isArray(items) || items.length === 0) {
    throw new EmptyResultError(
      'linkedin recruiter-saved-searches',
      'No saved searches were visible. Open the LinkedIn Recruiter saved searches page and try again.',
    );
  }
  return items.map((item, index) => ({ rank: index + 1, ...(item as RecruiterSavedSearchSummary) }));
}

export async function collectRecruiterInboxThreads(
  page: IPage,
  limit: number,
  start = 0,
  listSource = 'inbox',
): Promise<RecruiterInboxThreadSummary[]> {
  let collected: RecruiterInboxThreadSummary[] = [];

  for (let round = 0; round < 6; round += 1) {
    const batch = await page.evaluate(buildPageEval(extractRecruiterInboxThreadsInPage, listSource));
    collected = mergeInboxThreads(collected, Array.isArray(batch) ? batch : []);
    if (collected.length >= start + limit) break;
    await page.autoScroll({ times: 1, delayMs: 1200 });
    await page.wait({ time: 1 });
  }

  const sliced = collected.slice(start, start + limit);
  if (sliced.length === 0) {
    throw new EmptyResultError(
      'linkedin inbox-list',
      'No LinkedIn Recruiter inbox conversations were visible. Open the Recruiter messages page in Chrome and make sure the conversation list is visible.',
    );
  }

  const enriched = await page.evaluate(buildPageEval(enrichRecruiterInboxThreadIdentitiesInPage, sliced));
  const enrichedMap = new Map<string, RecruiterInboxThreadSummary>();
  for (const item of Array.isArray(enriched) ? enriched as RecruiterInboxThreadSummary[] : []) {
    const key = normalizeWhitespace(item.conversation_id || item.candidate_id || item.profile_url);
    if (key) enrichedMap.set(key, item);
  }
  let normalized = sliced.map((thread) => {
    const key = normalizeWhitespace(thread.conversation_id || thread.candidate_id || thread.profile_url);
    const next = key ? enrichedMap.get(key) : undefined;
    const canApplyNext = !next
      || !normalizeWhitespace(thread.name)
      || !normalizeWhitespace(next.name)
      || namesLookCompatible(thread.name, next.name);
    return {
      ...thread,
      ...(canApplyNext ? (next || {}) : {}),
    };
  }).map((thread) => {
    const profileUrl = decodeLinkedinRedirect(thread.profile_url);
    const candidateId = normalizeWhitespace(thread.candidate_id) || candidateIdFromArtifacts(profileUrl, '');
    return {
      ...thread,
      candidate_id: candidateId,
      profile_url: profileUrl,
    };
  });

  for (let index = 0; index < normalized.length; index += 1) {
    const thread = normalized[index];
    if (thread.profile_url || thread.candidate_id || !thread.conversation_id) continue;
    await page.goto(buildRecruiterInboxThreadUrl(thread.conversation_id), { settleMs: 1200 });
    await page.wait({ time: 1 });
    const identity = await page.evaluate(buildPageEval(
      extractRecruiterInboxThreadIdentityInPage,
      thread.conversation_id,
      thread.list_source || listSource,
    )) as RecruiterInboxThreadSummary | { error: string } | null;
    if (!identity || (identity as { error?: string }).error) continue;
    const next = identity as RecruiterInboxThreadSummary;
    if (
      normalizeWhitespace(thread.name)
      && normalizeWhitespace(next.name)
      && !namesLookCompatible(thread.name, next.name)
    ) {
      continue;
    }
    const profileUrl = decodeLinkedinRedirect(next.profile_url);
    normalized[index] = {
      ...thread,
      ...next,
      candidate_id: normalizeWhitespace(next.candidate_id) || candidateIdFromArtifacts(profileUrl, ''),
      profile_url: profileUrl,
      name: normalizeWhitespace(next.name) || thread.name,
    };
  }

  return normalized.map((thread, index) => ({
    rank: start + index + 1,
    ...thread,
  }));
}

export async function readRecruiterInboxMessages(
  page: IPage,
  input: { conversationId?: string; candidateId?: string; profileUrl?: string; limit: number },
  listSource = 'inbox',
): Promise<RecruiterInboxMessage[]> {
  const result = await page.evaluate(buildPageEval(
    readRecruiterConversationMessagesInPage,
    input.conversationId || '',
    input.candidateId || '',
    input.profileUrl || '',
    input.limit,
    listSource,
  ));
  if (!Array.isArray(result) || result.length === 0) {
    throw new EmptyResultError(
      'linkedin inbox-msg',
      result?.error || 'No visible messages were found in the selected LinkedIn Recruiter conversation.',
    );
  }
  return result.map((item, index) => ({
    rank: index + 1,
    ...(item as RecruiterInboxMessage),
  }));
}

export async function replyRecruiterInboxConversation(
  page: IPage,
  input: { conversationId?: string; candidateId?: string; profileUrl?: string; text: string },
  listSource = 'inbox-reply',
): Promise<RecruiterInboxReplyResult> {
  const result = await page.evaluate(buildPageEval(
    replyRecruiterConversationInPage,
    input.conversationId || '',
    input.candidateId || '',
    input.profileUrl || '',
    input.text,
    listSource,
  ));
  if (!result || result.error) {
    throw new CommandExecutionError(
      result?.error || 'Could not send a reply from the selected LinkedIn Recruiter conversation',
      'Open the target Recruiter conversation in Chrome and make sure the reply composer is visible.',
    );
  }
  return normalizeRecruiterInboxReplyResult(result as RecruiterInboxReplyResult);
}

export async function sendRecruiterMessage(
  page: IPage,
  candidateId: string,
  text: string,
  listSource = 'profile',
): Promise<RecruiterMessageResult> {
  const result = await page.evaluate(buildPageEval(sendRecruiterMessageInPage, text, candidateId, listSource));
  if (!result || result.error) {
    throw new CommandExecutionError(
      result?.error || 'Could not send a LinkedIn Recruiter message from the current page',
      'Open a candidate profile in LinkedIn Recruiter and make sure the Message/InMail composer is available.',
    );
  }
  return result as RecruiterMessageResult;
}

export async function saveRecruiterCandidateToProject(
  page: IPage,
  candidateId: string,
  projectId: string,
  listSource = 'profile',
): Promise<RecruiterSaveToProjectResult> {
  const currentUrl = await page.getCurrentUrl?.().catch(() => null) || '';
  const recruiterToken = extractRecruiterProfileToken(currentUrl);
  if (recruiterToken && !/rightRail=saveToProject/i.test(currentUrl)) {
    await page.goto(`https://www.linkedin.com/talent/profile/${encodeURIComponent(recruiterToken)}?rightRail=saveToProject`, {
      settleMs: 1500,
    });
    await page.wait({ time: 1 });
  }
  let result = await page.evaluate(buildPageEval(saveCandidateToProjectInPageV2, projectId, candidateId, listSource));
  if (result?.error && /project chooser/i.test(String(result.error)) && page.nativeType) {
    const focused = await page.evaluate(`(() => {
      const normalize = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect?.();
        const style = window.getComputedStyle(el);
        return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
      };
      const textOf = (el) => normalize(
        \`\${el?.innerText || ''} \${el?.getAttribute?.('aria-label') || ''} \${el?.getAttribute?.('title') || ''}\`,
      );
      const activate = (target) => {
        if (!target) return false;
        target.scrollIntoView?.({ block: 'center', inline: 'center' });
        for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
          target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        }
        target.click?.();
        return true;
      };
      const panel = Array.from(document.querySelectorAll('[role="dialog"], .artdeco-modal, aside, section'))
        .find((el) => isVisible(el) && /new project|project name|existing project|select existing project|新建项目|项目名称|选择现有项目|收藏/i.test(textOf(el)));
      if (!panel) return false;
      const existingToggle = Array.from(panel.querySelectorAll('label, button, span, div, [role="button"], [role="tab"], [role="radio"], input[type="radio"]'))
        .find((node) => {
          const el = node;
          const label = \`\${textOf(el)} \${textOf(el.closest('label'))}\`;
          return /select existing project|existing project|选择现有项目/i.test(label)
            && isVisible((el.closest('label, button, [role="button"], [role="tab"], [role="radio"]') || el));
        });
      if (existingToggle) {
        activate(existingToggle.closest('label, button, [role="button"], [role="tab"], [role="radio"]') || existingToggle);
      }
      const input = Array.from(panel.querySelectorAll('input, textarea'))
        .find((node) => {
          const el = node;
          const descriptor = [
            textOf(el),
            el.getAttribute('placeholder') || '',
            el.getAttribute('aria-label') || '',
            el.getAttribute('name') || '',
            el.getAttribute('id') || '',
            textOf(el.closest('label')),
            textOf(el.parentElement),
          ].join(' ');
          return isVisible(el) && /search|find|project|existing project|选择现有项目|项目|项目名称|save-to-projects-typeahead/i.test(descriptor);
        });
      if (!input) return false;
      const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      input.focus();
      descriptor?.set?.call(input, '');
      if (!descriptor?.set) input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return document.activeElement === input;
    })()`);
    if (focused) {
      await page.nativeType(projectId);
      await page.wait({ time: 1.2 });
      const interactiveResult = await page.evaluate(`(async () => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const normalize = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
        const normRef = normalize(${JSON.stringify(projectId)}).toLowerCase();
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect?.();
          const style = window.getComputedStyle(el);
          return Boolean(rect && rect.width >= 0 && rect.height >= 0 && style.visibility !== 'hidden' && style.display !== 'none');
        };
        const textOf = (el) => normalize(
          \`\${el?.innerText || ''} \${el?.textContent || ''} \${el?.getAttribute?.('aria-label') || ''} \${el?.getAttribute?.('title') || ''}\`,
        );
        const activate = (target) => {
          if (!target) return false;
          target.scrollIntoView?.({ block: 'center', inline: 'center' });
          for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
            target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
          }
          target.click?.();
          return true;
        };
        const optionSelectors = [
          'li.artdeco-typeahead__result',
          '.artdeco-typeahead__result',
          '.basic-typeahead__selectable',
          '.basic-typeahead__result',
          '[role="option"]',
          '[role="listbox"] > *',
          '[class*="typeahead"] li',
          '[class*="typeahead"] [role="option"]',
          '[id*="typeahead"] li',
          '[id*="typeahead"] [role="option"]',
          '[data-project-id]',
          '[data-id]',
          'label',
          'li',
          'a',
          'button',
          'div',
          'span',
        ];
        const candidates = Array.from(document.querySelectorAll(optionSelectors.join(',')))
          .filter((el) => isVisible(el))
          .map((el) => {
            const text = textOf(el);
            const datasetBits = [
              el.getAttribute?.('data-project-id') || '',
              el.getAttribute?.('data-id') || '',
              el.getAttribute?.('value') || '',
              text,
            ].join(' ').toLowerCase();
            return { el, text, datasetBits };
          })
          .filter((item) => item.datasetBits && item.datasetBits.includes(normRef))
          .filter((item) => item.text.length > 0 && item.text.length < 300);
        const option = candidates[0];
        if (!option) return null;
        activate(option.el.closest('li, label, button, [role="option"], a, div, span') || option.el);
        await sleep(400);
        const confirmTerms = /保存|收藏/.test(document.body.innerText || '')
          ? ['save', 'add', 'done', 'confirm', '收藏', '保存', '添加', '完成', '确认']
          : ['save', 'add', 'done', 'confirm'];
        const buttons = Array.from(document.querySelectorAll('button, a[role="button"], [role="button"], span[role="button"]'))
          .filter((el) => isVisible(el));
        const confirm = buttons.find((el) => confirmTerms.some((term) => textOf(el).toLowerCase().includes(term.toLowerCase())));
        if (confirm) {
          activate(confirm);
          await sleep(800);
        }
        const profileUrl = normalize(
          document.querySelector('a[href*="/in/"], a[href*="/talent/profile/"]')?.href || window.location.href,
        );
        return {
          candidate_id: normalize(${JSON.stringify(candidateId)}),
          project_id: normalize(${JSON.stringify(projectId)}),
          project_name: option.text || normalize(${JSON.stringify(projectId)}),
          profile_url: profileUrl,
          status: 'saved',
          detail: \`Saved candidate to project \${option.text || normalize(${JSON.stringify(projectId)})}\`,
          list_source: normalize(${JSON.stringify(listSource)}),
        };
      })()`);
      if (interactiveResult) {
        result = interactiveResult;
      }
    }
  }
  if (!result || result.error) {
    throw new CommandExecutionError(
      result?.error || 'Could not save the current candidate to a LinkedIn Recruiter project',
      'Open a candidate profile in LinkedIn Recruiter and verify the project chooser is available for your account.',
    );
  }
  return result as RecruiterSaveToProjectResult;
}

export async function addRecruiterTag(
  page: IPage,
  candidateId: string,
  tag: string,
  listSource = 'profile',
): Promise<RecruiterTagResult> {
  const result = await page.evaluate(buildPageEval(addRecruiterTagInPage, tag, candidateId, listSource));
  if (!result || result.error) {
    throw new CommandExecutionError(
      result?.error || 'Could not tag the current LinkedIn Recruiter candidate',
      'Open a candidate profile in LinkedIn Recruiter and verify the tag or label chooser is available.',
    );
  }
  return result as RecruiterTagResult;
}

export async function addRecruiterNote(
  page: IPage,
  candidateId: string,
  note: string,
  listSource = 'profile',
): Promise<RecruiterNoteResult> {
  const result = await page.evaluate(buildPageEval(addRecruiterNoteInPage, note, candidateId, listSource));
  if (!result || result.error) {
    throw new CommandExecutionError(
      result?.error || 'Could not save a LinkedIn Recruiter note on the current page',
      'Open a candidate profile in LinkedIn Recruiter and verify the note editor is available.',
    );
  }
  return result as RecruiterNoteResult;
}

export const __test__ = {
  normalizeWhitespace,
  parseCsvArg,
  toYesNo,
  looksLikeRecruiterNoteReplySurface,
  looksLikeRecruiterReplyComposer,
  queriesLookCompatible,
  namesLookCompatible,
  canonicalizeLinkedinUrl,
  decodeLinkedinRedirect,
  candidateIdFromProfileUrl,
  decodeCandidateId,
  candidateIdFromArtifacts,
  normalizeRecruiterInboxReplyResult,
  resolveRecruiterProfileUrl,
  isLinkedinProfileUrl,
  buildRecruiterProjectUrl,
  buildRecruiterProjectMembersUrl,
  buildRecruiterSavedSearchesUrl,
  extractRecruiterProjectId,
  extractRecruiterProfileToken,
  buildRecruiterInboxUrl,
  buildRecruiterInboxThreadUrl,
  buildRecruiterProfileMessagesUrl,
  buildRecruiterSearchUrl,
  summarizeSignals,
  formatNetworkDistance,
  firstCurrentWorkExperience,
  extractRecruiterPeopleFromSearchHitsPayload,
  mergeCandidates,
  mergeInboxThreads,
  summarizeRecruiterPeopleStats,
  summarizeRecruiterInboxStats,
  buildRecruiterFollowUpQueue,
  toRecruiterFollowUpTemplateContext,
  renderRecruiterFollowUpTemplate,
  getRecruiterFollowUpFieldValue,
  presetRecruiterFollowUpExportFields,
  normalizeRecruiterFollowUpFieldMappings,
  exportRecruiterFollowUpQueue,
  applyVisibleFilters,
  listToMultiline,
  describeRecruiterProjectChooserBlocker,
};
