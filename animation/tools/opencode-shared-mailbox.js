#!/usr/bin/env node
"use strict";

// Aurora Forge shared, append-only message queue for coordinated OpenCode lanes.
// No dependencies. Writes are serialized with an exclusive lock; notifications
// are recipient-specific cursor files beside the shared JSONL mailbox.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "workflows", "victory-6100-2k19", "opencode-coordination-20261030");
const MAILBOX = path.join(ROOT, "SHARED-EXCHANGE.jsonl");
const VALID_ACTORS = new Set(["codex", "bot-1", "bot-2"]);
const VALID_TYPES = new Set(["question", "answer", "finding", "status", "decision"]);

function usage(code = 0) {
  const out = `Aurora Forge OpenCode shared mailbox\n\n` +
    `Commands:\n` +
    `  node animation/tools/opencode-shared-mailbox.js post --from bot-1 --to codex,bot-2 --type question --subject "..." --body-file <path> [--in-reply-to msg-0001] [--ref <path-or-id>]\n` +
    `  node animation/tools/opencode-shared-mailbox.js read --for codex [--after msg-0001]\n` +
    `  node animation/tools/opencode-shared-mailbox.js pending\n` +
    `  node animation/tools/opencode-shared-mailbox.js watch --for bot-1 [--poll-ms 1000]\n\n` +
    `The JSONL mailbox is append-only. Do not edit or delete prior messages.\n`;
  (code ? process.stderr : process.stdout).write(out);
  process.exit(code);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { _: command ? [command] : [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) throw new Error(`Unexpected argument: ${a}`);
    const key = a.slice(2);
    if (key === "ref") {
      (opts.ref ||= []).push(rest[++i]);
      if (!opts.ref.at(-1)) throw new Error("--ref needs a value");
    } else {
      if (opts[key] !== undefined) throw new Error(`Duplicate option --${key}`);
      opts[key] = rest[++i];
      if (!opts[key] || opts[key].startsWith("--")) throw new Error(`--${key} needs a value`);
    }
  }
  return opts;
}

function loadMessages() {
  if (!fs.existsSync(MAILBOX)) return [];
  const raw = fs.readFileSync(MAILBOX, "utf8");
  return raw.split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); }
    catch (e) { throw new Error(`Mailbox JSONL line ${i + 1} is invalid: ${e.message}`); }
  });
}

function idNumber(id) {
  const m = /^msg-(\d{6})$/.exec(id || "");
  return m ? Number(m[1]) : 0;
}

function getRecipients(value) {
  const list = String(value || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!list.length || list.some(x => x !== "all" && !VALID_ACTORS.has(x))) {
    throw new Error("--to must be a comma-separated list of codex, bot-1, bot-2, or all");
  }
  return [...new Set(list.includes("all") ? ["codex", "bot-1", "bot-2"] : list)].sort();
}

function acquireLock(lockPath) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      return () => { try { fs.closeSync(fd); } finally { try { fs.unlinkSync(lockPath); } catch {} } };
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > 60000) fs.unlinkSync(lockPath);
      } catch {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw new Error("Timed out waiting for the shared mailbox lock");
}

function atomicWrite(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, value, "utf8");
  fs.renameSync(tmp, file);
}

