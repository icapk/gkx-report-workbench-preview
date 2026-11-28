import {buildResearchFlow} from '../assets/research-flow-model.js?v=e78c9123e402';
import {mountResearchFlow} from '../assets/research-flow-view.js?v=5433332dfec8';

(() => {
  'use strict';

  const params=new URLSearchParams(location.search);
  const sessionId=params.get('session');
  const workbench=new URL('../index.html',location.href);
  const host=window.parent;
  let sameOriginHost=false;
  try {sameOriginHost=host!==window && host.location.origin===location.origin;}catch {}
  if(params.get('embedded')!=='1' || !sameOriginHost) {
    if(sessionId) workbench.hash='/report/'+encodeURIComponent(sessionId);
    const navigation=sameOriginHost ? host.location : window.location;
    navigation.replace(workbench.href);
    return;
  }
  const api=host.sessionReports;

  const paths = {
    'history-chat':'<path d="M20 13a4 4 0 0 1-4 4H9l-5 4v-5a4 4 0 0 1-2-3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M7 8h8M7 12h5"/>',
    trace:'<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="5.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.1-4M8.2 13.2l7.1 4"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.5M3 12h.5M3 18h.5" stroke-width="2.8"/>',
    copy:'<rect x="8" y="7" width="12" height="15" rx="2"/><path d="M15 7V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    history:'<path d="M3 11a9 9 0 1 1 2.5 7M3 5v6h6"/><path d="M12 7v6l4 2"/>',
    upload:'<path d="M7 18H6a4 4 0 0 1-1-7.9 7 7 0 0 1 13.5-.4A4.3 4.3 0 0 1 18 18h-1M12 20V11m-3 3 3-3 3 3"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    'panel-close':'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 4v16m7-11-3 3 3 3"/>'
  };
  document.querySelectorAll('i[data-icon]').forEach(el => {
    el.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + paths[el.dataset.icon] + '</svg>';
  });
  const get = id => document.getElementById(id);
  const reader = get('reader'), editor = get('editor'), toc = get('toc'), tocItems = get('toc-items');
  const documentPane = get('document-pane'), conversation = get('process-content');
  const tocToggle = document.querySelector('[data-action="toc"]');
  let report;
  try {if(sessionId)report=api?.getReport(sessionId);}catch {}
  if(!report || report.sessionId!==sessionId || !report.html || !report.title) {
    get('unavailable').hidden=false;
    let known=false;try{known=Boolean(sessionId && api?.launchFor(sessionId));}catch {}
    if(known) {
      get('unavailable-message').textContent='此会话暂未生成报告，可返回会话继续写作。';
      get('return-home').textContent='返回会话';
    }
    get('return-home').addEventListener('click',()=>{
      if(known)api.openSession(sessionId);else host.location.assign(workbench.href);
    });
    return;
  }
  get('detail').hidden=false;
  document.title=report.title+' · 报告详情';
  const revision=String(report.revision || report.date || 'initial');
  const draftKey='gkx-v2-writing-detail:draft:v1:'+JSON.stringify([sessionId,revision]);
  let headings = [], activeLink, activeFrame, clickedScrollTop = null;
  editor.innerHTML=window.reportActions.safeHTML(report.html);

  function renderToc() {
    clickedScrollTop = null;
    headings = [...editor.querySelectorAll('h1,h2,h3')].filter(el => el.textContent.trim());
    const buttons = headings.map(heading => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = heading.textContent.trim();
      b.title = b.textContent;
      b.dataset.level = heading.tagName.slice(1);
      b.addEventListener('click', () => {
        if (window.matchMedia('(max-width:760px)').matches) setToc(false);
        reader.scrollTop += heading.getBoundingClientRect().top - reader.getBoundingClientRect().top - 15;
        // Near the end several headings share the same maximum scroll position.
        clickedScrollTop = reader.scrollTop;
        selectLink(b);
      });
      return b;
    });
    activeLink = null;
    tocItems.replaceChildren(...buttons);
    highlightSection();
  }
  function selectLink(link) {
    if (activeLink === link) return;
    activeLink?.removeAttribute('aria-current');
    link?.setAttribute('aria-current','location');
    activeLink = link;
  }
  function highlightSection() {
    if (toc.hidden || !headings.length) return;
    if (clickedScrollTop !== null && Math.abs(reader.scrollTop - clickedScrollTop) < 1) return;
    clickedScrollTop = null;
    const start = reader.getBoundingClientRect().top + 24;
    let index = 0;
    for (let i=1; i<headings.length; i++) {
      if(headings[i].getBoundingClientRect().top > start) break;
      index = i;
    }
    selectLink(tocItems.children[index]);
  }
  function setToc(open) {
    toc.hidden = !open;
    tocToggle.setAttribute('aria-expanded', String(open));
    if(open) highlightSection();
  }
  reader.addEventListener('scroll', () => {
    if (activeFrame || toc.hidden) return;
    activeFrame = requestAnimationFrame(() => { activeFrame=0; highlightSection(); });
  }, {passive:true});
  function saveDraft() {
    try { localStorage.setItem(draftKey,editor.innerHTML); }
    catch { window.reportActions.notify('浏览器存储空间不足，当前修改仅在本页保留。'); }
    if(!toc.hidden) renderToc();
  }
  const details = Array.isArray(report.sourceDetails) ? report.sourceDetails : [];
  const listed = Array.isArray(report.sources) && report.sources.length ? report.sources : details;
  const entries = listed.map(source => {
    if (typeof source !== 'string') return source;
    return details.find(item => item?.title === source || item?.name === source) || source;
  });
  window.reportActions.init({editor,sessionId,revision,title:report.title,date:report.date,sources:entries,onChange:saveDraft});
  try {
    const draft = localStorage.getItem(draftKey);
    if(draft !== null) editor.innerHTML = window.reportActions.safeHTML(draft);
  } catch {}
  const launch = api.launchFor(sessionId);
  const state = launch && api.restore(launch);
  const generation = api.generationFor(sessionId);
  const flow = document.createElement('div');
  flow.className = 'history-flow';
  let graph;
  const trace = window.GkxJudgementWorkspace.init({
    report, sessionId, editor, entries,
    onReviewChange(review, traceModel) {
      const model = buildResearchFlow({
        title:report.title, report, definition:state?.definition, progress:100,
        complete:true, review, trace:traceModel
      });
      if (graph) graph.update(model);
      else graph = mountResearchFlow(flow, model);
    }
  });
  renderToc();
  if (window.matchMedia('(max-width:760px)').matches) setToc(false);
  // Keep pasted material local and preserve the current document's formatting.
  editor.addEventListener('paste', event => {
    event.preventDefault();
    const plain = event.clipboardData?.getData('text/plain');
    if(plain) document.execCommand('insertText',false,plain);
  });
  editor.addEventListener('drop', e => e.preventDefault());
  function showSource(e) {
    const marker = e.target.closest('[data-source]');
    if(marker) { e.preventDefault(); if (!trace.openAttachment(marker)) window.reportActions.run('source',marker); }
  }
  editor.addEventListener('click', showSource);
  const sources = get('sources');
  get('references').hidden=entries.length===0;
  get('source-count').textContent='引用材料（'+entries.length+'）';
  entries.forEach((source, index) => {
    const name=typeof source==='string'? source : (source?.title || source?.name || '来源 '+(index+1));
    const item = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.textContent = name; b.dataset.source = String(index+1); b.dataset.sourceIndex = String(index);
    item.append(b); sources.append(item);
  });
  sources.addEventListener('click',showSource);
  get('report-tools').addEventListener('click', e => {
    const button = e.target.closest('button[data-action]');
    if(!button) return;
    if(button.dataset.action === 'toc') {
      if(toc.hidden) renderToc();
      setToc(toc.hidden);
    } else window.reportActions.run(button.dataset.action,button);
  });
  get('close-toc').addEventListener('click', () => { setToc(false); tocToggle.focus(); });
  function showDocument(open) {
    documentPane.hidden = !open;
    get('detail').classList.toggle('conversation-only', !open);
    get('detail').dispatchEvent(new CustomEvent('gkx-document-visibility',{detail:{open}}));
    const card = conversation.querySelector('.ph-file-open');
    card.setAttribute('aria-expanded', String(open));
    if (open) {
      get('close-report').focus({preventScroll:true});
      highlightSection();
    } else card.focus({preventScroll:true});
  }
  window.renderProcessHistory(conversation, report, {
    request: launch?.prompt,
    definition: state?.definition,
    durationMs: generation?.durationMs,
    openReport: () => showDocument(true),
    downloadReport: (format, anchor) => window.reportActions.run(format, anchor)
  });
  conversation.prepend(flow);
  if (window.matchMedia('(max-width:800px)').matches &&
      new URLSearchParams(host.location.search).get('panel') === 'process') {
    showDocument(false);
    conversation.parentElement.scrollTop = 0;
  }
  window.addEventListener('gkx-open-report', () => { if (documentPane.hidden) showDocument(true); });
  get('close-report').addEventListener('click', () => showDocument(false));
  document.addEventListener('keydown', e => {
    if(e.key==='Escape' && !documentPane.hidden && !document.querySelector('dialog[open]') && !toc.hidden) {
      setToc(false); tocToggle.focus();
    }
  });
})();
