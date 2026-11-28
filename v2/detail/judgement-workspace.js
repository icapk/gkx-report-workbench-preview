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

  function init({report,sessionId,editor,entries,attachments,onReviewChange}) {
    const get = id => document.getElementById(id);
    const studio = get('judgement-host'), reviewSlot = get('judgement-review-slot'), mobileSlot = get('judgement-mobile');
    const process = get('process-content'), nav = get('judgement-mode'), reader = get('reader');
    const surface = get('detail'), panel = get('review-panel'), opener = get('open-review-panel');
    const mobile = matchMedia('(max-width:680px)'), reduceMotion = matchMedia('(prefers-reduced-motion:reduce)');
    const trace = window.GkxTraceWorkspace.init({report,entries,editor,attachments,locateRange,showTrace:() => setPanelOpen(true,'trace')});
    const baseText = visibleText(report.html);
    const cityCase = report.demoCaseId === 'sz-city-logistics-policy';
    let cityView;
    if (cityCase) surface.classList.add('city-logistics-report');
    const requested = new URLSearchParams(window.parent.location.search).get('panel');
    let preferred = ['process','trace'].includes(requested) ? requested : 'review';
    let editTimer = 0;
    function update() {
      const text = editor.textContent.trim();
      const model = window.GkxJudgementCases.forReport({
        id:sessionId, title:report.title, demoCaseId:report.demoCaseId, revision:report.revision, text, editor, modified:text !== baseText
      });
      surface.classList.toggle('has-review-conversation', Boolean(model.stages?.some(stage => stage.chat)));
      const sources = trace.refresh(model);
      onReviewChange?.(model, sources);
      if (model.kind === 'city-logistics') {
        if (!cityView) cityView = window.CityLogisticsReview.mount(studio,window.cityLogisticsDemo);
      } else {
        cityView = null;
        window.GkxJudgementStudio.mount(studio, model);
      }
    }
    function sync() {
      const narrow = mobile.matches;
      if (narrow && panel.parentElement !== mobileSlot) mobileSlot.prepend(panel);
      if (!narrow && panel.parentElement !== surface) surface.append(panel);
      mobileSlot.hidden = panel.hidden || !narrow;
      get('compact-judgement-link').hidden = panel.hidden;
      reviewSlot.hidden = preferred !== 'review';
      process.hidden = preferred !== 'process';
      get('trace-summary').hidden = preferred !== 'trace';
      nav.querySelectorAll('[data-judgement-view]').forEach(b => {
        b.setAttribute('aria-pressed',String(b.dataset.judgementView === preferred));
      });
    }
    function setPanelOpen(open,view = 'review') {
      if (open && preferred !== view) panel.scrollTop = 0;
      if (open) preferred = view;
      surface.classList.toggle('review-collapsed', !open);
      panel.hidden = !open;
      opener.hidden = open;
      opener.setAttribute('aria-expanded',String(open));
      sync();
      const parent = window.parent;
      parent.dispatchEvent(new parent.CustomEvent('gkx-review-panel-change',{detail:{sessionId,open}}));
    }
    function openReview() {
      setPanelOpen(true);
      nav.querySelector('[data-judgement-view="review"]').focus({preventScroll:true});
      if (mobile.matches) panel.scrollIntoView({block:'start'});
    }
    opener.addEventListener('click',openReview);
    window.addEventListener('gkx-open-review-panel',openReview);
    get('close-review-panel').addEventListener('click',() => {
      setPanelOpen(false);
      opener.focus({preventScroll:true});
    });
    nav.addEventListener('click', e => {
      const button = e.target.closest('[data-judgement-view]');
      if (!button) return;
      if (preferred !== button.dataset.judgementView) panel.scrollTop = 0;
      preferred = button.dataset.judgementView;
      sync();
    });
    if (cityCase) editor.addEventListener('click', e => {
      const issue = e.target.closest('button[data-review-issue]');
      if (!issue) return;
      e.preventDefault();
      clearTimeout(editTimer); update();
      setPanelOpen(true);
      if (cityView) cityView.openIssue(issue.dataset.reviewIssue,true,issue);
      else {studio.focus({preventScroll:true});studio.scrollIntoView({block:'nearest'});}
    });
    get('compact-judgement-link').addEventListener('click', () => {
      setPanelOpen(true);
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
    update();
    sync();
    return trace;
  }
  window.GkxJudgementWorkspace = { init };
})();
