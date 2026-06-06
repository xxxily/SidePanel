<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import packageJson from '../package.json';
import { createSiteFromUrl, getOriginPattern, normalizeHttpUrl } from './url-utils.js';

const { t } = useI18n();

const APP_NAME = 'SidePanel';
const APP_VERSION = packageJson.version;
const PROJECT_URL = 'https://github.com/xxxily/SidePanel';
const APP_ICON = '/icons/icon-128.png';

const getFaviconUrl = (url) => {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return '';

  const { hostname } = new URL(normalized);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
};

const STORAGE_KEY = 'custom_sites_v1';
const DEFAULT_SITES_VERSION_KEY = 'default_sites_version_v1';
const DEFAULT_SITES_VERSION = '2026-06-06-codeflux';
const MAX_OPEN_FRAMES = 6;
const MAX_PANE_HISTORY = 24;
const PANE_IDS = ['pane-1', 'pane-2', 'pane-3', 'pane-4'];
const SPLIT_LAYOUTS = [
  { id: 'single', labelKey: 'layoutSingle', paneCount: 1 },
  { id: 'columns', labelKey: 'layoutColumns', paneCount: 2 },
  { id: 'rows', labelKey: 'layoutRows', paneCount: 2 },
  { id: 'grid', labelKey: 'layoutGrid', paneCount: 4 }
];

const IMAGE_ICON_RE = /^(?:https?:\/\/|data:image\/)\S+$/i;

const getChromeApi = () => globalThis.chrome;
const cloneSite = (site) => ({ ...site });
const IMG_GALLERY_ICON = 'data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2064%2064%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20rx%3D%2716%27%20fill%3D%27%2322C55E%27%2F%3E%3Crect%20x%3D%2714%27%20y%3D%2718%27%20width%3D%2736%27%20height%3D%2728%27%20rx%3D%278%27%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-width%3D%274%27%2F%3E%3Cpath%20d%3D%27M22%2028h20M22%2036h13%27%20stroke%3D%27white%27%20stroke-width%3D%274%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M43%209l2.4%206.4L52%2018l-6.6%202.6L43%2027l-2.4-6.4L34%2018l6.6-2.6L43%209z%27%20fill%3D%27white%27%2F%3E%3C%2Fsvg%3E';

const createDefaultSite = (site) => createSiteFromUrl(
  site.url,
  site.name,
  site.icon || getFaviconUrl(site.url)
);

const DEFAULT_SITE_DEFINITIONS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  {
    name: '豆包',
    icon: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/favicon/128x128.png',
    url: 'https://www.doubao.com/'
  },
  { name: 'Kimi', icon: 'https://www.kimi.com/favicon.ico', url: 'https://www.kimi.com/' },
  {
    name: 'Image Playground',
    icon: 'https://img-playground.anzz.site/favicon.svg',
    url: 'https://img-playground.anzz.site/'
  },
  {
    name: 'Image Gallery',
    icon: IMG_GALLERY_ICON,
    url: 'https://img-gallery.anzz.site/'
  },
  {
    name: 'DailyHot',
    icon: 'https://dailyhot.anzz.site/favicon.png',
    url: 'https://dailyhot.anzz.site/'
  },
  {
    name: 'Books',
    icon: 'https://pages.anzz.site/favicon.png',
    url: 'https://pages.anzz.site/books/'
  },
  {
    name: 'H5Player',
    icon: 'https://h5player.anzz.site/favicon.png',
    url: 'https://h5player.anzz.site/zh/'
  },
  {
    name: 'CodeFlux',
    icon: 'https://code.anzz.site/favicon.png',
    url: 'https://code.anzz.site/'
  }
];

const DEFAULT_SITE_LIST = DEFAULT_SITE_DEFINITIONS.map(createDefaultSite);
const LEGACY_DEFAULT_URLS = new Map([
  [normalizeHttpUrl('https://kimi.moonshot.cn/'), normalizeHttpUrl('https://www.kimi.com/')]
]);
const DEFAULT_SITE_BY_URL = new Map(
  DEFAULT_SITE_LIST.map((site) => [normalizeHttpUrl(site.url), site])
);

