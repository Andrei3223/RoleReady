// Thin client for the Career Agent n8n webhooks. The n8n pipelines are used as-is (tools);
// nothing here changes them.
import { log } from 'apify';

export const DEFAULT_N8N_BASE_URL = 'https://YOUR-N8N-HOST/webhook';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class N8nClient {
    constructor(baseUrl = DEFAULT_N8N_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
    }

    async request(method, path, { query, body, timeoutMs = 60_000, retries = 3, allow404 = false } = {}) {
        const url = new URL(`${this.baseUrl}/${path.replace(/^\/+/, '')}`);
        for (const [k, v] of Object.entries(query || {})) {
            if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
        }
        let lastErr;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const res = await fetch(url, { method, body, signal: AbortSignal.timeout(timeoutMs) });
                if (allow404 && res.status === 404) return null;
                const text = await res.text();
                if (!res.ok) {
                    const err = new Error(`${method} /${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
                    // 4xx other than 429 will not get better on retry
                    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                        err.noRetry = true;
                    }
                    throw err;
                }
                try {
                    return JSON.parse(text);
                } catch {
                    return { raw: text };
                }
            } catch (err) {
                lastErr = err;
                if (err.noRetry || attempt === retries) break;
                const wait = 2_000 * attempt;
                log.warning(`Request ${method} /${path} failed (${err.message}); retrying in ${wait / 1000}s`);
                await sleep(wait);
            }
        }
        throw lastErr;
    }

    /** GET /profile -> profile object, or null when the user does not exist yet. */
    async getProfile(authUserId) {
        const res = await this.request('GET', 'profile', { query: { auth_user_id: authUserId }, allow404: true });
        return res?.profile ?? null;
    }

    /** POST /career-profile (multipart). n8n answers immediately; CV parsing runs afterwards. */
    async uploadProfile({ authUserId, pdfBuffer, fileName, city, position, email }) {
        const form = new FormData();
        form.append('data', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName || 'cv.pdf');
        form.append('auth_user_id', authUserId);
        if (city) form.append('city', city);
        if (position) form.append('position', position);
        if (email) form.append('email', email);
        return this.request('POST', 'career-profile', { body: form, timeoutMs: 120_000, retries: 2 });
    }

    /** POST /courses-regenerate -> starts the whole pipeline for this user in the background. */
    async startPipeline(authUserId) {
        return this.request('POST', 'courses-regenerate', { query: { auth_user_id: authUserId }, timeoutMs: 120_000, retries: 1 });
    }

    async getJobs(authUserId) {
        const res = await this.request('GET', 'jobs', { query: { auth_user_id: authUserId } });
        return Array.isArray(res?.jobs) ? res.jobs : [];
    }

    async getReferrals(authUserId) {
        const res = await this.request('GET', 'referrals', { query: { auth_user_id: authUserId }, allow404: true });
        return Array.isArray(res?.jobs) ? res.jobs : [];
    }

    async getCourses(authUserId) {
        const res = await this.request('GET', 'courses', { query: { auth_user_id: authUserId } });
        return Array.isArray(res?.courses) ? res.courses : [];
    }
}
