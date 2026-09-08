// =========================================================
// MON MÉDECIN - THEME MANAGER (VERSION UNIFIÉE)
// =========================================================

(function() {
  'use strict';

  // التحقق من وجود التبعيات
  if (!window.MonMedecinHelpers) {
    console.error('❌ MonMedecinHelpers not loaded!');
    return;
  }

  if (!window.MonMedecinConstants) {
    console.error('❌ MonMedecinConstants not loaded!');
    return;
  }

  const Helpers = window.MonMedecinHelpers;
  const Constants = window.MonMedecinConstants;
  const { readJSON, writeJSON, removeStorage } = Helpers;
  const { STORAGE_KEYS } = Constants;

  class ThemeManager {
    constructor() {
      this.currentTheme = 'light';
      this.listeners = [];
      this._initialized = false;
      this._observer = null;
      console.log('✅ ThemeManager initialized');
    }

    // =========================================================
    // التهيئة
    // =========================================================

    init() {
      if (this._initialized) return;
      this._initialized = true;

      this.loadTheme();
      this.applyTheme();
      this.setupSystemListener();
      this.setupMutationObserver();

      console.log('✅ ThemeManager ready');
    }

    // =========================================================
    // تحميل المظهر
    // =========================================================

    loadTheme() {
      try {
        const stored = readJSON(localStorage, STORAGE_KEYS.THEME, 'light');
        this.currentTheme = (stored === 'dark' || stored === 'light') ? stored : 'light';
      } catch (error) {
        this.currentTheme = 'light';
      }
      return this.currentTheme;
    }

    // =========================================================
    // حفظ المظهر
    // =========================================================

    saveTheme(theme) {
      try {
        writeJSON(localStorage, STORAGE_KEYS.THEME, theme);
        writeJSON(localStorage, STORAGE_KEYS.THEME_USER_CHOSEN, 'true');
        this.currentTheme = theme;
        return true;
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot save theme', error);
        return false;
      }
    }

    // =========================================================
    // تطبيق المظهر
    // =========================================================

    applyTheme() {
      // تعيين السمة على عنصر html
      document.documentElement.setAttribute('data-theme', this.currentTheme);

      // إضافة/إزالة الكلاس على body
      document.body.classList.toggle('dark', this.currentTheme === 'dark');

      // تحديث جميع أزرار المظهر
      this.updateAllThemeButtons();

      // إعلام المستمعين
      this.notifyListeners(this.currentTheme);

      return this;
    }

    // =========================================================
    // تبديل المظهر
    // =========================================================

    toggle() {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.saveTheme(newTheme);
      this.applyTheme();
      return newTheme;
    }

    // =========================================================
    // تعيين المظهر
    // =========================================================

    setTheme(theme) {
      if (theme !== 'dark' && theme !== 'light') return;
      if (theme === this.currentTheme) return;

      this.saveTheme(theme);
      this.applyTheme();
    }

    // =========================================================
    // الحصول على المظهر
    // =========================================================

    getTheme() {
      return this.currentTheme;
    }

    isDark() {
      return this.currentTheme === 'dark';
    }

    isLight() {
      return this.currentTheme === 'light';
    }

    // =========================================================
    // مراقبة تفضيلات النظام
    // =========================================================

    setupSystemListener() {
      if (!window.matchMedia) return;

      const media = window.matchMedia('(prefers-color-scheme: dark)');

      // إذا لم يختر المستخدم يدوياً، استخدم تفضيل النظام
      const hasUserChosen = readJSON(localStorage, STORAGE_KEYS.THEME_USER_CHOSEN, false);
      if (!hasUserChosen) {
        this.setTheme(media.matches ? 'dark' : 'light');
      }

      // مراقبة التغييرات في تفضيل النظام
      media.addEventListener('change', (e) => {
        const userChosen = readJSON(localStorage, STORAGE_KEYS.THEME_USER_CHOSEN, false);
        if (!userChosen) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }

    // =========================================================
    // مراقبة إضافة أزرار جديدة
    // =========================================================

    setupMutationObserver() {
      if (this._observer) {
        this._observer.disconnect();
      }

      this._observer = new MutationObserver(() => {
        this.updateAllThemeButtons();
      });

      this._observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // =========================================================
    // تحديث جميع أزرار المظهر
    // =========================================================

    updateAllThemeButtons() {
      const isDark = this.isDark();

      document.querySelectorAll('.theme-toggle, [data-theme-toggle]').forEach(btn => {
        // تحديث النص
        btn.innerHTML = isDark ? '☀' : '◐';

        // تحديث التسمية
        btn.setAttribute('aria-label', isDark ? 'الوضع الفاتح' : 'الوضع الداكن');

        // تحديث الكلاس
        btn.classList.toggle('is-dark', isDark);
        btn.classList.toggle('is-light', !isDark);

        // تأكد من وجود المستمع
        if (!btn._themeBound) {
          btn._themeBound = true;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
          });
        }
      });
    }

    // =========================================================
    // إنشاء زر تبديل المظهر
    // =========================================================

    createThemeToggle(options) {
      const opts = options || {};
      const isDark = this.isDark();

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-toggle' + (opts.className ? ' ' + opts.className : '');
      button.setAttribute('data-theme-toggle', '');
      button.setAttribute('aria-label', isDark ? 'الوضع الفاتح' : 'الوضع الداكن');
      button.innerHTML = isDark ? '☀' : '◐';

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const newTheme = this.toggle();

        // تحديث الزر
        button.innerHTML = newTheme === 'dark' ? '☀' : '◐';
        button.setAttribute('aria-label', newTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن');

        // استدعاء الدالة الاختيارية
        if (typeof opts.onToggle === 'function') {
          opts.onToggle(newTheme);
        }
      });

      if (opts.container) {
        opts.container.appendChild(button);
      }

      return button;
    }

    // =========================================================
    // إنشاء زر تبديل المظهر كـ HTML
    // =========================================================

    renderThemeToggle() {
      const isDark = this.isDark();
      return `
        <button
          class="theme-toggle"
          data-theme-toggle
          type="button"
          aria-label="${isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}"
        >
          ${isDark ? '☀' : '◐'}
        </button>
      `;
    }

    // =========================================================
    // إعادة ضبط تفضيل المستخدم (استخدام تفضيل النظام)
    // =========================================================

    resetToSystemPreference() {
      removeStorage(localStorage, STORAGE_KEYS.THEME_USER_CHOSEN);

      const media = window.matchMedia('(prefers-color-scheme: dark)');
      this.setTheme(media.matches ? 'dark' : 'light');
    }

    // =========================================================
    // المستمعون
    // =========================================================

    addListener(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    removeListener(callback) {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    }

    notifyListeners(theme) {
      this.listeners.forEach(listener => {
        try {
          listener(theme);
        } catch (error) {
          console.warn('MON MÉDECIN: Theme listener error', error);
        }
      });
    }

    // =========================================================
    // الحصول على ألوان المظهر
    // =========================================================

    getColors() {
      const isDark = this.isDark();

      return {
        // الخلفيات
        bg: isDark ? '#0b1321' : '#f7f9fc',
        bgCard: isDark ? 'rgba(18, 30, 49, 0.8)' : 'rgba(255, 255, 255, 0.82)',
        bgSurface: isDark ? 'rgba(18, 30, 49, 0.92)' : 'rgba(255, 255, 255, 0.96)',
        bgInput: isDark ? 'rgba(10, 19, 32, 0.78)' : 'rgba(248, 251, 255, 0.96)',

        // النصوص
        text: isDark ? '#edf3fc' : '#15263e',
        textSecondary: isDark ? '#eef4fc' : '#172c48',
        textMuted: isDark ? '#96a8bb' : '#7c8a9c',
        textLight: isDark ? '#8495a9' : '#8996a6',

        // الحدود
        border: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(35, 66, 105, 0.06)',
        borderStrong: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(35, 66, 105, 0.12)',

        // الحالات
        success: isDark ? '#6fcf97' : '#25815b',
        error: isDark ? '#e57373' : '#b34d4d',
        warning: isDark ? '#d4a02a' : '#9d7426',
        info: isDark ? '#5a8ad9' : '#4274d9',

        // الأساسي
        primary: isDark ? '#5a8ad9' : '#4274d9',
        primaryDark: isDark ? '#4274d9' : '#345fa9',
        primaryLight: isDark ? '#7aa3e6' : '#5a8ad9',
      };
    }

    // =========================================================
    // الحصول على متغيرات CSS للمظهر
    // =========================================================

    getCSSVariables() {
      const colors = this.getColors();

      return `
        --color-bg: ${colors.bg};
        --color-bg-card: ${colors.bgCard};
        --color-bg-surface: ${colors.bgSurface};
        --color-bg-input: ${colors.bgInput};
        --color-text: ${colors.text};
        --color-text-secondary: ${colors.textSecondary};
        --color-text-muted: ${colors.textMuted};
        --color-text-light: ${colors.textLight};
        --color-border: ${colors.border};
        --color-border-strong: ${colors.borderStrong};
        --color-success: ${colors.success};
        --color-error: ${colors.error};
        --color-warning: ${colors.warning};
        --color-info: ${colors.info};
        --color-primary: ${colors.primary};
        --color-primary-dark: ${colors.primaryDark};
        --color-primary-light: ${colors.primaryLight};
      `;
    }

    // =========================================================
    // تطبيق متغيرات CSS
    // =========================================================

    applyCSSVariables() {
      const variables = this.getCSSVariables();
      const root = document.documentElement;

      // تطبيق كل متغير على حدة
      variables.split(';').forEach(declaration => {
        if (declaration.trim()) {
          const [name, value] = declaration.split(':').map(s => s.trim());
          if (name && value) {
            root.style.setProperty(name, value);
          }
        }
      });
    }
  }

  // =========================================================
  // إنشاء مدير المظهر
  // =========================================================

  const themeManager = new ThemeManager();
  window.MonMedecinTheme = themeManager;
  window.ThemeManager = themeManager;

  // =========================================================
  // التهيئة التلقائية
  // =========================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => themeManager.init());
  } else {
    themeManager.init();
  }

  console.log('✅ ThemeManager loaded');

})();