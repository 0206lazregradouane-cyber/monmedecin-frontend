// =========================================================
// MON MÉDECIN - NAVIGATION MANAGER (VERSION UNIFIÉE)
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
  const { getRoleHome, getRoleLabel, escapeHTML } = Helpers;
  const { ROLES } = Constants;

  class NavigationManager {
    constructor() {
      this.app = null;
      this.initialized = false;
      this.navElements = [];
      this.backButtons = [];
      this.navMap = this.getNavMap();
      console.log('✅ NavigationManager initialized');
    }

    // =========================================================
    // خريطة التنقل
    // =========================================================

    getNavMap() {
      return {
        // ===== المريض =====
        'patient-home': { route: '/patient/home', icon: '⌂', label: 'الرئيسية' },
        'patient-search': { route: '/patient/search', icon: '⌕', label: 'البحث' },
        'patient-appointments': { route: '/patient/appointments', icon: '◷', label: 'حجوزاتي' },
        'patient-favorites': { route: '/patient/favorites', icon: '❤️', label: 'المفضلة' },
        'patient-profile': { route: '/patient/profile', icon: '👤', label: 'حسابي' },
        'patient-booking': { route: '/patient/booking', icon: '📅', label: 'حجز' },
        'patient-notifications': { route: '/patient/notifications', icon: '🔔', label: 'الإشعارات' },

        // ===== الطبيب =====
        'doctor-dashboard': { route: '/doctor/dashboard', icon: '⌂', label: 'الرئيسية' },
        'doctor-appointments': { route: '/doctor/appointments', icon: '◷', label: 'المواعيد' },
        'doctor-schedule': { route: '/doctor/schedule', icon: '▦', label: 'الجدول' },
        'doctor-services': { route: '/doctor/services', icon: '⚕', label: 'الخدمات' },
        'doctor-secretary': { route: '/doctor/secretary', icon: '👤', label: 'السكرتارية' },
        'doctor-patients': { route: '/doctor/patients', icon: '👥', label: 'المرضى' },
        'doctor-account': { route: '/doctor/account', icon: '⚙', label: 'حسابي' },
        'doctor-profile': { route: '/doctor/profile', icon: '👤', label: 'ملفي' },
        'doctor-queue': { route: '/doctor/queue', icon: '⏳', label: 'قائمة الانتظار' },
        'doctor-notifications': { route: '/doctor/notifications', icon: '🔔', label: 'الإشعارات' },

        // ===== السكرتير =====
        'secretary-dashboard': { route: '/secretary/dashboard', icon: '⌂', label: 'الرئيسية' },
        'secretary-appointments': { route: '/secretary/appointments', icon: '◷', label: 'المواعيد' },
        'secretary-queue': { route: '/secretary/queue', icon: '⏳', label: 'قائمة الانتظار' },
        'secretary-patients': { route: '/secretary/patients', icon: '👤', label: 'المرضى' },
        'secretary-schedule': { route: '/secretary/schedule', icon: '▦', label: 'الجدول' },
        'secretary-profile': { route: '/secretary/profile', icon: '⚙', label: 'حسابي' },
        'secretary-settings': { route: '/secretary/settings', icon: '⚙', label: 'الإعدادات' },
        'secretary-doctor-profile': { route: '/secretary/doctor-profile', icon: '✚', label: 'ملف الطبيب' },
        'secretary-notifications': { route: '/secretary/notifications', icon: '🔔', label: 'الإشعارات' },

        // ===== المدير =====
        'admin-dashboard': { route: '/admin/dashboard', icon: '⌂', label: 'الرئيسية' },
        'admin-doctors': { route: '/admin/doctors', icon: '✚', label: 'الأطباء' },
        'admin-patients': { route: '/admin/patients', icon: '👤', label: 'المرضى' },
        'admin-appointments': { route: '/admin/appointments', icon: '◷', label: 'الحجوزات' },
        'admin-users': { route: '/admin/users', icon: '👥', label: 'المستخدمين' },
        'admin-settings': { route: '/admin/settings', icon: '⚙', label: 'الإعدادات' },
        'admin-reports': { route: '/admin/reports', icon: '📊', label: 'التقارير' },
        'admin-complaints': { route: '/admin/complaints', icon: '⚠️', label: 'الشكاوى' },
        'admin-notifications': { route: '/admin/notifications', icon: '🔔', label: 'الإشعارات' },
        'admin-content': { route: '/admin/content', icon: '📝', label: 'المحتوى' },
        'admin-specialties': { route: '/admin/specialties', icon: '🩺', label: 'التخصصات' },
      };
    }

    // =========================================================
    // التهيئة
    // =========================================================

    init(app) {
      if (this.initialized) return;
      this.app = app;
      this.initialized = true;

      // مراقبة التغييرات في DOM لإضافة أزرار جديدة
      this.setupMutationObserver();

      // ربط الأزرار الموجودة
      this.bindAllNavButtons();
      this.bindAllBackButtons();

      console.log('✅ NavigationManager ready');
    }

    // =========================================================
    // الحصول على أزرار التنقل حسب الدور
    // =========================================================

    getNavItemsForRole(role) {
      const prefix = role + '-';
      const items = [];

      Object.keys(this.navMap).forEach(key => {
        if (key.startsWith(prefix)) {
          items.push({
            key: key,
            ...this.navMap[key],
          });
        }
      });

      return items;
    }

    // =========================================================
    // إنشاء التنقل السفلي
    // =========================================================

    createBottomNav(activeKey) {
      const role = this.app?.state?.role || 'patient';
      const items = this.getNavItemsForRole(role);

      // إذا كان هناك 4 عناصر أو أقل، استخدمها كلها
      // وإلا، اختر 4 عناصر رئيسية
      let displayItems = items;
      if (items.length > 4) {
        // اختيار العناصر الرئيسية
        const priority = [
          role + '-home',
          role + '-search',
          role + '-appointments',
          role + '-profile',
        ];

        displayItems = priority
          .map(key => {
            const item = items.find(i => i.key === key);
            if (item) {
              return { ...item, priority: true };
            }
            return null;
          })
          .filter(Boolean);

        // إذا لم يتم العثور على 4 عناصر، أضف الباقي
        if (displayItems.length < 4) {
          const remaining = items.filter(i => !displayItems.some(d => d.key === i.key));
          displayItems = [...displayItems, ...remaining.slice(0, 4 - displayItems.length)];
        }
      }

      return `
        <nav class="mobile-bottom-nav">
          ${displayItems.map(item => `
            <button
              class="mobile-bottom-nav__item ${item.key === activeKey ? 'is-active' : ''}"
              data-nav="${item.key}"
              type="button"
              aria-label="${escapeHTML(item.label)}"
            >
              <span class="mobile-bottom-nav__icon">${item.icon}</span>
              <span>${escapeHTML(item.label)}</span>
            </button>
          `).join('')}
        </nav>
      `;
    }

    // =========================================================
    // إنشاء زر الرجوع
    // =========================================================

    createBackButton(options) {
      const opts = options || {};
      const label = opts.label || 'رجوع';
      const fallback = opts.fallback || null;

      return `
        <button
          class="back-button ${opts.className || ''}"
          data-back="${fallback || ''}"
          type="button"
          aria-label="${escapeHTML(label)}"
        >
          ${opts.icon || '←'}
        </button>
      `;
    }

    // =========================================================
    // ربط جميع أزرار التنقل
    // =========================================================

    bindAllNavButtons() {
      document.querySelectorAll('[data-nav]').forEach(btn => {
        if (btn._navBound) return;
        btn._navBound = true;

        const navKey = btn.dataset.nav;
        const navItem = this.navMap[navKey];

        if (!navItem) {
          console.warn('MON MÉDECIN: Unknown nav key:', navKey);
          return;
        }

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (this.app && typeof this.app.navigate === 'function') {
            // تحديث حالة التنقل
            this.updateNavState(navKey);
            this.app.navigate(navItem.route);
          }
        });
      });
    }

    // =========================================================
    // ربط جميع أزرار الرجوع
    // =========================================================

    bindAllBackButtons() {
      document.querySelectorAll('[data-back], .back-button, [id$="Back"], [data-action="back"]').forEach(btn => {
        if (btn._backBound) return;
        btn._backBound = true;

        const fallback = btn.dataset.back || null;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (this.app && typeof this.app.back === 'function') {
            this.app.back(fallback);
          } else if (window.history.length > 1) {
            window.history.back();
          } else {
            // الرجوع إلى الصفحة الرئيسية حسب الدور
            const role = this.app?.state?.role || 'patient';
            const home = getRoleHome(role);
            if (this.app && typeof this.app.navigate === 'function') {
              this.app.navigate(home);
            }
          }
        });
      });
    }

    // =========================================================
    // تحديث حالة التنقل
    // =========================================================

    updateNavState(activeKey) {
      // تحديث جميع أزرار التنقل
      document.querySelectorAll('[data-nav]').forEach(btn => {
        const isActive = btn.dataset.nav === activeKey;
        btn.classList.toggle('is-active', isActive);
      });
    }

    // =========================================================
    // تحديث التنقل حسب المسار الحالي
    // =========================================================

    updateNavByRoute(route) {
      // البحث عن مفتاح التنقل المطابق للمسار
      let matchedKey = null;
      Object.keys(this.navMap).forEach(key => {
        if (this.navMap[key].route === route) {
          matchedKey = key;
        }
      });

      if (matchedKey) {
        this.updateNavState(matchedKey);
      }
    }

    // =========================================================
    // مراقبة التغييرات في DOM
    // =========================================================

    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;

        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            // التحقق من وجود أزرار تنقل جديدة
            if (node.matches && node.matches('[data-nav]')) {
              this.bindAllNavButtons();
              needsUpdate = true;
            }

            // التحقق من وجود أزرار رجوع جديدة
            if (node.matches && node.matches('[data-back], .back-button, [id$="Back"]')) {
              this.bindAllBackButtons();
              needsUpdate = true;
            }

            // البحث داخل العنصر المضاف
            if (node.querySelectorAll) {
              const navBtns = node.querySelectorAll('[data-nav]');
              if (navBtns.length > 0) {
                this.bindAllNavButtons();
                needsUpdate = true;
              }

              const backBtns = node.querySelectorAll('[data-back], .back-button, [id$="Back"]');
              if (backBtns.length > 0) {
                this.bindAllBackButtons();
                needsUpdate = true;
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // =========================================================
    // إنشاء تنقل سفلي ديناميكي
    // =========================================================

    renderNav(activeKey) {
      return this.createBottomNav(activeKey);
    }

    // =========================================================
    // إضافة تنقل سفلي للشاشة الحالية
    // =========================================================

    attachNavToScreen(container, activeKey) {
      if (!container) return;

      // إزالة التنقل القديم
      const oldNav = container.querySelector('.mobile-bottom-nav');
      if (oldNav) {
        oldNav.remove();
      }

      // إضافة التنقل الجديد
      const navHTML = this.createBottomNav(activeKey);
      container.insertAdjacentHTML('beforeend', navHTML);

      // ربط الأزرار الجديدة
      this.bindAllNavButtons();
    }
  }

  // =========================================================
  // إنشاء وإدارة التنقل
  // =========================================================

  const navigationManager = new NavigationManager();
  window.MonMedecinNavigation = navigationManager;
  window.NavigationManager = navigationManager;

  console.log('✅ NavigationManager loaded');

})();