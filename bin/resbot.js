#!/usr/bin/env node
// RESBOT CLI: zero dependencies, Node >= 18.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const TEMPLATES = path.join(ROOT, 'resbot', 'skills', 'ch7', 'templates');
const REPO = 'Bujjinga/Resbot';
const PLUGIN_ID = 'resbot@resbot-local';
const IS_WIN = process.platform === 'win32';
const env = process.env;

const CLAUDE = env.RESBOT_CLAUDE_BIN || 'claude';
const KAGGLE = env.RESBOT_KAGGLE_BIN || 'kaggle';
const ARXIV_API = env.RESBOT_ARXIV_API || 'https://export.arxiv.org/api/query';
const CROSSREF_API = env.RESBOT_CROSSREF_API || 'https://api.crossref.org/works';

class UserError extends Error {}
const die = (msg) => { throw new UserError(msg); };

// ---------- process helpers ----------
const winQuote = (a) => (/[\s"&|<>^]/.test(a) ? '"' + a.replace(/"/g, '""') + '"' : a);
function run(cmd, args, opts = {}) {
  // .cmd shims (claude, npm, kaggle) need a shell on Windows.
  const shell = IS_WIN && !opts.noShell;
  const r = spawnSync(shell ? winQuote(cmd) : cmd, shell ? args.map(winQuote) : args, {
    encoding: 'utf8', shell, cwd: opts.cwd, timeout: opts.timeout || 0,
    stdio: opts.inherit ? 'inherit' : 'pipe', env: opts.env || env,
  });
  return { ok: r.status === 0, code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), missing: !!r.error };
}
const has = (cmd, args = ['--version']) => run(cmd, args, { timeout: 20000 });

// ---------- workspace helpers ----------
const wsRoot = () => path.resolve(env.RESBOT_WORKSPACE || path.join(process.cwd(), 'resbot-workspace'));
const today = () => new Date().toISOString().slice(0, 10);

function slugFromUrl(url) {
  let u;
  try { u = new URL(url); } catch { die(`Not a URL: ${url}`); }
  if (!/(^|\.)kaggle\.com$/.test(u.hostname)) die('RESBOT only works with kaggle.com URLs.');
  const parts = u.pathname.split('/').filter((p) => p && p !== 'edit' && p !== 'notebook');
  if (!parts.length) die(`Cannot find a notebook slug in ${url}`);
  return parts[parts.length - 1].toLowerCase();
}

function checkSlug(slug) {
  if (!slug || !/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(slug)) die(`Invalid slug "${slug}" (use letters, digits, . _ -).`);
  return slug;
}

function pickSlug(slug) {
  const root = wsRoot();
  if (slug) {
    checkSlug(slug);
    if (!fs.existsSync(path.join(root, slug))) die(`No workspace "${slug}" in ${root}. Create it: resbot new ${slug}`);
    return slug;
  }
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory()) : [];
  if (!dirs.length) die(`No workspaces in ${root}. Create one: resbot new <slug>`);
  const mtime = (d) => { try { return fs.statSync(path.join(root, d, 'state.md')).mtimeMs; } catch { return 0; } };
  return dirs.sort((a, b) => mtime(b) - mtime(a))[0];
}

const wsPath = (slug, ...p) => path.join(wsRoot(), slug, ...p);
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
function writeIfMissing(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, content);
}

