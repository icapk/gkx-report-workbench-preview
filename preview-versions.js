// Register each published homepage here. All versions use this same list.
const versions = [
  { label: "V1", directory: "./" },
  { label: "V2", directory: "./v2/" },
].map(({ label, directory }) => ({
  label,
  home: new URL(directory, import.meta.url).href,
}));

export function renderVersionPicker(jsx) {
  const home = new URL("./", window.location.href).href;
  const current = versions.find(version => version.home === home);
  if (!current) return null;

  function switchVersion(event) {
    const select = event.currentTarget;
    const target = select.value;
    // Preserve the original selection when the browser restores this page with Back.
    select.value = current.home;
    if (target !== current.home) window.location.assign(target);
  }

  return jsx.jsxs("label", {
    className: "preview-version-picker",
    children: [
      jsx.jsx("span", { "aria-hidden": true, children: "版本" }),
      jsx.jsx("select", {
        "aria-label": "切换原型版本",
        value: current.home,
        onChange: switchVersion,
        children: versions.map(({ label, home }) => jsx.jsx("option", { value: home, children: label }, home)),
      }),
    ],
  });
}
