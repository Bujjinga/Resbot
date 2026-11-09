#!/usr/bin/env node
// RESBOT graph: a knowledge graph of one workspace, built from its own files. Zero dependencies.
//   node graph.js build   <workspace-dir>
//   node graph.js query   <workspace-dir> "<question>"
//   node graph.js path    <workspace-dir> <A> <B>
//   node graph.js explain <workspace-dir> <X>
// Exit codes: 0 ok, 2 usage, 3 ambiguous name (candidates listed), 4 no match.
'use strict';
const fs = require('fs');
const path = require('path');

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const pad = (n) => String(parseInt(n, 10)).padStart(2, '0');

function table(md) {
  const lines = md.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, i) => [head[i], c]))).filter((r) => Object.values(r).some(Boolean));
}

// Top-level names a Python cell defines.
function pyDefines(code) {
  const out = new Set();
  for (const m of code.matchAll(/^(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)/gm)) out.add(m[1]);
  for (const m of code.matchAll(/^([A-Za-z_][\w, ]*?)\s*(?:\+|-|\*|\/)?=(?!=)/gm)) m[1].split(',').map((s) => s.trim()).filter((s) => /^[A-Za-z_]\w*$/.test(s)).forEach((s) => out.add(s));
  for (const m of code.matchAll(/^\s*import\s+([\w.]+)(?:\s+as\s+(\w+))?/gm)) out.add(m[2] || m[1].split('.')[0]);
  for (const m of code.matchAll(/^\s*from\s+[\w.]+\s+import\s+(.+)$/gm)) m[1].replace(/[()]/g, '').split(',').forEach((s) => { const n = s.trim().split(/\s+as\s+/).pop(); if (/^\w+$/.test(n)) out.add(n); });
  return out;
}
const idents = (code) => new Set(code.replace(/#.*$/gm, '').replace(/(['"])(?:\\.|(?!\1).)*\1/g, '').match(/[A-Za-z_]\w*/g) || []);
const names = (s) => String(s || '').split(/[,\s;]+/).map((x) => x.replace(/[`()]/g, '')).filter((x) => /^[A-Za-z_]\w*$/.test(x));

function build(ws) {
  const nodes = new Map();
  const edges = [];
  const edgeKeys = new Set();
  const node = (id, type, label, attrs = {}) => {
    const prev = nodes.get(id);
    nodes.set(id, { id, type, label: label || (prev && prev.label) || id, attrs: { ...(prev && prev.attrs), ...attrs } });
    return id;
  };
  const edge = (from, to, rel) => {
    if (!from || !to || from === to) return;
    const k = `${from}|${to}|${rel}`;
    if (!edgeKeys.has(k)) { edgeKeys.add(k); edges.push({ from, to, rel }); }
  };

  // Cells: cell_tree.md rows + cells/cell_NN.py code.
  for (const r of table(read(path.join(ws, 'cell_tree.md')))) {
    if (!/^\d+$/.test(r['#'] || '')) continue;
    node(`cell:${pad(r['#'])}`, 'cell', r.purpose || `cell ${r['#']}`, { type: r.type, status: r.status, result: r['key result'], defines: names(r.defines).join(', '), needs: names(r.needs).join(', ') });
  }
  const cellDir = path.join(ws, 'cells');
  const files = fs.existsSync(cellDir) ? fs.readdirSync(cellDir).filter((f) => /^cell_\d+\.py$/.test(f)) : [];
  const cellIds = new Set([...nodes.keys()].filter((k) => k.startsWith('cell:')));
  for (const f of files) cellIds.add(`cell:${pad(f.slice(5))}`);
  const definer = new Map(); // name -> latest earlier cell that defined it
  for (const id of [...cellIds].sort((a, b) => parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10))) {
    const num = parseInt(id.slice(5), 10);
    const file = files.find((f) => parseInt(f.slice(5), 10) === num);
    const code = file ? read(path.join(cellDir, file)) : '';
    if (!nodes.has(id)) node(id, 'cell', `cell ${id.slice(5)}`);
    const n = nodes.get(id);
    const defs = new Set([...pyDefines(code), ...names(n.attrs.defines)]);
    const used = new Set([...idents(code), ...names(n.attrs.needs)]);
    for (const u of used) if (!defs.has(u) && definer.has(u)) edge(id, definer.get(u), 'needs');
    for (const d of defs) definer.set(d, id);
    n.attrs.defines = [...defs].join(', ');
  }

  // Hypotheses.
  for (const r of table(read(path.join(ws, 'notes', 'hypotheses.md')))) {
    if (r.id) node(`hyp:${r.id}`, 'hypothesis', r.claim, { test: r.test, expected: r.expected, status: r.status, evidence: r.evidence });
  }
  // Experiments.
  for (const r of table(read(path.join(ws, 'notes', 'experiments.md')))) {
    const id = r['exp id'];
    if (!id) continue;
    node(`exp:${id}`, 'experiment', r['change vs parent'] || id, { metric: r['metric mean ± std'], seeds: r.seeds, test: r.test, verdict: r.verdict, runtime: r.runtime, gpu: r.gpu, config: r['config hash'] });
    if (/^\d+$/.test(r['cell#'] || '')) edge(`exp:${id}`, node(`cell:${pad(r['cell#'])}`, 'cell'), 'ran_in');
    for (const h of String(r.hypothesis || '').match(/\bH\d+\b/g) || []) edge(`exp:${id}`, `hyp:${h}`, 'tests');
  }
  // Papers: literature.md rows + papers/*.md files.
  const paperKey = (s) => String(s || '').toLowerCase().replace(/^(arxiv:|https?:\/\/(dx\.)?doi\.org\/)/, '').replace(/v\d+$/, '').replace(/[^\w.]+/g, '_');
  for (const r of table(read(path.join(ws, 'notes', 'literature.md')))) {
    const ref = r['doi/arxiv'];
    if (!r.title && !ref) continue;
    const verified = !!ref && !/unverified/i.test(ref);
    node(`paper:${paperKey(verified ? ref : r.title)}`, 'paper', r.title, { year: r.year, venue: r.venue, ref, method: r.method, dataset: r.dataset, result: r['metric+number'], relevance: r.relevance, verified: verified ? 'yes' : 'no' });
  }
  const papersDir = path.join(ws, 'papers');
  for (const f of fs.existsSync(papersDir) ? fs.readdirSync(papersDir).filter((x) => x.endsWith('.md')) : []) {
    const md = read(path.join(papersDir, f));
    const title = (md.match(/^#\s+(.+)$/m) || [])[1] || f;
    node(`paper:${paperKey(f.slice(0, -3))}`, 'paper', title, { file: `papers/${f}`, verified: /Verified: yes/.test(md) ? 'yes' : 'no' });
  }
  // Ideas: list items in ideas.md.
  let i = 0;
  for (const l of read(path.join(ws, 'notes', 'ideas.md')).split('\n')) {
    const m = l.match(/^\s*(?:\d+[.)]|[-*])\s+(.+)/);
    if (m) node(`idea:${++i}`, 'idea', m[1].slice(0, 120), { text: m[1] });
  }

  // Mentions: any text that names another node.
  const byPaper = new Map([...nodes.values()].filter((n) => n.type === 'paper').map((n) => [n.id.slice(6), n.id]));
  for (const n of nodes.values()) {
    const text = [n.label, ...Object.entries(n.attrs).filter(([k]) => k !== 'defines' && k !== 'needs').map(([, v]) => v)].join(' ');
    for (const h of text.match(/\bH\d+\b/g) || []) if (nodes.has(`hyp:${h}`)) edge(n.id, `hyp:${h}`, 'mentions');
    for (const e of text.match(/\bE\d+\b/g) || []) if (nodes.has(`exp:${e}`)) edge(n.id, `exp:${e}`, 'mentions');
    for (const m of text.matchAll(/\bcell[\s_#]*(\d{1,3})\b/gi)) if (nodes.has(`cell:${pad(m[1])}`)) edge(n.id, `cell:${pad(m[1])}`, 'mentions');
    for (const m of text.matchAll(/\b(\d{4}\.\d{4,5}|10\.\d{4,9}\/[^\s|,;)]+)/g)) { const p = byPaper.get(paperKey(m[1])); if (p) edge(n.id, p, 'cites'); }
  }
  // Edges may point at a hypothesis that has no row yet: give it a placeholder node.
  for (const e of edges) if (!nodes.has(e.to)) node(e.to, e.to.split(':')[0], e.to);

  const g = { built: new Date().toISOString(), workspace: path.basename(path.resolve(ws)), nodes: [...nodes.values()], edges };
  const outDir = path.join(ws, 'graph');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(g, null, 1));
  fs.writeFileSync(path.join(outDir, 'GRAPH.md'), summary(g));
  return g;
}

function degree(g) {
  const d = new Map(g.nodes.map((n) => [n.id, 0]));
  for (const e of g.edges) { d.set(e.from, (d.get(e.from) || 0) + 1); d.set(e.to, (d.get(e.to) || 0) + 1); }
  return d;
}
function summary(g) {
  const count = {};
  for (const n of g.nodes) count[n.type] = (count[n.type] || 0) + 1;
  const d = degree(g);
  const top = [...g.nodes].sort((a, b) => d.get(b.id) - d.get(a.id)).slice(0, 10).filter((n) => d.get(n.id) > 0);
  const open = g.nodes.filter((n) => n.type === 'hypothesis' && /open|inconclusive/i.test(n.attrs.status || ''));
  const broken = g.nodes.filter((n) => n.type === 'cell' && /err|stale/i.test(n.attrs.status || ''));
  return `# Graph: ${g.workspace}\n\nBuilt ${g.built}. ${g.nodes.length} nodes, ${g.edges.length} edges ` +
    `(${Object.entries(count).map(([k, v]) => `${v} ${k}`).join(', ') || 'empty'}).\n\n## Most connected\n\n` +
    (top.map((n) => `- ${n.id} (${d.get(n.id)}): ${n.label}`).join('\n') || '- none') +
    `\n\n## Open hypotheses\n\n${open.map((n) => `- ${n.id}: ${n.label}`).join('\n') || '- none'}` +
    `\n\n## Cells needing attention\n\n${broken.map((n) => `- ${n.id} [${n.attrs.status}]: ${n.label}`).join('\n') || '- none'}\n`;
}

function load(ws) {
  const p = path.join(ws, 'graph', 'graph.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : build(ws);
}

class GraphError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
const STOP = new Set('the and for with that this which what where when does did from into have has are was were how why who cell cells about of in is to on it by an or do me my we us be at as'.split(' '));
const terms = (q) => (q.toLowerCase().match(/[a-z0-9_.]+/g) || []).filter((t) => t.length > 1 && !STOP.has(t));
const nodeText = (n) => `${n.id} ${n.label} ${Object.values(n.attrs).join(' ')}`.toLowerCase();
const score = (n, ts) => {
  const t = nodeText(n); const l = n.label.toLowerCase();
  let s = ts.reduce((acc, w) => acc + (t.includes(w) ? (l.includes(w) ? 2 : 1) : 0), 0);
  // "which cell defines folds": the field named in the question holds another query term.
  for (const [k, v] of Object.entries(n.attrs)) {
    const key = k.toLowerCase(); const val = String(v || '').toLowerCase();
    if (ts.some((w) => key.startsWith(w.replace(/s$/, ''))) && ts.some((w) => !key.startsWith(w.replace(/s$/, '')) && val.includes(w))) s += 3;
  }
  return s;
};

function resolve(g, x) {
  const s = String(x).trim();
  const lc = s.toLowerCase();
  const exact = g.nodes.find((n) => n.id.toLowerCase() === lc);
  if (exact) return exact;
  const suffix = g.nodes.filter((n) => { const tail = n.id.split(':').slice(1).join(':').toLowerCase(); return tail === lc || (/^\d+$/.test(s) && n.type === 'cell' && tail === pad(s)); });
  if (suffix.length === 1) return suffix[0];
  const list = (ns) => ns.slice(0, 6).map((n) => `  ${n.id}: ${n.label}`).join('\n');
  if (suffix.length > 1) throw new GraphError(`"${s}" is ambiguous:\n${list(suffix)}`, 3);
  const ts = terms(s);
  const ranked = g.nodes.map((n) => [n, score(n, ts)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) throw new GraphError(`No node matches "${s}"`, 4);
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) throw new GraphError(`"${s}" is ambiguous:\n${list(ranked.map(([n]) => n))}`, 3);
  return ranked[0][0];
}
const short = (n) => `${n.id}: ${n.label}${n.attrs.status ? ` [${n.attrs.status}]` : ''}${n.attrs.metric ? ` (${n.attrs.metric})` : ''}`;

function query(g, q, max = 40) {
  const ts = terms(q);
  const ranked = g.nodes.map((n) => [n, score(n, ts)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) throw new GraphError(`Nothing in the graph matches "${q}"`, 4);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const lines = [];
  for (const [n] of ranked.slice(0, 5)) {
    lines.push(short(n));
    for (const e of g.edges) {
      if (e.from === n.id) lines.push(`  → ${e.rel} ${short(byId.get(e.to))}`);
      else if (e.to === n.id) lines.push(`  ← ${e.rel} ${short(byId.get(e.from))}`);
    }
  }
  return lines.slice(0, max).join('\n') + (lines.length > max ? `\n… ${lines.length - max} more lines` : '');
}

function shortestPath(g, a, b) {
  const [A, B] = [resolve(g, a), resolve(g, b)];
  const adj = new Map();
  const add = (k, v) => (adj.has(k) ? adj.get(k).push(v) : adj.set(k, [v]));
  for (const e of g.edges) { add(e.from, [e.to, `${e.rel} →`]); add(e.to, [e.from, `← ${e.rel}`]); }
  const prev = new Map([[A.id, null]]);
  const queue = [A.id];
  while (queue.length && !prev.has(B.id)) {
    const cur = queue.shift();
    for (const [nx, rel] of adj.get(cur) || []) if (!prev.has(nx)) { prev.set(nx, [cur, rel]); queue.push(nx); }
  }
  if (!prev.has(B.id)) throw new GraphError(`No path between ${A.id} and ${B.id}`, 4);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const chain = [];
  for (let cur = B.id; cur; cur = prev.get(cur) ? prev.get(cur)[0] : null) chain.unshift([cur, prev.get(cur) ? prev.get(cur)[1] : null]);
  return chain.map(([id, rel], k) => (k ? `  ${rel} ` : '') + short(byId.get(id))).join('\n');
}

function explain(g, x) {
  const n = resolve(g, x);
  const byId = new Map(g.nodes.map((m) => [m.id, m]));
  const attrs = Object.entries(n.attrs).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${String(v).slice(0, 160)}`);
  const out = g.edges.filter((e) => e.from === n.id).map((e) => `  → ${e.rel} ${short(byId.get(e.to))}`);
  const inc = g.edges.filter((e) => e.to === n.id).map((e) => `  ← ${e.rel} ${short(byId.get(e.from))}`);
  return [`${n.id} (${n.type}): ${n.label}`, ...attrs, out.length || inc.length ? 'connections:' : 'connections: none', ...out, ...inc].join('\n');
}

function cli(argv) {
  const [cmd, ws, ...rest] = argv;
  const usage = 'usage: graph.js <build|query|path|explain> <workspace-dir> [args]';
  if (!cmd || !ws) throw new GraphError(usage, 2);
  if (!fs.existsSync(ws)) throw new GraphError(`No workspace at ${ws}`, 2);
  switch (cmd) {
    case 'build': { const g = build(ws); return `Built ${path.join(ws, 'graph', 'graph.json')}: ${g.nodes.length} nodes, ${g.edges.length} edges. Summary: graph/GRAPH.md`; }
    case 'query': if (!rest.length) throw new GraphError('usage: query <workspace-dir> "<question>"', 2); return query(load(ws), rest.join(' '));
    case 'path': if (rest.length < 2) throw new GraphError('usage: path <workspace-dir> <A> <B>', 2); return shortestPath(load(ws), rest[0], rest[1]);
    case 'explain': if (!rest.length) throw new GraphError('usage: explain <workspace-dir> <X>', 2); return explain(load(ws), rest.join(' '));
    default: throw new GraphError(usage, 2);
  }
}

if (require.main === module) {
  try { console.log(cli(process.argv.slice(2))); } catch (e) {
    if (!(e instanceof GraphError)) throw e;
    console.error(e.message);
    process.exitCode = e.code;
  }
}
module.exports = { build, load, query, shortestPath, explain, cli, GraphError, pyDefines };
