/* Verified public records and a fictional municipal decision exercise. */
(() => {
  'use strict';
  const id = 'sz-city-logistics-policy';
  const title = '深圳市低空物流发展现状与下一阶段支持重点研究';
  const prompt = '请围绕深圳低空物流发展情况，起草一份供市政府专题会议参阅的决策咨询报告。请结合公开政策和运行数据，比较医疗应急配送、城市即时配送、城际货运三类场景，分析哪些值得优先支持、哪些还需验证，提出下一年度的重点任务和成效评价指标。请在首页用一页摘要写清主要判断、依据和提请会议研究的事项。';
  const sources = [
    {id:'city-network',title:'关于深圳市2025年国民经济和社会发展计划执行情况与2026年计划草案的报告',agency:'深圳市发展和改革委员会 · 深圳市政府公报',date:'2026-04-13',url:'https://www.sz.gov.cn/zfgb/2026/gb1409/content/post_12737870.html',detail:'2025年执行情况：深圳当年新开低空物流航线82条，累计310条；累计建成的1,284个起降点包含各类低空用途。数据反映网络覆盖，未提供分场景收益或线路常态运营率。'},
    {id:'annual-flights',title:'2024年深圳低空经济大事',agency:'深圳市交通运输局网站',date:'2025-01-17',url:'https://jtys.sz.gov.cn/zwgk/jtzx/gzdt/content/post_11965749.html',detail:'年度盘点记述2024年深圳无人机载货飞行约77.6万架次。飞行量反映全市运输活动；未列出每种场景的完成订单、成本或财政收益。'},
    {id:'network-2024',title:'深圳举办全市血液供应保障应急演练',agency:'深圳市卫生健康委员会',date:'2025-01-20',url:'https://wjw.sz.gov.cn/gzdt/content/post_11968707.html',detail:'报道文末回顾2024年：深圳年底已开通16条送血航线，全年累计飞行7,070架次。2025年1月的演练与该年度统计分别记载。'},
    {id:'nanshan-flight',title:'只需15分钟！市血液中心开通南山区空中血液运输“生命航线”',agency:'深圳市血液中心',date:'2024-02-29',url:'https://wjw.sz.gov.cn/szsxyzx/xxgk/xwdt/content/post_11167375.html',detail:'市血液中心至南山医院首飞耗时15分钟；报道用原地面往返90分钟作比较。两个数字涉及不同路程，未提供多家医院的受理至签收分布。'},
    {id:'district-routes',title:'深圳龙华机场，来了！',agency:'深圳市龙华区政府网站',date:'2026-09-15',url:'https://www.szlhq.gov.cn/lhqrmzfbgswzlhzfzxgkml/lhqrmzfbgswzlhzfzxgkml/qt/gzdt/content/post_12982058.html',detail:'区内实践部分记述，美团无人机2026年1—8月在龙华完成约22万架次；另有和记内陆仓储至东莞塘厦的跨城航线。前者是单区单运营方的数据，后者是具体开航案例。'},
    {id:'support-rules',title:'《深圳市支持低空经济高质量发展的若干措施》交通运输实施细则',agency:'深圳市交通运输局',date:'2025-09-30',url:'https://jtys.sz.gov.cn/gkmlpt/content/12/12419/post_12419789.html',detail:'深交规〔2025〕10号第五条区分新开航线与企业飞行量奖励，并规定市内两端起降和仅单端在深圳的资助架次计数方式。该规则用于项目资助核算。'}
  ];
  const anchors = {
    scale:'2025年深圳新开低空物流航线82条，累计开通310条。',
    scope:'飞行架次衡量运行规模；三类场景分别按应急保障、订单履约和货源稳定性评价。',
    medical:'优先保障医疗应急配送的地面接续和收发协同，新增航线先做同线路空地签收对照。',
    instant:'城市即时配送有条件支持存量线路提效，以高峰履约和单均成本决定是否复制。',
    branch:'城际货运先验证固定货源和双向装载，有连续运营记录后再论证新增节点。'
  };
  const discussions = {
    medical:{
      id:'medical',label:'医疗应急配送',proposal:'用南山首飞经验支持医疗航线全市扩围。',before:'南山首飞表明全市医疗配送均可节时约八成，应立即扩围。',
      author:'深圳已形成送血网络，南山医院首飞15分钟，为候选医院开展接续检验提供了实际线路。',
      counter:'原地面90分钟是往返，首飞15分钟只记录该次空中送血。全市年度架次也没有逐线准时签收明细。如何证明换一家医院仍能节约相同比例？',
      authorReply:'接受比较口径质疑。可先保障已有服务，新增点位须匹配同起讫、同时段的地面签收样本。',
      ruling:'采纳保障能力建设，有条件验证新增线路。单次首飞从全市节时推论降为路线案例。',
      instruction:'保留首飞的计时范围，删除普遍节时率，补入地面接续负责人和同程签收样本。',
      quality:'已将全市运行记录与南山首飞分列，并保留不同计时方向及样本限制。',
      qaFailure:'圆桌后第一版重写稿已限缩正文，摘要仍写“医疗配送普遍节时约八成”，与正文口径不一致。',
      qaFix:'同步修订摘要，删除“普遍节时约八成”。正文只保留南山首飞与地面往返的计时范围，新增线路先收集同程对照。',
      decision:'有条件采纳',quote:anchors.medical,sourceIds:['network-2024','nanshan-flight'],
      citations:{author:['network-2024','nanshan-flight'],counter:['nanshan-flight','network-2024'],ruling:['network-2024','nanshan-flight']},
      owner:'建议卫健部门协调血液中心与收发医院。',action:'先梳理急送需求和停航替代线路，再选择能取得地面对照的医院。',gate:'按约签收率、受理至签收时长、异常及改派交接记录。接续演练未通过，暂缓新增。'
    },
    instant:{
      id:'instant',label:'城市即时配送',proposal:'按飞行架次给三类场景统一排序，优先扩展高频商圈。',before:'按飞行架次给三类场景统一排序，优先新增高频商圈航点。',
      author:'龙华的运营记录说明即时配送确有高频使用场景，现有物流资助细则也使用架次核算部分奖励。',
      counter:'一家企业在一个区的架次含义，与送血的应急保障、跨城货运的实际载荷不同。若纳入取消、地面改派和补贴，普通订单是否仍更划算？',
      authorReply:'保留对高频线路的研究，将架次仅作规模描述，改查同区域订单履约和成本。',
      ruling:'撤回跨场景架次排名。对已有真实订单的商圈有条件支持提效，新增布点须另行验证。',
      instruction:'把三场景统一排名改为分类评价；在即时配送项写明履约分母、改派和单均成本。',
      quality:'区级企业数据已限定地点和期间；飞行计数与订单、财政绩效分开呈现。',
      qaFailure:'第一版重写稿已撤回跨场景排名，但行动表中的“按时签收率”遗漏分母，无法判断取消改派是否被排除。',
      qaFix:'在行动表补入“全部受理订单”分母，逐项保留取消、改派和单均成本；区级运营记录维持原范围。',
      decision:'有条件采纳',quote:anchors.instant,sourceIds:['district-routes','support-rules'],
      citations:{author:['district-routes','support-rules'],counter:['district-routes','support-rules'],ruling:['district-routes','support-rules']},
      owner:'建议交通部门会同试点区和平台。',action:'先复核既有商圈的真实订单和地面对照，再决定是否向相似商圈复制。',gate:'分高峰和平峰核对按时签收订单占全部受理订单的比例、取消改派数和每个完成订单的总成本。'
    },
    branch:{
      id:'branch',label:'城际货运',proposal:'沿已开通跨城航线复制布局，增设转运节点。',before:'跨城航线已经开通，可同步建设更多转运节点。',
      author:'龙华与东莞塘厦已有跨城通道，值得沿既有线路核实企业间定时发运的需求。',
      counter:'开航只说明通道曾经打通。哪类货物稳定发运？返程是否有货？现有资料没有逐班载重和连续运营成本。',
      authorReply:'将节点投资改为候选事项，先让货主、承运人和对端节点交叉核对实际运单。',
      ruling:'暂缓新增固定节点，先验证候选走廊；具备连续货量和双向接续证据后再评估扩线。',
      instruction:'把新建节点改为后续决策，先列固定货主、去回程载重、连续班次和成本。',
      quality:'已区分既有线路、拟议验证与后续投资；不把开航案例写成商业可持续的证明。',
      qaFailure:'第一版重写稿已要求固定货源，行动表却将“计划班次”当作“实际执飞”，无法验收连续运营。',
      qaFix:'按计划班次与实际执飞分别登记，同时核验去回程载重和每公斤履约成本，再提交新增节点复评。',
      decision:'暂缓新增节点',quote:anchors.branch,sourceIds:['district-routes','city-network'],
      citations:{author:['district-routes'],counter:['district-routes','city-network'],ruling:['district-routes']},
      owner:'建议交通部门牵头协调两地主管单位、货主和承运人。',action:'先在已有跨城通道采集逐班运单、双向货量和地面替代时效。',gate:'核查去回程载重、实际执飞与计划班次、每公斤履约成本。缺少连续货源时保持观察。'
    }
  };
  const fields=[
    {id:'F01',name:'研究主题',value:title},
    {id:'F02',name:'研究目标',value:'确定三类场景下一年度的支持方式、实施次序和复核条件。'},
    {id:'F03',name:'研究范围',value:'深圳全市，结合2024—2025年实绩与2026年区级运营记录，拟议2027年度行动。'},
    {id:'F04',name:'目标读者与决策场景',value:'市级产业发展、交通、卫生健康及财政相关部门的模拟年度项目评审。'}
  ];
  const outline=[
    {id:'city-summary',skillId:'writer',title:'决策摘要',body:'用一页概括主要判断、公开依据和提请会议研究的事项。',children:[]},
    {id:'city-baseline',skillId:'evidence',title:'全市运行基础与数据边界',body:'核对全市实绩、资助规则和区级案例，界定不同指标的适用范围。',children:[
      {id:'city-network-base',title:'全市网络与运行规模',body:anchors.scale+'2024年全市无人机载货飞行约77.6万架次。新开与累计航线、年度飞行架次是三种指标，不能相加或作为订单量。'},
      {id:'city-measures',title:'资助架次与服务成效',body:'2025年公布的实施细则以航线和企业架次核算部分奖励。评价下一年度项目，还需把应急服务保障、商业订单和跨城载荷分别纳入复核。'}]},
    {id:'city-scenarios',skillId:'deep-research',title:'三类场景的证据与缺口',body:'分别说明医疗、即时配送和城际货运已经有哪些记录，以及还缺哪些运营证据。',children:[
      {id:'city-medical',title:'医疗应急配送',body:'2024年底全市有16条无人机送血航线，全年飞行7,070架次。南山一条航线首飞15分钟，报道比较对象是地面往返90分钟。公共价值需要看急件按约签收和停航后的接续。'},
      {id:'city-instant',title:'城市即时配送',body:'龙华区披露，美团无人机2026年1—8月在当地飞行约22万架次。单区单运营方的阶段数据足以筛选调查线路，整座城市的订单、成本和复购仍需以相应台账核查。'},
      {id:'city-branch',title:'城际货运',body:'龙华区已打通和记内陆仓储至东莞塘厦的跨城航线。下一步可在这类走廊核对货主固定需求、返程货量、地面转运及端到端履约成本。'}]},
    {id:'city-support',skillId:'argument',title:'下一阶段支持重点',body:'分别确定优先保障、有条件支持和先行验证三种安排。',children:[]},
    {id:'city-actions',skillId:'writer',title:'2027年度行动与复核安排',body:'按场景明确拟牵头方、首项行动、验收数据和调整条件。',children:[]}
  ];
  const researchStages=[
    {id:'draft',title:'初稿',plan:'根据委托拆解城市网络、项目价值与资金使用问题。',result:'已形成三项有待质询的初稿主张。',detail:'用市级实绩说明覆盖规模，再检索场景与政策原文。初稿中的跨场景排名和首飞外推列入审查。',inputs:['核对市级年度计划执行报告、卫生健康机构记录、龙华区运营案例和物流资助细则。','按全市、区级运营方、单线首飞分别归档。'],outputs:Object.values(discussions).map(d=>d.before)},
    {id:'counter',title:'反方对话',plan:'分别追问三项主张的样本、分母与适用范围。',result:'三项关键质疑已记录，作者逐项回应。',detail:'核查单线节时外推、统一按架次排位和开航即有货源三个推论。',inputs:['首飞与地面往返能否比较？','架次能否用于三类场景排序？','开航能否说明货源稳定？'],outputs:Object.values(discussions).map(d=>d.counter)},
    {id:'round',title:'圆桌裁决',plan:'围绕每个争议决定保留、改写或暂缓。',result:'分别形成医疗保障、存量提效和城际先验证的裁决。',detail:'区分原文可证明的事实、仍需调查的假设与拟议政策。',inputs:['听取执笔依据及反方回应。','按三场景形成可执行的改写指令。'],outputs:Object.values(discussions).map(d=>d.ruling)},
    {id:'rewrite',title:'按裁决重写',plan:'逐条将裁决落实到报告建议和行动条件。',result:'已形成第一版重写稿，三处残留表述送写后复核。',detail:'逐项对照初稿与修订后的报告原句。',inputs:Object.values(discussions).map(d=>d.instruction),outputs:['正文将医疗扩围改为同程试点，摘要中的统一节时说法待复核。','商圈行动表已转向履约与成本，按时签收率的分母待核。','城际项目改为货源验证，行动表的计划和实飞班次待分列。']},
    {id:'quality',title:'写后质量审查',plan:'检查来源、统计边界及裁决是否落实。',result:'发现并修正摘要残留节时率、签收率缺少分母和班次口径混用。',detail:'复核官方出处、年份、计数单位和每条建议的验收方法。',inputs:['核对首飞的计时范围。','分开架次、订单、载荷与公共价值。','确认每条建议能追溯到依据。'],outputs:Object.values(discussions).map(d=>d.qaFix)},
    {id:'final',title:'定稿',plan:'汇总决策摘要、行动安排和官方资料。',result:'形成供年度项目评审讨论的分场景支持建议。',detail:'报告保留来源与待补证据，可导出后继续审阅。',inputs:['对照已确认大纲，逐项检查建议、拟牵头方和验收数据。'],outputs:Object.values(discussions).map(d=>d.quote)}
  ];
  const checks = Object.values(discussions).map(d=>({id:d.id,label:d.label,failure:d.qaFailure,fix:d.qaFix,quote:d.quote,sourceIds:d.sourceIds}));
  window.cityLogisticsDemo={id,title,prompt,sources,anchors,fields,outline,discussions,checks,researchStages,
    isPrompt(value){return typeof value === 'string' && value.trim() === prompt;}};
})();
