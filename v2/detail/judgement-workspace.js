/* Report review shares the existing reader. Playback never alters editable report content. */
(() => {
  'use strict';
  function visibleText(html) {
    const holder = document.createElement('div');
    holder.innerHTML = window.reportActions.safeHTML(html);
    return holder.textContent.trim();
  }

  function locateRange(editor, quote) {
    if (!quote) return null;
    const walk = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let text = '', n;
    while ((n = walk.nextNode())) {
      nodes.push({node:n, start:text.length});
      text += n.data;
    }
    const start = text.indexOf(quote);
    if (start < 0) return null;
    const end = start + quote.length;
    const first = nodes.find(({node,start:offset}) => offset + node.length > start);
    const last = nodes.find(({node,start:offset}) => offset + node.length >= end);
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return range;
  }

  function init({report,sessionId,editor,entries,onReviewChange}) {
    const get = id => document.getElementById(id);
    const studio = get('judgement-host'), leftSlot = get('judgement-left-slot'), mobileSlot = get('judgement-mobile');
    const process = get('process-content'), nav = get('judgement-mode'), reader = get('reader');
    const mobile = matchMedia('(max-width:800px)'), reduceMotion = matchMedia('(prefers-reduced-motion:reduce)');
    const trace = window.GkxTraceWorkspace.init({report,entries,editor,locateRange});
    const baseText = visibleText(report.html);
    let preferred = new URLSearchParams(window.parent.location.search).get('panel') === 'process' ? 'process' : 'review';
    let editTimer = 0;
    function update() {
      const text = editor.textContent.trim();
      const model = window.GkxJudgementCases.forReport({
        id:sessionId, title:report.title, revision:report.revision, text, editor, modified:text !== baseText
      });
      const sources = trace.refresh(model);
      onReviewChange?.(model, sources);
      window.GkxJudgementStudio.mount(studio, model);
    }
    function sync(open = !get('document-pane').hidden) {
      const narrow = mobile.matches;
      const target = narrow ? mobileSlot : leftSlot;
      if (studio.parentElement !== target) target.prepend(studio);
      nav.hidden = !open || narrow;
      leftSlot.hidden = narrow || !open || preferred !== 'review';
      process.hidden = open && !narrow && preferred === 'review';
      mobileSlot.hidden = !open || !narrow;
      nav.querySelectorAll('[data-judgement-view]').forEach(b => {
        b.setAttribute('aria-pressed',String(b.dataset.judgementView === preferred));
      });
      if (!open || (!narrow && preferred !== 'review')) studio.dispatchEvent(new Event('gkx-judgement-hide'));
    }
    nav.addEventListener('click', e => {
      const button = e.target.closest('[data-judgement-view]');
      if (!button) return;
      preferred = button.dataset.judgementView;
      sync();
    });
    get('compact-judgement-link').addEventListener('click', () => {
      studio.scrollIntoView({block:'start', behavior:reduceMotion.matches?'auto':'smooth'});
      studio.focus({preventScroll:true});
    });
    get('jump-to-editor').addEventListener('click', () => {
      editor.scrollIntoView({block:'start', behavior:reduceMotion.matches?'auto':'smooth'});
      editor.focus({preventScroll:true});
    });
    function revealQuote(e) {
      const quote = e.detail?.quote, range = locateRange(editor, quote);
      if (!range) {
        window.reportActions.notify('当前版本找不到这段原文，请重新核对报告。');
        return;
      }
      if (window.CSS?.highlights && window.Highlight) {
        CSS.highlights.set('judgement-source', new Highlight(range));
      }
      const top = reader.scrollTop + range.getBoundingClientRect().top - reader.getBoundingClientRect().top;
      reader.scrollTo({top:Math.max(0,top - Math.min(90,reader.clientHeight * .16)),behavior:reduceMotion.matches?'auto':'smooth'});
    }
    studio.addEventListener('gkx-judgement-locate',revealQuote);
    document.addEventListener('gkx-trace-locate',revealQuote);
    editor.addEventListener('input', () => {
      window.CSS?.highlights?.delete('judgement-source');
      clearTimeout(editTimer);
      editTimer = setTimeout(update, 200);
    });
    mobile.addEventListener('change', () => sync());
    get('detail').addEventListener('gkx-document-visibility', e => sync(e.detail.open));
    update();
    sync();
    return trace;
  }
  window.GkxJudgementWorkspace = { init };
})();
