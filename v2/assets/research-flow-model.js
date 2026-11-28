const text = value => typeof value === 'string' ? value.trim() : '';
const list = value => Array.isArray(value) ? value : [];
const nameOf = value => typeof value === 'string' ? text(value) : text(value?.title) || text(value?.name);
const titles = values => list(values).map(nameOf).filter(Boolean);
const numeric = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

function taskField(definition, id) {
  return text(list(definition.fields).find(field => field?.id === id)?.value);
}

function phaseForClock(stepCount, chapterCount, completedSteps, progress) {
  if (!stepCount || completedSteps === 0) return 0;
  if (completedSteps >= stepCount - 1) return 4;
  if (!chapterCount) return 0;
  // The first and last steps belong to planning and document assembly. Within the
  // writing steps, use the same chapter clock as the existing task view.
  const chapterSpan = Math.max(1, stepCount - 2);
  const clockPosition = clamp(progress / 100 * stepCount, completedSteps, completedSteps + 1);
  const chapterPosition = clamp((clockPosition - 1) / chapterSpan, 0, 1);
  return 1 + Math.min(2, Math.floor(chapterPosition * 3));
}

function describeFinishedStages(stages, {report, review, trace, hasRequest, materials}) {
  const [question,reuse,evidence,challenge,compose] = stages;
  const saved = (stage,state,statusLabel) => Object.assign(stage,{state,statusLabel});
  saved(question,hasRequest ? 'done' : 'pending',hasRequest ? '已留存' : '待补充');
  saved(reuse,'pending',materials.length ? '待筛选' : '待补充');
  saved(evidence,'pending','待核对');
  saved(challenge,'pending','待复核');
  saved(compose,'done','已生成');

  const reportId = text(report.sessionId) || text(report.id);
  const sameDemo = review?.demo === true && !!review.id && (!reportId || review.id === reportId);
  const sourceItems = list(trace?.groups).filter(group=>group?.key === 'source').flatMap(group=>list(group.items));
  if (!sameDemo) {
    const currentSources = sourceItems.filter(item=>Number.isInteger(item?.sourceIndex));
    if (currentSources.length) {
      evidence.summary = '当前报告关联 '+currentSources.length+' 项来源，关键判断待核对';
      evidence.items = currentSources.map(item=>nameOf(item)+' · '+text(item.status));
    } else if (materials.length) {
      evidence.items = materials.map(name=>'材料：'+name);
    }
    return;
  }

  const metrics = list(trace?.groups).filter(group=>group?.key === 'metric').flatMap(group=>list(group.items));
  if (text(trace?.summary) && (sourceItems.length || metrics.length)) {
    evidence.summary = text(trace.summary);
    evidence.detail = '可在本报告的数据溯源中逐项查看材料、统计口径和适用范围。';
    evidence.items = [
      ...sourceItems.map(item=>'来源：'+nameOf(item)+' · '+text(item.status)),
      ...metrics.map(item=>'指标：'+nameOf(item)+' · '+text(item.status))
    ];
    const hasTraceExample = sourceItems.some(item=>item.demo === false && text(item.quote)) ||
      metrics.some(item=>item.demo === true && list(item.records?.rows).length > 0);
    if (hasTraceExample) saved(evidence,'done','有示例');
  }

  const records = ['counter','round','quality'].map(key=>list(review.stages).find(stage=>stage?.key===key && text(stage.summary)));
  if (records.every(Boolean)) {
    challenge.summary = '本报告留有反方校验、圆桌仲裁与质量审查的示例回放。';
    challenge.detail = '在「研判回放」中可查看三项审阅意见，以及每项意见对应的正文。';
    challenge.items = records.map(record=>text(record.label)+'：'+text(record.summary));
    saved(challenge,'done','有示例');
  }
}

