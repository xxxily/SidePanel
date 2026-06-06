import { createI18n } from 'vue-i18n';

const messages = {
  zh: {
    ui: {
      viewerArea: '网页浏览区域',
      frameTitle: '网页显示区域',
      quickSidebar: '快捷导航侧栏',
      quickSites: '快捷网页',
      manageNav: '管理导航',
      managePanel: '导航管理',
      manageQuickSites: '管理快捷网页',
      inputName: '名称，例如 GitHub',
      inputIcon: '图标：单个汉字 / 单个 emoji / 图片链接',
      inputUrl: '网址，例如 https://github.com',
      save: '保存修改',
      add: '新增',
      cancel: '取消编辑',
      edit: '编辑',
      remove: '删除',
      openPages: '已打开页面',
      closePage: '关闭页面',
      noPageOpen: '暂无打开页面',
      iconAlt: '{name} 图标',
      invalidUrl: '请输入正确的网址，例如 https://example.com'
    }
  },
  en: {
    ui: {
      viewerArea: 'Web viewing area',
      frameTitle: 'Website display area',
      quickSidebar: 'Quick navigation sidebar',
      quickSites: 'Quick websites',
      manageNav: 'Manage navigation',
      managePanel: 'Navigation management',
      manageQuickSites: 'Manage quick websites',
      inputName: 'Name, e.g. GitHub',
      inputIcon: 'Icon: one character / one emoji / image URL',
      inputUrl: 'URL, e.g. https://github.com',
      save: 'Save',
      add: 'Add',
      cancel: 'Cancel',
      edit: 'Edit',
      remove: 'Delete',
      openPages: 'Open pages',
      closePage: 'Close page',
      noPageOpen: 'No page open',
      iconAlt: '{name} icon',
      invalidUrl: 'Please enter a valid URL, e.g. https://example.com'
    }
  }
};

const fallbackLocale = 'en';
const browserLanguage = navigator.language?.toLowerCase() || fallbackLocale;
const locale = browserLanguage.startsWith('zh') ? 'zh' : 'en';

export const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale,
  messages
});
