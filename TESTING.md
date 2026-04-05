# Testing Guide

HunterToolsCLI testing is now centered on LinkedIn and LinkedIn Recruiter workflows.

## Core Checks

Use these as the default release-quality baseline:

```bash
npm run build
npm test
npm run test:adapter
npm run docs:build
```

## Recruiter-Focused Checks

For changes to the recruiter workflow, prioritize:

- parsing and normalization in `recruiter-utils`
- people search and profile extraction
- inbox identity quality
- follow-up queue and export correctness
- Browser Bridge and CDP stability

Useful targeted commands:

```bash
npm test -- src/clis/linkedin/recruiter-utils.test.ts
npm test -- src/clis/linkedin/profile.test.ts
npm test -- src/clis/linkedin/inbox-reply.test.ts
```

## Live Validation

For production-style validation, use a real Chrome session with LinkedIn and LinkedIn Recruiter already logged in.

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --limit 3
```

For write-path validation:

- use sandbox candidates
- use approved conversations only
- prefer minimal messages and notes
- confirm page-visible success, not just CLI success

## Expected Product Surface

The public product surface should stay centered on:

- `linkedin search`
- `linkedin timeline`
- `linkedin people-search`
- `linkedin profile`
- recruiter project, inbox, queue, and export workflows
- built-in support commands such as `doctor`, `daemon`, `operate`, and `completion`

## References

- [docs/developer/testing.md](./docs/developer/testing.md)
- [docs/adapters/browser/linkedin.md](./docs/adapters/browser/linkedin.md)
- [docs/developer/releasing.md](./docs/developer/releasing.md)
