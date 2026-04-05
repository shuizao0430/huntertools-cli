# HunterToolsCLI v1.6.1

Initial independent release of HunterToolsCLI.

## Summary

This release turns the project into a standalone recruiting operations CLI focused on LinkedIn and LinkedIn Recruiter workflows.

HunterToolsCLI now centers on:

- candidate sourcing
- profile reading
- single and batch outreach
- inbox review and reply workflows
- follow-up prioritization
- ATS and spreadsheet export

## Highlights

- Rebranded the product surface from OpenCLI to HunterToolsCLI
- Split the codebase into a new standalone repository
- Slimmed the exposed command surface to recruiting-focused workflows
- Preserved Browser Bridge, daemon, doctor, and completion support
- Kept compatibility aliases where they reduce migration friction

## Included LinkedIn Commands

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

## Validation Notes

- The current recruiting surface was production-validated against real LinkedIn and LinkedIn Recruiter sessions
- Browser Bridge, Recruiter discovery, outreach, inbox, queue, and export flows were all exercised on live pages
- `people-search` remains the most change-sensitive command because LinkedIn Recruiter changes often

## Install

```bash
npm install -g huntertoolscli
```

## Quick Start

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
```

## Migration Notes

- `huntertools` is the preferred command name
- `opencli` remains available as a compatibility alias during migration
- some low-level compatibility markers remain intentionally unchanged to avoid breaking extension and runtime flows
