#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, readlinkSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const host = process.env.OMP_DASHBOARD_HOST ?? "127.0.0.1";
const port = Number(process.env.OMP_DASHBOARD_PORT ?? 9121);
const agentRoot = process.env.PI_CODING_AGENT_DIR ?? `${homedir()}/.omp/agent`;
const sessionRoot = `${agentRoot}/sessions`;
const ompBinary = process.env.OMP_BINARY ?? "omp";

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OMP CLI Dashboard</title>
  <style>
    :root { color-scheme: dark; --bg:#071817; --panel:#0d2523; --panel2:#102d2a; --line:#20403d; --text:#e8f3ef; --muted:#8ea9a4; --accent:#9fe3c4; --warn:#f2c879; --danger:#ef9b9b; }
    * { box-sizing:border-box; }
    body { margin:0; background:radial-gradient(circle at 80% 0%,#123632 0,#071817 42%); color:var(--text); font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { max-width:1260px; margin:0 auto; padding:28px 20px 48px; }
    header { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; margin-bottom:20px; }
    h1 { margin:0 0 5px; font-size:25px; letter-spacing:.01em; }
    h2 { margin:0; font-size:16px; }
    .subtitle,.updated,.muted { color:var(--muted); }
    .updated { text-align:right; white-space:nowrap; }
    .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--accent); margin-right:7px; box-shadow:0 0 12px var(--accent); }
    .tabs { display:flex; gap:8px; margin-bottom:14px; }
    button,.button { border:1px solid var(--line); border-radius:7px; color:var(--text); background:var(--panel); padding:8px 12px; cursor:pointer; font:inherit; text-decoration:none; }
    button:hover,.button:hover,.session:hover { border-color:var(--accent); }
    button.active { background:var(--accent); color:#082019; border-color:var(--accent); }
    button:disabled { cursor:wait; opacity:.55; }
    .cards { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:20px; }
    .card,.table-wrap,.session-panel { border:1px solid var(--line); background:color-mix(in srgb,var(--panel) 92%,transparent); border-radius:10px; }
    .card { padding:15px 18px; }
    .label { color:var(--muted); text-transform:uppercase; letter-spacing:.08em; font-size:11px; }
    .value { margin-top:5px; font-size:28px; font-weight:650; }
    .layout { display:grid; grid-template-columns:340px minmax(0,1fr); gap:14px; align-items:start; }
    .session-panel { overflow:hidden; }
    .panel-head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:15px 16px; border-bottom:1px solid var(--line); }
    .session-list { max-height:620px; overflow:auto; }
    .session { display:block; width:100%; text-align:left; border:0; border-bottom:1px solid color-mix(in srgb,var(--line) 70%,transparent); border-radius:0; padding:14px 16px; background:transparent; }
    .session.selected { background:var(--panel2); box-shadow:inset 3px 0 var(--accent); }
    .session-title { display:block; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .session-meta { display:block; margin-top:4px; color:var(--muted); font-size:12px; }
    .empty { padding:34px 18px; text-align:center; color:var(--muted); }
    .chat { min-height:620px; display:flex; flex-direction:column; }
    .chat-head { padding:15px 18px; border-bottom:1px solid var(--line); }
    .chat-title { font-size:17px; font-weight:650; }
    .chat-cwd { margin-top:4px; color:var(--muted); font:12px ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap:anywhere; }
    .messages { flex:1; min-height:420px; max-height:590px; overflow:auto; padding:18px; }
    .message { max-width:88%; margin:0 0 14px; padding:10px 12px; border:1px solid var(--line); border-radius:9px; white-space:pre-wrap; overflow-wrap:anywhere; }
    .message.user { margin-left:auto; background:#164239; }
    .message.assistant { background:#0a201f; }
    .message-role { margin-bottom:5px; color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.08em; }
    .composer { display:flex; gap:8px; padding:14px 18px; border-top:1px solid var(--line); }
    textarea { flex:1; min-height:42px; max-height:140px; resize:vertical; border:1px solid var(--line); border-radius:7px; padding:10px; color:var(--text); background:#071817; font:inherit; }
    textarea:focus { outline:1px solid var(--accent); }
    .notice { padding:8px 18px 0; color:var(--warn); font-size:12px; }
    .table-wrap { margin-top:14px; overflow:hidden; }
    .table-head { display:flex; justify-content:space-between; align-items:center; padding:15px 18px; border-bottom:1px solid var(--line); }
    .refresh { color:var(--muted); font-size:12px; }
    table { width:100%; border-collapse:collapse; }
    th,td { text-align:left; padding:11px 16px; border-bottom:1px solid color-mix(in srgb,var(--line) 70%,transparent); vertical-align:top; }
    th { color:var(--muted); text-transform:uppercase; letter-spacing:.06em; font-size:10px; font-weight:600; }
    tr:last-child td { border-bottom:0; }
    code { color:var(--accent); font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap:anywhere; }
    .pill { display:inline-block; padding:3px 8px; border:1px solid var(--line); border-radius:999px; color:var(--accent); font-size:11px; }
    .pill.worker { color:var(--warn); }
    .error { color:var(--danger); padding:8px 18px; font-size:12px; }
    @media (max-width:800px) { main { padding:20px 12px 32px; } header { display:block; } .updated { margin-top:10px; text-align:left; } .cards { grid-template-columns:1fr; } .layout { grid-template-columns:1fr; } .session-list { max-height:280px; } .chat { min-height:540px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div><h1>OMP CLI Dashboard</h1><div class="subtitle">Sessions, transcripts and local CLI processes</div></div>
      <div class="updated"><span class="dot"></span><span id="status">Connecting…</span><br><span id="time"></span></div>
    </header>
    <nav class="tabs"><button id="sessions-tab" class="active" type="button">Sessions</button><button id="processes-tab" type="button">Processes</button></nav>
    <section class="cards" aria-label="OMP summary">
      <div class="card"><div class="label">Sessions</div><div class="value" id="session-count">—</div></div>
      <div class="card"><div class="label">Active CLI</div><div class="value" id="cli-count">—</div></div>
      <div class="card"><div class="label">Projects</div><div class="value" id="project-count">—</div></div>
    </section>
    <section id="sessions-view" class="layout">
      <div class="session-panel"><div class="panel-head"><h2>Sessions</h2><span class="muted" id="session-refresh">Live</span></div><div id="session-list" class="session-list"><div class="empty">Loading…</div></div></div>
      <div class="session-panel chat"><div id="chat-head" class="chat-head"><h2>Select a session</h2></div><div id="messages" class="messages"><div class="empty">Choose a session to view its transcript.</div></div><div id="notice" class="notice"></div><form id="composer" class="composer" hidden><textarea id="message-input" placeholder="Send a message to this session…" required></textarea><button type="submit">Send</button></form></div>
    </section>
    <section id="processes-view" class="table-wrap" hidden><div class="table-head"><h2>Open OMP processes</h2><div class="refresh">Auto-refresh: 2s</div></div><div id="process-table"><div class="empty">Loading…</div></div></section>
  </main>
  <script>
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#39;"}[char]));
    let sessions = [];
    let selected = null;
    const sessionList = document.querySelector("#session-list");
    const messages = document.querySelector("#messages");
    const composer = document.querySelector("#composer");
    const input = document.querySelector("#message-input");
    const setStatus = (text) => { document.querySelector("#status").textContent = text; document.querySelector("#time").textContent = "Updated " + new Date().toLocaleTimeString(); };
    const renderProcesses = (data) => {
      document.querySelector("#cli-count").textContent = data.counts.cli;
      document.querySelector("#project-count").textContent = data.counts.projects;
      const rows = data.instances.map((item) => '<tr><td><span class="pill ' + (item.type === "worker" ? "worker" : "") + '">' + esc(item.type) + '</span></td><td><code>' + esc(item.command) + '</code></td><td><code>' + esc(item.cwd) + '</code></td><td><code>' + esc(item.pid) + '</code><br><span class="muted">' + esc(item.state) + ' · ' + esc(item.elapsed) + '</span></td></tr>').join("");
      document.querySelector("#process-table").innerHTML = rows ? '<table><thead><tr><th>Type</th><th>Command</th><th>Working directory</th><th>Process</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="empty">No OMP processes found.</div>';
    };
    const renderSessionList = () => {
      document.querySelector("#session-count").textContent = sessions.length;
      sessionList.innerHTML = sessions.length ? sessions.map((item) => '<button class="session ' + (selected === item.id ? "selected" : "") + '" data-id="' + esc(item.id) + '" type="button"><span class="session-title">' + esc(item.title) + '</span><span class="session-meta">' + esc(item.cwd) + '<br>' + esc(item.updatedLabel) + ' · ' + esc(item.messageCount) + ' messages</span></button>').join("") : '<div class="empty">No saved sessions found.</div>';
      sessionList.querySelectorAll("[data-id]").forEach((button) => button.addEventListener("click", () => openSession(button.dataset.id)));
    };
    const renderConversation = (data) => {
      document.querySelector("#chat-head").innerHTML = '<div class="chat-title">' + esc(data.title) + '</div><div class="chat-cwd">' + esc(data.cwd) + ' · ' + esc(data.id) + '</div>';
      messages.innerHTML = data.messages.length ? data.messages.map((item) => '<article class="message ' + esc(item.role) + '"><div class="message-role">' + esc(item.role) + '</div>' + esc(item.text) + '</article>').join("") : '<div class="empty">No user or assistant messages yet.</div>';
      messages.scrollTop = messages.scrollHeight;
      composer.hidden = false;
      input.focus();
    };
    async function openSession(id) {
      selected = id; renderSessionList(); messages.innerHTML = '<div class="empty">Loading transcript…</div>';
      const response = await fetch("/api/sessions/" + encodeURIComponent(id), {cache:"no-store"});
      if (!response.ok) { messages.innerHTML = '<div class="error">Could not load this session.</div>'; return; }
      renderConversation(await response.json());
    }
    async function load() {
      try {
        const [sessionResponse, processResponse] = await Promise.all([fetch("/api/sessions", {cache:"no-store"}), fetch("/api/cli", {cache:"no-store"})]);
        if (!sessionResponse.ok || !processResponse.ok) throw new Error("dashboard request failed");
        sessions = await sessionResponse.json(); renderSessionList(); renderProcesses(await processResponse.json()); setStatus("Live");
        if (selected && sessions.some((item) => item.id === selected)) await openSession(selected);
        else if (!selected && sessions[0]) await openSession(sessions[0].id);
      } catch { setStatus("Unavailable"); }
    }
    document.querySelector("#sessions-tab").addEventListener("click", () => { document.querySelector("#sessions-tab").classList.add("active"); document.querySelector("#processes-tab").classList.remove("active"); document.querySelector("#sessions-view").hidden = false; document.querySelector("#processes-view").hidden = true; });
    document.querySelector("#processes-tab").addEventListener("click", () => { document.querySelector("#processes-tab").classList.add("active"); document.querySelector("#sessions-tab").classList.remove("active"); document.querySelector("#sessions-view").hidden = true; document.querySelector("#processes-view").hidden = false; });
    composer.addEventListener("submit", async (event) => {
      event.preventDefault(); if (!selected || !input.value.trim()) return;
      const button = composer.querySelector("button"); button.disabled = true; document.querySelector("#notice").textContent = "Sending through omp --resume…";
      try { const response = await fetch("/api/sessions/" + encodeURIComponent(selected) + "/messages", {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({message:input.value.trim()})}); const result = await response.json(); if (!response.ok) throw new Error(result.error || "send failed"); input.value = ""; await load(); await openSession(selected); document.querySelector("#notice").textContent = ""; }
      catch (error) { document.querySelector("#notice").textContent = error.message; } finally { button.disabled = false; }
    });
    load(); setInterval(load, 2000);
  </script>
</body>
</html>`;

function processType(command) {
  if (command.includes(" stats ") || command.endsWith(" stats")) return "dashboard";
  if (command.includes("__omp_worker_")) return "worker";
  return "cli";
}

function cwdFor(pid) {
  try { const link = `/proc/${pid}/cwd`; return existsSync(link) ? readlinkSync(link) : "—"; } catch { return "—"; }
}

async function readProcesses() {
  const { stdout } = await execFileAsync("ps", ["-eo", "pid=,ppid=,stat=,etime=,args="], {maxBuffer:2 * 1024 * 1024});
  const instances = [];
  for (const line of stdout.split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const [, pid, ppid, state, elapsed, command] = match;
    if (!/^\/.*(?:^|\/)omp(?:\s|$)|^omp(?:\s|$)/.test(command)) continue;
    instances.push({pid:Number(pid), ppid:Number(ppid), state, elapsed, command, cwd:cwdFor(pid), type:processType(command)});
  }
  const projects = new Set(instances.map((item) => item.cwd).filter((cwd) => cwd !== "—")).size;
  return {generatedAt:new Date().toISOString(), counts:{cli:instances.filter((item) => item.type === "cli").length, total:instances.length, projects}, instances};
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("\n");
}

function parseSession(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  let session = null;
  let title = "Untitled session";
  let updatedAt = statSync(file).mtime.toISOString();
  const messages = [];
  for (const line of lines) {
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      if (record.type === "session") { session = record; title = record.title || title; updatedAt = record.timestamp || updatedAt; }
      if (record.type === "title" && record.title) title = record.title;
      if (record.type === "message" && (record.message?.role === "user" || record.message?.role === "assistant")) {
        const text = textFromContent(record.message.content);
        if (text) messages.push({role:record.message.role, text, timestamp:record.timestamp});
      }
      if (record.timestamp && record.timestamp > updatedAt) updatedAt = record.timestamp;
    } catch { /* Ignore a partially written final JSONL line. */ }
  }
  if (!session?.id) return null;
  return {id:session.id, file, cwd:session.cwd || "—", title, updatedAt, messageCount:messages.length, messages};
}

function sessionFiles() {
  if (!existsSync(sessionRoot)) return [];
  const files = [];
  for (const project of readdirSync(sessionRoot, {withFileTypes:true})) {
    if (!project.isDirectory()) continue;
    for (const entry of readdirSync(`${sessionRoot}/${project.name}`, {withFileTypes:true})) {
      if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(`${sessionRoot}/${project.name}/${entry.name}`);
    }
  }
  return files;
}

function allSessions() {
  return sessionFiles().map((file) => { try { return parseSession(file); } catch { return null; } }).filter(Boolean).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}

function findSession(id) {
  return allSessions().find((session) => session.id === id) || null;
}

function json(response, status, body) {
  response.writeHead(status, {"content-type":"application/json; charset=utf-8", "cache-control":"no-store"});
  response.end(JSON.stringify(body));
}

async function bodyOf(request) {
  let body = "";
  for await (const chunk of request) { body += chunk; if (body.length > 20000) throw new Error("message is too long"); }
  return JSON.parse(body || "{}");
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}`);
  if (request.method === "GET" && url.pathname === "/api/cli") { try { json(response, 200, await readProcesses()); } catch (error) { json(response, 500, {error:error instanceof Error ? error.message : "Unable to read processes"}); } return; }
  if (request.method === "GET" && url.pathname === "/api/sessions") {
    json(response, 200, allSessions().map((session) => ({...session, file:undefined, messages:undefined, updatedLabel:new Date(session.updatedAt).toLocaleString()}))); return;
  }
  const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/messages)?$/);
  if (sessionMatch) {
    const id = decodeURIComponent(sessionMatch[1]);
    const session = findSession(id);
    if (!session) { json(response, 404, {error:"Session not found"}); return; }
    if (request.method === "GET") { json(response, 200, {...session, updatedLabel:new Date(session.updatedAt).toLocaleString()}); return; }
    if (request.method === "POST" && url.pathname.endsWith("/messages")) {
      try {
        const input = await bodyOf(request);
        const message = typeof input.message === "string" ? input.message.trim() : "";
        if (!message) { json(response, 400, {error:"Message is required"}); return; }
        const result = await execFileAsync(ompBinary, ["-p", `--resume=${session.file}`, message], {cwd:session.cwd === "—" ? undefined : session.cwd, timeout:10 * 60 * 1000, maxBuffer:4 * 1024 * 1024});
        json(response, 200, {ok:true, output:result.stdout});
      } catch (error) { json(response, 500, {error:error instanceof Error ? error.message : "Unable to send message"}); }
      return;
    }
  }
  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) { response.writeHead(200, {"content-type":"text/html; charset=utf-8", "cache-control":"no-store"}); response.end(page); return; }
  json(response, 404, {error:"Not found"});
});

server.listen(port, host, () => console.log(`OMP CLI Dashboard listening on http://${host}:${port}`));
process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
