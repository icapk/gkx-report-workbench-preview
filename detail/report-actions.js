(() => {
  'use strict';
  const libraryBase = new URL('vendor/', document.currentScript?.src || location.href);
  const libraries = new Map();
  let editor, title, sources, changed, storagePrefix, original, dialog, body, footer, menu, selectionBar, selectedRange;
  let lastInvoker, messageBox, messageTimer, sessionId, revision, created;
  const node = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value != null) el.textContent = value;
    return el;
  };
  function button(label, handler, cls = 'ra-button') {
    const el = node('button', cls, label);
    el.type = 'button'; el.addEventListener('click', handler);
    return el;
  }
  function loadLibrary(file, name) {
    if (window[name]) return Promise.resolve(window[name]);
    if (!libraries.has(file)) {
      libraries.set(file, new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(file, libraryBase).href;
        script.onload = () => resolve(window[name]);
        script.onerror = () => { libraries.delete(file); reject(Error('本地组件未加载，请重新打开预览。')); };
        document.head.append(script);
      }));
    }
    return libraries.get(file);
  }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(storagePrefix + key)) ?? fallback; }
    catch { return fallback; }
  }
  function write(key, value) {
    localStorage.setItem(storagePrefix + key, JSON.stringify(value));
  }
  function notify(msg) {
    messageBox ||= node('div', 'ra-toast');
    messageBox.setAttribute('role','status'); messageBox.textContent = msg;
    (dialog?.open ? dialog : document.body).append(messageBox);
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => messageBox.remove(), 2800);
  }
  function removeMenu() { menu?.remove(); menu = null; }
  function dismiss() {
    if (dialog?.open) dialog.close();
    dialog?.remove(); dialog = null;
    if (lastInvoker?.isConnected) lastInvoker.focus({preventScroll:true});
  }
  function modal(name, {wide = false, onCancel = dismiss} = {}) {
    removeMenu(); hideSelection(); dialog?.remove();
    dialog = node('dialog', 'ra-dialog' + (wide ? ' ra-wide' : ''));
    dialog.setAttribute('aria-label', name);
    const header = node('header', 'ra-head');
    const close = button('×', onCancel, 'ra-close'); close.setAttribute('aria-label','关闭');
    header.append(node('h2', '', name), close);
    body = node('div', 'ra-body'); footer = node('footer', 'ra-foot');
    dialog.append(header, body, footer); document.body.append(dialog); dialog.showModal();
    dialog.addEventListener('cancel', e => { e.preventDefault(); onCancel(); });
    dialog.addEventListener('click', e => { if (e.target === dialog) {
      const r=dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onCancel();
    } });
    return dialog;
  }
  function keepReportFormatting(element) {
    const {fontFamily, fontSize, lineHeight, textAlign} = element.style;
    element.removeAttribute('style');
    if (!element.matches('h1,h2,h3,p,td,th')) return;
    const families = fontFamily.split(',').map(name => name.trim().replace(/^["']|["']$/g, ''));
    if (families.length && families.every(name => /^[A-Za-z\u3400-\u9fff][A-Za-z0-9 \u3400-\u9fff-]{0,48}$/.test(name))) {
      element.style.fontFamily = fontFamily;
    }
    const size = /^(\d+(?:\.\d+)?)(pt|px)$/.exec(fontSize);
    const pixels = size ? Number(size[1]) * (size[2] === 'pt' ? 4/3 : 1) : 0;
    if (pixels >= 1 && pixels <= 200) element.style.fontSize = fontSize;
    if (/^\d+(?:\.\d+)?$/.test(lineHeight) && Number(lineHeight) >= 0.1 && Number(lineHeight) <= 10) element.style.lineHeight = lineHeight;
    if (['left','center','right','justify'].includes(textAlign)) element.style.textAlign = textAlign;
  }
  function sanitiseHTML(html) {
    const temp = document.createElement('template'); temp.innerHTML = html;
    const allowed=new Set('h1 h2 h3 h4 h5 h6 p br hr div span small strong b em i u s sub sup ul ol li blockquote table caption colgroup col thead tbody tfoot tr th td figure figcaption img a button pre code dl dt dd'.split(' '));
    temp.content.querySelectorAll('script,style,iframe,object,embed,link,form,svg,math,template').forEach(el=>el.remove());
    for (const el of [...temp.content.querySelectorAll('*')]) {
      if(!allowed.has(el.localName)){el.replaceWith(...el.childNodes);continue;}
      for (const attr of [...el.attributes]) {
        const {name,value}=attr;
        if (name === 'style') { keepReportFormatting(el); continue; }
        if(['alt','title','rowspan','colspan','data-source','aria-label','start'].includes(name)) continue;
        if (name==='src' && el.localName==='img') {
          try { const url=new URL(value,document.baseURI);
            if ((url.origin===location.origin && ['http:','https:'].includes(url.protocol)) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) continue;
          } catch {}
        }
        if (name==='href' && el.localName==='a') {
          try { const url=new URL(value,document.baseURI); if(['https:','http:'].includes(url.protocol))continue; } catch {}
        }
        el.removeAttribute(name);
      }
      if(el.localName==='img'&&!el.hasAttribute('src')){el.replaceWith(document.createTextNode(el.alt||''));continue;}
      if(el.localName==='button'){el.type='button';el.contentEditable='false';}
    }
    return temp.innerHTML;
  }
  function preview(html) {
    const box = node('article','ra-preview'); box.innerHTML = sanitiseHTML(html);
    box.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    return box;
  }
  function timeLabel(value) { const date=new Date(value); return value && !isNaN(date) ? date.toLocaleString('zh-CN',{hour12:false}) : '未记录'; }
  function versions() { return read('versions', [{name:'原始版本', date:created, html:original}]); }
  function saveVersion() {
    const history = versions(); const name = 'V' + history.length;
    history.push({name,date:new Date().toISOString(),html:editor.innerHTML});
    write('versions',history); write('currentVersion',name); notify('已创建版本 ' + name);
  }
  function listVersions() {
    modal('版本管理');
    body.append(node('p','ra-hint','查看本轮报告的历史保存记录，支持预览或恢复到指定版本。'),node('h3','ra-section-label','版本记录'));
    const current = read('currentVersion','原始版本');
    for (const record of versions().reverse()) {
      const row = node('div','ra-version-row'), info = node('div');
      const heading = node('div','ra-ver-title');
      heading.append(node('b','',record.name),node('span',record.name === current ? 'ra-current' : 'ra-past',record.name === current ? '当前' : '历史'));
      info.append(heading,node('small','','更新时间 ' + timeLabel(record.date)));
      const actions = node('div','ra-row-actions'); actions.append(button('预览',() => {
        modal('版本预览 · ' + record.name,{wide:true}); body.append(preview(record.html)); footer.append(button('返回版本管理',listVersions));
      },'ra-link'));
      actions.append(button('恢复',()=> {
        modal('恢复版本'); body.append(node('p','','将当前报告正文恢复为「' + record.name + '」的内容。'));
        footer.append(button('取消',listVersions),button('确认恢复',() => {
          try {
            const restored = sanitiseHTML(record.html);
            write('currentVersion',record.name); editor.innerHTML = restored;
            editor.dispatchEvent(new Event('input',{bubbles:true})); dismiss(); notify('已恢复至' + record.name);
          } catch { notify('恢复失败，请检查浏览器存储空间后重试。'); }
        },'ra-primary'));
      },'ra-link'));
      row.append(info, actions); body.append(row);
    }
  }
  function sourceName(id) {
    const value = sources?.[id-1];
    return (typeof value === 'string' ? value : value?.title || value?.name) || '系统素材 ' + id;
  }
  function showSource(anchor) {
    const key=String(anchor?.dataset.source || '');
    const entry=sources.find(source=>typeof source==='object'&&String(source.id)===key) || sources[Number(key)-1];
    modal('数据来源');
    if(!entry){body.append(node('p','ra-hint','此引用未附来源记录。'));return;}
    const label=typeof entry==='string'?entry:entry.title||entry.name;
    body.append(node('h3','ra-source-title',label || '引用材料'));
    if(typeof entry==='object') {
      for(const value of [entry.location,entry.excerpt||entry.text||entry.summary]) {
        if(typeof value==='string' && value.trim())body.append(node('p','',value));
      }
    }
    footer.append(button('关闭',dismiss));
  }
  function savedCopies(catalog) {
    return catalog.flatMap(lib=>lib.files.filter(f=>f.reportSessionId===sessionId).map(file=>({lib:lib.name,file})))
      .sort((a,b)=>b.file.added-a.file.added);
  }
  function wordCopyHTML(name) {
    const snapshot=preview(editor.innerHTML);
    const heading=snapshot.querySelector('h1');
    if (heading) heading.textContent=name;
    return snapshot.innerHTML;
  }
  async function knowledge(draft={name:title.slice(0,80),query:'',selected:''}) {
    const host=modal('保存至知识库'); dialog.classList.add('ra-kb-dialog');
    body.append(node('p','ra-hint','正在读取知识库…'));
    const kb=await import('../assets/knowledge-library.js?v=3d7584b85b8c');
    const catalog=await kb.listCollections();
    if(!host.isConnected) return;
    body.replaceChildren();
    const label=node('label','ra-label ra-required','报告名称'); label.htmlFor='ra-kb-report';
    const nameWrap=node('div','ra-kb-name'), name=node('input','ra-field'), count=node('small','ra-kb-counter');
    name.id='ra-kb-report'; name.required=true; name.maxLength=80; name.value=draft.name;
    nameWrap.append(name,count);
    const group=node('fieldset','ra-kb-group'), legend=node('legend','ra-label ra-required','目标知识库');
    const tools=node('div','ra-kb-tools'), query=node('input','ra-field');
    query.type='search';query.placeholder='搜索知识库名称';query.setAttribute('aria-label','搜索知识库名称');query.value=draft.query;
    tools.append(query,button('新建知识库',()=>newLibrary(draft)));
    const list=node('div','ra-kb-options');
    group.append(legend,tools,list);
    const hint=node('p','ra-hint ra-kb-copy-hint'); body.append(label,nameWrap,group,hint);
    let busy=false;
    const records=savedCopies(catalog);
    const confirm=button('确认保存',async()=>{
      if(busy || confirm.disabled) return;
      const copyName=draft.name.trim(), libraryId=draft.selected, host=dialog;
      busy=true; confirm.disabled=true; confirm.textContent='保存中…';
      try {
        const html=wordCopyHTML(copyName);
        const file=await wordBlob(html,copyName);
        const target=(await kb.listCollections()).find(lib=>lib.id===libraryId);
        if(!target) throw Error('目标知识库已变更，请重新选择。');
        const fileName=copyName+'.docx';
        const error=kb.checkBatch(target.files.length,[{name:fileName,size:file.size}]);
        if(error) throw Error(error);
        if(!host.isConnected) return;
        const snapshot=preview(html), text=snapshot.textContent || '';
        const entry={id:crypto.randomUUID(),name:fileName,blob:file,size:file.size,source:'我的创作任务',text,status:'已解析',
          added:Date.now(),reportSessionId:sessionId,reportRevision:revision,reportTitle:copyName,reportHTML:html};
        await kb.persist({...target,files:[...target.files,entry]});
        if(host.isConnected){await knowledgeList();notify('已保存至'+target.name);}
      } catch(e) {
        if(host.isConnected) notify(e?.message || '副本保存失败，请检查本地空间后重试。');
      } finally { busy=false; confirm.textContent='确认保存'; updateForm(); }
    },'ra-primary');
    function updateForm() {
      count.textContent=name.value.length+' / 80';
      hint.textContent='保存后将以「'+(draft.name.trim()||'报告名称')+'.docx」生成当前报告的 Word 独立副本。';
      confirm.disabled=busy || !draft.name.trim() || !draft.selected;
    }
    function renderOptions() {
      list.replaceChildren();
      const matches=catalog.filter(lib=>lib.name.toLocaleLowerCase().includes(draft.query.trim().toLocaleLowerCase()));
      if(!matches.length) list.append(node('div','ra-kb-empty',catalog.length?'未找到匹配的知识库':'暂无知识库，可先新建知识库。'));
      for(const lib of matches) {
        const copies=lib.files;
        const updated=copies.reduce((date,copy)=>Math.max(date,copy.added||0),lib.created);
        const row=node('label','ra-kb-option'),radio=node('input'); radio.type='radio';radio.name='ra-kb-library';radio.value=lib.id;
        radio.checked=draft.selected===lib.id;
        const info=node('span','ra-kb-info');info.append(node('strong','',lib.name));
        if (lib.summary) info.append(node('span','ra-kb-note',lib.summary));
        info.append(node('small','','本地文档 '+copies.length+' 份 · 更新于 '+timeLabel(updated)));
        radio.addEventListener('change',()=>{draft.selected=lib.id;updateForm();});
        row.append(radio,info); list.append(row);
      }
    }
    name.addEventListener('input',()=>{draft.name=name.value;updateForm();});
    query.addEventListener('input',()=>{
      draft.query=query.value;
      if(!catalog.find(lib=>lib.id===draft.selected)?.name.toLocaleLowerCase().includes(draft.query.trim().toLocaleLowerCase())) draft.selected='';
      renderOptions();updateForm();
    });
    renderOptions();updateForm();
    if(records.length) body.append(button('查看已保存的报告（'+records.length+'）',knowledgeList,'ra-link'));
    footer.append(button('取消',dismiss),confirm);
  }
  function newLibrary(draft) {
    const back=()=>knowledge(draft);
    modal('新建知识库',{onCancel:back});
    const nameLabel=node('label','ra-label ra-required','知识库名称'), name=node('input','ra-field');
    name.id='ra-library-name';name.maxLength=120;nameLabel.htmlFor=name.id;name.required=true;name.placeholder='请输入知识库名称';
    const noteLabel=node('label','ra-label','内容简述'), note=node('textarea','ra-field');
    note.id='ra-library-note';noteLabel.htmlFor=note.id;note.placeholder='请输入内容简述';
    const error=node('p','ra-kb-error');error.setAttribute('role','alert');
    let creating=false;
    const create=button('创建知识库',async()=>{
      const value=name.value.trim(); if(!value || creating) return;
      creating=true; create.disabled=true;
      try {
        const kb=await import('../assets/knowledge-library.js?v=3d7584b85b8c');
        const catalog=await kb.listCollections();
        if(catalog.some(lib=>lib.name.toLocaleLowerCase()===value.toLocaleLowerCase())) { error.textContent='该知识库名称已存在';name.focus();return; }
        const id=crypto.randomUUID();await kb.persist({id,version:0,created:Date.now(),name:value,summary:note.value.trim(),files:[]});
        draft.query=''; draft.selected=id; await knowledge(draft);notify('已创建知识库');
      } catch {error.textContent='知识库未能保存，请检查本地存储空间后重试。';}
      finally {creating=false;create.disabled=!name.value.trim();}
    },'ra-primary');
    create.disabled=true;name.addEventListener('input',()=>{create.disabled=!name.value.trim();error.textContent='';});
    body.append(nameLabel,name,noteLabel,note,error);footer.append(button('取消',back),create);name.focus();
  }
  async function knowledgeList() {
    const host=modal('已保存的报告'),kb=await import('../assets/knowledge-library.js?v=3d7584b85b8c');
    const records=savedCopies(await kb.listCollections());if(!host.isConnected)return;
    if(!records.length)body.append(node('p','ra-hint','此会话暂无已保存的副本。'));
    for (const {lib,file} of records) {
      const row=node('div','ra-version-row'),info=node('div');info.append(node('b','',file.reportTitle),node('small','',lib+' · '+timeLabel(file.added)));
      const group=node('div','ra-row-actions');
      group.append(button('预览',()=>{
        modal(file.reportTitle,{wide:true});body.append(preview(file.reportHTML));footer.append(button('返回',knowledgeList));
      },'ra-link'),button('下载',()=>download(file.blob,file.name),'ra-link'));
      row.append(info,group);body.append(row);
    }
  }
  function download(blob, filename) {
    const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=filename;
    document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),45000);
  }
  async function copyReport() {
    const text=editor.innerText;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const field=node('textarea'); field.value=text; field.className='ra-clipboard'; document.body.append(field);
      field.select(); const copied=document.execCommand('copy'); field.remove(); if(!copied) throw Error('复制失败，请选中正文后复制。');
    }
    notify('已复制报告正文');
  }
  function exportRoot(html) {
    const paper=preview(html); paper.classList.add('ra-export');
    const refs=node('div','ra-references');
    const hasSourceSection=[...paper.querySelectorAll('h1,h2,h3,h4,strong')].some(el=>el.textContent.trim()==='数据来源与参考文献');
    const names=(sources||[]).map((_,i)=>sourceName(i+1));
    if (names.length && !(hasSourceSection && names.every(name=>paper.textContent.includes(name)))) {
      const label=node('p'); label.append(node('strong','','数据来源与参考文献')); refs.append(label);
      names.forEach((name,i)=>refs.append(node('p','',(i+1)+'. '+name)));
      paper.append(refs);
    }
    document.body.append(paper); return paper;
  }
  async function imageBytes(element) {
    const image=element.tagName==='IMG'?element:element.querySelector('img');
    let canvas;
    if(image) {
      await image.decode();
      canvas=document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
      canvas.getContext('2d').drawImage(image,0,0);
    } else {
      const raster = await loadLibrary('html-to-image.js','htmlToImage');
      canvas=await raster.toCanvas(element,{pixelRatio:1.3,backgroundColor:'#ffffff',skipFonts:true});
    }
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图表转换失败。')),'image/png'));
    return {bytes:new Uint8Array(await blob.arrayBuffer()), ratio:canvas.height/canvas.width};
  }
  async function wordBlob(html, documentTitle) {
    const D=await loadLibrary('docx.js','docx'); const paper=exportRoot(html);
    try {
      function runs(element,styles = {}) {
        if(element.nodeType===Node.TEXT_NODE) return [new D.TextRun({text:element.nodeValue,...styles})];
        if(element.nodeType!==Node.ELEMENT_NODE) return [];
        if(element.tagName==='BR') return [new D.TextRun({break:1})];
        const next={...styles}; if(/^(STRONG|B)$/.test(element.tagName)) next.bold=true; if(/^(EM|I)$/.test(element.tagName)) next.italics=true;
        if(element.tagName==='U') next.underline={};
        if(element.tagName==='SUP' || element.matches('[data-source]')) {next.superScript=true;next.color='3862D8';}
        return [...element.childNodes].flatMap(c=>runs(c,next));
      }
      function formattedParagraph(el) {
        const {fontFamily, fontSize, lineHeight, textAlign} = el.style;
        const run = {};
        const font = fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
        if (font) run.font = font;
        if (fontSize) run.size = Math.round(parseFloat(fontSize) * (fontSize.endsWith('px') ? 1.5 : 2));
        if (el.tagName === 'TH') run.bold = true;
        const paragraph = {children:runs(el, run)};
        if (/^H[1-6]$/.test(el.tagName)) paragraph.heading = D.HeadingLevel['HEADING_' + el.tagName[1]];
        if (textAlign) paragraph.alignment = textAlign === 'justify' ? D.AlignmentType.BOTH : textAlign;
        if (lineHeight) paragraph.spacing = {line:Math.round(240 * Number(lineHeight)), lineRule:D.LineRuleType.AUTO};
        return new D.Paragraph(paragraph);
      }
      async function blocks(element) {
        let children=[];
        for(const el of [...element.children]) {
          const tag=el.tagName, heading=/^H[1-6]$/.test(tag);
          if (tag==='TABLE') {
            const rows=[...el.rows].map(r=>new D.TableRow({children:[...r.cells].map(c=>new D.TableCell({children:[formattedParagraph(c)]}))}));
            if(rows.length) children.push(new D.Table({rows,width:{size:100,type:D.WidthType.PERCENTAGE}}));
          } else if (tag==='OL'||tag==='UL') {
            [...el.children].forEach((item,i)=>children.push(new D.Paragraph({children:[new D.TextRun(tag==='OL'?(i+1)+'. ':'• '),...runs(item)]})));
          } else if (el.matches('figure,svg,img,canvas,.chart') || (tag==='P'&&el.querySelector('img,svg,canvas'))) {
            const target=el.matches('figure,.chart')?el:(el.querySelector('img,svg,canvas')||el);
            const {bytes,ratio}=await imageBytes(target); const w=550;
            children.push(new D.Paragraph({children:[new D.ImageRun({type:'png',data:bytes,transformation:{width:w,height:Math.round(w*ratio)}})]}));
            const caption = el.tagName === 'FIGURE' && el.querySelector('img') && el.querySelector('figcaption');
            if (caption) children.push(new D.Paragraph({children:runs(caption),alignment:D.AlignmentType.CENTER}));
          } else if (heading || ['P','BLOCKQUOTE','LI'].includes(tag)) {
            children.push(formattedParagraph(el));
          } else if (el.children.length && el.querySelector('p,table,h1,h2,h3,figure,svg,img,ol,ul,div')) children.push(...await blocks(el));
          else if(el.textContent.trim()) children.push(new D.Paragraph({children:runs(el)}));
        }
        return children;
      }
      const doc=new D.Document({title:documentTitle,creator:'智能报告创作',styles:{default:{document:{run:{font:'Microsoft YaHei',size:22}}}},sections:[{children:await blocks(paper)}]});
      return await D.Packer.toBlob(doc);
    } finally { paper.remove(); }
  }
  async function makeWord(html = editor.innerHTML, documentTitle = title) {
    const blob=await wordBlob(html,documentTitle); download(blob,documentTitle+'.docx'); notify('已生成 Word 文档');
  }
  async function capturePages() {
    const raster=await loadLibrary('html-to-image.js','htmlToImage'), paper=exportRoot(editor.innerHTML);
    try {
      await Promise.all([...paper.querySelectorAll('img')].map(img=>img.decode?.().catch(()=>{}))); await document.fonts?.ready;
      const width=paper.clientWidth, pageHeight=Math.round(width*297/210), margin=52;
      const content=pageHeight-margin*2, height=paper.scrollHeight, scale=1.4;
      const lines=[], walker=document.createTreeWalker(paper,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const range=document.createRange(); range.selectNodeContents(walker.currentNode);
        for(const r of range.getClientRects()) if(r.height) lines.push({top:r.top-paper.getBoundingClientRect().top,bottom:r.bottom-paper.getBoundingClientRect().top});
      }
      for(const el of paper.querySelectorAll('figure,svg,img,tr')) {
        const r=el.getBoundingClientRect(), top=r.top-paper.getBoundingClientRect().top;
        if(r.height < content) lines.push({top,bottom:top+r.height});
      }
      const whole=await raster.toCanvas(paper,{width,height,pixelRatio:scale,backgroundColor:'#ffffff',skipFonts:true,
        style:{position:'static',left:'auto',top:'auto',margin:'0',opacity:'1',overflow:'visible'}});
      const ratio=whole.width/width, pages=[];
      for(let y=0; y<height-1;) {
        let cut=Math.min(y+content,height);
        if(cut < height) {
          let old;
          do {
            old=cut;
            for(const r of lines) if(r.top < cut-0.5 && r.bottom > cut && r.top > y+36) cut=Math.floor(r.top);
          } while(old!==cut);
        }
        const canvas=document.createElement('canvas'); canvas.width=whole.width; canvas.height=Math.round(pageHeight*ratio);
        const ctx=canvas.getContext('2d'); ctx.fillStyle='white'; ctx.fillRect(0,0,canvas.width,canvas.height);
        const a=Math.round(y*ratio), b=Math.round(cut*ratio);
        ctx.drawImage(whole,0,a,whole.width,b-a,0,Math.round(margin*ratio),whole.width,b-a);
        pages.push(canvas); y=cut;
      }
      return pages;
    } finally { paper.remove(); }
  }
  function pdfFromPages(pages) {
    const enc=new TextEncoder(), parts=[], offsets=[0]; let size=0;
    const add=v=>{const b=typeof v==='string'?enc.encode(v):v;parts.push(b);size+=b.length;};
    const obj=(id,fn)=>{offsets[id]=size;add(id+' 0 obj\n');fn();add('\nendobj\n');};
    add('%PDF-1.4\n');
    obj(1,()=>add('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2,()=>add('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
    pages.forEach((canvas,i)=>{
      const id=3+i*3, jpg=atob(canvas.toDataURL('image/jpeg',0.93).split(',')[1]), bytes=Uint8Array.from(jpg,c=>c.charCodeAt(0));
      obj(id,()=>add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /PageImage '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>'));
      obj(id+1,()=>{add('<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n');add(bytes);add('\nendstream');});
      const draw='q 595.28 0 0 841.89 0 0 cm /PageImage Do Q\n';
      obj(id+2,()=>add('<< /Length '+draw.length+' >>\nstream\n'+draw+'endstream'));
    });
    const xref=size;add('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
    offsets.slice(1).forEach(n=>add(String(n).padStart(10,'0')+' 00000 n \n'));
    add('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');return new Blob(parts,{type:'application/pdf'});
  }
  async function makePDF() {
    notify('正在生成 PDF…'); const pages=await capturePages(); download(pdfFromPages(pages),title+'.pdf'); notify('已生成 PDF 文档');
  }
  function hideSelection() { selectionBar?.remove(); selectionBar=null; }
  function showSelection() {
    hideSelection(); if(dialog?.open) return;
    const selection=getSelection();
    if(!selection?.rangeCount || selection.isCollapsed) return;
    const range=selection.getRangeAt(0);
    if(!editor.contains(range.startContainer)||!editor.contains(range.endContainer)||!selection.toString().trim()) return;
    selectedRange=range.cloneRange();
    const box=range.getBoundingClientRect(); selectionBar=node('div','ra-selection'); selectionBar.setAttribute('aria-label','选中文字操作');
    selectionBar.addEventListener('mousedown',e=>e.preventDefault());
    for(const [text,command] of [['加粗','bold'],['斜体','italic'],['下划线','underline']]){
      const b=button(text,()=>{const s=getSelection();s.removeAllRanges();s.addRange(selectedRange);document.execCommand(command);hideSelection();},'ra-selection-btn');selectionBar.append(b);
    }
    selectionBar.append(button('AI改写',()=>rewrite(selectedRange.cloneRange()),'ra-selection-btn ra-rewrite-btn'));
    document.body.append(selectionBar);
    const width=selectionBar.offsetWidth; selectionBar.style.left=Math.max(8,Math.min(innerWidth-width-8,box.left))+'px';
    selectionBar.style.top=(box.top>52?box.top-43:Math.min(innerHeight-50,box.bottom+5))+'px';
  }
  function rewrite(range) {
    const before=range.toString(); modal('局部改写');
    const excerpt=node('blockquote','ra-quote',before); const label=node('label','ra-label','改写指令');
    const instruction=node('textarea','ra-field');instruction.id='ra-instruction';instruction.placeholder='请输入优化文本的指令';label.htmlFor=instruction.id;
    body.append(excerpt,label,instruction);
    const note=node('p','ra-hint','本地演示可精简表述，或输入“改为：新文本”指定替换内容。');body.append(note);
    footer.append(button('取消',dismiss),button('生成改写',()=>{
      const directive=instruction.value.trim(); if(!directive){instruction.focus();notify('请输入优化文本的指令');return;}
      const explicit=directive.match(/^(?:替换[成为]|改[成为]|写成|替换为)[：:\s]*(.+)$/s);
      const shorter=before.replace(/^(?:本报告|本节)(?:以|将)?/,'').replace(/(?:数据显示[，,]?|需要说明的是[，,]?|总体来看[，,]?|从走势看[，,]?)/g,'').trim();
      let proposal=explicit?.[1] || shorter;
      if(!explicit && proposal===before) {const first=before.indexOf('。'); if(first>7 && first<before.length-1) proposal=before.slice(0,first+1);}
      modal('改写结果'); body.append(node('h3','ra-section-label','原文'),node('blockquote','ra-quote',before));
      const result=node('textarea','ra-field ra-result'); result.value=proposal;const resultLabel=node('label','ra-label','改写结果（可编辑）');result.id='ra-result';resultLabel.htmlFor=result.id;body.append(resultLabel,result);
      if(proposal===before) body.append(node('p','ra-hint','本地示例保留了原句，可在上方编辑后替换。'));
      footer.append(button('取消',dismiss),button('替换原文',()=>{
        if(!result.value.trim()){notify('改写结果不能为空');return;}
        if(!editor.contains(range.commonAncestorContainer)||range.toString()!==before){notify('选中的内容已变化，请重新选择。');return;}
        const resultText=result.value; dismiss(); const sel=getSelection(); sel.removeAllRanges();sel.addRange(range);
        editor.focus({preventScroll:true}); document.execCommand('insertText',false,resultText); hideSelection();notify('已替换选中文本');
      },'ra-primary'));
    },'ra-primary'));
    instruction.focus();
  }
  function downloadMenu(anchor) {
    if(menu){removeMenu();return;}
    menu=node('div','ra-menu');menu.setAttribute('role','menu');
    for(const [label,key] of [['Word 文档（.docx）','docx'],['PDF 文档（.pdf）','pdf']]){
      const b=button(label,()=>{removeMenu();run(key,anchor);},'ra-menu-item'); b.setAttribute('role','menuitem');menu.append(b);
    }
    document.body.append(menu);
    const rect=anchor?.getBoundingClientRect()||{left:innerWidth/2,bottom:60,top:60};
    menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,rect.left))+'px';
    menu.style.top=(rect.bottom+menu.offsetHeight+8<innerHeight?rect.bottom+5:rect.top-menu.offsetHeight-5)+'px';menu.firstChild.focus({preventScroll:true});
  }
  async function run(action, anchor) {
    if(anchor)lastInvoker=anchor;
    if(action!=='download') removeMenu();
    try{
      switch(action){
        case 'copy':return await copyReport();
        case 'download':return downloadMenu(anchor);
        case 'docx':return await makeWord();
        case 'pdf':return await makePDF();
        case 'new-version':return saveVersion();
        case 'versions':return listVersions();
        case 'knowledge':return await knowledge();
        case 'source':return showSource(anchor);
      }
    } catch(e){notify(e.name==='QuotaExceededError'?'浏览器存储空间不足，请释放空间后重试。':e.message||'操作未完成，请重试。');}
  }
  function init(options) {
    editor=options.editor;title=options.title;sources=options.sources||[]; changed=options.onChange;
    sessionId=options.sessionId;revision=options.revision;created=options.date;
    storagePrefix='gkx-writing-detail:versions:v1:'+JSON.stringify([sessionId,revision])+':';original=editor.innerHTML;
    if(!read('baseline',null)){try{write('baseline',original);}catch{}}
    else original=read('baseline',original);
    editor.addEventListener('input',e=>{hideSelection();changed?.(e);});
    editor.addEventListener('mouseup',showSelection);
    editor.addEventListener('keyup',e=>{if(e.shiftKey) showSelection();else if(e.key==='Escape') hideSelection();});
    document.addEventListener('pointerdown',e=>{
      if(menu&&!menu.contains(e.target)&&!lastInvoker?.contains(e.target))removeMenu();
      if(selectionBar&&!selectionBar.contains(e.target)&&!editor.contains(e.target))hideSelection();
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){removeMenu();hideSelection();}});
    document.addEventListener('scroll',e=>{if(!selectionBar?.contains(e.target))hideSelection();if(menu)removeMenu();},true);
    window.addEventListener('resize',()=>{removeMenu();hideSelection();});
  }
  window.reportActions={init,run,notify,safeHTML:sanitiseHTML};
})();