const normalizeSites = (value) => {
  if (!Array.isArray(value)) return DEFAULT_SITE_LIST.map(cloneSite);

  const normalized = value
    .map((site) => createSiteFromUrl(site?.url, site?.name, site?.icon))
    .filter(Boolean);

  return normalized.length ? normalized : DEFAULT_SITE_LIST.map(cloneSite);
};

const restoreKnownDefault = (site) => {
  const normalizedUrl = normalizeHttpUrl(site.url);
  const canonicalUrl = LEGACY_DEFAULT_URLS.get(normalizedUrl) || normalizedUrl;
  const defaultSite = DEFAULT_SITE_BY_URL.get(canonicalUrl);
  if (!defaultSite) return site;

  return cloneSite(defaultSite);
};

const migrateDefaultSites = (storedSites) => {
  const storedVersion = localStorage.getItem(DEFAULT_SITES_VERSION_KEY);
  if (storedVersion === DEFAULT_SITES_VERSION) return storedSites;

  const migrated = storedSites.map(restoreKnownDefault);
  const existingUrls = new Set(migrated.map((site) => normalizeHttpUrl(site.url)));
  for (const site of DEFAULT_SITE_LIST) {
    const normalizedUrl = normalizeHttpUrl(site.url);
    if (!existingUrls.has(normalizedUrl)) {
      migrated.push(cloneSite(site));
      existingUrls.add(normalizedUrl);
    }
  }

  localStorage.setItem(DEFAULT_SITES_VERSION_KEY, DEFAULT_SITES_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
};

const loadSites = () => {
  try {
    const storedSites = normalizeSites(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    return migrateDefaultSites(storedSites);
  } catch {
    const defaults = DEFAULT_SITE_LIST.map(cloneSite);
    localStorage.setItem(DEFAULT_SITES_VERSION_KEY, DEFAULT_SITES_VERSION);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
};

const sites = ref(loadSites());
const splitMode = ref('single');
const panes = ref(PANE_IDS.map((id) => ({
  id,
  url: null
})));
const activePaneId = ref(PANE_IDS[0]);
const openedFrames = ref([]);
const paneHistories = ref(Object.fromEntries(
  PANE_IDS.map((id) => [id, { entries: [], index: -1 }])
));
const paneFrameCaches = ref(Object.fromEntries(PANE_IDS.map((id) => [id, []])));
const isManageOpen = ref(false);
const editingIndex = ref(-1);

const form = ref({ name: '', icon: '', url: '' });
const draggedIndex = ref(-1);

const activeLayout = computed(() => (
  SPLIT_LAYOUTS.find((layout) => layout.id === splitMode.value) || SPLIT_LAYOUTS[0]
));
const visiblePaneCount = computed(() => activeLayout.value.paneCount);
const visiblePanes = computed(() => panes.value.slice(0, visiblePaneCount.value));
const activePane = computed(() => (
  visiblePanes.value.find((pane) => pane.id === activePaneId.value) || visiblePanes.value[0]
));
const activeUrl = computed(() => activePane.value?.url || null);
const visiblePaneUrls = computed(() => visiblePanes.value.map((pane) => pane.url).filter(Boolean));
const activeFrame = computed(() => (activeUrl.value ? getFrame(activeUrl.value) : null));
const activePaneHistory = computed(() => (
  paneHistories.value[activePane.value?.id] || { entries: [], index: -1 }
));
const canGoBack = computed(() => activePaneHistory.value.index > 0);
const canGoForward = computed(() => (
  activePaneHistory.value.index >= 0
  && activePaneHistory.value.index < activePaneHistory.value.entries.length - 1
));
const currentTabTitle = computed(() => (
  activeFrame.value?.title || activeUrl.value || t('ui.blankPageTitle')
));
const shouldShowTabMenu = computed(() => openedFrames.value.length > 0);

const isImageIcon = (icon) => IMAGE_ICON_RE.test((icon || '').trim());
const getFrameIcon = (frame) => frame?.icon || getFaviconUrl(frame?.url || '');
const getLayoutLabel = (layout = activeLayout.value) => t(`ui.${layout.labelKey}`);

const saveSites = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites.value));
};

