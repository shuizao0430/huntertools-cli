# Troubleshooting

## Extension Not Connected

- Confirm the Browser Bridge extension is enabled in `chrome://extensions`
- Run `huntertools doctor`
- If needed, reload the extension and rerun the command

## Empty LinkedIn Or Recruiter Results

- Make sure the relevant LinkedIn page is already open in Chrome
- Refresh the tab and confirm you are still logged in
- For Recruiter commands, verify you are on a Recruiter seat that exposes the relevant surface

## Daemon Issues

```bash
huntertools daemon status
huntertools daemon stop
huntertools daemon restart
huntertools doctor
```

- Preferred timeout env var: `HUNTERTOOLS_DAEMON_TIMEOUT`
- Legacy timeout env var still supported: `OPENCLI_DAEMON_TIMEOUT`

## Remote Chrome / CDP Issues

If you are using a CDP endpoint instead of the extension:

```bash
echo $HUNTERTOOLS_CDP_ENDPOINT
huntertools doctor
```

- Preferred env var: `HUNTERTOOLS_CDP_ENDPOINT`
- Legacy env var still supported: `OPENCLI_CDP_ENDPOINT`

## Build Issues

```bash
npm run build
npm run docs:build
```

If docs build fails with `spawn EPERM`, rerun it in an environment that allows VitePress to spawn its esbuild subprocess.

## Getting Help

- [GitHub Issues](https://github.com/shuizao0430/huntertools-cli/issues)
- `huntertools doctor`
