export const placeholderKinds = ['文本', '表格', '图表', '智能分析摘要'];

const chartTypes = ['自动推荐', '柱状图', '折线图', '饼图'];
const analysisTypes = ['趋势分析', '构成分析', '异常检测', '用户自定义模板'];
const sources = [
  {dataset:'资讯数据集', table:'主题热度月表', dimension:'月份', metric:'主题热度', unit:'次', series:true,
    rows:[['7 月',24,21], ['8 月',30,24], ['9 月',38,30]]},
  {dataset:'资讯数据集', table:'来源渠道分布表', dimension:'来源渠道', metric:'资讯数量', unit:'条',
    rows:[['学术期刊',32,28], ['产业媒体',24,22], ['政策文件',18,16]]},
  {dataset:'论文数据集', table:'学科年度统计表', dimension:'学科', metric:'论文数量', unit:'篇',
    rows:[['材料科学',36,29], ['计算机科学',42,37], ['工程技术',28,24]]},
  {dataset:'论文数据集', table:'引用关系表', dimension:'学科', metric:'引用数量', unit:'次',
    rows:[['材料科学',75,54], ['计算机科学',62,58], ['工程技术',46,40]]},
  {dataset:'产业链数据集', table:'产业链节点表', dimension:'环节', metric:'企业数量', unit:'家',
    rows:[['上游材料',21,19], ['中游制造',36,30], ['下游应用',29,23]]}
];
const datasets = [...new Set(sources.map(item => item.dataset))];
const text = value => typeof value === 'string' ? value : '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => (
  {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const paragraph = value => '<p>' + esc(value).replace(/\n/g,'<br>') + '</p>';
const sourceFor = p => sources.find(source => source.dataset === p.dataset && source.table === p.table);
const fields = source => [source.dimension, source.metric, '上期数值'];

function tableRows(source, config) {
  const rows = source.rows.filter(row => (config.filters || []).every(filter => {
    const index = fields(source).indexOf(filter.field);
    const value = row[index], target = text(filter.value).trim();
    if (filter.op === '包含') return String(value).includes(target);
    if (filter.op === '不包含') return !String(value).includes(target);
    if (filter.op === '不等于') return String(value) !== target;
    if (filter.op === '大于') return value > Number(target);
    if (filter.op === '小于') return value < Number(target);
    if (filter.op === '大于等于') return value >= Number(target);
    if (filter.op === '小于等于') return value <= Number(target);
    return String(value) === target;
  }));
  return rows.slice(0, Number(config.limit ?? 100));
}
function selectedColumns(source, config) {
  return fields(source).map((name,index) => ({name,index})).filter(({name}) => (config.columns || fields(source)).includes(name));
}
export function validatePlaceholder(row) {
  if (!placeholderKinds.includes(row?.kind)) return '';
  const p = row.placeholder || {};
  if (!text(row.title).trim()) return '请填写占位符标题。';
  if (row.kind === '文本') {
    if (!text(row.body).trim()) return '请输入静态正文。';
    if ([...row.body].length > 1000) return '静态正文最多可填写 1000 字。';
    return '';
  }
  if (['表格','图表'].includes(row.kind) && !text(row.body).trim()) return '请填写查数需求。';
  if ([...text(row.body)].length > 1000) return '内容最多可填写 1000 字。';
  const source = sourceFor(p);
  if (!source) return '请选择数据集和数据表。';
  if (row.kind === '表格') {
    if (!selectedColumns(source,p).length) return '请至少选择一个展示字段。';
    const limit = Number(p.limit ?? 100);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return '显示条数应为 1 至 100 的整数。';
    for (const filter of p.filters || []) {
      if (!fields(source).includes(filter.field) || !text(filter.value).trim()) return '请补全筛选字段和条件值。';
      if (filter.field !== source.dimension && !Number.isFinite(Number(filter.value))) return '数值筛选条件须填写数字。';
    }
  }
  if (row.kind === '智能分析摘要') {
    if (!Array.isArray(p.scripts) || !p.scripts.some(item => analysisTypes.includes(item))) return '请至少选择一种分析脚本。';
    if (p.scripts.includes('用户自定义模板') && !text(p.custom).trim()) return '请填写自定义分析脚本内容。';
    if ([...text(p.custom)].length > 4000) return '自定义分析脚本最多可填写 4000 字。';
  }
  return '';
}

function dataTable(source, rows, columns) {
  const head = columns.map(col => '<th scope="col">' + esc(col.name) + '</th>').join('');
  const body = rows.map(row => '<tr>' + columns.map(col => '<td>' + esc(row[col.index]) + '</td>').join('') + '</tr>').join('');
  return '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
}
const colors = ['#336bd1', '#3e9497', '#a66b32', '#8864ab'];
function chartImage(source, requestedType) {
  if (typeof document === 'undefined') return '';
  const chart = chartTypes.includes(requestedType) ? requestedType : '自动推荐';
  const type = chart === '自动推荐' ? (source.series ? '折线图' : '柱状图') : chart;
  const rows = source.rows;
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font = '16px "PingFang SC","Microsoft YaHei",sans-serif';
  const total = rows.reduce((sum,row) => sum + row[1],0);
  if (type === '饼图') {
    let angle = -Math.PI / 2;
    rows.forEach(([label,value],i) => {
      const next = angle + value / total * Math.PI * 2;
      ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.moveTo(228,135);
      ctx.arc(228,135,98,angle,next); ctx.closePath(); ctx.fill();
      const y = 70 + i * 42;
      ctx.fillRect(412,y - 12,14,14);
      ctx.fillStyle = '#25415b'; ctx.fillText(label + '   ' + value + ' ' + source.unit + '（' + (value / total * 100).toFixed(1) + '%）',438,y);
      angle = next;
    });
  } else {
    const max = Math.max(...rows.map(row => row[1]));
    const positions = rows.map((row,i) => [140 + i * 235, 210 - row[1] / max * 144]);
    ctx.strokeStyle = '#d1d9e3'; ctx.beginPath(); ctx.moveTo(45,210); ctx.lineTo(714,210); ctx.stroke();
    ctx.strokeStyle = colors[0]; ctx.lineWidth = 3;
    if (type === '折线图') {
      ctx.beginPath(); positions.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
    }
    ctx.textAlign = 'center';
    positions.forEach(([x,y],i) => {
      ctx.fillStyle = type === '折线图' ? colors[0] : colors[i];
      if (type === '折线图') { ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill(); }
      else ctx.fillRect(x-34,y,68,210-y);
      ctx.fillStyle = '#25415b'; ctx.fillText(rows[i][1] + ' ' + source.unit,x,y-12); ctx.fillText(rows[i][0],x,239);
    });
  }
  const alt = type + '。' + rows.map(([label,value]) => label + ' ' + value + source.unit).join('，');
  return '<img alt="' + esc(alt) + '" src="' + canvas.toDataURL('image/png') + '">';
}

function summaryParagraphs(source, config) {
  const data = source.rows;
  const sum = column => data.reduce((s,row) => s + row[column],0);
  const total = sum(1), previous = sum(2);
  const highest = data.reduce((a,b) => a[1] >= b[1] ? a : b);
  const scripts = config.scripts || [];
  const results = [];
  if (scripts.includes('趋势分析')) results.push('汇总值为 ' + total + ' ' + source.unit + '，较对照记录的合计值 ' + previous + ' ' + source.unit + ' 增长 ' + ((total / previous - 1) * 100).toFixed(1) + '%。');
  if (scripts.includes('构成分析')) results.push(highest[0] + '的' + source.metric + '最高，为 ' + highest[1] + ' ' + source.unit + '，占合计值的 ' + (highest[1] / total * 100).toFixed(1) + '%。');
  if (scripts.includes('异常检测')) {
    const largest = data.reduce((a,b) => Math.abs(a[1]/a[2]-1) >= Math.abs(b[1]/b[2]-1) ? a : b);
    results.push('与各自的上期数值比较，' + largest[0] + '变化幅度最大，为 ' + ((largest[1]/largest[2]-1)*100).toFixed(1) + '%。');
  }
  if (scripts.includes('用户自定义模板')) results.push('自定义分析要求：' + text(config.custom));
  return results.map(paragraph).join('');
}

// All data-bearing blocks explicitly identify their local sample source in exported reports.
export function reportPlaceholderHtml(row) {
  if (!placeholderKinds.includes(row?.kind)) return '';
  if (row.kind === '文本') return paragraph(text(row.body));
  const p = row.placeholder || {}, source = sourceFor(p);
  if (!source) return '';
  const caption = '演示数据 · ' + source.dataset + ' / ' + source.table + '（' + source.unit + '）';
  if (row.kind === '表格') {
    const rows = tableRows(source,p);
    return (rows.length ? dataTable(source,rows,selectedColumns(source,p)) : paragraph('没有符合筛选条件的记录。')) + paragraph(caption);
  }
  if (row.kind === '图表') {
    const content = chartImage(source,p.chartType) || dataTable(source,source.rows,selectedColumns(source,{}));
    return '<figure>' + content + '<figcaption>' + esc(caption) + '</figcaption></figure>';
  }
  return summaryParagraphs(source,p) + paragraph(caption);
}
if (typeof window !== 'undefined') window.WorkbenchPlaceholders = {render:reportPlaceholderHtml};

export function createPlaceholderEditor(React) {
  const h = React.createElement;
  const fieldStyle = {display:'grid',gap:4,minWidth:0};
  const gridStyle = {display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10};
  const button = (label,onClick) => h('button',{type:'button',onClick},label);
  const field = (label,control) => h('label',{style:fieldStyle},h('span',null,label),control);
  function select(label,value,options,onChange,disabled = false) {
    return h('select',{'aria-label':label,value:value || '',disabled,onChange:e => onChange(e.target.value)},
      !value && h('option',{value:''},'请选择'),
      options.map(item => h('option',{value:item,key:item},item)));
  }
  function checks(label,values,selected,onChange) {
    return h('fieldset',{style:{border:0,margin:0,padding:0}},h('legend',null,label),
      h('div',{style:{display:'flex',flexWrap:'wrap',gap:12}},values.map(value => h('label',{key:value},
        h('input',{type:'checkbox',checked:selected.includes(value),onChange:e => onChange(
          e.target.checked ? [...selected,value] : selected.filter(item => item !== value))}), ' ' + value))));
  }

  return function PlaceholderEditor({row,onChange}) {
    const [preview,setPreview] = React.useState(false);
    const p = row.placeholder || {};
    const source = sourceFor(p);
    const table = row.kind === '表格', chart = row.kind === '图表', summary = row.kind === '智能分析摘要';
    const patch = changes => onChange({...row,placeholder:{...p,...changes}});
    const bodyLabel = row.kind === '文本' ? '静态正文' : (summary ? '分析说明' : '查数需求');
    const errors = validatePlaceholder(row);
    const filterList = Array.isArray(p.filters) ? p.filters : [];
    function changeFilter(index,change) {
      patch({filters:filterList.map((filter,i) => i === index ? {...filter,...change} : filter)});
    }
    const body = [];
    body.push(field('占位符标题',h('input',{type:'text',value:row.title || '',maxLength:100,
      onChange:e => onChange({...row,title:e.target.value})})));
    body.push(field(bodyLabel,h('textarea',{rows:2,value:row.body || '',maxLength:1000,
      placeholder:summary ? '选填，说明本节需要回答的分析问题' : (chart || table ? '填写要查询的数据、统计范围及用途' : '请输入正文'),
      onChange:e => onChange({...row,body:e.target.value})})));
    if (row.kind !== '文本') {
      body.push(h('div',{className:'outline-placeholder-fields',style:gridStyle},
        field('数据集',select('数据集',p.dataset,datasets,dataset => patch({dataset,table:'',filters:[],columns:undefined}))),
        field('数据表',select('数据表',p.table,sources.filter(s => s.dataset === p.dataset).map(s => s.table),
          name => patch({table:name,filters:[],columns:undefined}),!p.dataset))));
    }
    if (table && source) {
      const columns = fields(source);
      body.push(h('details',null,h('summary',null,'条件显示与循环列表'),
        h('div',{style:{...fieldStyle,gap:8,paddingTop:8}},
          filterList.map((filter,index) => h('div',{key:index,style:gridStyle},
            select('筛选字段',filter.field,columns,name => changeFilter(index,{field:name,op:'等于',value:''})),
            select('条件关系',filter.op,filter.field === source.dimension ? ['等于','不等于','包含','不包含'] : ['等于','不等于','大于','大于等于','小于','小于等于'],
              op => changeFilter(index,{op})),
            h('input',{'aria-label':'条件值',placeholder:'条件值',value:filter.value,
              type:filter.field === source.dimension ? 'text' : 'number',onChange:e => changeFilter(index,{value:e.target.value})}),
            button('删除条件',() => patch({filters:filterList.filter((_,i) => i !== index)})))),
          button('添加筛选条件',() => patch({filters:[...filterList,{field:source.dimension,op:'等于',value:''}]})),
          checks('展示字段',columns,p.columns || columns,values => patch({columns:values})),
          field('最多展示条数',h('input',{type:'number',value:p.limit ?? 100,min:1,max:100,
            onChange:e => patch({limit:e.target.value})})))));
    }
    if (chart) body.push(field('图表类型',select('图表类型',p.chartType || '自动推荐',chartTypes,chartType => patch({chartType}))));
    if (summary) {
      body.push(checks('分析脚本（分析维度）',analysisTypes,p.scripts || [],scripts => patch({scripts})));
      if (p.scripts?.includes('用户自定义模板')) body.push(field('自定义分析脚本内容',h('textarea',{
        rows:3,maxLength:4000,value:p.custom || '',placeholder:'请输入分析目标、分析步骤和输出要求',
        onChange:e => patch({custom:e.target.value})})));
    }
    if (row.kind !== '文本') {
      body.push(h('div',null,h('button',{type:'button',disabled:Boolean(errors),'aria-expanded':preview && !errors,
        onClick:() => setPreview(!preview)},preview ? '收起效果预览' : '查看效果预览')));
      if (preview && !errors) body.push(h('div',{className:'outline-placeholder-preview',
        dangerouslySetInnerHTML:{__html:reportPlaceholderHtml(row)}}));
    }
    return h('div',{className:'outline-placeholder-editor',style:{display:'grid',gap:10,minWidth:0}},
      body.map((element,index) => h(React.Fragment,{key:index},element)));
  };
}
