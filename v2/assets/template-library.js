const types = ["研究报告", "洞察报告", "战略咨询报告", "其他"];
const recordPrefix = "gkx.v2.report-template.v1.";
const changeEvent = "gkx-template-library-change";
const fonts = ["系统黑体", "宋体", "楷体"];
const baseStyle = {font: fonts[0], size: 16, lineHeight: 1.7, align: "left"};
const fontFamily = {"系统黑体":"inherit", "宋体":"Songti SC, SimSun, serif", "楷体":"Kaiti SC, KaiTi, serif"};
const identifier = () => crypto.randomUUID();
const clone = value => JSON.parse(JSON.stringify(value));
const timestamp = date => new Date(date).toLocaleString("zh-CN", {hour12:false});
const chapter = (title, body = "", children = []) => ({title, body, children});
const text = value => typeof value === "string" ? value.trim() : "";

// The order, identifiers, tags, and chapters match the supplied 4.0 home prototype.
const patterns = [
  ["tpl1","产业研究报告模板","先进制造","产业研究","梳理产业链、竞争格局与重点环节，明确发展机会及依据。",["产业研究","产业链分析","竞争分析"],["研究背景与对象界定","产业链结构与关键环节","竞争格局与区域对标","问题诊断与机会识别","结论与发展建议","证据与数据来源"]],
  ["tpl2","投资价值研究模板","金融","投资决策","从市场、财务和风险三个角度评估项目投资价值。",["投资价值","项目评价","竞争分析"],["项目概况与评价框架","市场与竞争分析","财务与回报测算","风险与敏感性分析","投资结论与建议","附录与数据说明"]],
  ["tpl3","技术路线研究模板","科技产业","技术研判","比较技术路线、成熟度与专利布局，识别研发机会。",["技术趋势","技术空白","专利布局"],["技术领域与路线图谱","技术成熟度评估","专利与论文布局分析","技术空白与机会识别","研发路径建议","证据与检索说明"]]
];
const systemTemplates = patterns.map(([id,name,industry,scenario,summary,tags,titles]) => ({
  id,name,type:types[0],industry,scenario,summary,tags,requirements:summary,reference:"",referenceKey:"",
  outline: titles.map(title => chapter(title)), style: {...baseStyle}, visibility:"仅自己可见", system:true
}));
const legacyIds={"产业研究报告":"tpl1","industry":"tpl1","technology":"tpl3"};
function personalTemplates() {
  const entries=[];
  for (let i=0; i<localStorage.length; i++) {
    const key=localStorage.key(i);
    if (!key?.startsWith(recordPrefix)) continue;
    try {
      const item=JSON.parse(localStorage.getItem(key));
      if (item && item.id && item.name && Array.isArray(item.outline) && Array.isArray(item.versions)) entries.push(item);
    } catch { /* Other saved templates remain available. */ }
  }
  return entries.sort((a,b)=>b.updated-a.updated || a.name.localeCompare(b.name,"zh-CN"));
}
const catalogue=()=>[...personalTemplates(),...systemTemplates];
export function lookupTemplate(nameOrId) {
  const raw=typeof nameOrId==="object" ? nameOrId?.id || nameOrId?.name : nameOrId;
  const found=catalogue().find(item=>item.id===(legacyIds[raw] || raw) || item.name===raw);
  return found ? publicTemplate(found) : null;
}
function publicTemplate(item) {
  const {versions, share, ...template}=item;
  return clone({...template,version:versions?.at(-1)?.number || template.version || 1});
}
function content(item) {
  const {id,updated,system,revision,version, ...snapshot}=publicTemplate(item);
  return snapshot;
}
function commit(item,expected) {
  const key=recordPrefix+item.id;
  const current=JSON.parse(localStorage.getItem(key) || "null");
  if (current?.revision!==expected) throw new Error("模板已在其他窗口更新，请重新打开后再保存。");
  if (item.remove) localStorage.removeItem(key);
  else localStorage.setItem(key,JSON.stringify({...item, revision:identifier()}));
  window.dispatchEvent(new Event(changeEvent));
}
function nextVersion(draft,previous) {
  const updated=Date.now(), value=content(draft);
  const versions=[...(previous?.versions || []),{number:(previous?.versions?.at(-1)?.number || 0)+1,updated,author:"本机用户",value}];
  return {...value,id:draft.id,updated,system:false,versions,share:previous?.share || null};
}
function cleanTemplate(raw) {
  if (!raw || typeof raw!=="object") throw new Error("请上传单个模板 JSON 对象。");
  const {name,type,industry,scenario,requirements,summary,reference,referenceKey}=raw;
  if (![name,industry,scenario,requirements].every(x=>text(x)) || !types.includes(type)) {
    throw new Error("模板需要名称、有效的报告类型、行业、场景和写作要求。可下载示例核对字段。");
  }
  if (!Array.isArray(raw.outline) || !raw.outline.length) throw new Error("大纲至少需要一个有标题的章节。");
  const outline=raw.outline.map(entry=>{
    if (typeof entry==="string" && text(entry)) return chapter(text(entry));
    if (!entry || !text(entry.title) || (entry.children!=null && (!Array.isArray(entry.children) || entry.children.some(s=>!text(s))))) throw new Error("章节需要标题，子标题须为非空文字。");
    return chapter(text(entry.title), text(entry.body), entry.children?.map(text) || []);
  });
  const style=raw.style || {};
  return {name:text(name),type,industry:text(industry),scenario:text(scenario),requirements:text(requirements),summary:text(summary),reference:text(reference), referenceKey:text(referenceKey),tags:Array.isArray(raw.tags)?raw.tags.filter(s=>text(s)).map(text):[],
    visibility:raw.visibility==="组织内共享" ? raw.visibility : "仅自己可见",outline,
    style:{font:fonts.includes(style.font)?style.font:baseStyle.font,size:[14,16,18,20].includes(Number(style.size))?Number(style.size):16,lineHeight:[1.4,1.7,2].includes(Number(style.lineHeight))?Number(style.lineHeight):1.7,align:["left","center","justify"].includes(style.align)?style.align:"left"}};
}
function newTemplate(){return {id:identifier(),name:"",type:types[0],industry:"",scenario:"",summary:"",requirements:"",reference:"",referenceKey:"",tags:[],visibility:"仅自己可见",style:{...baseStyle},outline:[]};}
function generateOutline(draft) {
  const outlines={
    "研究报告":systemTemplates[0].outline.map(s=>s.title),
    "洞察报告":["扫描范围与证据来源","新兴信号","驱动因素与替代解释","观察指标与响应建议"],
    "战略咨询报告":["决策目标与约束","候选战略与资源条件","优先级比较","实施路径与监测指标"],
    "其他":["研究问题","材料与分析","结论与后续行动"]
  };
  return outlines[draft.type].map((title,index)=>chapter(title,index===0
    ? [draft.industry+" · "+draft.scenario,draft.requirements].join("。")
    : "围绕"+draft.scenario+"，说明“"+title+"”的依据和结论。"));
}
function searchTemplates(items,q) {
  const words=text(q).toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items.map(item=>{
    const fields=[item.name,item.type,item.industry,item.scenario,(item.tags||[]).join(" "),item.summary,item.requirements].map(v=>(v || "").toLocaleLowerCase());
    const scores=words.map(word=>{const index=fields.findIndex(f=>f.includes(word));return index<0?0:7-index;});
    return {item,score:scores.every(Boolean)?scores.reduce((a,b)=>a+b,0):0};
  }).filter(match=>match.score).sort((a,b)=>b.score-a.score).map(match=>match.item);
}
async function referenceStore(mode,operation) {
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open("gkx.v2.report-template.references",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("files");
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction("files",mode), request=operation(tx.objectStore("files"));
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=tx.onabort=()=>reject(tx.error||new Error("本机参考文档未保存。"));
    });
  } finally {db.close();}
}
async function downloadReference(item) {
  const file=await referenceStore("readonly",store=>store.get(item.referenceKey));
  if(!file) throw new Error("当前浏览器中找不到此参考文档。");
  const url=URL.createObjectURL(file);
  const link=document.createElement("a");
  link.href=url;link.download=item.reference;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadExample() {
  const data=JSON.stringify(content(systemTemplates[0]),null,2);
  const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));
  const anchor=document.createElement("a");
  anchor.href=url; anchor.download="产业研究报告模板示例.json"; anchor.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function shareTemplate(token) {
  return token && personalTemplates().find(t=>t.share?.token===token && t.share.expires>Date.now());
}
function shareToken() {return location.hash.startsWith("#template-share=")?location.hash.slice(16):"";}

