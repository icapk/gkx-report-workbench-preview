(() => {
  "use strict";

  const portal = "https://icapk.github.io/gkx-ai-strategy-portal/";
  const readingWorkbench = "apps/research-reading/dist/index.html";
  const voiceWorkbench = "apps/voice-enhancement/index.html";
  const admin = "apps/portal-admin/dist/index.html?v=20260826-user-data-api";
  const topicService = "https://skxdemo.unicomcn.tech:30999/development/search";
  const informationDisplay = "https://skxrules.unicomcn.tech:30999/";

  const groups = {
    research: [
      ["深圳人才宇宙", "https://ai4s.itic-sci.com/talent"],
      ["数据库导航", "https://itic-sci.com/databaseNavigation"],
      ["期刊导航", "https://itic-sci.com/journal"],
      ["精选论文库", "https://itic-sci.com/paper"],
      ["PaperLink", "https://itic-sci.com/paper-link/"],
      ["浪淘沙预印本", "https://itic-sci.com/langtaosha"],
      ["文献资源申请", "https://itic-sci.com/org/"],
      ["深圳科学导航", "https://itic-sci.com/sso/user/login?back_url=https%3A%2F%2Fitic-sci.bohrium.com%3Ftype%3D10001%26method%3Doauth-code"],
      ["探微", "https://itic-sci.com/ai-agent/"],
      ["专题知识库", "https://kg-cg.itic-sci.com/ChatSearch"],
      ["科学数据中心", "https://kg-cg.itic-sci.com/ChatSearch"],
      ["科学信息交流"]
    ],
    education: [
      ["学伴智能体平台", "https://edu.itic-sci.com/"],
      ["信息素养教育", "https://xxsy.itic-sci.com/"]
    ],
    evaluation: [
      ["智慧人才", "https://vip.itic-sci.com/talent/index/"],
      ["科技资源服务"],
      ["科技决策支持"]
    ],
    strategy: [
      ["战略咨询总体", new URL("./", document.baseURI).href],
      ["新型高端智库", "https://effortless-licorice-cdaa9f.netlify.app", "new"],
      ["科技专题服务系统", topicService, "hot"],
      ["科技信息展示系统", informationDisplay, "hot"],
      ["未来产业概述", "https://future_industry.itic-sci.com/index/", "new"],
      ["未来产业图谱", "https://itic-sci.com/sso/user/login?back_url=https://itic-sci.com/brain-graph/", "hot"]
    ],
    applications: [
      ["科技专题服务系统", topicService],
      ["科技信息展示系统", informationDisplay],
      ["AI 分析与智能分发工作台", "apps/ai-distribution/index.html"],
      ["语音增强与适配工作台", voiceWorkbench],
      ["管理后台", admin],
      ["文档中心", "document-center.html?v=20260909-doc-cleanup"],
      ["示例系统"],
      ["示例系统"]
    ],
    voice: [
      ["语音增强与适配工作台", voiceWorkbench]
    ],
    subscriptions: [
      ["科研情报智能推荐", "recommendations.html"],
      ["个人订阅与关注", "personal-center.html"]
    ],
    intelligence: [
      ["科技信息交流", "?cluster=information-exchange"]
    ],
    aiStrategy: [
      ["科技决策支持", "?cluster=technology-decision-support"]
    ],
    aiEducation: [
      ["未来教育服务", "education.html"]
    ],
    aiResearch: [
      ["智能科研", readingWorkbench + "?view=research&v=20260919-local-candidate"],
      ["智能阅读", readingWorkbench + "?view=reading&v=20260919-local-candidate"]
    ],
    permissions: [
      ["管理后台", admin]
    ],
    review: [
      ["门户数据运营", "portal-admin-2.html"]
    ],
    cluster: [
      ["科技信息交流", "?cluster=information-exchange"],
      ["科技资源服务", "?cluster=technology-resource-service"],
      ["科技决策支持", "?cluster=technology-decision-support"],
      ["科学数据中心", "?cluster=scientific-data-center"],
      ["新型高端智库", "?cluster=think-tank#top"],
      ["科技专题服务", "?cluster=technology-topic-service"]
    ]
  };

  const header = document.getElementById("siteHeader");
  const desktopNav = document.getElementById("desktopNav");
  const navTriggers = [...desktopNav.querySelectorAll("[data-portal-group]")];
  const megaMenu = document.getElementById("megaMenu");
  const megaTitle = document.getElementById("megaMenuTitle");
  const megaGrid = document.getElementById("megaGrid");
  const mobileButton = document.getElementById("mobileMenuButton");
  const mobileBackdrop = document.getElementById("mobileBackdrop");
  const mobileDrawer = document.getElementById("mobileDrawer");
  const mobileNav = document.getElementById("mobileNav");
  const compactHeader = window.matchMedia("(max-width: 1279px)");
  const hoverable = window.matchMedia("(hover: hover)");
  const workbenchTrigger = header.querySelector(".utility-nav .utility-trigger");
  const workbenchMenu = document.getElementById("portalWorkbenchMenu");
  const popoverTriggers = [...header.querySelectorAll(".header-actions button[aria-controls]")].filter(button => button !== mobileButton);

  let activeMega = null;
  let activePopover = null;
  let activeMobileGroup = null;
  let closeTimer = 0;
  let navigationScrollingUntil = 0;

  function setDisclosure(trigger, panel, open) {
    trigger.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  }

  function createMenuEntry([label, href, badge]) {
    const entry = document.createElement(href ? "a" : "span");
    entry.className = "menu-entry";
    if (href) {
      entry.href = new URL(href, portal).href;
    } else {
      entry.classList.add("is-disabled");
      entry.setAttribute("aria-disabled", "true");
    }

    const name = document.createElement("span");
    name.className = "entry-name";
    const title = document.createElement("span");
    title.className = "entry-label";
    title.textContent = label;
    name.append(title);
    if (badge) {
      const flag = document.createElement("span");
      flag.className = "entry-badge entry-badge--" + badge;
      flag.textContent = badge.toUpperCase();
      name.append(flag);
    }
    entry.append(name);
    return entry;
  }

  function closeMega() {
    if (!activeMega) return;
    activeMega.classList.remove("is-open");
    setDisclosure(activeMega, megaMenu, false);
    activeMega = null;
  }

  function closePopover() {
    if (!activePopover) return;
    setDisclosure(activePopover, document.getElementById(activePopover.getAttribute("aria-controls")), false);
    activePopover = null;
  }

  function openMega(trigger, focusFirst = false) {
    window.clearTimeout(closeTimer);
    closePopover();
    if (activeMega !== trigger) {
      closeMega();
      megaTitle.textContent = trigger.textContent.trim();
      megaGrid.replaceChildren(...groups[trigger.dataset.portalGroup].map(createMenuEntry));
      activeMega = trigger;
      trigger.classList.add("is-open");
      setDisclosure(trigger, megaMenu, true);
    }
    if (focusFirst) megaGrid.querySelector("a")?.focus();
  }

  desktopNav.addEventListener("pointerover", event => {
    if (event.pointerType !== "mouse" || performance.now() < navigationScrollingUntil) return;
    const trigger = event.target.closest("[data-portal-group]");
    if (trigger) openMega(trigger);
    else closeMega();
  });
  desktopNav.addEventListener("click", event => {
    const trigger = event.target.closest("[data-portal-group]");
    if (trigger) openMega(trigger, event.detail === 0);
  });
  desktopNav.addEventListener("keydown", event => {
    const trigger = event.target.closest("[data-portal-group]");
    if (!trigger || event.key !== "ArrowDown") return;
    event.preventDefault();
    openMega(trigger, true);
  });
  header.addEventListener("portal-navigation-scroll", () => {
    navigationScrollingUntil = performance.now() + 400;
    closeMega();
  });
  header.addEventListener("pointerenter", () => window.clearTimeout(closeTimer));
  header.addEventListener("pointerleave", () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(closeMega, 130);
  });
  header.addEventListener("focusout", event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) {
      closeMega();
      closePopover();
    }
  });

  function openPopover(trigger) {
    if (activePopover === trigger) return;
    closeMega();
    closePopover();
    activePopover = trigger;
    setDisclosure(trigger, document.getElementById(trigger.getAttribute("aria-controls")), true);
  }

  popoverTriggers.forEach(trigger => {
    trigger.addEventListener("click", event => {
      if (activePopover !== trigger) openPopover(trigger);
      else if (trigger !== workbenchTrigger || event.detail === 0 || !hoverable.matches) closePopover();
    });
    trigger.addEventListener("keydown", event => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      openPopover(trigger);
      document.getElementById(trigger.getAttribute("aria-controls")).querySelector("a")?.focus();
    });
  });

  workbenchTrigger.parentElement.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse" && hoverable.matches) openPopover(workbenchTrigger);
  });
  workbenchTrigger.parentElement.addEventListener("pointerleave", () => {
    if (activePopover === workbenchTrigger && !workbenchMenu.contains(document.activeElement)) closePopover();
  });

  function createMobileGroup(trigger, label, entries) {
    const section = document.createElement("section");
    section.className = "mobile-group";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-primary";
    button.setAttribute("aria-expanded", "false");
    if (trigger.hasAttribute("aria-current")) {
      button.classList.add("is-current");
      button.setAttribute("aria-current", "true");
    }
    const text = document.createElement("span");
    text.textContent = label;
    button.append(text);
    button.insertAdjacentHTML("beforeend", '<svg class="mobile-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5"></path></svg>');

    const panel = document.createElement("div");
    panel.className = "mobile-submenu";
    panel.hidden = true;
    panel.id = "mobile-portal-" + (trigger.dataset.portalGroup || "workbench");
    panel.append(...entries.map(createMenuEntry));
    button.setAttribute("aria-controls", panel.id);
    button.addEventListener("click", () => {
      if (activeMobileGroup === button) {
        closeMobileGroup();
        return;
      }
      closeMobileGroup();
      activeMobileGroup = button;
      setDisclosure(button, panel, true);
    });
    section.append(button, panel);
    return section;
  }

  function createMobileLink(source) {
    const section = document.createElement("section");
    section.className = "mobile-group";
    const link = document.createElement("a");
    link.className = "mobile-primary mobile-primary--link";
    link.href = source.href;
    const text = document.createElement("span");
    text.textContent = source.textContent.trim();
    link.append(text);
    section.append(link);
    return section;
  }

  function closeMobileGroup() {
    if (!activeMobileGroup) return;
    setDisclosure(activeMobileGroup, document.getElementById(activeMobileGroup.getAttribute("aria-controls")), false);
    activeMobileGroup = null;
  }

  function setMobileDrawer(open, restoreFocus = false) {
    if (open) {
      closeMega();
      closePopover();
      if (!mobileNav.firstElementChild) {
        mobileNav.append(
          createMobileLink(desktopNav.querySelector(".home-nav-trigger")),
          ...navTriggers.map(trigger => createMobileGroup(trigger, trigger.textContent.trim(), groups[trigger.dataset.portalGroup])),
          createMobileGroup(workbenchTrigger, workbenchTrigger.textContent.trim(), [...workbenchMenu.querySelectorAll("a")].map(link => [link.textContent.trim(), link.href])),
          createMobileLink(header.querySelector(".ticket-service-button"))
        );
      }
    } else {
      closeMobileGroup();
    }
    setDisclosure(mobileButton, mobileDrawer, open);
    mobileBackdrop.hidden = !open;
    mobileButton.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
    if (open) mobileNav.querySelector("a")?.focus();
    else if (restoreFocus) mobileButton.focus();
  }

  mobileButton.addEventListener("click", () => setMobileDrawer(mobileDrawer.hidden, true));
  mobileBackdrop.addEventListener("click", () => setMobileDrawer(false, true));
  compactHeader.addEventListener("change", () => {
    closeMega();
    closePopover();
    if (!mobileDrawer.hidden) setMobileDrawer(false);
  });
  document.addEventListener("pointerdown", event => {
    if (!header.contains(event.target)) {
      closeMega();
      closePopover();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!mobileDrawer.hidden) setMobileDrawer(false, true);
    else if (activePopover) {
      activePopover.focus();
      closePopover();
    } else if (activeMega) {
      activeMega.focus();
      closeMega();
    }
  });
})();
