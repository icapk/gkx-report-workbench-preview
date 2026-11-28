/* Only this prepared case has a revision-linked panel for each recommendation. */
(() => {
  'use strict';
  const issueIds = ['medical', 'instant', 'branch'];
  const conclusion = '医疗应急配送优先保障收发和地面接续，新增医院先做同程签收对照；城市即时配送先改善已有订单线路的高峰履约；城际货运先核实双向货源，再决定是否新增节点。';
  const dialogues = {
    medical:{
      rounds:[
        {writer:'2024年全市已有16条送血航线，全年飞行7,070架次。南山首飞15分钟，我原建议下一年度向更多医院扩围。',opponent:'年度架次说明已有运输能力。你用来比较的地面90分钟，是从血液中心到医院的一程，还是车辆往返？'},
        {writer:'原文写的是地面往返。南山的15分钟也只是一次首飞，我撤回“全市普遍节时约八成”，保留这条线路的事实。',opponent:'这一点可以直接改。下一家医院如果遇到停航，急件由谁接？目前也没有从接单到签收的同线路地面对照。'},
        {writer:'我同意先落实地面接续。我仍希望把首批新增医院列入扩围计划，边开线边补签收数据。',opponent:'我同意先保障现有急送，但新增医院应作为对照试点，具备接续条件后再立项。这里需要圆桌决定先后顺序。'}
      ],
      consensus:'保留南山首次空中送血和原地面往返的不同计时范围；删除全市节时率，明确延误、停航时的地面接续。',
      dispute:'新增医院应先纳入扩围计划，还是先完成同线路空地签收对照？',
      adopted:'采纳反方提出的新增线路验证条件，保留写作方保障已有送血服务的建议。',
      ruling:'保障现有急送接续；新增医院先选择可取得地面对照的线路试点，暂缓全面扩围。'
    },
    instant:{
      rounds:[
        {writer:'2026年1至8月，龙华一家运营方已完成约22万架次。我倾向按飞行量，把高频商圈放在优先支持名单的前面。',opponent:'这些架次能对应多少按时签收的真实订单？单区企业的飞行记录，也无法衡量送血的应急价值或城际货运的载荷。'},
        {writer:'那我收回三类场景的统一排名。商圈只和自身的地面对照比较，同区域分高峰、平峰核算每单成本与签收。',opponent:'若只看完成订单，取消和转地面的单子会消失。建议按时签收率以全部受理订单为分母，单独列出取消与改派。'},
        {writer:'同意。先支持有真实订单的线路改善高峰履约，用全部受理订单复核签收率，另算每个完成订单的总成本，再决定是否复制。',opponent:'同意这项改写。我们对支持对象、考核分母和复制条件均已达成一致，可以直接写入报告。'}
      ],
      consensus:'有条件支持现有商圈线路提效。签收率覆盖全部受理订单，取消和改派单列；比较每个完成订单的总成本后再决定复制。',
      dispute:''
    },
    branch:{
      rounds:[
        {writer:'龙华至东莞塘厦已有跨城航线。这条通道能否作为下一批转运节点建设的起点？',opponent:'开航能证明路线打通，还没有说明哪个货主会持续发货。去程与回程分别装了多少，空载或停班有记录吗？'},
        {writer:'公开资料没有逐班运单。我把“已形成稳定货运市场”改为“存在可验证的通道”，补查货主合同、往返货量和实际执飞。',opponent:'同意保留通道事实。计划班次和实际执飞应分别记录，否则无法判断服务能否持续。'},
        {writer:'这两项我都接受。我仍建议同步预投新节点，以免验证完成后耽误衔接。',opponent:'现阶段可以协调货主和两地承运人开展验证，但新增固定节点应等连续货量和成本记录齐备。是否先行投入需要裁决。'}
      ],
      consensus:'保留既有跨城通道，删除稳定盈利的推断；收集货主、双向装载和计划与实飞班次记录。',
      dispute:'货源验证期间是否同步投入新增固定转运节点？',
      adopted:'采纳反方暂缓投资的意见，保留写作方将已有走廊作为候选试线的建议。',
      ruling:'先验证固定货源、实际班次、双向装载及地面接续成本，取得连续运营证据后再论证新增节点。'
    }
  };
  const stages = [
    {key:'counter',label:'对抗审查',summary:'写作方与反方围绕三项支持建议逐轮核实证据。'},
    {key:'round',label:'圆桌仲裁',summary:'对尚存分歧的医疗扩围顺序和城际节点投资形成裁决。'},
    {key:'quality',label:'质量审查',summary:'复核重写稿中的摘要、统计分母和班次定义。'}
  ];
  function model(context) {
    const demo = window.cityLogisticsDemo;
    if (demo && !context.modified && issueIds.every(id => demo.discussions?.[id]?.quote &&
        context.text.includes(demo.discussions[id].quote))) {
      return {id:context.id, title:context.title, kind:'city-logistics', demo:true, afterShort:'下一年度分类支持', after:conclusion, stages};
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
    const heading = create('h2','city-review-heading','研判结论');
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
    head.append(heading,back,create('span','city-review-demo','模拟评审'));
    const outcome = create('section','city-review-outcome');
    outcome.append(head,create('p','city-review-verdict','医疗先保应急接续，商业线路分类验证'),create('p','city-review-conclusion',conclusion));
    const pick = create('label','city-review-pick');
    const select = create('select');
    for (const id of issueIds) {
      const option = create('option','',demo.discussions[id].label);
      option.value = id; select.append(option);
    }
    pick.append(create('span','','查看场景'),select);
    const tabs = create('div','city-review-tabs');
    tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','查看审查记录');
    const panels = [...stages.slice(0,2),{key:'diff',label:'改稿对照'},stages[2]];
    const tabButtons = panels.map(step => {
      const b = button(step.label);
      if (step.key === 'quality') b.prepend(window.GkxReviewChat.avatar(doc,'quality'));
      b.dataset.cityStage = step.key; b.setAttribute('role','tab'); b.id = 'city-review-tab-'+step.key;
      b.setAttribute('aria-controls','city-review-record');
      tabs.append(b); return b;
    });
    const record = create('section','city-review-record');
    record.id = 'city-review-record'; record.setAttribute('role','tabpanel'); record.tabIndex = 0;
    root.append(outcome,pick,tabs,record);
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
      const issue = demo.discussions[selectedIssue], exchange = dialogues[selectedIssue], citations = issue.citations || {};
      for (const b of tabButtons) {
        const current = b.dataset.cityStage === selectedStage;
        b.setAttribute('aria-selected',String(current)); b.tabIndex = current ? 0 : -1;
      }
      record.setAttribute('aria-labelledby','city-review-tab-'+selectedStage);
      record.dataset.stage = selectedStage;
      record.replaceChildren();
      if (selectedStage === 'counter') {
        const initial = note('初稿主张',issue.before || issue.proposal,'city-review-original');
        sources(initial,[...(citations.author || []),...(citations.counter || [])],true);
        const chat = create('div','city-review-chat');
        record.append(chat);
        window.GkxReviewChat.mount(chat,{rounds:exchange.rounds,consensus:exchange.consensus,dispute:exchange.dispute,
          onRuling:exchange.dispute ? () => setStage('round',true) : undefined});
        if (!exchange.dispute) {
          const diff = button('查看直接写入的改稿','city-review-locate');
          diff.addEventListener('click',() => setStage('diff',true)); record.append(diff);
        }
      } else if (selectedStage === 'round') {
        const minutes = note('圆桌纪要',
          '医疗和城际两项未决分歧进入圆桌。城市即时配送的意见已在对抗审查中收敛，直接写入重写稿。','city-review-minutes');
        const choices = create('div','city-minutes-issues');
        for (const id of issueIds) {
          const option = button(demo.discussions[id].label);
          option.setAttribute('aria-pressed',String(selectedIssue===id));
          option.addEventListener('click',() => {
            selectedIssue = id; render();
            record.querySelector('.city-review-ruling').focus({preventScroll:true});
            record.querySelector('.city-review-ruling').scrollIntoView({block:'nearest'});
          });
          choices.append(option);
        }
        minutes.append(choices);
        if (exchange.dispute) {
          note('提交圆桌的分歧',exchange.dispute);
          const ruling = note('圆桌裁决 · '+issue.decision,exchange.ruling,'city-review-ruling');
          ruling.tabIndex = -1; sources(ruling,citations.ruling || issue.sourceIds);
          note('采纳意见',exchange.adopted);
        } else {
          const agreed = note('已达成一致，无需裁决',exchange.consensus,'city-review-ruling');
          agreed.tabIndex = -1; sources(agreed,issue.sourceIds);
        }
        note('写入重写稿',issue.instruction || issue.quote,'city-review-instruction');
        const diff = button('查看改稿对照','city-review-locate');
        diff.addEventListener('click',() => setStage('diff',true)); record.append(diff);
      } else if (selectedStage === 'diff') {
        note('改前 · 初稿',issue.before || issue.proposal,'city-review-original');
        note('改后 · 终稿',issue.quote,'city-review-ruling');
        locate(issue);
      } else {
        const role = create('div','city-review-quality-role');
        role.append(window.GkxReviewChat.avatar(doc,'quality'),create('strong','','质量审查智能体'));
        record.append(role);
        note('重写稿初检未通过',issue.qaFailure,'city-review-challenge');
        note('整改内容',issue.qaFix,'city-review-instruction');
        note('终稿核查',issue.quality,'city-review-ruling');
        note('实施后仍需核验',issue.gate);
        sources(record,issue.sourceIds);
        locate(issue);
      }
    }
    function setStage(key, focus) {
      selectedStage = key; render();
      if (focus) {
        const tab = tabButtons.find(b => b.dataset.cityStage === key);
        tab.focus({preventScroll:true});
        tab.scrollIntoView({block:'nearest',inline:'nearest'});
      }
    }
    function openIssue(id, focus = true, trigger) {
      if (!issueIds.includes(id)) return;
      if (trigger) { returnTo = trigger; back.hidden = false; }
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
      title:issue.label,sourceId:issue.id,status:dialogues[issue.id].dispute ? '模拟圆桌裁决' : '共识直接写入',claim:dialogues[issue.id].ruling || dialogues[issue.id].consensus,anchor:issue.quote,
      fields:[{label:'初稿争议',value:issue.proposal},{label:'反方质询',value:issue.counter},
        {label:'改写指令',value:issue.instruction || issue.quote}],
      links:demo.sources.filter(source => issue.sourceIds?.includes(source.id)).map(source=>({label:source.title,href:source.url})),
      boundary:'此处记录演示中的审查取舍，具体实施仍需核对现场条件。'
    })) : [{title:'正文已修订',status:'待复核',claim:'现有审查意见对应生成时的报告。'}];
    return {summary:reviewed ? '按争议回查公开材料、统计口径与三项政策建议的形成依据。' : '可回查原有公开资料；修订后的判断和指标需重新核查。',
      groups:[{key:'source',label:'原文溯源',status:'公开来源',items:sourceItems},
        {key:'metric',label:'指标溯源',status:metric.status,items:[metric]},
        {key:'reason',label:'推断溯源',status:reviewed?'两项裁决 · 一项共识':'待复核',items:reasons}]};
  }
  window.CityLogisticsReview = Object.freeze({model,mount,trace,dialogues});
})();
