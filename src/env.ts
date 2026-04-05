export function getCompatEnv(name: string): string | undefined {
  const primary = name.replace(/^OPENCLI_/, 'HUNTERTOOLS_');
  return process.env[primary] ?? process.env[name];
}