function bloodResearchFlow({demo,title,goal,sections,complete,position,progress,review,reportId}) {
  const {anchors,sources} = demo;
  const staleReview = complete && review?.demo === false;
  const stages = [
    {
      id:'question', title:'拆解送血扩围决策',
      plan:'界定维持现状、单线试点与多线扩围三个选项。', result:'已列出三种选项及其判断依据。',
      detail:goal || '评估深圳是否具备扩大无人机送血服务范围的条件。',
      inputs:['运行基线：全市已开展多少飞行？','比较问题：空运与地运的签收用时能否直接对比？','试点门槛：还需取得哪些逐线数据？']
    },
    {
      id:'reuse', title:'查阅运行与首飞资料',
      plan:'查找市级年度汇总和南山航线首飞记录。', result:'两份官方资料分别覆盖全市运行规模和南山首飞。',
      detail:'分别登记统计期、发布单位和观察对象，区分全年汇总、单次首飞和演练。',
      inputs:sources.map(source=>source.agency+' · '+source.date+' · '+source.title)
    },
    {
      id:'evidence', title:'核对规模与时效口径',
      plan:'复算日均架次，核对15分钟与90分钟各自覆盖的路程。', result:'全年日均约19.3架次。南山首飞与地面往返的计时口径不同。',
      detail:'将全市统计与单次航线记录分开核查。',
      inputs:['核对2024年统计周期、飞行架次和运输净重。','核对两种运输方式的起讫点、单程或往返，以及是否包括交接。'],
      outputs:[anchors.scale,anchors.audit,anchors.timing]
    },
    {
      id:'challenge', title:'模拟反方与圆桌评审',
      plan:'由反方质疑初稿，圆桌比较方案，再由质量审查复核。', result:'模拟审阅撤回全面扩围建议，保留可执行的单线对照试点。',
      detail:'检查同一组事实可以支持哪些行动，以及哪些判断仍需补证。',
      inputs:['反方：检验单次首飞能否代表各医院签收表现。','圆桌：比较维持现状、单线验证、多线扩围的取舍。','质量审查：逐项核对数字、单位、统计期和结论适用范围。'],
      outputs:['反方校验：初稿“全市普遍节时约八成，应全面扩围”的推论缺少同程签收对照。','圆桌仲裁：先试一条具备同线路地面对照的候选线路，保留地面接续。','质量审查：撤回全市普遍节时约八成的推论，保留全市规模数据与附条件试点建议。']
    },
    {
      id:'compose', title:'生成扩围评估报告',
      plan:'按已确认大纲整理事实、证据缺口和行动建议。', result:'已形成含数据出处、审阅修订和扩围条件的报告。',
      detail:'逐章呈现调查依据、方案选择和试点验收条件。',
      inputs:sections,
      outputs:[anchors.decision,...sections]
    }
  ];
  const statuses = ['已明确','已查阅','已核对','已模拟评审','已生成'];
  const rows = stages.map((stage,index)=>{
    const awaitingReview = staleReview && index >= 3;
    const done = !awaitingReview && (complete || index < position);
    const active = !complete && index === position;
    return {
      id:stage.id,title:stage.title,
      state:done ? 'done' : active ? 'active' : 'pending',
      statusLabel:awaitingReview ? '待复核' : done ? statuses[index] : active ? '进行中' : '待开展',
      summary:awaitingReview ? '当前工作稿与模拟审阅依据不同，需重新核对。' : done ? stage.result : stage.plan,
      detail:stage.detail,items:done && stage.outputs ? stage.outputs : stage.inputs
    };
  });
  return {title,reportId,stages:rows,progress,complete,progressNote:complete
    ? '按本次模拟研究整理。公开数据出处和审阅修订见报告正文。' : '模拟研究随写作进度推进，可选择节点查看研究任务和已整理的依据。'};
}