const requestHostAccess = async (url) => {
  const origin = getOriginPattern(url);
  const permissions = getChromeApi()?.permissions;
  if (!origin || !permissions?.request) return false;

  try {
    return await permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
};

const trimOpenedFrames = () => {
  if (openedFrames.value.length <= MAX_OPEN_FRAMES) return;

  const removable = openedFrames.value
    .filter((frame) => !visiblePaneUrls.value.includes(frame.url))
    .sort((a, b) => {
      if (a.temporary !== b.temporary) return a.temporary ? -1 : 1;
      return a.lastActiveAt - b.lastActiveAt;
    })[0];

  if (!removable) return;
  openedFrames.value = openedFrames.value.filter((frame) => frame.url !== removable.url);
  removeFrameFromAllPaneCaches(removable.url);
};

const setActivePane = (paneId) => {
  if (!visiblePanes.value.some((pane) => pane.id === paneId)) return;
  activePaneId.value = paneId;
};

const getActivePane = () => {
  const pane = visiblePanes.value.find((item) => item.id === activePaneId.value);
  if (pane) return pane;

  const fallback = visiblePanes.value[0];
  activePaneId.value = fallback?.id || PANE_IDS[0];
  return fallback;
};

const getFrame = (url) => openedFrames.value.find((frame) => frame.url === url);

const getPaneTitle = (pane) => {
  if (!pane?.url) return t('ui.emptyPaneTitle');
  return getFrame(pane.url)?.title || pane.url;
};

const getPaneCachedFrames = (paneId) => paneFrameCaches.value[paneId] || [];

const ensurePaneFrame = (paneId, url) => {
  const normalized = normalizeHttpUrl(url);
  if (!paneId || !normalized) return;

  const frames = getPaneCachedFrames(paneId);
  if (frames.some((frame) => frame.url === normalized)) return;

  paneFrameCaches.value = {
    ...paneFrameCaches.value,
    [paneId]: [...frames, { url: normalized, reloadKey: 0 }]
  };
};

const removeFrameFromAllPaneCaches = (url) => {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return;

  paneFrameCaches.value = Object.fromEntries(
    PANE_IDS.map((paneId) => [
      paneId,
      getPaneCachedFrames(paneId).filter((frame) => frame.url !== normalized)
    ])
  );
};

const removePaneFrame = (paneId, url) => {
  const normalized = normalizeHttpUrl(url);
  if (!paneId || !normalized) return;

  paneFrameCaches.value = {
    ...paneFrameCaches.value,
    [paneId]: getPaneCachedFrames(paneId).filter((frame) => frame.url !== normalized)
  };
};

const reloadPaneFrame = (paneId, url) => {
  const normalized = normalizeHttpUrl(url);
  if (!paneId || !normalized) return;

  paneFrameCaches.value = {
    ...paneFrameCaches.value,
    [paneId]: getPaneCachedFrames(paneId).map((frame) => (
      frame.url === normalized ? { ...frame, reloadKey: frame.reloadKey + 1 } : frame
    ))
  };
};

const pushPaneHistory = (paneId, url) => {
  const normalized = normalizeHttpUrl(url);
  if (!paneId || !normalized) return;

  const history = paneHistories.value[paneId] || { entries: [], index: -1 };
  const currentUrl = history.entries[history.index];
  if (currentUrl === normalized) return;

  const entries = history.entries.slice(0, history.index + 1);
  entries.push(normalized);

  if (entries.length > MAX_PANE_HISTORY) {
    entries.shift();
  }

  paneHistories.value[paneId] = {
    entries,
    index: entries.length - 1
  };
};

const prunePaneHistoryUrl = (url) => {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return;

  paneHistories.value = Object.fromEntries(
    PANE_IDS.map((paneId) => {
      const history = paneHistories.value[paneId] || { entries: [], index: -1 };
      const currentUrl = history.entries[history.index];
      const entries = history.entries.filter((entry) => entry !== normalized);
      const nextIndex = currentUrl && currentUrl !== normalized
        ? entries.findIndex((entry) => entry === currentUrl)
        : entries.length - 1;

      return [paneId, {
        entries,
        index: nextIndex
      }];
    })
  );
};

const setPaneUrl = (pane, url, { recordHistory = true } = {}) => {
  const normalized = normalizeHttpUrl(url);
  if (!pane || !normalized) return;

  pane.url = normalized;
  ensurePaneFrame(pane.id, normalized);
  if (recordHistory) {
    pushPaneHistory(pane.id, normalized);
  }
};

const clearPane = (paneId) => {
  const pane = panes.value.find((item) => item.id === paneId);
  if (!pane) return;
  removePaneFrame(paneId, pane.url);
  pane.url = null;
  setActivePane(paneId);
};

const applySingleLayout = (urlToKeep = activeUrl.value || visiblePaneUrls.value[0] || null) => {
  panes.value = panes.value.map((pane, index) => ({
    ...pane,
    url: index === 0 ? urlToKeep : pane.url
  }));
  if (urlToKeep) ensurePaneFrame(PANE_IDS[0], urlToKeep);
  activePaneId.value = PANE_IDS[0];
};

const setSplitMode = (mode) => {
  const nextLayout = SPLIT_LAYOUTS.find((layout) => layout.id === mode);
  if (!nextLayout) return;

  const previousLayout = activeLayout.value;
  const urlToKeep = activeUrl.value || visiblePaneUrls.value[0] || null;
  splitMode.value = nextLayout.id;
  if (nextLayout.id === 'single') {
    applySingleLayout(urlToKeep);
    return;
  }

  if (previousLayout.id === 'single') {
    panes.value = panes.value.map((pane, index) => ({
      ...pane,
      url: index === 0 ? urlToKeep : null
    }));
    activePaneId.value = PANE_IDS[0];
    return;
  }

  if (nextLayout.paneCount > previousLayout.paneCount) {
    panes.value = panes.value.map((pane, index) => ({
      ...pane,
      url: index >= previousLayout.paneCount && index < nextLayout.paneCount ? null : pane.url
    }));
  }

  if (!visiblePanes.value.some((pane) => pane.id === activePaneId.value)) {
    activePaneId.value = PANE_IDS[0];
  }
};

const openFrame = (url, metadata = {}) => {
  const site = createSiteFromUrl(
    url,
    metadata.title || metadata.name,
    metadata.icon || getFaviconUrl(url)
  );
  if (!site) {
    alert(t('ui.invalidUrl'));
    return null;
  }

  const now = Date.now();
  const existing = openedFrames.value.find((frame) => frame.url === site.url);
  if (existing) {
    existing.title = metadata.title || metadata.name || existing.title || site.name;
    existing.icon = metadata.icon || existing.icon || site.icon;
    existing.temporary = Boolean(metadata.temporary ?? existing.temporary);
    existing.lastActiveAt = now;
  } else {
    openedFrames.value.push({
      url: site.url,
      title: metadata.title || metadata.name || site.name,
      icon: metadata.icon || site.icon,
      temporary: Boolean(metadata.temporary),
      lastActiveAt: now
    });
  }

  const pane = getActivePane();
  if (pane) {
    setPaneUrl(pane, site.url, { recordHistory: metadata.recordHistory !== false });
    activePaneId.value = pane.id;
  }

  trimOpenedFrames();
  return site.url;
};

const navigatePaneHistory = (direction) => {
  const pane = getActivePane();
  if (!pane) return;

  const history = paneHistories.value[pane.id] || { entries: [], index: -1 };
  const nextIndex = history.index + direction;
  const nextUrl = history.entries[nextIndex];
  if (!nextUrl) return;

  paneHistories.value[pane.id] = {
    ...history,
    index: nextIndex
  };

  const frame = getFrame(nextUrl);
  openFrame(nextUrl, {
    title: frame?.title,
    icon: frame?.icon,
    temporary: frame?.temporary ?? true,
    recordHistory: false
  });
};

const closeFrame = (url) => {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return;

  const wasVisibleInPane = panes.value.some((pane) => pane.url === normalized);
  openedFrames.value = openedFrames.value.filter((frame) => frame.url !== normalized);
  prunePaneHistoryUrl(normalized);
  removeFrameFromAllPaneCaches(normalized);
  panes.value = panes.value.map((pane) => (
    pane.url === normalized ? { ...pane, url: null } : pane
  ));

  if (splitMode.value !== 'single' || !wasVisibleInPane) return;

  const next = openedFrames.value
    .slice()
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];

  if (next) {
    setPaneUrl(panes.value[0], next.url);
    activePaneId.value = PANE_IDS[0];
    next.lastActiveAt = Date.now();
    return;
  }

  panes.value[0].url = null;
};

