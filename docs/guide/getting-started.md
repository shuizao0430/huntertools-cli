# Getting Started

HunterToolsCLI is a recruiter-first CLI built around LinkedIn and LinkedIn Recruiter workflows.

## Install

```bash
npm install -g huntertoolscli
```

## What The Product Includes

- LinkedIn public read commands such as `search` and `timeline`
- LinkedIn Recruiter commands for sourcing, profile read, outreach, inbox handling, prioritization, and export
- Browser Bridge utilities required to run those workflows: `operate`, `doctor`, `daemon`, and `completion`

## Quick Start

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
huntertools linkedin follow-up-queue --limit 5 --inbox-limit 10
```

## Browser Requirements

- Chrome must be running
- You must already be logged into `linkedin.com`
- Recruiter commands require an active LinkedIn Recruiter session
- The Browser Bridge extension must be installed

## Completion

```bash
echo 'eval "$(huntertools completion zsh)"' >> ~/.zshrc
echo 'eval "$(huntertools completion bash)"' >> ~/.bashrc
echo 'huntertools completion fish | source' >> ~/.config/fish/config.fish
```

## Next Steps

- [Installation details](/guide/installation)
- [Browser Bridge setup](/guide/browser-bridge)
- [Troubleshooting](/guide/troubleshooting)
- [LinkedIn adapter reference](/adapters/browser/linkedin)
