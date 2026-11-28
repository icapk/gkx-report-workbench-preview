/* Reading controls live beside the editable article, so drafts and exports contain only the report. */
(() => {
  'use strict';
  function init({report, entries, editor, locateRange}) {
    const host = document.getElementById('trace-summary');
    const layer = document.getElementById('trace-pins');
    const tool = document.getElementById('open-report-trace');
    const paper = editor.parentElement;
    let groups = [], modelKey = '', view, pins = [], frame = 0;

    function open(key, index, trigger) {
      view?.open(key, index, trigger);
    }
    tool.addEventListener('click', () => open('source', 0, tool));
    document.getElementById('judgement-host').addEventListener('click', event => {
      const link = event.target.closest('[data-trace-stage]');
      if (!link) return;
      const key = link.dataset.traceStage, sourceId = link.dataset.traceSourceId;
      const index = sourceId ? groups.find(group => group.key === key)?.items.findIndex(item => item.sourceId === sourceId) : 0;
      open(key, index ?? 0, link);
    });
    function placePins() {
      frame = 0;
      const base = layer.getBoundingClientRect();
      const used = new Map();
      for (const {button, heading} of pins) {
        const rect = heading.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(heading);
        const textRight = Math.max(...Array.from(range.getClientRects(), r => r.right));
        const right = used.get(heading) ?? rect.right;
        button.hidden = false;
        const width = button.offsetWidth;
        if (width + textRight + 12 > right || rect.width === 0) {
          button.hidden = true;
          continue;
        }
        button.style.left = (right - width - base.left) + 'px';
        button.style.top = Math.max(0,rect.top - base.top + 2) + 'px';
        used.set(heading,right-width-5);
      }
    }
    function schedulePins() {
      if (!frame) frame = requestAnimationFrame(placePins);
    }
    new ResizeObserver(schedulePins).observe(paper);
    document.fonts?.ready.then(schedulePins);
    function buildPins() {
      pins = [];
      layer.replaceChildren();
      const headings = [...editor.querySelectorAll('h1,h2,h3')];
      for (const group of groups) {
        const index = group.items.findIndex(item => item.anchor);
        if (index < 0) continue;
        const item = group.items[index];
        const quote = locateRange(editor,item.anchor);
        if (!quote) continue;
        const start = quote.startContainer;
        const heading = headings.filter(h => h.contains(start) || (h.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);
        if (!heading) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'trace-pin';
        button.textContent = ({source:'来源原文',metric:'指标口径',reason:'判断依据'})[group.key];
        button.setAttribute('aria-label',button.textContent+' · '+heading.textContent);
        button.title = item.title;
        button.addEventListener('click', () => open(group.key,index,button));
        layer.append(button);
        pins.push({button,heading});
      }
      schedulePins();
    }
    function refresh(review) {
      const model = window.GkxTraceModel.build({report,entries,editor,review});
      const nextKey = JSON.stringify(model);
      if (nextKey !== modelKey) {
        view?.destroy();
        groups = model.groups;
        view = window.GkxTraceView.mount(host,model);
        modelKey = nextKey;
      }
      // Undo or restoring a version may replace headings while preserving their text.
      buildPins();
      return model;
    }
    function openAttachment(marker) {
      const key = String(marker.dataset.source);
      const byId = entries.findIndex(item => {
        const id = item?.id ?? item?.sourceId;
        return id != null && String(id)===key;
      });
      const entryIndex = marker.hasAttribute('data-source-index') ? Number(marker.dataset.sourceIndex) : byId >= 0 ? byId : Number(key)-1;
      const index = groups.find(g => g.key==='source')?.items.findIndex(item => item.sourceIndex===entryIndex);
      if (index == null || index < 0) return false;
      open('source',index,marker);
      return true;
    }
    return {refresh,openAttachment};
  }
  window.GkxTraceWorkspace = {init};
})();
