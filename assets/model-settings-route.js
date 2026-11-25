(() => {
  'use strict';
  const route = '#model-management';
  const view = document.getElementById('model-management-view');
  const root = document.getElementById('root');
  const pageTitle = document.title;
  let active = false;

  function renderRoute() {
    const open = window.location.hash === route;
    if (open === active) return;
    active = open;
    document.body.classList.toggle('show-model-management', open);
    root.inert = open;
    view.hidden = !open;
    if (open) {
      window.WorkbenchModelManagement.mount(view);
      document.title = '模型管理｜深圳国际科技信息中心';
      (view.querySelector('h1, h2') || view).focus({preventScroll:true});
    } else {
      window.WorkbenchModelManagement.unmount();
      document.title = pageTitle;
      root.querySelector('[aria-label="选择模型"]')?.focus({preventScroll:true});
    }
  }

  window.addEventListener('workbench:open-model-settings', () => {
    if (!active) {
      history.pushState({...history.state, fromWorkbenchModels:true}, '', route);
      renderRoute();
    }
  });
  window.addEventListener('workbench:close-model-settings', () => {
    if (!active) return;
    if (history.state?.fromWorkbenchModels) {
      history.back();
    } else {
      history.replaceState(history.state, '', location.pathname + location.search);
      renderRoute();
    }
  });
  window.addEventListener('popstate', renderRoute);
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
