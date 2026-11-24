const DATABASE = "gkx-writing-knowledge-v1";
const STORE = "collections";
const CHANGE = "gkx-knowledge-updated";
const PAGE_SIZE = 6;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 10;
const XML_BUDGET = 96 * 1024 * 1024;
const UPLOAD_EXTENSIONS = [".pdf", ".docx", ".xls", ".xlsx", ".txt", ".md", ".csv", ".json"];

function checkBatch(existingCount, incoming) {
  if (existingCount + incoming.length > MAX_FILES) return "各来源合计最多添加 10 个文件。";
  if (incoming.some(file => file.size > MAX_FILE_BYTES)) return "单文件不能超过 50 MB。";
  if (incoming.some(file => !UPLOAD_EXTENSIONS.includes("." + file.name.split(".").pop().toLowerCase()))) return "请选择 PDF、Word（.docx）、Excel、TXT、Markdown、CSV 或 JSON 文件。";
  return "";
}
const uid = () => crypto.randomUUID();
const bytes = value => new Blob([value]).size;
const formatSize = size => size < 1024 ? size + " B" : size < 1048576 ? (size / 1024).toFixed(1) + " KB" : (size / 1048576).toFixed(1) + " MB";
const dateLabel = date => new Date(date).toLocaleString("zh-CN", {hour12: false});
let connection;

function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, {keyPath: "id"});
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
    request.onerror = () => { connection = null; reject(request.error); };
  });
  return connection;
}

async function listCollections() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a,b) => b.created - a.created || a.id.localeCompare(b.id)));
    request.onerror = () => reject(request.error);
  });
}

async function persist(collection, remove = false) {
  const db = await database();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const read = store.get(collection.id);
    let conflict = false;
    read.onsuccess = () => {
      if ((read.result?.version || 0) !== collection.version) {
        conflict = true;
        tx.abort();
        return;
      }
      if (remove) store.delete(collection.id);
      else store.put({...collection, version: collection.version + 1});
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(conflict ? new Error("该知识库已在其他页面修改，请关闭后重新打开。") : tx.error);
    tx.onerror = () => {};
  });
  window.dispatchEvent(new Event(CHANGE));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANGE);
    channel.postMessage("changed");
    channel.close();
  }
}

function attachment(collection, file) {
  return {id: "kb:" + collection.id + ":" + file.id, name: file.name, text: file.text || "", source: "knowledge", sourceLabel: file.source, collectionId: collection.id, fileId: file.id, size: file.size, status: file.status, uploadedAt: file.added};
}

function saveOriginal(file) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readLocal(file) {
  const result = {id: uid(), name: file.name, size: file.size, source: "本地上传", blob: file, added: Date.now(), status: "仅存原件", text: ""};
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["txt","md","csv","json","docx","xlsx"].includes(ext)) return result;
  try {
    const text = ["docx","xlsx"].includes(ext) ? await officeText(file, ext) : await file.text();
    if (!text.includes("\u0000") && !text.includes("\uFFFD")) {
      result.text = text;
      result.status = text.trim() ? "已解析" : "无正文";
    }
  } catch { /* Keep the original when this local reader does not support its encoding or structure. */ }
  return result;
}

