export function createOutlineReview(React, jsxRuntime) {
  const el = React.createElement;
  const iconPaths = {
    up: 'm5 10 5-5 5 5',
    down: 'm5 7 5 5 5-5',
    remove: 'M4 5.5h12M8 5.5V3.8h4v1.7M6.1 5.5l.6 10h6.6l.6-10M8.7 8v5M11.3 8v5',
    plus: 'M10 4v12M4 10h12'
  };
  function icon(name) {
    return el('svg', {viewBox:'0 0 20 20', width:16, height:16, fill:'none', stroke:'currentColor',
      strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true}, el('path',{d:iconPaths[name]}));
  }
  function action(label, actionName, onClick, disabled = false) {
    return el('button', {type:'button', className:'outline-review-tool', 'aria-label':label,
      title:label, onClick, disabled}, icon(actionName));
  }
  return function OutlineReview({outline = [], onChange, onConfirm, topic, templateName, error}) {
    const headingId = React.useId();
    const messageId = React.useId();
    const root = React.useRef(null);
    const pendingFocus = React.useRef(null);
    React.useEffect(() => {
      const frame = requestAnimationFrame(() => {
        const card = root.current;
        const scroller = card?.closest('[data-node-id="1:69"]');
        if (!card || !scroller) return;
        const bounds = card.getBoundingClientRect(), view = scroller.getBoundingClientRect();
        if (bounds.bottom <= view.bottom - 12 && bounds.top >= view.top) return;
        const offset = bounds.height <= scroller.clientHeight - 24 ? bounds.bottom - view.bottom + 12 : bounds.top - view.top - 12;
        scroller.scrollTop += offset;
      });
      return () => cancelAnimationFrame(frame);
    }, []);
    React.useLayoutEffect(() => {
      if (pendingFocus.current === null) return;
      const target = root.current?.querySelector(`[data-outline-focus="${pendingFocus.current}"]`);
      pendingFocus.current = null;
      target?.focus();
    }, [outline]);
    const chapters = Array.isArray(outline) ? outline : [];
    let validation = chapters.length ? '' : '请至少添加一个章节。';
    for (const [i, chapter] of chapters.entries()) {
      if (!chapter.title?.trim()) { validation = `请填写第 ${i + 1} 章的标题。`; break; }
      const missing = (chapter.children || []).findIndex(text => !text.trim());
      if (missing !== -1) { validation = `请补全或删除第 ${i + 1} 章的第 ${missing + 1} 个子标题。`; break; }
    }
    function updateChapter(index, changes) {
      onChange(chapters.map((chapter, i) => i === index ? {...chapter, ...changes} : chapter));
    }
    function moveChapter(index, offset) {
      const destination = index + offset;
      if (destination < 0 || destination >= chapters.length) return;
      const next = chapters.slice();
      const [chapter] = next.splice(index, 1);
      next.splice(destination, 0, chapter);
      pendingFocus.current = `chapter-${destination}`;
      onChange(next);
    }
    function deleteChapter(index) {
      const next = chapters.filter((_, i) => i !== index);
      pendingFocus.current = next.length ? `chapter-${Math.min(index, next.length - 1)}` : 'add';
      onChange(next);
    }
    function renderChapter(chapter, index) {
      const name = `第 ${index + 1} 章`;
      const children = chapter.children || [];
      return el('li', {key:index, className:'outline-review-chapter'},
        el('div', {className:'outline-review-chapter-head'},
          el('span', {className:'outline-review-number','aria-hidden':true}, String(index + 1)),
          el('input', {type:'text', value:chapter.title || '', placeholder:'章节标题', 'aria-label':`${name}标题`,
            'data-outline-focus':`chapter-${index}`, 'aria-invalid':!chapter.title?.trim(),
            'aria-describedby':!chapter.title?.trim() ? messageId : undefined,
            onChange:event => updateChapter(index, {title:event.target.value})}),
          el('div', {className:'outline-review-tools'},
            action(`上移${name}`, 'up', () => moveChapter(index,-1), index === 0),
            action(`下移${name}`, 'down', () => moveChapter(index,1), index === chapters.length-1),
            action(`删除${name}`, 'remove', () => deleteChapter(index)))),
        chapter.body ? el('p', {className:'outline-review-brief'}, chapter.body) : null,
        el('ol', {className:'outline-review-subheadings'}, children.map((text, childIndex) => {
          const childName = `${name}第 ${childIndex + 1} 个子标题`;
          return el('li', {key:childIndex},
            el('span', {'aria-hidden':true, className:'outline-review-branch'}),
            el('input', {type:'text', value:text, placeholder:'子标题', 'aria-label':childName,
              'data-outline-focus':`child-${index}-${childIndex}`, 'aria-invalid':!text.trim(),
              'aria-describedby':!text.trim() ? messageId : undefined,
              onChange:event => updateChapter(index, {children:children.map((entry, j) => j === childIndex ? event.target.value : entry)})}),
            action(`删除${childName}`, 'remove', () => {
              const next = children.filter((_, j) => j !== childIndex);
              pendingFocus.current = next.length ? `child-${index}-${Math.min(childIndex, next.length - 1)}` : `add-child-${index}`;
              updateChapter(index, {children:next});
            }));
        })),
        el('button', {type:'button', className:'outline-review-add-child', 'aria-label':`为${name}添加子标题`,
          'data-outline-focus':`add-child-${index}`, onClick:() => {
            pendingFocus.current = `child-${index}-${children.length}`;
            updateChapter(index, {children:[...children, '']});
          }}, icon('plus'), '添加子标题'));
    }
    return el('section', {ref:root, className:'outline-review', 'aria-labelledby':headingId},
      el('header', {className:'outline-review-head'},
        el('h2', {id:headingId}, '文章大纲'),
        topic ? el('p', {className:'outline-review-topic'}, topic) : null,
        templateName && templateName !== '不使用模板' ? el('p', {className:'outline-review-template'}, `写作模板 · ${templateName}`) : null),
      el('ol', {className:'outline-review-chapters'}, chapters.map(renderChapter)),
      el('button', {type:'button', className:'outline-review-add', 'data-outline-focus':'add', onClick:() => {
        pendingFocus.current = `chapter-${chapters.length}`;
        onChange([...chapters, {title:'', children:[]}]);
      }}, icon('plus'), '添加章节'),
      el('footer', {className:'outline-review-footer'},
        el('span', {id:messageId, className:'outline-review-error', role:'status', 'aria-live':'polite'}, validation || error || ''),
        el('button', {type:'button', className:'outline-review-confirm', disabled:Boolean(validation),
          onClick:() => { if (!validation) onConfirm(chapters); }}, '确认大纲，开始写作')));
  };
}
