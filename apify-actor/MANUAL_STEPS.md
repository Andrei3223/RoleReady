# Publishing the Career Agent Actor: manual steps

The Actor calls your existing n8n webhooks (`/career-profile`, `/courses-regenerate`, `/profile`, `/jobs`, `/referrals`, `/courses`). **Nothing in n8n needs to change.** Keep those workflows active (published).

Time needed: about 1 hour, plus one 30-40 minute test run.

---

## 1. Install the tools (once)

Needs Node.js 20 or newer (https://nodejs.org). Then in a terminal (PowerShell on Windows):

```bash
npm install -g apify-cli
apify --version
```

## 2. Unpack and test locally (optional, 5 min)

```bash
cd career-agent
npm install
npm run test:mock
```

This runs the Actor against a fake n8n (no real calls, no costs). It should end with `Actor exit code 0` and `Saved 3 vacancies and your learning course`.

## 3. Log in and push

1. Open https://console.apify.com → **Settings → API & Integrations** → copy your **Personal API token**.
2. In the `career-agent` folder:

```bash
apify login          # paste the token
apify push           # uploads the code and builds the Actor on Apify
```

The build takes 1-2 minutes. At the end you get a link to the Actor in the Console.

> Use the Apify account you want to publish under. Your Store username (Console → Settings → Account) becomes part of the Actor URL: `apify.com/<username>/career-agent`.

## 4. Environment variables (protect your Apify budget)

The n8n pipeline spends **your** Apify account (the one whose token is in n8n's "Header Auth account" credential), no matter who runs the Actor. These variables let the Actor check that account before it starts a search.

Console → your Actor → **Source** tab → **Environment variables** (at the bottom) → add:

| Name | Value | Secret |
|---|---|---|
| `OWNER_APIFY_TOKEN` | API token of the Apify account used by n8n | **Yes** |
| `DAILY_PIPELINE_LIMIT` | `20` (new searches per day, all users together) | No |
| `BUDGET_RESERVE_USD` | `10` (stop new searches when less than $10 of the monthly cap is left) | No |
| `N8N_BASE_URL` | `https://YOUR-N8N-HOST/webhook` (only if it ever changes) | No |

Click **Save**, then **Build** again (environment variables are applied at build time).

What the guard does: at most `DAILY_PIPELINE_LIMIT` new searches per day; waits (up to 10 min) while fewer than 3 of the 5 concurrent Apify runs are free; refuses new searches near the monthly cap. Collecting results ("Start a new search" off) is never blocked. Without `OWNER_APIFY_TOKEN` the guard is off.

## 5. Actor settings

Console → your Actor → **Settings**:

- **Default run options**: Timeout **3600** seconds (the default wait is 45 min), Memory **256 MB** (the Actor only waits, so this keeps compute cost low).
- **Permissions**: choose **Limited permissions**. The Actor only uses its own run storage and one named store it creates (`career-agent-state`), which limited permissions allow.

## 6. Test run on the platform (30-40 min, uses real credits)

Console → your Actor → **Input** tab:

1. Upload your own CV (PDF), position, city, **What to wait for = Everything** → **Start**.
2. Check the log: "Uploading your CV", "Starting the vacancy search", then progress lines like `Working: 10 vacancies, 4/10 prep plans, 6/10 referral searches, course pending.`
3. When done, open **Output**: check the three views (Vacancies, Interview prep, Referral contacts) and the `OUTPUT` record in the key-value store (course).
4. Run again with **Start a new search** off: it should finish in under a minute with the same results.
5. Optional: in n8n, check the executions of `profile_update` and `REFRESH_LEARNING_MATERIALS`; a new `users` row with `auth_user_id` starting with `apify-` appears.

Save this run: Store visitors see example output, and you can link it in the hackathon submission.

## 7. Store page (Publication tab)

Console → your Actor → **Publication**:

1. **Display information**
   - Title: `Career Agent: Job Search, Interview Prep & Referrals`
   - Short description: take it from `.actor/actor.json`.
   - Categories: **Jobs**, **AI**, **Agents** (or the closest ones offered).
   - Icon: a square PNG (at least 512×512).
   - SEO title / description: the same text shortened.
2. **README**: filled from `README.md` automatically on push. Read it once; edit the "Your data" section if your deletion contact is different.
3. **Example input**: CV upload leave empty, position `Data Scientist`, city `Amsterdam`.

## 8. Monetization (pay per event)

Console → your Actor → **Publication → Monetization** → **Set up**.

1. Fill in your payout details (needed before any paid model can be saved).
2. Choose **Pay per event** and add these events. **The names must match exactly**, the code charges them by name:

| Event name | Title | Suggested price | Your cost (approx.) |
|---|---|---|---|
| `vacancy-found` | Vacancy found | $0.03 | LinkedIn search + AI ranking, ~$0.02 per vacancy |
| `interview-prep-plan` | Interview-prep plan | $0.60 (primary event) | Apify ~$0.25-0.30 + Claude |
| `referral-contacts` | Referral contacts with drafts | $0.60 | Apify ~$0.15-0.40 per company + Claude |
| `learning-course` | Learning course | $0.50 | Claude (Sonnet, 16k tokens) |

3. Mark **`interview-prep-plan`** as the primary event.
4. **Turn off** the automatic `apify-default-dataset-item` event (the code already charges per vacancy). You can keep `apify-actor-start`.
5. Remember: you receive 80% of the price, and runs of users on the Apify **free plan** earn nothing, while they still spend your n8n pipeline's Apify credit. `DAILY_PIPELINE_LIMIT` is what protects you from that; keep it low at first.

For the hackathon, you can also publish **free** first and add pay-per-event later.

## 9. Publish

Publication tab → **Publish to Store** (switch the Actor to public). Then:

- Open the Store page in a private browser window and check it.
- Check the **Actor quality score** hints in the Console and fix what is quick.
- Run it once from the Store page as a user would.

## 10. After publishing

- Watch **Issues** on the Actor page and the n8n executions for failures.
- n8n Cloud counts executions: every search starts many sub-executions (prep lanes, referral workers). Check that your n8n plan's monthly execution quota is enough.
- Known limits, taken from the n8n system map: webhooks have no auth (anyone who knows an id can read its data; the Actor uses random ids to make them hard to guess); several users in the same hour can hit the 5-concurrent-run Apify limit; the search is tuned for the Netherlands.
- To update the Actor: change the code, `apify push`. Pricing changes on a public Actor take effect with a delay, so users get a notice.