const refreshActivePane = () => {
  const pane = getActivePane();
  if (!pane?.url) return;
  reloadPaneFrame(pane.id, pane.url);
};

const consumePendingAddSite = async () => {
  const storage = getChromeApi()?.storage?.local;
  if (!storage) return;

  const { pendingAddSite } = await storage.get('pendingAddSite');
  if (!pendingAddSite) return;

  await storage.remove('pendingAddSite');

  const site = createSiteFromUrl(pendingAddSite.url, pendingAddSite.name, pendingAddSite.icon);
  if (!site) return;

  const exists = sites.value.some((item) => item.url === site.url);
  if (exists) return;

  sites.value.push(site);
  saveSites();
};

const consumePendingOpenSite = async () => {
  const storage = getChromeApi()?.storage?.local;
  if (!storage) return;

  const { pendingOpenSite } = await storage.get('pendingOpenSite');
  if (!pendingOpenSite) return;

  await storage.remove('pendingOpenSite');

  const site = createSiteFromUrl(pendingOpenSite.url, pendingOpenSite.name, pendingOpenSite.icon);
  if (!site) return;

  openFrame(site.url, {
    title: site.name,
    icon: site.icon,
    temporary: true
  });
};

const isSiteActive = (siteUrl) => {
  const normalized = normalizeHttpUrl(siteUrl);
  if (!normalized || !activeUrl.value) return false;
  try {
    const current = new URL(activeUrl.value).toString();
    const target = new URL(normalized).toString();
    return current === target || current.startsWith(target);
  } catch {
    return false;
  }
};