// Read text from Office ZIP entries. Only bounded XML entries are decompressed.
async function officeText(file, ext) {
  const buffer = await file.arrayBuffer();
  const v = new DataView(buffer);
  const u16 = p => v.getUint16(p,true);
  const u32 = p => v.getUint32(p,true);
  let end = buffer.byteLength - 22;
  const minimum = Math.max(0, end - 65535);
  while (end >= minimum && u32(end) !== 0x06054b50) end--;
  if (end < minimum) throw Error("无目录");
  let pos = u32(end + 16);
  const entries = new Map();
  const decoder = new TextDecoder();
  for (let i = 0; i < u16(end + 10); i++) {
    if (u32(pos) !== 0x02014b50) throw Error("目录错误");
    const length = u16(pos + 28);
    const name = decoder.decode(new Uint8Array(buffer,pos + 46,length));
    entries.set(name, {offset:u32(pos+42), size:u32(pos+24), compressed:u32(pos+20), method:u16(pos+10)});
    pos += 46 + length + u16(pos+30) + u16(pos+32);
  }
  let budget = XML_BUDGET;
  async function xml(name) {
    const e=entries.get(name);
    if (!e || e.size > budget || ![0,8].includes(e.method) || u32(e.offset)!==0x04034b50) throw Error("不支持的文档");
    const offset=e.offset+30+u16(e.offset+26)+u16(e.offset+28);
    if (offset + e.compressed > buffer.byteLength) throw Error("文档不完整");
    const blob=new Blob([buffer.slice(offset,offset + e.compressed)]);
    const stream=e.method===8 ? blob.stream().pipeThrough(new DecompressionStream("deflate-raw")) : blob.stream();
    const reader=stream.getReader();
    const chunks=[];
    let size=0;
    while (true) {
      const {value,done}=await reader.read();
      if (done) break;
      size+=value.length;
      if (size>budget || size>e.size) {await reader.cancel();throw Error("文档过大");}
      chunks.push(value);
    }
    budget-=size;
    const body=await new Blob(chunks).text();
    if (/<!DOCTYPE/i.test(body)) throw Error("不支持的文档");
    const doc=new DOMParser().parseFromString(body,"application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw Error("文档错误");
    return doc;
  }
  const elements=(node,name)=>Array.from(node.getElementsByTagNameNS("*",name));
  const fragments=(node,name)=>elements(node,name).map(x=>x.textContent);
  if (ext==="docx") return elements(await xml("word/document.xml"),"p").map(p=>fragments(p,"t").join("")).join("\n");
  const strings=entries.has("xl/sharedStrings.xml") ? elements(await xml("xl/sharedStrings.xml"),"si").map(si=>fragments(si,"t").join("")) : [];
  const sheets=[];
  for (const name of entries.keys()) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) continue;
    sheets.push(elements(await xml(name),"row").map(row=>elements(row,"c").map(cell=>{
      const value=fragments(cell,"v")[0] || "";
      if (cell.getAttribute("t")==="s") return strings[Number(value)] || "";
      return cell.getAttribute("t")==="inlineStr" ? fragments(cell,"t").join("") : value;
    }).join("\t")).join("\n"));
  }
  return sheets.join("\n\n");
}

// These case records are supplied by the reference prototype without report bodies.
const caseFiles = [
  {ref:"case:ai", name:"人工智能", type:"研究报告", tags:["知识图谱","人机协同"], downloads:6},
  {ref:"case:battery", name:"固态电池领域战略研究报告", type:"研究报告", tags:["传感器"], downloads:5},
  {ref:"case:computing", name:"计算机发展趋势", type:"研究报告", tags:["集成电路","人工智能"], downloads:4},
].map(entry=>({...entry, source:"案例广场", text:""}));

