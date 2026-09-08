/* =====================================================
   MON MÉDECIN
   ADMIN NOTIFICATIONS - COMPLETE
   ===================================================== */

(function() {
  'use strict';

  const AdminNotificationsScreen = {
    /* ==================================================
       STATE
       ================================================== */

    notifications: [],
    filteredNotifications: [],
    selectedTab: 'all',
    searchQuery: '',
    selectedNotificationId: null,
    createModalOpen: false,
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

    getAdmin: function(app) {
      return app.state.admin || app.state.user || null;
    },

    getAdminId: function(app) {
      const admin = this.getAdmin(app);
      return admin?.id || admin?.admin_id || null;
    },

    /* ==================================================
       NOTIFICATIONS
       ================================================== */

    getNotifications: function() {
      if (!window.MonMedecinNotificationService) return [];
      const userId = this.getAdminId(this.app);
      return window.MonMedecinNotificationService.getNotifications(userId);
    },

    getUnreadCount: function() {
      if (!window.MonMedecinNotificationService) return 0;
      const userId = this.getAdminId(this.app);
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
        if (tab !== 'all' && n.type !== tab) {
          return false;
        }

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
      const userId = this.getAdminId(this.app);
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
      const userId = this.getAdminId(this.app);
      if (!window.confirm('هل تريد حذف جميع الإشعارات نهائياً؟')) return;
      window.MonMedecinNotificationService.clearAll(userId);
      this.loadNotifications();
      this.refresh();
      this.updateBell();
      this.showMessage('تم حذف جميع الإشعارات.', 'success');
    },

    /* ==================================================
       CREATE NOTIFICATION (Admin specific)
       ================================================== */

    createNotification: function(data) {
      if (!window.MonMedecinNotificationService) {
        this.showMessage('خدمة الإشعارات غير متوفرة.', 'error');
        return false;
      }

      if (!data.title || !data.message) {
        this.showMessage('يرجى ملء جميع الحقول المطلوبة.', 'error');
        return false;
      }

      const notification = {
        title: data.title,
        message: data.message,
        type: data.type || 'system',
        priority: data.priority || 'medium',
        userId: data.userId || null,
        userRole: data.userRole || 'admin',
        relatedId: data.relatedId || null,
        relatedType: data.relatedType || null,
        action: data.action || null
      };

      const result = window.MonMedecinNotificationService.createNotification(notification);

      if (result) {
        this.createModalOpen = false;
        this.loadNotifications();
        this.refresh();
        this.updateBell();
        this.showMessage('تم إنشاء الإشعار بنجاح.', 'success');
        return true;
      }

      this.showMessage('تعذر إنشاء الإشعار.', 'error');
      return false;
    },

    /* ==================================================
       STATS
       ================================================== */

    getStats: function() {
      const total = this.notifications.length;
      const unread = this.notifications.filter(function(n) { return !n.read; }).length;
      const read = total - unread;
      const system = this.notifications.filter(function(n) { return n.type === 'system'; }).length;
      const complaint = this.notifications.filter(function(n) { return n.type === 'complaint'; }).length;
      const user = this.notifications.filter(function(n) { return n.type === 'user'; }).length;
      const appointment = this.notifications.filter(function(n) { return n.type === 'appointment'; }).length;

      return {
        total: total,
        unread: unread,
        read: read,
        system: system,
        complaint: complaint,
        user: user,
        appointment: appointment
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

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function(message, type) {
      const element = document.getElementById('adminNotificationsMessage');
      if (!element) {
        if (type === 'error') alert('❌ ' + message);
        else if (type === 'success') alert('✅ ' + message);
        else alert('ℹ️ ' + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = 'admin-notifications-message';
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
      const admin = this.getAdmin(app);
      const isMobile = state.deviceMode === 'mobile';

      const adminName = admin?.fullName || admin?.name || 'Administrateur';

      return `
        <main class="admin-notifications ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="admin-notifications__orb admin-notifications__orb--blue"></div>
          <div class="admin-notifications__orb admin-notifications__orb--cyan"></div>

          <header class="admin-notifications__header">
            <button id="adminNotificationsBack" class="admin-notifications__back" type="button">→</button>
            <div class="admin-notifications__header-copy">
              <strong>الإشعارات</strong>
              <span>${this.escapeHTML(adminName)}</span>
            </div>
            <button id="adminNotificationsTheme" class="admin-notifications__theme" type="button">${state.theme === 'dark' ? '☀' : '◐'}</button>
          </header>

          <section class="admin-notifications__container">

            <section class="admin-notifications__hero">
              <span>🔔</span>
              <h1>الإشعارات</h1>
              <p>إدارة إشعارات النظام والتنبيهات الإدارية.</p>
            </section>

            <section class="admin-notifications-stats">
              <article class="admin-notifications-stat glass is-total">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="admin-notifications-stat glass is-unread">
                <span>غير مقروءة</span>
                <strong>${stats.unread}</strong>
              </article>
              <article class="admin-notifications-stat glass is-complaint">
                <span>شكاوى</span>
                <strong>${stats.complaint}</strong>
              </article>
              <article class="admin-notifications-stat glass is-system">
                <span>نظام</span>
                <strong>${stats.system}</strong>
              </article>
            </section>

            <div class="admin-notifications-tabs">
              <button class="admin-notifications-tab ${this.selectedTab === 'all' ? 'is-active' : ''}" data-tab="all" type="button">
                الكل <span class="badge">${stats.total}</span>
              </button>
              <button class="admin-notifications-tab ${this.selectedTab === 'complaint' ? 'is-active' : ''}" data-tab="complaint" type="button">
                ⚠️ شكاوى <span class="badge">${stats.complaint}</span>
              </button>
              <button class="admin-notifications-tab ${this.selectedTab === 'system' ? 'is-active' : ''}" data-tab="system" type="button">
                🔔 نظام <span class="badge">${stats.system}</span>
              </button>
              <button class="admin-notifications-tab ${this.selectedTab === 'user' ? 'is-active' : ''}" data-tab="user" type="button">
                👤 مستخدمين <span class="badge">${stats.user}</span>
              </button>
              <button class="admin-notifications-tab ${this.selectedTab === 'appointment' ? 'is-active' : ''}" data-tab="appointment" type="button">
                📅 مواعيد <span class="badge">${stats.appointment}</span>
              </button>
            </div>

            <section class="admin-notifications-toolbar glass">
              <div class="admin-notifications-search">
                <span>🔎</span>
                <input id="adminNotificationsSearch" type="search" placeholder="ابحث في الإشعارات..." value="${this.escapeHTML(this.searchQuery)}" autocomplete="off">
              </div>
              <div class="admin-notifications-actions">
                <button id="adminNotificationsMarkAll" type="button">✅ تحديد الكل مقروء</button>
                <button id="adminNotificationsClearAll" type="button">🗑 حذف الكل</button>
                <button id="adminNotificationsCreateBtn" type="button">+ إنشاء إشعار</button>
              </div>
            </section>

            <div id="adminNotificationsMessage" class="admin-notifications-message" hidden></div>

            <section id="adminNotificationsList" class="admin-notifications-list">
              ${this.renderNotifications()}
            </section>

          </section>

          <!-- CREATE MODAL -->
          <div id="adminNotificationsModal">
            ${this.renderCreateModal()}
          </div>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="doctors" type="button">
                <span class="mobile-bottom-nav__icon">✚</span>
                <span>الأطباء</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="notifications" type="button">
                <span class="mobile-bottom-nav__icon">🔔</span>
                <span>الإشعارات</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="settings" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>الإعدادات</span>
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
          <section class="admin-notifications-empty glass">
            <span>🔔</span>
            <h3>${hasNotifications ? 'لا توجد نتائج مطابقة' : 'لا توجد إشعارات'}</h3>
            <p>${hasNotifications ? 'لم نجد إشعارات مطابقة للفلاتر الحالية.' : 'ستظهر الإشعارات هنا عند استلامها.'}</p>
          </section>
        `;
      }

      return this.filteredNotifications.map(function(n) {
        return AdminNotificationsScreen.renderNotification(n);
      }).join('');
    },

    /* ==================================================
       RENDER NOTIFICATION
       ================================================== */

    renderNotification: function(notification) {
      const isRead = notification.read;
      const icon = notification.icon || AdminNotificationsScreen.getTypeIcon(notification.type);
      const typeLabel = AdminNotificationsScreen.getTypeLabel(notification.type);
      const timeAgo = AdminNotificationsScreen.getTimeAgo(notification.createdAt);
      const color = notification.color || AdminNotificationsScreen.getTypeColor(notification.type);

      return `
        <article class="admin-notification-item glass ${isRead ? 'is-read' : 'is-unread'}" data-id="${notification.id}">
          <div class="admin-notification-item__icon" style="color:${color}">
            ${icon}
          </div>
          <div class="admin-notification-item__content">
            <div class="admin-notification-item__top">
              <strong>${AdminNotificationsScreen.escapeHTML(notification.title)}</strong>
              <span class="type-badge is-${notification.type}">${typeLabel}</span>
            </div>
            <p>${AdminNotificationsScreen.escapeHTML(notification.message)}</p>
            <div class="admin-notification-item__meta">
              <small>${timeAgo}</small>
              ${!isRead ? `<span class="unread-dot">● جديد</span>` : ''}
              ${notification.action ? `<span class="action-hint">انقر للانتقال</span>` : ''}
              ${notification.userId ? `<span class="user-hint">للمستخدم: ${AdminNotificationsScreen.escapeHTML(notification.userId)}</span>` : ''}
            </div>
          </div>
          <div class="admin-notification-item__actions">
            ${!isRead ? `
              <button class="is-mark-read" data-id="${notification.id}" type="button" title="تحديد كمقروء">✓</button>
            ` : ''}
            <button class="is-delete" data-id="${notification.id}" type="button" title="حذف">✕</button>
          </div>
        </article>
      `;
    },

    /* ==================================================
       RENDER CREATE MODAL
       ================================================== */

    renderCreateModal: function() {
      if (!this.createModalOpen) return '';

      return `
        <div class="admin-notification-modal-overlay">
          <section class="admin-notification-modal glass">
            <header class="admin-notification-modal__header">
              <div>
                <span>إشعار جديد</span>
                <h2>إنشاء إشعار</h2>
              </div>
              <button id="adminNotificationModalClose" type="button">×</button>
            </header>
            <form id="adminNotificationCreateForm" class="admin-notification-form">
              <label class="admin-notification-field">
                <span>العنوان *</span>
                <input id="adminNotificationTitle" type="text" maxlength="100" placeholder="عنوان الإشعار" required>
              </label>
              <label class="admin-notification-field">
                <span>النوع</span>
                <select id="adminNotificationType">
                  <option value="system">نظام</option>
                  <option value="appointment">موعد</option>
                  <option value="user">مستخدم</option>
                  <option value="complaint">شكوى</option>
                  <option value="reminder">تذكير</option>
                </select>
              </label>
              <label class="admin-notification-field">
                <span>الأولوية</span>
                <select id="adminNotificationPriority">
                  <option value="high">عالية</option>
                  <option value="medium" selected>متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </label>
              <label class="admin-notification-field">
                <span>المستلم (اختياري)</span>
                <input id="adminNotificationUserId" type="text" placeholder="معرف المستخدم (اتركه فارغاً للكل)">
              </label>
              <label class="admin-notification-field">
                <span>دور المستلم (اختياري)</span>
                <select id="adminNotificationUserRole">
                  <option value="">الكل</option>
                  <option value="admin">مدير</option>
                  <option value="doctor">طبيب</option>
                  <option value="secretary">سكرتير</option>
                  <option value="patient">مريض</option>
                </select>
              </label>
              <label class="admin-notification-field">
                <span>الرسالة *</span>
                <textarea id="adminNotificationMessage" maxlength="500" placeholder="محتوى الإشعار..." required></textarea>
              </label>
              <label class="admin-notification-field">
                <span>رابط الإجراء (اختياري)</span>
                <input id="adminNotificationActionRoute" type="text" placeholder="/admin/dashboard">
              </label>
              <label class="admin-notification-field">
                <span>نص الزر (اختياري)</span>
                <input id="adminNotificationActionLabel" type="text" placeholder="عرض التفاصيل">
              </label>
              <button class="admin-notification-submit" type="submit">إنشاء الإشعار</button>
            </form>
          </section>
        </div>
      `;
    },

    /* ==================================================
       REFRESH
       ================================================== */

    refresh: function() {
      const list = document.getElementById('adminNotificationsList');
      if (list) {
        list.innerHTML = this.renderNotifications();
      }

      // Update counts in tabs
      const stats = this.getStats();
      const tabs = document.querySelectorAll('.admin-notifications-tab');
      tabs.forEach(function(tab) {
        const tabName = tab.dataset.tab;
        const badge = tab.querySelector('.badge');
        if (!badge) return;
        if (tabName === 'all') badge.textContent = stats.total;
        else if (tabName === 'complaint') badge.textContent = stats.complaint;
        else if (tabName === 'system') badge.textContent = stats.system;
        else if (tabName === 'user') badge.textContent = stats.user;
        else if (tabName === 'appointment') badge.textContent = stats.appointment;
      });
    },

    /* ==================================================
       GET FORM DATA
       ================================================== */

    getFormData: function() {
      return {
        title: document.getElementById('adminNotificationTitle')?.value || '',
        message: document.getElementById('adminNotificationMessage')?.value || '',
        type: document.getElementById('adminNotificationType')?.value || 'system',
        priority: document.getElementById('adminNotificationPriority')?.value || 'medium',
        userId: document.getElementById('adminNotificationUserId')?.value || null,
        userRole: document.getElementById('adminNotificationUserRole')?.value || null,
        action: {
          route: document.getElementById('adminNotificationActionRoute')?.value || null,
          label: document.getElementById('adminNotificationActionLabel')?.value || 'عرض التفاصيل'
        }
      };
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function(app) {
      this.app = app;

      // BACK
      document.getElementById('adminNotificationsBack')?.addEventListener('click', function() {
        app.navigate('/admin/dashboard');
      });

      // THEME
      document.getElementById('adminNotificationsTheme')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      // TABS
      document.querySelectorAll('.admin-notifications-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          AdminNotificationsScreen.selectedTab = this.dataset.tab;
          document.querySelectorAll('.admin-notifications-tab').forEach(function(t) {
            t.classList.toggle('is-active', t === tab);
          });
          AdminNotificationsScreen.loadNotifications();
          AdminNotificationsScreen.refresh();
        });
      });

      // SEARCH
      document.getElementById('adminNotificationsSearch')?.addEventListener('input', function(event) {
        AdminNotificationsScreen.searchQuery = event.target.value;
        AdminNotificationsScreen.applyFilters();
        AdminNotificationsScreen.refresh();
      });

      // MARK ALL
      document.getElementById('adminNotificationsMarkAll')?.addEventListener('click', function() {
        AdminNotificationsScreen.markAllAsRead();
      });

      // CLEAR ALL
      document.getElementById('adminNotificationsClearAll')?.addEventListener('click', function() {
        AdminNotificationsScreen.clearAll();
      });

      // CREATE BTN
      document.getElementById('adminNotificationsCreateBtn')?.addEventListener('click', function() {
        AdminNotificationsScreen.createModalOpen = true;
        app.render();
      });

      // LIST EVENTS
      document.getElementById('adminNotificationsList')?.addEventListener('click', function(event) {
        const markRead = event.target.closest('.is-mark-read');
        if (markRead) {
          AdminNotificationsScreen.markAsRead(markRead.dataset.id);
          return;
        }

        const remove = event.target.closest('.is-delete');
        if (remove) {
          const confirmed = window.confirm('هل تريد حذف هذا الإشعار؟');
          if (confirmed) {
            AdminNotificationsScreen.deleteNotification(remove.dataset.id);
          }
          return;
        }

        const item = event.target.closest('.admin-notification-item');
        if (item) {
          const id = item.dataset.id;
          const notification = AdminNotificationsScreen.filteredNotifications.find(function(n) {
            return n.id === id;
          });
          if (notification) {
            AdminNotificationsScreen.navigateToAction(notification);
          }
        }
      });

      // MODAL EVENTS
      document.getElementById('adminNotificationsModal')?.addEventListener('click', function(event) {
        const close = event.target.closest('#adminNotificationModalClose');
        if (close) {
          AdminNotificationsScreen.createModalOpen = false;
          app.render();
          return;
        }

        const overlay = event.target.closest('.admin-notification-modal-overlay');
        if (overlay && event.target === overlay) {
          AdminNotificationsScreen.createModalOpen = false;
          app.render();
        }
      });

      // FORM SUBMIT
      document.getElementById('adminNotificationCreateForm')?.addEventListener('submit', function(event) {
        event.preventDefault();
        const data = AdminNotificationsScreen.getFormData();
        AdminNotificationsScreen.createNotification(data);
        app.render();
      });

      // BOTTOM NAV
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/admin/dashboard');
        });
      });
      document.querySelectorAll("[data-nav='doctors']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/admin/doctors');
        });
      });
      document.querySelectorAll("[data-nav='notifications']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/admin/notifications');
        });
      });
      document.querySelectorAll("[data-nav='settings']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/admin/settings');
        });
      });

      // Update bell count
      this.updateBell();
    }
  };

  // ====================================================
  // EXPOSE
  // ====================================================

  window.AdminNotificationsScreen = AdminNotificationsScreen;

})();