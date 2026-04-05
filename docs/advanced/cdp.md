# Connecting HunterToolsCLI Via CDP

If you cannot use the Browser Bridge extension, HunterToolsCLI can connect directly to Chrome through CDP.

## When To Use CDP

- Remote desktop or remote server setups
- Headless Chrome environments
- Cases where the extension cannot be installed

## Configure The Endpoint

Preferred environment variable:

```bash
export HUNTERTOOLS_CDP_ENDPOINT="http://127.0.0.1:9222"
```

Legacy compatibility variable still supported:

```bash
export OPENCLI_CDP_ENDPOINT="http://127.0.0.1:9222"
```

Optional target preference:

```bash
export HUNTERTOOLS_CDP_TARGET="linkedin"
```

Legacy compatibility variable still supported:

```bash
export OPENCLI_CDP_TARGET="linkedin"
```

## Verify

```bash
huntertools doctor
huntertools linkedin timeline --limit 3
```

## Notes

- HunterToolsCLI will query `/json` on HTTP CDP endpoints and choose the most likely inspectable target
- The recruiter workflow is still the primary product surface; CDP is only an alternate transport
