# Recruiting Adapters

Run `huntertools list` for the live registry.

## Public Product Surface

| Site | Commands | Mode |
|------|----------|------|
| **[linkedin](./browser/linkedin)** | `search` `timeline` `people-search` `profile` `recruiter-project-list` `recruiter-project-members` `recruiter-saved-searches` `message` `save-to-project` `tag` `notes` `batch-message` `inbox-list` `inbox-msg` `inbox-reply` `batch-reply` `stats` `follow-up-queue` `follow-up-batch-reply` `export-follow-up` | Browser |

## Notes

- HunterToolsCLI has been narrowed from a generic multi-site tool into a recruiter-first product.
- The docs surface now follows the product surface: LinkedIn and LinkedIn Recruiter are the supported public workflows.
- Some internal or in-progress recruiting experiments may still exist in the repository, but they are not part of the supported CLI surface unless they appear in `huntertools list`.
