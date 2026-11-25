(() => {
  "use strict";

  let active = null;

  function unmount() {
    if (!active) return;
    active.dispose();
    active = null;
  }

  function mount(container) {
    unmount();
    const root = document.createElement("section");
    root.className = "wm-settings";
    root.innerHTML = `
      <div class="wm-layout">
        <section class="wm-panel" aria-labelledby="wm-title">
          <div class="wm-toolbar">
            <h1 id="wm-title" tabindex="-1">模型管理</h1>
            <button class="wm-button" type="button" data-action="home">返回首页</button>
            <button class="wm-button wm-primary" type="button" data-action="new">
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 3v14M3 10h14"/></svg>
              新增模型
            </button>
          </div>
          <div class="wm-table-scroll">
            <table aria-label="模型列表">
              <colgroup><col class="wm-col-name"><col class="wm-col-address"><col class="wm-col-state"><col class="wm-col-actions"></colgroup>
              <thead><tr><th scope="col">模型名称</th><th scope="col">接入地址</th><th scope="col">上架状态</th><th scope="col">操作</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </section>
        <p class="wm-result" role="status" aria-live="polite"></p>
        <dialog class="wm-dialog" aria-labelledby="wm-dialog-title">
          <form autocomplete="off" novalidate>
            <h2 id="wm-dialog-title">新增模型</h2>
            <div class="wm-fields">
              <label><span>模型名称 <b aria-hidden="true">*</b></span><input name="name" required maxlength="120" placeholder="例如 glm-5.3" spellcheck="false"></label>
              <label><span>接入地址 <b aria-hidden="true">*</b></span><input name="endpoint" type="url" required maxlength="500" placeholder="https://gateway.example.test/v1" spellcheck="false"></label>
              <label><span>API Key <small>选填</small></span><input name="key" type="password" autocomplete="new-password" placeholder="仅填写示例值"></label>
              <p class="wm-error" role="alert"></p>
            </div>
            <footer>
              <button class="wm-button" type="button" data-action="cancel">取消</button>
              <button class="wm-button wm-primary" type="submit">保存</button>
            </footer>
          </form>
        </dialog>
      </div>`;

    const controller = new AbortController();
    const listeners = { signal: controller.signal };
    const records = window.WorkbenchModels;
    const body = root.querySelector("tbody");
    const result = root.querySelector(".wm-result");
    const dialog = root.querySelector("dialog");
    const form = dialog.querySelector("form");
    const fields = form.elements;
    const error = form.querySelector(".wm-error");
    const addButton = root.querySelector('[data-action="new"]');

    function feedback(message = "", failed = false) {
      result.textContent = message;
      result.classList.toggle("wm-failure", failed);
    }

    function addAction(parent, label, action) {
      const button = document.createElement("button");
      button.className = "wm-action";
      button.type = "button";
      button.dataset.action = action;
      button.textContent = label;
      parent.append(button);
    }

    function modelRow(model) {
      const row = document.createElement("tr");
      row.dataset.id = model.id;
      const nameCell = row.insertCell();
      nameCell.className = "wm-name";
      nameCell.append(document.createTextNode(model.name));
      if (model.isDefault) {
        const badge = document.createElement("span");
        badge.className = "wm-default";
        badge.textContent = "默认";
        nameCell.append(badge);
      }
      const address = row.insertCell();
      address.className = "wm-address";
      address.textContent = model.endpoint;
      const state = document.createElement("span");
      state.className = model.online ? "wm-state wm-online" : "wm-state";
      state.textContent = model.online ? "已上架" : "已下架";
      row.insertCell().append(state);
      const actions = document.createElement("div");
      actions.className = "wm-actions";
      row.insertCell().append(actions);
      addAction(actions, model.online ? "下架" : "上架", model.online ? "offline" : "online");
      if (model.online && !model.isDefault) addAction(actions, "设为默认", "default");
      return row;
    }

    function showEmpty(message) {
      const row = document.createElement("tr");
      const cell = row.insertCell();
      cell.colSpan = 4;
      cell.className = "wm-empty";
      cell.textContent = message;
      body.replaceChildren(row);
    }

    function refresh(focusId) {
      try {
        const models = records.list();
        if (!models.length) {
          showEmpty("暂无模型");
          return;
        }
        body.replaceChildren(...models.map(modelRow));
        if (focusId) {
          const row = [...body.rows].find(item => item.dataset.id === focusId);
          row?.querySelector("button")?.focus({ preventScroll: true });
        }
      } catch (cause) {
        showEmpty("暂时无法读取模型");
        feedback(cause.message || "读取模型失败。", true);
      }
    }

    root.addEventListener("click", event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "home") {
        window.location.hash = "";
        return;
      }
      if (action === "new") {
        feedback();
        error.textContent = "";
        form.reset();
        dialog.showModal();
        fields.name.focus();
        return;
      }
      if (action === "cancel") {
        dialog.close();
        return;
      }
      const row = button.closest("tr");
      if (!row) return;
      try {
        if (action === "default") records.setDefault(row.dataset.id);
        else records.setOnline(row.dataset.id, action === "online");
        const label = { default: "已设为默认模型。", online: "已上架。", offline: "已下架。" };
        feedback(label[action]);
        refresh(row.dataset.id);
      } catch (cause) {
        refresh();
        feedback(cause.message || "更新模型失败。", true);
      }
    }, listeners);

    form.addEventListener("submit", event => {
      event.preventDefault();
      try {
        records.register(fields.name.value, fields.endpoint.value);
        form.reset();
        dialog.close();
        feedback("模型已新增并上架。");
        refresh();
      } catch (cause) {
        error.textContent = cause.message || "保存失败，请重试。";
      }
    }, listeners);
    form.addEventListener("input", () => { error.textContent = ""; }, listeners);
    dialog.addEventListener("close", () => {
      form.reset();
      error.textContent = "";
      addButton.focus({ preventScroll: true });
    }, listeners);
    window.addEventListener("workbench:models-changed", () => refresh(), listeners);

    active = {
      refresh,
      dispose() {
        controller.abort();
        form.reset();
        if (dialog.open) dialog.close();
        root.remove();
      }
    };
    container.replaceChildren(root);
    refresh();
    root.querySelector("h1").focus({ preventScroll: true });
  }

  window.WorkbenchModelManagement = Object.freeze({
    mount, unmount, refresh() { active?.refresh(); }
  });
})();
