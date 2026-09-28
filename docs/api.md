# Webhook API

Base URL: `https://YOUR-N8N-HOST/webhook`. Every call identifies the user with `auth_user_id` (the Supabase user id): in the query string for GET, in the body for POST. The frontend also sends `Authorization: Bearer <Supabase access token>`.

| Method | Path | Workflow | Purpose |
|---|---|---|---|
| POST | `/career-profile` | profile_update | Create or update the profile. `multipart/form-data`: CV as a PDF file, `city`, `position`, `email`, `auth_user_id`. Parsing runs after the response. |
| GET | `/profile` | GET_USER_PROFILE | The user's profile. |
| POST | `/courses-regenerate?auth_user_id=` | REFRESH_LEARNING_MATERIALS | Starts the whole pipeline for the user (job search → interview prep + referrals → course). Answers at once with `{success, status: "started", auth_user_id, message}`; poll the GET endpoints for results. Without `auth_user_id` it rebuilds all users' courses. |
| GET | `/jobs-refresh` | find vacancy | Runs the job search for the user now, then returns the same response as `/jobs`. |
| GET | `/jobs` | GET_USER_JOBS | The user's vacancies (hidden ones excluded), sorted by priority and match score. |
| GET | `/referrals` (`&job_id=` optional) | GET_REFERRALS | Referral contacts and drafted messages, grouped by job. |
| GET | `/job-referral?job_id=` | GET_JOB_REFERRAL | Referral contacts for one job. |
| GET | `/courses` | GET_USER_COURSES | The user's courses with modules and progress. |
| GET | `/course?course_id=` | GET_COURSE | One course. |
| GET | `/job-course?job_id=` | GET_JOB_COURSE | Only the course modules linked to that job. |
| POST | `/course-progress` | POST_COURSE_PROGRESS | `{auth_user_id, course_id, module_id, progress_percent, status, score}`. |
| POST | `/user-data-reset` | RESET_USER_DATA | Deletes the user's jobs, referrals, courses and progress (keeps the profile). `{auth_user_id, dry_run}`; `dry_run: true` only shows what would be deleted. |

## Response shapes

### `/jobs`

```json
{
  "success": true,
  "count": 5,
  "jobs": [
    {
      "id": "linkedin:1234567890",
      "title": "Frontend Engineer",
      "company_name": "Example BV",
      "job_url": "https://www.linkedin.com/jobs/view/...",
      "location": "Utrecht, Netherlands",
      "match_score": 82,
      "priority_score": 75,
      "status": "discovered",
      "match_reason": "...",
      "saved": false,
      "matched_skills": ["React", "TypeScript"],
      "missing_skills": ["Angular"],
      "prep_status": "ready",
      "prep": {
        "role_type": "software",
        "skill_gaps": [{ "skill": "...", "why": "..." }],
        "courses": [{ "title": "...", "url": "...", "why": "..." }],
        "practice": [{ "title": "...", "url": "...", "type": "leetcode", "why": "..." }],
        "interview_insights": [{ "insight": "...", "source_url": "..." }],
        "likely_questions": [{ "question": "...", "answer_hint": "...", "source": "glassdoor" }],
        "plan": [{ "day": 1, "focus": "...", "tasks": ["..."] }],
        "plan_markdown": "# Interview prep: ...",
        "data_quality": "company-specific",
        "updated_at": "..."
      }
    }
  ]
}
```

`prep_status` is `pending` (and `prep` is `null`) until the interview-prep plan is ready.

### `/referrals`

```json
{
  "success": true,
  "count": 1,
  "contacts_count": 3,
  "jobs": [
    {
      "job_id": "linkedin:1234567890",
      "job_title": "Frontend Engineer",
      "company": "Example BV",
      "job_url": "...",
      "status": "drafted",
      "contacts": [
        {
          "draft_id": 1,
          "contact_name": "...",
          "contact_linkedin_url": "...",
          "contact_headline": "...",
          "tier": "alumni",
          "score": 7,
          "match_reasons": ["..."],
          "email": "...",
          "email_status": "guessed",
          "channel": "linkedin",
          "subject": "...",
          "body": "...",
          "linkedin_note": "...",
          "status": "draft"
        }
      ]
    }
  ]
}
```

`tier` is `alumni`, `ex_colleague`, `same_team` or `recruiter`. `status` per job is `drafted` or `no_contacts`. Messages are drafts only; nothing is ever sent automatically.

### `/courses`

`{ success, count, courses: [{ course_id, name, description, role, version, status, progress_percent, completed_modules, total_modules, modules: [{ module_id, title, description, content, skill_name, resources[], importance_score, status, progress_percent }] }] }`
