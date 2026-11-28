(() => {
  const tagName = 'report-hover-icon';
  if (customElements.get(tagName)) return;

  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host {
        display: inline-block;
        inline-size: var(--report-icon-width, 76px);
        max-inline-size: 100%;
        vertical-align: bottom;
      }

      svg {
        display: block;
        inline-size: 100%;
        block-size: auto;
      }

      .report-icon__back {
        transform-box: view-box;
        transform-origin: 135px 167px;
        transform: translate(-7px, 8px) scale(.94);
        opacity: 0;
        transition: transform 260ms cubic-bezier(.35, 0, .3, 1), opacity 165ms ease;
      }

      :host(:focus-visible) .report-icon__back,
      :host([expanded]) .report-icon__back {
        transform: translate(20px, 5px) rotate(10deg);
        opacity: 1;
        transition: transform 340ms cubic-bezier(.2, .75, .24, 1), opacity 150ms ease-out;
      }

      @media (hover: hover) {
        :host(:hover) .report-icon__back {
          transform: translate(20px, 5px) rotate(10deg);
          opacity: 1;
          transition: transform 340ms cubic-bezier(.2, .75, .24, 1), opacity 150ms ease-out;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .report-icon__back {
          transition-duration: 0ms !important;
        }
      }
    </style>
    <svg viewBox="27 12 207 169" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="baseline">
        <path d="M0 0H230V181H0Z"/>
      </clipPath>
      <clipPath id="front-shape">
        <path d="M44 24H169Q178 24 178 33V181H35V33Q35 24 44 24Z"/>
      </clipPath>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="16%" stop-color="#fcfdff"/>
        <stop offset="60%" stop-color="#f0f5fd"/>
        <stop offset="100%" stop-color="#ccdcf7"/>
      </linearGradient>
      <linearGradient id="vellum" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#f7faff" stop-opacity=".94"/>
        <stop offset="100%" stop-color="#92b3ed" stop-opacity=".68"/>
      </linearGradient>
      <linearGradient id="paper-edge" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#dbe3ef"/>
        <stop offset="46%" stop-color="#f8fbff"/>
        <stop offset="100%" stop-color="#9cb8e6"/>
      </linearGradient>
      <pattern id="grid" x="55" y="136" width="13" height="11" patternUnits="userSpaceOnUse">
        <path d="M0 11V0H13" fill="none" stroke="#a6bee3" stroke-opacity=".5" stroke-width="1"/>
      </pattern>
      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#84aaf0" stop-opacity=".2"/>
        <stop offset="100%" stop-color="#84aaf0" stop-opacity="0"/>
      </linearGradient>
      <filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2.2" flood-color="#334b76" flood-opacity=".12"/>
      </filter>
    </defs>

    <g clip-path="url(#baseline)">
      <path class="report-icon__back" d="M44 24H169Q178 24 178 33V214H35V33Q35 24 44 24Z"
            fill="url(#vellum)" stroke="#b5c9ed" stroke-width="1.2"/>
      <path d="M44 24H169Q178 24 178 33V190H35V33Q35 24 44 24Z"
            fill="url(#paper)" stroke="url(#paper-edge)" filter="url(#paper-shadow)"/>
      <g clip-path="url(#front-shape)">
        <path d="M45 25.5H168Q176.5 25.5 176.5 34" fill="none" stroke="white" stroke-opacity=".86"/>
        <rect x="53" y="43" width="22" height="1.5" rx=".5" fill="#acaeef"/>
        <rect x="53" y="54" width="94" height="4.8" rx=".8" fill="#23374f"/>
        <rect x="53" y="68" width="48" height="2.7" rx=".6" fill="#64768d"/>
        <path d="M53 85.5H159" stroke="#c5d1e0"/>
        <rect x="53" y="98" width="78" height="1.7" rx=".5" fill="#9fadc1"/>
        <rect x="53" y="107" width="49" height="1.7" rx=".5" fill="#aebace"/>
        <rect x="52" y="131" width="107" height="54" fill="url(#grid)" opacity=".45"/>
        <path d="M68 185L83 173L94 173L111 160L121 160L153 137V185Z" fill="url(#area)"/>
        <path d="M68 185L83 173L94 173L111 160L121 160L153 137"
              fill="none" stroke="#6e9ce9" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="153" cy="137" r="2.55" fill="#f8fbff" stroke="#6e9ce9" stroke-width="1.4"/>
      </g>
    </g>
  </svg>
  `;

  class ReportHoverIcon extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
    }
  }

  customElements.define(tagName, ReportHoverIcon);
})();