function createWorkspace(slug, { url = 'TBD', goal = 'TBD' } = {}) {
  checkSlug(slug);
  const dir = wsPath(slug);
  for (const d of ['cells', 'outputs', 'notes', 'papers']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const fill = (name) => fs.readFileSync(path.join(TEMPLATES, name), 'utf8')
    .replace(/{{slug}}/g, slug).replace(/{{url}}/g, url).replace(/{{goal}}/g, goal).replace(/{{date}}/g, today());
  writeIfMissing(path.join(dir, 'config.md'),
    `# Config: ${slug}\n\n- url: ${url}\n- slug: ${slug}\n- created: ${today()}\n- goal: ${goal}\n- editor_path: TBD\n- insert_method: TBD\n- run_method: TBD\n- kaggle: TBD\n`);
  writeIfMissing(path.join(dir, 'state.md'), fill('state.md'));
  writeIfMissing(path.join(dir, 'cell_tree.md'), fill('cell_tree.md'));
  for (const n of ['hypotheses', 'literature', 'experiments']) writeIfMissing(path.join(dir, 'notes', `${n}.md`), fill(`${n}.md`));
  writeIfMissing(path.join(dir, 'notes', 'report.md'), fill('report.md'));
  writeIfMissing(path.join(dir, 'notes', 'ideas.md'), `# Ideas: ${slug}\n\nRanked next experiments (paper-inspired ones carry their citation).\n\n`);
  writeIfMissing(path.join(dir, 'notes', 'kaggle_intel.md'), `# Kaggle intel: ${slug}\n\n`);
  writeIfMissing(path.join(dir, 'notes', 'dataset_card.md'), `# Dataset card: ${slug}\n\n`);
  writeIfMissing(path.join(dir, 'notes', 'results.csv'), 'exp_id,hypothesis,metric,mean,std,n_seeds,verdict\n');
  writeIfMissing(path.join(dir, 'notes', 'references.bib'), '');
  return dir;
}

// Parse a markdown table into [{header: value}] rows.
function parseTable(md) {
  const lines = md.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, i) => [head[i], c])));
}

// ---------- statistics (Welch t-test from summary stats) ----------
function lgamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x; const t = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let s = 1.000000000190015; for (const c of g) s += c / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a, b, x) {
  let c = 1, d = 1 - (a + b) * x / (a + 1); d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    for (const aa of [m * (b - m) * x / ((a + m2 - 1) * (a + m2)), -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1))]) {
      d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      h *= d * c;
    }
    if (Math.abs(d * c - 1) < 1e-12) break;
  }
  return h;
}
function ibeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
const tTwoSidedP = (t, df) => ibeta(df / 2, 0.5, df / (df + t * t));
function welch(m1, s1, n1, m2, s2, n2) {
  const v1 = s1 * s1 / n1, v2 = s2 * s2 / n2;
  const se = Math.sqrt(v1 + v2);
  if (se === 0) return { t: m1 === m2 ? 0 : Infinity, df: n1 + n2 - 2, p: m1 === m2 ? 1 : 0 };
  const t = (m1 - m2) / se;
  const df = (v1 + v2) ** 2 / ((v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1));
  return { t, df, p: tTwoSidedP(t, df) };
}
function parseMetric(s) {
  const m = String(s || '').match(/(-?[\d.]+(?:e-?\d+)?)\s*(?:±|\+\/-|\+-)\s*([\d.]+(?:e-?\d+)?)/i);
  return m ? { mean: +m[1], std: +m[2] } : null;
}
function parseSeeds(s) {
  s = String(s || '').trim();
  if (/^\d+$/.test(s)) return +s;
  return s.split(/[,\s;]+/).filter(Boolean).length;
}

