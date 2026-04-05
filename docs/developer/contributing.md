# Contributing

This fork is now maintained as HunterToolsCLI, with LinkedIn and LinkedIn Recruiter as the primary supported product surface.

## Clone

```bash
git clone git@github.com:shuizao0430/huntertools-cli.git HunterToolsCLI
cd HunterToolsCLI
npm install
```

## Build

```bash
npm run build
npm run docs:build
```

## Local CLI

```bash
npm link
huntertools --help
```

The legacy `opencli` alias still exists during migration, but new docs and examples should use `huntertools`.

## What To Focus On

- LinkedIn public search and timeline
- LinkedIn Recruiter search, profile, inbox, and follow-up flows
- Browser Bridge and CDP stability
- Field quality and identity reuse
