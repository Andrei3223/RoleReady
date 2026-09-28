// Protects the owner's Apify account, which the n8n pipeline spends (not the caller's).
// Active only when the Actor has the secret env var OWNER_APIFY_TOKEN.
import { log } from 'apify';
import { ApifyClient } from 'apify-client';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class OwnerGuard {
    constructor(env = process.env) {
        this.token = env.OWNER_APIFY_TOKEN || '';
        this.dailyLimit = Number(env.DAILY_PIPELINE_LIMIT || 20);
        this.budgetReserveUsd = Number(env.BUDGET_RESERVE_USD || 10);
        // Each pipeline needs up to ~4 concurrent runs (2 prep lanes + 2 referral workers).
        this.freeSlotsNeeded = Number(env.FREE_SLOTS_NEEDED || 3);
        this.client = this.token ? new ApifyClient({ token: this.token }) : null;
    }

    get enabled() {
        return Boolean(this.client);
    }

    async limits() {
        const res = await fetch('https://api.apify.com/v2/users/me/limits', {
            headers: { Authorization: `Bearer ${this.token}` },
            signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.data ?? json;
    }

    /**
     * Returns { ok: true } or { ok: false, reason }.
     * Waits (up to maxWaitMs) while the owner account has no free concurrent-run slots.
     */
    async checkBeforeStart(opts = {}) {
        if (!this.enabled) return { ok: true };
        try {
            return await this.check(opts);
        } catch (err) {
            // A broken/revoked owner token must not break the Actor for users
            log.warning(`Owner guard skipped: ${err.message}`);
            return { ok: true };
        }
    }

    async check({ maxWaitMs = 10 * 60_000, onWait } = {}) {

        // 1. Daily cap on new pipeline starts
        const store = await this.client.keyValueStores().getOrCreate('career-agent-guard');
        const kv = this.client.keyValueStore(store.id);
        const day = new Date().toISOString().slice(0, 10);
        const key = `starts-${day}`;
        const rec = await kv.getRecord(key);
        const count = Number(rec?.value?.count || 0);
        if (count >= this.dailyLimit) {
            return { ok: false, reason: `The daily limit of ${this.dailyLimit} new searches is reached. Please try again tomorrow, or run with "Start a new search" off to collect earlier results.` };
        }

        // 2. Monthly budget and 3. free concurrency slots
        const deadline = Date.now() + maxWaitMs;
        for (;;) {
            let lim;
            try {
                lim = await this.limits();
            } catch (err) {
                log.warning(`Could not read owner limits (${err.message}); continuing without the check.`);
                break;
            }
            const used = lim?.current?.monthlyUsageUsd ?? 0;
            const cap = lim?.limits?.maxMonthlyUsageUsd ?? Infinity;
            if (used >= cap - this.budgetReserveUsd) {
                return { ok: false, reason: 'The service has used its monthly search budget. Please try again next month, or collect earlier results with "Start a new search" off.' };
            }
            const active = lim?.current?.activeActorJobCount ?? 0;
            const max = lim?.limits?.maxConcurrentActorJobs ?? 5;
            if (max - active >= this.freeSlotsNeeded) break;
            if (Date.now() > deadline) {
                return { ok: false, reason: 'The service is busy with other users right now. Please try again in 15-30 minutes.' };
            }
            if (onWait) await onWait(active, max);
            await sleep(30_000);
        }

        await kv.setRecord({ key, value: { count: count + 1, updatedAt: new Date().toISOString() } });
        return { ok: true };
    }
}