// ---------- paper metadata ----------
const xmlText = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/\s+/g, ' ').trim()
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : '';
};
async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': `resbot-cli/${PKG.version}` }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) die(`HTTP ${r.status} from ${url}`);
  return r.text();
}
async function fetchArxiv(id) {
  const xml = await getText(`${ARXIV_API}?id_list=${encodeURIComponent(id)}`);
  const entry = (xml.match(/<entry>([\s\S]*?)<\/entry>/) || [])[1];
  if (!entry || !xmlText(entry, 'title') || xmlText(entry, 'title') === 'Error') die(`arXiv has no paper ${id}`);
  const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1].trim());
  return { source: 'arXiv API', id, title: xmlText(entry, 'title'), authors, year: xmlText(entry, 'published').slice(0, 4),
    venue: xmlText(entry, 'arxiv:journal_ref') || 'arXiv', doi: xmlText(entry, 'arxiv:doi'), arxiv: id,
    url: `https://arxiv.org/abs/${id}`, abstract: xmlText(entry, 'summary') };
}
async function fetchCrossref(doi) {
  const j = JSON.parse(await getText(`${CROSSREF_API}/${encodeURIComponent(doi)}`)).message;
  if (!j || !j.title) die(`Crossref has no record for ${doi}`);
  return { source: 'Crossref API', id: doi, title: (j.title || [])[0] || '', year: String(((j.issued || {})['date-parts'] || [[]])[0][0] || ''),
    authors: (j.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ') || a.name).filter(Boolean),
    venue: (j['container-title'] || [])[0] || '', doi: j.DOI || doi, arxiv: '', url: j.URL || `https://doi.org/${doi}`,
    abstract: (j.abstract || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() };
}
function bibtex(p) {
  const first = (p.authors[0] || 'anon').split(' ').pop().toLowerCase().replace(/[^a-z]/g, '') || 'anon';
  const word = (p.title.split(/\s+/).find((w) => w.length > 3) || 'paper').toLowerCase().replace(/[^a-z]/g, '');
  const key = `${first}${p.year}${word}`;
  const f = [['title', `{${p.title}}`], ['author', p.authors.join(' and ')], ['year', p.year], ['journal', p.venue],
    ['doi', p.doi], ['eprint', p.arxiv], ['archivePrefix', p.arxiv ? 'arXiv' : ''], ['url', p.url]].filter(([, v]) => v);
  return { key, text: `@article{${key},\n${f.map(([k, v]) => `  ${k} = {${v}}`).join(',\n')}\n}\n` };
}

// ---------- update check (at most once per day) ----------
async function updateCheck(cmd) {
  if (env.RESBOT_NO_UPDATE_CHECK === '1' || env.CI || !process.stdout.isTTY || ['completions', 'version', 'update'].includes(cmd)) return;
  const file = path.join(os.homedir(), '.cache', 'resbot', 'update-check.json');
  const report = (tag) => {
    const v = (s) => String(s || '').replace(/^v/, '').split('.').map(Number);
    const [a, b] = [v(tag), v(PKG.version)];
    if (tag && (a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) > 0) console.error(`update available (${tag}): resbot update`);
  };
  let st = {}; try { st = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (st.checked && Date.now() - st.checked < 864e5) return report(st.latest);
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'resbot-cli' }, signal: AbortSignal.timeout(1500) });
    st = { checked: Date.now(), latest: r.ok ? (await r.json()).tag_name : st.latest };
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(st));
  } catch { return; }
  report(st.latest);
}

// ---------- commands ----------
function launchClaude(prompt) {
  const r = run(CLAUDE, ['--chrome', prompt], { inherit: true });
  if (r.missing) die('Claude Code not found. Install it, then run: resbot doctor');
  process.exitCode = r.code || 0;
}

function runInstaller(name, args) {
  const r = IS_WIN
    ? run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, `${name}.ps1`), ...args], { inherit: true, noShell: true })
    : run('bash', [path.join(ROOT, `${name}.sh`), ...args], { inherit: true });
  process.exitCode = r.code || 0;
}

