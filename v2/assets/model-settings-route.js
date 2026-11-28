(() => {
  'use strict';
  const route = '#model-management';

  window.addEventListener('workbench:open-model-settings', () => {
    if (location.hash === route) return;
    const source = window.sessionReports.readRoute(location.hash);
    const state = {...history.state, modelSettingsSource: true};
    if (source?.kind === 'project') state.libraryReturnProject = source.id;
    history.replaceState(state, '', location.href);
    location.hash = route;
    history.replaceState({fromWorkbenchModels:true}, '', location.href);
  });

  window.addEventListener('workbench:close-model-settings', () => {
    if (location.hash !== route) return;
    if (history.state?.fromWorkbenchModels) history.back();
    else location.replace(location.pathname + location.search + '#');
  });
})();
