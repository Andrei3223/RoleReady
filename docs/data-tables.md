# n8n data tables

The workflows use n8n **Data tables** (Overview → Data tables). They are not part of a workflow export, so create them by hand before importing the workflows, with **exactly these names and columns** (the workflows refer to tables by name). Every table also has n8n's own `id`, `createdAt` and `updatedAt` columns.

No data is included in this repository: the live tables contain CVs, LinkedIn contacts and e-mail addresses.

## users

One row per person (profile from the CV). `id` (row id) is the internal user id.

| column | type |
|---|---|
| `user_id` | string |
| `auth_user_id` | string |
| `email` | string |
| `first_name` | string |
| `last_name` | string |
| `linkedin_url` | string |
| `location` | string |
| `target_roles_json` | string |
| `target_locations_json` | string |
| `preferred_industries_json` | string |
| `employment_type` | string |
| `remote_preference` | string |
| `salary_min` | number |
| `cv_text` | string |
| `skills_json` | string |
| `experience_json` | string |
| `education_json` | string |
| `previous_companies_json` | string |
| `profile_summary` | string |
| `job_search_active` | boolean |
| `last_job_refresh_at` | date |
| `last_course_refresh_at` | date |
| `created_at` | date |
| `updated_at` | date |
| `country` | string |
| `pipeline_started_at` | date |

## jobs

One row per LinkedIn vacancy, shared by all users. Key: `job_id` = `linkedin:<external id>`.

| column | type |
|---|---|
| `job_id` | string |
| `source` | string |
| `external_job_id` | string |
| `job_key` | string |
| `title` | string |
| `company_name` | string |
| `company_url` | string |
| `job_url` | string |
| `location` | string |
| `remote_type` | string |
| `employment_type` | string |
| `description` | string |
| `required_skills_json` | string |
| `preferred_skills_json` | string |
| `seniority` | string |
| `salary_min` | number |
| `salary_max` | number |
| `published_at` | date |
| `fetched_at` | date |
| `is_active` | boolean |
| `raw_data_json` | string |

## user_jobs

Link user to vacancy (key: `user_id` + `job_id`) with AI match scores, user choices and the interview-prep plan (`prep_*`).

| column | type |
|---|---|
| `auth_user_id` | string |
| `user_job_id` | string |
| `user_id` | string |
| `job_id` | string |
| `match_score` | number |
| `status` | string |
| `match_reason` | string |
| `matched_skills_json` | string |
| `missing_skills_json` | string |
| `priority_score` | number |
| `company_risk_score` | number |
| `saved` | boolean |
| `hidden` | boolean |
| `applied_at` | date |
| `interview_at` | date |
| `created_at` | date |
| `updated_at` | date |
| `prep_status` | string |
| `prep_role_type` | string |
| `prep_skill_gaps_json` | string |
| `prep_courses_json` | string |
| `prep_practice_json` | string |
| `prep_interview_insights_json` | string |
| `prep_likely_questions_json` | string |
| `prep_plan_json` | string |
| `prep_plan_markdown` | string |
| `prep_data_quality` | string |
| `prep_updated_at` | date |

## referral_drafts

People who could refer the user, with drafted messages. Key: `auth_user_id` + `job_id` (+ contact). A row with status `no_contacts` and no contact marks a job that was searched without result.

| column | type |
|---|---|
| `job_id` | string |
| `job_title` | string |
| `company` | string |
| `job_url` | string |
| `contact_name` | string |
| `contact_linkedin_url` | string |
| `contact_headline` | string |
| `tier` | string |
| `score` | number |
| `match_reasons` | string |
| `email` | string |
| `email_status` | string |
| `channel` | string |
| `subject` | string |
| `body` | string |
| `linkedin_note` | string |
| `status` | string |
| `auth_user_id` | string |
| `gmail_draft_id` | string |

## courses

One personal course per user and target role. `course_id` = `course_<users.id>_<role slug>`.

| column | type |
|---|---|
| `course_id` | string |
| `role` | string |
| `name` | string |
| `description` | string |
| `version` | number |
| `jobs_analyzed` | number |
| `skills_snapshot_json` | string |
| `is_active` | boolean |
| `generated_at` | date |
| `updated_at` | date |

## course_modules

Modules of a course. `module_id` = `course_id` + `_` + skill slug.

| column | type |
|---|---|
| `module_id` | string |
| `course_id` | string |
| `title` | string |
| `skill_name` | string |
| `description` | string |
| `content` | string |
| `resources_json` | string |
| `importance_score` | number |
| `market_demand_percent` | number |
| `trend_percent` | number |
| `order_index` | number |
| `created_at` | date |
| `updated_at` | date |

## user_learning

A user's progress per module. `learning_id` = `learn_<users.id>_<module_id>`. `related_job_ids_json` lists the jobs whose skill gaps the module covers.

| column | type |
|---|---|
| `learning_id` | string |
| `user_id` | string |
| `course_id` | string |
| `module_id` | string |
| `priority_score` | number |
| `reason` | string |
| `related_job_ids_json` | string |
| `status` | string |
| `progress_percent` | number |
| `score` | number |
| `started_at` | date |
| `completed_at` | date |
| `updated_at` | date |

## contacted_people

People the user already contacted (skipped by the referral search).

| column | type |
|---|---|
| `linkedin_url` | string |
| `name` | string |
| `company` | string |
| `sent_at` | date |

## job_preparations, job_connections, connections

Created early in the project and not used by the current workflows (only RESET_USER_DATA clears them). Can be skipped.

## How the ids connect

- `auth_user_id`: the Supabase login id. Every webhook receives it; `users` is looked up by it.
- `users.id`: the internal user id. Stored as text in `user_jobs.user_id` and `user_learning.user_id`, and part of `course_id`.
- `job_id` (`linkedin:<id>`): `jobs.job_id` = `user_jobs.job_id` = `referral_drafts.job_id`, and listed in `user_learning.related_job_ids_json`.
- `course_id` → `course_modules.course_id` → `module_id` → `user_learning.module_id`.