async function doctor() {
  let bad = 0;
  const line = (ok, label, fix, optional) => {
    console.log(`${ok ? '✓' : optional ? '-' : '✗'} ${label}${ok || !fix ? '' : `\n    fix: ${fix}`}`);
    if (!ok && !optional) bad++;
  };
  const cl = has(CLAUDE);
  line(cl.ok, `Claude Code ${cl.ok ? cl.out.split('\n')[0] : 'not found'}`, 'install Claude Code (https://docs.claude.com/en/docs/claude-code), then rerun');
  let installed = false;
  if (cl.ok) { const l = run(CLAUDE, ['plugin', 'list', '--json'], { timeout: 30000 }); installed = l.ok && l.out.includes(`"${PLUGIN_ID}"`); }
  line(installed, `plugin ${PLUGIN_ID} ${installed ? 'installed' : 'not installed'}`, 'resbot install');
  const nodeMajor = +process.versions.node.split('.')[0];
  line(nodeMajor >= 18, `Node ${process.versions.node}`, 'install Node 18+ (https://nodejs.org)');
  const py = [IS_WIN ? 'python' : 'python3', 'python3', 'py'].map((c) => has(c)).find((r) => r.ok);
  const pv = py ? (py.out || py.err).match(/(\d+)\.(\d+)/) : null;
  line(!!pv && (+pv[1] > 3 || (+pv[1] === 3 && +pv[2] >= 10)), `Python ${pv ? pv[0] : 'not found'} (3.10+ for kaggle/graphify)`, 'install Python 3.10+ (https://www.python.org)', true);
  line(has('git').ok, 'git', 'install git (https://git-scm.com)', true);
  line(has('graphify').ok, 'graphify (optional)', 'resbot graphify', true);
  const kg = has(KAGGLE);
  line(kg.ok, `kaggle CLI ${kg.ok ? kg.out : 'not found'} (optional)`, 'pip install kaggle', true);
  const cfg = env.KAGGLE_CONFIG_DIR || path.join(os.homedir(), '.kaggle');
  const token = !!(env.KAGGLE_API_TOKEN || (env.KAGGLE_USERNAME && env.KAGGLE_KEY) || fs.existsSync(path.join(cfg, 'kaggle.json')) || fs.existsSync(path.join(cfg, 'access_token')));
  line(token, `Kaggle API token ${token ? 'present' : 'not found'} (optional, never printed)`, 'kaggle.com → Settings → API → Create New Token, save to ~/.kaggle/kaggle.json', true);
  if (cl.ok && env.RESBOT_DOCTOR_SKIP_MCP !== '1') {
    const m = run(CLAUDE, ['mcp', 'list'], { timeout: 30000 });
    line(/consensus/i.test(m.out), 'Consensus MCP (optional)', 'connect Consensus in claude.ai connector settings or with `claude mcp add`', true);
  }
  if (env.RESBOT_DOCTOR_OFFLINE !== '1') {
    for (const host of ['api.semanticscholar.org', 'export.arxiv.org', 'www.kaggle.com']) {
      let ok = false; try { await fetch(`https://${host}/`, { method: 'HEAD', signal: AbortSignal.timeout(6000) }); ok = true; } catch {}
      line(ok, `reach ${host}`, 'check your network / proxy', true);
    }
  }
  console.log('\nReminders:\n  • Install the Claude in Chrome extension and connect it (/chrome inside Claude Code, or `claude --chrome`).\n  • Sign in to kaggle.com in that Chrome profile yourself; RESBOT never types passwords or tokens.');
  if (bad) process.exitCode = 1;
}

async function paper(args) {
  const slugI = args.indexOf('--slug');
  const slug = pickSlug(slugI >= 0 ? args.splice(slugI, 2)[1] : undefined);
  const id = args[0] || die('usage: resbot paper <arxiv-id|doi|pdf> [--slug s]');
  const dir = wsPath(slug, 'papers');
  fs.mkdirSync(dir, { recursive: true });
  if (/\.pdf$/i.test(id) && !/^https?:/.test(id)) {
    if (!fs.existsSync(id)) die(`File not found: ${id}`);
    const base = path.basename(id, path.extname(id)).replace(/[^\w.-]/g, '_');
    fs.copyFileSync(id, path.join(dir, `${base}.pdf`));
    writeIfMissing(path.join(dir, `${base}.md`), `# ${base}\n\n- Source: local PDF (papers/${base}.pdf)\n- Verified: UNVERIFIED (no API metadata)\n\nRun \`/resbot:ch7 paper papers/${base}.pdf\` to summarize it.\n`);
    return console.log(`Copied PDF to ${path.join(dir, base + '.pdf')} (UNVERIFIED; no BibTeX added).`);
  }
  const clean = id.replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^arxiv:/i, '').replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//, '').replace(/\.pdf$/, '');
  let p;
  if (/^10\.\d{4,9}\/\S+$/.test(clean)) p = await fetchCrossref(clean);
  else if (/^(\d{4}\.\d{4,5}|[a-z-]+(\.[A-Z]{2})?\/\d{7})(v\d+)?$/i.test(clean)) p = await fetchArxiv(clean);
  else die(`Not an arXiv id, DOI, or .pdf: ${id}`);
  const file = path.join(dir, `${clean.replace(/[^\w.-]/g, '_')}.md`);
  fs.writeFileSync(file, `# ${p.title}\n\n- Authors: ${p.authors.join(', ')}\n- Year: ${p.year}\n- Venue: ${p.venue}\n- DOI: ${p.doi || 'n/a'}\n- arXiv: ${p.arxiv || 'n/a'}\n- URL: ${p.url}\n- Verified: yes (${p.source})\n\n## Abstract\n\n${p.abstract || 'n/a'}\n\n## Problem\n\n## Method\n\n## Dataset\n\n## Metric and numbers\n\n## Code\n\n## Reusable here\n`);
  const bib = wsPath(slug, 'notes', 'references.bib');
  const b = bibtex(p);
  if (!readIf(bib).includes(`{${b.key},`)) fs.appendFileSync(bib, (readIf(bib) ? '\n' : '') + b.text);
  console.log(`Saved ${file}\nBibTeX key: ${b.key}`);
}

