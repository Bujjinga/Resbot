# Kaggle editor mechanics (probe, don't hardcode)

Kaggle's editor changes over time. Probe once, save what works to `config.md` (`editor_path`,
`insert_method`, `run_method`, `selectors`), and reuse it. Chrome acts ONLY on kaggle.com.

## Probe

Run one JS call in the notebook tab:

```js
(() => {
  const q = s => document.querySelectorAll(s).length;
  return JSON.stringify({
    url: location.href,
    jpCells: q('.jp-Cell'), cm6: q('.cm-content'), cm5: q('.CodeMirror'),
    monaco: q('.monaco-editor'),
    iframes: [...document.querySelectorAll('iframe')].map(f => ({src: (f.src||'').slice(0,120), id: f.id, name: f.name})),
    kernel: (document.querySelector('[class*="kernel"],[aria-label*="ernel"]')||{}).textContent?.slice(0,80) || null
  });
})()
```

Choose a path:

- **A) Main DOM**: cells/editors visible in the top document → JS insert + read directly.
- **B) iframe**: editor lives in an iframe. If same-origin, reach it via
  `document.querySelector('iframe').contentDocument`. If cross-origin, use read_page/find on the
  frame, or open the frame URL in the tab if it is a kaggle.com URL and scriptable.
- **C) Keyboard + clipboard**: click into the cell, select all, paste. Last resort: type the text.

**Throwaway test:** add a cell with `print("resbot-probe")`, insert/verify/run/read it with the chosen
path, then delete it. Record the working methods in `config.md`.

## Insert

Order of preference (always pass the code as a JSON-escaped string: `JSON.stringify(code)`):

1. **CM6**: `const v = el.closest('.cm-editor').cmView?.view || el.cmView?.view;`
   `v.dispatch({changes: {from: 0, to: v.state.doc.length, insert: CODE}})`
2. **CM5**: `el.CodeMirror.setValue(CODE)`
3. **Clipboard**: write CODE to the clipboard, focus the cell editor, Cmd/Ctrl+A, Cmd/Ctrl+V.
4. **Typing**: only for short cells; disable auto-indent issues by typing line by line.

Add a new cell with the editor's "+ Code" button below the target cell (find it via `find`), or the
Jupyter command-mode shortcut `Esc` then `b`.

**Always read back** the cell text (CM6: `v.state.doc.toString()`, CM5: `getValue()`, else `innerText`
of `.cm-content`) and compare with `cells/cell_NN.py`. Proceed only on a match.

## Run

Focus the cell and press Shift+Enter, or click its run button. Do not "Run All".

## Poll

Status per cell: `[*]` (or a spinner/"running" class) = running; `[n]` = done. Read the execution count
prompt (`.jp-InputPrompt`, or the cell's run-count element found during the probe). Back off 5s/15s/30s/60s.

## Read output (one JS call)

```js
((idx) => {
  const cell = document.querySelectorAll('.jp-Cell')[idx];
  const out = cell?.querySelector('.jp-Cell-outputWrapper, .jp-OutputArea') || cell;
  const t = (out?.innerText || '').split('\n');
  const err = out?.querySelector('.jp-RenderedText[data-mime-type*="stderr"], .ansi-red-fg') ? true : /Traceback|Error/.test(t.slice(-30).join('\n'));
  const capped = err ? t.slice(-25) : (t.length > 45 ? [...t.slice(0,15), '…', ...t.slice(-30)] : t);
  return JSON.stringify({lines: t.length, text: capped.join('\n').slice(0, 3000), error: err,
                         images: out ? out.querySelectorAll('img, canvas, svg').length : 0});
})(IDX)
```

Adapt the selectors to the probed path. Screenshots only per [plot.md](plot.md).

## Safety

- Never click Save Version, Submit, Share, Publish, Delete notebook, or settings toggles without asking.
- Never type passwords/API tokens. Sign-in is the user's job.
- Don't open non-kaggle.com pages in Chrome; research goes through WebSearch/WebFetch.
