(() => {
  'use strict';
  const catalog = [
    {icon:"./icons/skills/strategy.svg", id:"strategy", name:"战略选项比较", legacyName:"战略分析", description:"把模糊方向问题转化为可比较的战略选项，呈现评价维度、推荐理由、替代方案与实施条件", scope:"EOS 技能", category:"战略分析", updated:"2026-10-28", usage:6800, creator:"EOS Skill · 战略选项与路径比选", tags:["赛道选择", "多方案比较"]},
    {icon:"./icons/skills/industry.svg", id:"industry", name:"产业链与七链分析", legacyName:"产业研究", description:"梳理产业链结构、关键环节与竞争格局，识别产业发展阶段、增长机会与布局重点", scope:"EOS 技能", category:"产业研究", updated:"2026-10-26", usage:5400, creator:"EOS Skill · 产业研究与七链分析", tags:["产业链分析", "七链结论"]},
    {icon:"./icons/skills/technology.svg", id:"technology", name:"技术路线识别", legacyName:"技术研判", description:"围绕技术路线、成熟度与应用场景展开研判，梳理发展趋势、关键瓶颈与落地条件", scope:"EOS 技能", category:"技术研判", updated:"2026-10-22", usage:2700, creator:"EOS Skill · 技术路线与成熟度分析", tags:["技术路线", "成熟度"]},
    {icon:"./icons/skills/policy.svg", id:"policy", name:"政策匹配与比对", legacyName:"政策分析", description:"梳理政策目标、支持方向与约束条件，比较政策工具及其对产业和项目的影响", scope:"EOS 技能", category:"政策分析", updated:"2026-10-29", usage:4600, creator:"EOS Skill · 政策匹配与区域指标", tags:["政策比对", "区域适配"]},
    {icon:"./icons/skills/evidence.svg", id:"evidence", name:"引用核验", legacyName:"证据核验", description:"核对数据、事实与引用来源，梳理证据链，标记口径差异、信息缺口与待核验项", scope:"通用技能", category:"证据核验", updated:"2026-11-02", usage:8200, creator:"通用 Skill · 证据质量与引用审查", tags:["数据溯源", "质量检查"]},
    {icon:"./icons/skills/argument.svg", id:"argument", name:"观点结构化", legacyName:"观点论证", description:"围绕核心观点组织论据与推理，检查论证逻辑，补充反例、边界条件与替代解释", scope:"EOS 技能", category:"观点论证", updated:"2026-10-24", usage:3100, creator:"EOS Skill · 观点结构化论证", tags:["反方校验", "假设边界"]},
    {icon:"./icons/skills/writing.svg", id:"writer", name:"报告结构编排", legacyName:"报告写作", description:"根据研究目标组织报告结构，整合分析与证据，形成层次清晰、表达一致的报告草稿", scope:"通用技能", category:"报告写作", updated:"2026-11-01", usage:12400, creator:"通用 Skill · 结构化研究写作", tags:["报告结构", "表达优化"]},
    {icon:"./icons/skills/deep-research.svg", id:"deep-research", name:"深度研究编排", description:"拆解研究问题，安排多源检索、交叉验证与结论合并，适合产业和技术专题研究。", scope:"通用技能", category:"产业研究", updated:"2026-11-03", usage:18400, creator:"通用 Skill · 多源研究工作流", tags:["研究计划", "证据合并"]}
  ];
  // Earlier drafts stored the original display names. Resolve them to the same skill IDs.
  const byName = new Map();
  for (const skill of catalog) {
    byName.set(skill.name, skill);
    if (skill.legacyName) byName.set(skill.legacyName, skill);
  }

  function validTaskSkills(names) {
    if (!Array.isArray(names)) return [];
    return [...new Set(names.map(name => byName.get(name)?.name).filter(Boolean))];
  }

  function taskSkillFields(names, saved) {
    const skills = validTaskSkills(names);
    const skillSnapshots = skills.map(name => {
      const skill = byName.get(name);
      const previous = Array.isArray(saved) && saved.find(item =>
        item?.skill_id === skill.id && item.version && item.source);
      if (previous) return {...previous, name};
      return {skill_id:skill.id, name, version:skill.updated, source:skill.scope};
    });
    return {skills, skillSnapshots};
  }

  window.WorkbenchSkills = {catalog, validTaskSkills, taskSkillFields};
})();