function compare(args) {
  if (args.length < 3) die('usage: resbot compare <slug> <exp-a> <exp-b>');
  const [slug, a, b] = [pickSlug(args[0]), args[1], args[2]];
  const rows = parseTable(readIf(wsPath(slug, 'notes', 'experiments.md')));
  const get = (id) => {
    const r = rows.find((x) => (x['exp id'] || '').toLowerCase() === id.toLowerCase()) || die(`Experiment ${id} not in experiments.md`);
    const m = parseMetric(r['metric mean ± std']) || die(`Experiment ${id} has no "mean ± std" metric`);
    return { ...m, n: parseSeeds(r.seeds) };
  };
  const [A, B] = [get(a), get(b)];
  const fmt = (x) => +x.toPrecision(4);
  console.log(`${a}: ${fmt(A.mean)} ± ${fmt(A.std)} (n=${A.n})\n${b}: ${fmt(B.mean)} ± ${fmt(B.std)} (n=${B.n})\nΔ (${a} − ${b}): ${fmt(A.mean - B.mean)}`);
  if (A.n < 2 || B.n < 2) return console.log('verdict: inconclusive (need ≥2 seeds each, ≥3 recommended)');
  const w = welch(A.mean, A.std, A.n, B.mean, B.std, B.n);
  console.log(`Welch t = ${fmt(w.t)}, df = ${fmt(w.df)}, p = ${fmt(w.p)}`);
  console.log(`verdict: ${A.n < 3 || B.n < 3 ? 'inconclusive (n<3)' : w.p < 0.05 ? 'significant at 0.05' : 'not significant at 0.05'}`);
  console.log('note: summary-stat Welch test; for a paired test on per-seed scores run /resbot:ch7 compare inside Claude Code.');
}

function exportWs(args) {
  const zip = args.includes('--zip');
  const slug = pickSlug(args.find((x) => !x.startsWith('--')));
  const dir = wsPath(slug);
  if (zip) {
    const out = path.resolve(`${slug}.zip`);
    const r = IS_WIN
      ? run('powershell', ['-NoProfile', '-Command', `Compress-Archive -Force -Path '${dir}' -DestinationPath '${out}'`], { noShell: true })
      : run('zip', ['-qr', out, slug], { cwd: wsRoot(), timeout: 120000 });
    if (r.missing) die('zip not found; install zip or run `resbot export` without --zip');
    if (!r.ok) die(`zip failed: ${r.err}`);
    return console.log(`Wrote ${out}`);
  }
  const files = [];
  const walk = (d) => fs.readdirSync(d).sort().forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (f !== 'graphify-out' && f !== 'remote') walk(p); } else if (/\.(md|py|csv|bib)$/.test(f)) files.push(p);
  });
  walk(dir);
  const order = (p) => ['state.md', 'config.md', 'cell_tree.md'].indexOf(path.basename(p)) + 1 || 9;
  files.sort((x, y) => order(x) - order(y));
  const out = path.resolve(`${slug}-export.md`);
  fs.writeFileSync(out, `# RESBOT export: ${slug}\n\nExported ${new Date().toISOString()}\n` + files.map((f) => {
    const rel = path.relative(dir, f).split(path.sep).join('/');
    const body = fs.readFileSync(f, 'utf8');
    return `\n---\n\n## ${rel}\n\n` + (/\.(py|csv|bib)$/.test(f) ? '```' + (f.endsWith('.py') ? 'python' : '') + `\n${body.trimEnd()}\n` + '```\n' : body);
  }).join(''));
  console.log(`Wrote ${out} (${files.length} files)`);
}

