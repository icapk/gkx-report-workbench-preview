export function createSessionPane(React,ReactDOM) {
  const el=React.createElement, sessions=window.sessionReports;
  function Generation({launch}) {
    const id=launch.sessionId;
    const [clock,setClock]=React.useState(()=>sessions.generationFor(id));
    const [definition]=React.useState(()=>sessions.restore(launch)?.definition);
    React.useEffect(()=>{
      const update=()=>setClock(sessions.generationFor(id));
      window.addEventListener('gkx-report-updated',update);
      update();
      return ()=>window.removeEventListener('gkx-report-updated',update);
    },[id]);
    const progress=clock?.progress || 0;
    const sections=definition?.outline || [];
    const current=Math.min(sections.length-1,Math.floor(progress*sections.length/100));
    const title=definition?.fields?.find(field=>field.id==='F01')?.value || launch.prompt;
    return el('section',{className:'generation-card','aria-label':'报告生成中'},
      el('header',{className:'generation-status'},el('span',{'aria-hidden':true,className:'generation-spinner'}),'报告生成中'),
      el('h1',null,title),
      el('p',{className:'generation-note'},'报告正在后台撰写。你可以切换项目或处理其他任务，稍后从左侧会话查看进度。'),
      el('div',{className:'generation-meter-label'},el('span',null,'生成进度'),el('strong',null,progress+'%')),
      el('progress',{max:100,value:progress,'aria-label':'报告生成进度'}),
      sections.length>0 && el('ol',{className:'generation-chapters','aria-label':'章节进度'},sections.map((section,i)=>{
        const state=i<current?'done':i===current?'current':'waiting';
        return el('li',{key:i,'data-state':state},el('span',{className:'generation-dot','aria-hidden':true},state==='done'?'✓':''),
          el('span',null,section.title),el('small',null,state==='done'?'已完成':state==='current'?'撰写中':'待撰写'));
      })),
      el('footer',null,el('button',{type:'button',onClick:()=>sessions.openProject(launch.folderId)},'在此项目新建会话')));
  }
  return function SessionPane({kind,launch,title}) {
    const [slot,setSlot]=React.useState(null);
    React.useLayoutEffect(()=>setSlot(document.getElementById('home-workflow-slot')),[]);
    if(!slot) return null;
    const loaded=Boolean(launch);
    return ReactDOM.createPortal(el('section',{className:'workbench-session-pane','data-pane':kind,'aria-label':title},
      loaded ? (kind==='report' ? el('iframe',{className:'workbench-report-frame',title:'报告详情',src:sessions.embeddedUrl(launch.sessionId)})
        : el('div',{className:'generation-scroll'},el(Generation,{launch}))) :
        el('div',{className:'workbench-session-empty'},'当前浏览器中未找到这份报告，请从左侧选择会话。')
    ),slot);
  };
}
