# Career Agent: Job Search, Interview Prep & Referrals

Upload your CV, type the role you want and your city. The Career Agent then does the job-hunting groundwork for you:

1. **Finds matching vacancies** on LinkedIn and ranks them by how well they fit your CV, with the reason for each match.
2. **Builds an interview-prep plan for every vacancy**: your skill gaps, courses and practice material, real interview questions and insights from Glassdoor where available, and a 14-day study plan.
3. **Finds people who can refer you**: alumni of your university, former colleagues and people in the same team at each company. For the best 2-3 people per vacancy it writes a short, personal message (email and LinkedIn note) asking about the role and for a referral. **Nothing is sent**: you review and send the messages yourself.
4. **Creates a personal learning course** that covers the skills most of your target vacancies ask for.

## How to use it

1. Upload your CV as a PDF (text-based, not a scan).
2. Enter your target position (e.g. "Data Scientist") and city (e.g. "Amsterdam").
3. Pick what to wait for:
   - **Vacancies only**: about 5 minutes.
   - **Everything**: about 20-40 minutes for 10 vacancies.
4. Start. Results appear in the **Output** tab.

The agent remembers your profile for your Apify account. Run it again later without a CV to look for new vacancies; only new vacancies are processed and charged. If a run stops waiting before everything is ready, the work continues in the background: run again with **Start a new search** off to collect it.

## Output

One dataset item per vacancy:

| Field | Description |
|---|---|
| `title`, `company_name`, `location`, `job_url` | The vacancy |
| `match_score`, `match_reason`, `matched_skills`, `missing_skills` | How well it fits your CV |
| `prep` | Interview-prep plan: `skill_gaps`, `courses`, `practice`, `interview_insights`, `likely_questions`, `plan` (14 days), `plan_markdown`, `data_quality` |
| `referral_status` | `drafted`, `no_contacts` or `pending` |
| `referral_contacts` | People to contact: name, LinkedIn URL, why they are relevant (`tier`, `match_reasons`), email if found (`email_status`: found / guessed), suggested `channel`, and the drafted `subject`, `body` and `linkedin_note` |

The dataset has three views: **Vacancies**, **Interview prep** and **Referral contacts**.
The learning course is in the key-value store record `OUTPUT` (`courses[].modules[]` with resources).

Example item (shortened):

```json
{
  "title": "Data Scientist",
  "company_name": "Picnic",
  "location": "Amsterdam, North Holland, Netherlands",
  "match_score": 86,
  "prep_status": "ready",
  "prep": {
    "skill_gaps": [{ "skill": "A/B testing", "why": "Mentioned three times in the posting" }],
    "likely_questions": [{ "question": "How would you design a demand forecast for a new hub?", "answer_hint": "..." }],
    "plan_markdown": "Day 1: ..."
  },
  "referral_status": "drafted",
  "referral_contacts": [
    {
      "contact_name": "...",
      "tier": "alumni",
      "match_reasons": ["University of Amsterdam, MSc Data Science 2021"],
      "channel": "linkedin",
      "linkedin_note": "Hi ..., fellow UvA alum here ..."
    }
  ]
}
```

## Pricing

You pay per result, not for waiting time:

| Event | When |
|---|---|
| Vacancy found | Each matching vacancy returned |
| Interview-prep plan | Each vacancy with a finished prep plan |
| Referral contacts | Each vacancy with drafted referral messages |
| Learning course | Each course built or updated |

Results you already received are never charged again in later runs. Set a **maximum cost per run** to stay in control; results beyond it are left out and can be collected later.

## Your data

- Your CV text and the extracted profile are stored by the Career Agent service so that later runs can continue where you left off. They are used only to run this agent.
- Referral contacts are public LinkedIn profiles of people at the companies you are applying to. Only a few people per vacancy are selected, and **no message is ever sent automatically**.
- Your profile is linked to a random id kept in your own Apify storage (key-value store `career-agent-state`). To have your data deleted, open an issue on this Actor with that id.

## Limits

- The vacancy search is tuned for the **Netherlands**.
- Prep plans use public data; for small companies there may be no interview reports, then the plan is role-based (`data_quality: "role-based only"`).
- Emails marked `guessed` are not verified. Use the LinkedIn note for those.
- When many people use the agent at the same time, your run may wait for a free slot, or ask you to try again later.

## Use it from AI agents

This Actor can be called as a tool through the [Apify MCP server](https://mcp.apify.com), e.g. from Claude or other MCP clients.
