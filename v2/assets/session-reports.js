/* The workbench stores one conversation per report row, inside its original project. */
(() => {
  'use strict';
  const workspaceKey = 'gkx-v2-writing-prototype:workspace-v1';
  const composerKey = 'gkx-v2-writing-prototype:composer-skills';
  const generationDuration = 24000;
  const oldGenerationDuration = 6000;
  const home = new URL('../index.html', document.currentScript.src);
  const detail = new URL('../detail/index.html?v=70dd5463f449', document.currentScript.src);
  // The composer can omit the report type, including on tasks saved by older versions.
  function normalizeWorkspace(workspace) {
    if (Array.isArray(workspace?.reports)) {
      for (const report of workspace.reports) {
        if (report && !report.type) report.type = report.publishedReport?.type || report.draft?.type || '战略分析报告';
      }
    }
    return workspace;
  }
  const load = () => normalizeWorkspace(JSON.parse(localStorage.getItem(workspaceKey) || '{"folders":[],"reports":[]}'));
  const row = (workspace, id) => workspace.reports.find(report => report.id === id);
  const folder = (workspace, report) => workspace.folders.find(project => project.id === report?.folderId);
  function write(workspace) {
    localStorage.setItem(workspaceKey, JSON.stringify(workspace));
    window.dispatchEvent(new Event('gkx-report-updated'));
  }
  function filesFor(report) {
    return [...(report.attachments || []), ...(report.knowledgeFiles || [])];
  }
  function hasReport(report) {
    return Boolean(report && (report.publishedReport || report.draft ||
      [report.html,report.content,report.body,report.text].some(value=>typeof value==='string' && value.trim())));
  }
  function finishedWriting(report) {
    const session = report?.session;
    if (session?.state?.phase === 'complete') return true;
    if (!hasReport(report)) return false;
    if (!session?.runId) return true;
    const revision = report.publishedReport?.revision;
    if (revision && revision !== 'original') return revision === session.runId;
    // Early workspaces kept an unversioned draft and copied its delivery into the next run's history.
    return !session.historyBefore?.some(entry=>entry.title==='报告已生成');
  }
  function writingLocked(report) {
    return finishedWriting(report) || report?.session?.state?.phase === 'executing';
  }
  function sameRequest(input,report,workspace) {
    const fileKeys = files => files.map(file=>[file.id || '',file.name || '',file.text || '',file.source || '']);
    const previous = makeLaunch(workspace,report);
    if (!previous || input.prompt.trim() !== previous.prompt.trim()) return false;
    if (['type','model','template','template_id','template_version'].some(key=>input[key] != null && input[key]!==previous[key])) return false;
    return JSON.stringify(window.WorkbenchSkills.validTaskSkills(input.skills)) === JSON.stringify(previous.skills) &&
      JSON.stringify(fileKeys(input.attachments || [])) === JSON.stringify(fileKeys(previous.attachments));
  }
  function makeLaunch(workspace, report) {
    if (!report || !folder(workspace, report)) return null;
    return {
      prompt: report.prompt ?? report.draft?.prompt ?? report.title,
      attachments: filesFor(report), folderId: report.folderId, project: folder(workspace, report).name,
      type: report.type, model: report.model || report.draft?.model || 'GLM 5.2',
      template: report.template || report.draft?.template || '不使用模板', templateSpec: report.templateSpec,
      template_id: report.template_id, template_version: report.template_version,
      ...window.WorkbenchSkills.taskSkillFields(report.skills, report.skillSnapshots),
      ...(report.demoCaseId ? {demoCaseId:report.demoCaseId} : {}),
      sourceTaskId: report.id, sessionId: report.id, runId: report.session?.runId
    };
  }
  function answerText(answer) {
    if (!answer || answer.skipped) return '未作答 / 已跳过';
    return [answer.option, answer.text?.trim()].filter(Boolean).join('；补充：');
  }
  function timeline(report, state) {
    const session = report.session || {};
    const history = [...(session.historyBefore || [])];
    const prompt = state?.material?.prompt || report.prompt || report.draft?.prompt;
    if (prompt || filesFor(report).length) history.push({
      role:'user', title:history.length ? '再次澄清 · 写作需求' : '写作需求',
      text:prompt, items: filesFor(report).map(file => file.name).filter(Boolean)
    });
    for (const round of state?.history || []) {
      for (const question of round.questions) {
        history.push({role:'assistant',title:'第 '+round.round+' 轮澄清',text:question.title});
        history.push({role:'user',text:answerText(round.answers[question.id])});
      }
    }
    for (const edit of session.edits || []) history.push({role:'user',title:'调整任务信息',text:edit});
    const definition = state?.definition || (!session.runId && report.draft?.taskDefinition);
    if (definition?.consent) history.push({role:'user',title:'已确认研究任务',items:definition.fields.map(f => f.name+'：'+(f.value || f.unresolved || '未提供'))});
    if (definition?.outlineConfirmed) history.push({role:'user',title:'已确认报告大纲',items:definition.outline.map(section=>section.title)});
    if (state?.phase === 'complete' || (!session.runId && report.draft)) history.push({role:'assistant',title:'报告已生成',text:report.draft?.title || report.title});
    return history;
  }
  function begin(input, confirmedState) {
    const workspace = load();
    let project = workspace.folders.find(item => item.id === input.folderId);
    if (!project && input.folderId === 'independent') {
      project = {id:'independent',name:'独立报告'};
      workspace.folders.push(project);
    }
    if (!project) throw new Error('所属项目已不存在');
    const candidate = row(workspace, input.sourceTaskId || input.sessionId);
    const source = candidate?.folderId === project.id ? candidate : null;
    if (source && writingLocked(source) && sameRequest(input,source,workspace)) return makeLaunch(workspace,source);
    const previous = source && !writingLocked(source) ? source : null;
    const id = previous?.id || 'report-' + crypto.randomUUID();
    const ts = Date.now();
    const caption = input.prompt.trim().split(/\n/)[0] || input.attachments?.[0]?.name || '写作会话';
    const files = input.attachments || [];
    const report = {
      ...previous, ...input, id, type:input.type || source?.type || '战略分析报告', title:previous?.title || caption.slice(0,40),
      folderId:project.id, progress:0, updatedAt:ts,
      attachments:files.filter(file=>file.source!=='knowledge'),
      knowledgeFiles:files.filter(file=>file.source==='knowledge'),
      session:{runId:crypto.randomUUID(), startedAt:ts, edits:[], historyBefore:previous ? timeline(previous,previous.session?.state) : []}
    };
    if (!input.demoCaseId) delete report.demoCaseId;
    delete report.sourceTaskId;
    delete report.sessionId;
    delete report.runId;
    if (confirmedState) {
      if (confirmedState.phase !== 'outline-review' || !confirmedState.definition?.consent) throw new Error('研究需求尚未确认');
      report.session.state = pack(confirmedState);
      const fields = confirmedState.definition.fields;
      if (!report.customTitle) report.title = (fields.find(field=>field.id==='F01')?.value || report.title).slice(0,80);
      report.session.edits = Object.entries(confirmedState.material.edits || {}).map(([id,value])=>
        (fields.find(field=>field.id===id)?.name || id)+'：'+value);
    }
    if (previous) workspace.reports[workspace.reports.indexOf(previous)] = report;
    else workspace.reports.push(report);
    write(workspace);
    return makeLaunch(workspace, report);
  }
  function launchFor(id) {
    finishElapsed(id);
    const workspace = load();
    return makeLaunch(workspace, row(workspace, id));
  }
  // Store file text once on the report. The reducer receives its original shape on resume.
  function pack(state) {
    return {...state, material:{...state.material,attachments:[]},
      definition:state.definition ? {...state.definition,attachments:[]} : null};
  }
  function restore(launch) {
    if (!launch?.sessionId) return null;
    const report = row(load(),launch.sessionId), state = report?.session?.state;
    if (!state || launch.runId !== report.session.runId) return null;
    const files = filesFor(report);
    return {...state,material:{...state.material,attachments:files},
      definition:state.definition ? {...state.definition,attachments:files} : null};
  }
  function getReport(id) {
    const workspace = load(), report = row(workspace,id);
    if (!report) return null;
    const projectTitle = folder(workspace,report)?.name;
    const released = report.publishedReport;
    const caseIdentity = report.demoCaseId ? {demoCaseId:report.demoCaseId} : {};
    if (released) return {...caseIdentity,...released,type:released.type || report.type,sessionId:id,projectId:report.folderId,projectTitle};
    if (!hasReport(report)) return null;
    const content = window.buildSessionReportContent({report, draft:report.draft,project:projectTitle});
    return {...caseIdentity,...content,sessionId:id,projectId:report.folderId,projectTitle,type:report.type,
      date:report.updatedAt || null,revision:'original',history:timeline(report,null)};
  }
  function save(launch,state) {
    if (!launch?.sessionId || !launch.runId) return true;
    const workspace = load(), report = row(workspace,launch.sessionId);
    if (!report || report.session?.runId !== launch.runId) return false;
    const session = report.session;
    const before = session.state;
    if (finishedWriting(report)) return state.phase === 'complete';
    if (before?.phase === 'cancelled') return false;
    if (before?.phase === 'executing') {
      if (!['executing','complete'].includes(state.phase) || !isGenerating(report)) return false;
      const clock = runningClock(report, Date.now());
      if (clock.progress <= (before.executionProgress || 0) && clock.progress < 100) return true;
      session.executionStartedAt = clock.startedAt;
      // A running job is immutable. Use its saved definition even if an old tab sends a stale snapshot.
      launch = makeLaunch(workspace,report);
      const files = filesFor(report);
      state = {...before, phase:clock.progress === 100 ? 'complete' : 'executing', executionProgress:clock.progress,
        material:{...before.material,attachments:files}, definition:{...before.definition,attachments:files}};
    } else if (state.phase === 'executing') {
      if (before?.phase !== 'outline-review' || !state.definition?.consent || state.definition.outlineConfirmed !== true) return false;
      session.executionStartedAt = Date.now();
      session.executionDurationMs = generationDuration;
      state = {...state, executionProgress:0};
    } else if (state.phase === 'complete') return false;
    const next = pack(state);
    if (JSON.stringify(before) === JSON.stringify(next)) return true;
    if (before?.phase === 'outline-review' && !['outline-review','executing'].includes(state.phase)) return false;
    if (before?.phase === 'final-edit' && state.phase === 'processing' && state.processReason === 'edit') {
      const label = before.fields.find(f=>f.id===before.editId)?.name || '任务信息';
      report.session.edits.push(label+'：'+before.editText);
    }
    report.session.state = next;
    report.updatedAt = state.phase === 'complete'
      ? session.executionStartedAt + (session.executionDurationMs || oldGenerationDuration) : Date.now();
    report.progress = state.executionProgress || 0;
    if (state.definition?.consent && (before?.phase !== 'executing' || state.phase === 'complete')) {
      const definition = {...state.definition,skills:launch.skills,skillSnapshots:launch.skillSnapshots,
        template:launch.template,templateSpec:launch.templateSpec};
      const documentTitle = definition.outlineSettings?.title?.trim() || definition.fields.find(field=>field.id==='F01')?.value || report.title;
      if (!report.customTitle && before?.phase !== 'executing') report.title = documentTitle.slice(0,80);
      if (state.phase === 'complete') {
        const draft = {id:report.id,title:documentTitle,prompt:definition.prompt,type:report.type,
          project:folder(workspace,report).name,model:launch.model,template:launch.template,templateSpec:launch.templateSpec,
          skills:launch.skills,skillSnapshots:launch.skillSnapshots,taskDefinition:definition};
        report.draft = draft;
        const content = window.buildSessionReportContent({report,draft,definition,launch,phase:'complete',project:draft.project});
        report.publishedReport = {...content,revision:launch.runId,date:report.updatedAt,type:report.type,
          ...(report.demoCaseId ? {demoCaseId:report.demoCaseId} : {}),
          history:timeline(report,state),sourceDetails:[...filesFor(report), ...(definition.outlineSettings?.files || [])].map(file=>({title:file.name,text:file.text || ''}))};
        report.generated = true;
      }
    }
    try { write(workspace); }
    catch { return false; }
    if (state.phase === 'executing') scheduleClock();
    // Background progress on a seeded example must not replace the user's last task.
    if (!session.historyExample && state.definition?.consent && (before?.phase !== 'executing' || state.phase === 'complete')) {
      try {
        localStorage.setItem('gkx-v2-writing-prototype:confirmed-task',JSON.stringify({id:report.id,...state.definition}));
        if(state.phase==='complete') localStorage.setItem('gkx-v2-writing-prototype:last-draft',JSON.stringify({id:report.id,workspaceDraft:true}));
      } catch {}
    }
    return true;
  }
  function cancelOutline(launch) {
    const workspace = load(), report = row(workspace,launch?.sessionId);
    if (!report || report.session?.runId !== launch.runId || report.session.state?.phase !== 'outline-review') return false;
    report.session.state = {...report.session.state, phase:'cancelled'};
    report.updatedAt = Date.now();
    try { write(workspace); return true; }
    catch { return false; }
  }
  function isGenerating(report) {
    const session = report.session;
    const state = session?.state;
    return !finishedWriting(report) && state?.phase === 'executing' && state.definition?.consent === true &&
      (state.definition.outlineConfirmed === true ||
       (session.executionDurationMs == null && state.definition.outlineConfirmed == null));
  }
  function runningClock(report, now) {
    const session = report.session;
    const stored = session.state.executionProgress || 0;
    const durationMs = session.executionDurationMs || oldGenerationDuration;
    const startedAt = session.executionStartedAt ?? (report.updatedAt || now) - stored * durationMs / 100;
    const elapsed = Math.floor((now - startedAt) * 100 / durationMs);
    return {startedAt,durationMs,progress:Math.min(100,Math.max(0,stored,elapsed))};
  }
  function generationFor(id) {
    const report = row(load(),id);
    if (!report) return null;
    const session = report.session;
    const phase = finishedWriting(report) ? 'complete' : session?.state?.phase || (session ? 'processing' : 'idle');
    const clock = isGenerating(report) ? runningClock(report,Date.now()) : null;
    return {id, runId:session?.runId || null, phase,
      progress:clock ? Math.min(99,clock.progress) : phase === 'complete' ? 100 : report.progress || 0,
      startedAt:clock?.startedAt ?? session?.executionStartedAt ?? null,
      durationMs:clock?.durationMs ?? session?.executionDurationMs ?? (session?.executionStartedAt ? oldGenerationDuration : null)};
  }
  function finishElapsed(id) {
    const workspace = load();
    for (const report of workspace.reports) {
      if ((id && report.id !== id) || !isGenerating(report)) continue;
      const state = report.session.state;
      const progress = runningClock(report,Date.now()).progress;
      if (progress === 100 || progress > (state.executionProgress || 0)) {
        save(makeLaunch(workspace,report),state);
      }
    }
  }
  let clockTimer = null;
  function updateClocks() {
    if (!navigator.locks) { finishElapsed(); return; }
    return navigator.locks.request(workspaceKey + ':generation', {ifAvailable:true}, lock => {
      if (lock) finishElapsed();
    });
  }
  function scheduleClock() {
    if (clockTimer !== null || !load().reports.some(isGenerating)) return;
    clockTimer = window.setTimeout(async () => {
      try {
        await updateClocks();
      } finally {
        clockTimer = null;
        scheduleClock();
      }
    }, 400);
  }
  async function resumeClock() {
    await updateClocks();
    scheduleClock();
  }
  window.addEventListener('DOMContentLoaded',resumeClock,{once:true});
  window.addEventListener('pageshow',resumeClock);
  document.addEventListener('visibilitychange',() => { if (!document.hidden) resumeClock(); });
  window.addEventListener('storage',event => {
    if (event.key !== workspaceKey) return;
    scheduleClock();
    window.dispatchEvent(new Event('gkx-report-updated'));
  });
  function sessionHash(id) { return '#/clarification/'+encodeURIComponent(id); }
  function routeId(hash) {
    const prefix='#/clarification/';
    if(!hash.startsWith(prefix)) return null;
    try { return decodeURIComponent(hash.slice(prefix.length)); } catch { return null; }
  }
  function readRoute(hash) {
    const match = /^#\/(clarification|generating|report|history|session|compose|project)\/([^/]+)$/.exec(hash);
    if (!match) return null;
    try { return {kind:match[1], id:decodeURIComponent(match[2])}; } catch { return null; }
  }
  function hashFor(kind,id) { return '#/'+kind+'/'+encodeURIComponent(id); }
  function sessionView(id) {
    const generation=generationFor(id);
    if (!generation) return null;
    if (generation.phase === 'executing') return 'generating';
    if (generation.phase === 'complete') return 'report';
    if (generation.phase === 'cancelled') return 'compose';
    if (generation.phase === 'idle') return getReport(id) ? 'report' : null;
    return 'clarification';
  }
  function navigate(kind,id) {
    const hash=hashFor(kind,id);
    if(document.getElementById('root')) {
      if(location.hash !== hash) location.hash=hash;
      else if (kind === 'report') {
        document.querySelector('.workbench-report-frame')?.contentWindow?.dispatchEvent(new Event('gkx-open-report'));
      }
    } else {
      const url=new URL(home); url.hash=hash; location.assign(url.href);
    }
    return true;
  }
  function returnToSession(id) { return openSession(id); }
  function showReport(id) {
    return getReport(id) ? navigate('report',id) : false;
  }
  function openSession(id) {
    finishElapsed(id);
    const kind=sessionView(id);
    return kind ? navigate(kind,id) : false;
  }
  function openProject(id) { return navigate('project',id); }
  function embeddedUrl(id) {
    const url=new URL(detail);
    url.searchParams.set('session',id); url.searchParams.set('embedded','1');
    return url.href;
  }
  function again(id) {
    const launch=launchFor(id);
    if(!launch) return false;
    if (['report','generating'].includes(sessionView(id))) return openSession(id);
    sessionStorage.setItem(composerKey,JSON.stringify(launch));
    sessionStorage.removeItem('gkx-v2-writing-prototype:clarification-launch');
    return navigate('compose',id);
  }
  window.sessionReports = {normalizeWorkspace,resumeGeneration:scheduleClock,begin,save,cancelOutline,restore,getReport,generationFor,launchFor,openSession,returnToSession,showReport,again,openProject,embeddedUrl,readRoute,hashFor,sessionView,routeId,sessionHash,writingLocked,finishedWriting,sameRequest,historyFor:timeline};
})();