function post(opts) {
  const from = opts.from;
  const type = opts.type;
  if (!VALID_ACTORS.has(from)) throw new Error("--from must be codex, bot-1, or bot-2");
  if (!VALID_TYPES.has(type)) throw new Error("--type must be question, answer, finding, status, or decision");
  const to = getRecipients(opts.to);
  if (to.includes(from)) throw new Error("Do not address a message to its sender");
  if (!opts.subject) throw new Error("--subject is required");
  let body = opts.body;
  if (opts["body-file"]) body = fs.readFileSync(path.resolve(opts["body-file"]), "utf8");
  if (typeof body !== "string" || !body.trim()) throw new Error("Provide non-empty --body or --body-file");
  if (body.length > 40000) throw new Error("Message body exceeds 40,000 characters; attach a repo file and summarize it here");

  fs.mkdirSync(ROOT, { recursive: true });
  const release = acquireLock(path.join(ROOT, ".mailbox.lock"));
  try {
    const messages = loadMessages();
    const seq = messages.reduce((n, m) => Math.max(n, idNumber(m.id)), 0) + 1;
    const msg = {
      id: `msg-${String(seq).padStart(6, "0")}`,
      timestamp: new Date().toISOString(),
      from,
      to,
      type,
      subject: opts.subject,
      inReplyTo: opts["in-reply-to"] || null,
      refs: opts.ref || [],
      body: body.trim()
    };
    fs.appendFileSync(MAILBOX, `${JSON.stringify(msg)}\n`, "utf8");
    for (const recipient of to) {
      atomicWrite(path.join(ROOT, `.notify-${recipient}.json`), JSON.stringify({ id: msg.id, from, subject: msg.subject, timestamp: msg.timestamp }) + "\n");
    }
    process.stdout.write(`${msg.id}\n`);
  } finally { release(); }
}

function formatMessage(m) {
  return `[${m.id}] ${m.timestamp} ${m.from} -> ${m.to.join(",")} (${m.type}) ${m.subject}\n${m.body}\nRefs: ${(m.refs || []).join("; ") || "none"}${m.inReplyTo ? `\nIn reply to: ${m.inReplyTo}` : ""}\n`;
}

function read(opts) {
  const recipient = opts.for;
  if (recipient !== "all" && !VALID_ACTORS.has(recipient)) throw new Error("--for must be codex, bot-1, bot-2, or all");
  const after = idNumber(opts.after);
  const items = loadMessages().filter(m => idNumber(m.id) > after &&
    (recipient === "all" || (m.to || []).includes(recipient) || m.from === recipient));
  process.stdout.write(items.length ? items.map(formatMessage).join("\n") : "No matching messages.\n");
}

function pending() {
  const messages = loadMessages();
  const answered = new Set(messages.filter(m => m.type === "answer" && m.inReplyTo).map(m => m.inReplyTo));
  const open = messages.filter(m => m.type === "question" && !answered.has(m.id));
  process.stdout.write(open.length ? open.map(formatMessage).join("\n") : "No unanswered questions.\n");
}

async function watch(opts) {
  const recipient = opts.for;
  if (!VALID_ACTORS.has(recipient)) throw new Error("--for must be codex, bot-1, or bot-2");
  const pollMs = Math.max(250, Math.min(10000, Number(opts["poll-ms"] || 1000)));
  fs.mkdirSync(ROOT, { recursive: true });
  const cursorPath = path.join(ROOT, `.cursor-${recipient}.txt`);
  let last = fs.existsSync(cursorPath) ? idNumber(fs.readFileSync(cursorPath, "utf8").trim()) : 0;
  process.stdout.write(`Watching shared mailbox for ${recipient} (cursor msg-${String(last).padStart(6, "0")}); Ctrl+C to stop.\n`);
  for (;;) {
    const messages = loadMessages();
    for (const m of messages) {
      const n = idNumber(m.id);
      if (n <= last) continue;
      last = n;
      atomicWrite(cursorPath, `${m.id}\n`);
      if (m.from !== recipient && ((m.to || []).includes(recipient) || (m.to || []).includes("all"))) {
        process.stdout.write(`\nNEW MESSAGE\n${formatMessage(m)}\n`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const command = opts._[0];
  if (!command || command === "help" || command === "--help") usage(0);
  if (command === "post") return post(opts);
  if (command === "read") return read(opts);
  if (command === "pending") return pending();
  if (command === "watch") return watch(opts);
  usage(2);
}

main().catch(e => { process.stderr.write(`mailbox error: ${e.message}\n`); process.exitCode = 1; });
