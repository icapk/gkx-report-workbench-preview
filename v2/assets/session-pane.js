import {buildResearchFlow} from './research-flow-model.js?v=902df019ecdf';
import {mountResearchFlow} from './research-flow-view.js?v=8ef3e6eeed42';

export function createGeneration(React) {
  const el = React.createElement;
  const sessions = window.sessionReports;
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

  return function Generation({launch}) {
    const id = launch.sessionId;
    const [clock, setClock] = React.useState(() => sessions.generationFor(id));
    const definition = React.useMemo(() => sessions.restore(launch)?.definition || {}, [id, launch.runId]);
    const sections = React.useMemo(() => window.sessionOutline.normalize(definition.outline), [definition]);
    const steps = React.useMemo(() => window.sessionOutline.writingSteps(definition), [definition]);
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
    const model = buildResearchFlow({
      title, goal, sections, steps, completed, materialNames, definition, sessionId:id,
      progress:clock?.progress || 0, complete:clock?.phase === 'complete'
    });

    return el('section', {className:'generation-workspace', 'aria-label':'报告生成中'},
      el('div', {className:'generation-content'},
        el('h2', {className:'generation-heading'}, '报告生成中'),
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
        ? el('iframe', {className:'workbench-report-frame', 'data-report-session':launch.sessionId, title:'报告详情', src:window.sessionReports.embeddedUrl(launch.sessionId)})
        : el('div', {className:'workbench-session-empty'}, '当前浏览器中未找到这份报告，请从左侧选择会话。')), slot);
  };
}
