'use strict';
// Extracts <article id="reference"> from the consolidated HTML, dropping .review-notes blocks,
// and writes readable plain text (one block per line). Read-only on the source HTML.
const fs = require('fs');
const path = require('path');

const src = path.resolve(process.argv[2] || 'docs/private/AURORA-FORGE-CONSOLIDATED-REFERENCE-2026-10-16.html');
const dst = path.resolve(process.argv[3] || 'reference-article.txt');
const html = fs.readFileSync(src, 'utf8');

function findArticleRange(s) {
  const open = /<article\b[^>]*\bid\s*=\s*["']reference["'][^>]*>/i.exec(s);
  if (!open) throw new Error('article#reference not found');
  const start = open.index + open[0].length;
  const closeRe = /<\/article\s*>/gi;
  closeRe.lastIndex = start;
  const close = closeRe.exec(s);
  if (!close) throw new Error('closing </article> not found');
  return { start, end: close.index };
}

// Remove any element whose opening tag carries class containing review-notes (nesting-aware).
function stripReviewNotes(s) {
  let out = s;
  for (;;) {
    const m = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\bclass\s*=\s*["'][^"']*\breview-notes\b[^"']*["'][^>]*>/i.exec(out);
    if (!m) break;
    const tag = m[1].toLowerCase();
    const openRe = new RegExp('<' + tag + '\\b[^>]*>', 'gi');
    const closeRe = new RegExp('</' + tag + '\\s*>', 'gi');
    let depth = 0;
    let endIdx = -1;
    const tokRe = new RegExp('<\\/?' + tag + '\\b[^>]*>', 'gi');
    tokRe.lastIndex = m.index;
    let t;
    while ((t = tokRe.exec(out))) {
      if (t[0][1] === '/') {
        depth -= 1;
        if (depth === 0) { endIdx = t.index + t[0].length; break; }
      } else if (!/\/\s*>$/.test(t[0])) {
        depth += 1;
      }
    }
    if (endIdx < 0) throw new Error('unbalanced review-notes block at ' + m.index);
    out = out.slice(0, m.index) + out.slice(endIdx);
    void openRe; void closeRe;
  }
  return out;
}

function toText(fragment) {
  let s = fragment;
  s = s.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '');
  s = s.replace(/<style\b[\s\S]*?<\/style\s*>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|pre|section|table|ul|ol|blockquote|figcaption|header|footer)\s*>/gi, '\n');
  s = s.replace(/<(h[1-6]|p|div|li|tr|pre|section|table|ul|ol|blockquote|figure)\b[^>]*>/gi, '\n');
  s = s.replace(/<td\b[^>]*>|<th\b[^>]*>/gi, ' | ');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&nbsp;/g, ' ')
       .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
       .replace(/&amp;/g, '&');
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  s = s.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim() + '\n';
}

const r = findArticleRange(html);
const fragment = stripReviewNotes(html.slice(r.start, r.end));
const text = toText(fragment);
fs.writeFileSync(dst, text, 'utf8');
const lines = text.split('\n').length;
process.stdout.write(JSON.stringify({ src, dst, sourceBytes: html.length, articleFragmentChars: fragment.length, textChars: text.length, textLines: lines }) + '\n');
