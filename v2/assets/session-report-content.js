/* Build a report from the same session data held by the writing workbench. */
(() => {
  'use strict';

  const text = value => typeof value === 'string' ? value.trim() : '';
  const list = value => Array.isArray(value) ? value : [];
  const escape = value => text(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
  const paragraph = value => text(value) ? '<p>' + escape(value).replace(/\n/g, '<br>') + '</p>' : '';
  function fieldSentence(label, value) {
    if (!value) return '';
    const end = /[。！？.!?…][”’」』）)]*$/.test(value) ? '' : '。';
    return label + '：' + value + end;
  }

  // These are qualitative reading notes for the workbench's demonstration topics.
  // They do not assert market sizes, company rankings, or external research results.
  const exampleNotes = {
    '深圳低空物流示范场景研究': [
      '医疗急送要验证的是紧急委托能否按约定交接，园区配送要验证的是日常订单能否稳定履约。两者可以共用从受理到签收的计时口径，但应分别评价时效与连续服务能力。',
      '建议为每个场景选取起讫点和服务时段相近的地面配送作为对照。每单记录受理、取件、交接与签收时间，同时记录改派原因。取消和未完成的订单也应计入观察记录。',
      '先检查试点单位能否提供原有配送记录、明确双方交接责任，并在停运时完成地面接续。通过这些检查的场景可以开展小范围对照验证，再依据医疗急送的按时签收表现、园区配送的连续履约表现决定是否扩大试点。',
      '首批试点宜优先选择能取得地面对照记录、有人负责收发交接、也能演练异常改派的场景。医疗急送重点核实紧急件能否按约定送达，园区配送重点核实不同订单量下能否持续履约。'
    ],
    '深圳低空经济产业链战略研究': [
      '产业链布局需要同时考虑飞行器制造、运行保障和应用需求。如果只按生产环节统计企业，就很难判断当地能否支撑持续运营。',
      '建议先选定一个具体场景，把一次飞行所需的设备、空域协调、起降设施、运维和付费主体列在同一张表上。多个场景共同依赖的环节，更适合列入公共能力建设的备选清单。',
      '将候选环节分为公共能力、企业配套和试点验证三类。立项前分别核对服务对象、交付条件和可复用范围。'
    ],
    '大湾区低空经济区域竞争比较': [
      '区域比较应使用相同的观察单位。注册企业数量反映主体分布，实际航线与服务记录反映运营活动，两组指标要分别解读。',
      '建议逐城整理制造配套、飞行服务、基础设施和应用场景，并为每项记录统计日期和地域边界。跨城经营的同一主体需要单独标记。',
      '只有在口径相同且证据覆盖相近时才进行排序。对缺少可比数据的城市，可先列出其功能定位和待核实的协作机会。'
    ],
    '低空飞行服务重点企业筛选': [
      '筛选重点企业首先要区分设备供应商、运行保障服务商和直接运营方。三类企业的主要能力和客户并不相同，适合分类比较。',
      '初筛可按服务场景、实际运营案例与交付范围建立候选清单；复筛再核对项目主体、业务持续性以及能否提供独立的履约记录。',
      '拟进入重点清单的企业需附一条可复查的入选依据。仅有宣传材料的主体可以保留在观察名单，待补齐证据后再评估。'
    ],
    '未来产业方向优先级分析': [
      '产业方向的先后次序取决于决策目标。支持前沿探索时应关注技术可验证性，推进产业化时还要考察需求、配套能力和实施周期。',
      '建议为每个候选方向单独记录技术问题、目标用户、已有能力和当前缺口，并公开同一轮比较采用的评价尺度。',
      '可以分别形成近期试点和中长期储备两份清单。若权重变化会改变排序，应单列相关假设并安排补证。'
    ],
    '具身智能产业发展趋势研判': [
      '研判具身智能的发展，应区分模型能力变化与整机在真实任务中的表现。演示场景达成目标，与系统在开放环境中稳定工作，是两种不同的验证条件。',
      '可选取同一操作任务，对照感知、规划、执行和异常恢复四个环节，记录任务成功条件、人工介入方式及采样环境。',
      '优先跟踪可重复验证的任务结果与实际应用约束，再判断技术进步能否转化为部署价值。'
    ]
  };
  const structure = {
    '研究报告': ['研究背景与目标', '研究范围与分析方法', '资料与初步判断', '结论与待验证问题'],
    '洞察报告': ['观察对象与核心问题', '信号与证据', '影响与后续观察'],
    '战略分析报告': ['研究背景与关键问题', '资料、证据与分析', '战略判断与建议']
  };

  function cleanReportHTML(raw) {
    const template = document.createElement('template');
    template.innerHTML = raw;
    const allowed = new Set('h1 h2 h3 h4 h5 h6 p div span section article aside figure figcaption blockquote ol ul li strong b em i s u sup sub mark br hr table tr th td thead tbody tfoot caption a button img pre code'.split(' '));
    const remove = new Set('script iframe frame object embed style link form template svg math noscript'.split(' '));
    for (const el of [...template.content.querySelectorAll('*')]) {
      const tag = el.localName;
      if (remove.has(tag)) { el.remove(); continue; }
      if (!allowed.has(tag)) { el.replaceWith(...el.childNodes); continue; }
      for (const attr of [...el.attributes]) {
        if (['alt','title','scope','rowspan','colspan','start','aria-label','data-source','class'].includes(attr.name)) continue;
        if (tag === 'img' && attr.name === 'src' && /^(?:data:image\/(?:png|jpeg|webp|gif);base64,|(?:\.\/)?assets\/[\w./%-]+$)/i.test(attr.value)) continue;
        if (tag === 'a' && attr.name === 'href' && /^(?:https?:\/\/|#)/i.test(attr.value)) continue;
        el.removeAttribute(attr.name);
      }
      if (tag === 'button') { el.type = 'button'; el.contentEditable = 'false'; }
      if (tag === 'img' && !el.hasAttribute('src')) el.replaceWith(document.createTextNode(el.alt || ''));
    }
    return template;
  }

  function savedContent(report, draft, existing) {
    for (const record of [existing, report, draft]) {
      if (!record) continue;
      const html = text(record.html);
      const plain = [record.text, record.content, record.body].map(text).find(Boolean);
      if (html || plain) {
        const hasMarkup = html || /^\s*<(?:h[1-6]|p|article|section|div|table|blockquote)\b/i.test(plain);
        if (hasMarkup) return {record, doc:cleanReportHTML(html || plain)};
        const lines = plain.split(/\r?\n/).map(line => {
          const match = line.match(/^(#{1,6})\s+(.+)$/);
          return match ? '<h' + match[1].length + '>' + escape(match[2]) + '</h' + match[1].length + '>' : paragraph(line);
        });
        return {record, doc:cleanReportHTML(lines.join('\n'))};
      }
    }
    return null;
  }

  function normaliseOutline(rows) {
    return list(rows).map(raw => {
      const row = raw && typeof raw === 'object' ? structuredClone(raw) : {};
      const children = [], details = [];
      list(row.children).forEach((child, i) => {
        const title = text(child?.title) || text(child);
        if (!title) return;
        children.push(title);
        const {title: childTitle, ...inline} = child && typeof child === 'object' ? child : {};
        details.push({...inline, ...row.childDetails?.[i]});
      });
      if (Array.isArray(row.childDetails) || details.some(detail => Object.keys(detail).length)) row.childDetails = details;
      return {...row, title:text(row.title) || text(raw), body:text(row.body), children};
    }).filter(row => row.title);
  }

  function scopedMethods(section) {
    const items = [];
    function add(scope, title, snapshot) {
      if (text(snapshot?.skill_id) && text(snapshot.name)) {
        items.push({scope, title, skillSnapshot:structuredClone(snapshot)});
      }
    }
    add('chapter', section.title, section.skillSnapshot);
    section.children.forEach((child, index) => add('child', child, section.childDetails?.[index]?.skillSnapshot));
    list(section.placeholders).forEach(item => add('placeholder', item.title || item.kind, item.skillSnapshot));
    return items;
  }

  function proposeOutline({definition = {}, launch = {}} = {}) {
    if (Array.isArray(definition.outline)) return normaliseOutline(definition.outline);
    const template = [definition.templateSpec?.outline, launch?.templateSpec?.outline]
      .map(normaliseOutline).find(rows => rows.length);
    if (template) return template;
    const type = text(launch?.type) || text(definition.type) || '战略分析报告';
    const strategic = type === '战略分析报告';
    const titles = strategic ? ['现状分析','趋势洞察','落地方案'] : (structure[type] || structure['研究报告']);
    const rows = normaliseOutline(['摘要', '核心结论', ...titles]);
    const goal = text(list(definition.fields).find(field => field.id === 'F02')?.value);
    if (!goal) return rows;

    const analysis = rows.find(section => /现状|资料|信号/.test(section.title));
    const shortGoal = goal.replace(/[。.!！?？]+$/, '');
    if (shortGoal.length <= 60) analysis.children.push(shortGoal);
    else {
      analysis.body = fieldSentence('研究目标', goal);
      analysis.children.push('核心研究问题');
    }
    const questions = [
      [/比较|对标|对照|优先|排序/, '比较口径与判断标准', '现状分析'],
      [/趋势|演进|变化/, '变化信号与判断依据', '趋势洞察'],
      [/风险|约束|瓶颈/, '约束条件与验证方法', '趋势洞察'],
      [/机会|可行|落地|试点|示范/, '实施条件与验证方法', '落地方案']
    ];
    for (const [pattern, title, chapter] of questions) {
      const target = strategic ? rows.find(row=>row.title===chapter) : analysis;
      if (pattern.test(goal) && !target.children.includes(title)) target.children.push(title);
    }
    return rows;
  }

  function markdownOutline(rows) {
    return normaliseOutline(rows).map(section =>
      ['## ' + section.title, section.body, ...section.children.map(child => '### ' + child)]
        .filter(Boolean).join('\n\n')
    ).join('\n\n');
  }

  function writingSteps(definition) {
    const sections = normaliseOutline(definition.outline);
    return [
      {title:'制定执行计划', detail:'按已确认的文章大纲安排各章节的写作顺序。'},
      ...sections.map(section => {
        const detail = section.body || (section.children.length ? '按顺序展开' + section.children.join('、') + '。' : '整理本节的写作材料和要点。');
        const step = {title:'撰写“' + section.title + '”', detail};
        const selections = scopedMethods(section);
        if (selections.length) {
          step.localSkills = selections;
          step.detail += '\n' + selections.map(item =>
            (item.scope === 'chapter' ? '本章' : '“' + item.title + '”') + '采用' + item.skillSnapshot.name + '。'
          ).join(' ');
        }
        return step;
      }),
      {title:'汇总并检查报告', detail:'核对章节顺序、素材与目录，生成报告文档。'}
    ];
  }

  function applyTextStyle(element, config) {
    if (!config) return;
    if (/^[一-龥a-zA-Z0-9 -]{1,48}$/.test(config.font || '')) element.style.fontFamily = config.font;
    if (Number(config.size) >= 1 && Number(config.size) <= 200) element.style.fontSize = Number(config.size) + 'px';
    if (Number(config.lineHeight) >= 0.1 && Number(config.lineHeight) <= 10) element.style.lineHeight = Number(config.lineHeight);
    if (['left','center','right','justify'].includes(config.align)) element.style.textAlign = config.align;
  }

  function heading(level, title, config) {
    const element = document.createElement('h' + level);
    element.textContent = title;
    applyTextStyle(element,config);
    return element.outerHTML;
  }

  function styledBody(html, config) {
    if (!config || !html) return html;
    const fragment = document.createElement('template');
    fragment.innerHTML = html;
    fragment.content.querySelectorAll('p,th,td').forEach(element => applyTextStyle(element,config));
    return fragment.innerHTML;
  }

  window.sessionOutline = {propose:proposeOutline, normalize:normaliseOutline, markdown:markdownOutline, writingSteps};

  function derivedOutline(fragment) {
    const headings = [...fragment.querySelectorAll('h2,h3')];
    const sections = [];
    for (const heading of headings) {
      const title = heading.textContent.trim();
      if (!title) continue;
      if (heading.localName === 'h2' || !sections.length) sections.push({title, children:[]});
      else sections[sections.length - 1].children.push(title);
    }
    return sections;
  }

  function publishedOutline(sections) {
    return sections.map(section => scopedMethods(section).length ? structuredClone(section) :
      {title:section.title, children:section.children});
  }

  // Keep saved selections on headings that still exist; a renamed or removed child must
  // not cause its method to move to the next child when a manuscript is reopened.
  function outlineFromSaved(fragment, original) {
    const visible = derivedOutline(fragment);
    if (!visible.length) return publishedOutline(original);
    if (!original.some(section => scopedMethods(section).length)) return visible;
    const known = original.slice();
    return visible.map(section => {
      const i = known.findIndex(row => row.title === section.title);
      if (i < 0) return section;
      const [row] = known.splice(i,1);
      if (!scopedMethods(row).length) return section;
      const children = row.children.map((title,index) => ({title, detail:row.childDetails?.[index]}));
      const blocks = list(row.placeholders).slice();
      const result = {...row, children:[], childDetails:[], placeholders:[]};
      for (const title of section.children) {
        const j = children.findIndex(child => child.title === title);
        if (j >= 0) {
          result.children.push(title);
          result.childDetails.push(children.splice(j,1)[0].detail || {});
          continue;
        }
        const k = blocks.findIndex(block => (block.title || block.kind) === title);
        if (k >= 0) result.placeholders.push(blocks.splice(k,1)[0]);
        else { result.children.push(title); result.childDetails.push({}); }
      }
      return result;
    });
  }

  function sourceFiles(groups) {
    const files = new Map();
    for (const file of groups.flatMap(list)) {
      const name = text(file?.name);
      if (!name) continue;
      const content = text(file.text);
      const key = text(file.id) || name + '\u0000' + content;
      if (!files.has(key) || content) files.set(key, {name, content});
    }
    return [...files.values()];
  }

  function sectionText(title, task, note) {
    const {topic, goal, scope, reader} = task;
    if (title === '现状分析') return note?.[0] || fieldSentence('研究对象',topic) + '先梳理现有条件、参与主体及其差异，并注明资料的时间和适用范围。';
    if (title === '趋势洞察') return '研判“' + topic + '”的变化时，需在一致口径下比较不同时点的表现，说明哪些观察支持判断、哪些仍需后续验证。';
    if (title === '落地方案') return note?.[2] || '按实施条件比较候选方案，明确各方案的责任主体、验证指标和调整条件，再确定推进顺序。';
    if (/证据|资料|来源|信号|数据说明|附录/.test(title)) return note?.[1] || '对照“' + topic + '”相关材料时，应分别记录原文表述、适用条件和需要交叉核对的信息。结论的适用范围取决于材料覆盖的对象和时段。';
    if (/建议|结论|战略判断|行动|展望|后续|优先级/.test(title)) return note?.[2] || fieldSentence('研究目标', goal) + '建议先选择一个可验证的判断，明确需要的证据、可接受的结果和调整决定的条件。' + (reader ? '向目标读者呈现结论时，应说明判断适用的范围。' : '');
    if (/背景|对象|概况|目标|问题|框架/.test(title)) return note?.[0] || fieldSentence('研究对象', topic) + (goal ? fieldSentence('研究目标', goal) : '分析起点是明确研究对象的边界，以及哪些变化会影响对该对象的判断。');
    if (/竞争|对标|比较/.test(title)) return '比较“' + topic + '”的不同对象时，应统一对象类型、统计时点和比较指标。记录相同条件下的差异，再核对造成差异的可能原因。';
    if (/产业链|环节|路线|结构/.test(title)) return '从“' + topic + '”涉及的环节入手，分别梳理各环节的输入、产出及其依赖关系，找出需要单独验证的关键条件。';
    if (/风险|约束|敏感/.test(title)) return '围绕“' + topic + '”逐项区分已观察到的问题和仍待验证的风险，并说明哪些证据会改变现有判断。';
    if (/技术|研发|专利|论文/.test(title)) return '评估“' + topic + '”时，可对照技术任务、验证环境和评价尺度。涉及成熟度和应用效果的结论需要可复现的验证记录。';
    if (/财务|回报|投资/.test(title)) return '评估“' + topic + '”的投入与收益，需要先明确计算周期、成本边界和回报口径，并分别列出依赖假设的部分。';
    if (/范围|方法/.test(title)) return (fieldSentence('研究范围', scope) || '应先确定同一组可比较的研究对象和时间窗口。') + '可据此检查材料是否覆盖关键问题，并标记只适用于个别对象的发现。';
    return '“' + title + '”用于考察“' + topic + '”的相关条件。应先从会话材料中提取直接描述，再核实这些描述能否支持本节的判断。';
  }

  function marker(index) {
    const number = index + 1;
    return '<button type="button" contenteditable="false" data-source="' + number + '" aria-label="查看来源 ' + number + '">' + number + '</button>';
  }

  function materialObservation(files) {
    const index = files.findIndex(file => file.content);
    if (index < 0) return '';
    const file = files[index];
    const sentences = file.content.split(/\r?\n|(?<=[。！？])/).map(text).filter(Boolean);
    const first = sentences.find(sentence => !/^#|^(研究主题|研究目标|研究范围|目标读者)[：:]/.test(sentence)) || sentences[0];
    const excerpt = first.length > 120 ? first.slice(0, 120) + '…' : first;
    return '<p>会话材料《' + escape(file.name) + '》记载：“' + escape(excerpt) + '”' + marker(index) + '。</p>';
  }

  function evidence(files) {
    const items = files.map((file, index) => {
      const source = marker(index);
      if (!file.content) return '<li>' + escape(file.name) + '（仅有资料条目）</li>';
      const first = file.content.slice(0, 300);
      return '<li><strong>' + escape(file.name) + '</strong>' + source + paragraph(first + (first.length < file.content.length ? '…' : '')) + '</li>';
    });
    return '<ol>' + items.join('') + '</ol>';
  }

  function methodContent(snapshot, label, task, files, compact) {
    const id = text(snapshot?.skill_id), name = text(snapshot?.name);
    if (!id || !name) return '';
    const focus = '“' + label + '”';
    const firstText = files.findIndex(file => file.content);
    const file = files[firstText] || files[0];
    const source = file ? '《' + escape(file.name) + '》' + (firstText >= 0 ? marker(firstText) : '（仅有条目）') : '';
    const sourceNote = source ? '可从' + source + '核对相关记录，引用前需确认材料覆盖本节的问题。'
      : '需补充可回查的原文或记录，并注明采集时段。';
    const goal = escape(task.goal || task.topic);
    const limit = escape(task.scope) || '本研究界定的对象与时段';
    const local = escape(focus);
    const methods = {
      strategy: ['方案与取舍', '将' + local + '的推进方案和暂缓条件放在同一尺度下比较。',
        [['先行试点','围绕' + goal + '选择可单独验证的环节，先确认实施主体、观察周期和退出条件。'],
         ['暂缓扩大','如果对照条件或后续责任尚未明确，先补证，再决定是否扩大实施范围。']]],
      industry: ['产业链环节对照', '沿' + local + '的投入、交付和使用环节追踪依赖关系。',
        [['投入与交付','从' + limit + '内的关键投入入手，核对供给方、承接方和交付条件。'],
         ['需求与缺口','区分已有的使用记录与意向需求，定位哪一环节仍需要验证。']]],
      technology: ['路线验证条件', '对' + local + '采用同任务、同环境的验证口径。',
        [['对照任务','根据' + goal + '选取可重复任务，记录运行环境、输入条件及成功判据。'],
         ['应用边界','单次演示可以记录为观察，进入应用判断前仍需复测及异常处理记录。']]],
      policy: ['政策适用比对', '判断' + local + '是否落入文件的地域、对象和有效期。',
        [['适用范围','针对' + limit + '核对发布机关、有效版本及适用主体。' + sourceNote],
         ['条件与例外','对支持事项与限制条款分别摘录；在找到明确条款前保留适用性判断。']]],
      evidence: ['来源与口径', '对' + local + '逐项区分已有材料和待补证据。',
        [['来源依据',sourceNote],
         ['核验口径','复核' + limit + '内的观察对象、统计时点与指标分母。来自不同口径的数值暂不用于排序。']]],
      argument: ['判断与反例', '检验' + local + '在观察对象或适用条件改变后是否仍成立。',
        [['待论证判断','以“' + goal + '”为问题，对每项建议附一条可回查的观察。' + sourceNote],
         ['可推翻的条件','若同范围、同时段的对照出现相反结果，应缩小结论适用范围并重新核对解释。']]],
      writer: ['结论与依据', '围绕' + local + '按决策问题、事实依据及后续行动组织表述。',
        [['决策问题',goal], ['依据与行动',sourceNote + '将待补材料及下一步验证要求列入建议。']]],
      'deep-research': ['研究与复核安排', '把' + local + '拆为可分别回答、可交叉验证的问题。',
        [['核心问题',goal], ['交叉验证',sourceNote + '再从另一项独立来源复核同一观察，分别记录相符与冲突之处。']]]
    };
    const method = methods[id];
    if (!method) return '';
    const [subtitle, description, rows] = method;
    if (compact) return '<p><strong>' + escape(name) + '</strong>　' + description + '</p>';
    const labelCell = value => '<th scope="row">' + value + '</th>';
    return '<p><strong>' + escape(name) + ' · ' + subtitle + '</strong></p><p>' + description + '</p>' +
      '<table><thead><tr><th scope="col">分析项</th><th scope="col">本节要点</th></tr></thead><tbody>' +
      rows.map(([field,value]) => '<tr>' + labelCell(field) + '<td>' + value + '</td></tr>').join('') + '</tbody></table>';
  }

  function logisticsComparison() {
    return '<table><thead><tr><th scope="col">场景</th><th scope="col">观察指标</th><th scope="col">试点条件</th></tr></thead><tbody>' +
      '<tr><th scope="row">医疗急送</th><td>同类急件从受理到签收的用时、按约定时限签收的比例，以及异常改派后的交接时间。</td><td>由收发两端约定模拟件的交接时限和签收要求，保留地面配送记录，并演练无法按时交接时的替代安排。</td></tr>' +
      '<tr><th scope="row">园区配送</th><td>按订单时段比较准时签收比例、积压件数和每个完成订单的配送成本。</td><td>选定固定收发点与可对照的配送时段，能调取订单和签收记录，并明确高峰期的地面接续方式。</td></tr>' +
      '</tbody></table>';
  }

  function bloodSections(anchors) {
    return {
      'blood-baseline': {
        lead: anchors.scale,
        paragraphs: [
          '16条是截至2024年底已开通的航线数。7,070架次和4,412公斤是全年全市合计，未按医院、线路或紧急程度分列。评估新增线路时，应先取得候选医院的订血和签收记录。',
          '全面扩围需要多条线路的需求和履约记录。有限试点先选择一条能取得空地对照记录的线路。若收发两端尚未约定签收时限或无法安排停航接续，则暂缓新增线路，维持现有服务。'
        ]
      },
      'blood-comparison': {
        lead: anchors.timing,
        paragraphs: [
          '2024年2月23日，深圳市血液中心向南山医院完成首飞。报道中的两个时长覆盖不同路程，不能用相减得到的75分钟作为每单节约时间，也不能据此预估新增医院的表现。',
          '本次模拟初稿主张“全市普遍节时约八成，应全面扩围”。反方追问：各医院地面单程签收要多久？两份公开资料均未提供同线路、同时段的空地签收对照，初稿将一次首飞外推到了全市。'
        ]
      },
      'blood-ruling': {
        lead: anchors.decision,
        paragraphs: [
          '支持扩围的一方援引全年7,070架次说明已有运行基础。反方要求补齐候选线路的需求、时效和成本。模拟圆桌保留现有服务，采用有限试点取证；有运行基础可以启动验证，缺少跨线路收益依据则暂缓全面扩围。',
          '由血液中心和试点医院在同一起讫点、相近时段分别记录空运与地运从受理到签收的全过程，逐笔登记成本。双方事先约定签收时限、值守和改派职责，将取消、延误及转地面接续的任务一并计入。'
        ]
      },
      'blood-audit': {
        lead: anchors.audit,
        paragraphs: [
          '2024年为闰年。把全年飞行架次除以366个日历日，得到全市平均每天约19.3架次。各线路启用时间与运行频率可能不同，不能把该均值写成单线日班次、日订单数或准时率。',
          '经模拟质量审查，终稿撤回“全市普遍节时约八成，应全面扩围”的初稿建议，保留全市运行规模、南山首飞事实和有限试点建议。试点结束后按线路和时段复查按约签收比例、每个完成任务的总成本、停航及异常任务的接续结果。满足双方事先约定的标准后，再评估下一条线路。记录缺失或接续未验证时，维持试点并补采。'
        ]
      }
    };
  }

  function bloodReferences(sources) {
    return '<p><strong>数据来源与参考文献</strong></p>' + sources.map(source =>
      '<p>' + escape(source.agency) + '，' + escape(source.date) + '，《' + escape(source.title) + '》<br>' +
      '<a href="' + escape(source.url) + '">' + escape(source.url) + '</a></p>'
    ).join('');
  }

  function promptAlreadyShown(prompt, task) {
    const lines = prompt.split(/\r?\n/).map(text).filter(Boolean);
    if (lines.length !== 4) return false;
    const fields = {研究主题:task.topic, 研究目标:task.goal, 研究范围:task.scope, 目标读者:task.reader};
    const seen = new Set();
    for (const line of lines) {
      const match = line.match(/^(研究主题|研究目标|研究范围|目标读者)[：:]\s*(.+)$/);
      if (!match) return false;
      const original = match[2].replace(/[。.!！?？]$/, '').trim();
      if (!original || !fields[match[1]].includes(original)) return false;
      seen.add(match[1]);
    }
    return seen.size === 4;
  }

  window.buildSessionReportContent = function buildSessionReportContent(context = {}) {
    const report = context.report || context;
    const draft = context.draft || report.draft || {};
    const launch = context.launch || {};
    const definition = context.definition || draft.taskDefinition || report.taskDefinition || {};
    // Stored document fields belong to the previous publication when a new run completes.
    const generating = context.phase === 'complete';
    const saved = generating ? null : savedContent(report, draft, context.existing);
    const demoCaseId = definition.demoCaseId || report.demoCaseId || draft.taskDefinition?.demoCaseId;
    const blood = demoCaseId === 'sz-blood-network-2024' ? window.bloodNetworkDemo : null;
    const fields = new Map(list(definition.fields).map(field => [field.id, field]));
    const field = id => text(fields.get(id)?.value);
    const prompt = text(definition.prompt) || text(draft.prompt) || text(report.prompt) || text(launch.prompt);
    const files = generating && Array.isArray(definition.attachments)
      ? sourceFiles([definition.attachments, definition.outlineSettings?.files])
      : sourceFiles([definition.attachments, report.attachments, report.knowledgeFiles, launch.attachments, definition.outlineSettings?.files]);
    const type = text(report.type) || text(draft.type) || text(launch.type) || '研究报告';
    const title = saved?.doc.content.querySelector('h1')?.textContent.trim() || text(saved?.record.title) || (generating && (text(definition.outlineSettings?.title) || field('F01'))) || text(report.title) || field('F01') || text(draft.title) || prompt.split('\n')[0].slice(0, 60) || files[0]?.name || type;
    const task = {topic:field('F01') || title, goal:field('F02'), scope:field('F03'), reader:field('F04')};
    const confirmedOutline = Array.isArray(definition.outline) ? normaliseOutline(definition.outline) : null;
    const preferredOutline = confirmedOutline ?? [!generating && context.existing?.outline, context.outline, definition.templateSpec?.outline, draft.templateSpec?.outline, launch.templateSpec?.outline, !generating && report.templateSpec?.outline].map(normaliseOutline).find(rows => rows.length);
    const sources = blood ? blood.sources.map(source => ({...source, text:source.detail, location:source.agency+' · '+source.date})) : files.map(file => file.name);
    const complete = definition.consent === true && (report.progress === 100 || !!draft.taskDefinition || context.phase === 'complete');
    const steps = complete ? writingSteps(definition) : [];
    if (saved) {
      const storedOutline = normaliseOutline(saved.record.outline);
      const outline = outlineFromSaved(saved.doc.content, storedOutline.length ? storedOutline : preferredOutline || []);
      if (!saved.doc.content.querySelector('h1')) {
        const heading = document.createElement('h1'); heading.textContent = title; saved.doc.content.prepend(heading);
      }
      const knownSources = list(saved.record.sources).map(item => text(item) || text(item?.title) || text(item?.name)).filter(Boolean);
      return {title, html:saved.doc.innerHTML, sources:blood ? sources : knownSources.length ? knownSources : sources, outline, steps:list(saved.record.steps).length ? saved.record.steps : steps, ...(blood && {demoCaseId})};
    }

    const chapters = preferredOutline || (blood ? normaliseOutline(blood.outline) : (structure[type] || structure['战略分析报告']).map(title => ({title,body:'',children:[]})));
    const bloodChapters = blood && bloodSections(blood.anchors);
    const logisticsTopic = task.topic === '深圳低空物流示范场景研究';
    const compareLogistics = logisticsTopic && task.goal.includes('医疗急送') && task.goal.includes('园区配送');
    const seed = !logisticsTopic || compareLogistics ? exampleNotes[task.topic] : null;
    const metadata = [text(context.project) || text(draft.project) || text(launch.project), type, '本地草稿'].filter(Boolean).map(escape).join(' · ');
    const lead = seed?.[3] || seed?.[0] || (fieldSentence('研究主题', task.topic) + (fieldSentence('研究目标', task.goal) || '当前首先需要明确观察对象、比较条件和判断依据。'));
    const hasSummary = chapters.some(section => /^(?:摘要|执行摘要|内容摘要)$/.test(section.title));
    const html = [heading(1,title,definition.outlineSettings?.titleConfig), '<blockquote><p>' + metadata + '</p></blockquote>'];
    if (blood) html.push(
      '<p><strong>评审建议</strong>　先在具备地面接续条件的线路做空地对照，再用签收和成本记录决定是否扩大覆盖。</p>',
      paragraph('本报告模拟评估深圳是否扩大无人机送血服务范围。运行数据来自公开资料，文中评审意见与试点安排用于决策演示。')
    );
    if (!blood && !hasSummary && !confirmedOutline) html.push('<h2>摘要</h2>', paragraph(lead), materialObservation(files));
    if (seed && task.goal) html.push(paragraph(fieldSentence('研究目标', task.goal)));
    if (task.scope) html.push(paragraph(fieldSentence('研究范围', task.scope)));
    if (task.reader) html.push(paragraph(fieldSentence('目标读者', task.reader)));
    if (!blood && prompt && prompt !== task.topic && !promptAlreadyShown(prompt, task)) html.push(paragraph('本次委托：' + prompt));
    const unresolved = [...fields.values()].map(f => text(f.unresolved)).filter(Boolean);
    if (unresolved.length) html.push(paragraph('仍需明确：' + unresolved.join('；') + '。'));
    let sourceIndex = chapters.findIndex(section => /资料|证据|信号|来源/.test(section.title));
    if (sourceIndex === -1) sourceIndex = Math.max(chapters.length - 1, 0);
    chapters.forEach((section, i) => {
      html.push(heading(2,section.title,section.config));
      const isSummary = section.kind === '摘要' || /^(?:摘要|执行摘要|内容摘要)$/.test(section.title);
      const commentary = isSummary ? lead : sectionText(section.title, task, seed);
      const preset = blood && blood.outline.find(row => row.id === section.id || (!section.id && row.title === section.title));
      const bloodChapter = preset && bloodChapters[preset.id];
      const body = bloodChapter?.lead || section.body || commentary;
      html.push(styledBody(paragraph(!blood && !hasSummary && body === lead ? '本节围绕“' + task.topic + '”界定观察对象。应先明确比较单位和样本范围，再展开后续分析。' : body), section.config));
      if (bloodChapter && section.body && section.body !== preset.body) html.push(styledBody(paragraph(section.body),section.config));
      if (isSummary) html.push(materialObservation(files));
      if (section.skillSnapshot) html.push(styledBody(methodContent(section.skillSnapshot, section.title, task, files, false), section.config));
      section.children.forEach((child, index) => {
        const options = section.childDetails?.[index];
        const presetIndex = preset ? preset.children.findIndex(candidate =>
          options?.id ? candidate.id === options.id : (text(candidate.title) || text(candidate)) === child) : -1;
        const content = bloodChapter?.paragraphs[presetIndex];
        const customNote = content && options?.body && options.body !== preset.children[presetIndex].body ? paragraph(options.body) : '';
        html.push(heading(3,child,options?.config), styledBody(paragraph(content || options?.body || sectionText(child, task, seed)) + customNote, options?.config));
        const method = options?.skillSnapshot || section.skillSnapshot;
        if (method) html.push(styledBody(methodContent(method, child, task, files, !options?.skillSnapshot), options?.config));
      });
      for (const item of list(section.placeholders)) {
        const label = item.title || item.kind;
        html.push(heading(3,label,item.config), styledBody(window.WorkbenchPlaceholders.render(item),item.config));
        const method = item.skillSnapshot || section.skillSnapshot;
        if (method) html.push(styledBody(methodContent(method, label, task, files, true), item.config));
      }
      if (!blood && i === sourceIndex) {
        if (compareLogistics) html.push(logisticsComparison());
        const missingEvidence = compareLogistics ? '本次会话还缺少两个场景的对照记录，试点优先次序需待验证。' : '本次会话尚未附可核验的资料，涉及规模、排名或因果关系的判断均需补证。';
        html.push(files.length ? evidence(files) : paragraph(missingEvidence));
      }
    });
    if (blood) html.push(bloodReferences(sources));
    return {title, html:html.join('\n'), sources, outline:confirmedOutline ?? publishedOutline(chapters), steps, ...(blood && {demoCaseId})};
  };
})();
