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
  function reportSources(entries,editor) {
    return entries.map((value,index)=>{
      const entry = typeof value === 'string' ? {title:value} : value || {};
      const title = clean(entry.title) || clean(entry.name) || '来源 '+(index+1);
      const keyed = entry.id ?? entry.sourceId;
      const anchor = (keyed != null && editorAnchor(editor,keyed)) || editorAnchor(editor,index+1);
      const statusText = clean(entry.access || entry.status).toLowerCase();
      const denied = entry.accessDenied === true || entry.hasPermission === false || entry.canRead === false || entry.status === 403 || ['403','forbidden','denied','无权限','权限不足','无权访问'].includes(statusText);
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
      demo:true, claim:counter.summary, location:'研判回放 · 反方校验',
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

  function build({report={},entries,editor,review}={}) {
    const material = Array.isArray(entries) ? entries : (Array.isArray(report.sources) ? report.sources.map(s => typeof s === 'string' ? report.sourceDetails?.find(detail=>detail?.title===s) || s : s) : []);
    const sources=reportSources(material,editor);
    const id=clean(report.sessionId) || clean(report.id);
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
  window.GkxTraceModel=Object.freeze({build});
})();
