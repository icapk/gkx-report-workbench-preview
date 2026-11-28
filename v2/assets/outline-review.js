import { readLocal } from './knowledge-library.js?v=be5b8a530cde';
import { createPlaceholderEditor, placeholderKinds, validatePlaceholder } from './outline-placeholders.js?v=6bd7c0cf42c6';

const defaults = {font:'微软雅黑', size:15, lineHeight:1.8, align:'left'};
const fonts = ['微软雅黑', '宋体', '黑体', '楷体', '仿宋', 'Arial', 'Times New Roman'];
const alignments = [['left', '左对齐'], ['center', '居中'], ['right', '右对齐'], ['justify', '两端对齐']];
const chapterType = row => row.kind || (['摘要', '结语'].includes(row.title) ? row.title : '正文');
const newId = () => crypto.randomUUID();

function patchOutlineItem(item, changes) {
  const next = {...item, ...changes};
  if (changes.skillSnapshot === null) delete next.skillSnapshot;
  return next;
}

function spliceMove(list, from, to) {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
function writeFiles(operation, mode = 'readwrite') {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gkx.v2.outline.materials', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('files', mode);
      const result = operation(tx.objectStore('files'));
      tx.oncomplete = () => { db.close(); resolve(result?.result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

export function createOutlineReview(React) {
  const h = React.createElement;
  const PlaceholderEditor = createPlaceholderEditor(React);
  const path = {
    grip:'M7 4h.01M13 4h.01M7 8h.01M13 8h.01M7 12h.01M13 12h.01M7 16h.01M13 16h.01',
    down:'m5 7.5 5 5 5-5', up:'m5 12.5 5-5 5 5', plus:'M10 4v12M4 10h12',
    remove:'M4 5.5h12M8 5.5V3.8h4v1.7M6.1 5.5l.6 10h6.6l.6-10M8.7 8v5M11.3 8v5',
    file:'M5 2.5h7l3 3V17H5zM11.5 2.5V6H15', close:'m5 5 10 10m0-10L5 15'
  };
  function icon(name) {
    return h('svg',{viewBox:'0 0 20 20',width:16,height:16,fill:'none',stroke:'currentColor',strokeWidth:name==='grip'?2.6:1.55,
      strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:path[name]}));
  }
  function tool(label, image, handler, disabled = false) {
    return h('button',{type:'button',className:'outline-icon',title:label,'aria-label':label,onClick:handler,disabled},icon(image));
  }
  function Advanced({value, onChange, blockLabel, skill, inheritedLabel, inheritedNames = [], onSkillChange}) {
    const catalog = window.WorkbenchSkills.catalog;
    const selected = skill && catalog.find(item=>item.id===skill.skill_id);
    const selectedName = skill?.name || selected?.name;
    const defaultLabel = [inheritedLabel, inheritedNames.join('、')].filter(Boolean).join(' · ');
    function chooseSkill(event) {
      const choice = catalog.find(item=>item.id===event.target.value);
      const snapshot = choice ? window.WorkbenchSkills.taskSkillFields([choice.name]).skillSnapshots[0] : null;
      onSkillChange(snapshot);
    }
    const style = {...defaults, ...value};
    function field(label, key, input) {
      const options = {'aria-label':label,value:style[key],onChange:e=>onChange({...style,[key]:e.target.value})};
      return h('label',null,label,input(options));
    }
    return h('details',{className:'outline-advanced'},h('summary',null,icon('down'),onSkillChange ? '高级配置' : '标题样式',
      selectedName && h('span',{className:'outline-assigned-skill',title:selectedName},'Skill · '+selectedName)),
      onSkillChange && h('label',{className:'outline-skill-field'},'写作 Skill',
        h('select',{'aria-label':blockLabel+'写作 Skill',value:skill?.skill_id || '',onChange:chooseSkill},
          h('option',{value:''},defaultLabel),
          skill?.skill_id && !selected && h('option',{value:skill.skill_id},selectedName || skill.skill_id),
          catalog.map(entry=>h('option',{value:entry.id,key:entry.id},entry.name))),
        selected?.description && h('span',{className:'outline-skill-description'},selected.description)),
      h('fieldset',null,h('legend',null,'文本样式'),
        field('字体','font',props=>h('select',props,fonts.map(v=>h('option',{key:v},v)))),
        field('字号（px）','size',props=>h('input',{...props,type:'number',min:1,max:200,step:1})),
        field('行高','lineHeight',props=>h('input',{...props,type:'number',min:0.1,max:10,step:0.1})),
        field('对齐','align',props=>h('select',props,alignments.map(([v,label])=>h('option',{key:v,value:v},label))))));
  }
  function MaterialUpload({settings, attachments, change, setBusy}) {
    const [notice,setNotice] = React.useState('');
    const [dragActive,setDragActive] = React.useState(false);
    const busy = React.useRef(false);
    const attached = settings.files || [];
    const current = React.useRef(null);
    current.current = {settings,change};
    const mounted = React.useRef(true);
    React.useEffect(()=>{mounted.current=true; return ()=>{mounted.current=false;};},[]);
    async function upload(selected) {
      const batch = [...selected];
      if (!batch.length || busy.current) return;
      const known = [...attachments, ...attached];
      const names = new Set(known.map(file=>file.name));
      let warning = '';
      if (known.length + batch.length > 10) warning = '每个任务最多绑定 10 个文件。';
      for (const file of batch) {
        if (warning) break;
        if (!/\.(pdf|docx)$/i.test(file.name)) warning = '请选择 PDF 或 Word（.docx）文件。';
        else if (file.size > 5*1024*1024) warning = '单个文件不能超过 5 MB。';
        else if (names.has(file.name)) warning = '已存在同名文件：'+file.name;
        names.add(file.name);
      }
      setNotice(warning);
      if (warning) return;
      busy.current = true; setBusy(true);
      try {
        const parsed = await Promise.all(batch.map(readLocal));
        if (!mounted.current) return;
        await writeFiles(store=>{parsed.forEach(file=>store.put(file.blob,file.id));});
        if (!mounted.current) { await writeFiles(store=>{parsed.forEach(file=>store.delete(file.id));}); return; }
        const items = parsed.map(({id,name,size,blob,text,status})=>({id,name,size,type:blob.type,source:'outline',text:text.slice(0,8000),truncated:text.length>8000,status}));
        const {settings:latest,change:update} = current.current;
        update({...latest,files:[...(latest.files || []),...items]});
      } catch { if(mounted.current) setNotice('素材保存失败，请检查浏览器的存储空间后重试。'); }
      finally {busy.current=false; if(mounted.current) setBusy(false);}
    }
    async function download(file) {
      try {
        const blob = await writeFiles(store=>store.get(file.id),'readonly');
        if (!blob) throw Error();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href=url; link.download=file.name; link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        setNotice('');
      } catch {setNotice('当前浏览器找不到这份原件，请重新选择文件。');}
    }
    return h('div',{className:'outline-materials'},h('h3',null,'上传素材'),h('h4',null,'本地上传'),
      h('label',{className:'outline-drop','data-drag':dragActive,
        onDragOver:e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();setDragActive(true);}},
        onDragLeave:()=>setDragActive(false),
        onDrop:e=>{e.preventDefault();setDragActive(false);upload(e.dataTransfer.files);}},
        icon('plus'),h('span',null,busy.current ? '正在保存素材…' : '点击或拖拽文件到此处上传'),
        h('small',null,'支持 PDF、Word（.docx），任务最多绑定 10 个文件，单文件不超过 5 MB'),
        h('input',{type:'file',multiple:true,accept:'.pdf,.docx','aria-label':'本地上传素材',disabled:busy.current,
          onChange:e=>{upload(e.target.files);e.target.value='';}})),
      knownFiles(),
      notice && h('p',{className:'outline-alert',role:'alert'},notice));
    function knownFiles() {
      if (!attachments.length && !attached.length) return null;
      return h('ul',{className:'outline-files'},[...attachments,...attached].map((file,i)=>h('li',{key:file.id || i},icon('file'),
        i < attachments.length ? h('span',null,file.name) : h('button',{type:'button',className:'outline-file-link',onClick:()=>download(file),title:'下载原件'},file.name),
        i < attachments.length ? h('small',null,'任务素材') : tool('移除素材 '+file.name,'close',()=>{
          change({...settings,files:attached.filter(item=>item.id!==file.id)});
          writeFiles(store=>store.delete(file.id)).catch(()=>{});
          setNotice('');
        }))));
    }
  }

  return function OutlineReview({outline = [], topic, templateName, settings = {}, attachments = [], taskSkillNames = [], error, onChange, onSettingsChange, onConfirm, onCancel}) {
    const root = React.useRef(null);
    const pendingFocus = React.useRef(null);
    const drag = React.useRef(null);
    const heading = React.useId();
    const [notice,setNotice] = React.useState('');
    const [busy,setBusy] = React.useState(false);
    const [menu,setMenu] = React.useState(false);
    const [remove,setRemove] = React.useState(null);
    const menuRef = React.useRef(null);
    const rows = outline;
    const taskSkills = window.WorkbenchSkills.validTaskSkills(taskSkillNames);
    const chapterSkills = row => row.skillSnapshot?.name ? [row.skillSnapshot.name] : taskSkills;
    const title = settings.title ?? topic ?? '';
    React.useLayoutEffect(()=>{
      if (!pendingFocus.current) return;
      const element = root.current?.querySelector('[data-outline-focus="'+pendingFocus.current+'"]');
      pendingFocus.current=null;
      element?.focus();
    },[outline]);
    React.useEffect(()=>{
      if (!menu) return;
      const close=e=>{if(!menuRef.current?.contains(e.target))setMenu(false);};
      const escape=e=>{if(e.key==='Escape')setMenu(false);};
      document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
      return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
    },[menu]);
    React.useEffect(()=>{
      const frame = requestAnimationFrame(()=>{
        const scroller = root.current?.closest('.home-conversation-history, [data-node-id="1:69"]');
        if (!scroller || !root.current) return;
        const top = root.current.getBoundingClientRect().top-scroller.getBoundingClientRect().top;
        if(top>scroller.clientHeight/2 || top<0) scroller.scrollTop+=top-60;
      });
      return ()=>cancelAnimationFrame(frame);
    },[]);
    function setRows(next) {setNotice('');onChange(next);}
    function setSettings(next) {setNotice('');onSettingsChange(next);}
    function update(i, delta) {setRows(rows.map((row,n)=>n===i?patchOutlineItem(row,delta):row));}
    function addChapter() {
      if(rows.length>=6){setNotice('至多添加 6 个章节。');return;}
      const next=[...rows];
      const at=rows.length && chapterType(rows[rows.length-1])==='结语' ? rows.length-1 : rows.length;
      next.splice(at,0,{id:newId(),kind:'正文',title:'',body:'',children:[]});
      pendingFocus.current='chapter-'+at;
      setRows(next);
    }
    function addChild(i) {
      const row=rows[i], children=row.children || [];
      if(children.length>=6){setNotice('每章至多添加 6 个子标题。');return;}
      pendingFocus.current='child-'+i+'-'+children.length;
      update(i,{children:[...children,'']});
    }
    function childDetails(row){return (row.children||[]).map((_,i)=>row.childDetails?.[i]||{});}
    function deleteNode(node) {
      const {type,i,j}=node, row=rows[i];
      if(type==='chapter'){setRows(rows.filter((_,n)=>n!==i));}
      if(type==='child') update(i,{children:row.children.filter((_,n)=>n!==j),childDetails:childDetails(row).filter((_,n)=>n!==j)});
      if(type==='placeholder') update(i,{placeholders:row.placeholders.filter((_,n)=>n!==j)});
      setRemove(null);
    }
    function movableChapter(i){return chapterType(rows[i])==='正文';}
    function move(source, target) {
      if (!source || !target || source.type!==target.type) return;
      const {type,i,j}=source, to=target.i, at=target.j;
      if(type==='chapter'){
        if(i===to || !movableChapter(i) || !movableChapter(to)) return;
        setRows(spliceMove(rows,i,to));return;
      }
      if(chapterType(rows[to])!=='正文' || (i===to && j===at)) return;
      if(type==='child'){
        const list=rows.map(row=>({...row,children:[...(row.children||[])],childDetails:childDetails(row)}));
        if(i!==to && list[to].children.length>=6){setNotice('每章至多添加 6 个子标题。');return;}
        list[to].children.splice(at,0,...list[i].children.splice(j,1));
        list[to].childDetails.splice(at,0,...list[i].childDetails.splice(j,1));
        setRows(list);
      } else {
        const list=rows.map(row=>({...row,placeholders:[...(row.placeholders||[])]}));
        list[to].placeholders.splice(at,0,...list[i].placeholders.splice(j,1));
        setRows(list);
      }
    }
    function dropTarget(target){
      const accepts=()=>drag.current && (target.type==='chapter' || drag.current.type===target.type);
      return {onDragOver:e=>{if(accepts()){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';}},
        onDrop:e=>{if(!accepts())return;e.preventDefault();e.stopPropagation();
          const from=drag.current;drag.current=null;
          if(target.type==='chapter' && from.type!=='chapter'){
            move(from,{type:from.type,i:target.i,j:from.type==='child'?(rows[target.i].children||[]).length:(rows[target.i].placeholders||[]).length});
          } else {move(from,target);}
        }};
    }
    function grip(node, label){
      return h('span',{className:'outline-grip',title:'拖拽排序：'+label,draggable:true,
        onDragStart:e=>{drag.current=node;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',label);},
        onDragEnd:()=>{drag.current=null;}},icon('grip'));
    }
    function arrows(node,total) {
      const isChapter=node.type==='chapter', index=isChapter?node.i:node.j;
      const buttons=delta=>{
        const to=index+delta;
        const disabled=to<0 || to>=total || (isChapter&&(!movableChapter(index)||!movableChapter(to)));
        const dest=isChapter?{...node,i:to}:{...node,j:to};
        const name=node.type==='chapter'?'章节':node.type==='child'?'子标题':'占位符';
        return tool((delta<0?'上移':'下移')+name+' '+(index+1),delta<0?'up':'down',()=>move(node,dest),disabled);
      };
      return h('span',{className:'outline-move'},buttons(-1),buttons(1));
    }
    function field(value, updateValue, label, focusKey, placeholder, className) {
      return h('input',{type:'text',className,value:value??'',placeholder,'aria-label':label,'data-outline-focus':focusKey,
        onChange:e=>updateValue(e.target.value)});
    }
    function addPlaceholder(kind){
      setMenu(false);
      const i=rows.reduce((last,r,n)=>chapterType(r)==='正文'?n:last,-1);
      if(i<0){setNotice('请先添加正文章节。');return;}
      const blocks=rows[i].placeholders||[];
      const block={id:newId(),kind,title:kind==='文本'?'静态正文':kind,body:'',placeholder:{}};
      pendingFocus.current='placeholder-'+block.id;
      update(i,{placeholders:[...blocks,block]});
    }
    function renderBlock(block,i,j) {
      const node={type:'placeholder',i,j};
      function updateBlock(next) {update(i,{placeholders:rows[i].placeholders.map((item,k)=>k===j?next:item)});}
      return h('div',{key:block.id,className:'outline-placeholder',tabIndex:-1,'data-outline-focus':'placeholder-'+block.id,...dropTarget(node)},
        h('div',{className:'outline-block-tools'},grip(node,block.title),h('span',null,block.kind),arrows(node,rows[i].placeholders.length),
          tool('删除占位符 '+block.title,'remove',()=>setRemove(node))),
        h(PlaceholderEditor,{row:block,onChange:updateBlock}),
        h(Advanced,{value:block.config,onChange:config=>updateBlock({...block,config}),
          blockLabel:'第 '+(i+1)+' 章第 '+(j+1)+' 个占位符',skill:block.skillSnapshot,
          inheritedLabel:'沿用本章设置',inheritedNames:chapterSkills(rows[i]),
          onSkillChange:skillSnapshot=>updateBlock(patchOutlineItem(block,{skillSnapshot}))}));
    }
    function renderChild(row,i,j) {
      const node={type:'child',i,j}, label='第 '+(i+1)+' 章第 '+(j+1)+' 个子标题';
      const details=childDetails(row), detail=details[j];
      const updateDetail=delta=>update(i,{childDetails:details.map((v,k)=>k===j?patchOutlineItem(v,delta):v)});
      return h('li',{key:j,className:'outline-node outline-sub',...dropTarget(node)},
        h('div',{className:'outline-node-line'},grip(node,label),
          field(row.children[j],value=>update(i,{children:row.children.map((v,k)=>k===j?value:v)}),label,'child-'+i+'-'+j,'子标题','outline-name'),
          h('div',{className:'outline-node-actions'},arrows(node,row.children.length),tool('删除'+label,'remove',()=>setRemove(node)))),
        field(detail.body,body=>updateDetail({body}),label+'主题',null,'描述该段内容的主题','outline-description'),
        h(Advanced,{value:detail.config,onChange:config=>updateDetail({config}),blockLabel:label,skill:detail.skillSnapshot,
          inheritedLabel:'沿用本章设置',inheritedNames:chapterSkills(row),onSkillChange:skillSnapshot=>updateDetail({skillSnapshot})}));
    }
    function renderChapter(row,i) {
      const name='第 '+(i+1)+' 章', type=chapterType(row), node={type:'chapter',i};
      const children=row.children||[];
      const choices=['正文'];
      if(i===0 || type==='摘要')choices.unshift('摘要');
      if(i===rows.length-1 || type==='结语')choices.push('结语');
      return h('li',{className:'outline-group',key:row.id || i,...dropTarget(node)},
        h('div',{className:'outline-rail'},choices.length===1?h('span',null,type):
          h('select',{'aria-label':name+'类型',value:type,onChange:e=>{
            if(e.target.value!=='正文'&&row.placeholders?.length){setNotice('请先移出该章节内的占位符。');return;}
            update(i,{kind:e.target.value});
          }},choices.map(v=>h('option',{key:v},v)))),
        h('div',{className:'outline-paper'},
          h('div',{className:'outline-node'},
            h('div',{className:'outline-node-line'},type==='正文'&&grip(node,name),
              field(row.title,value=>update(i,{title:value,kind:type}),name+'标题','chapter-'+i,'章节标题','outline-name'),
              h('div',{className:'outline-node-actions'},arrows(node,rows.length),
                type==='正文' && tool('为'+name+'添加子标题','plus',()=>addChild(i)),
                type!=='结语' && tool('删除'+name,'remove',()=>rows.length>1?setRemove(node):setNotice('至少保留 1 个章节。')))),
            field(row.body,value=>update(i,{body:value}),name+'主题',null,'描述该段内容的主题','outline-description'),
            h(Advanced,{value:row.config,onChange:config=>update(i,{config}),blockLabel:name,skill:row.skillSnapshot,
              inheritedLabel:'沿用任务设置',inheritedNames:taskSkills,onSkillChange:skillSnapshot=>update(i,{skillSnapshot})})),
          h('ol',{className:'outline-sublist'},children.map((_,j)=>renderChild(row,i,j))),
          (row.placeholders||[]).map((block,j)=>renderBlock(block,i,j))));
    }
    function validation() {
      if(!title.trim())return '文章大纲标题不能为空。';
      if(!rows.some(r=>chapterType(r)==='正文'))return '请保留至少一个正文。';
      const invalidStyle = config => {
        const style = {...defaults,...config};
        const size = Number(style.size), spacing = Number(style.lineHeight);
        return !Number.isInteger(size) || size<1 || size>200 || !(spacing>=0.1 && spacing<=10) || !Number.isInteger(spacing*10);
      };
      if(invalidStyle(settings.titleConfig))return '标题字号须为 1—200 的整数，行高须为 0.1—10 且最多一位小数。';
      for(const [i,row] of rows.entries()){
        if(!row.title?.trim() || row.children?.some(v=>!v.trim()))return '请填写第 '+(i+1)+' 章的章节标题和子标题。';
        if([row.config,...childDetails(row).map(v=>v.config),...(row.placeholders||[]).map(v=>v.config)].some(invalidStyle))return '第 '+(i+1)+' 章的字号须为 1—200 的整数，行高须为 0.1—10 且最多一位小数。';
        for(const block of row.placeholders||[]){const problem=validatePlaceholder(block);if(problem)return '第 '+(i+1)+' 章：'+problem;}
      }
      return '';
    }
    function confirm() {const problem=validation();setNotice(problem);if(!problem&&!busy)onConfirm(rows);}
    const removing=remove?.type==='chapter'?'章节':remove?.type==='child'?'子标题':'占位符';
    return h('section',{ref:root,className:'outline-review','aria-labelledby':heading},
      h('details',{open:true,className:'outline-card'},
        h('summary',{className:'outline-card-head'},h('h2',{id:heading},'文章大纲'),icon('down')),
        h('div',{className:'outline-card-body'},
          templateName&&templateName!=='不使用模板'&&h('p',{className:'outline-template'},'写作模板 · '+templateName),
          h('div',{className:'outline-group outline-title'},h('div',{className:'outline-rail'},h('span',null,'标题')),
            h('div',{className:'outline-paper outline-node'},
              field(title,value=>setSettings({...settings,title:value}),'报告标题','title','报告标题','outline-name'),
              h(Advanced,{value:settings.titleConfig,onChange:titleConfig=>setSettings({...settings,titleConfig})}))),
          h('ol',{className:'outline-sections'},rows.map(renderChapter)),
          h('button',{type:'button',className:'outline-add-chapter',onClick:addChapter},icon('plus'),'添加一级标题'),
          h(MaterialUpload,{attachments,settings,change:setSettings,setBusy})),
        h('footer',{className:'outline-footer'},
          h('div',{className:'outline-footer-actions'},
            h('div',{ref:menuRef,className:'outline-placeholder-menu'},
              h('button',{type:'button',className:'outline-btn outline-add-placeholder','aria-expanded':menu,onClick:()=>setMenu(!menu)},icon('plus'),'添加占位符'),
              menu&&h('div',{className:'outline-popover','aria-label':'占位符类型'},placeholderKinds.map(kind=>h('button',{key:kind,type:'button',onClick:()=>addPlaceholder(kind)},kind)))),
            h('div',{className:'outline-run-actions'},
              h('button',{type:'button',className:'outline-btn outline-cancel',disabled:busy,onClick:onCancel},'取消任务'),
              h('button',{type:'button',className:'outline-btn outline-review-confirm',disabled:busy,onClick:confirm},'基于大纲生成文档'))),
          (notice||error)&&h('p',{className:'outline-alert',role:'alert'},notice||error))),
      remove && h('div',{className:'outline-dialog-backdrop',onKeyDown:e=>{if(e.key==='Escape')setRemove(null);}},
        h('div',{className:'outline-dialog',role:'alertdialog','aria-modal':true,'aria-label':'删除'+removing},
          h('h3',null,'确认删除'+removing+'？'),h('p',null,'删除后无法恢复。'),
          h('div',null,h('button',{className:'outline-btn outline-cancel',type:'button',autoFocus:true,onClick:()=>setRemove(null)},'取消'),
            h('button',{className:'outline-btn outline-review-confirm',type:'button',onClick:()=>deleteNode(remove)},'确认')))));
  };
}
