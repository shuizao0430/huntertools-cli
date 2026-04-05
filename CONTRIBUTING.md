# Contributing to HunterToolsCLI

Thanks for your interest in contributing to HunterToolsCLI.

HunterToolsCLI is now a recruiter-first CLI focused on LinkedIn and LinkedIn Recruiter workflows. Contributions should strengthen that product direction rather than re-expand the repository into a general-purpose adapter collection.

## Quick Start

```bash
git clone git@github.com:<your-username>/huntertools-cli.git
cd huntertools-cli
npm install
npm run build
npm run docs:build
```

## Local CLI

```bash
npm link
huntertools --help
huntertools list
```

The legacy `opencli` alias still exists during migration, but new docs, examples, and validation steps should prefer `huntertools`.

## Primary Contribution Areas

- LinkedIn public read workflows such as `search` and `timeline`
- LinkedIn Recruiter flows such as `people-search`, `profile`, `message`, `inbox-*`, and `follow-up-*`
- Browser Bridge, daemon, and CDP stability
- Identity quality, parsing quality, and export quality
- Documentation and release hygiene for the standalone repository

## Development Checks

Run the checks that match your change:

```bash
npm run build
npm test
npm run test:adapter
npm run docs:build
```

For recruiter-surface changes, also sanity-check the live command surface:

```bash
node dist/main.js list
huntertools doctor
```

## Product Direction

When in doubt, optimize for:

- recruiting workflows over general web automation breadth
- stable live Chrome behavior over theoretical adapter coverage
- operational usefulness over one-off scraping features

## Release And Docs

- Release checklist: [docs/developer/releasing.md](./docs/developer/releasing.md)
- Developer contributing guide: [docs/developer/contributing.md](./docs/developer/contributing.md)
- Developer testing guide: [docs/developer/testing.md](./docs/developer/testing.md)

## License

By contributing, you agree that your contributions will be licensed under the [Apache-2.0 License](./LICENSE).
