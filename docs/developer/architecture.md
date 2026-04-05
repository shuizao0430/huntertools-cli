# Architecture

HunterToolsCLI is now a recruiter-first browser automation CLI.

## Core Layers

1. CLI and command registration
2. Browser connection layer
3. LinkedIn and Recruiter adapters
4. Shared identity and extraction utilities

## Runtime Model

- Primary command: `huntertools`
- Legacy alias: `opencli`
- Primary runtime directory: `~/.huntertools`
- Legacy runtime directory still supported: `~/.opencli`

## Browser Connection Paths

- Default: Browser Bridge extension plus local daemon
- Fallback: direct CDP connection

## Recruiter Workflow Model

The recruiter workflow is centered on reusable identities:

- `candidate_id`
- `profile_url`
- `project_id`
- `conversation_id`

Those identities flow across:

- people search
- profile read
- project membership
- messaging
- inbox operations
- follow-up queueing
- exports
