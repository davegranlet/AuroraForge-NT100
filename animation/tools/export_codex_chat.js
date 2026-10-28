#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

if (process.argv.length !== 4) {
  throw new Error('Usage: node export_codex_chat.js <codex-session.jsonl> <output.md>');
}

const [sessionPath, outputPath] = process.argv.slice(2).map((value) => path.resolve(value));
const lines = fs.readFileSync(sessionPath, 'utf8').split(/\r?\n/).filter(Boolean);
const messages = [];
let sessionId = null;

function contentText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((item) => item && ['input_text', 'output_text', 'text'].includes(item.type))
    .map((item) => item.text || '')
    .filter(Boolean)
    .join('\n\n')
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/g, '')
    .replace(/<recommended_plugins>[\s\S]*?<\/recommended_plugins>/g, '')
    .replace(/<in-app-browser-context\b[^>]*>[\s\S]*?<\/in-app-browser-context>/g, '')
    .trim();
}

for (const line of lines) {
  const item = JSON.parse(line);
  if (item.type === 'session_meta') sessionId = item.payload?.session_id || item.payload?.id || sessionId;
  if (item.type !== 'response_item' || item.payload?.type !== 'message') continue;
  if (!['user', 'assistant'].includes(item.payload.role)) continue;
  const text = contentText(item.payload.content);
  if (!text) continue;
  messages.push({ timestamp: item.timestamp, role: item.payload.role, text });
}

const header = [
  '# Codex chat transcript',
  '',
  `- Session: \`${sessionId || 'unknown'}\``,
  `- Exported: \`${new Date().toISOString()}\``,
  `- Source: \`${sessionPath}\``,
  '- Scope: visible user and assistant messages only; internal instructions, reasoning, and tool logs are excluded.',
  '',
];

const body = messages.flatMap((message) => [
  `## ${message.role === 'user' ? 'User' : 'Assistant'} — ${message.timestamp}`,
  '',
  message.text,
  '',
]);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, [...header, ...body].join('\n'), 'utf8');
console.log(JSON.stringify({ output: outputPath, sessionId, messages: messages.length }, null, 2));