function parseEvery(s) {
  const m = String(s).match(/^(\d+)(s|m|h)?$/) || die(`Bad --every value: ${s} (e.g. 30s, 5m, 1h)`);
  return +m[1] * { s: 1, m: 60, h: 3600 }[m[2] || 'm'] * 1000;
}
async function watch(args) {
  const k = args[0] || die('usage: resbot watch <owner/kernel> [--every 5m]');
  const ei = args.indexOf('--every');
  const ms = parseEvery(ei >= 0 ? args[ei + 1] : '5m');
  console.log(`Watching ${k} every ${ms / 1000}s (Ctrl+C to stop)`);
  for (;;) {
    const r = run(KAGGLE, ['kernels', 'status', k], { timeout: 60000 });
    if (r.missing) die('kaggle CLI not found: pip install kaggle');
    const s = (r.out || r.err).toLowerCase();
    const status = (s.match(/status\s+"?([\w.]+)"?/) || [])[1] || s;
    console.log(`${new Date().toLocaleTimeString()}  ${status}`);
    if (r.ok && !/running|queued|pending/.test(status)) {
      process.stdout.write('\x07');
      const msg = `${k}: ${status}`;
      if (process.platform === 'darwin') run('osascript', ['-e', `display notification ${JSON.stringify(msg)} with title "RESBOT"`]);
      else if (IS_WIN) run('powershell', ['-NoProfile', '-Command', '[console]::beep(880,300)'], { noShell: true });
      else run('notify-send', ['RESBOT', msg]);
      return;
    }
    await new Promise((res) => setTimeout(res, ms));
  }
}

function kaggle(args, label) {
  const r = run(KAGGLE, args, { inherit: true });
  if (r.missing) die(`kaggle CLI not found (needed for ${label}): pip install kaggle, then add your API token (kaggle.com → Settings → API).`);
  process.exitCode = r.code || 0;
}

const HELP = `resbot ${PKG.version}: Kaggle research partner for Claude Code

Setup
  install                     add marketplace + install ${PLUGIN_ID}, link resbot, completions
  update                      pull the latest version and update the plugin
  uninstall [--purge]         remove plugin, marketplace, link, completions (--purge: also ~/.resbot)
  doctor                      check Claude Code, plugin, Node, Python, git, graphify, kaggle, network
  graphify                    install graphify and run graphify install
  version | help

Claude Code (starts claude --chrome with /resbot:ch7)
  new <slug>                  create resbot-workspace/<slug> from templates
  open <kaggle-url> [goal]    start a research session on a notebook
  research "<question>"       literature + Kaggle community search
  report [slug]               build notes/report.md

Workspace (no Claude needed)
  paper <arxiv-id|doi|pdf> [--slug s]   fetch metadata into papers/ + BibTeX
  log [slug] | ideas [slug] | status [slug]
  compare <slug> <exp-a> <exp-b>        Welch t-test from experiments.md
  export [slug] [--zip]                 single markdown bundle, or a zip

Kaggle CLI wrappers
  pull <owner/kernel> | output <owner/kernel> | lb <competition>
  watch <owner/kernel> [--every 5m]     notify when a committed run finishes

  completions <bash|zsh|pwsh>

Env: RESBOT_WORKSPACE (default ./resbot-workspace), RESBOT_NO_UPDATE_CHECK=1`;

