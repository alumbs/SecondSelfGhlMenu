(function () {
  // ──────────────────────────────────────────────────────
  // CONFIG
  // ──────────────────────────────────────────────────────
  const BASE      = window.location.origin;
  const NAV_SEL   = "#sidebar-v2 .hl_nav-header nav[aria-label='header']";

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

  function attachSubmenu($parent, children) {
    if (!$parent.length) return;
    $parent.find('.slideout-menu').remove();
    $parent.attr("data-has-submenu", "true");
    const $menu = jQuery("<div>").addClass("slideout-menu").appendTo($parent);
    children.forEach(c => {
      jQuery("<a>").attr("href", c.href).text(c.text).appendTo($menu);
    });
  }

  
  function runSidebarHack(locId) {
    // Always get fresh root and nav for the current location
    const root = document.querySelector(`.sidebar-v2-location[class*="${locId}"]`);
    if (!root) {
      log("❌ No root found for location:", locId);
      return;
    }
    const $root = jQuery(root);
    const $nav = $root.find(NAV_SEL);
    if (!$nav.length) {
      log("❌ No nav found for location:", locId);
      return;
    }

    // Check if already initialized, but verify submenus exist
    if (sidebarInitialized) {
      // If no submenus exist, force re-initialization
      if ($nav.find('.slideout-menu').length === 0) {
        log('⚠️ Sidebar initialized flag set, but no submenus found. Forcing re-initialization.');
        sidebarInitialized = false;
      } else {
        log('⚠️ Sidebar already initialized, skipping');
        return;
      }
    }
    sidebarInitialized = true;
    log('🎯 Customizing sidebar for location:', locId);

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

    const items = {
      marketing:     $nav.find('a[meta="email-marketing"]'),
      memberships:   $nav.find('a[meta="memberships"]'),
      sites:         $nav.find('a[meta="sites"]'),
      reporting:     $nav.find('a[meta="reporting"]'),
      reputation:    $nav.find('a[meta="reputation"]'),
      payments:      $nav.find('a[meta="payments"]'),
      aiAgents:      $nav.find('a[meta="ai-agents"]')
    };

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

    const membershipsChildren = [
      { text: "Client Portal", href: `/v2/location/${locId}/memberships/client-portal/dashboard` },
      { text: "Courses", href: `/v2/location/${locId}/memberships/courses/dashboard` },
      { text: "Communities", href: `/v2/location/${locId}/memberships/communities/community-groups` },
      { text: "Certificates", href: `/v2/location/${locId}/memberships/certificates/create-certificates` }
    ];

    const reportingChildren = [
      { text: "Custom Reports", href: `/v2/location/${locId}/reporting/reports` },
      { text: "Google Ads Report", href: `/v2/location/${locId}/reporting/google-ads` },
      { text: "Facebook Ads Report", href: `/v2/location/${locId}/reporting/facebook-ads` },
      { text: "Attribution Report", href: `/v2/location/${locId}/reporting/attribution` },
      { text: "Call Report", href: `/v2/location/${locId}/reporting/call` },
      { text: "Appointment Report", href: `/v2/location/${locId}/reporting/appointment` },
      { text: "Audit Report", href: `/v2/location/${locId}/reporting/audit-report` }
    ];

    const reputationChildren = [
      { text: "Overview", href: `/v2/location/${locId}/reputation/overview` },
      { text: "Requests", href: `/v2/location/${locId}/reputation/requests` },
      { text: "Reviews", href: `/v2/location/${locId}/reputation/reviews` },
      { text: "Widgets", href: `/v2/location/${locId}/reputation/widget` },
      { text: "Settings", href: `/v2/location/${locId}/reputation/settings` }
    ];

    const paymentsChildren = [
      { text: "Invoices & Estimates", href: `/v2/location/${locId}/payments/invoices` },
      { text: "Documents & Contracts", href: `/v2/location/${locId}/payments/proposals-estimates` },
      { text: "Orders", href: `/v2/location/${locId}/payments/v2/orders` },
      { text: "Subscriptions", href: `/v2/location/${locId}/payments/v2/subscriptions` },
      { text: "Payment Links", href: `/v2/location/${locId}/payments/v2/paymentlinks` },
      { text: "Transactions", href: `/v2/location/${locId}/payments/v2/transactions` },
      { text: "Products", href: `/v2/location/${locId}/payments/products` },
      { text: "Coupons", href: `/v2/location/${locId}/payments/coupons` },
      { text: "Settings", href: `/v2/location/${locId}/payments/settings/receipts` },
      { text: "Integrations", href: `/v2/location/${locId}/payments/integrations` }
    ];

    const aiAgentsChildren = [
      { text: "Getting Started", href: `/v2/location/${locId}/ai-agents/getting-started` },
      { text: "Voice AI", href: `/v2/location/${locId}/ai-agents/voice-ai` },
      { text: "Conversation AI", href: `/v2/location/${locId}/ai-agents/conversation-ai` },
      { text: "Knowledge Base", href: `/v2/location/${locId}/ai-agents/knowledge-base` },
      { text: "Content AI", href: `/v2/location/${locId}/ai-agents/content-ai` }
    ];

    attachSubmenu(items.marketing,   marketingChildren);
    attachSubmenu(items.memberships, membershipChildren);
    attachSubmenu(items.sites,       sitesChildren);

    attachSubmenu(items.memberships, membershipsChildren);
    attachSubmenu(items.reporting, reportingChildren);
    attachSubmenu(items.reputation, reputationChildren);
    attachSubmenu(items.payments, paymentsChildren);
    attachSubmenu(items.aiAgents, aiAgentsChildren);

    log("✅ Sidebar customization complete");
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

    runSidebarHack(loc);
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
        const currentPath = window.location.pathname;

        if (!href || href.startsWith("http")) return; // allow external links

        // Normalize both paths to avoid trailing slash issues
        const normalizedHref = href.replace(/\/+$/, '');
        const normalizedCurrent = currentPath.replace(/\/+$/, '');

        if (normalizedHref === normalizedCurrent) {
          log("⚠️ SPA navigation skipped — already on target route:", href);
          return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();

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
