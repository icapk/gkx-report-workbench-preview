/* Offline editorial review. Each proposed change is bound to the paragraph the reader selected. */
(() => {
  'use strict';
  const reviews = new WeakMap();
  const marker = 'sup,button,[data-source],[contenteditable="false"]';
  const trim = value => typeof value === 'string' ? value.trim() : '';
  const reviewId = () => crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
  const sentences = value => (value.match(/[^。！？!?\n]+[。！？!?]?/g) || []).map(trim).filter(Boolean);
  const plain = value => value.replace(/[\s“”‘’「」《》、。，,.：:；;！？!?]/g,'');
  const actionable = /建议|宜先|先行|优先|暂缓|应当|应先|应由|应在|试点前|下一步|再决定/;
  const proposals = [
    {topic:/血液|送血|医疗急送|医疗应急|急件/, object:'医疗配送试点', conditions:'核对同线路地面配送的受理与签收时间，并确认停航时的交接单位', measure:'以同线路、同时段的急件为样本，分别记录受理至签收用时、逾期和改派情况', risk:'遇到停航或延误时，由收发双方启用事先约定的地面接续并登记交接时间'},
    {topic:/即时配送|园区配送|商圈|外卖/,object:'配送试点',conditions:'核对同商圈地面配送记录，并确认订单、取消和异常改派可以逐单追溯',measure:'分开统计受理、按时签收、取消和改派订单，同时核对每单履约成本',risk:'遇到停航或订单积压时切换地面配送，并记录延误及追加成本'},
    {topic:/城际|货运|货源|返程|载荷/,object:'货运走廊',conditions:'核对双向货量、返程装载与地面转运记录，再判断是否新增节点',measure:'按方向和统计期分列实际班次、载荷与门到门成本',risk:'返程货量或接续能力未获验证时，先保留试线，暂缓新增固定节点'},
    {topic:/机器人|具身|工位|抓取|人工介入|自主完成/,object:'现场复测',conditions:'固定工位、任务和物体条件，逐轮登记自主完成、人工接管与失败',measure:'以全部尝试为分母，分开报告自主完成、人工接管后完成和失败的轮次',risk:'现场任务或工位条件变化时重新抽取试次，并单独复核失败和人工接管记录'},
    {topic:/低空|无人机|航线|架次/,object:'航线试点',conditions:'确认场景、统计时段与地面对照线路，并明确运营记录的提供单位',measure:'分列航线数、飞行架次和实际完成订单数，逐项注明统计期与覆盖范围',risk:'地面接续或运营记录无法落实时，保留已有服务，暂缓扩大试点'},
    {topic:/产业|布局|权重|成熟度|优先级/,object:'方向比选',conditions:'用相同统计期核查各候选方向的产业基础、需求证据和资源约束',measure:'列明各候选方向的同口径原始值、指标权重与评分依据',risk:'权重调整导致排序变化时，保留备选方向并重新核对需求证据'}
  ];

  function textRuns(block) {
    const walker = block.ownerDocument.createTreeWalker(block,4);
    const runs=[];
    while (walker.nextNode()) {
      const node=walker.currentNode;
      if (!node.parentElement.closest(marker)) runs.push(node);
    }
    return runs;
  }
  function scan(editor) {
    let heading='报告正文', references=false;
    const result=[];
    for (const element of editor.querySelectorAll('h1,h2,h3,h4,p,li')) {
      const label = trim(element.textContent);
      if (/^H[1-4]$/.test(element.tagName)) {
        heading=label || heading; references=/^(?:数据来源与参考文献|参考文献|资料来源)$/.test(label); continue;
      }
      if (/^(?:数据来源与参考文献|参考文献)$/.test(label)) { references=true; continue; }
      if (references || element.closest('blockquote,figure') || element.querySelector('p,li') ||
          (element.children.length===1 && element.firstElementChild.matches('strong,b') && element.firstElementChild.textContent===element.textContent)) continue;
      const text=trim(textRuns(element).map(node=>node.data).join(''));
      if (text.length>=2) result.push({id:'p'+(result.length+1),heading,text,element});
    }
    return result;
  }
  function targets(editor) { return scan(editor).map(({id,heading,text})=>({id,heading,text})); }
  function sourceFact(entry) {
    if (!entry || typeof entry !== 'object' || entry.accessDenied || entry.hasPermission===false || entry.canRead===false ||
        /403|denied|forbidden|无权|权限不足/i.test([entry.access,entry.status].join(' '))) return null;
    const title=trim(entry.title || entry.name);
    const body=trim(entry.excerpt || entry.text || entry.detail || entry.quote);
    return title && body ? {title,body} : null;
  }
  function sourcesFor(block,sources) {
    const ids=[...block.element.querySelectorAll('[data-source]')].map(el=>el.dataset.source);
    return ids.map(id=>sources.find(s=>s && typeof s==='object' && String(s.id ?? s.sourceId)===id) || sources[Number(id)-1])
      .map(sourceFact).filter(Boolean);
  }
  function outcome(decision,reason,plan,op) {return {decision,reason,plan,op};}
  function unchanged(reason,plan) {return outcome('暂缓',reason,plan);}
  const already = () => outcome('不采纳','选定段落已经表达了这项内容。','保留当前表述，避免重复。');
  const append = (block,text,reason,plan,partial=false) => plain(block.text).includes(plain(text))
    ? already() : outcome(partial?'部分采纳':'采纳',reason,plan,{kind:'append',text});
  function explicitChange(note) {
    const pair=note.match(/(?:把|将)?\s*[“「‘『"'](.+?)[”」’』"']\s*(?:替换[为成]|改[成为]|写成)\s*[：:]?\s*[“「‘『"'](.+?)[”」’』"']/s);
    if (pair) return {from:trim(pair[1]),to:trim(pair[2])};
    const full=note.match(/^(?:本段|整段|这段|原文)?\s*(?:替换[为成]|改[成为]|写成)[：:]\s*(.+)$/s);
    return full ? {from:'',to:trim(full[1]).replace(/^[“「]|[”」]$/g,'')} : null;
  }
  function gap(before,after) {
    let left=0,right=0;
    while (left<before.length && left<after.length && before[left]===after[left]) left++;
    while (right<before.length-left && right<after.length-left && before.at(-right-1)===after.at(-right-1)) right++;
    return {left,right};
  }
  // Restrict inline substitutions to one text node so citations and rich formatting keep their meaning.
  function editSpan(block,from,to) {
    const runs=textRuns(block),raw=runs.map(n=>n.data).join(''),pos=raw.indexOf(from);
    if (pos<0 || raw.indexOf(from,pos+from.length)!==-1) return null;
    const {left,right}=gap(from,to),start=pos+left,end=pos+from.length-right;
    let offset=0;
    for (const node of runs) {
      const stop=offset+node.data.length;
      if (start>=offset && end<=stop && !node.parentElement.closest('a')) return {node,start:start-offset,end:end-offset,insert:to.slice(left,to.length-right)};
      offset=stop;
    }
    return null;
  }
  function edit(block,from,to,reason,plan) {
    if (from===to) return already();
    if (!editSpan(block.element,from,to)) return unchanged('原文无法唯一定位，或拟改写的文字跨越引用和格式边界。','请缩小到一处连续短语后再次提交。');
    return outcome('采纳',reason,plan,{kind:'edit',from,to});
  }
  const unsupportedNumber = /(?:\d+(?:[.,]\d+)*\s*(?:[%％万亿千百个条起项家次笔人元天年月日倍秒小时分钟分]?)|[零一二三四五六七八九十百千万两]+(?:成|倍|万元|亿元|架次|个百分点))/g;
  const strongClaim = /已实现|已验证|已经证实|已获批|已批准|已达标|全面达标|全面推广|全面铺开|必须推广|保证|确保实现|必然|一定能|零风险|全国第一|不再需要|无需核验|无需验证/;
  const conceal = /(?:删除|去掉|删掉|隐藏|隐去|忽略|掩盖|不要(?:再)?提|不提).{0,14}(?:风险|局限|限制|缺口|失败|不确定|引用|证据不足)|(?:伪造|编造|捏造).{0,16}(?:数据|来源|依据)/;
  function editorialMeaning(value) {
    return plain(value).replace(/有必要|应当|应该/g,'应').replace(/宜先|建议先/g,'可先')
      .replace(/比对|对比/g,'比较').replace(/复核|校核|核验|核查/g,'核对')
      .replace(/初步试行|试点实施/g,'试点').replace(/暂时缓办|暂不推进/g,'暂缓')
      .replace(/拟定|计划|拟议/g,'拟').replace(/尚未|仍未/g,'未')
      .replace(/现阶段|当前阶段|目前/g,'当前').replace(/总体来看|总体而言|进行|予以|加以/g,'');
  }
  function changesJudgement(from,to) {
    const uncertain=/暂缓|待核|待验|有待|尚待|未核|未确认|未证|尚未|仍未|不足|不宜|不应|不得|无法|缺少|缺乏|存疑|不确定|可能|拟|或将|计划|建议|有条件|部分|局部|个案|试点/;
    const limited=/暂缓|待|未|不足|不宜|不应|不得|无法|缺|存疑|不确定|可能|拟|或|计划|建议|有条件|部分|局部|个案|试点/;
    if (uncertain.test(from) && !limited.test(to)) return true;
    if (/(?:不|无|未|否)/.test(from)!==/(?:不|无|未|否)/.test(to) &&
        !(/不宜|不应|暂缓|暂不/.test(from) && /暂缓|不宜|暂不/.test(to))) return true;
    if ((/已|正式|确认|确定|全面|全部|普遍|直接推广|立即|必须/.test(to) && !from.includes(to)) ||
        (/(?:位居|第一|领先|优于|已具备|已落实|证实|达标)/.test(to) && !from.includes(to))) return true;
    return false;
  }
  function assess(block,note,sources) {
    const before=block.text, linked=sourcesFor(block,sources), change=explicitChange(note);
    const instruction=change?.to || note;
    const broad=/三类|分场景/.test(before) && ['医疗应急','即时配送','城际货运'].every(topic=>block.element.closest('article, [contenteditable="true"]')?.textContent.includes(topic));
    const domain=broad ? {object:'分类试点',conditions:'分别核对医疗急件的地面接续、即时配送的订单履约及城际货运的双向货源',measure:'分别登记急件按约签收、配送订单履约和货运装载情况，注明各自的统计期与覆盖范围',risk:'某一场景缺少实测记录时暂缓扩大该场景，并保留其余场景的独立判断'} :
      proposals.find(item=>item.topic.test(before)) || proposals.find(item=>item.topic.test(block.heading));
    const target=domain?.object || '本节建议';
    if (!note) return unchanged('尚未输入具体建议。','请说明希望修改哪项表述或补充哪项依据。');
    if (/(?:公布|公开|写入|列出|补上|加上|补充).{0,12}(?:身份证号|私人电话|手机号|家庭住址|密码|访问凭据)|(?:身份证号|密码|密钥)[：:]|(?<![0-9])1[3-9]\d{9}(?![0-9])/.test(note)) return outcome('不采纳','建议涉及可识别个人的信息或访问凭据。','可改用岗位、机构或脱敏汇总信息。');
    if (conceal.test(note)) return outcome('不采纳','删去证据边界或负面记录会改变读者对结论可信度的判断。','保留原文中的限制、风险和出处。');
    if (change?.from && !before.includes(change.from)) return unchanged('所指的原句没有出现在选定段落中。','选择含该原句的段落，或引用本段的确切措辞。');
    const statedAsFact = !( /(?:不要|不能|避免|不得|不宜).{0,6}(?:写成|宣称|声称|断言)/.test(instruction) );
    const hasNewNumber=(instruction.match(unsupportedNumber)||[]).some(n=>!before.includes(n));
    const exactEvidence=change && linked.some(source=>sentences(source.body).some(sentence=>plain(sentence)===plain(change.to)));
    const dangerous=(strongClaim.test(instruction) || hasNewNumber || /断定|取消全部|一律|跳过核查|直接认定/.test(instruction)) && statedAsFact && !exactEvidence;
    const conditions=/试点条件|前提|适用(?:范围|条件)|实施条件|核对.{0,7}条件|核实.{0,7}条件|验证条件|补充.{0,8}条件|先.{0,7}(?:验证|试点)/.test(note);
    const measurement=/口径|分子|分母|统计期|计算方法|怎么(?:计算|统计)|如何(?:计算|统计)/.test(note);
    const evidence=/来源|出处|引用|证据|发布机构|原文/.test(note);
    if (dangerous && !(conditions || measurement || evidence)) return unchanged('当前段落及关联资料不足以确认建议中的数值、承诺或扩大适用范围的判断。','补齐同口径的原始记录和覆盖范围，再决定能否写入正文。');
    if (change && !dangerous) {
      const from=change.from || before, to=change.to;
      const synonymous=editorialMeaning(from)===editorialMeaning(to);
      if (!exactEvidence && !synonymous && changesJudgement(from,to))
        return unchanged('替换会改变原判断的肯定程度、适用范围或行动决定。','请补充支持新判断的原始材料。');
      if (!exactEvidence && !synonymous && /局|政府|委员会|公司|部门|中心|医院|大学|集团|研究院/.test(from+to) && !before.includes(to))
        return unchanged('更换责任主体或机构名称需要出处。','请核实正式名称与职责分工后再改写。');
      const additions=to.match(unsupportedNumber)||[];
      if (!exactEvidence && additions.length && !before.includes(to) && !/待核实|待验证/.test(to))
        return unchanged('同一数字可能对应不同对象或口径，当前资料没有逐句支持拟替换的数字表述。','提供含完整判断的原文，再核对年份、单位和对象。');
      const substantial=!change.from || to.length>24 || Math.abs(from.length-to.length)>10;
      if (!exactEvidence && substantial && !plain(before).includes(plain(to)) && !/建议|拟|待核|需核|可先|可在|应先|暂缓|条件|先行/.test(to))
        return unchanged('拟替换的整句含有需要独立判断的新内容。','把改动缩小为措辞调整，或提供能够支持整句话的材料。');
      return edit(block,from,to,exactEvidence?'拟改句能与本段引用材料中的完整表述对应。':'原文中可定位到具体措辞，修改范围清晰。','在所选段落替换指定文字，保留相邻内容。');
    }
    if (conditions) {
      if (!domain) return unchanged('需要结合具体业务对象才能确定适用条件。','请指出验证对象和拟采用的判断标准。');
      return append(block,'启动'+target+'前，应'+domain.conditions+'。',
        '本段涉及'+target+'，可以把执行前的核查动作写进建议。'+(dangerous?'新增数值仍缺依据。':''),
        '补入核查对象和启动条件。',dangerous);
    }
    if (measurement || evidence) {
      const parts=[];
      if (measurement && domain) parts.push('复核时应'+domain.measure+'。');
      if (evidence && linked.length) parts.push('本段依据见《'+linked[0].title+'》。');
      if (!parts.length) return unchanged('所选段落缺少与这项要求对应的可核对材料。','补充原始出处、统计期及对应段落，再写入具体数值或引文。');
      const partial=dangerous || evidence && !linked.length || measurement && !domain;
      return append(block,parts.join(''),linked.length?'本段已有引用标记，可核对材料与指标定义。':'可以先明确指标复核方法，实际数值仍需原始记录。',
        partial?'写入可确认的核对方法，保留其余内容待补证。':'将核对要求或已关联的材料名称落到段末。',partial);
    }
    if (/风险|退出|应急|预案|失败|异常处置/.test(note) && /补|加|说明|写|明确|考虑|列/.test(note) && domain)
      return append(block,domain.risk+'。','可用本段所讨论的'+target+'界定触发条件与应对动作。','补充出现异常时的处理方式。');
    if (/精简|简洁|缩短|压缩|啰嗦|简练|冗余|简明/.test(note)) {
      const cuts=[[/(?:^|(?<=[。！？]))(?:总体(?:来)?看|综上所述|值得注意的是|需要(?:特别)?说明的是|可以看出|从上述分析可以看出)[，,]/,''],[/进行(?:进一步)?核对/,'核对'],[/进行分析/,'分析'],[/进行比较/,'比较'],[/在此基础上[，,]/,'']];
      for(const [pattern,replacement] of cuts) if(pattern.test(before)) return edit(block,before,before.replace(pattern,replacement),'可以删去引导语或压缩动词，保留原有事实和限定条件。','仅调整本段措辞。');
      const rows=sentences(before),seen=new Set(),unique=rows.filter(row=>!seen.has(plain(row)) && seen.add(plain(row)));
      if (unique.length<rows.length) return edit(block,before,unique.join(''),'本段内存在重复句。','合并完全重复的陈述。');
      return unchanged('本段未发现能在保留原意、数值和条件的前提下直接删去的文字。','请指出希望保留的重点或指定删改的短语。');
    }
    if (/(?:结论|建议|行动|重点).{0,8}(?:前置|放在最前|放到前|提到前|放前面)|(?:先说|先写|突出).{0,4}(?:重点|判断|建议|结论)/.test(note)) {
      const rows=sentences(before),idx=rows.findIndex(row=>actionable.test(row));
      if (idx===0) return already();
      if (idx>0 && !block.element.querySelector('a,sup,button,[data-source],br')) return edit(block,before,[rows[idx],...rows.filter((_,i)=>i!==idx)].join(''),'本段后部已有明确行动建议，可提到事实说明之前。','前置原有建议，保留其余句子的顺序。');
      return unchanged('当前段落没有可独立前置的行动句，或前置会改变引用位置。','指定需要前置的原句，或选择包含完整行动建议的段落。');
    }
    return unchanged('当前建议尚未对应到可直接执行的文字变化或已关联的依据。','请指出具体原句、希望增加的条件，或需要核对的指标。');
  }

  function perform(block,op) {
    if (op.kind==='append') {
      const existing=trim(textRuns(block).map(node=>node.data).join(''));
      if (plain(existing).includes(plain(op.text))) return false;
      const addition=(/[。！？!?；;：:]$/.test(existing)?'':'。')+op.text;
      block.append(block.ownerDocument.createTextNode(addition)); return true;
    }
    const slice=editSpan(block,op.from,op.to);
    if (!slice) return false;
    slice.node.replaceData(slice.start,slice.end-slice.start,slice.insert); return true;
  }
  function evaluate({editor,suggestions=[],sources=[]}) {
    const blocks=scan(editor),baseHTML=editor.innerHTML;
    const review={id:reviewId(),baseHTML,scope:window.reportActions.feedbackStamp().scope,version:window.reportActions.currentVersionName(),items:[]},operations=new Map();
    for (const [index,suggestion] of suggestions.entries()) {
      const id='f'+(index+1),note=trim(suggestion.text),block=blocks.find(row=>row.id===suggestion.targetId);
      const result=block ? assess(block,note,sources) : unchanged('选定段落已不存在。','请重新选择当前正文中的段落。');
      const before=block?.text || '',copy=block?.element.cloneNode(true);
      const applicable=Boolean(result.op && perform(copy,result.op));
      const after=applicable?trim(textRuns(copy).map(node=>node.data).join('')):before;
      if (applicable) operations.set(id,{targetId:block.id,op:result.op});
      review.items.push({id,targetId:suggestion.targetId,heading:block?.heading || '',suggestion:note,
        decision:result.decision,reason:result.reason,plan:result.plan,before,after,applicable});
    }
    reviews.set(review,{editor,baseHTML,operations,stamp:window.reportActions.feedbackStamp(),pending:null,result:null});
    return review;
  }
  const sameHTML = (left,right) => left===right || window.reportActions.safeHTML(left)===window.reportActions.safeHTML(right);
  function stale() {
    return Object.assign(Error('正文或版本已更新，请重新评议。'),{code:'STALE_REVIEW'});
  }
  function applied(review) {return review?.id ? window.reportActions.feedbackResult(review.id) : null;}
  function resume({review,editor,sources=[]}) {
    if (!review || !Array.isArray(review.items) || !review.id || review.scope!==window.reportActions.feedbackStamp().scope ||
        review.version!==window.reportActions.currentVersionName() || !sameHTML(review.baseHTML,editor.innerHTML)) throw stale();
    const checked=evaluate({editor,sources,suggestions:review.items.map(item=>({text:item.suggestion,targetId:item.targetId}))});
    const same=checked.items.length===review.items.length && checked.items.every((item,i)=>
      ['id','targetId','heading','suggestion','before','after','decision','reason','plan','applicable'].every(key=>item[key]===review.items[i][key]));
    if (!same) throw stale();
    checked.id=review.id;
    return checked;
  }
  async function apply(review,selectedIds) {
    const committed=applied(review);
    if (committed) return committed;
    const state=reviews.get(review);
    if (!state) throw stale();
    if (state.result) return state.result;
    if (state.pending) return state.pending;
    const {editor,baseHTML,operations,stamp}=state;
    if(!sameHTML(editor.innerHTML,baseHTML)) throw stale();
    const include = selectedIds==null ? null : new Set(selectedIds);
    const clone=editor.cloneNode(true),blocks=new Map(scan(clone).map(block=>[block.id,block.element])),seen=new Set();
    const selected=[];
    for (const [id,{targetId,op}] of operations) {
      if (include && !include.has(id)) continue;
      const signature=JSON.stringify([targetId,op]);
      if (seen.has(signature)) continue;
      seen.add(signature);
      if (!perform(blocks.get(targetId),op)) throw Error('同段的修改发生重叠，请分别确认这些建议。');
      selected.push(id);
    }
    const appliedCount=selected.length;
    if (!appliedCount) throw Error('当前没有可写入的修订，请选择已采纳的建议。');
    state.pending=window.reportActions.saveFeedbackRevision({id:review.id,baseHTML,nextHTML:clone.innerHTML,stamp,appliedCount,selected})
      .then(result=>(state.result=result)).finally(()=>{state.pending=null;});
    return state.pending;
  }
  window.GkxFeedbackReview=Object.freeze({targets,evaluate,resume,applied,apply});
})();
