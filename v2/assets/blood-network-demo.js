/* Public records for the 2024 retrospective; the commission and review are a scripted demo. */
(() => {
  'use strict';
  const title = '深圳无人机送血扩围评估';
  const prompt = '深圳无人机送血，下一步应全面扩围，还是先做对照试点？请以2024年为基线，结合全市运行数据和南山首飞记录，核查节时依据，比较全面扩围、有限试点和暂缓三种方案，给出建议与复核条件。';
  const sources = [
    {
      id: 'network-2024', title: '深圳举办全市血液供应保障应急演练', agency: '深圳市卫生健康委员会', date: '2025-01-20',
      url: 'https://wjw.sz.gov.cn/gzdt/content/post_11968707.html',
      detail: '文末年度统计：截至2024年底共开通16条无人机血液运输航线，全年7,070架次、运输血液净重4,412公斤。2025年1月的演练另行记载。',
    },
    {
      id: 'nanshan-flight', title: '只需15分钟！市血液中心开通南山区空中血液运输“生命航线”', agency: '深圳市血液中心', date: '2024-02-29',
      url: 'https://wjw.sz.gov.cn/szsxyzx/xxgk/xwdt/content/post_11167375.html',
      detail: '2024年2月23日南山医院航线首飞，报道记录空中送血用时15分钟，以原地面运输往返90分钟作比较。未给出同一批次地面单程签收用时。',
    },
  ];
  const anchors = {
    scale: '2024年，深圳有16条无人机血液运输航线，全年飞行7,070架次，运输血液净重4,412公斤。',
    timing: '南山航线首飞用时15分钟，报道给出的90分钟是原地面往返用时。',
    decision: '先做同线路空地对照试点，保留地面接续，待签收时效、成本和异常记录齐备后再决定扩围。',
    audit: '7,070 ÷ 366 ≈ 19.3架次/日，仅用于描述2024年全市运行规模。',
  };
  const fields = [
    { id: 'F01', name: '研究主题', value: title },
    { id: 'F02', name: '研究目标', value: '评估已有证据能支持全面扩围、有限试点或暂缓中的哪一种决策，列明改变判断所需的证据' },
    { id: 'F03', name: '研究范围', value: '深圳市；以2024年全年运行统计和2024年2月南山首飞为基线，包括2025年1月发布的年度回顾' },
    { id: 'F04', name: '目标读者与决策场景', value: '城市公共服务试点评审人员；模拟讨论追加验证或扩大覆盖的条件' },
  ];
  const outline = [
    { id: 'blood-baseline', title: '运行基线与扩围选项', body: '核对年度运行实绩，说明这次评审要决定什么。', children: [
      {id:'blood-network', title:'现有航线、架次与运输净重', body:'回查全市年度统计，区分年末航线数与全年运输量。'},
      {id:'blood-options', title:'全面扩围、有限试点与暂缓', body:'分别列出三个方案所需的证据。'},
    ]},
    { id: 'blood-comparison', title: '首飞时效与空地对照', body: '追溯15分钟和90分钟各自记录了哪一段运输。', children: [
      {id:'blood-clock', title:'南山首飞与地面往返的计时范围', body:'核对记录的起讫点、方向和样本次数。'},
      {id:'blood-counter', title:'对抗审查：全市节时能否成立', body:'检验从一条航线的首飞外推全市平均表现的依据。'},
    ]},
    { id: 'blood-ruling', title: '试点方案与圆桌裁决', body: '记录支持方与反方的证据，说明采纳了什么以及理由。', children: [
      {id:'blood-hearing', title:'三种方案的取舍', body:'对照运行基础、服务收益和缺失材料，形成有边界的建议。'},
      {id:'blood-design', title:'同线路、同时段的对照安排', body:'登记从受理到签收的两组记录，以及改派、取消和地面接续。'},
    ]},
    { id: 'blood-audit', title: '质量复核与扩围条件', body: '逐项复核年份、分母、单位、出处和待验证的判断。', children: [
      {id:'blood-recalc', title:'年度日均架次复算', body:'按2024年366个日历日复算，说明指标可以回答的问题。'},
      {id:'blood-release', title:'定稿修改与再次评审条件', body:'列明可写入终稿的事实，以及下一轮评审需要的台账。'},
    ]},
  ];
  window.bloodNetworkDemo = {
    id: 'sz-blood-network-2024', title, prompt, sources, anchors, fields, outline,
    isPrompt(value) { return typeof value === 'string' && value.trim() === prompt; },
  };
})();
