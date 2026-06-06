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
      inputIcon: '图标：单个汉字 / emoji / 图片链接，可留空',
      inputUrl: '网址，例如 https://github.com',
      save: '保存修改',
      add: '新增',
      cancel: '取消编辑',
      edit: '编辑',
      remove: '删除',
      openPages: '已打开页面',
      blankPageTitle: '空白页',
      goBack: '后退',
      goForward: '前进',
      refreshPage: '刷新',
      closePage: '关闭页面',
      noPageOpen: '暂无打开页面',
      splitLayouts: '分屏布局',
      layoutSingle: '单屏',
      layoutColumns: '左右分屏',
      layoutRows: '上下分屏',
      layoutGrid: '四宫格分屏',
      clearPane: '清空当前分屏',
      emptyPaneTitle: '空白分屏',
      emptyPane: '分屏 {number}',
      emptyPaneHint: '点击后再选择快捷网站',
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
      inputIcon: 'Icon: character / emoji / image URL, optional',
      inputUrl: 'URL, e.g. https://github.com',
      save: 'Save',
      add: 'Add',
      cancel: 'Cancel',
      edit: 'Edit',
      remove: 'Delete',
      openPages: 'Open pages',
      blankPageTitle: 'Blank page',
      goBack: 'Back',
      goForward: 'Forward',
      refreshPage: 'Refresh',
      closePage: 'Close page',
      noPageOpen: 'No page open',
      splitLayouts: 'Split layouts',
      layoutSingle: 'Single pane',
      layoutColumns: 'Side-by-side split',
      layoutRows: 'Stacked split',
      layoutGrid: 'Four-pane split',
      clearPane: 'Clear current pane',
      emptyPaneTitle: 'Empty pane',
      emptyPane: 'Pane {number}',
      emptyPaneHint: 'Select it, then choose a quick site',
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
