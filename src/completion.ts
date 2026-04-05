/**
 * Shell tab-completion support for HunterToolsCLI.
 *
 * Provides:
 *  - Shell script generators for bash, zsh, and fish
 *  - Dynamic completion logic that returns candidates for the current cursor position
 */

import { getRegistry } from './registry.js';
import { CliError } from './errors.js';
import { ACTIVE_BUILTIN_COMMANDS } from './product-profile.js';
import { PRIMARY_CLI_NAME } from './branding.js';

// ── Dynamic completion logic ───────────────────────────────────────────────

/**
 * Built-in (non-dynamic) top-level commands.
 */
const BUILTIN_COMMANDS: string[] = [...ACTIVE_BUILTIN_COMMANDS];

/**
 * Return completion candidates given the current command-line words and cursor index.
 *
 * @param words  - The argv after the CLI binary (words[0] is the first arg, e.g. site name)
 * @param cursor - 1-based position of the word being completed (1 = first arg)
 */
export function getCompletions(words: string[], cursor: number): string[] {
  // cursor === 1 → completing the first argument (site name or built-in command)
  if (cursor <= 1) {
    const sites = new Set<string>();
    for (const [, cmd] of getRegistry()) {
      sites.add(cmd.site);
    }
    return [...BUILTIN_COMMANDS, ...sites].sort();
  }

  const site = words[0];

  // If the first word is a built-in command, no further completion
  if (BUILTIN_COMMANDS.includes(site)) {
    return [];
  }

  // cursor === 2 → completing the sub-command name under a site
  if (cursor === 2) {
    const subcommands: string[] = [];
    for (const [, cmd] of getRegistry()) {
      if (cmd.site === site) {
        subcommands.push(cmd.name);
        if (cmd.aliases?.length) subcommands.push(...cmd.aliases);
      }
    }
    return [...new Set(subcommands)].sort();
  }

  // cursor >= 3 → no further completion
  return [];
}

// ── Shell script generators ────────────────────────────────────────────────

export function bashCompletionScript(): string {
  return `# Bash completion for ${PRIMARY_CLI_NAME}
# Add to ~/.bashrc:  eval "$(${PRIMARY_CLI_NAME} completion bash)"
_huntertools_completions() {
  local cur words cword
  _get_comp_words_by_ref -n : cur words cword

  local completions
  completions=$(${PRIMARY_CLI_NAME} --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)

  COMPREPLY=( $(compgen -W "$completions" -- "$cur") )
  __ltrim_colon_completions "$cur"
}
complete -F _huntertools_completions ${PRIMARY_CLI_NAME}
`;
}

export function zshCompletionScript(): string {
  return `# Zsh completion for ${PRIMARY_CLI_NAME}
# Add to ~/.zshrc:  eval "$(${PRIMARY_CLI_NAME} completion zsh)"
_huntertools() {
  local -a completions
  local cword=$((CURRENT - 1))
  completions=(\${(f)"$(${PRIMARY_CLI_NAME} --get-completions --cursor "$cword" "\${words[@]:1}" 2>/dev/null)"})
  compadd -a completions
}
compdef _huntertools ${PRIMARY_CLI_NAME}
`;
}

export function fishCompletionScript(): string {
  return `# Fish completion for ${PRIMARY_CLI_NAME}
# Add to ~/.config/fish/config.fish:  ${PRIMARY_CLI_NAME} completion fish | source
complete -c ${PRIMARY_CLI_NAME} -f -a '(
  set -l tokens (commandline -cop)
  set -l cursor (count (commandline -cop))
  ${PRIMARY_CLI_NAME} --get-completions --cursor $cursor $tokens[2..] 2>/dev/null
)'
`;
}

/**
 * Print the completion script for the requested shell.
 */
export function printCompletionScript(shell: string): void {
  switch (shell) {
    case 'bash':
      process.stdout.write(bashCompletionScript());
      break;
    case 'zsh':
      process.stdout.write(zshCompletionScript());
      break;
    case 'fish':
      process.stdout.write(fishCompletionScript());
      break;
    default:
      throw new CliError('UNSUPPORTED_SHELL', `Unsupported shell: ${shell}. Supported: bash, zsh, fish`);
  }
}
