(() => {
  'use strict';

  const scoreLabels = ['很不满意', '不满意', '一般', '满意', '很满意'];
  const reasons = ['结论不明确', '依据不足', '建议难落地', '表述不清'];
  const node = (tag, cls, content) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (content !== undefined) el.textContent = content;
    return el;
  };
  function button(label, cls, click) {
    const el = node('button', cls, label);
    el.type = 'button';
    el.addEventListener('click', click);
    return el;
  }
  function stars(score, choose) {
    const group = node('span', 'rfb-stars');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', '报告评分，满分 5 分');
    const paint = value => [...group.children].forEach((star, i) => {
      star.textContent = i < value ? '★' : '☆';
      star.classList.toggle('rfb-lit', i < value);
    });
    scoreLabels.forEach((label, i) => {
      const value = i + 1;
      const star = button('', '', () => choose(value));
      star.title = value + ' 分 · ' + label;
      star.setAttribute('aria-label', value + ' 分');
      star.setAttribute('aria-pressed', String(value === score));
      star.addEventListener('pointerenter', () => paint(value));
      group.append(star);
    });
    group.addEventListener('pointerleave', () => paint(score));
    paint(score);
    return group;
  }

  function init({editor, sessionId, revision, sources, title}) {
    const bar = document.getElementById('report-feedback');
    const engine = window.GkxFeedbackReview;
    if (!bar || !engine) return;
    const version = () => window.reportActions.currentVersionName();
    const prefix = 'gkx-feedback:v1:' + JSON.stringify([sessionId, revision]) + ':';
    const key = name => prefix + name;
    function read(name) {
      try { return JSON.parse(localStorage.getItem(key(name))); } catch { return null; }
    }
    function store(record) {
      localStorage.setItem(key(record.version), JSON.stringify(record));
    }
    const dialog = node('dialog', 'rfb-dialog');
    dialog.setAttribute('aria-labelledby', 'rfb-title');
    const head = node('header', 'rfb-head');
    const headText = node('div');
    const heading = node('h2', '', '评价报告');
    heading.id = 'rfb-title';
    heading.tabIndex = -1;
    const subtitle = node('p', 'rfb-sub');
    headText.append(heading, subtitle);
    const close = button('×', 'rfb-close', () => dialog.close());
    close.setAttribute('aria-label', '关闭报告评价');
    head.append(headText, close);
    const body = node('div', 'rfb-body');
    const foot = node('footer', 'rfb-foot');
    const error = node('p', 'rfb-error');
    error.setAttribute('role', 'alert');
    dialog.append(head, body, error, foot);
    document.body.append(dialog);

    let form, trigger, busy = false;
    function showDialog() {
      if (!dialog.open) {
        trigger = document.activeElement;
        dialog.showModal();
      }
    }
    function reset(label, sub) {
      heading.textContent = label;
      subtitle.textContent = sub;
      body.replaceChildren();
      foot.replaceChildren();
      error.replaceChildren();
      body.scrollTop = 0;
    }
    dialog.addEventListener('cancel', event => {
      if (busy) event.preventDefault();
    });
    dialog.addEventListener('close', () => {
      if (trigger?.isConnected) trigger.focus({preventScroll:true});
      else bar.querySelector('button')?.focus({preventScroll:true});
    });
    function renderBar() {
      const current = version();
      const record = read(current);
      const line = node('div', 'rfb-strip');
      const prior = window.reportActions.feedbackOrigin?.(current);
      if (record) {
        line.append(node('strong', '', '我的评分'), node('span', 'rfb-rating', '★ ' + record.score + ' / 5'),
          button(record.review ? '查看建议评议' : '查看评价', 'rfb-link', () => openRecord(record)));
      } else {
        line.append(node('strong', '', '写得不好？快来吐槽。'), stars(0, openForm));
      }
      if (prior && !record) {
        const previous = read(prior);
        if (previous) line.append(button('上次建议评议', 'rfb-link', () => openRecord(previous)));
      }
      const name = node('span', 'rfb-current', current);
      line.append(name);
      bar.replaceChildren(line);
    }
    function openForm(score) {
      const current = version();
      const existing = read(current);
      if (existing) { openRecord(existing); return; }
      form = {version:current, score, reasons:new Set(), explanation:'', suggestions:[], previous:null};
      showDialog();
      renderForm();
      dialog.querySelector('.rfb-stars button[aria-pressed="true"]')?.focus();
    }

    function amend(record) {
      const targets = engine.targets(editor);
      const suggestions = (record.review?.items || []).map(item => {
        const same = targets.find(t => t.id === item.targetId && t.heading === item.heading && t.text === item.before);
        return {targetId:same?.id || '', text:item.suggestion};
      });
      form = {version:record.version, score:record.score, reasons:new Set(record.reasons),
        explanation:record.explanation, suggestions, previous:record};
      renderForm();
      if (!suggestions.length) body.querySelector('.rfb-section-head button')?.click();
    }

    function renderForm() {
      reset('评价报告', title + ' · ' + form.version);
      const grade = node('div', 'rfb-grade');
      const gradeTitle = node('strong', '', '总体评分');
      const scoreName = node('span', 'rfb-score-name');
      const starSlot = node('span');
      function paintScore() {
        starSlot.replaceChildren(stars(form.score, next => {
          form.score = next;
          paintScore();
          starSlot.querySelector('[aria-pressed="true"]').focus();
          updateReason();
          error.textContent = '';
        }));
        scoreName.textContent = form.score + ' 分 · ' + scoreLabels[form.score - 1];
      }
      paintScore();
      grade.append(gradeTitle, starSlot, scoreName);

      const section = node('section', 'rfb-section');
      const reasonTitle = node('h3');
      const chips = node('div', 'rfb-chips');
      reasons.forEach(reason => {
        const chip = button(reason, '', () => {
          if (form.reasons.has(reason)) form.reasons.delete(reason);
          else form.reasons.add(reason);
          chip.setAttribute('aria-pressed', String(form.reasons.has(reason)));
          error.textContent = '';
        });
        chip.setAttribute('aria-pressed', String(form.reasons.has(reason)));
        chips.append(chip);
      });
      const explanation = node('textarea', 'rfb-field');
      explanation.rows = 2;
      explanation.maxLength = 1000;
      explanation.value = form.explanation;
      explanation.setAttribute('aria-label', '补充原因');
      explanation.addEventListener('input', () => { form.explanation = explanation.value; error.textContent = ''; });
      function updateReason() {
        const low = form.score <= 3;
        reasonTitle.textContent = low ? '哪里需要改进？' : '评分原因（选填）';
        chips.hidden = !low;
        explanation.placeholder = low ? '选择上方原因，或写下你的理由' : '可以说说哪些内容对你有帮助';
      }
      updateReason();
      section.append(reasonTitle, chips, explanation);
      const proposals = node('section', 'rfb-section');
      const label = node('div', 'rfb-section-head');
      label.append(node('h3', '', '修改建议（选填）'));
      const rows = node('div', 'rfb-rows');
      const targets = engine.targets(editor);
      const add = button('添加修改建议', 'rfb-link', () => {
        const likely = targets.find(t => /优先|先行|试点前|宜先|应先/.test(t.text));
        const entry = {targetId:(likely || targets[0])?.id || '', text:''};
        form.suggestions.push(entry);
        renderRows();
        rows.lastElementChild?.querySelector('textarea')?.focus();
      });
      add.disabled = !targets.length;
      label.append(add);
      proposals.append(label, rows);
      function renderRows() {
        rows.replaceChildren();
        for (const [index, entry] of form.suggestions.entries()) {
          const card = node('div', 'rfb-suggestion');
          const top = node('div', 'rfb-section-head');
          top.append(node('strong', '', '建议 ' + (index + 1)), button('移除', 'rfb-muted', () => {
            form.suggestions.splice(index, 1); renderRows(); add.focus();
          }));
          const select = node('select', 'rfb-field');
          select.setAttribute('aria-label', '目标段落');
          if (!entry.targetId) {
            const empty = node('option', '', '请选择当前正文中的目标段落');
            empty.value = ''; select.append(empty);
          }
          targets.forEach(target => {
            const opt = node('option', '', target.heading + ' · ' + target.text.slice(0,32));
            opt.value = target.id;
            select.append(opt);
          });
          select.value = entry.targetId;
          select.addEventListener('change', () => { entry.targetId = select.value; });
          const suggestion = node('textarea', 'rfb-field');
          suggestion.rows = 2;
          suggestion.maxLength = 1000;
          suggestion.setAttribute('aria-label', '修改建议');
          suggestion.placeholder = '例如：增加试点前要核对的条件';
          suggestion.value = entry.text;
          suggestion.addEventListener('input', () => { entry.text = suggestion.value; error.textContent = ''; });
          card.append(top, select, suggestion);
          rows.append(card);
        }
        submit.textContent = form.suggestions.length ? '提交并评议' : '提交评价';
      }
      const submit = button('提交评价', 'rfb-primary', () => {
        if (form.score <= 3 && !form.reasons.size && !form.explanation.trim()) {
          error.textContent = '请选一个需要改进的原因，或写下你的理由。';
          explanation.focus(); return;
        }
        const missing = form.suggestions.findIndex(item => !item.targetId);
        if (missing >= 0) {
          error.textContent = '请为第 ' + (missing + 1) + ' 条建议选择目标段落。';
          rows.children[missing].querySelector('select').focus(); return;
        }
        const blank = form.suggestions.findIndex(item => !item.text.trim());
        if (blank >= 0) {
          error.textContent = '请填写第 ' + (blank + 1) + ' 条修改建议，或将它移除。';
          rows.children[blank].querySelector('textarea').focus(); return;
        }
        if (form.version !== version()) { error.textContent = '报告版本已切换，请关闭后重新评价。'; return; }
        const existing = read(form.version);
        if (existing && (!form.previous || existing.review?.id !== form.previous.review?.id || existing.confirmed)) {
          openRecord(existing); return;
        }
        try {
          const review = form.suggestions.length ? engine.evaluate({editor, sources, suggestions:form.suggestions}) : null;
          const record = {version:form.version, score:form.score, reasons:form.score <= 3 ? [...form.reasons] : [],
            explanation:form.explanation.trim(), review, confirmed:null};
          store(record);
          renderBar();
          openRecord(record);
        } catch (e) { error.textContent = '评价未能保存。' + (e.message || '请检查本地存储后重试。'); }
      });
      renderRows();
      body.append(grade, section, proposals);
      foot.append(button('取消', 'rfb-secondary', () => dialog.close()), submit);
    }

    function openRecord(record) {
      showDialog();
      const review = record.review;
      reset(review ? '修改建议评议' : '评价已提交', title + ' · ' + record.version);
      heading.focus({preventScroll:true});
      const summary = node('div', 'rfb-summary');
      summary.append(node('strong', '', '我的评分'), node('span', 'rfb-rating', '★ ' + record.score + ' / 5'));
      const reason = [...record.reasons, record.explanation].filter(Boolean).join(' · ');
      if (reason) summary.append(node('p', '', reason));
      body.append(summary);
      if (!review) {
        if (version() === record.version) foot.append(button('补充修改建议', 'rfb-secondary', () => amend(record)));
        foot.append(button('完成', 'rfb-primary', () => dialog.close()));
        return;
      }
      const confirmed = record.confirmed || window.reportActions.feedbackResult(review.id);
      const selected = new Set();
      const confirm = button('确认生成修订版', 'rfb-primary', async () => {
        if (busy || !selected.size) return;
        if (version() !== record.version && !window.reportActions.feedbackResult(review.id)) {
          error.textContent = '当前报告已切换版本，请在原版本处理这条评议。'; return;
        }
        busy = true; confirm.disabled = true; close.disabled = true;
        confirm.textContent = '正在保存…';
        try {
          const result = window.reportActions.feedbackResult(review.id) ||
            await engine.apply(engine.resume({review, editor, sources}), [...selected]);
          record.confirmed = result;
          let saved = true;
          try { store(record); } catch { saved = false; }
          renderBar();
          openRecord(record);
          if (!saved) error.textContent = '修订版已保存，反馈状态未能写入。可在版本管理中查看修订稿。';
        } catch (e) {
          error.textContent = e.message || '修订版未能生成，请重试。';
          if (e.code === 'STALE_REVIEW' && version() === record.version) {
            error.append(button('按当前正文重新评议', 'rfb-link', () => amend(record)));
          }
        } finally {
          busy = false; close.disabled = false; confirm.disabled = !selected.size; confirm.textContent = '确认生成修订版';
        }
      });
      const banner = node('div', 'rfb-decision-head');
      banner.append(node('h3', '', '逐条评议 · ' + review.items.length + ' 条'), node('span', '', '模拟评议'));
      body.append(banner);
      if (confirmed) {
        const status = node('div', 'rfb-success');
        status.append(node('strong', '', '已生成修订版 ' + confirmed.name),
          node('p', '', '已应用 ' + confirmed.appliedCount + ' 条建议，可在「版本管理」对照修改前后的正文。'));
        body.append(status);
      }
      for (const [index, item] of review.items.entries()) {
        const card = node('section', 'rfb-verdict');
        const line = node('div', 'rfb-section-head');
        line.append(node('strong', '', '建议 ' + (index + 1) + ' · ' + item.heading));
        const tag = node('span', 'rfb-tag', item.decision);
        if (item.applicable) tag.classList.add('rfb-positive');
        line.append(tag);
        card.append(line, node('p', 'rfb-quote', item.suggestion));
        for (const [name, value] of [['评议理由', item.reason], ['处理方式', item.plan]]) {
          const row = node('div', 'rfb-fact');
          row.append(node('b', '', name), node('span', '', value));
          card.append(row);
        }
        if (item.applicable) {
          const diff = node('div', 'rfb-diff');
          for (const [label, value, cls] of [['原文', item.before, 'rfb-before'], ['拟改为', item.after, 'rfb-after']]) {
            const block = node('div', cls);
            block.append(node('b', '', label), node('p', '', value));
            diff.append(block);
          }
          card.append(diff);
          if (!confirmed && version() === record.version) {
            const use = node('label', 'rfb-use');
            const check = node('input');
            check.type = 'checkbox'; check.checked = true; selected.add(item.id);
            check.addEventListener('change', () => {
              if (check.checked) selected.add(item.id); else selected.delete(item.id);
              confirm.disabled = !selected.size;
            });
            use.append(check, node('span', '', '纳入本次修订')); card.append(use);
          } else if (confirmed?.selected) {
            card.append(node('p', 'rfb-note', confirmed.selected.includes(item.id) ? '已纳入修订版' : '未选入本次修订'));
          }
        }
        body.append(card);
      }
      foot.append(button('返回报告', 'rfb-secondary', () => dialog.close()));
      if (selected.size) foot.append(confirm);
    }
    renderBar();
    window.addEventListener('gkx-version-changed', renderBar);
    window.addEventListener('storage', event => {
      if (!event.key || event.key.startsWith(prefix)) renderBar();
    });
  }
  window.GkxFeedbackPanel = {init};
})();
