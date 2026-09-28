# n8n backend

Exported n8n workflows (n8n Cloud, workflow execution order v1). Credentials, data-table contents, the n8n host and all instance ids were removed from the export.

```
workflows/
├── pipeline/       the agent itself (run in this order)
│   ├── 01-profile-update.json               POST /career-profile: CV pdf -> LLM -> users
│   ├── 02-find-vacancy.json                 GET /jobs-refresh + every 2 h: runs 03 per user
│   ├── 03-find-vacancy-process-user.json    LinkedIn search (Apify) + LLM ranking -> jobs, user_jobs; starts 04 + 05
│   ├── 04-get-materials.json                interview-prep plan per job (Coursera, Google, LeetCode, Glassdoor, Claude)
│   ├── 05-referrals.json                    referral contacts per company + drafted messages (Apify, Claude)
│   └── 06-refresh-learning-materials.json   personal learning course; POST /courses-regenerate runs the whole pipeline
├── api/            read/write endpoints for the frontend (see ../docs/api.md)
└── experimental/   early prototypes, not used by the app (do not activate: two of them also listen on /career-profile)
```

## Import

1. **Data tables.** Create the tables listed in [`../docs/data-tables.md`](../docs/data-tables.md) with the same names and columns. The workflows find tables by name.
2. **Credentials.** Create these in n8n (Credentials → Add):

   | Credential name in the export | Type | Used by | Notes |
   |---|---|---|---|
   | `Apify API (Header Auth)` | Header Auth | 03, 04, 05 | Name `Authorization`, value `Bearer <your Apify API token>` |
   | `Anthropic account` | Anthropic | 04, 05, 06 | Claude Sonnet / Haiku (on n8n Cloud this was the built-in "Gateway credits") |
   | `OpenAI account` | OpenAI | 01, 03 | CV parsing (`gpt-5.4-nano`) and job ranking (`gpt-4o-mini`) |

3. **Import the workflows**: Workflows → Import from file, one file at a time (pipeline and api folders). After importing, open each node that shows a credential warning and pick your credential.
4. **Link the sub-workflows.** `Execute Workflow` nodes point to other workflows by id, which is different in every n8n instance. In these nodes the id was replaced with `REPLACE_WITH_ID_OF: <workflow name>`; select the right workflow from the list:
   - 02 `find vacancy` → Find Vacancy — Process User
   - 03 `Find Vacancy — Process User` → get_materials, Referals
   - 04 `get_materials` → get_materials (it starts copies of itself as parallel workers), REFRESH_LEARNING_MATERIALS
   - 05 `Referals` → Referals (parallel workers)
   - 06 `REFRESH_LEARNING_MATERIALS` → Find Vacancy — Process User, REFRESH_LEARNING_MATERIALS
5. **Publish (activate)** all pipeline and api workflows. Sub-workflows must be published, or calls from production executions fail.
6. **Test users.** The "Test user" code nodes (manual runs) contain `00000000-0000-0000-0000-000000000000`; replace it with an `auth_user_id` from your `users` table.

## Costs and limits

- One new user costs roughly $3–6 of Apify credit (LinkedIn search, Coursera/Google/Glassdoor per job, people search and email finder per company) plus LLM tokens.
- The Apify plan used allowed 5 concurrent runs. `get_materials` runs 2 lanes and `Referals` 2 workers at the same time (change `LANES` in *Fan out* and `WORKERS` in *Split into workers* for a bigger plan).
- The webhooks trust the `auth_user_id` they receive. Add authentication before exposing them publicly.
