(function () {
  'use strict';
  const instances = new WeakMap();
  const phaseNames = { counter: '质询', round: '取舍', quality: '修订' };
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function avatar(type, name) {
    return '<div class="gjs-seat gjs-seat-' + type + '"><span class="gjs-avatar" aria-hidden="true"><i class="gjs-antenna"></i><i class="gjs-shell"><i class="gjs-face"><i></i><i></i></i></i><i class="gjs-collar"></i></span><span class="gjs-seat-name">' + name + '</span></div>';
  }
  function stream(side) {
    return '<div class="gjs-stream gjs-stream-' + side + '" aria-hidden="true"><i></i><b></b></div>';
  }
  function stageDiagram(stages) {
    return '<div class="gjs-visual" aria-hidden="true">' + avatar('author','反方校验智能体') + stream('left') +
      '<div class="gjs-junction"><span></span></div>' + stream('right') + avatar('peer','质量审查智能体') + '</div>' +
      '<nav class="gjs-sequence" aria-label="研判阶段">' + stages.map((stage, i) =>
        '<button type="button" data-gjs-stage="' + i + '"><span class="gjs-step-no">' + (i + 1) + '</span><span>' + esc(stage.label) + '</span></button>'
      ).join('') + '</nav>';
  }
  function evidenceMarkup(stage) {
    if (!Array.isArray(stage.evidence) || !stage.evidence.length) return '';
    return '<div class="gjs-sources">' + stage.evidence.map((item, index) => {
      const locator = item.quote ? '<button type="button" class="gjs-locate" data-gjs-source="' + index + '">定位正文<span aria-hidden="true"> ↗</span></button>' : '';
      return '<div class="gjs-source"><div><b>' + esc(item.label || '报告原文') + '</b>' + locator + '</div>' +
        (item.quote || item.note ? '<blockquote>' + esc(item.quote || item.note) + '</blockquote>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function recordList(title, rows, valueKey) {
    if (!rows?.length) return '';
    return '<section class="gjs-records"><h4>'+esc(title)+'</h4><dl>'+rows.map(row=>
      '<div><dt>'+esc(row.label)+'</dt><dd>'+esc(row[valueKey])+'</dd></div>'
    ).join('')+'</dl></section>';
  }
  function scenarioAnswer(option) {
    const responses=[['反方校验',option.counter],['质量审查',option.quality],['主持取舍',option.ruling]];
    return '<strong>此假设下的回应</strong>' + responses.map(([role,answer]) =>
      '<div><b>' + role + '</b><p>' + esc(answer) + '</p></div>').join('');
  }
  function panelContent(stage, model) {
    let body = '<div class="gjs-stage-role"><i></i>' + esc(stage.role || stage.label) + '</div><h3>' + esc(stage.summary) + '</h3>';
    body += recordList('模拟记录',stage.records,'value');
    if (stage.detail) body += '<p class="gjs-stage-detail">' + esc(stage.detail) + '</p>';
    if (stage.key === 'quality') body += recordList('逐项审查', stage.checks, 'result');
    if (stage.key === 'round' && Array.isArray(model.scenarios) && model.scenarios.length) {
      body += '<details class="gjs-sim"><summary><strong>条件推演</strong><span>假如补一份材料</span><i aria-hidden="true"></i></summary>' +
        '<div class="gjs-sim-choices" role="group" aria-label="选择假设材料">' + model.scenarios.map((option, i) =>
          '<button type="button" data-gjs-scenario="' + i + '" aria-pressed="' + String(i === 0) + '">' + esc(option.label) + '</button>'
        ).join('') + '</div><div class="gjs-sim-answer" aria-live="polite">' + scenarioAnswer(model.scenarios[0]) + '</div></details>';
    }
    if (stage.key === 'round' && stage.voices?.length) {
      body += '<div class="gjs-voices">' + stage.voices.map(voice =>
        '<div><b>' + esc(voice.name) + '</b><p>' + esc(voice.text) + '</p></div>'
      ).join('') + '</div>';
    }
    if (stage.key === 'quality' && model.before && model.after) {
      body += '<div class="gjs-diff"><div><b>' + esc(model.beforeLabel || '原稿关注点') + '</b><p>' + esc(model.before) + '</p></div><div><b>' + esc(model.afterLabel || '核对后的建议') + '</b><p>' + esc(model.after) + '</p></div></div>';
    }
    const traceKey = {counter:'source',round:'reason',quality:'metric'}[stage.key];
    const traceLabel = {counter:'查看原始材料',round:'追溯判断依据',quality:'查看指标口径'}[stage.key];
    return body + evidenceMarkup(stage) + '<button type="button" class="gjs-trace-link" data-trace-stage="' + traceKey + '">' + traceLabel + ' ↗</button>';
  }
  function mount(host, model) {
    if (!(host instanceof Element)) return;
    if (!model?.demo || model.stages?.length !== 3) model = window.GkxJudgementCases.forReport({id:model?.id, title:model?.title});
    const serial = JSON.stringify(model);
    const previous = instances.get(host);
    if (previous?.serial === serial && previous.root.parentNode === host) return previous.api;
    previous?.api.destroy();
    const doc = host.ownerDocument, win = doc.defaultView;
    const root = doc.createElement('section');
    root.className = 'gjs';
    root.setAttribute('aria-label', '研判回放');
    host.replaceChildren(root);
    const stages = Array.isArray(model.stages) ? model.stages.filter(s => s && Object.hasOwn(phaseNames, s.key)) : [];
    const reduceMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
    const duration = 11500;
    let index = 0, visible = false, timer = null;
    let observer;
    function sync() {
      win.clearTimeout(timer);
      const inView = visible && !doc.hidden && root.isConnected;
      root.classList.toggle('gjs-in-view', inView);
      // Keep interactive details in place while the reader is checking a scenario or a source.
      if (!inView || reduceMotion.matches || root.querySelector('.gjs-sim[open], .gjs-panel :focus-visible') || doc.querySelector('dialog[open]')) return;
      timer = win.setTimeout(() => show((index + 1) % stages.length), duration);
    }
    function onFocusChange() {
      win.queueMicrotask(sync);
    }
    function show(next) {
      index = next;
      const stage = stages[index];
      root.dataset.stage = stage.key;
      root.querySelector('.gjs-junction span').textContent = phaseNames[stage.key];
      root.querySelectorAll('[data-gjs-stage]').forEach((button,i) => button.setAttribute('aria-pressed', String(i === index)));
      root.querySelector('.gjs-panel').innerHTML = panelContent(stage, model);
      sync();
    }
    function onClick(event) {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.hasAttribute('data-gjs-stage')) show(Number(button.dataset.gjsStage));
      else if (button.hasAttribute('data-gjs-scenario')) {
        const option = model.scenarios?.[Number(button.dataset.gjsScenario)];
        if (!option || stages[index].key !== 'round') return;
        root.querySelectorAll('[data-gjs-scenario]').forEach(el => el.setAttribute('aria-pressed',String(el === button)));
        root.querySelector('.gjs-sim-answer').innerHTML = scenarioAnswer(option);
      }
      else if (button.hasAttribute('data-gjs-source')) {
        const stage=stages[index], quote=stage.evidence?.[Number(button.dataset.gjsSource)]?.quote;
        if (quote) host.dispatchEvent(new win.CustomEvent('gkx-judgement-locate', {bubbles:true,detail:{quote,stage:stage.key}}));
      }
    }
    function onKeys(event) {
      const current = event.target.closest('[data-gjs-stage]');
      if (!current) return;
      const directions = {ArrowLeft: (index + stages.length - 1) % stages.length, ArrowRight:(index + 1) % stages.length, Home:0, End: stages.length - 1};
      if (!Object.hasOwn(directions, event.key)) return;
      event.preventDefault(); show(directions[event.key]);
      root.querySelector('[data-gjs-stage="' + index + '"]').focus();
    }
    function destroy() {
      win.clearTimeout(timer); observer?.disconnect(); reduceMotion.removeEventListener('change', sync);
      doc.removeEventListener('toggle',sync,true);
      root.removeEventListener('focusin',onFocusChange); root.removeEventListener('focusout',onFocusChange);
      doc.removeEventListener('visibilitychange', sync); root.removeEventListener('click',onClick); root.removeEventListener('keydown',onKeys);
      root.remove(); if (instances.get(host)?.root===root) instances.delete(host);
    }
    const api = {destroy};
    instances.set(host,{root,serial,api});
    const headline = model.afterShort || model.after || '研判结果';
    root.innerHTML = '<header class="gjs-outcome"><div class="gjs-caption"><span class="gjs-verdict-icon" aria-hidden="true">✓</span>研判结论<span class="gjs-demo">模拟研判</span></div><h2>' + esc(headline) +
      '</h2>' + (model.after && model.after !== headline ? '<p>' + esc(model.after) + '</p>' : '') + '</header><div class="gjs-path">' +
      '<h3 class="gjs-process-heading">判断形成过程</h3>' +
      stageDiagram(stages) + '<section class="gjs-panel" aria-label="当前阶段记录"></section></div>';
    root.addEventListener('click',onClick); root.addEventListener('keydown',onKeys);
    root.addEventListener('focusin',onFocusChange); root.addEventListener('focusout',onFocusChange);
    doc.addEventListener('toggle',sync,true);
    reduceMotion.addEventListener('change',sync); doc.addEventListener('visibilitychange',sync);
    observer = new win.IntersectionObserver(entries => {
      if (!root.isConnected) { destroy(); return; }
      if (!entries.length) return;
      visible = entries[entries.length-1].isIntersecting;
      sync();
    });
    observer.observe(root.querySelector('.gjs-visual'));
    show(0);
    return api;
  }
  window.GkxJudgementStudio = {mount};
})();
