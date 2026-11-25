export function createSessionPane(React, ReactDOM) {
  const el = React.createElement;
  const sessions = window.sessionReports;

  function ConfirmedOutline({definition}) {
    const sections = definition.outline || [];
    return el('details', {className:'generation-outline'},
      el('summary', null, el('strong', null, '文章大纲'), el('span', {className:'generation-confirmed'}, '✓ 已确认')),
      el('div', {className:'generation-outline-body'},
        el('strong', null, definition.outlineSettings?.title || definition.fields?.find(field => field.id === 'F01')?.value),
        el('ol', null, sections.map((section, i) =>
          el('li', {key:i}, section.title,
            section.children?.length > 0 && el('ul', null, section.children.map((child,j) => el('li', {key:j}, child))))))));
  }

  function Generation({launch}) {
    const id = launch.sessionId;
    const [clock, setClock] = React.useState(() => sessions.generationFor(id));
    const [definition] = React.useState(() => sessions.restore(launch)?.definition || {});
    const [showProcess, setShowProcess] = React.useState(true);
    const toggle = React.useRef(null);
    React.useEffect(() => {
      const update = () => setClock(sessions.generationFor(id));
      window.addEventListener('gkx-report-updated', update);
      update();
      return () => window.removeEventListener('gkx-report-updated', update);
    }, [id]);

    const progress = clock?.progress || 0;
    const steps = React.useMemo(() => window.sessionOutline.writingSteps(definition), [definition]);
    const active = Math.min(steps.length - 1, Math.floor(progress * steps.length / 100));
    const status = active === 0 ? '正在分解任务并制定执行计划' : steps[active].title;
    const processId = React.useId();

    return el('section', {className:'generation-workspace', 'data-process':showProcess, 'aria-label':'报告生成中'},
      el('div', {className:'generation-thread'}, el('div', {className:'generation-thread-inner'},
        el('div', {className:'generation-query'}, launch.prompt),
        el('p', {className:'generation-message'}, el('span', {className:'generation-mark','aria-hidden':true}, '✦'),
          '已收到写作任务，以下是本次确认的文章大纲。'),
        el(ConfirmedOutline, {definition}),
        el('p', {className:'generation-message'}, '已接收确认的大纲，接下来将制定计划并按章节撰写报告。'),
        el('button', {type:'button', ref:toggle, className:'generation-status', 'aria-controls':processId,
          'aria-expanded':showProcess, title:'查看思考过程', onClick:() => setShowProcess(open => !open)},
          el('span', {className:'generation-spinner', 'aria-hidden':true}), status,
          el('span', {className:'generation-caret', 'aria-hidden':true}, '›')),
        el('div', {className:'generation-plan'},
          el('div', {className:'generation-meter-label'}, el('strong', null, '计划进度'), el('span', null, active + '/' + steps.length)),
          el('progress', {max:100, value:progress, 'aria-label':'报告生成进度'}),
          el('ol', {className:'generation-chapters'}, steps.map((step, i) =>
            el('li', {key:i, 'data-state':i < active ? 'done' : i === active ? 'current' : 'waiting'},
              el('span', {className:'generation-dot','aria-hidden':true}, i < active ? '✓' : ''),
              el('span', null, step.title), el('small', null, i < active ? '已完成' : i === active ? '进行中' : '待开始'))))),
        el('p', {className:'generation-note'}, '可从左侧会话继续查看生成进度。'))),
      showProcess && el('aside', {id:processId, className:'generation-process','aria-label':'思考过程'},
        el('header', null, el('strong', null, '思考过程'),
          el('button', {type:'button', className:'generation-close', 'aria-label':'关闭思考过程', title:'关闭思考过程',
            onClick:() => {setShowProcess(false); toggle.current?.focus();}}, '×')),
        active === 0 ? el('div', {className:'generation-starting', role:'status'},
          el('span', {className:'generation-loading-dots','aria-hidden':true}, '••••'), '正在启动调研，请稍候') :
          el('div', {className:'generation-process-log'}, steps.slice(0, active + 1).map((step, i) =>
            el('section', {key:i, 'data-current':i === active}, el('small', null, i === active ? '进行中' : '已完成'),
              el('h3', null, step.title), el('p', null, step.detail))))));
  }

  return function SessionPane({kind,launch,title}) {
    const [slot,setSlot] = React.useState(null);
    React.useLayoutEffect(() => setSlot(document.getElementById('home-workflow-slot')), []);
    if (!slot) return null;
    return ReactDOM.createPortal(el('section', {className:'workbench-session-pane', 'data-pane':kind, 'aria-label':title},
      launch ? kind === 'report'
        ? el('iframe', {className:'workbench-report-frame', title:'报告详情', src:sessions.embeddedUrl(launch.sessionId)})
        : el(Generation, {launch})
      : el('div', {className:'workbench-session-empty'}, '当前浏览器中未找到这份报告，请从左侧选择会话。')), slot);
  };
}