async function main(argv) {
  const [cmd = 'help', ...args] = argv;
  switch (cmd) {
    case 'help': case '-h': case '--help': console.log(HELP); break;
    case 'version': case '-v': case '--version': console.log(PKG.version); break;
    case 'install': runInstaller('install', args); break;
    case 'uninstall': runInstaller('uninstall', args); break;
    case 'update': {
      if (fs.existsSync(path.join(ROOT, '.git'))) {
        if (!run('git', ['-C', ROOT, 'pull', '--ff-only'], { inherit: true }).ok) die('git pull failed; resolve it in ' + ROOT);
      } else if (ROOT.includes('node_modules')) {
        console.log('Installed via npm: run `npm i -g resbot-kaggle@latest`, then `resbot install`.'); break;
      } else console.log(`No git checkout at ${ROOT}; re-run the installer to update.`);
      run(CLAUDE, ['plugin', 'marketplace', 'update', 'resbot-local'], { inherit: true });
      run(CLAUDE, ['plugin', 'update', PLUGIN_ID], { inherit: true });
      break;
    }
    case 'doctor': await doctor(); break;
    case 'graphify': {
      // graphify is published on PyPI as "graphifyy" (the name "graphify" is not on PyPI).
      if (!run(IS_WIN ? 'pip' : 'pip3', ['install', 'graphifyy'], { inherit: true }).ok) die('installing graphify with pip failed');
      process.exitCode = run('graphify', ['install'], { inherit: true }).code || 0;
      break;
    }
    case 'new': {
      const dir = createWorkspace(checkSlug(args[0] || die('usage: resbot new <slug>')));
      console.log(`Created ${dir}\nNext: resbot open <kaggle-url> [goal]   (or /resbot:ch7 <kaggle-url> inside Claude Code)`);
      break;
    }
    case 'open': {
      const url = args[0] || die('usage: resbot open <kaggle-url> [goal]');
      const goal = args.slice(1).join(' ');
      createWorkspace(slugFromUrl(url), { url, goal: goal || 'TBD' });
      launchClaude(`/resbot:ch7 ${url}${goal ? ' ' + goal : ''}`);
      break;
    }
    case 'research': launchClaude(`/resbot:ch7 research ${args.join(' ') || die('usage: resbot research "<question>"')}`); break;
    case 'report': launchClaude(`/resbot:ch7 report${args[0] ? ' ' + pickSlug(args[0]) : ''}`); break;
    case 'paper': await paper(args); break;
    case 'log': console.log(readIf(wsPath(pickSlug(args[0]), 'notes', 'experiments.md')).trim() || 'No experiments yet.'); break;
    case 'ideas': console.log(readIf(wsPath(pickSlug(args[0]), 'notes', 'ideas.md')).trim() || 'No ideas yet.'); break;
    case 'status': {
      const s = pickSlug(args[0]);
      const st = readIf(wsPath(s, 'state.md'));
      const keep = st.split('\n').filter((l) => /^- \*\*(Goal|Active hypothesis|Best result|Last cell|Next cell|Notebook)/.test(l));
      console.log(`[${s}]\n` + (keep.join('\n') || st.trim()));
      break;
    }
    case 'compare': compare(args); break;
    case 'export': exportWs(args); break;
    case 'pull': {
      const k = args[0] || die('usage: resbot pull <owner/kernel>');
      kaggle(['kernels', 'pull', k, '-p', wsPath(checkSlug(k.split('/').pop()), 'cells', 'remote'), '-m'], 'pull'); break;
    }
    case 'output': {
      const k = args[0] || die('usage: resbot output <owner/kernel>');
      kaggle(['kernels', 'output', k, '-p', wsPath(checkSlug(k.split('/').pop()), 'outputs', 'remote')], 'output'); break;
    }
    case 'lb': kaggle(['competitions', 'leaderboard', args[0] || die('usage: resbot lb <competition>'), '-s'], 'lb'); break;
    case 'watch': await watch(args); break;
    case 'completions': {
      const f = { bash: 'resbot.bash', zsh: '_resbot', pwsh: 'resbot.ps1', powershell: 'resbot.ps1' }[args[0]] || die('usage: resbot completions <bash|zsh|pwsh>');
      process.stdout.write(fs.readFileSync(path.join(ROOT, 'completions', f), 'utf8'));
      break;
    }
    default: die(`Unknown command "${cmd}". Run: resbot help`);
  }
  await updateCheck(cmd);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof UserError ? `resbot: ${e.message}` : e.stack || e);
    process.exitCode = e instanceof UserError ? 2 : 1;
  });
}
module.exports = { main, slugFromUrl, parseTable, parseMetric, parseSeeds, welch, tTwoSidedP, bibtex, createWorkspace };
