(() => {
  const make = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value != null) el.textContent = String(value);
    return el;
  };

  function fold(label, status) {
    const section = make('details', 'ph-section');
    const summary = make('summary');
    summary.append(make('strong', '', label));
    if (status) summary.append(make('span', 'ph-status', status));
    const arrow = make('span', 'ph-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    summary.append(arrow);
    section.append(summary);
    return section;
  }

  function assistantMessage(text) {
    const row = make('div', 'ph-message');
    const avatar = make('img', 'ph-avatar');
    avatar.src = 'assets/agent-logo.svg';
    avatar.alt = '';
    row.append(avatar, make('p', '', text));
    return row;
  }

  function discussion(notes, report, definition) {
    const confirmed = notes.some(entry => entry.title === '已确认研究任务') || definition?.consent;
    const card = fold('任务澄清', confirmed ? '✓ 已确认' : '');
    const thread = make('div', 'ph-thread');
    for (const note of notes) {
      const message = make('div', 'ph-note ' + (note.role === 'user' ? 'ph-note-user' : ''));
      message.append(make('strong', '', note.title || (note.role === 'user' ? '我的回复' : '智能助手')));
      if (note.text) message.append(make('p', '', note.text));
      if (note.items?.length) {
        const list = make('ul');
        for (const item of note.items) if (typeof item === 'string') list.append(make('li', '', item));
        message.append(list);
      }
      thread.append(message);
    }
    if (report.outline?.length) {
      const outline = fold('文章大纲', definition?.outlineConfirmed ? '✓ 已确认' : '');
      const chapters = make('ol', 'ph-chapters');
      for (const chapter of report.outline) {
        const label = typeof chapter === 'string' ? chapter : chapter?.title;
        if (!label) continue;
        const li = make('li');
        li.append(make('strong', '', label));
        if (chapter.children?.length) {
          const list = make('ul');
          for (const child of chapter.children) list.append(make('li', '', typeof child === 'string' ? child : child.title));
          li.append(list);
        }
        chapters.append(li);
      }
      outline.append(chapters);
      thread.append(outline);
    }
    card.append(thread);
    return card;
  }

  function planCard(report, durationMs) {
    const steps = (report.steps || []).map(step => typeof step === 'string' ? {title:step} : step).filter(step => step?.title);
    if (!steps.length) return null;
    const plan = fold('计划进度');
    const summary = plan.querySelector('summary');
    const count = make('span', 'ph-count', steps.length + '/' + steps.length);
    count.setAttribute('aria-label', '已完成 ' + steps.length + ' 项，共 ' + steps.length + ' 项');
    summary.insertBefore(count, summary.lastChild);
    const stats = [];
    if (Number.isFinite(durationMs) && durationMs > 0) {
      const seconds = Math.max(1, Math.round(durationMs / 1000));
      stats.push('完成用时 ' + (seconds >= 60 ? Math.floor(seconds / 60) + ' 分 ' : '') + seconds % 60 + ' 秒');
    }
    stats.push('引用 ' + (report.sources?.length || 0) + ' 个信息源');
    summary.append(make('small', 'ph-plan-meta', stats.join('，')));
    const list = make('ol', 'ph-plan');
    for (const step of steps) {
      const li = make('li');
      const mark = make('span', 'ph-check', '✓');
      mark.setAttribute('aria-hidden', 'true');
      li.append(mark);
      if (step.detail) {
        const content = make('details', 'ph-step');
        content.append(make('summary', '', step.title), make('p', '', step.detail));
        li.append(content);
      } else li.append(make('span', '', step.title));
      list.append(li);
    }
    plan.append(list);
    return plan;
  }

  function reportCard(report, controls) {
    const card = make('div', 'ph-file');
    const opener = make('button', 'ph-file-open');
    opener.type = 'button';
    opener.setAttribute('aria-label', '查看报告：' + report.title);
    opener.setAttribute('aria-controls', 'document-pane');
    opener.setAttribute('aria-expanded', 'true');
    opener.addEventListener('click', controls.openReport);
    const cover = make('span', 'ph-cover');
    cover.setAttribute('aria-hidden', 'true');
    const icon = make('img');
    icon.src = '../figma/imgReport.svg';
    icon.alt = '';
    cover.append(icon);
    const info = make('span', 'ph-file-info');
    info.append(make('strong', '', report.title));
    if (report.type) info.append(make('span', 'ph-type', report.type));
    const date = new Date(report.date);
    if (report.date && !isNaN(date)) info.append(make('time', '', '创建时间 ' + date.toLocaleString('zh-CN', {hour12:false})));
    opener.append(cover, info);
    const download = make('button', 'ph-download', '下载');
    download.type = 'button';
    download.setAttribute('aria-haspopup', 'menu');
    download.setAttribute('aria-label', '下载报告');
    download.addEventListener('click', () => controls.downloadReport('download', download));
    card.append(opener, download);
    return card;
  }

  window.renderProcessHistory = (container, report, controls) => {
    const wrap = make('div', 'ph-history');
    const history = (report.history || []).filter(Boolean);
    const latestRequest = history.slice().reverse().find(entry => entry.title === '写作需求' || entry.title === '再次澄清 · 写作需求');
    const request = controls.request || latestRequest?.text;
    if (request) {
      const row = make('div', 'ph-user-request');
      const user = make('span', 'ph-user-icon', '我');
      row.append(make('p', '', request), user);
      wrap.append(row);
    }
    const notes = history.filter(entry => entry !== latestRequest && entry.title !== '报告已生成');
    if (notes.length || report.outline?.length) {
      wrap.append(assistantMessage('已收到您的写作需求。'), discussion(notes, report, controls.definition));
    }
    const plan = planCard(report, controls.durationMs);
    if (plan) wrap.append(assistantMessage('已根据任务要求完成以下计划。'), plan);
    wrap.append(assistantMessage('下面是为您最终生成的报告。'), reportCard(report, controls));
    container.replaceChildren(wrap);
  };
})();
