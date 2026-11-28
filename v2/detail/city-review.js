/* Only this prepared case has a revision-linked panel for each recommendation. */
(() => {
  'use strict';
  const issueIds = ['medical', 'instant', 'branch'];
  const adoptedOpinions = {
    medical:'保留写作方保障医疗急件的诉求，采纳反方提出的扩围条件。现有网络先补地面接续，新增线路须取得同程签收对照。',
    instant:'保留写作方对现有商圈高频运营的观察，采纳反方对统一架次排名的质疑。用本商圈的真实订单和成本验证提效。',
    branch:'采纳反方暂缓新增节点投资的意见，保留写作方提出的候选走廊。先核实稳定货源、双向装载和接续成本。'
  };
  const stages = [
    {key:'counter', label:'反方审查', summary:'作者与反方逐项核对医疗、即时配送和城际货运的主张与证据。'},
    {key:'round', label:'圆桌纪要', summary:'按争议记录裁决理由、给作者的改写指令和终稿落点。'},
    {key:'quality', label:'终稿质检', summary:'复核三项修订是否落实，以及公开材料仍不能支持的推断。'}
  ];
  function model(context) {
    const demo = window.cityLogisticsDemo;
    if (demo && !context.modified && issueIds.every(id => demo.discussions?.[id]?.quote &&
        context.text.includes(demo.discussions[id].quote))) {
      return {id:context.id, title:context.title, kind:'city-logistics', demo:true, stages};
    }
    return {id:context.id, title:context.title, kind:'needs-review', demo:false, afterShort:'当前正文待复核',
      after:'预设审查对应生成时的报告。请重新核对修订后的主张、引文和实施条件。'};
  }
  function mount(host, demo) {
    const doc = host.ownerDocument;
    const create = (tag, className, text) => {
      const el = doc.createElement(tag);
      if (className) el.className = className;
      if (text) el.textContent = text;
      return el;
    };
    function button(text, cls) {
      const b = create('button',cls,text); b.type = 'button'; return b;
    }
    const root = create('section','city-review');
    root.setAttribute('aria-label','政策建议审查');
    const heading = create('h2','city-review-heading','政策建议审查');
    heading.tabIndex = -1;
    const head = create('header','city-review-head');
    const back = button('返回正文','city-review-back');
    back.hidden = true;
    let returnTo;
    back.addEventListener('click',() => {
      if (!returnTo?.isConnected) return;
      returnTo.scrollIntoView({block:'center',inline:'nearest'});
      returnTo.focus({preventScroll:true});
    });
    head.append(heading,back,create('span','city-review-demo','预设模拟'));
    const pick = create('label','city-review-pick');
    const select = create('select');
    for (const id of issueIds) {
      const option = create('option','',demo.discussions[id].label);
      option.value = id; select.append(option);
    }
    pick.append(create('span','','选择争议'),select);
    const tabs = create('div','city-review-tabs');
    tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','查看审查记录');
    const panels = [...stages.slice(0,2),{key:'diff',label:'改稿对照'},stages[2]];
    const tabButtons = panels.map(step => {
      const b = button(step.label);
      b.dataset.cityStage = step.key; b.setAttribute('role','tab'); b.id = 'city-review-tab-'+step.key;
      b.setAttribute('aria-controls','city-review-record');
      tabs.append(b); return b;
    });
    const record = create('section','city-review-record');
    record.id = 'city-review-record'; record.setAttribute('role','tabpanel'); record.tabIndex = 0;
    root.append(head,pick,tabs,record);
    let selectedIssue = 'medical', selectedStage = 'counter';
    const sourceById = new Map(demo.sources.map(source => [source.id,source]));
    function sources(parent, ids, compact = false) {
      if (!parent) return;
      const links = create(compact?'span':'div',compact?'city-chat-citations':'city-review-sources');
      for (const id of new Set(ids || [])) {
        const source = sourceById.get(id);
        if (!source) continue;
        const number = demo.sources.indexOf(source)+1;
        const link = button(compact ? '['+number+']' : '依据 · '+source.agency,'city-review-reference');
        link.title = source.title;
        link.setAttribute('aria-label','查看依据：'+source.title);
        link.dataset.traceStage = 'source'; link.dataset.traceSourceId = source.id;
        links.append(link);
      }
      if (links.childElementCount) (compact ? parent.querySelector('h4') : parent).append(links);
    }
    function note(label, text, cls) {
      if (!text) return;
      const box = create('section','city-review-note '+(cls || ''));
      box.append(create('h4','',label),create('p','',text)); record.append(box);
      return box;
    }
    function locate(issue) {
      const b = button('定位终稿原句','city-review-locate');
      b.addEventListener('click',() => {
        host.dispatchEvent(new CustomEvent('gkx-judgement-locate',{bubbles:true,detail:{quote:issue.quote}}));
      });
      record.append(b);
    }
    function render() {
      select.value = selectedIssue;
      const issue = demo.discussions[selectedIssue], citations = issue.citations || {};
      for (const b of tabButtons) {
        const current = b.dataset.cityStage === selectedStage;
        b.setAttribute('aria-selected',String(current)); b.tabIndex = current ? 0 : -1;
      }
      record.setAttribute('aria-labelledby','city-review-tab-'+selectedStage);
      record.dataset.stage = selectedStage;
      record.replaceChildren();
      if (selectedStage === 'counter') {
        note('初稿主张',issue.proposal,'city-review-original');
        sources(note('写作智能体 · 举证',issue.author,'city-chat-author'),citations.author,true);
        sources(note('反方智能体 · 质询',issue.counter,'city-chat-counter'),citations.counter,true);
        if (issue.authorReply) note('写作智能体 · 回应',issue.authorReply,'city-chat-author');
      } else if (selectedStage === 'round') {
        const minutes = note('圆桌整体结论',
          '三项争议审完后，圆桌将年度支持分为三层：优先保障医疗应急接续，有条件支持即时配送存量线路提效，城际货运先验证货源与双向装载。飞行架次用于说明规模，分别按应急保障、订单履约和货源稳定性决定后续投入。',
          'city-review-minutes');
        const choices = create('div','city-minutes-issues');
        for (const id of issueIds) {
          const option = button(demo.discussions[id].label+' · '+demo.discussions[id].decision);
          option.setAttribute('aria-pressed',String(selectedIssue===id));
          option.addEventListener('click',() => {
            selectedIssue = id; render();
            record.querySelector('.city-review-ruling').focus({preventScroll:true});
            record.querySelector('.city-review-ruling').scrollIntoView({block:'nearest'});
          });
          choices.append(option);
        }
        minutes.append(choices);
        note('本项争议',issue.proposal);
        const ruling = note(issue.decision ? '主持裁决 · '+issue.decision : '主持裁决',issue.ruling,'city-review-ruling');
        ruling.tabIndex = -1;
        sources(ruling,citations.ruling || issue.sourceIds);
        note('采信谁的意见',adoptedOpinions[selectedIssue]);
        note('给作者的改写指令',issue.instruction || issue.quote,'city-review-instruction');
        const diff = button('查看改稿对照','city-review-locate');
        diff.addEventListener('click',() => setStage('diff',true)); record.append(diff);
      } else if (selectedStage === 'diff') {
        note('改前 · 初稿',issue.before || issue.proposal,'city-review-original');
        note('改后 · 终稿',issue.quote,'city-review-ruling');
        locate(issue);
      } else {
        note('初检未通过',issue.qaFailure,'city-review-challenge');
        note('整改内容',issue.qaFix,'city-review-instruction');
        note('终稿核查',issue.quality,'city-review-ruling');
        note('实施后仍需核验',issue.gate);
        sources(record,issue.sourceIds);
        locate(issue);
      }
    }
    function setStage(key, focus) {
      selectedStage = key; render();
      if (focus) tabButtons.find(b => b.dataset.cityStage === key).focus({preventScroll:true});
    }
    function openIssue(id, focus = true, trigger) {
      if (!issueIds.includes(id)) return;
      returnTo = trigger; back.hidden = !trigger;
      selectedIssue = id; setStage('counter');
      if (focus) {
        heading.focus({preventScroll:true});
        heading.scrollIntoView({block:'nearest',inline:'nearest'});
      }
    }
    tabs.addEventListener('click', e => {
      const tab = e.target.closest('[data-city-stage]'); if (tab) setStage(tab.dataset.cityStage);
    });
    tabs.addEventListener('keydown', e => {
      const index = tabButtons.indexOf(e.target); if (index < 0) return;
      const last = tabButtons.length-1;
      const steps = {ArrowRight:(index+1) % tabButtons.length,ArrowLeft:(index+last) % tabButtons.length,Home:0,End:last};
      if (!Object.hasOwn(steps,e.key)) return;
      e.preventDefault(); setStage(panels[steps[e.key]].key,true);
    });
    select.addEventListener('change',() => openIssue(select.value,false));
    render(); host.replaceChildren(root);
    return {openIssue};
  }
  function trace(demo, material, reviewed) {
    const sourceItems = demo.sources.map(source => ({
      title:source.title, sourceId:source.id, sourceIndex:material.findIndex(item => typeof item==='string' ? item===source.title :
        item?.id===source.id || item?.title===source.title), status:'公开来源',
      location:source.agency+' · '+source.date, claim:source.detail,
      links:[{label:'打开发布单位原文',href:source.url}]
    }));
    const issues = issueIds.map(id => demo.discussions[id]);
    const metric = reviewed ? {title:'统计口径与覆盖范围',status:'已核查口径',claim:demo.anchors.scale,
      anchor:demo.anchors.scale,fields:[{label:'统计范围',value:demo.anchors.scope}],
      links:demo.sources.filter(source=>['city-network','annual-flights','support-rules'].includes(source.id)).map(source=>({label:source.title,href:source.url})),
      boundary:'公开披露的运行量与订单量、时效、成本是不同指标。比较三个场景时需取得相应明细。'} :
      {title:'当前正文的指标',status:'待复核',claim:'修订后请重新核对来源、单位、时间和统计范围。'};
    const reasons = reviewed ? issues.map(issue => ({
      title:issue.label,sourceId:issue.id,status:'预设裁决',claim:issue.ruling,anchor:issue.quote,
      fields:[{label:'初稿争议',value:issue.proposal},{label:'反方质询',value:issue.counter},
        {label:'改写指令',value:issue.instruction || issue.quote}],
      links:demo.sources.filter(source => issue.sourceIds?.includes(source.id)).map(source=>({label:source.title,href:source.url})),
      boundary:'此处记录演示中的审查取舍，具体实施仍需核对现场条件。'
    })) : [{title:'正文已修订',status:'待复核',claim:'现有预设裁决对应生成时的报告。'}];
    return {summary:reviewed ? '按争议回查公开材料、统计口径与三项政策建议的形成依据。' : '可回查原有公开资料；修订后的判断和指标需重新核查。',
      groups:[{key:'source',label:'原文溯源',status:'公开来源',items:sourceItems},
        {key:'metric',label:'指标溯源',status:metric.status,items:[metric]},
        {key:'reason',label:'推断溯源',status:reviewed?'三项预设裁决':'待复核',items:reasons}]};
  }
  window.CityLogisticsReview = Object.freeze({model, mount, trace});
})();
