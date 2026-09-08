/* =====================================================
   MON MÉDECIN
   PATIENT NOTIFICATIONS - COMPLETE
   ===================================================== */

(function() {
  'use strict';

  const PatientNotificationsScreen = {
    /* ==================================================
       STATE
       ================================================== */

    notifications: [],
    filteredNotifications: [],
    selectedTab: 'all',
    searchQuery: '',
    selectedNotificationId: null,
    messageTimer: null,
    app: null,

    /* ==================================================
       ESCAPE
       ================================================== */

    escapeHTML: function(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /* ==================================================
       USER HELPERS
       ================================================== */

    getPatient: function(app) {
      return app.state.patient || app.state.user || null;
    },

    getPatientId: function(app) {
      const patient = this.getPatient(app);
      return patient?.id || patient?.patient_id || null;
    },

    getPatientName: function(app) {
      const patient = this.getPatient(app);
      return patient?.fullName || patient?.name || 'المريض';
    },

    /* ==================================================
       NOTIFICATIONS
       ================================================== */

    getNotifications: function() {
      if (!window.MonMedecinNotificationService) return [];
      const userId = this.getPatientId(this.app);
      return window.MonMedecinNotificationService.getNotifications(userId);
    },

    getUnreadCount: function() {
      if (!window.MonMedecinNotificationService) return 0;
      const userId = this.getPatientId(this.app);
      return window.MonMedecinNotificationService.getUnreadCount(userId);
    },

    loadNotifications: function() {
      this.notifications = this.getNotifications();
      this.applyFilters();
      return this.notifications;
    },

    /* ==================================================
       FILTERS
       ================================================== */

    applyFilters: function() {
      const tab = this.selectedTab;
      const query = this.searchQuery.toLowerCase().trim();

      this.filteredNotifications = this.notifications.filter(function(n) {
        // Tab filter
        if (tab !== 'all' && n.type !== tab) {
          return false;
        }

        // Search query
        if (query) {
          const searchable = [
            n.title,
            n.message,
            n.type
          ].join(' ').toLowerCase();
          if (!searchable.includes(query)) {
            return false;
          }
        }

        return true;
      });

      return this.filteredNotifications;
    },

    /* ==================================================
       ACTIONS
       ================================================== */

    markAsRead: function(id) {
      if (!window.MonMedecinNotificationService) return;
      window.MonMedecinNotificationService.markAsRead(id);
      this.loadNotifications();
      this.refresh();
      this.updateBell();
    },

    markAllAsRead: function() {
      if (!window.MonMedecinNotificationService) return;
      const userId = this.getPatientId(this.app);
      window.MonMedecinNotificationService.markAllAsRead(userId);
      this.loadNotifications();
      this.refresh();
      this.updateBell();
      this.showMessage('تم تحديد جميع الإشعارات كمقروءة.', 'success');
    },

    deleteNotification: function(id) {
      if (!window.MonMedecinNotificationService) return;
      window.MonMedecinNotificationService.deleteNotification(id);
      this.loadNotifications();
      this.refresh();
      this.updateBell();
    },

    clearAll: function() {
      if (!window.MonMedecinNotificationService) return;
      const userId = this.getPatientId(this.app);
      if (!window.confirm('هل تريد حذف جميع الإشعارات نهائياً؟')) return;
      window.MonMedecinNotificationService.clearAll(userId);
      this.loadNotifications();
      this.refresh();
      this.updateBell();
      this.showMessage('تم حذف جميع الإشعارات.', 'success');
    },

    /* ==================================================
       STATS
       ================================================== */

    getStats: function() {
      const total = this.notifications.length;
      const unread = this.notifications.filter(function(n) { return !n.read; }).length;
      const read = total - unread;
      const appointment = this.notifications.filter(function(n) { return n.type === 'appointment'; }).length;
      const reminder = this.notifications.filter(function(n) { return n.type === 'reminder'; }).length;
      const system = this.notifications.filter(function(n) { return n.type === 'system'; }).length;

      return {
        total: total,
        unread: unread,
        read: read,
        appointment: appointment,
        reminder: reminder,
        system: system
      };
    },

    /* ==================================================
       FORMAT
       ================================================== */

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
      const labels = {
        appointment: 'موعد',
        reminder: 'تذكير',
        system: 'نظام',
        complaint: 'شكوى',
        user: 'مستخدم'
      };
      return labels[type] || type || 'إشعار';
    },

    getTypeIcon: function(type) {
      const icons = {
        appointment: '📅',
        reminder: '⏰',
        system: '🔔',
        complaint: '⚠️',
        user: '👤'
      };
      return icons[type] || '🔔';
    },

    getTypeColor: function(type) {
      const colors = {
        appointment: '#4274d9',
        reminder: '#e9b341',
        system: '#6c7480',
        complaint: '#b34d4d',
        user: '#25815b'
      };
      return colors[type] || '#4274d9';
    },

    getStatusLabel: function(notification) {
      if (notification.read) return 'مقروء';
      return 'غير مقروء';
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function(message, type) {
      const element = document.getElementById('patientNotificationsMessage');
      if (!element) {
        if (type === 'error') alert('❌ ' + message);
        else if (type === 'success') alert('✅ ' + message);
        else alert('ℹ️ ' + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = 'patient-notifications-message';
      element.classList.add(type === 'success' ? 'is-success' : type === 'info' ? 'is-info' : 'is-error');

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function() {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3500);
    },

    /* ==================================================
       UPDATE BELL
       ================================================== */

    updateBell: function() {
      const bell = document.querySelector('.notification-bell');
      const count = document.getElementById('notificationCount');
      if (!bell) return;

      const unread = this.getUnreadCount();
      if (unread > 0) {
        const displayCount = unread > 9 ? '9+' : unread;
        if (count) {
          count.textContent = displayCount;
          count.style.display = 'inline-flex';
        } else {
          const newCount = document.createElement('span');
          newCount.className = 'notification-bell__count';
          newCount.id = 'notificationCount';
          newCount.textContent = displayCount;
          bell.appendChild(newCount);
        }
      } else {
        if (count) {
          count.style.display = 'none';
        }
      }
    },

    /* ==================================================
       NAVIGATION
       ================================================== */

    navigateToAction: function(notification) {
      if (!notification || !notification.action || !notification.action.route) return;
      if (!this.app) return;

      // Mark as read if unread
      if (!notification.read) {
        this.markAsRead(notification.id);
      }

      this.app.navigate(notification.action.route);
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function(state, app) {
      this.app = app;
      this.loadNotifications();

      const stats = this.getStats();
      const patientName = this.getPatientName(app);
      const isMobile = state.deviceMode === 'mobile';

      return `
        <main class="patient-notifications ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="patient-notifications__orb patient-notifications__orb--blue"></div>
          <div class="patient-notifications__orb patient-notifications__orb--cyan"></div>

          <header class="patient-notifications__header">
            <button id="patientNotificationsBack" class="patient-notifications__back" type="button">→</button>
            <div class="patient-notifications__header-copy">
              <strong>الإشعارات</strong>
              <span>مركز التنبيهات</span>
            </div>
            <button id="patientNotificationsTheme" class="patient-notifications__theme" type="button">${state.theme === 'dark' ? '☀' : '◐'}</button>
          </header>

          <section class="patient-notifications__container">

            <section class="patient-notifications__hero">
              <span>🔔</span>
              <h1>الإشعارات</h1>
              <p>متابعة جميع التنبيهات المتعلقة بحجوزاتك وتذكيراتك الصحية.</p>
            </section>

            <section class="patient-notifications-user glass">
              <div class="patient-notifications-user__avatar">
                ${this.escapeHTML(String(patientName).charAt(0))}
              </div>
              <div>
                <span>مرحباً</span>
                <strong>${this.escapeHTML(patientName)}</strong>
              </div>
            </section>

            <section class="patient-notifications-stats">
              <article class="patient-notifications-stat glass is-total">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="patient-notifications-stat glass is-unread">
                <span>غير مقروءة</span>
                <strong>${stats.unread}</strong>
              </article>
              <article class="patient-notifications-stat glass is-appointment">
                <span>مواعيد</span>
                <strong>${stats.appointment}</strong>
              </article>
              <article class="patient-notifications-stat glass is-reminder">
                <span>تذكيرات</span>
                <strong>${stats.reminder}</strong>
              </article>
            </section>

            <div class="patient-notifications-tabs">
              <button class="patient-notifications-tab ${this.selectedTab === 'all' ? 'is-active' : ''}" data-tab="all" type="button">
                الكل <span class="badge">${stats.total}</span>
              </button>
              <button class="patient-notifications-tab ${this.selectedTab === 'appointment' ? 'is-active' : ''}" data-tab="appointment" type="button">
                📅 مواعيد <span class="badge">${stats.appointment}</span>
              </button>
              <button class="patient-notifications-tab ${this.selectedTab === 'reminder' ? 'is-active' : ''}" data-tab="reminder" type="button">
                ⏰ تذكيرات <span class="badge">${stats.reminder}</span>
              </button>
              <button class="patient-notifications-tab ${this.selectedTab === 'system' ? 'is-active' : ''}" data-tab="system" type="button">
                🔔 نظام <span class="badge">${stats.system}</span>
              </button>
            </div>

            <section class="patient-notifications-toolbar glass">
              <div class="patient-notifications-search">
                <span>🔎</span>
                <input id="patientNotificationsSearch" type="search" placeholder="ابحث في الإشعارات..." value="${this.escapeHTML(this.searchQuery)}" autocomplete="off">
              </div>
              <div class="patient-notifications-actions">
                <button id="patientNotificationsMarkAll" type="button">✅ تحديد الكل مقروء</button>
                <button id="patientNotificationsClearAll" type="button">🗑 حذف الكل</button>
              </div>
            </section>

            <div id="patientNotificationsMessage" class="patient-notifications-message" hidden></div>

            <section id="patientNotificationsList" class="patient-notifications-list">
              ${this.renderNotifications()}
            </section>

          </section>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="home" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="search" type="button">
                <span class="mobile-bottom-nav__icon">⌕</span>
                <span>البحث</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="notifications" type="button">
                <span class="mobile-bottom-nav__icon">🔔</span>
                <span>الإشعارات</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="profile" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>حسابي</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    /* ==================================================
       RENDER NOTIFICATIONS
       ================================================== */

    renderNotifications: function() {
      if (this.filteredNotifications.length === 0) {
        const hasNotifications = this.notifications.length > 0;
        return `
          <section class="patient-notifications-empty glass">
            <span>🔔</span>
            <h3>${hasNotifications ? 'لا توجد نتائج مطابقة' : 'لا توجد إشعارات'}</h3>
            <p>${hasNotifications ? 'لم نجد إشعارات مطابقة للفلاتر الحالية.' : 'ستظهر الإشعارات هنا عند استلامها.'}</p>
            ${!hasNotifications ? `
              <button id="patientNotificationsGoSearch" type="button">🔍 ابحث عن طبيب</button>
            ` : ''}
          </section>
        `;
      }

      return this.filteredNotifications.map(function(n) {
        return PatientNotificationsScreen.renderNotification(n);
      }).join('');
    },

    /* ==================================================
       RENDER NOTIFICATION
       ================================================== */

    renderNotification: function(notification) {
      const isRead = notification.read;
      const icon = notification.icon || PatientNotificationsScreen.getTypeIcon(notification.type);
      const typeLabel = PatientNotificationsScreen.getTypeLabel(notification.type);
      const timeAgo = PatientNotificationsScreen.getTimeAgo(notification.createdAt);
      const color = notification.color || PatientNotificationsScreen.getTypeColor(notification.type);

      return `
        <article class="patient-notification-item glass ${isRead ? 'is-read' : 'is-unread'}" data-id="${notification.id}">
          <div class="patient-notification-item__icon" style="color:${color}">
            ${icon}
          </div>
          <div class="patient-notification-item__content">
            <div class="patient-notification-item__top">
              <strong>${PatientNotificationsScreen.escapeHTML(notification.title)}</strong>
              <span class="type-badge is-${notification.type}">${typeLabel}</span>
            </div>
            <p>${PatientNotificationsScreen.escapeHTML(notification.message)}</p>
            <div class="patient-notification-item__meta">
              <small>${timeAgo}</small>
              ${!isRead ? `<span class="unread-dot">● جديد</span>` : ''}
              ${notification.action ? `<span class="action-hint">انقر للانتقال</span>` : ''}
              ${notification.relatedId ? `<span class="related-hint">#${PatientNotificationsScreen.escapeHTML(notification.relatedId)}</span>` : ''}
            </div>
          </div>
          <div class="patient-notification-item__actions">
            ${!isRead ? `
              <button class="is-mark-read" data-id="${notification.id}" type="button" title="تحديد كمقروء">✓</button>
            ` : ''}
            <button class="is-delete" data-id="${notification.id}" type="button" title="حذف">✕</button>
          </div>
        </article>
      `;
    },

    /* ==================================================
       REFRESH
       ================================================== */

    refresh: function() {
      const list = document.getElementById('patientNotificationsList');
      if (list) {
        list.innerHTML = this.renderNotifications();
      }

      // Update counts in tabs
      const stats = this.getStats();
      const tabs = document.querySelectorAll('.patient-notifications-tab');
      tabs.forEach(function(tab) {
        const tabName = tab.dataset.tab;
        const badge = tab.querySelector('.badge');
        if (!badge) return;
        if (tabName === 'all') badge.textContent = stats.total;
        else if (tabName === 'appointment') badge.textContent = stats.appointment;
        else if (tabName === 'reminder') badge.textContent = stats.reminder;
        else if (tabName === 'system') badge.textContent = stats.system;
      });
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function(app) {
      this.app = app;

      // BACK
      document.getElementById('patientNotificationsBack')?.addEventListener('click', function() {
        app.navigate('/patient/home');
      });

      // THEME
      document.getElementById('patientNotificationsTheme')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      // TABS
      document.querySelectorAll('.patient-notifications-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          PatientNotificationsScreen.selectedTab = this.dataset.tab;
          document.querySelectorAll('.patient-notifications-tab').forEach(function(t) {
            t.classList.toggle('is-active', t === tab);
          });
          PatientNotificationsScreen.loadNotifications();
          PatientNotificationsScreen.refresh();
        });
      });

      // SEARCH
      document.getElementById('patientNotificationsSearch')?.addEventListener('input', function(event) {
        PatientNotificationsScreen.searchQuery = event.target.value;
        PatientNotificationsScreen.applyFilters();
        PatientNotificationsScreen.refresh();
      });

      // MARK ALL
      document.getElementById('patientNotificationsMarkAll')?.addEventListener('click', function() {
        PatientNotificationsScreen.markAllAsRead();
      });

      // CLEAR ALL
      document.getElementById('patientNotificationsClearAll')?.addEventListener('click', function() {
        PatientNotificationsScreen.clearAll();
      });

      // GO SEARCH (from empty state)
      document.getElementById('patientNotificationsGoSearch')?.addEventListener('click', function() {
        app.navigate('/patient/search');
      });

      // LIST EVENTS
      document.getElementById('patientNotificationsList')?.addEventListener('click', function(event) {
        const markRead = event.target.closest('.is-mark-read');
        if (markRead) {
          PatientNotificationsScreen.markAsRead(markRead.dataset.id);
          return;
        }

        const remove = event.target.closest('.is-delete');
        if (remove) {
          const confirmed = window.confirm('هل تريد حذف هذا الإشعار؟');
          if (confirmed) {
            PatientNotificationsScreen.deleteNotification(remove.dataset.id);
          }
          return;
        }

        const item = event.target.closest('.patient-notification-item');
        if (item) {
          const id = item.dataset.id;
          const notification = PatientNotificationsScreen.filteredNotifications.find(function(n) {
            return n.id === id;
          });
          if (notification) {
            PatientNotificationsScreen.navigateToAction(notification);
          }
        }
      });

      // BOTTOM NAV
      document.querySelectorAll("[data-nav='home']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/home');
        });
      });
      document.querySelectorAll("[data-nav='search']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/search');
        });
      });
      document.querySelectorAll("[data-nav='notifications']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/notifications');
        });
      });
      document.querySelectorAll("[data-nav='profile']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/profile');
        });
      });

      // Update bell count
      this.updateBell();
    }
  };

  // ====================================================
  // EXPOSE
  // ====================================================

  window.PatientNotificationsScreen = PatientNotificationsScreen;
  window.PatientNotifications = PatientNotificationsScreen;

})();