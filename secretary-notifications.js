/* =====================================================
   MON MÉDECIN
   SECRETARY NOTIFICATIONS - COMPLETE
   ===================================================== */

(function() {
  'use strict';

  const SecretaryNotificationsScreen = {
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

    getSecretary: function(app) {
      return app.state.secretary || app.state.user || null;
    },

    getSecretaryId: function(app) {
      const secretary = this.getSecretary(app);
      return secretary?.id || secretary?.secretary_id || null;
    },

    getDoctor: function(app) {
      if (typeof app.getSecretaryDoctor === 'function') {
        return app.getSecretaryDoctor() || null;
      }
      const secretary = this.getSecretary(app);
      const doctorId = secretary?.doctor_id || secretary?.doctorId;
      if (!doctorId) return null;
      const doctors = app.getDoctors ? app.getDoctors() : [];
      return doctors.find(function(d) {
        return String(d.id || d.doctor_id) === String(doctorId);
      }) || null;
    },

    /* ==================================================
       NOTIFICATIONS
       ================================================== */

    getNotifications: function() {
      if (!window.MonMedecinNotificationService) return [];
      const userId = this.getSecretaryId(this.app);
      return window.MonMedecinNotificationService.getNotifications(userId);
    },

    getUnreadCount: function() {
      if (!window.MonMedecinNotificationService) return 0;
      const userId = this.getSecretaryId(this.app);
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
      const userId = this.getSecretaryId(this.app);
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
      const userId = this.getSecretaryId(this.app);
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

    getStatusLabel: function(notification) {
      if (notification.read) return 'مقروء';
      return 'غير مقروء';
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function(message, type) {
      const element = document.getElementById('secretaryNotificationsMessage');
      if (!element) {
        if (type === 'error') alert('❌ ' + message);
        else if (type === 'success') alert('✅ ' + message);
        else alert('ℹ️ ' + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = 'secretary-notifications-message';
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
      const doctor = this.getDoctor(app);
      const secretary = this.getSecretary(app);
      const isMobile = state.deviceMode === 'mobile';

      const doctorName = doctor?.fullName || doctor?.name || doctor?.professional?.title || 'الطبيب';
      const secretaryName = secretary?.fullName || secretary?.name || 'السكرتير';

      return `
        <main class="secretary-notifications ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="secretary-notifications__orb secretary-notifications__orb--blue"></div>
          <div class="secretary-notifications__orb secretary-notifications__orb--cyan"></div>

          <header class="secretary-notifications__header">
            <button id="secretaryNotificationsBack" class="secretary-notifications__back" type="button">→</button>
            <div class="secretary-notifications__header-copy">
              <strong>الإشعارات</strong>
              <span>${this.escapeHTML(secretaryName)}</span>
            </div>
            <button id="secretaryNotificationsTheme" class="secretary-notifications__theme" type="button">${state.theme === 'dark' ? '☀' : '◐'}</button>
          </header>

          <section class="secretary-notifications__container">

            <section class="secretary-notifications__hero">
              <span>🔔</span>
              <h1>الإشعارات</h1>
              <p>متابعة طلبات الحجز وتحديثات المواعيد لحساب السكرتير.</p>
            </section>

            <section class="secretary-notifications-doctor glass">
              <div class="secretary-notifications-doctor__icon">⚕</div>
              <div>
                <span>الطبيب المرتبط</span>
                <strong>${this.escapeHTML(doctorName)}</strong>
              </div>
            </section>

            <section class="secretary-notifications-stats">
              <article class="secretary-notifications-stat glass is-total">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="secretary-notifications-stat glass is-unread">
                <span>غير مقروءة</span>
                <strong>${stats.unread}</strong>
              </article>
              <article class="secretary-notifications-stat glass is-appointment">
                <span>طلبات حجز</span>
                <strong>${stats.appointment}</strong>
              </article>
              <article class="secretary-notifications-stat glass is-system">
                <span>نظام</span>
                <strong>${stats.system}</strong>
              </article>
            </section>

            <div class="secretary-notifications-tabs">
              <button class="secretary-notifications-tab ${this.selectedTab === 'all' ? 'is-active' : ''}" data-tab="all" type="button">
                الكل <span class="badge">${stats.total}</span>
              </button>
              <button class="secretary-notifications-tab ${this.selectedTab === 'appointment' ? 'is-active' : ''}" data-tab="appointment" type="button">
                📅 طلبات حجز <span class="badge">${stats.appointment}</span>
              </button>
              <button class="secretary-notifications-tab ${this.selectedTab === 'reminder' ? 'is-active' : ''}" data-tab="reminder" type="button">
                ⏰ تذكيرات <span class="badge">${stats.reminder}</span>
              </button>
              <button class="secretary-notifications-tab ${this.selectedTab === 'system' ? 'is-active' : ''}" data-tab="system" type="button">
                🔔 نظام <span class="badge">${stats.system}</span>
              </button>
            </div>

            <section class="secretary-notifications-toolbar glass">
              <div class="secretary-notifications-search">
                <span>🔎</span>
                <input id="secretaryNotificationsSearch" type="search" placeholder="ابحث في الإشعارات..." value="${this.escapeHTML(this.searchQuery)}" autocomplete="off">
              </div>
              <div class="secretary-notifications-actions">
                <button id="secretaryNotificationsMarkAll" type="button">✅ تحديد الكل مقروء</button>
                <button id="secretaryNotificationsClearAll" type="button">🗑 حذف الكل</button>
              </div>
            </section>

            <div id="secretaryNotificationsMessage" class="secretary-notifications-message" hidden></div>

            <section id="secretaryNotificationsList" class="secretary-notifications-list">
              ${this.renderNotifications()}
            </section>

          </section>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>المواعيد</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="patients" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>المرضى</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="notifications" type="button">
                <span class="mobile-bottom-nav__icon">🔔</span>
                <span>الإشعارات</span>
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
          <section class="secretary-notifications-empty glass">
            <span>🔔</span>
            <h3>${hasNotifications ? 'لا توجد نتائج مطابقة' : 'لا توجد إشعارات'}</h3>
            <p>${hasNotifications ? 'لم نجد إشعارات مطابقة للفلاتر الحالية.' : 'ستظهر الإشعارات هنا عند استلامها.'}</p>
          </section>
        `;
      }

      return this.filteredNotifications.map(function(n) {
        return SecretaryNotificationsScreen.renderNotification(n);
      }).join('');
    },

    /* ==================================================
       RENDER NOTIFICATION
       ================================================== */

    renderNotification: function(notification) {
      const isRead = notification.read;
      const icon = notification.icon || SecretaryNotificationsScreen.getTypeIcon(notification.type);
      const typeLabel = SecretaryNotificationsScreen.getTypeLabel(notification.type);
      const timeAgo = SecretaryNotificationsScreen.getTimeAgo(notification.createdAt);
      const color = notification.color || '#4274d9';

      return `
        <article class="secretary-notification-item glass ${isRead ? 'is-read' : 'is-unread'}" data-id="${notification.id}">
          <div class="secretary-notification-item__icon" style="color:${color}">
            ${icon}
          </div>
          <div class="secretary-notification-item__content">
            <div class="secretary-notification-item__top">
              <strong>${SecretaryNotificationsScreen.escapeHTML(notification.title)}</strong>
              <span class="type-badge is-${notification.type}">${typeLabel}</span>
            </div>
            <p>${SecretaryNotificationsScreen.escapeHTML(notification.message)}</p>
            <div class="secretary-notification-item__meta">
              <small>${timeAgo}</small>
              ${!isRead ? `<span class="unread-dot">● جديد</span>` : ''}
              ${notification.action ? `<span class="action-hint">انقر للانتقال</span>` : ''}
            </div>
          </div>
          <div class="secretary-notification-item__actions">
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
      const list = document.getElementById('secretaryNotificationsList');
      if (list) {
        list.innerHTML = this.renderNotifications();
      }

      // Update counts in tabs
      const stats = this.getStats();
      const tabs = document.querySelectorAll('.secretary-notifications-tab');
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
      document.getElementById('secretaryNotificationsBack')?.addEventListener('click', function() {
        app.navigate('/secretary/dashboard');
      });

      // THEME
      document.getElementById('secretaryNotificationsTheme')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      // TABS
      document.querySelectorAll('.secretary-notifications-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          SecretaryNotificationsScreen.selectedTab = this.dataset.tab;
          document.querySelectorAll('.secretary-notifications-tab').forEach(function(t) {
            t.classList.toggle('is-active', t === tab);
          });
          SecretaryNotificationsScreen.loadNotifications();
          SecretaryNotificationsScreen.refresh();
        });
      });

      // SEARCH
      document.getElementById('secretaryNotificationsSearch')?.addEventListener('input', function(event) {
        SecretaryNotificationsScreen.searchQuery = event.target.value;
        SecretaryNotificationsScreen.applyFilters();
        SecretaryNotificationsScreen.refresh();
      });

      // MARK ALL
      document.getElementById('secretaryNotificationsMarkAll')?.addEventListener('click', function() {
        SecretaryNotificationsScreen.markAllAsRead();
      });

      // CLEAR ALL
      document.getElementById('secretaryNotificationsClearAll')?.addEventListener('click', function() {
        SecretaryNotificationsScreen.clearAll();
      });

      // LIST EVENTS
      document.getElementById('secretaryNotificationsList')?.addEventListener('click', function(event) {
        const markRead = event.target.closest('.is-mark-read');
        if (markRead) {
          SecretaryNotificationsScreen.markAsRead(markRead.dataset.id);
          return;
        }

        const remove = event.target.closest('.is-delete');
        if (remove) {
          const confirmed = window.confirm('هل تريد حذف هذا الإشعار؟');
          if (confirmed) {
            SecretaryNotificationsScreen.deleteNotification(remove.dataset.id);
          }
          return;
        }

        const item = event.target.closest('.secretary-notification-item');
        if (item) {
          const id = item.dataset.id;
          const notification = SecretaryNotificationsScreen.filteredNotifications.find(function(n) {
            return n.id === id;
          });
          if (notification) {
            SecretaryNotificationsScreen.navigateToAction(notification);
          }
        }
      });

      // BOTTOM NAV
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/dashboard');
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/appointments');
        });
      });
      document.querySelectorAll("[data-nav='patients']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/patients');
        });
      });
      document.querySelectorAll("[data-nav='notifications']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/notifications');
        });
      });

      // Update bell count
      this.updateBell();
    }
  };

  // ====================================================
  // EXPOSE
  // ====================================================

  window.SecretaryNotificationsScreen = SecretaryNotificationsScreen;

})();