export function createTemplateLibrary(React, Select) {
  const h=React.createElement, {useState,useEffect,useRef,useId}=React;
  function useTemplates(){
    const [items,setItems]=useState(catalogue);
    useEffect(()=>{
      const refresh=()=>setItems(catalogue());
      window.addEventListener("storage",refresh);
      window.addEventListener(changeEvent,refresh);
      refresh();
      return ()=>{window.removeEventListener("storage",refresh);window.removeEventListener(changeEvent,refresh);};
    },[]);
    return items;
  }
  const btn=(label,fn,primary=false,props={})=>h("button",{type:"button",className:"lib-btn"+(primary?" lib-primary":""),onClick:fn,...props},label);
  const field=(label,control)=>h("label",{className:"tpl-field"},h("span",null,label),control);
  const option=(value,label=value)=>({value:String(value),label:String(label)});
  const choices=values=>values.map(value=>option(value));
  const selectField=(label,value,options,onValueChange)=>field(label,
    h(Select,{label,value:String(value),options,onValueChange}));
  function Dialog({title,children,footer,onClose,wide=false}) {
    const ref=useRef(null), heading=useId();
    useEffect(()=>{const d=ref.current; d.showModal(); return ()=>d.close();},[]);
    return h("dialog",{ref,"aria-labelledby":heading,className:"lib-dialog tpl-dialog"+(wide?" tpl-wide":""),onCancel:e=>{e.preventDefault();onClose();},onClick:e=>{if(e.target!==ref.current)return;const r=ref.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}},
      h("header",{className:"lib-head"},h("h2",{id:heading},title),btn("×",onClose,false,{className:"close-button","aria-label":"关闭"+title})),
      h("div",{className:"lib-body tpl-dialog-body"},children),
      footer && h("footer",{className:"lib-foot"},footer));
  }
  function Meta({item}){
    return h(React.Fragment,null,
      h("div",{className:"tpl-tags"},...(item.tags?.length?item.tags:[item.type,item.industry,item.scenario]).map((s,i)=>h("span",{key:i,className:"lib-tag"},s))),
      h("p",{className:"tpl-summary"},item.summary || item.requirements));
  }
  function Preview({item}){
    const style=item.style || baseStyle;
    const [refError,setRefError]=useState("");
    return h(React.Fragment,null,h(Meta,{item}),h("p",{className:"lib-muted"},[item.type,item.industry,item.scenario].join(" · ")), h("h3",null,"写作要求"),h("p",null,item.requirements),
      item.reference && h("div",{className:"tpl-inline"},h("span",{className:"lib-muted"},"参考文档 · "+item.reference),item.referenceKey && btn("下载参考文档",()=>downloadReference(item).catch(e=>setRefError(e.message)))),
      refError&&h("p",{role:"alert",className:"tpl-error"},refError),
      h("h3",null,"大纲结构"),
      h("ol",{className:"tpl-outline",style:{fontFamily:fontFamily[style.font],fontSize:style.size+"px",lineHeight:style.lineHeight,textAlign:style.align}},
        item.outline.map((s,i)=>h("li",{key:i},h("strong",null,s.title),s.body && h("p",null,s.body),s.children.length>0 && h("ul",null,s.children.map((v,j)=>h("li",{key:j},v)))))));
  }
  function Editor({draft,mode,onClose,onSave,notify}){
    const [item,setItem]=useState(()=>clone(draft));
    const [step,setStep]=useState(1),[error,setError]=useState(""),[referenceFile,setReferenceFile]=useState(null),[busy,setBusy]=useState(false);
    const saving=useRef(false);
    const update=(key,value)=>setItem(last=>({...last,[key]:value}));
    const input=(key,props={})=>h("input",{value:item[key],onChange:e=>update(key,e.target.value),...props});
    const area=(key,props={})=>h("textarea",{rows:3,value:item[key],onChange:e=>update(key,e.target.value),...props});
    const styleSetting=(label,key,values,labels)=>selectField(label,item.style[key],
      values.map((value,index)=>option(value,labels?.[index] ?? value)),
      value=>setItem(last=>({...last,style:{...last.style,[key]:typeof values[0]==="number"?Number(value):value}})));
    function next(){
      if (![item.name,item.industry,item.scenario,item.requirements].every(x=>text(x))) {setError("请填写模板标题、行业、场景和写作要求。");return;}
      if (!item.outline.length) update("outline",generateOutline(item));
      setStep(2);setError("");
    }
    const editSection=(i,cb)=>setItem(last=>({...last,outline:last.outline.map((s,j)=>j===i?cb(s):s)}));
    function attach(file){
      if (!file) return;
      if (!/\.(docx|txt)$/i.test(file.name) || file.size>50*1024*1024) {
        setError("支持 Word（.docx）或 TXT（.txt），单文件不超过 50 MB。");return;
      }
      setReferenceFile(file);
      setItem(last=>({...last,reference:file.name,referenceKey:""}));
      setError("");
    }
    async function finish(){
      if(saving.current)return;
      saving.current=true;setBusy(true);
      let written="";
      try{
        const clean=cleanTemplate(item);
        if(referenceFile){
          written=identifier();
          await referenceStore("readwrite",store=>store.put(referenceFile,written));
          clean.referenceKey=written;
        }
        onSave({...item,...clean});
      }catch(e){
        if(written)referenceStore("readwrite",store=>store.delete(written)).catch(()=>{});
        setError(e.name==="QuotaExceededError"?"本机存储空间不足，请清理空间后再次保存。":e.message || "保存失败。");
      }finally{saving.current=false;setBusy(false);}
    }
    return h(Dialog,{title:(mode==="edit"?"编辑模板":mode==="copy"?"复制并编辑":"自定义模板")+" · "+(step===1?"基本信息":"编辑大纲"),wide:true,onClose,
      footer:step===1?btn(item.outline.length?"下一步，编辑大纲":"生成本地大纲",next,true):[btn("上一步",()=>{setError("");setStep(1);},false,{key:"back"}),btn(busy?"保存中…":mode==="edit"?"保存为新版本":"保存至模板库",finish,true,{key:"save",disabled:busy})]},
      error&&h("p",{role:"alert",className:"tpl-error"},error),
      step===1?h("div",{className:"tpl-form"},
        field("模板标题（必填）",input("name",{required:true})),
        h("div",{className:"tpl-columns"},selectField("报告类型",item.type,choices(types),value=>update("type",value)),
        selectField("可见范围",item.visibility,choices(["仅自己可见","组织内共享"]),value=>update("visibility",value))),
        item.visibility==="组织内共享" && h("small",{className:"lib-muted"},"此设置保存在本机，组织内发布需连接组织服务。"),
        h("div",{className:"tpl-columns"},field("行业分类（必填）",input("industry",{required:true})),field("场景分类（必填）",input("scenario",{required:true}))),
        field("模板简介",area("summary",{rows:2})),field("写作要求（必填）",area("requirements",{required:true})),
        h("label",{className:"tpl-drop",onDragOver:e=>e.preventDefault(),onDrop:e=>{e.preventDefault();attach(e.dataTransfer.files[0]);}},
          h("strong",null,"参考文档（选填）"),h("span",null,"选择文件或拖拽文件到此处上传"),h("small",null,"支持 Word（.docx）或 TXT（.txt） · 单文件不超过 50 MB"),
          h("input",{type:"file",accept:".docx,.txt",onChange:e=>{attach(e.target.files[0]);e.target.value="";}})),
        item.reference && h("div",{className:"tpl-inline"},h("span",null,item.reference),btn("移除参考文档",()=>{setReferenceFile(null);setItem(last=>({...last,reference:"",referenceKey:""}));}))):
        h("div",{className:"tpl-form"},
          h("p",{className:"lib-muted"},"根据模板类型和写作要求在本机生成，可继续调整各章节。"),
          field("模板简介",area("summary",{rows:2})),
          h("div",{className:"tpl-columns"},field("行业",input("industry")),field("场景",input("scenario"))),
          h("div",{className:"tpl-style"},styleSetting("字体","font",fonts),styleSetting("字号","size",[14,16,18,20]),styleSetting("行高","lineHeight",[1.4,1.7,2]),styleSetting("对齐","align",["left","center","justify"],["左对齐","居中","两端对齐"])),
          ...item.outline.map((s,i)=>h("fieldset",{className:"tpl-section",key:i},h("legend",null,"章节 "+(i+1)),
            field("一级标题",h("input",{value:s.title,onChange:e=>editSection(i,v=>({...v,title:e.target.value}))})),
            field("正文主题",h("textarea",{rows:2,value:s.body,onChange:e=>editSection(i,v=>({...v,body:e.target.value})),style:{fontFamily:fontFamily[item.style.font],fontSize:item.style.size+"px",lineHeight:item.style.lineHeight,textAlign:item.style.align}})),
            ...s.children.map((child,j)=>h("div",{className:"tpl-inline",key:j},field("子标题 "+(j+1),h("input",{value:child,onChange:e=>editSection(i,v=>({...v,children:v.children.map((c,k)=>j===k?e.target.value:c)}))})),btn("删除",()=>editSection(i,v=>({...v,children:v.children.filter((_,k)=>j!==k)})),false,{"aria-label":"删除子标题 "+(j+1)}))),
            h("div",{className:"tpl-inline"},btn("添加子标题",()=>editSection(i,v=>({...v,children:[...v.children,""]}))),btn("删除章节",()=>update("outline",item.outline.filter((_,j)=>j!==i)))))),
          btn("添加一级标题",()=>update("outline",[...item.outline,chapter("")]))));
  }
  function Share({item,onClose,notify}) {
    const initial=item.share;
    const [permission,setPermission]=useState(initial?.permission || "仅查看");
    const [days,setDays]=useState(initial?.term || "7");
    const [custom,setCustom]=useState(initial?.date || "");
    const [feedback,setFeedback]=useState("");
    const localLink=initial ? location.origin+location.pathname+"#template-share="+initial.token : "";
    const changed=initial && (initial.permission!==permission || initial.term!==days || (days==="custom" && initial.date!==custom));
    function generate(){
      const expires=days==="custom"?new Date(custom+"T23:59:59").getTime():Date.now()+Number(days)*86400000;
      if (!Number.isFinite(expires) || expires<=Date.now()) {setFeedback("请选择尚未到期的日期。");return;}
      try {
        commit({...item,share:{token:identifier(),permission,term:days,date:days==="custom"?custom:"",expires,value:content(item)}},item.revision);
        setFeedback("已生成本机预览链接。");
      } catch(e){setFeedback(e.message);}
    }
    async function copyLink() {
      try {await navigator.clipboard.writeText(localLink);notify?.("已复制本机预览链接");}
      catch {setFeedback("请选中并复制下方链接。");}
    }
    return h(Dialog,{title:"分享模板",wide:true,onClose,footer:btn(initial?"重新生成链接":"生成链接",generate,true)},
      h("h3",null,item.name),h(Preview,{item}),
      h("div",{className:"tpl-share-controls"},
        h("div",{className:"tpl-columns"},selectField("分享权限",permission,choices(["仅查看","可查看并保存"]),setPermission),
        selectField("有效期",days,[option("7","7 天"),option("30","30 天"),option("custom","自定义")],setDays)),
        days==="custom"&&field("截止日期",h("input",{type:"date",value:custom,onChange:e=>setCustom(e.target.value)})),
        h("p",{className:"lib-muted"},"链接仅在保存模板的本机浏览器中有效。"),
        initial&&h(React.Fragment,null,field("本机预览链接",h("input",{readOnly:true,value:localLink,onFocus:e=>e.target.select()})),
          h("div",{className:"tpl-inline"},btn("复制链接",copyLink),h("small",null,initial.permission+" · "+timestamp(initial.expires)+" 到期")),
          changed&&h("small",{className:"lib-muted"},"设置已调整，请重新生成链接。")),
        feedback&&h("p",{role:"status"},feedback)));
  }
  function TemplateLibrary({onApply,notify}){
    const items=useTemplates();
    const [q,setQ]=useState(""),[type,setType]=useState(types[0]),[industry,setIndustry]=useState(""),[scenario,setScenario]=useState("");
    const [filters,setFilters]=useState({q:"",industry:"",scenario:""});
    const [screen,setScreen]=useState(()=>shareToken()?{kind:"shared",token:shareToken()}:null);
    const [error,setError]=useState(""), inputRef=useRef(null);
    const [clock,setClock]=useState(0);
    const sortedUnique=k=>[...new Set(items.map(t=>t[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"zh-CN"));
    const matches=searchTemplates(items.filter(t=>t.type===type&&(!filters.industry || t.industry===filters.industry)&&(!filters.scenario || t.scenario===filters.scenario)),filters.q);
    const current=items.find(t=>t.id===screen?.id), shared=screen?.kind==="shared"?shareTemplate(screen.token):null;
    useEffect(()=>{
      const openHash=()=>{
        const token=shareToken();
        if(token)setScreen({kind:"shared",token});
        else setScreen(current=>current?.kind==="shared" ? null : current);
      };
      window.addEventListener("hashchange",openHash);return ()=>window.removeEventListener("hashchange",openHash);
    },[]);
    useEffect(()=>{
      if(!shared)return;
      const timer=setTimeout(()=>setClock(c=>c+1),Math.max(1,Math.min(2147483647,shared.share.expires-Date.now()+10)));
      return ()=>clearTimeout(timer);
    },[shared?.share?.expires,clock]);
    function close(){
      if(screen?.kind==="shared"&&shareToken()){
        history.replaceState(history.state,"","#/library/templates");
        window.dispatchEvent(new Event("hashchange"));
      }
      setScreen(null);setError("");
    }
    function open(kind,item){setError("");setScreen({kind,id:item.id});}
    function start(mode,source){
      const draft=source?publicTemplate(source):{...newTemplate(),type};
      if(mode==="copy"){draft.id=identifier();draft.name=source.name+"（副本）";draft.visibility="仅自己可见";draft.system=false;}
      setError("");setScreen({kind:"editor",mode,draft,expected:mode==="edit"?source.revision:undefined});
    }
    function saveDraft(draft) {
      const previous=items.find(x=>x.id===draft.id);
      const record=nextVersion(draft,previous);
      commit(record,screen.expected);
      setScreen({kind:"saved",id:record.id});
      setQ("");setType(draft.type);setIndustry("");setScenario("");setFilters({q:"",industry:"",scenario:""});
      notify?.("已保存至模板库");
    }
    async function upload(file){
      if(!file)return;
      try {
        if(!/\.json$/i.test(file.name)||file.size>1024*1024)throw new Error("请上传不超过 1 MB 的 JSON 模板。");
        let raw;try{raw=JSON.parse((await file.text()).replace(/^\uFEFF/,""));}catch{throw new Error("无法解析 JSON，请核对文件格式或下载模板示例。");}
        const clean=cleanTemplate(raw);
        clean.referenceKey="";
        setScreen({kind:"editor",mode:"import",draft:{...clean,id:identifier(),system:false},expected:undefined});setError("");
      } catch(e){setError(e.message);}
    }
    function remove(){
      try{commit({id:current.id,remove:true},current.revision);close();setIndustry("");setScenario("");notify?.("模板已删除");}
      catch(e){setError(e.message);}
    }
    function restore(version) {
      try {
        const next=nextVersion({...version.value,id:current.id},current);
        commit(next,current.revision);setScreen({kind:"history",id:current.id});notify?.("已恢复为新版本");
      } catch(e){setError(e.message);}
    }
    const apply=t=>{close();onApply?.(publicTemplate(t));};
    const alert=error&&h("p",{role:"alert",className:"tpl-error"},error);
    function modal(){
      if(!screen)return null;
      if(screen.kind==="editor")return h(Editor,{key:screen.draft.id,draft:screen.draft,mode:screen.mode,onSave:saveDraft,onClose:close,notify});
      if(screen.kind==="shared"){
        if(!shared)return h(Dialog,{title:"本机模板预览",onClose:close},h("p",null,"链接已过期、已被替换，或模板未保存在当前浏览器。"));
        const item={...shared.share.value,id:shared.id};
        const copy=()=>{if(shareTemplate(screen.token)?.share.permission!=="可查看并保存"){setClock(c=>c+1);return;}close();start("copy",item);};
        return h(Dialog,{title:item.name,onClose:close,footer:shared.share.permission==="可查看并保存"?btn("保存为个人模板",copy,true):null},
          h("p",{className:"lib-muted"},"本机预览 · "+shared.share.permission+" · "+timestamp(shared.share.expires)+" 到期"),h(Preview,{item}));
      }
      if(!current)return h(Dialog,{title:"模板库",onClose:close},h("p",null,"此模板已移除。"));
      if(screen.kind==="share")return h(Share,{item:current,onClose:close,notify});
      if(screen.kind==="detail")return h(Dialog,{title:current.name,onClose:close,footer:[
        btn(current.system?"复制并编辑":"编辑模板",()=>start(current.system?"copy":"edit",current),false,{key:"edit"}),
        btn("使用该模板",()=>open("apply",current),true,{key:"apply"})]},h(Preview,{item:current}));
      if(screen.kind==="apply")return h(Dialog,{title:"使用模板",onClose:close,footer:[
        btn("取消",close,false,{key:"cancel"}),btn("确认使用",()=>apply(current),true,{key:"apply"})]},h("p",null,"在报告创作中使用「"+current.name+"」的大纲与写作要求？"));
      if(screen.kind==="saved")return h(Dialog,{title:"已保存至模板库",onClose:close,footer:[
        btn("返回模板库",close,false,{key:"back"}),btn("使用该模板创作报告",()=>open("apply",current),true,{key:"apply"})]},h("p",null,current.name));
      if(screen.kind==="delete")return h(Dialog,{title:"删除模板",onClose:close,footer:[
        btn("取消",close,false,{key:"cancel"}),btn("确认删除",remove,false,{key:"delete",className:"lib-btn tpl-danger"})]},h("p",null,"删除「"+current.name+"」及其版本记录？已生成的本机预览链接也会失效。"),alert);
      if(screen.kind==="history")return h(Dialog,{title:"版本记录 · "+current.name,onClose:close},
        ...current.versions.slice().reverse().map((version,i)=>h("div",{className:"tpl-history",key:version.number},
          h("div",null,h("strong",null,"V"+version.number+(i===0?" · 当前版本":"")),h("small",null,timestamp(version.updated)+" · "+version.author)),
          btn("预览",()=>setScreen({kind:"version",id:current.id,number:version.number})))),alert);
      if(screen.kind==="version"){
        const v=current.versions.find(v=>v.number===screen.number);
        if(!v)return null;
        return h(Dialog,{title:"V"+v.number+" · "+v.value.name,onClose:()=>open("history",current),footer:[
          btn("返回版本记录",()=>open("history",current),false,{key:"back"}),
          v.number!==current.versions.at(-1).number && btn("恢复该版本",()=>setScreen({...screen,kind:"restore"}),true,{key:"restore"})]},h(Preview,{item:v.value}),alert);
      }
      if(screen.kind==="restore"){
        const version=current.versions.find(v=>v.number===screen.number);
        return h(Dialog,{title:"恢复版本",onClose:()=>open("history",current),footer:btn("确认恢复",()=>restore(version),true)},h("p",null,"将 V"+screen.number+" 恢复为新的当前版本，历史记录会保留。"),alert);
      }
      return null;
    }
    return h("section",{className:"lib-panel tpl-library","aria-label":"模板库"},
      h("div",{className:"tpl-bar"},
        h("div",{className:"tpl-tabs","aria-label":"报告类型"},...types.map(t=>btn(t,()=>setType(t),false,{key:t,"aria-pressed":type===t}))),
        h("div",{className:"tpl-inline"},btn("自定义模板",()=>start("create"),true),btn("模板上传",()=>inputRef.current.click()),btn("下载模板示例",downloadExample),
          h("input",{ref:inputRef,type:"file",accept:".json,application/json",hidden:true,onChange:e=>{const f=e.target.files[0];e.target.value="";upload(f);}}))),
      h("form",{className:"lib-toolbar tpl-toolbar",onSubmit:e=>{e.preventDefault();setFilters({q,industry,scenario});}},
        selectField("行业",industry,[option("","全部行业"),...choices(sortedUnique("industry"))],setIndustry),
        selectField("场景",scenario,[option("","全部场景"),...choices(sortedUnique("scenario"))],setScenario),
        field("搜索模板",h("input",{type:"search",value:q,placeholder:"搜索模板名称、行业、场景",onChange:e=>setQ(e.target.value)})),
        h("div",{className:"tpl-inline"},h("button",{type:"submit",className:"lib-btn lib-primary"},"查询"),btn("重置",()=>{setQ("");setIndustry("");setScenario("");setFilters({q:"",industry:"",scenario:""});}))),
      !screen&&alert,
      h("div",{className:"lib-grid tpl-grid"},matches.map(t=>
        h("article",{className:"lib-card tpl-card",key:t.id},h("header",null,h("h3",null,t.name),h("small",{className:"lib-muted"},t.system?"系统模板":"个人模板")),
        h(Meta,{item:t}),h("div",{className:"tpl-card-actions"},
          btn("预览",()=>open("detail",t)),btn(t.system?"复制并编辑":"编辑",()=>start(t.system?"copy":"edit",t)),!t.system&&btn("版本",()=>open("history",t)),!t.system&&btn("分享",()=>open("share",t)),!t.system&&btn("删除",()=>open("delete",t)),btn("使用模板",()=>open("apply",t),true))))),
      !matches.length&&h("div",{className:"lib-empty"},h("p",null,filters.q||filters.industry||filters.scenario?"暂无模板，换个关键词试试":"暂无"+type+"类型模板"),btn("自定义模板",()=>start("create"))),modal());
  }
  function TemplatePicker({selected,onApply,onRemove,onMore,onClose,notify}){
    const items=useTemplates(),[q,setQ]=useState(""),[inspected,setInspected]=useState(null);
    const selectedId=typeof selected==="object"?selected?.id:selected;
    const selectedName=typeof selected==="object"?selected?.name:selected;
    const isCurrent=item=>selectedId===item.id || selectedName===item.name;
    const matches=searchTemplates(items,q).slice(0,5);
    function choose(item) {
      if(isCurrent(item)){onRemove?.();onClose?.();return;}
      onApply(publicTemplate(item));onClose?.();
    }
    if(inspected)return h(Dialog,{title:inspected.name,onClose:()=>setInspected(null),footer:[
      btn("返回列表",()=>setInspected(null),false,{key:"back"}),btn(isCurrent(inspected)?"移除模板":"使用该模板",()=>choose(inspected),true,{key:"use"})]},h(Preview,{item:inspected}));
    return h(Dialog,{title:"选择模板",onClose,footer:btn("前往模板库",onMore)},
      field("搜索模板",h("input",{type:"search",value:q,placeholder:"搜索全部模板",onChange:e=>setQ(e.target.value)})),
      h("div",{className:"tpl-picker"},matches.map(t=>h("article",{key:t.id},h("div",null,h("strong",null,t.name),h("small",null,t.type+" · "+t.scenario)),
        h("div",{className:"tpl-inline"},btn("查看",()=>setInspected(t)),btn(isCurrent(t)?"移除":"应用",()=>choose(t),!isCurrent(t)))))),
      !matches.length&&h("p",{className:"lib-empty"},"暂无模板，换个关键词试试"));
  }
  return {TemplateLibrary,TemplatePicker};
}
