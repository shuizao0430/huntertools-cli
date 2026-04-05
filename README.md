# HunterToolsCLI

Recruiter-first browser automation for LinkedIn and LinkedIn Recruiter.

HunterToolsCLI is an independent recruiting operations CLI focused on four loops:

- source candidates from LinkedIn Recruiter
- read and enrich candidate context
- send outreach and handle inbox follow-up
- prioritize and export live recruiting queues

Use `huntertools ...` as the primary command. The legacy `opencli ...` alias still works during migration.

## Why HunterToolsCLI

- Recruiting-focused surface: only recruiting workflows remain publicly exposed
- Live browser workflows: built for real Chrome sessions, not static API mocks
- Recruiter depth: supports sourcing, profile read, messaging, inbox handling, queueing, and export
- Operations-friendly output: queue and export commands are designed for ATS and spreadsheet handoff

## Supported Workflow

1. Find candidates with `people-search`
2. Read the candidate with `profile`
3. Send outreach with `message` or `batch-message`
4. Review threads with `inbox-list` and `inbox-msg`
5. Continue follow-up with `inbox-reply`, `batch-reply`, or `follow-up-batch-reply`
6. Prioritize work with `stats` and `follow-up-queue`
7. Export downstream actions with `export-follow-up`

## Install

```bash
npm install -g huntertoolscli
```

## Quick Start

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
huntertools linkedin profile --profile-url "https://www.linkedin.com/talent/profile/..."
huntertools linkedin follow-up-queue --limit 5 --inbox-limit 10 -f json
```

## Command Surface

Top-level built-ins:

- `huntertools list`
- `huntertools operate`
- `huntertools doctor`
- `huntertools daemon`
- `huntertools completion`

LinkedIn workflows:

- `search`
- `timeline`
- `people-search`
- `profile`
- `recruiter-project-list`
- `recruiter-project-members`
- `recruiter-saved-searches`
- `message`
- `save-to-project`
- `tag`
- `notes`
- `batch-message`
- `inbox-list`
- `inbox-msg`
- `inbox-reply`
- `batch-reply`
- `stats`
- `follow-up-queue`
- `follow-up-batch-reply`
- `export-follow-up`

## Browser Requirements

- Chrome must be running
- You must already be logged into `linkedin.com`
- Recruiter workflows require an active LinkedIn Recruiter session
- The Browser Bridge extension must be installed

## First Release

The first independent HunterToolsCLI release is summarized in [RELEASE-v1.6.1.md](./RELEASE-v1.6.1.md).

Highlights:

- renamed and split out from the broader OpenCLI codebase
- narrowed the product surface to recruiting-only workflows
- kept live-tested LinkedIn and LinkedIn Recruiter commands
- preserved compatibility where needed for runtime and extension flows

## Documentation

- English docs: [docs](./docs)
- Chinese docs: [README.zh-CN.md](./README.zh-CN.md)
- Getting started: [docs/guide/getting-started.md](./docs/guide/getting-started.md)
- LinkedIn adapter reference: [docs/adapters/browser/linkedin.md](./docs/adapters/browser/linkedin.md)

## Development

```bash
npm install
npm run build
node dist/main.js list
```

## License

[Apache-2.0](./LICENSE)
