'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync, execFile } = require('child_process');
const lib = require('../bin/resbot.js');

const BIN = path.join(__dirname, '..', 'bin', 'resbot.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'resbot-test-'));
const WS = path.join(TMP, 'resbot-workspace');
let server, base;

// Async on purpose: spawnSync would block the in-process mock API server.
function cli(args, extraEnv = {}) {
  return new Promise((resolve) => execFile(process.execPath, [BIN, ...args], {
    cwd: TMP, encoding: 'utf8',
    env: { ...process.env, RESBOT_WORKSPACE: WS, RESBOT_NO_UPDATE_CHECK: '1', RESBOT_ARXIV_API: `${base}/arxiv`, RESBOT_CROSSREF_API: `${base}/crossref`, ...extraEnv },
  }, (e, out, err) => resolve({ code: e ? e.code : 0, out, err })));
}

const ARXIV_XML = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry>
<id>http://arxiv.org/abs/1706.03762v7</id><published>2017-06-12T17:57:34Z</published>
<title>Attention Is All You Need</title><summary>The dominant sequence transduction models...</summary>
<author><name>Ashish Vaswani</name></author><author><name>Noam Shazeer</name></author></entry></feed>`;
const CROSSREF = { message: { DOI: '10.1000/xyz123', title: ['A Mock Paper &amp; Friends'], author: [{ given: 'Ada', family: 'Lovelace' }],
  issued: { 'date-parts': [[2020, 1]] }, 'container-title': ['Journal of Tests'], URL: 'https://doi.org/10.1000/xyz123' } };

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url.startsWith('/arxiv')) {
      const id = new URL(req.url, 'http://x').searchParams.get('id_list');
      res.end(id === '1706.03762' ? ARXIV_XML : '<feed></feed>');
    } else if (req.url.startsWith('/crossref/')) {
      if (decodeURIComponent(req.url.slice(10)) === '10.1000/xyz123') res.end(JSON.stringify(CROSSREF));
      else { res.statusCode = 404; res.end('nope'); }
    } else { res.statusCode = 404; res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

test('new creates the workspace from templates and is idempotent', async () => {
  const r = (await cli(['new', 'demo']));
  assert.equal(r.code, 0, r.err);
  for (const f of ['config.md', 'state.md', 'cell_tree.md', 'notes/hypotheses.md', 'notes/experiments.md', 'notes/literature.md', 'notes/ideas.md', 'notes/results.csv', 'notes/references.bib'])
    assert.ok(fs.existsSync(path.join(WS, 'demo', f)), f);
  assert.match(fs.readFileSync(path.join(WS, 'demo', 'state.md'), 'utf8'), /State: demo/);
  fs.appendFileSync(path.join(WS, 'demo', 'state.md'), 'KEEP\n');
  assert.equal((await cli(['new', 'demo'])).code, 0);
  assert.match(fs.readFileSync(path.join(WS, 'demo', 'state.md'), 'utf8'), /KEEP/);
});

test('new rejects unsafe slugs', async () => {
  assert.equal((await cli(['new', '../evil'])).code, 2);
  assert.equal((await cli(['new'])).code, 2);
});

test('log, ideas and status read the workspace', async () => {
  const exp = path.join(WS, 'demo', 'notes', 'experiments.md');
  fs.appendFileSync(exp, '| E1 | 5 | H1 | baseline | 3 | 0.800 ± 0.010 | | 1m | T4 | abcd1234 | ok |\n| E2 | 7 | H1 | +aug | 3 | 0.850 ± 0.010 | | 2m | T4 | bcde2345 | ok |\n');
  fs.appendFileSync(path.join(WS, 'demo', 'notes', 'ideas.md'), '1. Try mixup (H3)\n');
  assert.match((await cli(['log', 'demo'])).out, /E2 \| 7/);
  assert.match((await cli(['ideas', 'demo'])).out, /mixup/);
  assert.match((await cli(['status'])).out, /\[demo\][\s\S]*Goal/);
  assert.equal((await cli(['log', 'missing'])).code, 2);
});

test('compare runs a Welch t-test from experiments.md', async () => {
  const r = (await cli(['compare', 'demo', 'E2', 'E1']));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /E2: 0\.85 ± 0\.01 \(n=3\)/);
  assert.match(r.out, /significant at 0\.05/);
  assert.equal((await cli(['compare', 'demo', 'E1', 'E9'])).code, 2);
});

test('t-distribution p-values match reference values', async () => {
  assert.ok(Math.abs(lib.tTwoSidedP(2.0, 10) - 0.07339) < 1e-4);
  assert.ok(Math.abs(lib.tTwoSidedP(2.776, 4) - 0.05) < 1e-3);
  assert.deepEqual(lib.parseMetric('0.912 +/- 0.004'), { mean: 0.912, std: 0.004 });
  assert.equal(lib.parseSeeds('0,1,2'), 3);
  assert.equal(lib.parseSeeds('5'), 5);
});

test('slugFromUrl only accepts kaggle.com', async () => {
  assert.equal(lib.slugFromUrl('https://www.kaggle.com/code/alice/titanic-eda/edit'), 'titanic-eda');
  assert.throws(() => lib.slugFromUrl('https://evil.com/code/a/b'));
});

test('paper fetches arXiv metadata and appends BibTeX once', async () => {
  const r = (await cli(['paper', '1706.03762', '--slug', 'demo']));
  assert.equal(r.code, 0, r.err);
  const md = fs.readFileSync(path.join(WS, 'demo', 'papers', '1706.03762.md'), 'utf8');
  assert.match(md, /Attention Is All You Need/);
  assert.match(md, /Verified: yes \(arXiv API\)/);
  (await cli(['paper', 'arxiv:1706.03762', '--slug', 'demo']));
  const bib = fs.readFileSync(path.join(WS, 'demo', 'notes', 'references.bib'), 'utf8');
  assert.equal((bib.match(/@article\{vaswani2017attention,/g) || []).length, 1);
  assert.match(bib, /eprint = \{1706\.03762\}/);
});

test('paper fetches Crossref metadata for a DOI and fails cleanly on unknown ids', async () => {
  const r = (await cli(['paper', 'https://doi.org/10.1000/xyz123', '--slug', 'demo']));
  assert.equal(r.code, 0, r.err);
  assert.match(fs.readFileSync(path.join(WS, 'demo', 'notes', 'references.bib'), 'utf8'), /lovelace2020mock/);
  assert.equal((await cli(['paper', '9999.99999', '--slug', 'demo'])).code, 2);
  assert.equal((await cli(['paper', '10.1000/missing', '--slug', 'demo'])).code, 2);
  assert.equal((await cli(['paper', 'not-an-id', '--slug', 'demo'])).code, 2);
});

test('paper copies a local PDF as UNVERIFIED without BibTeX', async () => {
  const pdf = path.join(TMP, 'my paper.pdf');
  fs.writeFileSync(pdf, '%PDF-1.4 fake');
  const before = fs.readFileSync(path.join(WS, 'demo', 'notes', 'references.bib'), 'utf8');
  assert.equal((await cli(['paper', pdf, '--slug', 'demo'])).code, 0);
  assert.ok(fs.existsSync(path.join(WS, 'demo', 'papers', 'my_paper.pdf')));
  assert.match(fs.readFileSync(path.join(WS, 'demo', 'papers', 'my_paper.md'), 'utf8'), /UNVERIFIED/);
  assert.equal(fs.readFileSync(path.join(WS, 'demo', 'notes', 'references.bib'), 'utf8'), before);
});

test('export writes a markdown bundle', async () => {
  fs.writeFileSync(path.join(WS, 'demo', 'cells', 'cell_01.py'), 'print("hi")\n');
  const r = (await cli(['export', 'demo']));
  assert.equal(r.code, 0, r.err);
  const out = fs.readFileSync(path.join(TMP, 'demo-export.md'), 'utf8');
  assert.ok(out.indexOf('## state.md') < out.indexOf('## notes/'));
  assert.match(out, /## cells\/cell_01\.py\n\n```python\nprint\("hi"\)/);
});

