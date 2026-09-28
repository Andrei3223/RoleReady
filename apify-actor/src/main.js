// Career Agent Actor: runs the existing Career Agent n8n pipeline through its webhooks
// (profile upload -> vacancy search -> interview prep + referral search -> learning course)
// and returns the results as an Apify dataset. The n8n workflows are not modified.
import { randomUUID, createHash } from 'node:crypto';
import { Actor, log } from 'apify';
import { N8nClient, DEFAULT_N8N_BASE_URL } from './n8n.js';
import { OwnerGuard } from './guard.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => createHash('sha256').update(String(s || '')).digest('hex').slice(0, 16);

// Pay-per-event names (must match the events defined in Console > Publication > Monetization)
const EVENTS = {
    vacancy: 'vacancy-found',
    prep: 'interview-prep-plan',
    referral: 'referral-contacts',
    course: 'learning-course',
};
// Do not start a second pipeline for the same user within this window (the n8n side
// races when /courses-regenerate is called twice in a row).
const PIPELINE_COOLDOWN_MIN = 30;

await Actor.init();

try {
    const input = (await Actor.getInput()) || {};
    const {
        cv,
        position = '',
        city = '',
        email = '',
        waitFor = 'everything',
        maxWaitMinutes = 55,
        startPipeline = true,
        authUserId: inputAuthUserId,
        pollIntervalSeconds = 30,
    } = input;

    const n8n = new N8nClient(process.env.N8N_BASE_URL || DEFAULT_N8N_BASE_URL);
    const runStartedAt = Date.now();
    const deadline = runStartedAt + Math.max(3, maxWaitMinutes) * 60_000;
    const pollMs = Math.max(10, pollIntervalSeconds) * 1000;

    // ---------- Identity: one private user id per Apify account (stored in the caller's own storage)
    const stateStore = await Actor.openKeyValueStore('career-agent-state');
    const state = (await stateStore.getValue('STATE')) || {};
    state.charged = state.charged || {};
    let authUserId = (inputAuthUserId || '').trim() || state.authUserId;
    if (!authUserId) authUserId = `apify-${randomUUID()}`;
    if (!inputAuthUserId) state.authUserId = authUserId;
    const saveState = () => stateStore.setValue('STATE', state);
    await saveState();
    log.info(`Career Agent user id: ${authUserId.slice(0, 14)}... (kept in your key-value store "career-agent-state")`);

    const status = async (msg) => {
        await Actor.setStatusMessage(msg);
    };

    let profile = await n8n.getProfile(authUserId);

    // ---------- 1. Profile + pipeline start
    let pipelineStarted = false;
    if (startPipeline) {
        if (!cv && !profile) {
            await Actor.fail('Please upload your CV (PDF) on the first run. The agent needs it to find matching vacancies.');
        }
        if (!cv && (position || city)) {
            log.warning('No CV given: the saved profile is used. Position/city changes are only applied together with a CV upload.');
        }
        const lastStart = state.lastPipelineStartAt ? Date.parse(state.lastPipelineStartAt) : 0;
        const minutesSince = (Date.now() - lastStart) / 60_000;

        if (minutesSince < PIPELINE_COOLDOWN_MIN && !cv) {
            await status(`A search was started ${Math.round(minutesSince)} min ago and is still running. Collecting its results instead of starting another one.`);
        } else {
            const guard = new OwnerGuard();
            const check = await guard.checkBeforeStart({
                onWait: (active, max) => status(`Service is busy (${active}/${max} background jobs). Waiting for a free slot...`),
            });
            if (!check.ok) await Actor.fail(check.reason);

            if (cv) {
                if (!position || !city) await Actor.fail('Please fill in "Target position" and "City" together with the CV.');
                await status('Uploading your CV...');
                const { buffer, fileName } = await loadCv(cv);
                const before = profile ? hash(profile.resume?.text) : null;
                await n8n.uploadProfile({ authUserId, pdfBuffer: buffer, fileName, city, position, email });
                await status('Reading your CV (about 30 seconds)...');
                profile = await waitForProfile(n8n, authUserId, before, 5 * 60_000);
                if (!profile) await Actor.fail('Your CV could not be read. Please make sure it is a text-based PDF (not a scanned image) and try again.');
                // Give the n8n upsert a moment to finish all columns
                await sleep(5_000);
            }

            await status('Starting the vacancy search...');
            const res = await n8n.startPipeline(authUserId);
            log.info(`Pipeline started: ${JSON.stringify(res).slice(0, 300)}`);
            state.lastPipelineStartAt = new Date().toISOString();
            await saveState();
            pipelineStarted = true;
        }
    } else if (!profile) {
        await Actor.fail('No profile found for your account yet. Run once with "Start a new search" on and your CV uploaded.');
    }

    // ---------- 2. Poll the read endpoints until the requested parts are ready
    const need = {
        prep: waitFor === 'prep' || waitFor === 'everything',
        referrals: waitFor === 'referrals' || waitFor === 'everything',
        course: waitFor === 'everything',
    };
    const searchStartedAt = state.lastPipelineStartAt ? Date.parse(state.lastPipelineStartAt) : 0;
    const searchRunning = (Date.now() - searchStartedAt) / 60_000 < 90;
    // When a search is running, vacancies are "done" once their number stops changing
    // (at least 3 minutes after the start, so we do not return the previous search's list).
    const minJobsWaitMs = pipelineStarted ? 3 * 60_000 : 0;

    let jobs = [];
    let referrals = [];
    let courses = [];
    let prev = { jobs: -1, refs: -1, courseStamp: '' };
    let stable = { jobs: 0, refs: 0, course: 0 };
    let done = {};
    // Stall recovery: n8n sometimes drops a prep lane (task runner at capacity). The pipeline only
    // retries on its next start, so if prep makes no progress for a while we start it once more.
    let lastPrepCount = -1;
    let lastPrepChangeAt = Date.now();
    let restarted = false;

    for (let round = 1; ; round++) {
        try {
            jobs = await n8n.getJobs(authUserId);
            if (need.referrals) referrals = await n8n.getReferrals(authUserId);
            if (need.course) courses = await n8n.getCourses(authUserId);
        } catch (err) {
            log.warning(`Polling failed: ${err.message}`);
        }

        const refIds = new Set(referrals.filter((r) => ['drafted', 'no_contacts'].includes(r.status)).map((r) => r.job_id));
        const refCount = referrals.reduce((s, r) => s + (r.contacts?.length || 0), 0) + refIds.size;
        const courseStamp = courses.map((c) => `${c.course_id}:${c.updated_at || c.generated_at}`).join('|');

        stable.jobs = jobs.length === prev.jobs ? stable.jobs + 1 : 0;
        stable.refs = refCount === prev.refs ? stable.refs + 1 : 0;
        stable.course = courseStamp === prev.courseStamp ? stable.course + 1 : 0;
        prev = { jobs: jobs.length, refs: refCount, courseStamp };

        const elapsed = Date.now() - runStartedAt;
        const readyPrep = jobs.filter((j) => j.prep_status === 'ready').length;
        const refsCovered = jobs.filter((j) => refIds.has(j.id)).length;
        const freshCourse = courses.some((c) => Date.parse(c.updated_at || c.generated_at || 0) >= searchStartedAt - 60_000);

        done.jobs = jobs.length > 0 && elapsed >= minJobsWaitMs && (stable.jobs >= 2 || !searchRunning);
        done.prep = done.jobs && readyPrep === jobs.length;
        // Referral search covers every vacancy; if some never appear, accept a long quiet period.
        done.referrals = done.jobs && (refsCovered === jobs.length || (refCount > 0 && stable.refs >= 8 && (!need.prep || done.prep)));
        done.course = done.prep && courses.length > 0 && (freshCourse || stable.course >= 6 || !searchRunning);

        const allDone = done.jobs && (!need.prep || done.prep) && (!need.referrals || done.referrals) && (!need.course || done.course);

        const parts = [`${jobs.length} vacancies`];
        if (need.prep) parts.push(`${readyPrep}/${jobs.length} prep plans`);
        if (need.referrals) parts.push(`${refsCovered}/${jobs.length} referral searches`);
        if (need.course) parts.push(courses.length ? (done.course ? 'course ready' : 'course updating') : 'course pending');
        await status(`${allDone ? 'Done' : 'Working'}: ${parts.join(', ')}.`);

        // Progress only (counts); paid content is written after charging below
        await saveOutput({ authUserId, profile, jobs: jobs.map((j) => ({ prep: j.prep ? 1 : null })), referrals, courses: [], done, final: false });

        if (allDone) break;

        if (readyPrep !== lastPrepCount) {
            lastPrepCount = readyPrep;
            lastPrepChangeAt = Date.now();
        }
        const sinceStartMin = (Date.now() - (state.lastPipelineStartAt ? Date.parse(state.lastPipelineStartAt) : 0)) / 60_000;
        const prepStalledMin = (Date.now() - lastPrepChangeAt) / 60_000;
        if (startPipeline && !restarted && need.prep && done.jobs && !done.prep
            && prepStalledMin >= 12 && sinceStartMin >= PIPELINE_COOLDOWN_MIN + 1) {
            restarted = true;
            log.warning(`Interview prep made no progress for ${Math.round(prepStalledMin)} min; restarting the pipeline once for the missing vacancies.`);
            try {
                await n8n.startPipeline(authUserId);
                state.lastPipelineStartAt = new Date().toISOString();
                await saveState();
            } catch (err) {
                log.warning(`Restart failed: ${err.message}`);
            }
        }
        if (Date.now() + pollMs > deadline) {
            log.warning('Maximum wait reached. Returning what is ready; the rest keeps running in the background.');
            break;
        }
        if (!searchRunning && round >= 2 && jobs.length === 0) {
            log.warning('No vacancies found for this profile.');
            break;
        }
        await sleep(pollMs);
    }

    // ---------- 3. Output: one dataset item per vacancy, charged once per item and event
    const refsByJob = new Map(referrals.map((r) => [r.job_id, r]));
    let limitReached = false;
    const charge = async (eventName, id) => {
        const key = `${eventName}:${id}`;
        if (state.charged[key]) return true; // already paid in an earlier run
        if (limitReached) return false;
        const cm = Actor.getChargingManager();
        if (cm.getPricingInfo().isPayPerEvent) {
            // Check first: charging beyond the caller's limit makes the platform stop the run
            if (cm.calculateMaxEventChargeCountWithinLimit(eventName) < 1) {
                limitReached = true;
                return false;
            }
            const res = await Actor.charge({ eventName });
            if (!res.chargedCount) {
                limitReached = true;
                return false;
            }
        }
        // Not pay-per-event (e.g. local runs or owner test runs): nothing to charge
        state.charged[key] = new Date().toISOString();
        return true;
    };

    const items = [];
    for (const job of jobs) {
        if (!(await charge(EVENTS.vacancy, job.id))) break;
        const ref = refsByJob.get(job.id);
        const item = {
            ...job,
            prep: null,
            referral_status: ref?.status || 'pending',
            referral_contacts_count: ref?.contacts?.length || 0,
            referral_contacts: [],
        };
        if (job.prep_status === 'ready' && job.prep && (await charge(EVENTS.prep, job.id))) {
            item.prep = job.prep;
        } else if (job.prep_status === 'ready') {
            item.prep_status = 'not included (spending limit reached)';
        }
        if (ref?.status === 'drafted' && ref.contacts?.length && (await charge(EVENTS.referral, job.id))) {
            item.referral_contacts = ref.contacts;
        } else if (ref?.status === 'drafted') {
            item.referral_status = 'not included (spending limit reached)';
        }
        items.push(item);
    }
    await Actor.pushData(items);

    let courseOut = [];
    if (need.course && done.course) {
        for (const c of courses) {
            if (await charge(EVENTS.course, `${c.course_id}:${c.updated_at || c.generated_at}`)) courseOut.push(c);
        }
    }
    await saveState();
    await saveOutput({ authUserId, profile, jobs: items, referrals, courses: courseOut, done, final: true });

    if (limitReached) log.warning('Your maximum cost per run was reached; some results were left out. Raise the limit and run again with "Start a new search" off to get them.');
    const pending = Object.entries(done).filter(([k, v]) => !v && (k === 'jobs' || need[k])).map(([k]) => k);
    await Actor.exit(
        pending.length
            ? `Saved ${items.length} vacancies. Still running in the background: ${pending.join(', ')}. Run again later with "Start a new search" off to collect them.`
            : `Saved ${items.length} vacancies${need.course && courseOut.length ? ' and your learning course (see OUTPUT in the key-value store)' : ''}.`,
    );
} catch (err) {
    log.exception(err, 'Career Agent failed');
    await Actor.fail(`Unexpected error: ${err.message}`);
}

