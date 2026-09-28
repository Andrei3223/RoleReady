// Local end-to-end test: a fake n8n that answers like the real webhooks, and a run of the Actor against it.
// Usage: npm run test:mock
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8787;
const t0 = Date.now();
let profile = null;
let pipelineAt = null;
const calls = [];
const sec = () => (pipelineAt ? (Date.now() - pipelineAt) / 1000 : -1);

const JOBS = [1, 2, 3].map((i) => ({ id: `linkedin:${i}`, title: `Data Scientist ${i}`, company_name: `Company ${i}`, job_url: `https://linkedin.com/jobs/view/${i}`, location: 'Amsterdam', match_score: 80 + i }));

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname.replace('/webhook/', '');
    calls.push(`${req.method} ${p}`);
    let body = '';
    for await (const c of req) body += c;
    const json = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

    if (p === 'cv.pdf') { res.writeHead(200, { 'content-type': 'application/pdf' }); return res.end('%PDF-1.4 fake cv'); }
    if (p === 'career-profile') {
        if (!body.includes('auth_user_id') || !body.includes('%PDF')) return json(400, { error: 'bad form' });
        setTimeout(() => { profile = { id: 'x', first_name: 'Test', resume: { text: 'cv text' }, positions_of_interest: ['Data Scientist'] }; }, 3000);
        return json(200, { message: 'Workflow got started.' });
    }
    if (p === 'profile') return profile ? json(200, { success: true, profile }) : json(404, { success: false, profile: null });
    if (p === 'courses-regenerate') { pipelineAt = Date.now(); return json(200, { success: true, status: 'started' }); }
    if (p === 'jobs') {
        const s = sec();
        const jobs = s < 20 ? [] : JOBS.map((j, i) => ({ ...j, prep_status: s > 200 + i * 15 ? 'ready' : 'pending', prep: s > 200 + i * 15 ? { plan_markdown: `plan ${i}` } : null }));
        return json(200, { success: true, count: jobs.length, jobs });
    }
    if (p === 'referrals') {
        const s = sec();
        const jobs = s < 30 ? [] : JOBS.filter((_, i) => s > 190 + i * 10).map((j, i) => ({ job_id: j.id, status: i === 2 ? 'no_contacts' : 'drafted', contacts: i === 2 ? [] : [{ contact_name: 'Ann', tier: 'alumni', body: 'Hi' }] }));
        return json(200, { success: true, jobs });
    }
    if (p === 'courses') {
        const s = sec();
        return json(200, { success: true, courses: s > 250 ? [{ course_id: 'course_1_ds', name: 'DS course', updated_at: new Date(pipelineAt + 250000).toISOString(), modules: [] }] : [] });
    }
    json(404, { error: 'unknown' });
});

server.listen(PORT, () => {
    const dir = path.resolve('storage');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'key_value_stores/default'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'key_value_stores/default/INPUT.json'), JSON.stringify({
        cv: `http://localhost:${PORT}/webhook/cv.pdf`, position: 'Data Scientist', city: 'Amsterdam', waitFor: 'everything', maxWaitMinutes: 8, pollIntervalSeconds: 10,
    }));
    const child = spawn('node', ['src/main.js'], { stdio: 'inherit', env: { ...process.env, N8N_BASE_URL: `http://localhost:${PORT}/webhook`, APIFY_LOCAL_STORAGE_DIR: dir, CRAWLEE_STORAGE_DIR: dir } });
    child.on('exit', (code) => {
        console.log(`\nActor exit code ${code} after ${Math.round((Date.now() - t0) / 1000)} s`);
        console.log('Webhook calls:', [...new Set(calls)].join(', '));
        server.close();
        process.exit(code);
    });
});