test('export --zip writes a zip archive', { skip: process.platform !== 'win32' && spawnSync('zip', ['-v']).error ? 'zip not installed' : false }, async () => {
  const r = (await cli(['export', 'demo', '--zip']));
  assert.equal(r.code, 0, r.err);
  assert.equal(fs.readFileSync(path.join(TMP, 'demo.zip')).subarray(0, 2).toString(), 'PK');
});

test('completions print each shell script', async () => {
  assert.match((await cli(['completions', 'bash'])).out, /complete -F _resbot resbot/);
  assert.match((await cli(['completions', 'zsh'])).out, /#compdef resbot/);
  assert.match((await cli(['completions', 'pwsh'])).out, /Register-ArgumentCompleter/);
  assert.equal((await cli(['completions', 'fish'])).code, 2);
});

test('open and research pass the right /resbot:ch7 args to claude --chrome', async () => {
  const log = path.join(TMP, 'claude-args.txt');
  const shim = process.platform === 'win32' ? path.join(TMP, 'fakeclaude.cmd') : path.join(TMP, 'fakeclaude');
  if (process.platform === 'win32') fs.writeFileSync(shim, `@echo %* > "${log}"\r\n`);
  else { fs.writeFileSync(shim, `#!/bin/sh\nprintf '%s\\n' "$@" > "${log}"\n`); fs.chmodSync(shim, 0o755); }
  const r = (await cli(['open', 'https://www.kaggle.com/code/alice/titanic-eda', 'maximize', 'AUC'], { RESBOT_CLAUDE_BIN: shim }));
  assert.equal(r.code, 0, r.err);
  const args = fs.readFileSync(log, 'utf8');
  assert.match(args, /--chrome/);
  assert.match(args, /\/resbot:ch7 https:\/\/www\.kaggle\.com\/code\/alice\/titanic-eda maximize AUC/);
  assert.match(fs.readFileSync(path.join(WS, 'titanic-eda', 'config.md'), 'utf8'), /goal: maximize AUC/);
  (await cli(['research', 'best', 'augmentations'], { RESBOT_CLAUDE_BIN: shim }));
  assert.match(fs.readFileSync(log, 'utf8'), /\/resbot:ch7 research best augmentations/);
  assert.equal((await cli(['open', 'https://example.com/x'], { RESBOT_CLAUDE_BIN: shim })).code, 2);
});

test('graph build, query, path and explain work on a workspace', async () => {
  const w = path.join(WS, 'gdemo');
  await cli(['new', 'gdemo']);
  fs.writeFileSync(path.join(w, 'cell_tree.md'), '| # | type | purpose | defines | needs | status | key result |\n|---|---|---|---|---|---|---|\n| 1 | setup | imports and seeds | | | ok | |\n| 2 | feature | 5-fold split | folds | | ok | |\n| 3 | train | gradient boosting | | folds | stale | acc 0.84 |\n');
  fs.writeFileSync(path.join(w, 'cells', 'cell_01.py'), 'import numpy as np\nSEED = 42\n');
  fs.writeFileSync(path.join(w, 'cells', 'cell_02.py'), 'folds = make_folds(SEED)\n');
  fs.appendFileSync(path.join(w, 'notes', 'hypotheses.md'), '| H1 | boosting beats linear | E1 vs E0 | +3 | open | |\n');
  fs.appendFileSync(path.join(w, 'notes', 'experiments.md'), '| E1 | 3 | H1 | gradient boosting | 3 | 0.84 ± 0.01 | | | | | |\n');
  const b = await cli(['graph', 'build', '--slug', 'gdemo']);
  assert.equal(b.code, 0, b.err);
  const g = JSON.parse(fs.readFileSync(path.join(w, 'graph', 'graph.json'), 'utf8'));
  const has = (from, to, rel) => g.edges.some((e) => e.from === from && e.to === to && e.rel === rel);
  assert.ok(has('cell:02', 'cell:01', 'needs'), 'SEED dependency from code');
  assert.ok(has('cell:03', 'cell:02', 'needs'), 'folds dependency from cell_tree');
  assert.ok(has('exp:E1', 'cell:03', 'ran_in'));
  assert.ok(has('exp:E1', 'hyp:H1', 'tests'));
  assert.match(fs.readFileSync(path.join(w, 'graph', 'GRAPH.md'), 'utf8'), /cell:03 \[stale\]/);
  assert.match((await cli(['graph', 'query', 'which cell defines the folds', '--slug', 'gdemo'])).out, /^cell:02: 5-fold split/);
  assert.match((await cli(['graph', 'path', 'E1', 'cell:01', '--slug', 'gdemo'])).out, /exp:E1[\s\S]*cell:03[\s\S]*cell:02[\s\S]*cell:01/);
  assert.match((await cli(['graph', 'explain', 'H1', '--slug', 'gdemo'])).out, /← tests exp:E1/);
  assert.equal((await cli(['graph', 'explain', 'boosting', '--slug', 'gdemo'])).code, 3);
  assert.equal((await cli(['graph', 'explain', 'zzz', '--slug', 'gdemo'])).code, 4);
});
