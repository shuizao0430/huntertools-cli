# Browser Bridge Setup

> Important: browser commands reuse your logged-in Chrome session. Sign in to LinkedIn and LinkedIn Recruiter in Chrome before running HunterToolsCLI commands.

HunterToolsCLI connects to Chrome through a lightweight Browser Bridge extension plus a local daemon. For the recruiter workflow, this is the default connection path.

## Install The Extension

### Option 1: Load The Local `extension/` Folder

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the repository's `extension/` folder

### Option 2: Load A Release Build

1. Open the project's [Releases](https://github.com/shuizao0430/huntertools-cli/releases) page
2. Download the latest extension archive
3. Unzip it locally
4. Load it from `chrome://extensions`

## Verify Connectivity

```bash
huntertools doctor
```

If the extension is connected, HunterToolsCLI can reuse your existing Chrome tabs and Recruiter sessions.

## How It Works

```text
huntertools CLI <-> local daemon <-> Browser Bridge extension <-> Chrome tab
```

The daemon auto-starts when a browser command needs it. The extension runs inside Chrome and executes the requested page interactions against your already logged-in session.

## Daemon Lifecycle

```bash
huntertools daemon status
huntertools daemon stop
huntertools daemon restart
```

The daemon stays alive for 4 hours by default and exits when it has been idle and no extension is connected.

- Preferred env var: `HUNTERTOOLS_DAEMON_TIMEOUT`
- Legacy env var still supported: `OPENCLI_DAEMON_TIMEOUT`
- Value is in milliseconds
- Set `0` to disable idle timeout
