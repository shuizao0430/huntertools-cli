# Testing

HunterToolsCLI testing is now centered on the recruiter workflow.

## Primary Checks

```bash
npm run build
npm test -- src/clis/linkedin/recruiter-utils.test.ts
```

## Live Validation

For production-style validation, use a real Chrome session with LinkedIn and Recruiter already logged in.

```bash
huntertools doctor
huntertools linkedin people-search "technical recruiter" --limit 3
```

## Recommended Coverage Areas

- Recruiter search parsing
- profile extraction
- inbox identity quality
- follow-up queue generation
- Browser Bridge and CDP stability

## Notes

- Use sandbox candidates and approved conversations for write-path validation
- Prefer `huntertools` in docs, scripts, and examples
- Legacy `opencli` compatibility still exists, but new tests should target HunterToolsCLI behavior