const openInFrame = async (site) => {
  const url = typeof site === 'string' ? site : site?.url;
  await requestHostAccess(url);
  openFrame(url, {
    title: typeof site === 'string' ? '' : site?.name,
    icon: typeof site === 'string' ? '' : site?.icon,
    temporary: false
  });
};

const openStoredFrame = (frame) => {
  openFrame(frame.url, {
    title: frame.title,
    icon: frame.icon,
    temporary: frame.temporary,
    recordHistory: false
  });
};

const resetForm = () => {
  editingIndex.value = -1;
  form.value = { name: '', icon: '', url: '' };
};

const startEdit = (index) => {
  const site = sites.value[index];
  editingIndex.value = index;
  form.value = { name: site.name, icon: site.icon, url: site.url };
};

const upsertSite = () => {
  const site = createSiteFromUrl(
    form.value.url,
    form.value.name,
    form.value.icon || getFaviconUrl(form.value.url)
  );

  if (!site?.name || !site.url) {
    alert(t('ui.invalidUrl'));
    return;
  }

  const duplicateIndex = sites.value.findIndex((item) => item.url === site.url);
  if (duplicateIndex >= 0 && duplicateIndex !== editingIndex.value) return;

  if (editingIndex.value >= 0) {
    sites.value[editingIndex.value] = site;
  } else {
    sites.value.push(site);
  }

  saveSites();
  resetForm();
};

const removeSite = (index) => {
  const removed = sites.value.splice(index, 1)[0];
  const removedUrl = normalizeHttpUrl(removed.url);
  if (removedUrl) {
    closeFrame(removedUrl);
  }

  saveSites();
};

const handleMenuWheel = (event) => {
  const menu = event.currentTarget;
  if (!(menu instanceof HTMLElement)) return;

  const canScrollHorizontally = menu.scrollWidth > menu.clientWidth;
  if (!canScrollHorizontally || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

  event.preventDefault();
  menu.scrollLeft += event.deltaY;
};

const onDragStart = (index) => {
  draggedIndex.value = index;
};

const onDrop = (targetIndex) => {
  const from = draggedIndex.value;
  draggedIndex.value = -1;
  if (from < 0 || from === targetIndex) return;
  const moved = sites.value.splice(from, 1)[0];
  sites.value.splice(targetIndex, 0, moved);
  saveSites();
};

const getPaneNumber = (paneId) => PANE_IDS.indexOf(paneId) + 1;

onMounted(async () => {
  await consumePendingAddSite();
  await consumePendingOpenSite();

  const chromeApi = getChromeApi();
  if (!chromeApi?.storage?.onChanged) return;

  chromeApi.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.pendingAddSite) await consumePendingAddSite();
    if (changes.pendingOpenSite) await consumePendingOpenSite();
  });
});
</script>