// ---------- helpers

async function loadCv(cv) {
    let buffer;
    let fileName = 'cv.pdf';
    if (/^https?:\/\//i.test(cv)) {
        const res = await fetch(cv, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(`Could not download the CV (HTTP ${res.status}).`);
        buffer = Buffer.from(await res.arrayBuffer());
        const m = /filename="?([^";]+)"?/i.exec(res.headers.get('content-disposition') || '');
        if (m) fileName = m[1];
    } else {
        // A key in the run's default key-value store
        const value = await Actor.getValue(cv);
        if (!value) throw new Error('The CV file could not be found. Please upload it again.');
        buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
    }
    if (buffer.length > 10 * 1024 * 1024) throw new Error('The CV is larger than 10 MB.');
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('The CV must be a PDF file.');
    return { buffer, fileName };
}

async function waitForProfile(n8n, authUserId, beforeHash, timeoutMs) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        await sleep(10_000);
        const p = await n8n.getProfile(authUserId).catch(() => null);
        if (p && p.resume?.text && hash(p.resume.text) !== beforeHash) return p;
    }
    // Same CV uploaded again: text unchanged, but the profile exists
    return beforeHash ? n8n.getProfile(authUserId) : null;
}

async function saveOutput({ authUserId, profile, jobs, referrals, courses, done, final }) {
    await Actor.setValue('OUTPUT', {
        final,
        updatedAt: new Date().toISOString(),
        user_id: authUserId,
        profile: profile
            ? {
                first_name: profile.first_name,
                last_name: profile.last_name,
                location: profile.location,
                positions_of_interest: profile.positions_of_interest,
            }
            : null,
        progress: done,
        counts: {
            vacancies: jobs.length,
            prep_plans_ready: jobs.filter((j) => j.prep).length,
            referral_jobs: referrals.filter((r) => r.status === 'drafted').length,
            courses: courses.length,
        },
        courses,
    });
}
