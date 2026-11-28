const mountedFlows = new WeakMap();
const stateLabels = { done: '已完成', active: '进行中', pending: '待开展' };

export function mountResearchFlow(host, initialModel) {
  if (!host || host.nodeType !== 1) throw new TypeError('研究流程图需要一个显示容器');
  const previous = mountedFlows.get(host);
  if (previous && previous.root.parentNode === host) {
    previous.api.update(initialModel);
    return previous.api;
  }
  previous?.api.destroy();
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const svgNS = 'http://www.w3.org/2000/svg';
  function node(tag, className, value) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  }
  function text(element, value) {
    const next = String(value ?? '');
    if (element.textContent !== next) element.textContent = next;
  }
  const root = node('section', 'gkx-rf');
  root.setAttribute('aria-label', '战略研究流程图');
  const header = node('div', 'gkx-rf-header');
  const percentage = node('span', 'gkx-rf-percentage');
  const progress = node('span', 'gkx-rf-progress');
  const track = node('span', 'gkx-rf-track'), fill = node('i');
  track.setAttribute('aria-hidden', 'true');
  track.append(fill); progress.append(node('span','gkx-rf-progress-label','写作进度'),track,percentage);
  header.append(node('h3', '', '战略研究流程图'), progress);

  const board = node('div', 'gkx-rf-board');
  const grid = node('div', 'gkx-rf-grid');
  const topic = node('div', 'gkx-rf-topic');
  const topicTitle = node('strong');
  topic.append(node('span', 'gkx-rf-topic-label', '本次研究'), topicTitle);
  const connectors = doc.createElementNS(svgNS, 'svg');
  connectors.setAttribute('class','gkx-rf-lines');
  connectors.setAttribute('aria-hidden','true');
  connectors.setAttribute('preserveAspectRatio','none');
  const lineSlot=node('div','gkx-rf-line-slot'); lineSlot.append(connectors);
  const list = node('div','gkx-rf-list');
  list.setAttribute('role','group');
  list.setAttribute('aria-label','研究环节');
  grid.append(topic,lineSlot,list); board.append(grid);

  const details = node('section','gkx-rf-details');
  details.setAttribute('aria-label','所选环节详情');
  const detailHead = node('div','gkx-rf-detail-head');
  const detailTitle = node('h4'), follow = node('button','gkx-rf-follow','回到当前节点');
  follow.type='button';
  detailHead.append(detailTitle,follow);
  const summary = node('p','gkx-rf-description'), detail = node('p','gkx-rf-explanation');
  const items = node('ul','gkx-rf-items');
  const dialogue = node('div','gkx-rf-dialogue');
  details.append(detailHead,summary,detail,items,dialogue);
  const note = node('p','gkx-rf-note');
  root.append(header,board,details,note);host.replaceChildren(root);

  let stages = [], rows = [], selection = null, current = null;
  let report = '', itemSignature = '', dialogueSignature = '', scheduled = 0, observer;
  function draw() {
    scheduled = 0;
    if (!root.isConnected || !rows.length) return;
    const area = connectors.getBoundingClientRect();
    if (!area.width || !area.height) return;
    const width = area.width, height = area.height;
    const topicBox = topic.getBoundingClientRect();
    const start = topicBox.top + topicBox.height/2 - area.top;
    connectors.setAttribute('viewBox', '0 0 '+width+' '+height);
    rows.forEach(row => {
      const box = row.button.getBoundingClientRect();
      const end = box.top + box.height/2 - area.top;
      const d = 'M0 '+start+' C'+(width*.45)+' '+start+' '+(width*.52)+' '+end+' '+width+' '+end;
      if (row.line.getAttribute('d') !== d) { row.line.setAttribute('d',d); row.signal.setAttribute('d',d); }
    });
  }
  function redraw() {
    if (!scheduled) scheduled=win.requestAnimationFrame(draw);
  }
  function buildRows() {
    const focused=doc.activeElement?.dataset?.rfId;
    list.replaceChildren(); connectors.replaceChildren();
    rows=stages.map((stage,index)=>{
      const button=node('button','gkx-rf-node'); button.type='button';
      button.dataset.rfId=stage.id;
      const marker=node('span','gkx-rf-marker'); marker.setAttribute('aria-hidden','true');
      const title=node('span','gkx-rf-node-title'), status=node('span','gkx-rf-state'), brief=node('span','gkx-rf-brief');
      button.append(marker,title,status,brief); list.append(button);
      const group=doc.createElementNS(svgNS,'g'), line=doc.createElementNS(svgNS,'path'), signal=doc.createElementNS(svgNS,'path');
      signal.setAttribute('class','gkx-rf-signal');group.append(line,signal);connectors.append(group);
      return {id:stage.id,button,title,status,brief,marker,group,line,signal};
    });
    if (focused) rows.find(row=>row.id===focused)?.button.focus({preventScroll:true});
    redraw();
  }
  function renderDialogue(turns) {
    const signature = JSON.stringify(turns);
    if (signature === dialogueSignature) return;
    dialogueSignature = signature;
    dialogue.hidden = !turns.length;
    dialogue.replaceChildren(...turns.map(({label,counter,authorReply}, index) => {
      const group = node('details','gkx-rf-exchange');
      group.open = index === 0;
      group.append(node('summary','',label));
      for (const [role, text, style] of [['反方智能体',counter,'counter'], ['写作智能体',authorReply,'author']]) {
        const message = node('div','gkx-rf-message gkx-rf-message-'+style);
        message.append(node('strong','',role),node('p','',text));
        group.append(message);
      }
      return group;
    }));
  }
  function select() {
    const selected = stages.find(stage=>stage.id===(selection??current));
    for (const row of rows) {
      const pressed=String(row.id===selected?.id);
      if(row.button.getAttribute('aria-pressed')!==pressed)row.button.setAttribute('aria-pressed',pressed);
    }
    details.hidden = !selected;
    if (!selected) return;
    follow.hidden = selection===null || selection===current;
    text(detailTitle,selected.title);
    text(summary,selected.summary); summary.hidden=!selected.summary;
    text(detail,selected.detail); detail.hidden=!selected.detail || selected.detail===selected.summary;
    const values=Array.isArray(selected.items)?selected.items.filter(value=>typeof value==='string'&&value.trim()):[];
    const next=JSON.stringify(values);
    if (next!==itemSignature) {
      items.replaceChildren(...values.map(value=>node('li','',value)));
      itemSignature=next;
    }
    items.hidden=!values.length;
    renderDialogue(selected.dialogue || []);
  }
  function update(model = {}) {
    model=model||{};
    const identity=String(model.reportId??model.title??'');
    if(report!==identity)selection=null;
    report=identity;
    stages = Array.isArray(model.stages) ? model.stages.filter(stage=>stage?.id && stage.title) : [];
    if (!stages.some(stage=>stage.id===selection))selection=null;
    const active=stages.find(stage=>stage.state==='active');
    current=(active || [...stages].reverse().find(stage=>stage.state==='done') || stages[0])?.id;
    text(topicTitle,model.title||'当前研究任务');topic.title=topicTitle.textContent;
    const value=Math.max(0,Math.min(100,Math.round(Number(model.progress)||0)));
    text(percentage,value+'%'); progress.setAttribute('aria-label','写作进度 '+value+'%');
    fill.style.width=value+'%';
    const helper=typeof model.progressNote==='string'?model.progressNote:'';
    text(note,helper);note.hidden=!helper;
    if (rows.length!==stages.length || rows.some((row,i)=>row.id!==stages[i].id))buildRows();
    stages.forEach((stage,i)=>{
      const row=rows[i], state=Object.hasOwn(stateLabels,stage.state)?stage.state:'pending';
      if(row.button.dataset.state!==state){
        row.button.dataset.state=state;
        row.group.setAttribute('data-state',state);
        // The active branch is drawn on top where the five branches share a port.
        if(state==='active')connectors.append(row.group);
        text(row.marker,state==='done'?'✓':String(i+1));
      }
      text(row.status,stage.statusLabel||stateLabels[state]);
      text(row.title,stage.title);
      text(row.brief,stage.summary);row.brief.hidden=!stage.summary;
    });
    board.hidden=!stages.length;
    select();
  }
  function choose(id) { selection=id;select(); }
  function onClick(event) {
    if (dialogue.contains(event.target)) {
      if (selection === null && current) choose(current);
      return;
    }
    const button=event.target.closest('button');
    if(button===follow) {
      selection=null;select();rows.find(row=>row.id===current)?.button.focus({preventScroll:true});return;
    }
    if(button && list.contains(button))choose(rows.find(row=>row.button===button)?.id);
  }
  function onKey(event) {
    const start=rows.findIndex(row=>row.button===event.target);
    if(start<0)return;
    const keys={ArrowUp:Math.max(0,start-1),ArrowDown:Math.min(rows.length-1,start+1),Home:0,End:rows.length-1};
    if(!Object.hasOwn(keys,event.key))return;
    event.preventDefault();
    const row=rows[keys[event.key]];
    choose(row.id);row.button.focus();
  }
  function destroy() {
    if(scheduled)win.cancelAnimationFrame(scheduled);
    observer?.disconnect();win.removeEventListener('resize',redraw);
    root.removeEventListener('click',onClick);list.removeEventListener('keydown',onKey);
    root.remove();if(mountedFlows.get(host)?.root===root)mountedFlows.delete(host);
  }
  root.addEventListener('click',onClick);list.addEventListener('keydown',onKey);
  if (win.ResizeObserver) { observer=new win.ResizeObserver(redraw);observer.observe(grid);observer.observe(list); }
  else win.addEventListener('resize',redraw);
  const api={update,destroy};
  mountedFlows.set(host,{root,api});update(initialModel);return api;
}
