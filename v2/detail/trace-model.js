(function () {
  'use strict';

  const policyFile = './trace-sources/sz-low-altitude-article-28.html';
  const orderFile = './trace-sources/low-altitude-simulated-orders.csv';
  const policyURL = 'https://www.sz.gov.cn/zfgb/2024/gb1319/content/post_11127288.html';
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const field = (label, value) => ({label, value});
  const makeGroup = (key, label, status, items) => ({key,label,status,items});
  const small = (text, maximum = 220) => text.slice(0,maximum);
  const extract = (title, status, values) => ({
    title, status, claim:'', quote:'', location:'', fields:[], links:[], boundary:'', ...values
  });

  function secureLink(value) {
    if (!clean(value)) return '';
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.username || u.password || u.hash.includes('access_token')) return '';
      for (const name of u.searchParams.keys()) {
        if (/token|secret|passw|ticket|signature|credential|^key$|^sign$|^auth$|^x-amz-|^x-goog-/i.test(name)) return '';
      }
      return u.href;
    } catch { return ''; }
  }
  function editorAnchor(editor, number) {
    if (!editor?.querySelectorAll) return '';
    const marker = Array.from(editor.querySelectorAll('[data-source]')).find(el=>el.dataset.source===String(number));
    const block = marker?.closest('p,li,td,th,blockquote');
    if (!block || !editor.contains(block)) return '';
    const parts = Array.from(block.childNodes).flatMap(node => {
      if (node.nodeType === 1 && node.matches('[data-source]')) return [];
      return [clean(node.textContent)];
    });
    return small(parts.filter(text=>text.length>2).sort((a,b)=>b.length-a.length)[0] || '',120);
  }
  function restricted(entry) {
    const status = clean(entry.access || entry.status).toLowerCase();
    return entry.accessDenied === true || entry.hasPermission === false || entry.canRead === false ||
      entry.status === 403 || ['403','forbidden','denied','无权限','权限不足','无权访问','无权查看原文'].includes(status);
  }
  function reportSources(entries,editor) {
    return entries.map((value,index)=>{
      const entry = typeof value === 'string' ? {title:value} : value || {};
      const title = clean(entry.title) || clean(entry.name) || '来源 '+(index+1);
      const keyed = entry.id ?? entry.sourceId;
      const anchor = (keyed != null && editorAnchor(editor,keyed)) || editorAnchor(editor,index+1);
      const denied = restricted(entry);
      const excerpt = denied ? '' : clean(entry.excerpt) || clean(entry.text);
      const summary = denied ? '' : clean(entry.summary);
      const original = denied ? '' : secureLink(entry.url || entry.href || entry.sourceUrl);
      const status = denied ? '无权查看原文' : excerpt ? '有来源文本' : summary ? '仅有来源摘要' : '原文未获取';
      const fields = [field('来源记录','当前会话 · 引用 '+(index+1))];
      for (const [label,value] of [['来源标识',keyed],['材料版本',entry.version||entry.revision],['发布机构',entry.publisher],['更新时间',entry.updatedAt]]) {
        if (typeof value==='string' && value.trim()) fields.push(field(label,value));
      }
      if (anchor) fields.push(field('正文关联','已找到当前报告中的引用标记'));
      if (summary && !excerpt) fields.push(field('已有摘要',small(summary)));
      const sourceId = entry.id ?? entry.sourceId;
      return extract(title,status,{
        sourceIndex:index, ...(sourceId != null ? {sourceId} : {}),
        claim:anchor?'本报告的这处引用关联到本材料。':'本材料已列入本报告的来源清单。',
        quote:small(excerpt), location:denied?'当前会话记录为受限':clean(entry.location) || (excerpt?'当前会话保存的材料文本':'当前会话来源列表'),
        fields, links:original ? [{label:'打开来源地址',href:original}] : [],
        boundary:denied?'原文受限，无法逐字核对。':excerpt?'显示会话内留存的文本。出处真实性和本材料能够支持的判断仍需结合完整原件核对。':summary?'摘要可辅助查找资料；现有记录没有可逐字核对的原文。':'材料名称可用于追索原件。其正文和支撑范围尚待核对。',
        ...(anchor ? {anchor} : {})
      });
    });
  }

  const orderWindow = {start:'2026-11-20 09:00', end:'2026-11-20 10:00', cutoff:'2026-11-20 12:00'};
  // These four fictional records are the input for both the displayed calculation and the shipped CSV.
  const orders = [
    ['DEMO-01','2026-11-20 09:00','2026-11-20 09:30','2026-11-20 09:24'],
    ['DEMO-02','2026-11-20 09:12','2026-11-20 09:42','2026-11-20 09:42'],
    ['DEMO-03','2026-11-20 09:25','2026-11-20 09:55','2026-11-20 10:03'],
    ['DEMO-04','2026-11-20 09:40','2026-11-20 10:10','']
  ];
  function metricSample() {
    const {start,end,cutoff} = orderWindow;
    const due = orders.filter(([,accepted,promised])=>accepted >= start && accepted < end && promised <= cutoff);
    const rows = due.map(([id,accepted,promised,signed])=>{
      const received = signed && signed <= cutoff;
      const result = !received ? '未签收' : signed <= promised ? '准时' : '超时';
      return [id,'医疗急送模拟件／A线',accepted,promised,received ? signed : '',result,cutoff];
    });
    const ontime = rows.filter(row=>row[5]==='准时').length;
    const late = rows.filter(row=>row[5]==='超时').length;
    const pending = rows.length - ontime - late;
    const rate = rows.length ? (ontime / rows.length * 100).toLocaleString('zh-CN',{maximumFractionDigits:1})+'%' : '无可计算订单';
    return extract('模拟订单按时签收率 · '+rate,'模拟台账',{
      demo:true, claim:'演示如何从受理订单复算签收指标。超时、到期未签收都计入分母。',
      location:'演示台账 · 医疗急送模拟件／A线 · 北京时间',
      anchor:'同类急件从受理到签收的用时、按约定时限签收的比例，以及异常改派后的交接时间。',
      fields:[
        field('计算结果',ontime+' ÷ '+rows.length+' × 100% = '+rate),
        field('单位','百分比（按订单数计算）'),
        field('分子','截至核查时点，在约定签收时刻或之前签收的订单，共 '+ontime+' 笔。'),
        field('分母','统计窗内受理且截至核查时点已到约定时刻的订单，共 '+rows.length+' 笔。'),
        field('模拟受理时间窗',start+' 至 '+end+' 前'),
        field('模拟核查时点',cutoff+'（北京时间）'),
        field('记录分布','准时 '+ontime+' 笔、超时 '+late+' 笔、未签收 '+pending+' 笔。')
      ],
      records:{headers:['模拟订单号','模拟场景','受理时间（北京）','约定签收（北京）','实际签收（北京）','核查结果','核查时点（北京）'],rows},
      links:[{label:'下载模拟订单台账（CSV）',href:orderFile,download:true}],
      boundary:'四笔订单均为虚构。该比例只演示口径，没有反映深圳真实准时率，也不能用于比较医疗急送和园区配送。'
    });
  }

  function noMetric() {
    return extract('业务指标记录','待补充',{
      claim:'本报告尚无可复算的指标明细。',
      fields:[field('所需资料','指标定义、统计窗口、原始记录与分母。')],
      boundary:'在取得明细前，没有足够依据给出实测值。'
    });
  }
  function logistics(existing,review) {
    const goal='研究目标：比较医疗急送与园区配送的示范条件及优先次序。';
    const policy=extract('深圳经济特区低空经济产业促进条例','官方原文已核对',{
      demo:false, claim:'补充的政策背景：深圳将快递、即时配送列入无人驾驶航空器应加强应用的物流服务领域。',
      quote:'在快递、即时配送等物流配送服务领域的应用', location:'第四章 产业应用 · 第二十八条',anchor:goal,
      fields:[field('公布机关','深圳市人民代表大会常务委员会'),field('公布日期','2024-01-03'),field('施行日期','2024-02-01'),field('文本来源','深圳市人民政府公报 · 2024年第4期（总第1319期）'),field('与本报告的关系','为本稿的场景比较问题补充政策背景，原稿没有以引用角标引用本条。')],
      links:[{label:'查看离线条文摘录',href:policyFile},{label:'打开深圳市政府公报原文',href:policyURL}],
      boundary:'条文没有提供线路订单、签收用时或成本，也没有给医疗急送与园区配送排定优先次序。'
    });
    const reason = extract('为什么暂不排定两个场景的先后','有条件的建议',{
      claim:'先核实地面对照、交接责任和停运接续，再安排具备验证条件的场景开展小范围试点。',
      quote:review.after, location:'本报告 · 核心结论', anchor:review.after, related:['source','metric'],
      fields:[
        field('已核对','条例列出物流配送应用方向；报告末尾明确两类场景的对照记录仍缺失。'),
        field('指标在这里做什么','订单样表只能解释怎样计算签收指标。现场判断要换成两类场景的实际全量记录。'),
        field('建议成立的前提','能取得同线路、同时段的地面对照，并约定收发交接及异常改派的做法。'),
        field('何时改变判断','如某场景在可比时段已有完整订单、签收与异常改派记录且达到约定要求，可重议首批试点；若停运无法接续，应暂缓该场景。')
      ], boundary:'目前证据只到试点准备和验证方法，两个场景的实际优先次序仍待业务复核。'
    });
    return [makeGroup('source','原文溯源','补充了公开政策',[policy,...existing]),
      makeGroup('metric','指标溯源','模拟台账',[metricSample()]),
      makeGroup('reason','推断溯源','待业务验证',[reason])];
  }
  function embodied(existing,review) {
    const excerpt='可选取同一操作任务，对照感知、规划、执行和异常恢复四个环节，记录任务成功条件、人工介入方式及采样环境。';
    const note=extract('同一操作任务的复测要求','本稿原句',{
      quote:excerpt, anchor:excerpt, location:'本报告 · 信号与证据',
      claim:'报告提出了比较测试的方法，当前会话没有对应的外部实测记录。',
      boundary:'这段话说明应当记录哪些事实。它本身不能证明某款设备达到了可部署水平。'
    });
    const gap=extract('任务成功率与人工干预率','实测数据待补',{
      claim:'报告列有观察环节，尚未给出可计算的实际运行明细。',
      location:'本报告 · 信号与证据',anchor:excerpt,
      fields:[field('待补明细','同一任务条件、每轮成功或失败、人工介入、异常恢复、采样环境。'),field('统计前需确认','试次如何计数、何为成功、人工介入是否计为完成，以及观察时间窗。')],
      boundary:'现有材料不能算出成功率、干预率，也不能量化部署效果。'
    });
    const reason=extract('为何要先复测，再判断部署价值','有条件的建议',{
      claim:'演示说明当次任务的表现。判断真实作业条件下的可用性，还需重复试次和异常恢复记录。',
      quote:review.after,anchor:review.after,location:'本报告 · 核心结论',related:['source','metric'],
      fields:[field('已有依据','本稿区分演示环境和开放环境，并列出同任务复测方法。'),field('必要假设','复测条件覆盖拟使用场景，且失败试次和人工介入均留有记录。'),field('何时重议','补齐代表性现场的多轮测试和异常恢复记录后，可重新评价该场景的部署价值；仅有成功演示时继续保留判断。')],
      boundary:'这是基于报告方法的条件推断。当前示例没有外部试验数据。'
    });
    return [makeGroup('source','原文溯源','本稿依据',[...existing,note]),makeGroup('metric','指标溯源','缺少实测',[gap]),makeGroup('reason','推断溯源','待外部验证',[reason])];
  }
  function sampleMetric(stage) {
    return extract('质量审查的模拟核对表','模拟数据',{
      demo:true, claim:stage.summary, location:'研判回放 · 质量审查',
      records:{headers:['核对项','模拟记录'], rows:stage.records.map(row=>[row.label,row.value])},
      fields:(stage.checks || []).map(row=>field(row.label,row.result)),
      boundary:'数值来自本页的演示样例。业务决策需要用实际记录重新核对。'
    });
  }

  function mockGroups(sources,review) {
    const [counter,round,quality] = review.stages;
    const source = extract('反方质询所用的模拟记录','模拟材料',{
      demo:true, claim:counter.summary, location:'研判回放 · 对抗审查',
      fields:counter.records.map(row=>field(row.label,row.value)),
      boundary:'此处展示质询所用的演示条件。'
    });
    const cited = counter.evidence.find(item=>item.quote);
    if (cited) Object.assign(source,{quote:cited.quote,anchor:cited.quote,location:'报告原句 · '+cited.label});
    const reason = extract('圆桌如何确定建议','模拟仲裁',{
      demo:true, claim:round.summary, location:'研判回放 · 圆桌仲裁',
      fields:round.voices.map(voice=>field(voice.name,voice.text)),
      related:['source','metric'], boundary:review.after
    });
    return [makeGroup('source','原文溯源',sources.length ? '含任务材料' : '研判样例',[source,...sources]),
      makeGroup('metric','指标溯源','模拟口径',[sampleMetric(quality)]),
      makeGroup('reason','推断溯源','模拟仲裁',[reason])];
  }

  function bloodNetworkTrace(demo, material, review) {
    const reviewed = review?.kind === 'blood-network';
    const anchors = demo.anchors;
    const sourceItems = demo.sources.map(source => {
      const annual = source.id === 'network-2024';
      const index = material.findIndex(entry => typeof entry === 'string' ? entry === source.title :
        entry?.id === source.id || entry?.title === source.title);
      return extract(source.title,'官方公开资料',{
        sourceId:source.id,sourceIndex:index,
        claim:annual ? '市卫生健康委披露了2024年全市运行总量。' : '市血液中心报道了南山航线首飞及原地面往返用时。',
        quote:annual ? '全年累计飞行7,070架次' : '相较于原来地面运输的往返90分钟',
        location:[source.agency,source.date].filter(Boolean).join(' · '),
        fields:[field('资料要点',source.detail),field('查找位置',annual ? '演练报道末段的2024年度汇总' : '首段的首飞经过与地面往返比较')],
        links:[{label:'打开'+source.agency+'原文',href:secureLink(source.url)}],
        boundary:annual ? '统计范围为深圳全市。飞行架次、血液净重和年末航线数分别计量。' :
          '报道中的约八成是该航线首飞与原地面往返的比较；推广至其他线路需要同口径的签收记录。',
        ...(reviewed ? {anchor:annual ? anchors.scale : anchors.timing} : {})
      });
    });
    const sourceGroup=makeGroup('source','原文溯源','官方公开资料',sourceItems);
    if (!reviewed) {
      return {summary:'可回查生成报告时使用的两篇公开资料。当前正文的指标与结论需重新核验。',
        groups:[sourceGroup,makeGroup('metric','指标溯源','待重新核验',[extract('当前正文的计算','待重新核验',{claim:'请确认当前原文、分子分母及单位。'})]),
          makeGroup('reason','推断溯源','待重新审查',[extract('当前正文的判断','待重新审查',{claim:'预设审查对应生成时的报告。正文修订后需要重新判断证据能否支持结论。'})])]};
    }
    const annotatedSources=sourceItems.map(item => item.links[0]);
    const annual=sourceItems.find(item => item.sourceId === 'network-2024');
    const flights=7070, calendarDays=366, perDay=(flights/calendarDays).toFixed(1);
    const metric = extract('全市日均飞行架次 · '+perDay+'架次/日','公开数据复算',{
      claim:'按日历日计算2024年全市运行规模。',location:'市卫生健康委披露的年度汇总 · 2024年',
      anchor:anchors.audit,
      fields:[field('计算结果',flights.toLocaleString('en-US')+' ÷ '+calendarDays+' ≈ '+perDay+'架次/日'),
        field('分子','2024年全市无人机血液运输飞行架次合计，单位为架次。'),
        field('分母','2024年日历日合计，含2月29日。'),
        field('独立统计项','截至年末开通16条航线；全年运送血液净重4,412公斤。')],
      records:{headers:['统计项','数值','单位／范围'],rows:[
        ['累计飞行',flights.toLocaleString('en-US'),'架次 · 全市全年'],['日历日',String(calendarDays),'天 · 2024年'],
        ['计算所得日均',perDay,'架次/日 · 全市']]},
      links:annual.links,boundary:'日均只描述全市运行量。签收时长、成本和异常改派需另取线路级原始记录。'
    });
    const reason = extract('为何先做同线路对照试点','预设审查建议',{
      claim:anchors.decision,anchor:anchors.decision,location:'演示圆桌 · 根据公开材料作出的条件判断',
      fields:[field('已知事实','年度运行量与南山首飞分别有官方报道。'),
        field('采纳','有地面接续的线路先做空地对照。统一受理、出发与签收时间，登记成本及异常。'),
        field('驳回','现有证据不足以支持全面扩围；把首飞和地面往返的比较外推至全市会夸大结论。'),
        field('何时调整','同类线路达到事先约定的比较条件后考虑分批扩大。不能保障地面接续的线路暂缓。')],
      links:annotatedSources,related:['source','metric'],
      boundary:'这是原型演示中的预设判断。两篇官方报道提供事实依据，实际是否扩围需要主管部门另行决策。'
    });
    return {summary:'两篇官方资料可回查，年度日均可复算。试点取舍为预设审查，签收、成本和异常仍待采集。',
      groups:[sourceGroup,makeGroup('metric','指标溯源','公开数据复算',[metric]),makeGroup('reason','推断溯源','预设审查建议',[reason])]};
  }

  function savedEntries(report, entries) {
    if (Array.isArray(entries)) return entries;
    const details = Array.isArray(report.sourceDetails) ? report.sourceDetails : [];
    const listed = report.sources?.length && Array.isArray(report.sources) ? report.sources : details;
    return listed.map(item => typeof item === 'string'
      ? details.find(detail => detail?.title === item || detail?.name === item) || item : item);
  }

  function judgementTrace({report={},editor,review}={}, material=[]) {
    const sources=reportSources(material,editor);
    const id=clean(report.sessionId) || clean(report.id);
    if (report.demoCaseId === 'sz-city-logistics-policy' && window.cityLogisticsDemo?.id === report.demoCaseId) {
      return window.CityLogisticsReview.trace(window.cityLogisticsDemo,material,review?.id===id && review?.kind==='city-logistics');
    }
    if (report.demoCaseId === 'sz-blood-network-2024' && window.bloodNetworkDemo?.id === report.demoCaseId)
      return bloodNetworkTrace(window.bloodNetworkDemo, material, review?.id === id ? review : null);
    if (review?.demo === true && review.id === id) {
      if(review.kind==='curated' && id==='sample-low-altitude-logistics') return {summary:'深圳低空条例第二十八条可回查，四笔模拟订单可复算。确定试点先后仍缺真实对照记录。',groups:logistics(sources,review)};
      if(review.kind==='curated' && id==='1:153') {
        const groups=embodied(sources,review);
        const metric=groups.find(group=>group.key==='metric');
        const quality=review.stages.find(stage=>stage.key==='quality');
        if (quality?.records?.length) {
          metric.items.unshift(sampleMetric(quality));
          metric.status='含模拟复测';
        }
        return {summary:'可回查同任务复测的正文，并对照模拟试次核算。现场部署条件仍需实测。',groups};
      }
      return {summary:'本报告的模拟研判可回查反方所用材料、质量审查口径和圆桌取舍。',groups:mockGroups(sources,review)};
    }
    const reason=extract('判断与依据','暂无推断记录',{
      claim:sources.length?'当前会话列有来源，但尚未保存某条判断到材料、指标和限制条件的推断记录。':'当前会话尚无可关联到关键判断的材料。',
      boundary:'需要由执笔人明确依据支持的判断、适用条件和反证后，再进行复核。'
    });
    const noSource=extract('当前任务来源','暂无材料',{claim:'本报告的来源清单为空。',boundary:'取得授权材料后，才能从具体判断回指原文。'});
    const readable=sources.filter(source=>source.quote).length;
    const summary=!sources.length ? '本报告尚未关联来源，也没有可复算的指标或可复核的推断记录。'
      : readable ? '本报告登记了 '+sources.length+' 项来源，其中 '+readable+' 项留有可核对文本。指标和判断依据需分别核验。'
      : '本报告登记了 '+sources.length+' 项来源，当前没有可逐字核对的原文。';
    return {summary,groups:[makeGroup('source','原文溯源',sources.length?'当前报告来源':'暂无来源',sources.length ? sources : [noSource]),
      makeGroup('metric','指标溯源','待补充',[noMetric()]),makeGroup('reason','推断溯源','待核验',[reason])]};
  }
  const channelSpecs = [
    ['knowledge','知识库','本报告没有留存已选用的知识库条目。'],
    ['metric','指标库','本报告没有留存指标值或计算口径。'],
    ['web','Web 搜索','本报告没有留存公开网页来源或检索记录。'],
    ['attachment','上传附件','本报告没有关联上传附件。'],
    ['other','其他来源','本报告没有其他来源。']
  ];
  const array = value => Array.isArray(value) ? value : [];
  const asSource = value => typeof value === 'string' ? {title:value} : value || {};
  const nameOf = value => clean(value.title) || clean(value.name);
  const sourceKey = value => String(value.id ?? value.sourceId ?? '');

  function originChannel(record) {
    const origin = clean(record.channel || record.sourceType || record.source || record.type).toLowerCase();
    if (['knowledge','knowledge-base','知识库'].includes(origin) || record.collectionId && record.fileId) return 'knowledge';
    if (['metric','indicator','指标','指标库'].includes(origin)) return 'metric';
    if (['upload','local','outline','attachment','本地上传','上传附件'].includes(origin)) return 'attachment';
    if (['web','web-search','web_search','web 搜索','网页检索','网页'].includes(origin) || secureLink(record.url || record.href || record.sourceUrl)) return 'web';
    return 'other';
  }

  function sourceChannels(model, {report={},review,editor,attachments}, material) {
    const channels = Object.fromEntries(channelSpecs.map(([key,label,empty]) => [key,{key,label,empty,items:[]}]));
    const groups = Object.fromEntries(model.groups.map(group => [group.key,group.items]));
    function include(channel, detailKey, detailIndex, display={}) {
      const detail = groups[detailKey][detailIndex];
      channels[channel].items.push({
        title:detail.title, meta:detail.location || '', excerpt:detail.quote || detail.claim || '',
        status:detail.status, ...display, detailKey, detailIndex
      });
    }
    function append(channel,detailKey,detail,display) {
      const index = groups[detailKey].push(detail)-1;
      include(channel,detailKey,index,display);
    }
    const currentId = clean(report.sessionId) || clean(report.id);
    const reviewHere = review && review.id === currentId;
    const city = report.demoCaseId === 'sz-city-logistics-policy' && window.cityLogisticsDemo?.id === report.demoCaseId;
    const blood = report.demoCaseId === 'sz-blood-network-2024' && window.bloodNetworkDemo?.id === report.demoCaseId;
    const curated = reviewHere && review.kind === 'curated';
    const logisticsCase = curated && currentId === 'sample-low-altitude-logistics';
    const robotics = curated && currentId === '1:153';
    const listed = new Set();

    // A saved demo binds each public citation to its original detail and index. Edited drafts retain the source history.
    if (city || blood || logisticsCase) {
      const queries = {
        'city-network':'深圳 2025 新开低空物流航线 年度计划执行情况',
        'annual-flights':'深圳 2024 无人机载货飞行架次 年度盘点',
        'network-2024':'深圳 无人机送血 2024 全年 航线 飞行架次',
        'nanshan-flight':'深圳市血液中心 南山 首飞 15分钟 地面往返',
        'district-routes':'深圳龙华 无人机 配送架次 跨城货运航线',
        'support-rules':'深圳 支持低空经济 交通运输实施细则 物流航线 奖励'
      };
      const preset = city ? window.cityLogisticsDemo : blood ? window.bloodNetworkDemo : null;
      groups.source.forEach((detail,index) => {
        if (preset ? !preset.sources.some(source => source.id === detail.sourceId) : index !== 0) return;
        const query = queries[detail.sourceId] || '深圳 低空经济产业促进条例 第二十八条 即时配送';
        detail.fields = [field('演示检索词',query),...(detail.fields || [])];
        include('web','source',index,{status:'预置公开来源',excerpt:city ? detail.claim : detail.fields?.find(row=>row.label==='资料要点')?.value || detail.quote});
        if (detail.sourceIndex >= 0) listed.add(detail.sourceIndex);
      });
    }
    if (city || blood || logisticsCase || robotics) {
      const comparison = robotics ? '操作任务复测记录规范' : city ? '三类低空物流场景评审要点' : '空地配送对照采样清单';
      const content = robotics ? '固定任务、物体与运行环境，逐轮记录任务结果、人工介入和异常恢复。'
        : city ? '医疗应急核对收发交接和停航接续，即时配送核对按时签收与单均成本，城际货运核对双向货源和装载率。'
          : '同一线路、同类任务分别记录受理、出发、签收和地面接续时间，保留未完成的任务。';
      const anchor = city ? window.cityLogisticsDemo.anchors.scope : blood ? window.bloodNetworkDemo.anchors.timing : '';
      append('knowledge','source',extract(comparison,'预置演示条目',{
        demo:true,claim:content, location:'演示知识库 · 研究方法',
        fields:[field('条目内容',content),field('应用环节','确定需要补采的记录与对照口径。')],
        boundary:'这张研究方法卡为本案例预置。业务核验需要另取现场记录。',
        ...(anchor && editor?.textContent?.includes(anchor) ? {anchor} : {})
      }));
    }
    if (city) {
      const source = window.cityLogisticsDemo.sources.find(item => item.id === 'city-network');
      const annual = window.cityLogisticsDemo.sources.find(item => item.id === 'annual-flights');
      for (const [title,scope,sourceRecord,anchor] of [
        ['2025年新开低空物流航线 · 82条','统计2025年在深圳新开的低空物流航线，同期累计开通310条。',source,window.cityLogisticsDemo.anchors.scale],
        ['2024年无人机载货飞行量 · 约77.6万架次','统计2024年深圳全市无人机载货飞行架次。公开盘点未提供订单量与分场景收益。',annual,'2024年全市无人机载货飞行约77.6万架次。']
      ]) {
        append('metric','metric',extract(title,'公开数据 · 演示指标条目',{
          claim:scope,location:'演示指标库 · 深圳全市',fields:[field('指标口径',scope),field('数据出处',sourceRecord.title),field('发布机构',sourceRecord.agency)],
          links:[{label:'查看公开数据原文',href:sourceRecord.url}], boundary:'原始公开资料反映网络或运行规模。修订正文后应重新核对指标的适用范围。',
          ...(reviewHere && review.kind === 'city-logistics' && editor?.textContent?.includes(anchor) ? {anchor} : {})
        }));
      }
    } else if ((blood && reviewHere && review.kind === 'blood-network') || logisticsCase || (robotics && groups.metric[0]?.demo)) {
      include('metric','metric',0,{status:blood?'预置指标 · 公开数据复算':'预置模拟指标'});
    }
    if (robotics) {
      append('web','source',extract('机器人抓取性能指标与测试方法','预置公开资料',{
        claim:'美国国家标准与技术研究院介绍了如何用统一条件测试机械手的抓取性能，并提供测试方法与示例。',
        location:'美国国家标准与技术研究院（NIST） · 方法参考',
        fields:[field('演示检索词','NIST robotic grasping performance metrics test methods')],
        links:[{label:'查看 NIST 方法原文',href:'https://www.nist.gov/el/intelligent-systems-division-73500/robotic-grasping-and-manipulation-assembly/grasping'}],
        boundary:'本条是演示补充的方法背景。报告中的模拟试次由原型提供，NIST 未对该案例设备开展测试。'
      }));
    }

    const supplied = [...array(attachments),...array(report.attachments),...array(report.knowledgeFiles).map(value => ({...asSource(value),source:'knowledge'}))];
    const origins = [];
    for (const value of supplied) {
      const file = asSource(value);
      if (!nameOf(file)) continue;
      if (origins.some(other => file === other || (sourceKey(file) && sourceKey(other) === sourceKey(file)))) continue;
      origins.push(file);
    }
    const matched = new Set();
    const matchOrigin = entry => {
      const id = sourceKey(entry);
      const exact = id && origins.find(file => sourceKey(file) === id);
      if (exact) return exact;
      const matches = origins.filter(file => nameOf(file) === nameOf(entry) && (!id || !sourceKey(file)));
      if (matches.length === 1) return matches[0];
      const version = clean(entry.text) && matches.filter(file => file.text === entry.text);
      return version?.length === 1 ? version[0] : null;
    };
    function includeSaved(value, listIndex, origin) {
      const entry = asSource(value);
      const record = origin ? {...origin,...entry} : entry;
      const bucket = originChannel(record);
      const existing = listIndex < 0 ? -1 : groups.source.findIndex(detail=>detail.sourceIndex===listIndex);
      // Rehydrate older sourceDetails that only retained title and text, while respecting both access records.
      if (origin && (restricted(origin) || restricted(entry))) record.accessDenied = true;
      const refreshed = existing < 0 || origin;
      let detail = refreshed ? reportSources([record],null)[0] : groups.source[existing];
      if (refreshed && existing >= 0) {
        const previous = groups.source[existing];
        detail.sourceIndex = listIndex;
        detail.fields[0] = field('来源记录','当前会话 · 引用 '+(listIndex+1));
        if (previous.anchor) {
          detail.anchor = previous.anchor;
          detail.claim = previous.claim;
          detail.fields.push(field('正文关联','已找到当前报告中的引用标记'));
        }
        groups.source[existing] = detail;
      }
      if (existing < 0) {
        if (listIndex >= 0) detail.sourceIndex=listIndex;
        else {
          delete detail.sourceIndex;
          detail.fields[0]=field('来源记录','本次写作任务的关联材料');
          detail.claim='本次写作任务关联了这份材料。';
        }
      }
      const denied = detail.status === '无权查看原文';
      const priorLink = existing >= 0 ? detail.links?.find(link=>secureLink(link.href)) : null;
      const addr = denied ? '' : secureLink(record.url || record.href || record.sourceUrl || priorLink?.href);
      const collection = clean(record.collectionName) || clean(record.collectionTitle) || clean(record.libraryName);
      if (bucket === 'knowledge') {
        if (collection) detail.fields.push(field('所属知识库',collection));
        else if (clean(record.collectionId)) detail.fields.push(field('知识库标识',record.collectionId));
        if (clean(record.sourceLabel)) detail.fields.push(field('入库来源',record.sourceLabel));
      }
      const searched = [record.channel,record.sourceType,record.source,record.type].some(value =>
        ['web-search','web_search','web 搜索','网页检索'].includes(clean(value).toLowerCase()));
      if (bucket === 'web' && searched && !denied) {
        const query = clean(record.searchQuery) || clean(record.query) || clean(record.keyword);
        const searchedAt = clean(record.searchedAt) || clean(record.searchTime) || clean(record.searchDate);
        if (query) detail.fields.push(field('检索词',query));
        if (searchedAt) detail.fields.push(field('检索时间',searchedAt));
      }
      const meta = bucket === 'knowledge' ? collection || '本次任务选用的知识材料' : bucket === 'attachment' ? '本次任务关联的附件'
        : bucket === 'web' ? (searched ? '保存的检索结果' : '网页引用 · 正文或材料清单提供') : bucket === 'metric' ? '报告留存的指标记录' : '当前报告的来源清单';
      // A selected attachment need not have been cited or retrieved. Only mark excerpts actually saved in the source record.
      if (!denied && addr && !priorLink && existing >= 0) detail.links = [...(detail.links || []),{label:'打开来源地址',href:addr}];
      const excerpt = denied ? '此材料的原文访问受限。' : detail.quote || clean(record.summary) || (addr ? new URL(addr).hostname : '已登记材料名称，尚未留存原文摘录。');
      if (bucket === 'metric') {
        const figure = typeof record.value === 'number' || typeof record.value === 'string' ? String(record.value) : '';
        const definition = clean(record.definition) || clean(record.formula);
        const valueText = [figure,clean(record.unit)].filter(Boolean).join(' ');
        detail = {...detail,fields:[...detail.fields],links:[...(detail.links || [])]};
        if (!denied && valueText) detail.fields.push(field('记录值',valueText));
        if (!denied && definition) detail.fields.push(field('指标口径',definition));
        if (!denied && clean(record.period)) detail.fields.push(field('统计期',record.period));
        append(bucket,'metric',detail,{meta,excerpt:denied ? excerpt : [valueText,definition].filter(Boolean).join(' · ') || excerpt});
      } else {
        const index = existing >= 0 ? existing : groups.source.push(detail)-1;
        include(bucket,'source',index,{meta,excerpt});
      }
    }
    material.forEach((value,index) => {
      const file = matchOrigin(asSource(value));
      if (file) matched.add(file);
      if (!listed.has(index)) includeSaved(value,index,file);
    });
    origins.filter(file=>!matched.has(file)).forEach(file=>includeSaved(file,-1));

    const seenLinks = new Set(groups.source.flatMap(detail => (detail.links || []).map(link => secureLink(link.href))).filter(Boolean));
    // Editable reports can contain standalone source links even when the task had no attachment manifest.
    for (const link of editor?.querySelectorAll?.('a[href]') || []) {
      const href = secureLink(link.getAttribute('href'));
      if (!href || seenLinks.has(href) || link.closest('[data-source]')) continue;
      seenLinks.add(href);
      const anchor = small(clean(link.closest('p,li,td,blockquote')?.textContent),120);
      const name = clean(link.textContent);
      const title = !name || /^https?:/i.test(name) ? new URL(href).hostname : small(name,100);
      append('web','source',extract(title,'正文外链',{
        claim:'当前正文保留了这个网页链接。', location:'报告正文 · '+new URL(href).hostname,
        links:[{label:'打开正文中的网页',href}], ...(anchor ? {anchor} : {}),
        boundary:'此处仅登记正文保存的公开链接，当前记录未提供检索过程或网页快照。'
      }),{excerpt:anchor || '正文保留了网页地址，可打开核对原文。'});
    }
    return Object.values(channels).filter(channel => ['knowledge','metric','web'].includes(channel.key) || channel.items.length);
  }

  function build(input={}) {
    const material = savedEntries(input.report || {},input.entries);
    const model = judgementTrace(input,material);
    model.channels = sourceChannels(model,input,material);
    return model;
  }
  window.GkxTraceModel=Object.freeze({build});
})();
