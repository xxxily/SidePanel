<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { createSiteFromUrl, getOriginPattern, normalizeHttpUrl } from './url-utils.js';

const { t } = useI18n();

const DEFAULT_SITES = [
  { name: 'ChatGPT', icon: '🤖', url: 'https://chatgpt.com' },
  { name: '豆包', icon: '🫘', url: 'https://www.doubao.com' },
  { name: 'Kimi', icon: '🌙', url: 'https://kimi.moonshot.cn' }
].map((site) => createSiteFromUrl(site.url, site.name, site.icon));

const STORAGE_KEY = 'custom_sites_v1';
const MAX_OPEN_FRAMES = 6;

const IMAGE_ICON_RE = /^https?:\/\/\S+$/i;

const getChromeApi = () => globalThis.chrome;

const normalizeSites = (value) => {
  if (!Array.isArray(value)) return DEFAULT_SITES;

  const normalized = value
    .map((site) => createSiteFromUrl(site?.url, site?.name, site?.icon))
    .filter(Boolean);

  return normalized.length ? normalized : DEFAULT_SITES;
};

const loadSites = () => {
  try {
    return normalizeSites(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return DEFAULT_SITES;
  }
};

const sites = ref(loadSites());
const activeUrl = ref(normalizeHttpUrl(sites.value[0]?.url || ''));
const openedFrames = ref(activeUrl.value ? [{
  url: activeUrl.value,
  title: sites.value[0]?.name || activeUrl.value,
  temporary: false,
  lastActiveAt: Date.now()
}] : []);
const isManageOpen = ref(false);
const editingIndex = ref(-1);

const form = ref({ name: '', icon: '', url: '' });
const draggedIndex = ref(-1);

const isImageIcon = (icon) => IMAGE_ICON_RE.test((icon || '').trim());

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
    .filter((frame) => frame.url !== activeUrl.value)
    .sort((a, b) => {
      if (a.temporary !== b.temporary) return a.temporary ? -1 : 1;
      return a.lastActiveAt - b.lastActiveAt;
    })[0];

  if (!removable) return;
  openedFrames.value = openedFrames.value.filter((frame) => frame.url !== removable.url);
};

const openFrame = (url, metadata = {}) => {
  const site = createSiteFromUrl(url, metadata.title || metadata.name, metadata.icon);
  if (!site) {
    alert(t('ui.invalidUrl'));
    return null;
  }

  const now = Date.now();
  const existing = openedFrames.value.find((frame) => frame.url === site.url);
  if (existing) {
    existing.title = metadata.title || metadata.name || existing.title || site.name;
    existing.temporary = Boolean(metadata.temporary ?? existing.temporary);
    existing.lastActiveAt = now;
  } else {
    openedFrames.value.push({
      url: site.url,
      title: metadata.title || metadata.name || site.name,
      temporary: Boolean(metadata.temporary),
      lastActiveAt: now
    });
  }

  activeUrl.value = site.url;
  trimOpenedFrames();
  return site.url;
};

const closeFrame = (url) => {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return;

  const closingActive = normalized === activeUrl.value;
  openedFrames.value = openedFrames.value.filter((frame) => frame.url !== normalized);

  if (!closingActive) return;

  const next = openedFrames.value
    .slice()
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];

  if (next) {
    activeUrl.value = next.url;
    next.lastActiveAt = Date.now();
    return;
  }

  activeUrl.value = null;
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

const frameUrl = computed(() => activeUrl.value);
const shouldShowOpenTabs = computed(() => (
  openedFrames.value.length > 1 || openedFrames.value.some((frame) => frame.temporary)
));

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
  const site = createSiteFromUrl(form.value.url, form.value.name, form.value.icon);

  if (!site?.name || !site.icon || !site.url) {
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

  if (!activeUrl.value && sites.value[0]) {
    openFrame(sites.value[0].url, { title: sites.value[0].name, icon: sites.value[0].icon });
  }
  saveSites();
};

const handleMenuWheel = (event) => {
  const menu = event.currentTarget;
  if (!(menu instanceof HTMLElement)) return;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
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
    <section class="viewer" :aria-label="t('ui.viewerArea')">
      <iframe
        v-for="frame in openedFrames"
        class="site-frame"
        :key="frame.url"
        :title="frame.title || t('ui.frameTitle')"
        :src="frame.url"
        v-show="frame.url === frameUrl"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer-when-downgrade"
        allow="clipboard-read; clipboard-write"
      ></iframe>
      <div v-if="!openedFrames.length" class="empty-view">
        {{ t('ui.noPageOpen') }}
      </div>
    </section>

    <nav class="right-sidebar" :aria-label="t('ui.quickSidebar')">
      <div class="quick-menu" role="tablist" :aria-label="t('ui.quickSites')" @wheel.prevent="handleMenuWheel">
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
      <button class="manage-toggle" :title="t('ui.manageNav')" @click="isManageOpen = !isManageOpen">⚙️</button>
    </nav>

    <div v-if="shouldShowOpenTabs" class="open-tabs" :aria-label="t('ui.openPages')">
      <button
        v-for="frame in openedFrames"
        :key="frame.url"
        class="open-tab"
        :class="{ 'is-active': frame.url === frameUrl, 'is-temporary': frame.temporary }"
        :title="frame.title || frame.url"
        type="button"
        @click="openFrame(frame.url, { title: frame.title, temporary: frame.temporary })"
      >
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

    <section class="manage-panel" :aria-label="t('ui.managePanel')" v-show="isManageOpen">
      <h2>{{ t('ui.manageQuickSites') }}</h2>
      <form class="site-form" @submit.prevent="upsertSite">
        <input v-model="form.name" type="text" :placeholder="t('ui.inputName')" required />
        <input
          v-model="form.icon"
          type="text"
          :placeholder="t('ui.inputIcon')"
          required
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