export function createKnowledgeLibrary(React) {
  const {createElement:h,useState,useEffect,useLayoutEffect,useRef,useId} = React;
  const btn=(label,action,extras={})=>h("button",{type:"button",className:"lib-btn",onClick:action,...extras},label);
  const tag=label=>h("span",{className:"lib-tag"},label);
  const empty=message=>h("p",{className:"lib-empty"},message);

  function useCollections() {
    const [state,setState]=useState({items:[],ready:false,error:"",remaining:null});
    useEffect(()=>{
      let mounted=true, sequence=0;
      async function refresh() {
        const attempt=++sequence;
        try {
          const items=await listCollections();
          const quota=await navigator.storage?.estimate?.().catch(()=>null);
          if (mounted && attempt===sequence) setState({items,ready:true,error:"",remaining:quota?.quota!=null ? Math.max(0,quota.quota-(quota.usage||0)) : null});
        } catch {
          if (mounted && attempt===sequence) setState(old=>({...old,ready:true,error:"无法读取本机知识库。请检查浏览器存储权限。"}));
        }
      }
      refresh();
      window.addEventListener(CHANGE,refresh);
      const channel=typeof BroadcastChannel!=="undefined" ? new BroadcastChannel(CHANGE) : null;
      if (channel) channel.onmessage=refresh;
      return ()=>{mounted=false;window.removeEventListener(CHANGE,refresh);channel?.close();};
    },[]);
    return state;
  }

  function Modal({title,onClose,children,footer}) {
    const ref=useRef(null), label=useId();
    useLayoutEffect(()=>{
      const el=ref.current, previous=document.activeElement;
      el.showModal();
      return ()=>{el.close(); if (previous?.isConnected) previous.focus({preventScroll:true});};
    },[]);
    return h("dialog",{ref,className:"lib-dialog kb-dialog","aria-labelledby":label,onCancel:e=>{e.preventDefault();onClose();},onClick:e=>{if (e.target===ref.current) {const r=ref.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}},
      h("div",{className:"lib-head"},h("h2",{id:label},title),btn("×",onClose,{"aria-label":"关闭"+title,className:"close-button"})),
      h("div",{className:"lib-body kb-body"},children),footer&&h("div",{className:"lib-foot kb-foot"},footer));
  }

  function FileDetail({file,actions}) {
    return h("div",{className:"kb-stack"},h("div",{className:"kb-spread"},h("h3",null,file.name),tag(file.source)),
      h("p",{className:"lib-muted"},[formatSize(file.size),dateLabel(file.added),file.status].join(" · ")),
      file.tags?.length>0&&h("p",{className:"lib-muted"},[file.type,...file.tags].filter(Boolean).join(" · ")),
      file.text ? h("pre",{className:"kb-content"},file.text) : empty(file.blob ? "此文件暂无可预览正文，可保存原件查看。" : file.source==="案例广场" ? "此案例目前仅提供条目信息，尚未附报告正文。" : "当前任务尚无可用的报告正文。"),
      h("div",{className:"kb-actions"},file.blob&&btn("保存原件",()=>saveOriginal(file)),actions));
  }

  function FileRows({files,view,action}) {
    return files.length ? h("ul",{className:"kb-files"},files.map(file=>
      h("li",{key:file.id},h("div",{className:"kb-file-copy"},h("strong",null,file.name),h("small",null,file.source+" · "+formatSize(file.size)+" · "+file.status)),
        h("div",{className:"kb-actions"},btn("详情",()=>view(file),{"aria-label":"查看"+file.name+"详情"}),action(file))))) : empty("暂无文件");
  }

  function Editor({collection,workspace,onClose,notify}) {
    const [name,setName]=useState(collection.name),[summary,setSummary]=useState(collection.summary);
    const [files,setFiles]=useState(collection.files),[source,setSource]=useState("本地上传"),[query,setQuery]=useState("");
    const [error,setError]=useState(""),[busy,setBusy]=useState(false),[dragging,setDragging]=useState(false);
    const pending=useRef(false),picker=useRef(null),nameId=useId(),summaryId=useId();
    const reports=workspace?.reports || [];
    const libraryEntries=source==="案例广场" ? caseFiles : reports.map(r=>({
      ref:"report:"+r.id,name:r.title,text:[r.text,r.content,r.body].find(x=>typeof x==="string"&&x.trim())||"",source:"我的创作任务",type:r.type,tags:Array.isArray(r.tags)?r.tags.filter(t=>typeof t==="string"):[]
    }));
    const keywords=query.trim().toLowerCase();
    const matches=libraryEntries.filter(entry=>[entry.name,entry.type,...(entry.tags||[]),entry.summary].filter(Boolean).some(value=>value.toLowerCase().includes(keywords)));
    function addEntry(entry) {
      if (pending.current) return;
      if (files.some(f=>f.ref===entry.ref)) {setFiles(old=>old.filter(f=>f.ref!==entry.ref));return;}
      if (files.length >= MAX_FILES) {setError("各来源合计最多添加 10 个文件。");return;}
      setError("");
      const file={...entry,id:uid(),size:bytes(entry.text),added:Date.now(),status:entry.text?"已解析":entry.source==="案例广场"?"仅案例条目":"仅任务记录"};
      setFiles(old=>old.some(f=>f.ref===entry.ref)?old:[...old,file]);
    }
    async function upload(list) {
      const selected=Array.from(list);
      if(!selected.length || pending.current) return;
      const message=checkBatch(files.length, selected);
      if(message) {setError(message);return;}
      pending.current=true;setBusy(true);setError("");
      try {
        const created=[];
        for(const file of selected) created.push(await readLocal(file));
        setFiles(old=>[...old,...created]);
      } catch {setError("文件读取失败，请重新选择。");}
      finally {pending.current=false;setBusy(false);}
    }
    async function save() {
      if(pending.current)return;
      if(!name.trim()){setError("请填写知识库名称");document.getElementById(nameId)?.focus();return;}
      pending.current=true;setBusy(true);
      try {await persist({...collection,name:name.trim(),summary:summary.trim(),files});notify?.("知识库已保存");onClose();}
      catch(e){setError(e?.name==="QuotaExceededError"?"本机存储空间不足，请清理空间后重试。":e?.message||"保存失败，请重试。");}
      finally {pending.current=false;setBusy(false);}
    }
    const allowedClose=()=>{if (!pending.current) onClose();};
    return h(Modal,{title:collection.version?"编辑知识库":"新建知识库",onClose:allowedClose,footer:h(React.Fragment,null,btn("取消",allowedClose,{disabled:busy}),btn(busy?"处理中…":collection.version?"保存":"创建知识库",save,{className:"lib-btn lib-primary",disabled:busy||!name.trim()}))},
      h("div",{className:"kb-stack"},h("label",{htmlFor:nameId},"知识库名称",h("span",{className:"kb-required"}," *")),h("input",{id:nameId,className:"lib-field",value:name,maxLength:120,required:true,onChange:e=>setName(e.target.value)}),
      h("label",{htmlFor:summaryId},"内容简述"),h("textarea",{id:summaryId,className:"lib-field",rows:2,value:summary,onChange:e=>setSummary(e.target.value)}),
      h("strong",null,"来源"),h("div",{className:"kb-actions"},["本地上传","案例广场","我的创作任务"].map(item=>{const count=files.filter(f=>f.source===item).length;return btn(item+(count?" · "+count:""),()=>{setSource(item);setQuery("");},{key:item,"aria-pressed":source===item});})),
      source==="本地上传" ? h("div",null,
        h("button",{className:"kb-upload",type:"button",disabled:busy,"data-dragging":dragging,onClick:()=>picker.current?.click(),
          onDragOver:e=>{e.preventDefault();setDragging(true);},onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);},
          onDrop:e=>{e.preventDefault();setDragging(false);upload(e.dataTransfer.files);}},
          h("strong",null,"点击或拖拽文件到此处上传"),h("small",null,"支持 PDF、Word（.docx）、Excel 及文本文件。单文件不超过 50 MB，各来源合计最多 10 个。")),
        h("input",{ref:picker,type:"file",hidden:true,multiple:true,disabled:busy,accept:UPLOAD_EXTENSIONS.join(","),"aria-label":"选择本地文件",onChange:e=>{const list=Array.from(e.target.files);e.target.value="";upload(list);}}))
      :h(React.Fragment,null,h("input",{className:"lib-field",type:"search","aria-label":"搜索"+source,placeholder:source==="案例广场"?"搜索报告名称、摘要、行业或标签":"搜索任务名称、标签",value:query,onChange:e=>setQuery(e.target.value)}),
        h("ul",{className:"kb-files kb-source-list"},matches.map(entry=>{
          const selected=files.some(f=>f.ref===entry.ref);
          const labels=[entry.type,...(entry.tags||[])].filter(Boolean);
          if(entry.downloads!=null)labels.push(entry.downloads+" 次下载");
          return h("li",{key:entry.ref},h("label",{className:"kb-option"},h("span",{className:"kb-file-copy"},h("strong",null,entry.name),labels.length>0&&h("small",null,labels.join(" · "))),h("input",{type:"checkbox",checked:selected,disabled:busy,onChange:()=>addEntry(entry)})));
        })),!matches.length&&empty(query?"暂无匹配资料":"暂无可选任务")),
      h("div",{className:"kb-spread"},h("strong",null,"已添加 "+files.length+" 个文件"),files.length>0&&btn("清空",()=>setFiles([]),{disabled:busy})),
      files.length>0&&h("ul",{className:"kb-files"},files.map(f=>h("li",{key:f.id},h("div",{className:"kb-file-copy"},h("strong",null,f.name),h("small",null,f.source)),btn("移除",()=>setFiles(old=>old.filter(x=>x.id!==f.id)),{"aria-label":"移除"+f.name,disabled:busy})))),
      error&&h("p",{className:"kb-error",role:"alert"},error)));
  }

  function KnowledgeLibrary({workspace,onAssign,notify}) {
    const {items,ready,error,remaining}=useCollections();
    const [query,setQuery]=useState(""),[page,setPage]=useState(0),[openId,setOpenId]=useState(""),[fileId,setFileId]=useState("");
    const [editing,setEditing]=useState(null),[confirm,setConfirm]=useState(null),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState("");
    const current=items.find(c=>c.id===openId),file=current?.files.find(f=>f.id===fileId);
    const q=query.trim().toLowerCase();
    const filtered=items.filter(c=>[c.name,c.summary,...c.files.map(f=>f.name)].some(s=>s.toLowerCase().includes(q)));
    const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)), index=Math.min(page,pages-1);
    function newCollection(){setEditing({id:uid(),version:0,created:Date.now(),name:"",summary:"",files:[]});}
    function removeCollection(c){setDeleteError("");setConfirm(c);}
    async function remove() {
      if(deleting)return;
      setDeleting(true);
      try {await persist(confirm,true);setConfirm(null);if(confirm.id===openId){setOpenId("");setFileId("");}notify?.("知识库已删除");}
      catch(e){setDeleteError(e?.message||"删除失败，请重试。");}
      finally {setDeleting(false);}
    }
    const assign=(c,files)=>{if(files.length)onAssign(files.map(f=>attachment(c,f)));};
    const assignButton=(c,files)=>btn("加入任务",()=>assign(c,files),{className:"lib-btn kb-link",disabled:!files.length});
    const docs = c => {setOpenId(c.id);setFileId("");};
    let content;
    if(current) {
      content=h(React.Fragment,null,
        h("div",{className:"lib-toolbar kb-spread"},btn(file?"返回文件列表":"返回知识库",()=>{if(file)setFileId("");else setOpenId("");}),
          !file&&btn("编辑知识库",()=>setEditing(current))),
        file?h(FileDetail,{file,actions:assignButton(current,[file])}):h(React.Fragment,null,
          h("div",{className:"kb-spread"},h("h3",null,current.name),tag(current.files.length+" 个文件")),
          current.summary&&h("p",{className:"lib-muted"},current.summary),
          h(FileRows,{files:current.files,view:f=>setFileId(f.id),action:f=>assignButton(current,[f])})));
    } else {
      const firstCollection = ready && !error && items.length === 0 && !q;
      const stats = h("div",{className:"kb-stats lib-muted"},
        h("span",null,"共 "+items.length+" 个知识库"),
        h("span",null,remaining===null?"知识库容量由本机浏览器管理":"剩余知识库容量 "+formatSize(remaining)));
      content=h(React.Fragment,null,
        h("div",{className:"lib-toolbar kb-list-toolbar"+(firstCollection?" kb-empty-toolbar":"")},h("input",{className:"lib-field kb-search",type:"search","aria-label":"搜索知识库",placeholder:"搜索知识库或文件",value:query,onChange:e=>{setQuery(e.target.value);setPage(0);}}),
          firstCollection && stats,
          btn("新建知识库",newCollection,{className:"lib-btn lib-primary",disabled:!ready||!!error})),
        !firstCollection && stats,
        !ready ? empty("正在读取知识库…") : error ? empty(error) : firstCollection
          ? h("div",{className:"kb-welcome"},
              h("span",{className:"kb-folder-art","aria-hidden":true},h("i",{className:"kb-folder-paper"}),h("i",{className:"kb-folder-front"})),
              h("div",{className:"kb-welcome-copy"},h("h3",null,"创建第一个知识库"),h("p",null,"按研究主题归集资料，写报告时可直接引用。")))
          : !filtered.length ? empty("未找到匹配的知识库或文件")
          : h("div",{className:"lib-grid kb-grid"},filtered.slice(index*PAGE_SIZE,(index+1)*PAGE_SIZE).map(c=>
            h("article",{key:c.id,className:"lib-card kb-card"},h("div",{className:"kb-spread"},h("h3",null,btn(c.name,()=>docs(c),{className:"kb-title"})),tag(c.files.length+" 个文件")),
              c.summary&&h("p",{className:"lib-muted"},c.summary),
              h("div",{className:"kb-actions"},assignButton(c,c.files),btn("编辑",()=>setEditing(c),{"aria-label":"编辑"+c.name}),btn("删除",()=>removeCollection(c),{"aria-label":"删除"+c.name}))))),
        pages>1&&h("nav",{className:"kb-pages","aria-label":"知识库分页"},btn("上一页",()=>setPage(index-1),{disabled:index===0}),h("span",null,(index+1)+" / "+pages),btn("下一页",()=>setPage(index+1),{disabled:index+1>=pages})));
    }
    return h("section",{className:"lib-panel kb-library","aria-label":"知识库"},content,
      editing&&h(Editor,{key:editing.id,collection:editing,workspace,onClose:()=>setEditing(null),notify}),
      confirm&&h(Modal,{title:"删除知识库",onClose:()=>{if(!deleting)setConfirm(null);},footer:h(React.Fragment,null,btn("取消",()=>setConfirm(null),{disabled:deleting}),btn("确认删除",remove,{className:"lib-btn kb-danger",disabled:deleting}))},
        h("p",null,"确定删除「"+confirm.name+"」及其中的 "+confirm.files.length+" 个文件吗？"),deleteError&&h("p",{role:"alert",className:"kb-error"},deleteError)));
  }

  function KnowledgePicker({attachments=[],onChange,onMore,onClose,notify}) {
    const {items,ready,error}=useCollections();
    const [query,setQuery]=useState(""),[openId,setOpenId]=useState(""),[fileId,setFileId]=useState("");
    const current=items.find(c=>c.id===openId),file=current?.files.find(f=>f.id===fileId);
    const selected=new Set(attachments.filter(a=>a.source==="knowledge").map(a=>a.id));
    const q=query.trim().toLowerCase();
    function toggle(c,files) {
      const incoming=files.map(f=>attachment(c,f));
      if(!incoming.length)return;
      const ids=new Set(incoming.map(a=>a.id));
      const remove=incoming.every(a=>selected.has(a.id));
      onChange(remove ? attachments.filter(a=>a.source!=="knowledge"||!ids.has(a.id)) : [...attachments,...incoming.filter(a=>!selected.has(a.id))]);
      notify?.(remove?"已从本次任务移除":"已添加到本次任务");
    }
    const action=(c,files,detail=false)=>{
      const all=files.length>0&&files.every(f=>selected.has("kb:"+c.id+":"+f.id));
      return btn(all?"移除":detail?"加入任务":"添加",()=>toggle(c,files),{disabled:!files.length,"aria-pressed":all,className:"lib-btn "+(all?"":"kb-link")});
    };
    function open(c,f) {setOpenId(c.id);setFileId(f?.id||"");}
    function goBack() {if(file)setFileId("");else setOpenId("");}
    const searchResults=[];
    if(q) for(const c of items) {
      if(c.name.toLowerCase().includes(q))searchResults.push({c,label:c.name});
      for(const f of c.files)if(f.name.toLowerCase().includes(q))searchResults.push({c,f,label:f.name});
    }
    searchResults.sort((a,b)=>Number(!a.label.toLowerCase().startsWith(q))-Number(!b.label.toLowerCase().startsWith(q)) || a.label.toLowerCase().indexOf(q)-b.label.toLowerCase().indexOf(q));
    const shown=q?searchResults.slice(0,5):items.slice(0,5).map(c=>({c,label:c.name}));
    return h(Modal,{title:file?"文件详情":current?current.name:"添加知识库",onClose:file?goBack:onClose,
      footer:h(React.Fragment,null,current&&btn(file?"返回文件列表":"返回知识库列表",goBack),file?action(current,[file],true):btn("查看更多知识库",onMore),!file&&btn("完成",onClose,{className:"lib-btn lib-primary"}))},
      !ready?empty("正在读取知识库…"):error?empty(error):file?h(FileDetail,{file}):current
        ?h(FileRows,{files:current.files,view:f=>open(current,f),action:f=>action(current,[f])})
        :h("div",{className:"kb-stack"},
          h("input",{className:"lib-field",type:"search",value:query,placeholder:"搜索知识库或文件","aria-label":"搜索知识库或文件",onChange:e=>setQuery(e.target.value)}),
          shown.length ? h("ul",{className:"kb-files"},shown.map(({c,f,label})=>h("li",{key:c.id+":"+(f?.id||"")},h("div",{className:"kb-file-copy"},h("strong",null,label),h("small",null,f?c.name+" · "+f.source:c.files.length+" 个文件")),
            h("div",{className:"kb-actions"},btn("查看",()=>open(c,f),{"aria-label":"查看"+label}),action(c,f?[f]:c.files)))))
          :empty(q?"未找到匹配的知识库或文件":"暂无知识库，可前往知识库创建合集。")));
  }
  return {KnowledgeLibrary,KnowledgePicker};
}

export { listCollections, persist, checkBatch };
