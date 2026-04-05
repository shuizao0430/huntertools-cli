# Installation

## Requirements

- Node.js >= 20.0.0
- Chrome running with an active LinkedIn login
- LinkedIn Recruiter access for Recruiter commands

## Install via npm

```bash
npm install -g huntertoolscli
```

## Install from Source

```bash
git clone git@github.com:shuizao0430/huntertools-cli.git HunterToolsCLI
cd HunterToolsCLI
npm install
npm run build
npm link
huntertools list
```

## Update

```bash
npm install -g huntertoolscli@latest
```

## Verify Installation

```bash
huntertools --version
huntertools list
huntertools doctor
```