<template>
  <main class="layout">
    <section
      class="viewer"
      :class="`is-${splitMode}`"
      :aria-label="t('ui.viewerArea')"
    >
      <div
        v-for="pane in visiblePanes"
        :key="pane.id"
        class="viewer-pane"
        :class="{ 'is-active': pane.id === activePaneId, 'is-empty': !pane.url }"
        @click="setActivePane(pane.id)"
      >
        <div class="pane-toolbar">
          <span class="pane-title" :title="getPaneTitle(pane)">
            {{ getPaneTitle(pane) }}
          </span>
          <button
            v-if="pane.url"
            class="pane-clear"
            type="button"
            :title="t('ui.clearPane')"
            :aria-label="t('ui.clearPane')"
            @click.stop="clearPane(pane.id)"
          >×</button>
        </div>

        <iframe
          v-for="cachedFrame in getPaneCachedFrames(pane.id)"
          v-show="cachedFrame.url === pane.url"
          :key="`${pane.id}-${cachedFrame.url}-${cachedFrame.reloadKey}`"
          class="site-frame"
          :title="getFrame(cachedFrame.url)?.title || cachedFrame.url || t('ui.frameTitle')"
          :src="cachedFrame.url"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads allow-popups-to-escape-sandbox"
          referrerpolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write"
        ></iframe>

        <div
          v-if="!pane.url && splitMode === 'single'"
          class="blank-home"
          :aria-label="t('ui.blankPageTitle')"
        >
          <img class="blank-home-icon" :src="APP_ICON" :alt="APP_NAME" />
          <div class="blank-home-name">{{ APP_NAME }}</div>
          <div class="blank-home-meta">v{{ APP_VERSION }}</div>
          <a class="blank-home-link" :href="PROJECT_URL" target="_blank" rel="noreferrer">
            {{ PROJECT_URL }}
          </a>
        </div>

        <button
          v-if="!pane.url && splitMode !== 'single'"
          class="empty-view"
          type="button"
          @click.stop="setActivePane(pane.id)"
        >
          <span>{{ t('ui.emptyPane', { number: getPaneNumber(pane.id) }) }}</span>
          <small>{{ t('ui.emptyPaneHint') }}</small>
        </button>
      </div>
    </section>

    <nav class="right-sidebar" :aria-label="t('ui.quickSidebar')">
      <div class="quick-menu" role="tablist" :aria-label="t('ui.quickSites')" @wheel="handleMenuWheel">
        <button
          v-for="(site, index) in sites"
          :key="`${site.name}-${index}`"
          class="site-btn"
          :class="{ 'is-active': isSiteActive(site.url) }"
          :title="site.name"
          role="tab"
          type="button"
          draggable="true"
          @click="openInFrame(site)"
          @dragstart="onDragStart(index)"
          @dragover.prevent
          @drop="onDrop(index)"
          @dragend="draggedIndex = -1"
        >
          <img
            v-if="isImageIcon(site.icon)"
            class="site-icon-img"
            :src="site.icon"
            :alt="t('ui.iconAlt', { name: site.name })"
            loading="lazy"
          />
          <span v-else class="site-icon-text">{{ site.icon }}</span>
        </button>
      </div>

      <div v-if="shouldShowTabMenu" class="tab-menu" :aria-label="t('ui.openPages')">
        <button
          class="tab-menu-trigger"
          type="button"
          :title="currentTabTitle"
          :aria-label="currentTabTitle"
        >
          <img
            v-if="activeFrame && isImageIcon(getFrameIcon(activeFrame))"
            class="tab-icon-img"
            :src="getFrameIcon(activeFrame)"
            :alt="t('ui.iconAlt', { name: currentTabTitle })"
            loading="lazy"
          />
          <span v-else class="tab-icon-text" aria-hidden="true">▣</span>
          <span class="tab-trigger-title">{{ currentTabTitle }}</span>
        </button>
        <div class="tab-dropdown" role="menu">
          <div class="tab-toolbar">
            <button
              class="history-btn"
              type="button"
              :disabled="!canGoBack"
              :title="t('ui.goBack')"
              :aria-label="t('ui.goBack')"
              @click="navigatePaneHistory(-1)"
            >‹</button>
            <button
              class="history-btn"
              type="button"
              :disabled="!canGoForward"
              :title="t('ui.goForward')"
              :aria-label="t('ui.goForward')"
              @click="navigatePaneHistory(1)"
            >›</button>
            <button
              class="history-btn"
              type="button"
              :disabled="!activeUrl"
              :title="t('ui.refreshPage')"
              :aria-label="t('ui.refreshPage')"
              @click="refreshActivePane"
            >↻</button>
            <span class="tab-current-title" :title="currentTabTitle">{{ currentTabTitle }}</span>
          </div>
          <button
            v-for="frame in openedFrames"
            :key="frame.url"
            class="open-tab"
            :class="{ 'is-active': frame.url === activeUrl, 'is-visible': visiblePaneUrls.includes(frame.url), 'is-temporary': frame.temporary }"
            :title="frame.title || frame.url"
            type="button"
            role="menuitem"
            @click="openStoredFrame(frame)"
          >
            <img
              v-if="isImageIcon(getFrameIcon(frame))"
              class="tab-icon-img"
              :src="getFrameIcon(frame)"
              :alt="t('ui.iconAlt', { name: frame.title || frame.url })"
              loading="lazy"
            />
            <span v-else class="tab-icon-text" aria-hidden="true">▣</span>
            <span class="open-tab-title">{{ frame.title || frame.url }}</span>
            <span v-if="frame.temporary" class="temporary-dot" aria-hidden="true"></span>
            <span
              class="close-tab"
              role="button"
              tabindex="0"
              :title="t('ui.closePage')"
              @click.stop="closeFrame(frame.url)"
              @keydown.enter.stop.prevent="closeFrame(frame.url)"
              @keydown.space.stop.prevent="closeFrame(frame.url)"
            >×</span>
          </button>
        </div>
      </div>

      <div class="split-controls" :aria-label="t('ui.splitLayouts')">
        <button
          class="split-trigger"
          :class="`is-${splitMode}`"
          type="button"
          :title="getLayoutLabel()"
          :aria-label="getLayoutLabel()"
        >
          <span class="layout-icon" aria-hidden="true"></span>
        </button>
        <div class="split-dropdown" role="menu">
          <button
            v-for="layout in SPLIT_LAYOUTS"
            :key="layout.id"
            class="split-btn"
            :class="[`is-${layout.id}`, { 'is-active': splitMode === layout.id }]"
            type="button"
            role="menuitem"
            :title="getLayoutLabel(layout)"
            :aria-label="getLayoutLabel(layout)"
            @click="setSplitMode(layout.id)"
          >
            <span class="layout-icon" aria-hidden="true"></span>
            <span class="split-label">{{ getLayoutLabel(layout) }}</span>
          </button>
        </div>
      </div>

      <button class="manage-toggle" :title="t('ui.manageNav')" @click="isManageOpen = !isManageOpen">⚙️</button>
    </nav>

    <div v-if="isManageOpen" class="manage-backdrop" @click="isManageOpen = false"></div>

    <section
      class="manage-panel"
      :aria-label="t('ui.managePanel')"
      v-show="isManageOpen"
      @click.stop
    >
      <h2>{{ t('ui.manageQuickSites') }}</h2>
      <form class="site-form" @submit.prevent="upsertSite">
        <input v-model="form.name" type="text" :placeholder="t('ui.inputName')" required />
        <input
          v-model="form.icon"
          type="text"
          :placeholder="t('ui.inputIcon')"
        />
        <input v-model="form.url" type="text" inputmode="url" :placeholder="t('ui.inputUrl')" required />
        <button type="submit">{{ editingIndex >= 0 ? t('ui.save') : t('ui.add') }}</button>
        <button v-if="editingIndex >= 0" type="button" @click="resetForm">{{ t('ui.cancel') }}</button>
      </form>

      <ul class="site-list">
        <li v-for="(site, index) in sites" :key="`${site.url}-${index}`" class="site-item">
          <img
            v-if="isImageIcon(site.icon)"
            class="site-icon-img"
            :src="site.icon"
            :alt="t('ui.iconAlt', { name: site.name })"
            loading="lazy"
          />
          <span v-else class="site-icon-text">{{ site.icon }}</span>
          <div>
            <div>{{ site.name }}</div>
            <div class="site-url">{{ site.url }}</div>
          </div>
          <button type="button" @click="startEdit(index)">{{ t('ui.edit') }}</button>
          <button type="button" @click="removeSite(index)">{{ t('ui.remove') }}</button>
        </li>
      </ul>
    </section>
  </main>
</template>
