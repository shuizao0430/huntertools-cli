# HunterToolsCLI

Recruiter-first browser automation for LinkedIn and LinkedIn Recruiter.

This fork is being narrowed from the old OpenCLI shape into a focused recruiting operations tool. The supported public surface is now centered on:

- candidate sourcing
- profile reading
- single and batch outreach
- inbox follow-up
- recruiter queue prioritization
- ATS / spreadsheet export

Use `huntertools ...` as the primary command. The legacy `opencli ...` alias still works during migration.

## Install

```bash
npm install -g huntertoolscli
```

## Core Commands

Top-level built-ins:

- `huntertools list`
- `huntertools operate`
- `huntertools doctor`
- `huntertools daemon`
- `huntertools completion`

LinkedIn command group:

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

## Quick Start

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
huntertools linkedin follow-up-queue --limit 5 --inbox-limit 10
```

## Browser Requirements

- Chrome must be running
- You must already be logged into `linkedin.com`
- Recruiter workflows require an active LinkedIn Recruiter session
- The Browser Bridge extension must be installed

## Project Direction

Phase 1 completed the rename to HunterToolsCLI while keeping backward compatibility.

Phase 2 slimmed the runtime surface so only recruiting workflows remain publicly exposed.

Phase 3 is physically removing legacy non-recruiting adapters and old documentation from the repository.

## Documentation

- English docs: [docs](./docs)
- Chinese docs: [README.zh-CN.md](./README.zh-CN.md)
- LinkedIn adapter reference: [docs/adapters/browser/linkedin.md](./docs/adapters/browser/linkedin.md)

## Development

```bash
npm install
npm run build
node dist/main.js list
```

## License

[Apache-2.0](./LICENSE)
