# LinkedIn Recruiter

**Mode**: `Browser`  
**Domain**: `linkedin.com`

## Commands

| Command | Description |
|---------|-------------|
| `huntertools linkedin search` | Search public LinkedIn job listings |
| `huntertools linkedin timeline` | Read posts from the logged-in LinkedIn feed |
| `huntertools linkedin people-search` | Search LinkedIn Recruiter candidates |
| `huntertools linkedin profile` | Read a Recruiter candidate profile |
| `huntertools linkedin recruiter-project-list` | List Recruiter projects |
| `huntertools linkedin recruiter-project-members` | List members in a Recruiter project |
| `huntertools linkedin recruiter-saved-searches` | List Recruiter saved searches |
| `huntertools linkedin message` | Send a Recruiter message or InMail |
| `huntertools linkedin save-to-project` | Save a candidate into a Recruiter project |
| `huntertools linkedin tag` | Add a Recruiter tag to a candidate |
| `huntertools linkedin notes` | Save a Recruiter note on a candidate |
| `huntertools linkedin batch-message` | Send the same message to multiple candidates |
| `huntertools linkedin inbox-list` | List Recruiter inbox conversations |
| `huntertools linkedin inbox-msg` | Read messages from a Recruiter conversation |
| `huntertools linkedin inbox-reply` | Reply to a Recruiter conversation |
| `huntertools linkedin batch-reply` | Reply to multiple conversations |
| `huntertools linkedin stats` | Summarize live Recruiter search and inbox metrics |
| `huntertools linkedin follow-up-queue` | Build a prioritized follow-up queue |
| `huntertools linkedin follow-up-batch-reply` | Send templated replies from the queue |
| `huntertools linkedin export-follow-up` | Export queue rows with ATS or spreadsheet presets |

## Prerequisites

- Chrome running and logged into LinkedIn
- LinkedIn Recruiter already available in the same Chrome session
- Browser Bridge extension installed and connected

## Recommended Workflow

1. Search candidates with `people-search`
2. Read the candidate with `profile`
3. Send outreach with `message` or `batch-message`
4. Review live threads with `inbox-list` and `inbox-msg`
5. Continue conversations with `inbox-reply` or `batch-reply`
6. Use `stats` and `follow-up-queue` to prioritize the next actions
7. Export the queue with `export-follow-up`

## Examples

```bash
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
huntertools linkedin profile --profile-url "https://www.linkedin.com/talent/profile/..."
huntertools linkedin message "candidate-id" "Hi, I would love to share a role with you."
huntertools linkedin inbox-list --limit 20
huntertools linkedin follow-up-queue --limit 10 --inbox-limit 20 -f json
huntertools linkedin export-follow-up --preset sheet
```

## Notes

- `people-search` is still the most change-sensitive command because LinkedIn Recruiter changes its surface often.
- The production validation for this branch was done against real LinkedIn and Recruiter sessions.
- `huntertools list` is the live source of truth for what remains supported in product mode.
