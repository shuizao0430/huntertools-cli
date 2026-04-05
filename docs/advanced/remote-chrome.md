# Remote Chrome

You can run HunterToolsCLI against a remote Chrome instance as long as that browser exposes a reachable CDP endpoint.

## Example

On the machine running Chrome:

```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/huntertools-remote-profile
```

On the machine running HunterToolsCLI:

```bash
export HUNTERTOOLS_CDP_ENDPOINT="http://remote-host:9222"
huntertools doctor
huntertools linkedin timeline --limit 3
```

Legacy compatibility:

- `OPENCLI_CDP_ENDPOINT` still works

## Recommended Use

Use this mode only when the Browser Bridge extension cannot be used. For daily recruiting work on a local machine, the extension path is more reliable.
