
(function () {
  // ──────────────────────────────────────────────────────
  // CONFIG
  // ──────────────────────────────────────────────────────
  const BASE      = window.location.origin;
  const NAV_SEL   = "#sidebar-v2 .hl_nav-header nav[aria-label='header']";
  const API_URL   = "https://nocodb.bizinabox.online/api/v2/tables/mnlu0gqrdzgylp3/records?offset=0&limit=25&viewId=vwwst4gdjurmx035";
  const API_TOKEN = "dj1HZCn0mgAOJfrSrdjDq4sehyFxCztCsV-NqgUv";


  let allowedLocationIds = [];
  let sidebarInitialized = false;
  let lastSidebarState = null; // "open" | "collapsed" | null
  let lastLocationId = null;
  let observer = null;

  // ──────────────────────────────────────────────────────
  // LOGGING
  // ──────────────────────────────────────────────────────
  function log(...args) {
    console.log("🧠 SidebarHack:", ...args);
  }


  // ──────────────────────────────────────────────────────
  // EXTRACT LOCATION ID
  // ──────────────────────────────────────────────────────
  function extractLocationIdFromDom() {
    // 1) from URL
    const m = window.location.pathname.match(/\/v2\/location\/([a-zA-Z0-9]+)/);
    if (m) {
      log("📌 Extracted location ID from URL path:", m[1]);
      return m[1];
    }
    // 2) fallback to wrapper class
    const root = document.querySelector(".sidebar-v2-location");
    if (!root) {
      log("❌ No sidebar wrapper element found");
      return null;
    }
    const cls = [...root.classList].find(c => /^[a-zA-Z0-9]{20,}$/.test(c));
    log("📌 Extracted location ID from wrapper class:", cls);
    return cls || null;
  }


  // ──────────────────────────────────────────────────────
  // APPLY HACK
  // ──────────────────────────────────────────────────────
  function runSidebarHack($root, $nav, locId) {
    if (sidebarInitialized) {
      log("⚠️ Sidebar already initialized, skipping");
      return;
    };
    sidebarInitialized = true;
    log("🎯 Customizing sidebar for location:", locId);

    // add sidebar-menu-hack class to the root element
    const rootEl = $root.get(0);
    if (!rootEl) {
      log("❌ rootEl is null — $root resolved to:", $root);
    } else if (!rootEl.classList.contains("sidebar-menu-hack")) {
      rootEl.classList.add("sidebar-menu-hack");
      log("✨ Added 'sidebar-menu-hack' class to root element", rootEl);
    } else {
      log("⚠️ Root already has sidebar-menu-hack:", rootEl.className, rootEl);
    }



    // Task Management link
    const tasksHref = `/v2/location/${locId}/tasks`;
    let $task = $nav.find('a[meta="task-management"]');
    if (!$task.length) {
      $task = jQuery(`
        <a href="${tasksHref}" meta="task-management"
           class="sidebarhack-nav w-full group px-3 flex items-center justify-start text-sm font-medium rounded-md cursor-pointer opacity-70 hover:opacity-100 py-2">
          <span class="left-nav-icon"><i class="fas fa-tasks"></i></span>
          <span class="nav-title">Task Management</span>
        </a>
      `);
    } else {
      $task.attr('href', tasksHref);
    }

    // gather items
    const items = {
      dashboard:     $nav.find('a[meta="dashboard"]'),
      conversations: $nav.find('a[meta="conversations"]'),
      contacts:      $nav.find('a[meta="contacts"]'),
      calendars:     $nav.find('a[meta="calendars"]'),
      opportunities: $nav.find('a[meta="opportunities"]'),
      payments:      $nav.find('a[meta="payments"]'),
      marketing:     $nav.find('a[meta="email-marketing"]'),
      automation:    $nav.find('a[meta="automation"]'),
      sites:    $nav.find('a[meta="sites"]'),
      memberships:   $nav.find('a[meta="memberships"]')
    };


    // rename
    items.marketing.find(".nav-title").text("Marketing");
    items.memberships.find(".nav-title").text("Client Portal");


    // hide all then reorder & show
    $nav.children("a").css("display", "none");
    function showOrder($el, pos) {
      if (!$el.length) return;
      $el.css({ display: "flex", order: pos });
      $nav.append($el);
    }
    showOrder(items.dashboard,     1);
    showOrder(items.conversations, 2);
    showOrder(items.contacts,      3);
    showOrder(items.calendars,     4);
    showOrder($task,               5);
    showOrder(items.opportunities, 6);
    showOrder(items.payments,      7);
    showOrder(items.marketing,     8);
    showOrder(items.sites,     9);
    showOrder(items.automation,    10);
    showOrder(items.memberships,   11);


    // attach submenus
    function attachSubmenu($parent, children) {
      if (!$parent.length) return;

      // 🧹 Remove existing submenu if any
      $parent.find('.slideout-menu').remove();

      $parent.attr("data-has-submenu", "true");
      const $menu = jQuery("<div>").addClass("slideout-menu").appendTo($parent);

      children.forEach(c => {
        jQuery("<a>").attr("href", c.href).text(c.text).appendTo($menu);
      });
    }

    const marketingChildren = [
      { text: "Social Planner", href: `/v2/location/${locId}/marketing/social-planner/` },
      { text: "Emails",         href: `/v2/location/${locId}/marketing/emails/statistics` },
      { text: "Affiliate Manager", href: `/v2/location/${locId}/marketing/affiliate-manager/dashboard` },
      { text: "Brand Boards",   href: `/v2/location/${locId}/marketing/brand-boards` },
      { text: "Ad Manager",     href: `/v2/location/${locId}/marketing/ad-manager/home` },
      { text: "Content AI",     href: `/v2/location/${locId}/marketing/content-ai` }
    ];
    const membershipChildren = [
      { text: "Dashboard",       href: `/v2/location/${locId}/memberships/client-portal/dashboard` },
      { text: "Courses",         href: `/v2/location/${locId}/memberships/courses/dashboard` },
      { text: "Groups",          href: `/v2/location/${locId}/memberships/communities/community-groups` },
      { text: "Certificates",    href: `/v2/location/${locId}/memberships/certificates/create-certificates` },
      { text: "Group Marketplace", href: `/v2/location/${locId}/memberships/gokollab/activation` }
    ];
    const sitesChildren = [
      { text: "Funnels", href: `/v2/location/${locId}/funnels-websites/funnels` },
      { text: "Websites", href: `/v2/location/${locId}/funnels-websites/websites` },
      { text: "Stores", href: `/v2/location/${locId}/funnels-websites/stores` },
      { text: "Webinars", href: `/v2/location/${locId}/funnels-websites/webinars` },
      { text: "Analytics", href: `/v2/location/${locId}/analytics` },
      { text: "Blogs", href: `/v2/location/${locId}/blogs` },
      { text: "WordPress", href: `/v2/location/${locId}/wordpress` },
      { text: "Client Portal", href: `/v2/location/${locId}/funnels-websites/client-portal/dashboard` },
      { text: "Forms", href: `/v2/location/${locId}/form-builder/main` },
      { text: "Surveys", href: `/v2/location/${locId}/survey-builder/main` },
      { text: "Quizzes", href: `/v2/location/${locId}/quiz-builder/main` },
      { text: "Chat Widget", href: `/v2/location/${locId}/funnels-websites/chat-widget` },
      { text: "QR Codes", href: `/v2/location/${locId}/qr-codes` },
      { text: "Domain Settings", href: `/v2/location/${locId}/settings/domain` },
    ];

    attachSubmenu(items.marketing,   marketingChildren);
    attachSubmenu(items.memberships, membershipChildren);
    attachSubmenu(items.sites,       sitesChildren);

    log("✅ Sidebar customization complete");
  }


  // ──────────────────────────────────────────────────────
  // CLEANUP INJECTIONS ONLY (no full DOM restore)
  // ──────────────────────────────────────────────────────
  function cleanupSidebar() {
    log("🧹 Cleaning up previous sidebar tweaks");
    sidebarInitialized = false;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    // remove injected style tag
    const oldStyle = document.getElementById("sidebar-submenu-style");
    if (oldStyle) oldStyle.remove();
    // remove submenus and flags
    document.querySelectorAll(".slideout-menu").forEach(el => el.remove());
    document.querySelectorAll("[data-has-submenu]").forEach(el => el.removeAttribute("data-has-submenu"));
    // remove our Task Management link
    document.querySelectorAll('#sidebar-v2 .hl_nav-header a[meta="task-management"]').forEach(el => el.remove());
    // reset inline styles on nav items
    document.querySelectorAll("#sidebar-v2 .hl_nav-header a").forEach(a => a.removeAttribute("style"));
  }


  // ──────────────────────────────────────────────────────
  // IMMEDIATE CHECK + INJECT
  // ──────────────────────────────────────────────────────
  let navRetryCount = 0;
  const MAX_NAV_RETRIES = 10;

  function checkAndInject() {
    const loc = extractLocationIdFromDom();
    if (!loc) {
      log("⛔ checkAndInject: no location ID");
      return;
    }

    if (!allowedLocationIds.includes(loc)) {
      log(`⛔ checkAndInject: location '${loc}' not allowed`);
      return;
    }

    const root = document.querySelector(`.sidebar-v2-location.${loc}`);
    if (!root) {
      if (navRetryCount < MAX_NAV_RETRIES) {
        navRetryCount++;
        log(`⏳ Root not found for location ${loc} (attempt ${navRetryCount}), retrying…`);
        setTimeout(checkAndInject, 200);
      } else {
        log("❌ Max root retries exceeded — giving up");
        navRetryCount = 0;
      }
      return;
    }

    const $root = jQuery(root);
    const $nav = $root.find(NAV_SEL);
    if (!$nav.length) {
      if (navRetryCount < MAX_NAV_RETRIES) {
        navRetryCount++;
        log(`⏳ Nav not found for location ${loc} (attempt ${navRetryCount}), retrying…`);
        setTimeout(checkAndInject, 200);
      } else {
        log("❌ Max nav retries exceeded — giving up");
        navRetryCount = 0;
      }
      return;
    }

    // ✅ Reset counter if successful
    navRetryCount = 0;

    // 🔁 Detect location change and reset state
    if (loc !== lastLocationId) {
      log(`🔁 Location ID changed: ${lastLocationId} → ${loc}`);
      sidebarInitialized = false;
      lastLocationId = loc;
    }

    runSidebarHack($root, $nav, loc);
  }





  // ──────────────────────────────────────────────────────
  // OBSERVE FOR LATE-LOADING NAV
  // ──────────────────────────────────────────────────────
  function startSidebarObserver() {
    const sidebar = document.querySelector("#sidebar-v2");
    if (!sidebar) {
      log("⏳ #sidebar-v2 not found yet, retrying observer init...");
      return setTimeout(startSidebarObserver, 500);
    }

    const parent = sidebar.parentElement;
    if (!parent) {
      log("❌ Could not find parent of #sidebar-v2");
      return;
    }

    log("👀 Observing sidebar parent for class changes…");

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const classList = mutation.target.classList;
          const isNowOpen = classList.contains("v2-open");
          const isNowCollapsed = classList.contains("v2-collapse");
          const newState = isNowOpen ? "open" : isNowCollapsed ? "collapsed" : "unknown";

          // If sidebar state changed, reset flag and reinject
          if (newState !== lastSidebarState) {
            log(`🔁 Sidebar state changed: ${lastSidebarState} → ${newState}`);
            sidebarInitialized = false;
            lastSidebarState = newState;
            checkAndInject();
          } else {
            log(`⏩ Sidebar state unchanged (${newState}), skipping`);
          }
        }
      }
    });

    observer.observe(parent, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }


  // ──────────────────────────────────────────────────────
  // RESET ON CLIENT-SIDE NAV
  // ──────────────────────────────────────────────────────
  let lastKnownPath = null;

  function resetSidebarOnUrlChange() {
    const currentPath = window.location.pathname;
    const currentLocId = extractLocationIdFromDom();

    if (lastKnownPath === currentPath && lastLocationId === currentLocId) {
      log("⏩ No path or location change detected, skipping sidebar reset");
      return;
    }

    log("🔁 URL or location ID changed → tearing down and re-init");
    lastKnownPath = currentPath;

    if (currentLocId !== lastLocationId) {
      log(`🔁 Location ID changed: ${lastLocationId} → ${currentLocId}`);
      lastLocationId = currentLocId;
      sidebarInitialized = false;
    }

    cleanupSidebar();
    checkAndInject();

    // re-apply class if necessary, only if location is allowed (checkAndInject handles it)
    const root = document.querySelector(".sidebar-v2-location");
    if (root && !root.classList.contains("sidebar-menu-hack")) {
      root.classList.add("sidebar-menu-hack");
      log("🛠️ Re-added 'sidebar-menu-hack' class after route change");
    }

    startSidebarObserver();
  }



  async function waitForElement(selector, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const interval = setInterval(() => {
        const element = document.querySelector(selector);
        const elapsed = Date.now() - start;

        if (element) {
          clearInterval(interval);
          resolve(element);
        } else if (elapsed >= timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout: Element ${selector} not found within ${timeoutMs}ms`));
        }
      }, 100);
    });
  }


  // ──────────────────────────────────────────────────────
  // FETCH ALLOWED LOCATIONS & HOOK NAV
  // ──────────────────────────────────────────────────────
  async function fetchAllowedLocations() {
    try {
      const res  = await fetch(API_URL, { headers: { "xc-token": API_TOKEN } });
      const json = await res.json();
      allowedLocationIds = json.list.map(r => r.locationId);
      log("✅ allowedLocationIds:", allowedLocationIds);


      history.pushState = new Proxy(history.pushState, {
        apply(target, thisArg, args) {
          const result = target.apply(thisArg, args);
          log("🔁 pushState → URL is now:", window.location.href);
          resetSidebarOnUrlChange();
          return result;
        }
      });
      history.replaceState = new Proxy(history.replaceState, {
        apply(target, thisArg, args) {
          const result = target.apply(thisArg, args);
          log("🔁 replaceState → URL is now:", window.location.href);
          resetSidebarOnUrlChange();
          return result;
        }
      });
      window.addEventListener("popstate", () => {
        log("🔁 popstate → URL is now:", window.location.href);
        resetSidebarOnUrlChange();
      });

      jQuery(document).on("click", "#sidebar-v2 .slideout-menu a, #sidebar-v2 a.sidebarhack-nav", function (e) {
        const href = jQuery(this).attr("href");
        if (!href || href.startsWith("http")) return; // allow external links

        e.preventDefault();
        e.stopImmediatePropagation();

        // emulate SPA navigation
        log("🔗 Intercepted link click → navigating SPA to", href);
        history.pushState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
        resetSidebarOnUrlChange();
      });

      // initial
      // Detect initial sidebar state
      try {
        const sidebarEl = await waitForElement("#sidebar-v2");

        if (sidebarEl && sidebarEl.parentElement) {
          const classList = sidebarEl.parentElement.classList;
          const isOpen = classList.contains("v2-open");
          const isCollapsed = classList.contains("v2-collapse");
          const initialState = isOpen ? "open" : isCollapsed ? "collapsed" : "unknown";
          log(`📍 Initial sidebar state is: ${initialState}`);
          lastSidebarState = initialState;

          if (initialState === "open") {
            sidebarInitialized = false;
            checkAndInject();
          }
        }
      } catch (err) {
        console.warn("⚠️ Sidebar element never appeared:", err.message);
      }


      startSidebarObserver();
    } catch (err) {
      console.error("❌ Failed to fetch allowed locations", err);
    }
  }


  // ──────────────────────────────────────────────────────
  // BOOTSTRAP
  // ──────────────────────────────────────────────────────
  jQuery(() => {
    log("📦 Bootstrapping sidebar hack…");
    fetchAllowedLocations();
  });


})();
