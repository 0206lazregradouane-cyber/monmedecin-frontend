/* =====================================================
   MON MÉDECIN
   DOCTOR NOTIFICATIONS
   ===================================================== */

(function() {
  'use strict';

  const DoctorNotificationsScreen = {
    notifications: [],
    filteredNotifications: [],
    selectedTab: 'all',
    searchQuery: '',
    messageTimer: null,

    escapeHTML: function(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    getDoctor: function(app) {
      return app.state.doctor || app.state.user || null;
    },

    getDoctorId: function(app) {
      const doctor = this.getDoctor(app);
      return doctor?.id || doctor?.doctor_id || null;
    },

    getNotifications: function() {
      if (!window.MonMedecinNotificationService) return [];
      const userId = this.getDoctorId(this.app);
      return window.MonMedecinNotificationService.getNotifications(userId);
    },

    getUnreadCount: function() {
      if (!window.MonMedecinNotificationService) return 0;
      const userId = this.getDoctorId(this.app);
      return window.MonMedecinNotificationService.getUnreadCount(userId);
    },

    loadNotifications: function() {
      this.notifications = this.getNotifications();
      this.applyFilters();
      return this.notifications;
    },

    applyFilters: function() {
      const tab = this.selectedTab;
      const query = this.searchQuery.toLowerCase().trim();

      this.filteredNotifications = this.notifications.filter(function(n) {
        if (tab !== 'all' && n.type !== tab) return false;
        if (query) {
          const searchable = [n.title, n.message, n.type].join(' ').toLowerCase();
          if (!searchable.includes(query)) return false;
        }
        return true;
      });

      return this.filteredNotifications;
    },

    markAsRead: function(id) {
      if (!window.MonMedecinNotificationService) return;
      window.MonMedecinNotificationService.markAsRead(id);
      this.loadNotifications();
      this.refresh();
    },

    markAllAsRead: function() {
      if (!window.MonMedecinNotificationService) return;
      const userId = this.getDoctorId(this.app);
      window.MonMedecinNotificationService.markAllAsRead(userId);
      this.loadNotifications();
      this.refresh();
    },

    deleteNotification: function(id) {
      if (!window.MonMedecinNotificationService) return;
      window.MonMedecinNotificationService.deleteNotification(id);
      this.loadNotifications();
      this.refresh();
    },

    clearAll: function() {
      if (!window.MonMedecinNotificationService) return;
      const userId = this.getDoctorId(this.app);
      if (!window.confirm('هل تريد حذف جميع الإشعارات؟')) return;
      window.MonMedecinNotificationService.clearAll(userId);
      this.loadNotifications();
      this.refresh();
    },

    getStats: function() {
      const total = this.notifications.length;
      const unread = this.notifications.filter(function(n) { return !n.read; }).length;
      const appointment = this.notifications.filter(function(n) { return n.type === 'appointment'; }).length;
      const system = this.notifications.filter(function(n) { return n.type === 'system'; }).length;

      return { total: total, unread: unread, appointment: appointment, system: system };
    },

    getTimeAgo: function(dateValue) {
      if (!dateValue) return '—';
      const date = new Date(dateValue);
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);
      if (diff < 60) return 'الآن';
      if (diff < 3600) return Math.floor(diff / 60) + ' دقيقة';
      if (diff < 86400) return Math.floor(diff / 3600) + ' ساعة';
      if (diff < 604800) return Math.floor(diff / 86400) + ' يوم';
      if (diff < 2592000) return Math.floor(diff / 604800) + ' أسبوع';
      if (diff < 31536000) return Math.floor(diff / 2592000) + ' شهر';
      return Math.floor(diff / 31536000) + ' سنة';
    },

    getTypeLabel: function(type) {
      const labels = { appointment: 'موعد', reminder: 'تذكير', system: 'نظام', complaint: 'شكوى' };
      return labels[type] || type || 'إشعار';
    },

    getTypeIcon: function(type) {
      const icons = { appointment: '📅', reminder: '⏰', system: '🔔', complaint: '⚠️' };
      return icons[type] || '🔔';
    },

    render: function(state, app) {
      this.app = app;
      this.loadNotifications();

      const stats = this.getStats();
      const isMobile = state.deviceMode === 'mobile';

      return `
        <main class="doctor-notifications ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="doctor-notifications__orb doctor-notifications__orb--blue"></div>
          <div class="doctor-notifications__orb doctor-notifications__orb--cyan"></div>

          <header class="doctor-notifications__header">
            <button id="doctorNotificationsBack" class="doctor-notifications__back" type="button">→</button>
            <div class="doctor-notifications__header-copy">
              <strong>الإشعارات</strong>
              <span>مركز التنبيهات</span>
            </div>
            <button id="doctorNotificationsTheme" class="doctor-notifications__theme" type="button">${state.theme === 'dark' ? '☀' : '◐'}</button>
          </header>

          <section class="doctor-notifications__container">

            <section class="doctor-notifications__hero">
              <span>🔔</span>
              <h1>الإشعارات</h1>
              <p>متابعة طلبات الحجز وتحديثات مواعيدك.</p>
            </section>

            <section class="doctor-notifications-stats">
              <article class="doctor-notifications-stat glass is-total"><span>الكل</span><strong>${stats.total}</strong></article>
              <article class="doctor-notifications-stat glass is-unread"><span>غير مقروءة</span><strong>${stats.unread}</strong></article>
              <article class="doctor-notifications-stat glass is-appointment"><span>طلبات حجز</span><strong>${stats.appointment}</strong></article>
              <article class="doctor-notifications-stat glass is-system"><span>نظام</span><strong>${stats.system}</strong></article>
            </section>

            <div class="doctor-notifications-tabs">
              <button class="doctor-notifications-tab ${this.selectedTab === 'all' ? 'is-active' : ''}" data-tab="all" type="button">الكل <span class="badge">${stats.total}</span></button>
              <button class="doctor-notifications-tab ${this.selectedTab === 'appointment' ? 'is-active' : ''}" data-tab="appointment" type="button">📅 طلبات حجز <span class="badge">${stats.appointment}</span></button>
              <button class="doctor-notifications-tab ${this.selectedTab === 'system' ? 'is-active' : ''}" data-tab="system" type="button">🔔 نظام <span class="badge">${stats.system}</span></button>
            </div>

            <section class="doctor-notifications-toolbar glass">
              <div class="doctor-notifications-search">
                <span>🔎</span>
                <input id="doctorNotificationsSearch" type="search" placeholder="ابحث في الإشعارات..." value="${this.escapeHTML(this.searchQuery)}">
              </div>
              <div>
                <button id="doctorNotificationsMarkAll" type="button">تحديد الكل مقروء</button>
                <button id="doctorNotificationsClearAll" type="button">حذف الكل</button>
              </div>
            </section>

            <div id="doctorNotificationsMessage" class="doctor-notifications-message" hidden></div>

            <section id="doctorNotificationsList" class="doctor-notifications-list">
              ${this.renderNotifications()}
            </section>

          </section>

          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span><span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span><span>المواعيد</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="notifications" type="button">
                <span class="mobile-bottom-nav__icon">🔔</span><span>الإشعارات</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="account" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span><span>حسابي</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    renderNotifications: function() {
      if (this.filteredNotifications.length === 0) {
        return `
          <section class="doctor-notifications-empty glass">
            <span>🔔</span>
            <h3>${this.notifications.length === 0 ? 'لا توجد إشعارات' : 'لا توجد نتائج مطابقة'}</h3>
            <p>${this.notifications.length === 0 ? 'ستظهر الإشعارات هنا عند استلامها.' : 'لم نجد إشعارات مطابقة للفلاتر الحالية.'}</p>
          </section>
        `;
      }

      return this.filteredNotifications.map(function(n) {
        return DoctorNotificationsScreen.renderNotification(n);
      }).join('');
    },

    renderNotification: function(notification) {
      const isRead = notification.read;
      const icon = notification.icon || DoctorNotificationsScreen.getTypeIcon(notification.type);
      const typeLabel = DoctorNotificationsScreen.getTypeLabel(notification.type);
      const timeAgo = DoctorNotificationsScreen.getTimeAgo(notification.createdAt);

      return `
        <article class="doctor-notification-item glass ${isRead ? 'is-read' : 'is-unread'}" data-id="${notification.id}">
          <div class="doctor-notification-item__icon" style="color:${notification.color || '#4274d9'}">${icon}</div>
          <div class="doctor-notification-item__content">
            <div class="doctor-notification-item__top">
              <strong>${DoctorNotificationsScreen.escapeHTML(notification.title)}</strong>
              <span class="type-badge is-${notification.type}">${typeLabel}</span>
            </div>
            <p>${DoctorNotificationsScreen.escapeHTML(notification.message)}</p>
            <div class="doctor-notification-item__meta">
              <small>${timeAgo}</small>
              ${!isRead ? `<span class="unread-dot">● جديد</span>` : ''}
            </div>
          </div>
          <div class="doctor-notification-item__actions">
            ${!isRead ? `<button class="is-mark-read" data-id="${notification.id}" type="button" title="تحديد كمقروء">✓</button>` : ''}
            <button class="is-delete" data-id="${notification.id}" type="button" title="حذف">✕</button>
          </div>
        </article>
      `;
    },

    refresh: function() {
      const list = document.getElementById('doctorNotificationsList');
      if (list) {
        list.innerHTML = this.renderNotifications();
      }
    },

    init: function(app) {
      this.app = app;

      document.getElementById('doctorNotificationsBack')?.addEventListener('click', function() {
        app.navigate('/doctor/dashboard');
      });

      document.getElementById('doctorNotificationsTheme')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      document.querySelectorAll('.doctor-notifications-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          DoctorNotificationsScreen.selectedTab = this.dataset.tab;
          document.querySelectorAll('.doctor-notifications-tab').forEach(function(t) {
            t.classList.toggle('is-active', t === tab);
          });
          DoctorNotificationsScreen.loadNotifications();
          DoctorNotificationsScreen.refresh();
        });
      });

      document.getElementById('doctorNotificationsSearch')?.addEventListener('input', function(event) {
        DoctorNotificationsScreen.searchQuery = event.target.value;
        DoctorNotificationsScreen.applyFilters();
        DoctorNotificationsScreen.refresh();
      });

      document.getElementById('doctorNotificationsMarkAll')?.addEventListener('click', function() {
        DoctorNotificationsScreen.markAllAsRead();
      });

      document.getElementById('doctorNotificationsClearAll')?.addEventListener('click', function() {
        DoctorNotificationsScreen.clearAll();
      });

      document.getElementById('doctorNotificationsList')?.addEventListener('click', function(event) {
        const markRead = event.target.closest('.is-mark-read');
        if (markRead) {
          DoctorNotificationsScreen.markAsRead(markRead.dataset.id);
          return;
        }

        const remove = event.target.closest('.is-delete');
        if (remove) {
          DoctorNotificationsScreen.deleteNotification(remove.dataset.id);
          return;
        }

        const item = event.target.closest('.doctor-notification-item');
        if (item) {
          const id = item.dataset.id;
          const notification = DoctorNotificationsScreen.filteredNotifications.find(function(n) {
            return n.id === id;
          });
          if (!notification) return;

          if (!notification.read) {
            DoctorNotificationsScreen.markAsRead(id);
          }

          if (notification.action && notification.action.route) {
            app.navigate(notification.action.route);
          }
        }
      });

      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function(btn) {
        btn.addEventListener('click', function() { app.navigate('/doctor/dashboard'); });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function(btn) {
        btn.addEventListener('click', function() { app.navigate('/doctor/appointments'); });
      });
      document.querySelectorAll("[data-nav='notifications']")?.forEach(function(btn) {
        btn.addEventListener('click', function() { app.navigate('/doctor/notifications'); });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function(btn) {
        btn.addEventListener('click', function() { app.navigate('/doctor/account'); });
      });
    }
  };

  window.DoctorNotificationsScreen = DoctorNotificationsScreen;

})();