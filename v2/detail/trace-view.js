(function () {
  'use strict';
  const mounts = new WeakMap();
  const categories = [
    {key:'source', label:'原文引用', section:'来源材料', icon:['M6 3h8l4 4v14H6z','M14 3v5h4M9 12h6M9 16h5']},
    {key:'metric', label:'指标计算', section:'计算口径与记录', icon:['M5 3h14v18H5z','M8 7h8M8 11h1m3 0h1m3 0h.1M8 15h1m3 0h1m3 0h.1']},
    {key:'reason', label:'判断依据', section:'推断依据', icon:['M4 4h5v5H4zM15 15h5v5h-5zM4 15h5v5H4z','M6.5 9v6m0-3h11v3']}
  ];
  function text(value) { return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''; }
  function safeAddress(doc, raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    try {
      const url = new URL(raw,doc.baseURI);
      if (url.protocol==='file:' && new URL(doc.baseURI).protocol==='file:' && /^[.]{0,1}\/?trace-sources\//.test(raw.trim()) && url.href.startsWith(new URL('./',doc.baseURI).href)) return url.href;
      return ['https:','http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function mount(host, model) {
    if (!host || host.nodeType !== 1) return;
    const earlier = mounts.get(host);
    if (earlier && earlier.root.parentNode === host) { earlier.update(model); return earlier.api; }
    earlier?.api.destroy();
    const doc = host.ownerDocument, win = doc.defaultView;
    const el = (tag, cls, label) => {
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      if (label !== undefined) node.textContent = text(label);
      return node;
    };
    function button(cls, label) {
      const node=el('button',cls,label); node.type='button'; return node;
    }
    function icon(category) {
      const svg = doc.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
      for (const d of category.icon) {
        const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);
      }
      return svg;
    }
    function section(heading) {
      const block=el('section','gtv-part');
      block.append(el('h3','',heading));return block;
    }
    function state(label) {
      const span=el('span','gtv-status',label);
      if (/待|未|缺少|缺失|不足|无权/.test(label)) span.classList.add('is-pending');
      return span;
    }
    function renderTable(records) {
      if (!Array.isArray(records?.headers) || !records.headers.length || !Array.isArray(records.rows) || !records.rows.length) return null;
      const wrap=el('div','gtv-table-wrap'),table=el('table','gtv-table');
      wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','明细记录');
      const tr=el('tr');
      records.headers.forEach(label => { const th=el('th','',label); th.scope='col'; tr.append(th); });
      const thead=el('thead');thead.append(tr);
      const tbody=el('tbody');
      records.rows.filter(Array.isArray).forEach(row=>{
        const line=el('tr');records.headers.forEach((_,i)=>line.append(el('td','',row[i])));tbody.append(line);
      });
      table.append(thead,tbody); wrap.append(table);return wrap;
    }
    const root=el('section','gtv');
    root.setAttribute('aria-label','数据溯源');
    const summary=el('div','gtv-summary'),groupList=el('div','gtv-categories');
    const intro=el('div','gtv-summary-intro'), overview=el('p','gtv-overview');
    intro.append(el('h2','','数据溯源'),overview);summary.append(intro,groupList);
    const dialog=el('dialog','gtv-dialog');dialog.setAttribute('aria-label','数据溯源详情');
    const header=el('header','gtv-head'),heading=el('h2','','数据溯源'),closeBtn=button('gtv-close','×');
    closeBtn.setAttribute('aria-label','关闭数据溯源详情');closeBtn.title='关闭';
    header.append(heading,closeBtn);
    const nav=el('div','gtv-nav');nav.setAttribute('role','group');nav.setAttribute('aria-label','溯源类别');
    const body=el('div','gtv-body');
    dialog.append(header,nav,body);root.append(summary,dialog);host.replaceChildren(root);
    let groups=[], key='source', selected=0, signature='', returnTo=null;
    function renderSummary() {
      groupList.replaceChildren();nav.replaceChildren();
      for (const group of groups) {
        const chip=button('gtv-chip'),tab=button('gtv-tab');
        chip.dataset.gtvKey=group.key; tab.dataset.gtvKey=group.key;
        chip.setAttribute('aria-haspopup','dialog');
        const title=el('span','gtv-chip-title');title.append(icon(group),el('b','',group.label));
        chip.append(title,state(group.status)); groupList.append(chip);
        tab.append(icon(group),el('span','',group.label));nav.append(tab);
      }
    }
    function renderBody() {
      const group=groups.find(item=>item.key===key)||groups[0];
      nav.querySelectorAll('[data-gtv-key]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.gtvKey===group.key)));
      body.replaceChildren();body.scrollTop=0;
      if (!group.items.length) {
        const blank=el('section','gtv-blank');
        blank.append(state(group.status),el('p','',group.note||'当前报告尚无可供核对的'+group.label+'记录。'));body.append(blank);return;
      }
      const item=group.items[selected]||group.items[0];
      const itemHead=el('div','gtv-item-head');
      if (group.items.length>1) {
        const label=el('label','gtv-picker'); label.append(el('span','','关联条目'));
        const select=el('select'); select.setAttribute('aria-label','选择溯源条目'); select.dataset.gtvItems='true';
        group.items.forEach((record,i)=>{
          const option=el('option','',record.title||'记录 '+(i+1));option.value=String(i);option.selected=i===selected;select.append(option);
        });
        label.append(select);itemHead.append(label);
      } else itemHead.append(el('h3','gtv-item-title',item.title||group.label));
      if (item.status || group.status) itemHead.append(state(text(item.status)||group.status));body.append(itemHead);
      const claim=text(item.claim),anchor=text(item.anchor);
      if (claim || anchor) {
        const claimPart=section('报告中的判断');
        if(claim) claimPart.append(el('p','gtv-claim',claim));
        if(anchor) { const locate=button('gtv-locate','定位正文'); locate.dataset.gtvLocate='true';claimPart.append(locate); }
        body.append(claimPart);
      }
      const material=section(group.section);
      if (text(item.location)) material.append(el('p','gtv-location',item.location));
      if (text(item.quote)) material.append(el('blockquote','gtv-quote',item.quote));
      const fields=Array.isArray(item.fields)?item.fields.filter(field=>text(field?.label)&&text(field?.value)):[];
      function addFields(values) {
        if (!values.length) return;
        const dl=el('dl','gtv-fields');
        values.forEach(field=>{const row=el('div');row.append(el('dt','',field.label),el('dd','',field.value));dl.append(row);});
        material.append(dl);
      }
      const table=renderTable(item.records);
      if(table){
        addFields(fields.filter(field=>field.label==='计算结果'));
        material.append(table);
      }else addFields(fields);
      const links=el('div','gtv-links');
      if(Array.isArray(item.links)) item.links.forEach(link=>{
        const href=safeAddress(doc,link?.href);if(!href)return;
        const a=el('a','',link.label||'打开材料');a.href=href;a.rel='noopener noreferrer';
        if(link.download && new URL(href).origin === new URL(doc.baseURI).origin) a.download=typeof link.download==='string'?link.download:'';
        else {a.target='_blank';a.append(el('span','gtv-out',' ↗'));}
        links.append(a);
      });
      if(links.childElementCount)material.append(links);
      if(table)addFields(fields.filter(field=>field.label!=='计算结果'));
      if(material.childElementCount===1)material.append(el('p','gtv-location','暂未关联可核对的来源记录。'));body.append(material);
      if(text(item.boundary)) { const bound=section('可支持的范围');bound.classList.add('gtv-boundary');bound.append(el('p','',item.boundary));body.append(bound); }
      if(Array.isArray(item.related)) {
        const related=el('div','gtv-related');
        item.related.forEach(ref=>{
          const name=typeof ref==='string'?ref:ref?.key;
          const target=groups.find(other=>other.key===name);
          if(!target||target.key===key)return;
          const link=button('gtv-related-link',text(ref?.label)||('查看'+target.label));
          link.dataset.gtvRelated=target.key;link.dataset.gtvIndex=String(Number.isInteger(ref?.index)?ref.index:0);related.append(link);
        });
        if(related.childElementCount)body.append(related);
      }
    }
    function open(requestedKey, index=0, origin) {
      const target=groups.find(group=>group.key===requestedKey)||groups[0];
      if (!target) return;
      selected=Number.isInteger(index)&&index>=0&&index<target.items.length?index:0;
      key=target.key;renderBody();
      if (!dialog.open) {
        returnTo=origin||doc.activeElement;
        dialog.showModal();closeBtn.focus({preventScroll:true});
      }
    }
    function onChange(event) {
      if (!event.target.matches('select[data-gtv-items]')) return;
      selected=Number(event.target.value);renderBody();
      body.querySelector('[data-gtv-items]')?.focus({preventScroll:true});
    }
    function onClick(event) {
      const target=event.target.closest?.('button');
      if(target===closeBtn){dialog.close();return;}
      if(target?.hasAttribute('data-gtv-locate')){
        const quote=text(groups.find(group=>group.key===key)?.items[selected]?.anchor);
        if(quote){dialog.close();host.dispatchEvent(new win.CustomEvent('gkx-trace-locate',{bubbles:true,detail:{quote}}));}
        return;
      }
      if(target?.hasAttribute('data-gtv-related')){
        open(target.dataset.gtvRelated,Number(target.dataset.gtvIndex));
        nav.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});return;
      }
      if(target?.hasAttribute('data-gtv-key')){open(target.dataset.gtvKey,0,target);return;}
      if(event.target===dialog){
        const r=dialog.getBoundingClientRect();
        if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
      }
    }
    function restoreFocus() {
      const target=returnTo;returnTo=null;
      if(target?.isConnected)target.focus({preventScroll:true});
    }
    function update(data) {
      const next=JSON.stringify(data || {});
      if(signature===next)return;
      overview.textContent=text(data?.summary);overview.hidden=!overview.textContent;
      summary.classList.toggle('has-overview',!overview.hidden);
      const supplied=Array.isArray(data?.groups)?data.groups:[];
      const old=groups.find(group=>group.key===key)?.items[selected]?.title;
      groups=categories.map(category=>{
        const value=supplied.find(group=>group?.key===category.key)||{};
        const items=Array.isArray(value.items)?value.items.filter(item=>item&&typeof item==='object'):[];
        return {...category,label:text(value.label)||category.label,status:text(value.status)||(items.length?'已关联':'待补证'),note:text(value.note),items};
      });
      signature=next;selected=Math.max(0,groups.find(group=>group.key===key)?.items.findIndex(item=>old&&item.title===old)??-1);
      const previousOriginKey=returnTo?.dataset?.gtvKey;
      renderSummary();
      if(previousOriginKey) returnTo=groupList.querySelector('[data-gtv-key="'+previousOriginKey+'"]');
      if(dialog.open)renderBody();
    }
    function destroy() {
      if(dialog.open){dialog.close();restoreFocus();}
      root.removeEventListener('click',onClick);body.removeEventListener('change',onChange);dialog.removeEventListener('close',restoreFocus);
      root.remove();if(mounts.get(host)?.root===root)mounts.delete(host);
    }
    const api={open,destroy};root.addEventListener('click',onClick);body.addEventListener('change',onChange);dialog.addEventListener('close',restoreFocus);
    mounts.set(host,{root,update,api});update(model);return api;
  }
  window.GkxTraceView={mount};
})();
