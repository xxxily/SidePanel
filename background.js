import { createSiteFromUrl, getOriginPattern } from './src/url-utils.js';

const CONTEXT_MENU_IDS = {
  open: 'open-in-sidebar',
  add: 'add-to-sidebar'
};

const CONTEXT_MENU_TITLE = {
  open: {
    zh: '在侧栏打开',
    en: 'Open in Sidebar'
  },
  add: {
    zh: '加入侧边栏',
    en: 'Add to Sidebar'
  }
};

const getLocale = () => {
  const locale = (chrome.i18n.getUILanguage() || '').toLowerCase();
  return locale.startsWith('zh') ? 'zh' : 'en';
};

const getContextMenuTitle = (key) => {
  const locale = getLocale();
  return CONTEXT_MENU_TITLE[key][locale];
};

const normalizeFavicon = (favIconUrl) => {
  if (typeof favIconUrl !== 'string') return '🌐';
  return /^https?:\/\//i.test(favIconUrl) ? favIconUrl : '🌐';
};

const DYNAMIC_RULE_IDS = [1, 2];

const ensureDynamicRules = async () => {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: DYNAMIC_RULE_IDS,
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            {
              header: "content-security-policy-report-only",
              operation: "remove"
            }
          ]
        },
        condition: {
          resourceTypes: ["sub_frame"],
          urlFilter: "|http",
          initiatorDomains: [chrome.runtime.id]
        }
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "user-agent",
              operation: "set",
              value:
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
            }
          ]
        },
        condition: {
          resourceTypes: ["sub_frame"],
          urlFilter: "|http",
          initiatorDomains: [chrome.runtime.id]
        }
      }
    ]
  });
};

const createContextMenus = async () => {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.open,
    title: getContextMenuTitle('open'),
    contexts: ['page', 'link']
  });

  chrome.contextMenus.create({
    id: CONTEXT_MENU_IDS.add,
    title: getContextMenuTitle('add'),
    contexts: ['page', 'link']
  });
};

const requestHostAccess = async (url) => {
  const origin = getOriginPattern(url);
  if (!origin || !chrome.permissions?.request) return false;

  try {
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
};

const getMenuTargetSite = (info, tab) => {
  const rawUrl = info.linkUrl || tab?.url || '';
  const name = info.linkUrl ? '' : tab?.title || '';
  const icon = info.linkUrl ? '🌐' : normalizeFavicon(tab?.favIconUrl);
  return createSiteFromUrl(rawUrl, name, icon);
};

const openSidePanelForTab = (tab) => {
  if (typeof tab?.id === 'number') {
    chrome.sidePanel.open({ tabId: tab.id });
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await createContextMenus();
  await ensureDynamicRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await createContextMenus();
  await ensureDynamicRules();
});


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!Object.values(CONTEXT_MENU_IDS).includes(info.menuItemId)) return;

  const site = getMenuTargetSite(info, tab);
  if (!site) return;

  openSidePanelForTab(tab);
  await requestHostAccess(site.url);

  if (info.menuItemId === CONTEXT_MENU_IDS.open) {
    await chrome.storage.local.set({
      pendingOpenSite: {
        ...site,
        temporary: true,
        requestedAt: Date.now()
      }
    });
    return;
  }

  await chrome.storage.local.set({
    pendingAddSite: {
      ...site,
      requestedAt: Date.now()
    }
  });
});
