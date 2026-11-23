export function createTaskAssignment(React, Select) {
  const {createElement: el, useId, useLayoutEffect, useRef, useState} = React;
  const action = (label, onClick, extra) => el("button", {type:"button", className:"lib-btn", onClick, ...extra}, label);

  return function TaskAssignment({files, workspace, onWorkspaceChange, onAssigned, onClose, notify}) {
    const ref = useRef(null);
    const titleId = useId();
    const [project, setProject] = useState(workspace.folders[0]?.id || "");
    const [task, setTask] = useState("");
    const [mode, setMode] = useState("");
    const [name, setName] = useState("");
    const [reportType, setReportType] = useState("战略分析报告");
    const [error, setError] = useState("");
    const reports = workspace.reports.filter(row => row.folderId === project);
    const hasSelection = reports.some(row => row.id === task);
    useLayoutEffect(() => {
      const dialog = ref.current;
      dialog.showModal();
      return () => { if (dialog.open) dialog.close(); };
    }, []);
    function edit(nextMode, projectId) {
      setMode(nextMode);
      setName("");
      setError("");
      if (projectId) { setProject(projectId); setTask(""); }
    }
    function create(event) {
      event.preventDefault();
      const value = name.trim();
      if (!value) { setError("请输入名称"); return; }
      if (mode === "project") {
        if (workspace.folders.some(f => f.name === value)) { setError("项目名称已存在"); return; }
        const id = "project-" + crypto.randomUUID();
        if (onWorkspaceChange(prev => ({...prev, folders:[...prev.folders, {id, name:value}]})) === false) { setError("项目未保存，请检查本机存储空间。"); return; }
        setProject(id);
        setTask("");
        edit("task");
        return;
      }
      if (!workspace.folders.some(f => f.id === project)) { setError("请选择项目"); return; }
      if (reports.some(r => r.title === value)) { setError("该项目下已有同名任务"); return; }
      const id = "report-" + crypto.randomUUID();
      const row = {id, folderId:project, title:value, type:reportType, updatedAt:Date.now(), notified:false};
      if (onWorkspaceChange(prev => ({...prev, reports:[...prev.reports, row]})) === false) { setError("任务未保存，请检查本机存储空间。"); return; }
      setTask(id);
      edit("");
    }
    function assign() {
      if (!hasSelection || !files.length) return;
      if (onAssigned(task, files) === false) { setError("资料未保存，请检查任务是否存在及本机存储空间。"); return; }
      notify("已添加到写作任务");
      onClose();
    }
    return el("dialog", {ref, className:"lib-dialog assignment-dialog","aria-labelledby":titleId,
      onCancel:e=>{e.preventDefault();onClose();}},
      el("header",{className:"lib-head"},el("h2",{id:titleId},"加入写作任务"),action("×",onClose,{className:"close-button","aria-label":"关闭任务选择"})),
      el("div",{className:"lib-body assignment-body"},
        el("p",{className:"lib-muted"},files.length===1?files[0].name:"已选 "+files.length+" 份资料"),
        el("div",{className:"assignment-layout"},
          el("section",null,el("header",{className:"assignment-heading"},el("h3",null,"写作项目"),action("新建项目",()=>edit("project"))),
            el("ul",{className:"assignment-list"},workspace.folders.map(f=>el("li",{key:f.id},
              action(f.name,()=>{setProject(f.id);setTask("");edit("");},{className:"assignment-project","aria-pressed":f.id===project}),
              action("＋",()=>edit("task",f.id),{className:"assignment-add","aria-label":"在"+f.name+"中新建任务",title:"新建任务"}))))),
          el("section",null,el("h3",null,"写作任务"),
            reports.length ? el("div",{className:"assignment-task-list"},reports.map(r=>el("label",{key:r.id},
              el("input",{type:"radio",name:titleId+"-report",checked:task===r.id,onChange:()=>{setTask(r.id);edit("");}}),r.title)))
              : el("p",{className:"lib-muted"},"此项目暂无写作任务。可新建任务，或在对话中添加知识库。"))),
        mode && el("form",{onSubmit:create,className:"assignment-form"},
          el("label",null,mode==="project"?"新项目名称":"新任务名称",el("input",{className:"lib-field",autoFocus:true,value:name,required:true,maxLength:160,onChange:e=>setName(e.target.value)})),
          mode==="task" && el("label",null,"报告类型",el(Select,{label:"报告类型",value:reportType,
            options:["战略分析报告","研究报告","洞察报告"].map(value=>({value,label:value})),onValueChange:setReportType})),
          el("div",{className:"assignment-form-actions"},action("取消",()=>edit("")),el("button",{type:"submit",className:"lib-btn lib-primary"},mode==="project"?"创建项目":"创建任务"))),
        error && el("p",{role:"alert",className:"lib-error"},error)),
      el("footer",{className:"lib-foot"},action("取消",onClose),action("加入任务",assign,{className:"lib-btn lib-primary",disabled:!hasSelection||!!mode||!files.length})));
  };
}
