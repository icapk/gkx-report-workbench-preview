(() => {
  'use strict';

  const prefix = 'gkx-report-workbench-preview:';
  const storageKey = prefix + 'model-table.v1';
  const previousKeys = [prefix + 'simple-models.v1', prefix + 'model-registry.v1'];
  // The standalone file prototype used unscoped keys. Hosted previews must not
  // import another Pages application's configuration from their shared origin.
  if (window.location.protocol === 'file:') {
    previousKeys.push('gkx.writing.model-table.v1', 'gkx.writing.simple-models.v1', 'gkx.writing.model-registry.v1');
  }
  const changed = 'workbench:models-changed';
  const samples = [
    { id: 'preview-glm-52', name: 'GLM 5.2', model: 'glm-5.2', endpoint: 'https://glm.example.test/v1', online: true, isDefault: true },
    { id: 'preview-deepseek-v3', name: 'DeepSeek V3', model: 'deepseek-v3', endpoint: 'https://deepseek.example.test/v1', online: true, isDefault: false },
    { id: 'preview-qwen-3', name: 'Qwen 3', model: 'qwen3', endpoint: 'https://qwen.example.test/v1', online: true, isDefault: false }
  ];

  function cleanAddress(value) {
    const address = String(value ?? '').trim();
    if (!address) throw new Error('请填写接入地址。');
    let url;
    try {
      url = new URL(address);
    } catch {
      throw new Error('请输入完整的 HTTP 或 HTTPS 接入地址。');
    }
    if (!/^https?:\/\/[^/]/i.test(address) || /\s/.test(address) || !url.hostname) {
      throw new Error('请输入完整的 HTTP 或 HTTPS 接入地址。');
    }
    if (address.split('/')[2].includes('@') || /[?#\\]/.test(address)) {
      throw new Error('接入地址不能包含账号、密码、查询参数或片段。');
    }
    return url.href;
  }

  function write(rows, notify = true) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {
      throw new Error('保存失败，请检查浏览器的存储空间和访问权限。');
    }
    if (notify) window.dispatchEvent(new Event(changed));
  }

  function list() {
    let sourceKey;
    let raw;
    try {
      for (const key of [storageKey, ...previousKeys]) {
        raw = localStorage.getItem(key);
        if (raw !== null) {
          sourceKey = key;
          break;
        }
      }
    } catch {
      throw new Error('读取模型失败，请检查浏览器存储权限。');
    }
    if (raw === null) return samples.map(row => ({ ...row }));
    let rows;
    let needsMigration = sourceKey !== storageKey;
    try {
      const source = JSON.parse(raw);
      const online = row => row.online !== false && row.verified !== false;
      const active = source.filter(online);
      const preferred = active.find(row => row.isDefault === true || row.default === true)
        || active.find(row => row.recommended === true) || active[0];
      rows = source.map(row => {
        if (!row.id || !row.name || !row.model) throw new Error();
        const isDefault = row === preferred;
        if (row.isDefault !== isDefault) needsMigration = true;
        return { id: row.id, name: row.name, model: row.model, endpoint: cleanAddress(row.endpoint), online: online(row), isDefault };
      });
    } catch {
      throw new Error('本地模型配置无法读取，请检查已保存的模型名称和接入地址。');
    }
    if (needsMigration) write(rows, false);
    return rows;
  }

  function available() {
    return list().filter(row => row.online).map(({ id, name, model, isDefault }) => ({ id, name, model, isDefault }));
  }

  function register(rawName, rawEndpoint, key) {
    if (key) throw new Error('公开预览仅保存模型配置，请勿填写 API Key。');
    const name = String(rawName ?? '').trim();
    if (!name) throw new Error('请填写模型名称。');
    const endpoint = cleanAddress(rawEndpoint);
    const rows = list();
    const normalize = value => value.normalize('NFKC').toLowerCase();
    if (rows.some(row => normalize(row.name) === normalize(name))) throw new Error('该模型名称已注册。');
    const record = { id: crypto.randomUUID(), name, model: name, endpoint, online: true, isDefault: !rows.some(row => row.online) };
    write([...rows, record]);
    return { ...record };
  }

  function setOnline(id, online) {
    const rows = list();
    const selected = rows.find(row => row.id === id);
    if (!selected) throw new Error('模型记录已变更，请刷新列表。');
    if (typeof online !== 'boolean') throw new Error('请选择上架或下架。');
    if (selected.online !== online) {
      const next = rows.find(row => row !== selected && row.online);
      if (!online && selected.isDefault && next) next.isDefault = true;
      selected.online = online;
      selected.isDefault = online && !next;
      write(rows);
    }
    return { ...selected };
  }

  function setDefault(id) {
    const rows = list();
    const selected = rows.find(row => row.id === id);
    if (!selected?.online) throw new Error('只能将已上架模型设为默认。');
    if (!selected.isDefault) {
      for (const row of rows) row.isDefault = row === selected;
      write(rows);
    }
    return { ...selected };
  }

  window.addEventListener('storage', event => {
    if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) {
      window.dispatchEvent(new Event(changed));
    }
  });
  window.WorkbenchModels = Object.freeze({ list, available, register, setOnline, setDefault });
})();
