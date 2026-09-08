/* =====================================================
   MON MÉDECIN
   NOTIFICATION BELL - COMPONENT
   ===================================================== */

(function() {
  'use strict';

  var NotificationBell = {
    /* ==================================================
       STATE
       ================================================== */

    isOpen: false,
    notifications: [],
    unreadCount: 0,
    currentUserId: null,
    currentUserRole: null,
    container: null,
    dropdown: null,
    bell: null,
    count: null,

    /* ==================================================
       INIT
       ================================================== */

    init: function(app) {
      console.log('🔔 NotificationBell.init() called');
      
      this.app = app;
      this.currentUserId = this.getUserId(app);
      this.currentUserRole = this.getUserRole(app);

      // Listen to notification service
      if (window.MonMedecinNotificationService) {
        if (typeof window.MonMedecinNotificationService.addListener === 'function') {
          window.MonMedecinNotificationService.addListener(function(notification, action) {
            if (action === 'read' || action === 'delete' || action === 'clearAll' || action === 'markAllRead') {
              NotificationBell.updateCount();
            }
            if (action !== 'read' && action !== 'delete') {
              NotificationBell.loadNotifications();
            }
          });
        }
      }

      this.loadNotifications();
      this.render();
      this.bindEvents();
      
      console.log('✅ NotificationBell initialized');
    },

    /* ==================================================
       HELPERS
       ================================================== */

    getUserId: function(app) {
      if (!app || !app.state) return 'guest';
      return app.state.user?.id || app.state.patient?.id || app.state.doctor?.id || app.state.secretary?.id || app.state.admin?.id || 'guest';
    },

    getUserRole: function(app) {
      if (!app || !app.state) return 'guest';
      return app.state.role || 'guest';
    },

    getNotifications: function() {
      if (!window.MonMedecinNotificationService) return [];
      return window.MonMedecinNotificationService.getNotifications(this.currentUserId);
    },

    getUnreadCount: function() {
      if (!window.MonMedecinNotificationService) return 0;
      return window.MonMedecinNotificationService.getUnreadCount(this.currentUserId);
    },

    loadNotifications: function() {
      this.notifications = this.getNotifications();
      this.unreadCount = this.getUnreadCount();
      this.updateUI();
    },

    updateCount: function() {
      this.unreadCount = this.getUnreadCount();
      this.updateUI();
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function() {
      // Find or create container
      this.container = document.getElementById('notificationBellContainer');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'notificationBellContainer';
        this.container.className = 'notification-bell-container';
        
        // Try to find header actions
        var headerActions = document.querySelector('.app-header-actions, .patient-home__header-actions, .doctor-dashboard__header-actions, .admin-dashboard__header-actions, .secretary-dashboard__header-actions');
        if (headerActions) {
          headerActions.prepend(this.container);
        } else {
          document.body.appendChild(this.container);
        }
      }

      this.container.innerHTML = this.renderBell();

      // Get elements
      this.bell = this.container.querySelector('#notificationBell');
      this.count = this.container.querySelector('#notificationCount');
      this.dropdown = this.container.querySelector('#notificationDropdown');

      this.updateUI();
    },

    renderBell: function() {
      var count = this.unreadCount > 9 ? '9+' : this.unreadCount;

      return `
        <button class="notification-bell" id="notificationBell" type="button" aria-label="الإشعارات">
          <span class="notification-bell__icon">🔔</span>
          ${this.unreadCount > 0 ? '<span class="notification-bell__count" id="notificationCount">' + count + '</span>' : ''}
        </button>
        <div class="notification-dropdown" id="notificationDropdown" style="display:none;">
          <div class="notification-dropdown__header">
            <span>الإشعارات</span>
            <button id="notificationMarkAllRead" type="button">تحديد الكل مقروء</button>
          </div>
          <div class="notification-dropdown__list" id="notificationList">
            ${this.renderNotifications()}
          </div>
          <div class="notification-dropdown__footer">
            <button id="notificationViewAll" type="button">عرض جميع الإشعارات</button>
          </div>
        </div>
      `;
    },

    renderNotifications: function() {
      if (this.notifications.length === 0) {
        return `
          <div class="notification-empty">
            <span>🔔</span>
            <p>لا توجد إشعارات</p>
          </div>
        `;
      }

      // Show only last 5
      var items = this.notifications.slice(0, 5);

      return items.map(function(notification) {
        var isRead = notification.read;
        var icon = notification.icon || '🔔';
        var date = new Date(notification.createdAt);
        var timeAgo = this.getTimeAgo(date);

        return `
          <div class="notification-item ${isRead ? 'is-read' : 'is-unread'}" data-id="${notification.id}">
            <span class="notification-item__icon" style="color:${notification.color || '#4274d9'}">
              ${icon}
            </span>
            <div class="notification-item__content">
              <strong>${this.escapeHTML(notification.title)}</strong>
              <p>${this.escapeHTML(notification.message)}</p>
              <small>${timeAgo}</small>
            </div>
            ${!isRead ? '<button class="notification-item__mark-read" data-id="' + notification.id + '" type="button">✓</button>' : ''}
          </div>
        `;
      }, this).join('');
    },

    /* ==================================================
       UPDATE UI
       ================================================== */

    updateUI: function() {
      if (!this.container) return;

      // Update count
      if (this.unreadCount > 0) {
        var count = this.unreadCount > 9 ? '9+' : this.unreadCount;
        if (this.count) {
          this.count.textContent = count;
          this.count.style.display = 'inline-flex';
        } else {
          var bell = this.container.querySelector('#notificationBell');
          if (bell) {
            var newCount = document.createElement('span');
            newCount.className = 'notification-bell__count';
            newCount.id = 'notificationCount';
            newCount.textContent = count;
            bell.appendChild(newCount);
          }
        }
      } else {
        if (this.count) {
          this.count.style.display = 'none';
        }
      }

      // Update dropdown if open
      if (this.isOpen && this.dropdown) {
        var list = this.dropdown.querySelector('#notificationList');
        if (list) {
          list.innerHTML = this.renderNotifications();
        }
      }
    },

    /* ==================================================
       EVENTS
       ================================================== */

    bindEvents: function() {
      // Toggle dropdown
      document.addEventListener('click', function(event) {
        var target = event.target.closest('#notificationBellContainer');
        if (target) {
          this.toggleDropdown(event);
        } else {
          this.closeDropdown();
        }
      }.bind(this));

      // Mark as read from dropdown
      document.addEventListener('click', function(event) {
        var markRead = event.target.closest('.notification-item__mark-read');
        if (markRead) {
          var id = markRead.dataset.id;
          this.markAsRead(id);
          event.stopPropagation();
        }
      }.bind(this));

      // Click on notification
      document.addEventListener('click', function(event) {
        var item = event.target.closest('.notification-item');
        if (item && !event.target.closest('.notification-item__mark-read')) {
          var id = item.dataset.id;
          this.clickNotification(id);
          event.stopPropagation();
        }
      }.bind(this));

      // Mark all read
      document.addEventListener('click', function(event) {
        var markAll = event.target.closest('#notificationMarkAllRead');
        if (markAll) {
          this.markAllAsRead();
          event.stopPropagation();
        }
      }.bind(this));

      // View all
      document.addEventListener('click', function(event) {
        var viewAll = event.target.closest('#notificationViewAll');
        if (viewAll) {
          this.viewAll();
          event.stopPropagation();
        }
      }.bind(this));
    },

    toggleDropdown: function(event) {
      this.isOpen = !this.isOpen;
      if (this.dropdown) {
        this.dropdown.style.display = this.isOpen ? 'block' : 'none';
      }
      if (this.isOpen) {
        this.loadNotifications();
      }
      if (event) {
        event.stopPropagation();
      }
    },

    closeDropdown: function() {
      this.isOpen = false;
      if (this.dropdown) {
        this.dropdown.style.display = 'none';
      }
    },

    /* ==================================================
       ACTIONS
       ================================================== */

    markAsRead: function(id) {
      if (!window.MonMedecinNotificationService) return;
      window.MonMedecinNotificationService.markAsRead(id);
      this.loadNotifications();
    },

    markAllAsRead: function() {
      if (!window.MonMedecinNotificationService) return;
      window.MonMedecinNotificationService.markAllAsRead(this.currentUserId);
      this.loadNotifications();
    },

    clickNotification: function(id) {
      var notification = this.notifications.find(function(n) {
        return n.id === id;
      });

      if (!notification) return;

      // Mark as read
      if (!notification.read) {
        this.markAsRead(id);
      }

      // Navigate to action
      if (notification.action && notification.action.route && this.app) {
        this.app.navigate(notification.action.route);
      }

      this.closeDropdown();
    },

    viewAll: function() {
      if (!this.app) return;
      this.closeDropdown();
      
      // Navigate to notifications screen based on role
      var routes = {
        admin: '/admin/notifications',
        doctor: '/doctor/notifications',
        secretary: '/secretary/notifications',
        patient: '/patient/notifications'
      };
      
      var route = routes[this.currentUserRole] || '/patient/notifications';
      this.app.navigate(route);
    },

    /* ==================================================
       HELPERS
       ================================================== */

    getTimeAgo: function(date) {
      var now = new Date();
      var diff = Math.floor((now - date) / 1000);

      if (diff < 60) return 'الآن';
      if (diff < 3600) return Math.floor(diff / 60) + ' دقيقة';
      if (diff < 86400) return Math.floor(diff / 3600) + ' ساعة';
      if (diff < 604800) return Math.floor(diff / 86400) + ' يوم';
      if (diff < 2592000) return Math.floor(diff / 604800) + ' أسبوع';
      if (diff < 31536000) return Math.floor(diff / 2592000) + ' شهر';
      return Math.floor(diff / 31536000) + ' سنة';
    },

    escapeHTML: function(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  // ====================================================
  // EXPOSE
  // ====================================================

  window.NotificationBell = NotificationBell;

})();