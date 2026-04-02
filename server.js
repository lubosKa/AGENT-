const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Validator = require("./validator");

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

const JOBS_FILE = path.join(__dirname, "jobs.json");
const USERS_FILE = path.join(__dirname, "users.json");
const METRICS_FILE = path.join(__dirname, "metrics.json");
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_env";
const SALT_ROUNDS = 10;

const validator = new Validator();

function readJSON(file, def) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        return def;
    }
}

function writeJSON(file, obj) {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

function updateMetrics(status) {
    let metrics = readJSON(METRICS_FILE, { total_jobs: 0, completed: 0, failed: 0, pending: 0, success_rate: 0, avg_completion_time_ms: 0, timestamp: new Date().toISOString() });
    const jobs = readJSON(JOBS_FILE, []);
    metrics.total_jobs = jobs.length;
    metrics.completed = jobs.filter(j => j.status === "completed").length;
    metrics.failed = jobs.filter(j => j.status === "failed_permanently").length;
    metrics.pending = jobs.filter(j => j.status === "open" || j.status === "failed_retry").length;
    metrics.success_rate = metrics.total_jobs > 0 ? ((metrics.completed / metrics.total_jobs) * 100).toFixed(2) : 0;

    const completedJobs = jobs.filter(j => j.completed_at && j.started_at);
    if (completedJobs.length > 0) {
        const totalTime = completedJobs.reduce((sum, j) => sum + (new Date(j.completed_at) - new Date(j.started_at)), 0);
        metrics.avg_completion_time_ms = Math.round(totalTime / completedJobs.length);
    }
    metrics.timestamp = new Date().toISOString();
    writeJSON(METRICS_FILE, metrics);
}

app.post("/register", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username and password required" });
    const users = readJSON(USERS_FILE, []);
    if (users.find(u => u.username === username)) return res.status(409).json({ error: "user exists" });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    users.push({ username, password_hash: hash });
    writeJSON(USERS_FILE, users);
    return res.json({ ok: true });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username and password required" });
    const users = readJSON(USERS_FILE, []);
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "12h" });
    return res.json({ ok: true, token });
});

function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ error: "unauthorized" });
    const token = h.slice(7);
    try {
        const p = jwt.verify(token, JWT_SECRET);
        req.user = p;
        next();
    } catch (e) {
        return res.status(401).json({ error: "invalid token" });
    }
}

app.post("/create_job", auth, (req, res) => {
    const { task, price, type } = req.body || {};
    if (!task) return res.status(400).json({ error: "task required" });
    const jobs = readJSON(JOBS_FILE, []);
    const id = "job-" + Date.now();
    const job = { id, job_id: id, task, price: price || null, type: type || "default", status: "open", created_at: new Date().toISOString(), started_at: null, completed_at: null, owner: req.user.username, attempt: 0, retryCount: 0, prompt_history: [], receipt: null, result: null };
    jobs.push(job);
    writeJSON(JOBS_FILE, jobs);
    updateMetrics();
    res.json({ ok: true, job_id: id });
});

app.get("/jobs", (req, res) => {
    const jobs = readJSON(JOBS_FILE, []);
    res.json(jobs);
});

app.get("/jobs/:id", (req, res) => {
    const jobs = readJSON(JOBS_FILE, []);
    const j = jobs.find(x => x.job_id === req.params.id || x.id === req.params.id);
    if (!j) return res.status(404).json({ error: "not found" });
    res.json(j);
});

app.get("/jobs/:id/receipt", auth, (req, res) => {
    const jobs = readJSON(JOBS_FILE, []);
    const j = jobs.find(x => x.job_id === req.params.id || x.id === req.params.id);
    if (!j) return res.status(404).json({ error: "not found" });
    if (!j.receipt) return res.status(404).json({ error: "receipt not available (job not completed)" });
    res.json({ job_id: j.id, receipt: j.receipt, status: j.status, owner: j.owner, completed_at: j.completed_at });
});

app.get("/jobs/:id/history", auth, (req, res) => {
    const jobs = readJSON(JOBS_FILE, []);
    const j = jobs.find(x => x.job_id === req.params.id || x.id === req.params.id);
    if (!j) return res.status(404).json({ error: "not found" });
    res.json({ job_id: j.id, attempt: j.attempt, retryCount: j.retryCount, prompt_history: j.prompt_history || [], status: j.status, created_at: j.created_at, started_at: j.started_at, completed_at: j.completed_at });
});

app.get("/metrics", (req, res) => {
    updateMetrics();
    const metrics = readJSON(METRICS_FILE, { total_jobs: 0, completed: 0, failed: 0, pending: 0, success_rate: 0, avg_completion_time_ms: 0, timestamp: new Date().toISOString() });
    res.json(metrics);
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Server listening on port " + port));
