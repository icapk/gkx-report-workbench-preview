export function createGeneration(React) {
  const el = React.createElement;
  const sessions = window.sessionReports;
  const caret = () => el('span', {className:'generation-caret', 'aria-hidden':true}, '⌄');

  function ConfirmedOutline({sections, title}) {
    return el('details', {className:'generation-outline'},
      el('summary', null, el('strong', null, '文章大纲'),
        el('span', {className:'generation-confirmed'}, '✓ 已确认'), caret()),
      el('div', {className:'generation-outline-body'},
        el('strong', null, title),
        el('ol', null, sections.map((section, i) => el('li', {key:i}, section.title,
          section.body && el('p', null, section.body),
          section.children.length > 0 && el('ul', null, section.children.map((child, j) => el('li', {key:j}, child))))))));
  }

  function AgentMessage({children}) {
    return el('p', {className:'generation-message'},
      el('img', {src:'./detail/assets/agent-logo.svg', alt:'', className:'generation-mark'}), children);
  }

  return function Generation({launch}) {
    const id = launch.sessionId;
    const [clock, setClock] = React.useState(() => sessions.generationFor(id));
    const definition = React.useMemo(() => sessions.restore(launch)?.definition || {}, [id, launch.runId]);
    const sections = React.useMemo(() => window.sessionOutline.normalize(definition.outline), [definition]);
    const steps = React.useMemo(() => window.sessionOutline.writingSteps(definition), [definition]);
    const [showProcess, setShowProcess] = React.useState(true);
    const toggle = React.useRef(null);
    const planHead = React.useRef(null);
    const processId = React.useId();

    React.useEffect(() => {
      const update = () => setClock(sessions.generationFor(id));
      window.addEventListener('gkx-report-updated', update);
      update();
      return () => window.removeEventListener('gkx-report-updated', update);
    }, [id]);

    const fields = definition.fields || [];
    const title = definition.outlineSettings?.title || fields.find(field => field.id === 'F01')?.value || launch.prompt;
    const goal = fields.find(field => field.id === 'F02')?.value;
    const materialNames = [...new Set([
      ...(definition.attachments || launch.attachments || []),
      ...(definition.outlineSettings?.files || [])
    ].map(file => typeof file === 'string' ? file : file?.name || file?.title).filter(Boolean))];
    const completed = Math.min(steps.length, Math.floor((clock?.progress || 0) * steps.length / 100));
    const current = steps[completed];
    const panelLabel = showProcess ? '关闭思考过程' : '查看思考过程';

    function closeProcess() {
      setShowProcess(false);
      const target = toggle.current.closest('details').open ? toggle.current : planHead.current;
      target.focus({preventScroll:true});
    }

    function activity(step, i) {
      const chapter = sections[i - 1];
      const active = i === completed;
      let label, content;
      if (i === 0) {
        label = '读取大纲 · ' + sections.length + ' 个章节';
        content = el(React.Fragment, null,
          el('p', null, '报告标题：' + title),
          el('ol', null, sections.map((item, j) => el('li', {key:j}, item.title))));
      } else if (chapter) {
        label = '整理章节 · ' + chapter.title;
        content = el(React.Fragment, null,
          el('p', null, `大纲中的第 ${i} 章，共 ${sections.length} 章。`),
          chapter.body && el('p', null, '写作要求：' + chapter.body),
          chapter.children.length > 0 && el('ul', {'aria-label':'子标题'}, chapter.children.map((child,j) =>
            el('li', {key:j}, child))));
      } else {
        label = '汇总文档 · ' + title;
        content = el(React.Fragment, null,
          el('p', null, step.detail),
          el('p', null, '报告目录：' + sections.map(item => item.title).join('、')));
      }
      return el('details', {key:i, className:'generation-activity', 'data-current':active, open:active},
        el('summary', null,
          el('span', {className:'generation-activity-state'}, active ? '进行中' : '已完成'),
          el('span', {className:'generation-activity-title'}, label), caret()),
        el('div', {className:'generation-activity-body'}, content,
          i === 0 && materialNames.length > 0 && el('p', null, '任务素材：' + materialNames.join('、'))));
    }

    return el('section', {className:'generation-workspace', 'data-process':showProcess, 'aria-label':'报告生成中'},
      el('div', {className:'generation-thread'}, el('div', {className:'generation-thread-inner'},
        el('div', {className:'generation-query'}, launch.prompt),
        el(AgentMessage, null, '已收到写作任务，以下是本次确认的文章大纲。'),
        el(ConfirmedOutline, {sections, title}),
        el(AgentMessage, null, '已接收确认的大纲，接下来将制定计划并按章节撰写报告。'),
        el('details', {className:'generation-plan', open:true},
          el('summary', {ref:planHead, className:'generation-plan-head'}, el('strong', null, '计划进度'),
            el('span', {className:'generation-progress-count', 'aria-label':`已完成 ${completed} 项，共 ${steps.length} 项`}, completed + '/' + steps.length), caret()),
          el('ol', {className:'generation-chapters'}, steps.map((step, i) => {
            const state = i < completed ? 'done' : i === completed ? 'current' : 'waiting';
            return el('li', {key:i, 'data-state':state, 'aria-current':state === 'current' ? 'step' : undefined},
              el('span', {className:'generation-dot', 'aria-hidden':true}, state === 'done' ? '✓' : state === 'current' ? '•••' : ''),
              el('span', {className:'generation-step-title'}, step.title),
              el('small', null, state === 'done' ? '已完成' : state === 'current' ? '进行中' : '待开始'));
          })),
          el('button', {type:'button', ref:toggle, className:'generation-status', 'aria-controls':processId,
            'aria-expanded':showProcess, 'aria-label':panelLabel + '，' + (current?.title || '计划已完成'),
            title:panelLabel, onClick:() => setShowProcess(open => !open)},
            el('span', {className:'generation-spinner', 'aria-hidden':true}),
            el('span', {className:'generation-status-label'}, current?.title || '计划已完成'), caret())))),
      el('aside', {id:processId, hidden:!showProcess, className:'generation-process', 'aria-label':'思考过程'},
        el('header', null, el('strong', null, '思考过程'),
          el('button', {type:'button', className:'generation-close', 'aria-label':'关闭思考过程', title:'关闭思考过程', onClick:closeProcess}, '×')),
        el('div', {className:'generation-process-summary'},
          el('p', null, '按已确认的文章大纲撰写《' + title + '》，共 ' + sections.length + ' 个章节。'),
          goal && el('p', null, '研究目标：' + goal)),
        el('div', {className:'generation-process-log'}, steps.slice(0, completed + 1).map(activity)),
        el('p', {className:'generation-executing', role:'status'}, current ? '正在执行：' + current.title : '执行计划已完成。')));
  };
}

export function createSessionPane(React, ReactDOM) {
  const el = React.createElement;
  return function SessionPane({kind,launch,title}) {
    const [slot,setSlot] = React.useState(null);
    React.useLayoutEffect(() => setSlot(document.getElementById('home-workflow-slot')), []);
    if (!slot) return null;
    return ReactDOM.createPortal(el('section', {className:'workbench-session-pane', 'data-pane':kind, 'aria-label':title},
      kind === 'report' && launch
        ? el('iframe', {className:'workbench-report-frame', title:'报告详情', src:window.sessionReports.embeddedUrl(launch.sessionId)})
        : el('div', {className:'workbench-session-empty'}, '当前浏览器中未找到这份报告，请从左侧选择会话。')), slot);
  };
}
