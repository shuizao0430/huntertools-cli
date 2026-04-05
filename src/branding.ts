import * as path from 'node:path';

export const PRODUCT_NAME = 'HunterToolsCLI';
export const PRIMARY_CLI_NAME = 'huntertools';
export const LEGACY_CLI_NAME = 'opencli';
export const PRIMARY_PACKAGE_NAME = 'huntertoolscli';
export const LEGACY_PACKAGE_NAME = '@jackwener/opencli';
export const REPOSITORY_URL = 'https://github.com/shuizao0430/huntertools-cli';
export const ISSUES_URL = `${REPOSITORY_URL}/issues`;
export const RELEASES_URL = `${REPOSITORY_URL}/releases`;
export const EXTENSION_NAME = 'HunterTools Browser Bridge';
export const PRIMARY_RUNTIME_DIRNAME = '.huntertools';
export const LEGACY_RUNTIME_DIRNAME = '.opencli';
export const RUNTIME_DIRNAME = PRIMARY_RUNTIME_DIRNAME;

export function getInvokedCliName(argv = process.argv): string {
  const invoked = path.basename(argv[1] ?? '', path.extname(argv[1] ?? '')).toLowerCase();
  if (invoked === LEGACY_CLI_NAME || invoked === PRIMARY_CLI_NAME) {
    return invoked;
  }
  return PRIMARY_CLI_NAME;
}

export function formatPreferredCommand(subcommand: string): string {
  return `${PRIMARY_CLI_NAME} ${subcommand}`.trim();
}

export function formatLegacyCommand(subcommand: string): string {
  return `${LEGACY_CLI_NAME} ${subcommand}`.trim();
}

export function formatCompatCommandHint(subcommand: string): string {
  return `${formatPreferredCommand(subcommand)} (legacy: ${formatLegacyCommand(subcommand)})`;
}
