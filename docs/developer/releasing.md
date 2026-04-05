# Releasing

This page is the operator checklist for cutting a HunterToolsCLI release tag and publishing a GitHub Release.

## Scope

Use this checklist when you are preparing:

- the first public release of the standalone repository
- a normal patch or minor release
- a follow-up release after LinkedIn or Recruiter workflow fixes

## Preconditions

Before creating a release tag, make sure:

- `main` contains the commits you want to ship
- GitHub Actions CI is green on `main`
- `package.json` has the target version
- npm publish credentials are configured in GitHub as `NPM_TOKEN`
- the release workflow in [.github/workflows/release.yml](../../.github/workflows/release.yml) is still correct for this repository

## Local Validation

Run the checks that are most relevant to the release:

```bash
npm install
npm run build
npm test
npm run test:adapter
npm run docs:build
```

For a recruiting-surface release, also sanity-check the shipped command surface:

```bash
node dist/main.js list
huntertools --version
```

## Release Notes Inputs

Prepare these before tagging:

- release title, for example `HunterToolsCLI v1.6.1`
- short summary of what changed
- highlight bullets for sourcing, outreach, inbox, queue, or export changes
- migration notes if command names, runtime paths, or compatibility behavior changed

For the first independent release, start from [RELEASE-v1.6.1.md](https://github.com/shuizao0430/huntertools-cli/blob/main/RELEASE-v1.6.1.md).

## Tagging

Create and push the version tag from `main`:

```bash
git checkout main
git pull
git tag v1.6.1
git push origin v1.6.1
```

Pushing the tag triggers the GitHub release workflow.

## GitHub Release Checklist

After the workflow starts:

1. Confirm the `Release` workflow triggered for the tag
2. Confirm the GitHub Release was created
3. Review generated release notes and replace or augment them with the prepared summary if needed
4. Confirm npm publish succeeded
5. Confirm the release page contains the expected version and notes

## First Release Checklist

For the first independent HunterToolsCLI release, confirm all of these:

- repository URL points to `shuizao0430/huntertools-cli`
- README first screen matches the new product direction
- [RELEASE-v1.6.1.md](https://github.com/shuizao0430/huntertools-cli/blob/main/RELEASE-v1.6.1.md) is current
- Browser Bridge install docs point to this repository's Releases page
- the release workflow no longer references the old OpenCLI website repository

## Post-Release Checks

After publish completes:

- verify `npm view huntertoolscli version`
- verify the GitHub Releases page shows the new tag
- verify README install instructions still match the published package name
- optionally create a follow-up issue for any manual cleanup found during release

## Suggested First Release Body

Use this structure on the GitHub Release page:

- one-sentence summary
- highlights
- included command surface
- install command
- migration note about `huntertools` vs `opencli`
