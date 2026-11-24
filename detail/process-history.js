(() => {
  const make = (tag, cls, value) => {
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(value!=null) el.textContent=String(value);
    return el;
  };
  function action(label,fn,cls) {
    const el=make('button',cls,label);el.type='button';el.addEventListener('click',fn);return el;
  }
  function fold(label) {
    const el=make('details','ph-section'), line=make('summary');
    line.append(make('strong','',label),make('span','ph-arrow','⌄'));
    el.append(line);return el;
  }
  function messages(notes) {
    const thread=make('div','ph-thread');
    notes.forEach(note=>{
      if(!note || (!note.text&&!note.title&&!note.items?.length))return;
      const user=note.role==='user',row=make('div',user?'ph-message ph-user':'ph-message ph-agent');
      const avatar=user?make('span','ph-user-icon','我'):make('img','ph-avatar');
      if(!user){avatar.src='assets/agent-logo.svg';avatar.alt='Agent';}
      const content=make('div','ph-message-body');
      if(note.title) content.append(make('strong','ph-message-title',note.title));
      if(note.text) content.append(make('p','',note.text));
      if(Array.isArray(note.items)&&note.items.length){
        const list=make('ul');
        note.items.forEach(item=>{if(typeof item==='string')list.append(make('li','',item));});
        content.append(list);
      }
      row.append(avatar,content);thread.append(row);
    });
    return thread;
  }
  function outlineCard(report) {
    const outline=fold('文章大纲');
    const ol=make('ol','ph-chapters');
    report.outline.forEach(chapter=>{
      const line=make('li'),label=typeof chapter==='string'?chapter:chapter?.title;
      if(!label) return;
      line.append(make('strong','',label));
      if(Array.isArray(chapter.children)&&chapter.children.length) {
        const ul=make('ul');chapter.children.forEach(v=>ul.append(make('li','',typeof v==='string'?v:v.title)));line.append(ul);
      }
      ol.append(line);
    });
    outline.append(ol);return outline;
  }
  function planCard(steps) {
    const plan=fold('执行计划'),ol=make('ol','ph-plan');
    steps.forEach(step=>{
      const text=typeof step==='string'?step:step?.title;
      if(!text)return;
      const li=make('li');li.append(make('strong','',text));
      if(step.detail) li.append(make('p','',step.detail));ol.append(li);
    });
    plan.append(ol);return plan;
  }
  window.renderProcessHistory=(container, report, controls)=>{
    const wrap=make('div','ph-history');
    const notes=Array.isArray(report.history)?report.history:[];
    if(notes.length)wrap.append(messages(notes));
    else wrap.append(make('p','ph-muted','此会话未保留沟通记录。'));
    if(Array.isArray(report.outline)&&report.outline.length)wrap.append(outlineCard(report));
    if(Array.isArray(report.steps)&&report.steps.length)wrap.append(planCard(report.steps));
    const card=make('div','ph-file'), opener=action('',controls.openReport,'ph-file-open');
    opener.append(make('small','','报告正文'),make('strong','',report.title));
    if(report.date){const date=new Date(report.date);if(!isNaN(date))opener.append(make('time','',date.toLocaleString('zh-CN',{hour12:false})));}
    const formats=fold('下载');formats.classList.add('ph-file-menu');
    formats.querySelector('summary').classList.add('ph-download');
    const opts=make('div','ph-file-options');
    for(const [label,format] of [['Word 文档（.docx）','docx'],['PDF 文档（.pdf）','pdf']]){
      opts.append(action(label,()=>{formats.open=false;controls.downloadReport(format);}));
    }
    formats.append(opts);card.append(opener,formats);wrap.append(card);container.replaceChildren(wrap);
  };
})();
