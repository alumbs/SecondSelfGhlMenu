(function () {
  // ──────────────────────────────────────────────────────
  // CONFIG
  // ──────────────────────────────────────────────────────
  const BASE      = window.location.origin;
  const NAV_SEL   = "#sidebar-v2 .hl_nav-header nav[aria-label='header']";
  const LOCATION_ID_PLACEHOLDER = "__LOCATION_ID__";

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

  function attachSubmenu($parent, children) {
    if (!$parent.length) return;

    const uid = `submenu-${Math.random().toString(36).substring(2, 8)}`;
    const $menu = jQuery("<div>")
      .addClass("slideout-menu")
      .attr("id", uid)
      .css({
        position: 'fixed',
        display: 'none',
        background: '#fff',
        borderRadius: '0.25rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '12rem',
        maxHeight: '300px',
        overflowY: 'auto',
        zIndex: 9999
      })
      .appendTo('body');

    children.forEach(c => {
      jQuery("<a>")
        .attr("href", c.href)
        .text(c.text)
        .css({
          display: 'block',
          padding: '0.5rem 1rem',
          color: '#333',
          textDecoration: 'none'
        })
        .hover(
          function () { $(this).css('background', '#f0f0f0'); },
          function () { $(this).css('background', 'transparent'); }
        )
        .appendTo($menu);
    });

    let hideTimeout;

    $parent.attr("data-has-submenu", "true");

    $parent.on('mouseenter', function () {
      clearTimeout(hideTimeout);

      // Hide all other menus before showing this one
      $('.slideout-menu').not($menu).hide();

      const rect = this.getBoundingClientRect();
      const menuHeight = $menu.outerHeight();
      const menuWidth = $menu.outerWidth();

      // Check if right overflow
      const viewportRight = window.innerWidth;
      const fitsRight = rect.right + menuWidth <= viewportRight;

      $menu.css({
        top: `${Math.min(rect.top, window.innerHeight - menuHeight - 10)}px`,
        left: fitsRight ? `${rect.right}px` : `${rect.left - menuWidth}px`,
        display: 'block'
      });
    });


    $parent.on('mouseleave', function () {
      hideTimeout = setTimeout(() => $menu.hide(), 200);
    });

    $menu.on('mouseenter', function () {
      clearTimeout(hideTimeout);
      $menu.show();
    }).on('mouseleave', function () {
      $menu.hide();
    });
  }

  async function applyLogoOverride(locationId) {
    const defaultLogo = 'https://msgsndr-private.storage.googleapis.com/companyPhotos/f867d50f-6649-4614-b371-1419bec355a3.png';

    const logoOverrides = {
      'ttXrkcpQy15sF0E5eKg3': 'https://storage.googleapis.com/msgsndr/ttXrkcpQy15sF0E5eKg3/media/681e4e036c40219138e44294.png',
      '7CruDLkFwMOZVGRa6cfu': 'https://storage.googleapis.com/msgsndr/ttXrkcpQy15sF0E5eKg3/media/681e4e036c40219138e44294.png'
    };

    try {
      log('🖼️ Waiting for agency logo element...');
      await waitForElement('.agency-logo-container img.agency-logo');

      const logoUrl = logoOverrides[locationId] || defaultLogo;

      $('.agency-logo-container img.agency-logo').attr('src', logoUrl);
      log(`✅ Logo set for location ${locationId}: ${logoUrl}`);
    } catch (err) {
      console.warn(`⚠️ Failed to set logo for location ${locationId}:`, err.message);
    }
  }


  
  function runSidebarHack(locId, retryCount = 0) {
    $('.slideout-menu').remove(); // clear all previously rendered menus

    const MAX_NAV_RETRIES = 10;
    // Always get fresh root and nav for the current location
    const root = document.querySelector(`.sidebar-v2-location[class*="${locId}"]`);
    if (!root) {
      if (retryCount < MAX_NAV_RETRIES) {
        log(`⏳ Root not found for location ${locId} (attempt ${retryCount + 1}), retrying…`);
        setTimeout(() => runSidebarHack(locId, retryCount + 1), 200);
      } else {
        log("❌ Max root retries exceeded — giving up");
      }
      return;
    }
    const $root = jQuery(root);
    const $nav = $root.find(NAV_SEL);
    if (!$nav.length) {
      if (retryCount < MAX_NAV_RETRIES) {
        log(`⏳ Nav not found for location ${locId} (attempt ${retryCount + 1}), retrying…`);
        setTimeout(() => runSidebarHack(locId, retryCount + 1), 200);
      } else {
        log("❌ Max nav retries exceeded — giving up");
      }
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

    applyLogoOverride(locId);

    // Use __LOCATION_ID__ as a placeholder in all submenu hrefs
    const items = {
      marketing:     $nav.find('a[meta="email-marketing"]'),
      memberships:   $nav.find('a[meta="memberships"]'),
      sites:         $nav.find('a[meta="sites"]'),
      reporting:     $nav.find('a[meta="reporting"]'),
      reputation:    $nav.find('a[meta="reputation"]'),
      payments:      $nav.find('a[meta="payments"]'),
      aiAgents:      $nav.find('a[meta="AI Agents"]')
    };

    const marketingChildren = [
      { text: "Social Planner", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/marketing/social-planner/` },
      { text: "Emails",         href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/marketing/emails/statistics` },
      { text: "Affiliate Manager", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/marketing/affiliate-manager/dashboard` },
      { text: "Brand Boards",   href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/marketing/brand-boards` },
      { text: "Ad Manager",     href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/marketing/ad-manager/home` }
    ];
    const membershipChildren = [
      { text: "Dashboard",       href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/client-portal/dashboard` },
      { text: "Courses",         href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/courses/dashboard` },
      { text: "Groups",          href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/communities/community-groups` },
      { text: "Certificates",    href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/certificates/create-certificates` },
      // { text: "Group Marketplace", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/gokollab/activation` }
    ];
    const sitesChildren = [
      { text: "Funnels", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/funnels-websites/funnels` },
      { text: "Websites", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/funnels-websites/websites` },
      { text: "Stores", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/funnels-websites/stores` },
      { text: "Webinars", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/funnels-websites/webinars` },
      { text: "Analytics", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/analytics` },
      { text: "Blogs", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/blogs` },
      { text: "WordPress", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/wordpress` },
      { text: "Client Portal", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/funnels-websites/client-portal/dashboard` },
      { text: "Forms", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/form-builder/main` },
      { text: "Surveys", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/survey-builder/main` },
      { text: "Quizzes", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/quiz-builder/main` },
      { text: "Chat Widget", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/funnels-websites/chat-widget` },
      { text: "QR Codes", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/qr-codes` },
      // { text: "Domain Settings", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/settings/domain` },
    ];
    const membershipsChildren = [
      { text: "Client Portal", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/client-portal/dashboard` },
      { text: "Courses", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/courses/dashboard` },
      { text: "Communities", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/communities/community-groups` },
      { text: "Certificates", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/memberships/certificates/create-certificates` }
    ];
    const reportingChildren = [
      { text: "Custom Reports", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reporting/reports` },
      { text: "Google Ads Report", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reporting/google-ads` },
      { text: "Facebook Ads Report", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reporting/facebook-ads` },
      { text: "Attribution Report", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reporting/attribution` },
      { text: "Call Report", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reporting/call` },
      { text: "Appointment Report", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reporting/appointment` },
      { text: "Audit Report", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reporting/audit-report` }
    ];
    const reputationChildren = [
      { text: "Overview", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reputation/overview` },
      { text: "Requests", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reputation/requests` },
      { text: "Reviews", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reputation/reviews` },
      { text: "Widgets", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reputation/widget` },
      { text: "Settings", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/reputation/settings` }
    ];
    const paymentsChildren = [
      { text: "Invoices & Estimates", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/invoices` },
      { text: "Documents & Contracts", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/proposals-estimates` },
      { text: "Orders", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/v2/orders` },
      { text: "Subscriptions", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/v2/subscriptions` },
      { text: "Payment Links", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/v2/paymentlinks` },
      { text: "Transactions", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/v2/transactions` },
      { text: "Products", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/products` },
      { text: "Coupons", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/coupons` },
      { text: "Settings", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/settings/receipts` },
      { text: "Integrations", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/payments/integrations` }
    ];
    const aiAgentsChildren = [
      { text: "Getting Started", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/ai-agents/getting-started` },
      { text: "Voice AI", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/ai-agents/voice-ai` },
      { text: "Conversation AI", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/ai-agents/conversation-ai` },
      { text: "Knowledge Base", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/ai-agents/knowledge-base` },
      { text: "Content AI", href: `/v2/location/${LOCATION_ID_PLACEHOLDER}/ai-agents/content-ai` }
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

      jQuery(document).on("click", ".slideout-menu a, #sidebar-v2 a.sidebarhack-nav", function (e) {
        let href = jQuery(this).attr("href");
        const currentPath = window.location.pathname;
        if (!href || href.startsWith("http")) return;

        const currentLocId = extractLocationIdFromDom();
        if (href.includes(LOCATION_ID_PLACEHOLDER) && currentLocId) {
          href = href.replace(LOCATION_ID_PLACEHOLDER, currentLocId);
        }

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
