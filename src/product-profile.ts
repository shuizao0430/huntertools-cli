export const ENABLE_RECRUITING_ONLY_MODE = true;

export const ACTIVE_SITE_ALLOWLIST = new Set<string>([
  'linkedin',
]);

export const ACTIVE_BUILTIN_COMMANDS = [
  'list',
  'operate',
  'doctor',
  'daemon',
  'completion',
] as const;

export function isActiveSite(site: string): boolean {
  if (!ENABLE_RECRUITING_ONLY_MODE) return true;
  return ACTIVE_SITE_ALLOWLIST.has(site);
}
