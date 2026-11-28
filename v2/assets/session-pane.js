import {buildResearchFlow} from './research-flow-model.js?v=e78c9123e402';
import {mountResearchFlow} from './research-flow-view.js?v=5433332dfec8';

export function createGeneration(React) {
  const el = React.createElement;
  const sessions = window.sessionReports;
  const caret = () => el('span', {className:'generation-caret', 'aria-hidden':true}, '⌄');

  function ResearchFlow({model}) {
    const host = React.useRef(null);
    const graph = React.useRef(null);

    React.useLayoutEffect(() => {
      if (graph.current) graph.current.update(model);
      else graph.current = mountResearchFlow(host.current, model);
    }, [model]);

    React.useLayoutEffect(() => () => {
      graph.current?.destroy();
      graph.current = null;
    }, []);

    return el('div', {ref:host, className:'generation-flow'});
  }

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

    const model = buildResearchFlow({
      title, goal, sections, steps, completed, materialNames, definition,
      progress:clock?.progress || 0, complete:clock?.phase === 'complete'
    });

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
        el(ResearchFlow, {key:launch.runId || id, model})));
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
