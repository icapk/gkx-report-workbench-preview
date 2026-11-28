(function () {
  'use strict';

  const logistics = {
    title: '深圳低空物流示范场景研究',
    afterShort: '先做两类场景的对照验证',
    before: '首批试点宜优先选择能取得地面对照记录、有人负责收发交接、也能演练异常改派的场景。医疗急送重点核实紧急件能否按约定送达，园区配送重点核实不同订单量下能否持续履约。',
    after: '先检查试点单位能否提供原有配送记录、明确双方交接责任，并在停运时完成地面接续。通过这些检查的场景可以开展小范围对照验证，再依据医疗急送的按时签收表现、园区配送的连续履约表现决定是否扩大试点。',
    scenarios: [
      {label:'只有急件送达时长',
        counter:'假设只拿到已送达急件的用时，取消件和改派件去了哪里？',
        quality:'核对是否包含全部受理件，并查找同线路、同时段的地面配送记录。',
        ruling:'先补全订单与地面对照，两类场景的优先次序暂缓确定。'},
      {label:'急送补齐对照与接续记录',
        counter:'假设医疗急送补齐了材料，这些记录能说明园区高峰期也能持续履约吗？',
        quality:'复核同类急件的地面对照、约定时限内签收表现，以及停运后的交接记录。',
        ruling:'若急件记录符合约定且停运接续可行，可先安排该线路小范围试点，园区配送另做高峰期验证。'}
    ],
    stages: [{
      key: 'counter', label: '反方校验', role: '反方校验智能体',
      summary: '两个场景还没有对照记录，目前无法排出谁应优先。',
      detail: '医疗急送和园区配送都值得比较。若有人主张医疗急送优先，请先拿出同类急件的地面配送记录，并说明停运后由谁接手。',
      evidence: [
        {label:'本稿 · 落地方案末尾',quote:'本次会话还缺少两个场景的对照记录，试点优先次序需待验证。'},
        {label:'本稿 · 场景比较表／医疗急送',quote:'由收发两端约定模拟件的交接时限和签收要求，保留地面配送记录，并演练无法按时交接时的替代安排。'}
      ]
    }, {
      key:'round', label:'圆桌仲裁', role:'圆桌主持',
      summary:'先选能做对照验证的场景，取得可比记录后再排优先次序。',
      detail:'本轮处理的是能否先排顺序。医疗急送更看重急件交接，园区配送更看重连续履约；两类试点应分别约定通过条件，再交业务部门决定是否扩大。',
      evidence:[
        {label:'本稿 · 现状分析',quote:'两者可以共用从受理到签收的计时口径，但应分别评价时效与连续服务能力。'}
      ],
      voices:[
        {name:'执笔研究员',text:'主管部门要排示范次序，能否先选医疗急送？'},
        {name:'反方校验智能体',text:'急件要看能否按时交接，园区要看高峰期能否持续履约。现在还缺两边的对照记录。'},
        {name:'圆桌主持',text:'先选能做对照、能接续地面配送的场景。拿到实测记录，再提交优先次序建议。'}
      ]
    }, {
      key:'quality', label:'质量审查', role:'质量审查智能体',
      summary:'核心结论保留了地面对照、交接责任和停运接续三项条件。',
      detail:'从摘要回读核心结论，并逐项对照场景比较表。报告已写清医疗急送观察签收用时、园区观察积压与单均成本；本次材料仍不能给出哪个场景表现更好。',
      evidence:[
        {label:'本稿 · 核心结论',quote:'先检查试点单位能否提供原有配送记录、明确双方交接责任，并在停运时完成地面接续。'},
        {label:'本稿 · 场景比较表／园区配送',quote:'按订单时段比较准时签收比例、积压件数和每个完成订单的配送成本。'}
      ]
    }]
  };
  const embodied = {
    title:'具身智能产业发展趋势研判',
    afterShort:'先复测，再判断部署价值',
    before:'研判具身智能的发展，应区分模型能力变化与整机在真实任务中的表现。演示场景达成目标，与系统在开放环境中稳定工作，是两种不同的验证条件。',
    after:'优先跟踪可重复验证的任务结果与实际应用约束，再判断技术进步能否转化为部署价值。',
    scenarios:[
      {label:'只有一段演示视频',
        counter:'假设只看到一次成功抓取，失败重试或人工接管是否被剪掉了？',
        quality:'核对视频是否连续、操作环境和人工介入说明是否齐全，并查找重复测试记录。',
        ruling:'仅记录设备在该演示条件下完成过任务，现场试用决定留待复测。'},
      {label:'补齐同任务多轮复测',
        counter:'假设同一任务多轮成功，这些测试覆盖了拟试用工位的干扰和异常吗？',
        quality:'逐次对照测试与目标工位条件，核对成功、失败、人工介入和异常恢复记录。',
        ruling:'若重复表现与异常恢复满足该工位要求，可安排限定工位试用；其他工位另行验证。'}
    ],
    stages:[{
      key:'counter', label:'反方校验', role:'反方校验智能体',
      summary:'单次任务演示不足以证明设备在开放环境中能持续工作。',
      detail:'如果把“演示成功”写成“可部署”，需要说明成功条件、测试环境和人工介入情况。报告提出了这几项核验要求，当前会话没有附上实际测试记录。',
      evidence:[
        {label:'本稿 · 摘要',quote:'演示场景达成目标，与系统在开放环境中稳定工作，是两种不同的验证条件。'},
        {label:'本稿 · 信号与证据',quote:'本次会话尚未附可核验的资料，涉及规模、排名或因果关系的判断均需补证。'}
      ]
    }, {
      key:'round', label:'圆桌仲裁', role:'圆桌主持',
      summary:'先核对同一任务的重复表现，把部署判断留到取得记录以后。',
      detail:'双方的分歧在于演示结果能支持多强的结论。先固定操作任务，记录何时介入、出了异常能否恢复。试用方取得这些记录后，再判断是否适合自己的作业环境。',
      evidence:[
        {label:'本稿 · 信号与证据',quote:'可选取同一操作任务，对照感知、规划、执行和异常恢复四个环节，记录任务成功条件、人工介入方式及采样环境。'}
      ],
      voices:[
        {name:'执笔研究员',text:'一次演示能说明设备在那组条件下完成了任务。能否据此判断部署价值？'},
        {name:'反方校验智能体',text:'要先知道操作是否可重复、出了异常由谁恢复，以及跟实际应用环境差多少。'},
        {name:'圆桌主持',text:'保留这条技术观察，把部署判断列为待复测事项；后续用同一任务的记录回来复核。'}
      ]
    }, {
      key:'quality', label:'质量审查', role:'质量审查智能体',
      summary:'报告区分了演示现象与部署判断，并明确了下一步取证方法。',
      detail:'核心结论要求观察可重复的任务结果，证据章节列了复测环节。读者可以据此准备试验；当前报告没有给出已达到的成功率或部署效果。',
      evidence:[
        {label:'本稿 · 核心结论',quote:'优先跟踪可重复验证的任务结果与实际应用约束，再判断技术进步能否转化为部署价值。'},
        {label:'本稿 · 信号与证据',quote:'对照感知、规划、执行和异常恢复四个环节，记录任务成功条件、人工介入方式及采样环境。'}
      ]
    }]
  };

  // Each worksheet is fictional. Only excerpts copied from the open document receive a locator.
  const worksheets = {
    logistics: {
      focus:'医疗急送的按时签收表现', sample:'A线有4笔到期模拟单，2笔准时、1笔超时、1笔未签收。',
      initial:'已签收的3单里有2单准时，能否据此优先安排医疗急送？',
      challenge:'只看已签收订单，会把到期仍未签收的1单排除。',
      calculation:'2 ÷ 4 = 50%。若只计已签收单，2 ÷ 3 约为66.7%。',
      limit:'这4单来自同一条模拟急送线路，园区线路和地面配送还没有同口径对照。',
      rule:'把观察期内已到期的全部受理件计入分母，另列超时和未签收件。',
      decision:'先验证急送线路的记录和交接能力，园区配送另取同口径样本，两者暂缓排序。',
      source:'同线路、同时段的地面配送记录，以及园区的全量受理与签收清单',
      sufficient:'补齐两个场景的全量受理件，再按各自约定时限复算，分别决定是否试点。',
      result:'保留两类场景的对照验证', check:'签收表现仅描述样表，正文保留地面对照、交接责任和停运接续三个试点条件。'
    },
    embodied: {
      focus:'机器人在目标工位能否独立完成任务', sample:'同一抓取任务模拟10轮，6轮独立完成，2轮人工接管后完成，2轮失败。',
      initial:'10轮里有8轮最终完成，能否称为80%的自主完成率？',
      challenge:'人工接管的2轮可计入最终完成，不能同时计作自主成功。',
      calculation:'自主完成 6/10 = 60%，含接管的最终完成 8/10 = 80%。',
      limit:'模拟试次只覆盖固定工位。其他工位的干扰和异常恢复尚需复测。',
      rule:'每次启动计一轮，分别记录自主完成、人工协助和失败。',
      decision:'先复测同一工位并完整记录介入，再讨论是否扩大试用。',
      source:'连续多轮的现场试验日志、人工介入时点和异常恢复记录',
      sufficient:'若目标工位的独立复测满足约定条件，可安排限定工位试用，再单独验证其他工位。',
      result:'先复测目标工位',check:'把演示条件、独立完成与人工介入写开，实际成功率由现场日志另行计算。'
    },
    chain: {
      focus:'哪项低空运行能力值得共建', sample:'4条模拟任务链覆盖医疗急送、园区配送、巡检、应急。前3条需共享调度，2条需专用起降点。',
      initial:'两项设施都有人提出，是否应当同步上马？',
      challenge:'需求条目出现多次，不能直接当作多个场景都有共同需求。',
      calculation:'按任务链去重，共享调度覆盖3/4条，专用起降点覆盖2/4条；两项可以重叠。',
      limit:'覆盖条数只反映共用可能，未给出利用频次、建设成本和付费主体。',
      rule:'按独立任务链计数，同一条链重复提出的需求合并一次。',
      decision:'共享调度进入共建论证，专用起降点先按场景核对需求。',
      source:'各场景运行频次、服务对象、拟付费方及现有调度设施复用清单',
      sufficient:'如多个场景有稳定使用频次且明确运营方，再评估共建规模和投入。',
      result:'先核实跨场景共用需求',check:'将共用覆盖、运行频次和建设价值分别表述，保留立项所需条件。'
    },
    regional: {
      focus:'两地低空产业的实际运营差异', sample:'样表中甲地登记6家，4家附当季运营记录；乙地登记5家，5家附当季运营记录。',
      initial:'只看登记数，甲地6家多于乙地5家，能否直接排在前面？',
      challenge:'登记主体和当季有运营记录的主体回答的是两个问题。',
      calculation:'按有运营记录的主体计，甲地4家、乙地5家；登记数则为6家、5家。',
      limit:'样表没有覆盖全部企业，跨城运营主体也可能被重复计入。',
      rule:'使用同一季度和地域边界，登记主体与有运营记录主体分栏。',
      decision:'并列展示登记和运营两个指标，完成跨城去重后再讨论区域排序。',
      source:'两地同季度航线运营清单、主体识别码及跨城归属说明',
      sufficient:'若记录覆盖与去重规则一致，可以比较运营活跃度，综合竞争力仍需补充其他维度。',
      result:'先统一区域比较口径',check:'为每项城市数据标明地域与季度，局部指标的名次只用于对应比较。'
    },
    companies: {
      focus:'候选企业能否进入重点服务清单', sample:'6家模拟候选里，3家附验收或履约记录，2家仅有宣传材料，1家为同一企业的重复申报。',
      initial:'收到6份申报，是否都可计入重点企业？',
      challenge:'重复申报和宣传材料会同时抬高企业数量与入选把握。',
      calculation:'去重后5家，其中3家有履约记录，3/5具备进入复筛的材料条件。',
      limit:'进入复筛只说明材料可查，实际服务范围与业务连续性还要向项目方核实。',
      rule:'按企业主体识别码去重，运营方与设备供应商分类比较。',
      decision:'先将3家列入履约复筛，其余2家保留观察，等待项目方核实。',
      source:'项目验收记录、交付主体、合同服务范围及复购或持续运营证明',
      sufficient:'如项目方能核实服务持续性和实际交付范围，再决定重点名单。',
      result:'用履约记录筛出复核对象',check:'把候选、复筛、正式入选分开表述，避免把申报数量写成重点企业数量。'
    },
    priorities: {
      focus:'近期试点与中长期储备如何定序', sample:'两项模拟方向按5分制评分。甲的成熟度4、需求2；乙的成熟度2、需求5。',
      initial:'技术成熟度占七成时甲排第一，可以直接认定甲优先吗？',
      challenge:'当决策目标转向落地需求，两项方向的名次会互换。',
      calculation:'成熟度/需求权重70/30时，甲3.4、乙2.9；改为40/60时，甲2.8、乙3.8。',
      limit:'首组权重下甲领先，需求权重提高后乙领先，排序依赖决策目标。',
      rule:'使用同一5分制，先公开权重，再对各指标加权求和。',
      decision:'在需求优先的试点清单先验证乙，技术储备清单保留甲。',
      source:'目标用户需求、技术复现记录，以及本轮试点对需求和成熟度的正式权重',
      sufficient:'如试点目标确定且需求可核，沿该权重复算；若目标改变，保留两套排序。',
      result:'按试点目标分别排序',check:'并列列出两套权重和对应名次，写出权重变化会改变推荐次序。'
    },
    library: {
      focus:'公共图书馆夜间延时是否值得推广', sample:'两处馆点各观察4个模拟晚场。甲累计入馆80人次，核实完成借阅24人次；乙入馆60人次，完成借阅30人次。',
      initial:'甲馆夜间客流更高，是否应先把甲馆的延时安排推广？',
      challenge:'入馆人次和完成借阅人次衡量的服务效果不同。',
      calculation:'甲馆每百入馆人次完成借阅30人次，乙馆为50人次。',
      limit:'样表只有4个晚场，周末构成、座席使用和增开人力尚未对齐。',
      rule:'同类日期、同一时段比较，客流和借阅分栏，阅读自习需求另行记录。',
      decision:'两馆各保留小规模延时试点，补记自习使用和人力，再选推广方式。',
      source:'同类日期的分时客流、借阅、座席使用与延时排班记录',
      sufficient:'若多周数据呈现稳定需求且人力可持续，再提出排班和推广范围。',
      result:'同时观察借阅和在馆使用',check:'将“人多”拆成服务利用与新增成本，限定建议适用的馆点和时段。'
    },
    general: {
      focus:'当前核心建议的适用范围', sample:'演示复核表取4条独立观察，2条支持原建议，1条出现相反结果，1条缺少关键记录。',
      initial:'只展示两条正向观察，能否据此给出普遍适用的建议？',
      challenge:'反例与缺项都会改变结论可以覆盖的范围。',
      calculation:'4条观察中2条支持、1条相反、1条待核，支持项占全部记录的2/4。',
      limit:'四条为构造的演示样本。冲突记录的条件还要与正向记录逐项对照。',
      rule:'先按独立对象去重，再统一观察时段和判定标准，并列保存反例和缺项。',
      decision:'先在正向记录对应的条件下小范围验证，同时复查反例。',
      source:'同一观察窗口的原始记录、反例发生条件与缺失项的补录材料',
      sufficient:'若补录后仍能复现结论，扩大到相同条件；条件不同的对象单列复核。',
      result:'先验证建议成立的条件',check:'正文写明可用场景、需要补证的例外和重新评估的触发条件。'
    }
  };

  const routes = [
    [/物流|医疗急送|园区配送/, 'logistics'], [/具身|机器人/, 'embodied'], [/产业链|供应链/, 'chain'],
    [/区域竞争|城市竞争|区域比较/, 'regional'], [/企业筛选|企业遴选|重点企业/, 'companies'],
    [/优先级|方向排序|产业方向/, 'priorities'], [/图书馆|借阅|馆藏/, 'library']
  ];
  const curated = new Map([['sample-low-altitude-logistics', logistics], ['1:153', embodied]]);
  const textOf = value => typeof value === 'string' ? value.trim() : '';
  const compact = value => textOf(value).replace(/[\s\u200b\uFEFF]/g, '');

  function currentPassages(context, body, title) {
    let blocks = context.blocks;
    if (!Array.isArray(blocks) && context.editor) {
      blocks = [];
      let heading = '';
      for (const el of context.editor.querySelectorAll('h1,h2,h3,p,blockquote,li,td')) {
        if (/^H[123]$/.test(el.tagName)) heading = textOf(el.textContent);
        else blocks.push({heading,text:el.textContent});
      }
    }
    if (!blocks?.length && body && body !== title) blocks = [{heading:'工作稿',text:body}];
    const passages = [];
    for (const block of blocks || []) {
      const value = textOf(block?.text), heading = textOf(block?.heading);
      if (!value || value===title || value===heading || /^(研究目标|研究范围|目标读者|研究主题)[：:]/.test(value)) continue;
      const first = value.match(/^[^。！？\n]{1,128}[。！？]/)?.[0] || value.slice(0,120);
      const quote = first.trim();
      if (quote && body.includes(quote) && !passages.some(item=>item.quote===quote)) {
        passages.push({label:heading ? '本稿 · '+heading : '本稿原句',quote,heading});
      }
    }
    return passages;
  }

  function stageData(sheet) {
    const row = (label, value) => ({label,value});
    return {
      counter:[row('样本记录',sheet.sample),row('反方复算',sheet.calculation)],
      round:[row('争议点',sheet.initial),row('裁定条件',sheet.rule),row('本轮裁定',sheet.decision)],
      quality:[row('核对结果',sheet.calculation),row('保留条件',sheet.limit)],
      checks:[
        {label:'样本口径',result:sheet.rule},
        {label:'建议适用范围',result:sheet.check},
        {label:'后续取证',result:'补齐'+sheet.source+'。'}
      ]
    };
  }

  function replayMock(id, title, sheet, passages) {
    const records = stageData(sheet);
    const main = passages.find(item=>/核心结论|建议|判断|结语/.test(item.heading)) || passages[0];
    const support = passages.find(item=>item!==main && /现状|数据|材料|信号|证据|比较/.test(item.heading)) ||
      passages.find(item=>item!==main) || main;
    function evidence(passage, label, note) {
      return [...(passage ? [{label:passage.label,quote:passage.quote}] : []),{label,note}];
    }
    return {
      id,title,kind:'mock',demo:true,afterShort:sheet.result,
      before:main?.quote || sheet.initial, beforeLabel:main ? '本稿原句' : '模拟待审建议',
      after:sheet.decision+' '+sheet.check, afterLabel:'模拟修订建议',
      scenarios:[
        {label:'仅有初始样本', counter:sheet.challenge, quality:sheet.calculation, ruling:sheet.decision},
        {label:'补齐对照材料',counter:'补充材料是否覆盖原先的例外情况？',quality:'逐项核对'+sheet.source+'。',ruling:sheet.sufficient}
      ],
      stages:[
        {key:'counter',label:'反方校验',role:'反方校验智能体',summary:sheet.challenge,
          detail:'这次为《'+title+'》模拟审阅“'+sheet.focus+'”。'+sheet.limit,
          records:records.counter,evidence:evidence(main,'模拟复核表',sheet.sample)},
        {key:'round',label:'圆桌仲裁',role:'圆桌主持',summary:sheet.decision,detail:sheet.limit,
          records:records.round,voices:[
            {name:'执笔研究员',text:sheet.initial},{name:'反方校验智能体',text:sheet.challenge+' '+sheet.calculation},
            {name:'质量审查智能体',text:sheet.rule},{name:'圆桌主持',text:sheet.decision}
          ],evidence:evidence(support,'模拟裁定依据',sheet.rule)},
        {key:'quality',label:'质量审查',role:'质量审查智能体',summary:sheet.check,
          detail:'将本稿的当前表述与模拟修订建议并排核对。以下数值均来自演示样表。',
          records:records.quality,checks:records.checks,evidence:evidence(main,'模拟复核结果',sheet.calculation)}
      ]
    };
  }

  function forReport(context = {}) {
    const id = textOf(context.id), title = textOf(context.title) || '当前报告', body = textOf(context.text);
    const original = curated.get(id);
    if (!context.modified && original && (title===original.title || title===original.title+'（示例）')) {
      const anchors=['摘要'+original.before,'核心结论'+original.after];
      const normal = compact(body);
      if (anchors.every(anchor=>normal.includes(compact(anchor))) &&
          original.stages.every(stage=>stage.evidence.every(ref=>body.includes(ref.quote)))) {
        const worksheet = original===logistics ? worksheets.logistics : worksheets.embodied;
        const recordSet = stageData(worksheet);
        const model = structuredClone(original);
        for (const stage of model.stages) stage.records = recordSet[stage.key];
        model.stages[2].checks=recordSet.checks;
        return {...model,id,kind:'curated',demo:true};
      }
    }
    const key = routes.find(([match])=>match.test(title))?.[1] || 'general';
    return replayMock(id,title,worksheets[key],currentPassages(context,body,title));
  }
  window.GkxJudgementCases = Object.freeze({forReport});
})();