export function buildResearchFlow(input = {}) {
  const report = input.report || {};
  const definition = input.definition || report.taskDefinition || report.draft?.taskDefinition || report.session?.state?.definition || {};
  const title = text(input.title) || text(definition.outlineSettings?.title) || taskField(definition,'F01') || text(report.title) || '当前报告';
  const goal = text(input.goal) || taskField(definition,'F02');
  const scope = taskField(definition,'F03');
  const reader = taskField(definition,'F04');
  const steps = list(input.steps ?? report.steps ?? report.publishedReport?.steps);
  const outlineRows = list(input.sections ?? definition.outline ?? report.outline ?? report.publishedReport?.outline);
  const sections = titles(outlineRows);
  if (!sections.length) {
    steps.forEach(step => {
      const chapter = nameOf(step).match(/^撰写[“「](.+)[”」]$/);
      if (chapter) sections.push(chapter[1]);
    });
  }
  const materialInputs = input.materialNames ?? [
    ...list(definition.attachments),...list(definition.outlineSettings?.files),
    ...list(report.attachments),...list(report.knowledgeFiles),...list(report.sources),...list(report.publishedReport?.sources)
  ];
  const materials = [...new Set(titles(materialInputs))];
  const history = list(report.history ?? report.publishedReport?.history);
  const confirmed = definition.outlineConfirmed === true || history.some(event => event?.title === '已确认报告大纲');
  const hasRequest = !!(goal || scope || reader || taskField(definition,'F01') || text(definition.prompt) || text(report.prompt) ||
    history.some(event => event?.title === '已确认研究任务' || event?.title === '写作需求'));
  const complete = typeof input.complete === 'boolean' ? input.complete : !!(report.generated || report.publishedReport || report.session?.state?.phase === 'complete');
  const rawProgress = input.progress ?? report.session?.state?.executionProgress ?? report.progress;
  const completedCount = numeric(input.completed) ? Math.floor(input.completed) : null;
  const estimate = numeric(rawProgress) ? rawProgress : steps.length && completedCount !== null ? completedCount / steps.length * 100 : 0;
  const progress = complete ? 100 : clamp(Math.floor(estimate),0,99);
  const completedSteps = complete ? steps.length : clamp(completedCount ?? Math.floor(progress * steps.length / 100),0,Math.max(0,steps.length - 1));
  const currentStep = nameOf(steps[completedSteps]);
  const position = complete ? 4 : phaseForClock(steps.length,sections.length,completedSteps,progress);
  const demoCaseId = definition.demoCaseId || report.demoCaseId;
  if (demoCaseId === 'sz-blood-network-2024') {
    // Detail renders inside the same-origin workbench frame. Both views use the shared case.
    const demo = window.bloodNetworkDemo || window.parent.bloodNetworkDemo;
    if (demo) return bloodResearchFlow({demo,title,goal,sections,complete,position,progress,
      review:input.review,reportId:report.sessionId || report.id || demoCaseId});
  }
  const taskItems = [scope && '范围：'+scope, reader && '读者：'+reader].filter(Boolean);
  const outlineName = confirmed ? '已确认大纲' : '留存大纲';
  const currentIndex = !complete && completedSteps > 0 && completedSteps <= sections.length ? completedSteps - 1 : -1;
  const chapterItems = (step, pattern) => {
    const current = position === step && currentIndex >= 0;
    const index = current ? currentIndex : outlineRows.findIndex(row=>
      pattern.test(nameOf(row)) || titles(row?.children).some(child=>pattern.test(child)));
    const section = outlineRows[index];
    const chosen = nameOf(section) || (current ? sections[currentIndex] : sections.find(name=>pattern.test(name)));
    if (!chosen) return [];
    const subtopics = titles(section?.children);
    const body = text(section?.body), skill = nameOf(section?.skillSnapshot);
    return [(current ? '当前章节：' : '对应章节：')+chosen,
      skill && '章节 Skill：'+skill, subtopics.length && '本章子题：'+subtopics.slice(0,3).join('、'),
      body && '写作要求：'+body].filter(Boolean);
  };
  const chapterPlan = sections.flatMap((chapter,index) => {
    const skill = nameOf(outlineRows[index]?.skillSnapshot);
    const items = [skill ? chapter+' · '+skill : chapter];
    for (const choice of list(steps[index + 1]?.localSkills)) {
      if (choice.scope !== 'chapter') items.push(chapter+' / '+choice.title+' · '+nameOf(choice.skillSnapshot));
    }
    return items;
  });
  const stages = [
    {
      id:'question',title:'研究问题拆解',
      summary: goal || (hasRequest ? '已取得本次委托信息' : '研究目标待补充'),
      detail: hasRequest ? '研究对象为《'+title+'》。' : '先明确要回答的问题、适用范围和报告读者。',
      items:taskItems
    },
    {
      id:'reuse',title:'阶段性结论复用',
      summary: materials.length ? '从 '+materials.length+' 项关联材料中筛选可用结论' : '待补充可供对照的既有研究',
      detail: materials.length ? '先核对既有判断的出处和适用条件，再决定哪些可以沿用。' : '可补充与本题相关的既有研究，比较它的条件是否仍然适用。',
      items:[...chapterItems(1,/现状|背景|既有|综述|资料|资料与初步判断/), ...materials.map(name=>'材料：'+name)]
    },
    {
      id:'evidence',title:'证据与指标核验',
      summary: materials.length ? '对照关联材料核对关键数据' : '待补原始来源',
      detail: '核对重点是原文出处、统计时段和比较口径。缺少明细的指标保留待核。',
      items:chapterItems(2,/资料|证据|信号|指标|比较|评价|验证|数据/)
    },
    {
      id:'challenge',title:'观点组织与反方检查',
      summary: '待复核关键判断的成立条件',
      detail: '对照本章建议，找出可能改变结论的反例，并写清还缺哪项证据。',
      items:chapterItems(3,/反方|争议|核心结论|建议|替代|风险|影响|待验证|后续观察/)
    },
    {
      id:'compose',title:'报告编排与生成',
      summary: complete ? '工作稿已生成' : sections.length ? '按'+sections.length+'个章节编排工作稿' : '汇总报告工作稿',
      detail: complete ? ('可打开《'+title+'》查看成稿。'+(sections.length ? outlineName+'共 '+sections.length+' 个章节。' : '该任务未保存分章计划。'))
        : sections.length ? outlineName+'共 '+sections.length+' 个章节。'+(currentStep ? '当前写作计划项为“'+currentStep+'”。' : '') : '当前任务未提供章节明细。',
      items:chapterPlan
    }
  ];

  if (complete) {
    describeFinishedStages(stages,{report,review:input.review,trace:input.trace,hasRequest,materials});
  } else {
    const awaiting = ['待补充',materials.length ? '待筛选' : '待补充','待核对','待复核','待开展'];
    stages.forEach((stage,index)=>{
      if (index === position) {
        stage.state = 'active';
        stage.statusLabel = index === 4 ? '编排中' : '当前环节';
      } else if (index === 0 && index < position && hasRequest) {
        stage.state = 'done';
        stage.statusLabel = '已留存';
      } else {
        stage.state = 'pending';
        stage.statusLabel = index < position ? awaiting[index] : '待开展';
      }
    });
  }

  const progressNote = complete
    ? '按本报告留存的材料、审阅示例和成稿显示各环节状态。'
    : '研究环节随本次章节写作进度展示。';
  return {title,stages,progress,complete,progressNote};
}
