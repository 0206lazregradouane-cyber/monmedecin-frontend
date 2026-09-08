/* =====================================================
   MON MÉDECIN
   NOTIFICATION SERVICE - FIXED (With DataService)
   ===================================================== */

(function() {
  'use strict';

  var NotificationService = function() {
    this.container = null;
    this.timer = null;
    this.queue = [];
    this.isShowing = false;
    this.listeners = [];
    this.notifications = [];
    this.autoRefreshInterval = null;
    this.refreshInterval = 30000;
    this._initialized = false;
    this._storageKey = 'monmedecin-notifications';
    
    // Reference to DataService
    this._dataService = window.MonMedecinDataService || null;
  };

  /* ==================================================
     STORAGE HELPERS - Using DataService when available
     ================================================== */

  NotificationService.prototype._readJSON = function(key, fallback) {
    // Use DataService if available
    if (this._dataService && typeof this._dataService.readJSON === 'function') {
      return this._dataService.readJSON(localStorage, key, fallback);
    }
    
    // Fallback to direct localStorage
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('MON MÉDECIN: Cannot read', key, error);
      return fallback;
    }
  };

  NotificationService.prototype._writeJSON = function(key, value) {
    // Use DataService if available
    if (this._dataService && typeof this._dataService.writeJSON === 'function') {
      return this._dataService.writeJSON(localStorage, key, value);
    }
    
    // Fallback to direct localStorage
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('MON MÉDECIN: Cannot write', key, error);
      return false;
    }
  };

  /* ==================================================
     INIT
     ================================================== */

  NotificationService.prototype.init = function() {
    if (this._initialized) return;
    this._initialized = true;
    
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
      width: 100%;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    this.loadFromStorage();
    this.startAutoRefresh();

    console.log('✅ Notification Service initialized (with DataService support)');
  };

  /* ==================================================
     AUTO REFRESH
     ================================================== */

  NotificationService.prototype.startAutoRefresh = function() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    this.autoRefreshInterval = setInterval(function() {
      this.loadFromStorage();
      this.notifyListeners(null, 'refresh');
    }.bind(this), this.refreshInterval);
  };

  NotificationService.prototype.stopAutoRefresh = function() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  };

  /* ==================================================
     NOTIFICATIONS CRUD
     ================================================== */

  NotificationService.prototype.getNotifications = function(userId) {
    this.loadFromStorage();
    if (!userId) return this.notifications;
    
    return this.notifications.filter(function(n) {
      if (n.userId === null || n.userId === 'all') return true;
      if (n.userId === userId) return true;
      return n.userRole && n.userId === 'all';
    });
  };

  NotificationService.prototype.getUnreadCount = function(userId) {
    var notifications = this.getNotifications(userId);
    return notifications.filter(function(n) {
      return n.read === false;
    }).length;
  };

  NotificationService.prototype.createNotification = function(data) {
    if (!data || !data.title || !data.message) {
      console.warn('Notification missing title or message');
      return null;
    }

    var validTypes = ['appointment', 'reminder', 'system', 'complaint', 'user'];
    var type = validTypes.includes(data.type) ? data.type : 'system';

    var notification = {
      id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      title: data.title,
      message: data.message,
      type: type,
      priority: data.priority || 'medium',
      userId: data.userId || 'all',
      userRole: data.userRole || 'all',
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: data.icon || this.getTypeIcon(type),
      color: data.color || this.getTypeColor(type),
      action: data.action || null,
      relatedId: data.relatedId || null,
      relatedType: data.relatedType || null
    };

    this.loadFromStorage();
    this.notifications.unshift(notification);
    
    if (this.notifications.length > 500) {
      this.notifications = this.notifications.slice(0, 500);
    }

    this.saveToStorage();
    this.notifyListeners(notification, 'create');

    if (!notification.read) {
      this.showToast(notification);
    }

    return notification;
  };

  NotificationService.prototype.createReminder = function(data) {
    return this.createNotification({
      ...data,
      type: 'reminder',
      priority: data.priority || 'high',
      icon: '⏰',
      color: '#e9b341'
    });
  };

  NotificationService.prototype.markAsRead = function(id) {
    this.loadFromStorage();
    var index = this.notifications.findIndex(function(n) {
      return n.id === id;
    });
    if (index === -1) return false;

    this.notifications[index].read = true;
    this.notifications[index].updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.notifyListeners(this.notifications[index], 'read');
    return true;
  };

  NotificationService.prototype.markAllAsRead = function(userId) {
    this.loadFromStorage();
    var changed = false;
    
    this.notifications.forEach(function(n) {
      if (n.read === false && (n.userId === userId || n.userId === 'all' || n.userId === null)) {
        n.read = true;
        n.updatedAt = new Date().toISOString();
        changed = true;
      }
    });
    
    if (changed) {
      this.saveToStorage();
      this.notifyListeners(null, 'markAllRead');
    }
    return changed;
  };

  NotificationService.prototype.deleteNotification = function(id) {
    this.loadFromStorage();
    var index = this.notifications.findIndex(function(n) {
      return n.id === id;
    });
    if (index === -1) return false;

    var deleted = this.notifications[index];
    this.notifications.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners(deleted, 'delete');
    return true;
  };

  NotificationService.prototype.clearAll = function(userId) {
    this.loadFromStorage();
    if (userId) {
      this.notifications = this.notifications.filter(function(n) {
        return n.userId !== userId && n.userId !== 'all' && n.userId !== null;
      });
    } else {
      this.notifications = [];
    }
    this.saveToStorage();
    this.notifyListeners(null, 'clearAll');
  };

  /* ==================================================
     STORAGE - Using helpers
     ================================================== */

  NotificationService.prototype.loadFromStorage = function() {
    var data = this._readJSON(this._storageKey, null);
    if (data && Array.isArray(data)) {
      this.notifications = data;
    } else {
      this.notifications = this.getDefaultNotifications();
      this.saveToStorage();
    }
  };

  NotificationService.prototype.getDefaultNotifications = function() {
    return [
      {
        id: 'NOTIF-' + Date.now() + '-default1',
        title: 'مرحباً بك في Mon Médecin',
        message: 'يمكنك متابعة جميع الإشعارات والتذكيرات هنا.',
        type: 'system',
        priority: 'medium',
        userId: 'all',
        userRole: 'all',
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        icon: '🔔',
        color: '#4274d9',
        action: null
      }
    ];
  };

  NotificationService.prototype.saveToStorage = function() {
    return this._writeJSON(this._storageKey, this.notifications);
  };

  /* ==================================================
     TOAST NOTIFICATIONS
     ================================================== */

  NotificationService.prototype.show = function(message, type, duration) {
    this.init();
    
    var element = document.createElement('div');
    var typeClass = type || 'info';
    element.className = 'notification notification-' + typeClass;
    
    var colors = {
      success: '#e8f5e9',
      error: '#fdecea',
      warning: '#fff3e0',
      info: '#e3f2fd'
    };
    
    var textColors = {
      success: '#2e7d32',
      error: '#c62828',
      warning: '#e65100',
      info: '#0d47a1'
    };
    
    var icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    // Dark mode support
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                 document.body.classList.contains('dark');
    
    if (isDark) {
      colors.success = '#1a3a2a';
      colors.error = '#3a1a1a';
      colors.warning = '#3a2a1a';
      colors.info = '#1a2a3a';
      
      textColors.success = '#6fcf97';
      textColors.error = '#e57373';
      textColors.warning = '#d4a02a';
      textColors.info = '#5a8ad9';
    }

    element.style.cssText = `
      background: ${colors[typeClass] || colors.info};
      color: ${textColors[typeClass] || textColors.info};
      padding: 14px 18px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 12px 35px rgba(0,0,0,0.15);
      pointer-events: auto;
      animation: slideInRight 0.3s ease;
      border: 1px solid rgba(0,0,0,0.05);
      direction: rtl;
      transition: opacity 0.3s ease, transform 0.3s ease;
      max-width: 100%;
    `;
    
    element.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">${icons[typeClass] || 'ℹ️'}</span>
        <span style="flex:1; word-break: break-word;">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: ${textColors[typeClass] || textColors.info};
          font-size: 16px;
          cursor: pointer;
          padding: 0 5px;
          opacity: 0.6;
          margin-right: auto;
        ">✕</button>
      </div>
    `;
    
    this.container.appendChild(element);
    
    var timeout = duration || 3500;
    clearTimeout(this.timer);
    this.timer = setTimeout(function() {
      if (element.parentNode) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(100px)';
        setTimeout(function() {
          if (element.parentNode) element.remove();
        }, 300);
      }
    }, timeout);
  };

  NotificationService.prototype.showToast = function(notification) {
    if (!notification || notification.read) return;

    var typeMap = {
      appointment: 'info',
      reminder: 'warning',
      system: 'info',
      complaint: 'error',
      user: 'success'
    };

    var type = typeMap[notification.type] || 'info';
    var message = notification.title + ': ' + notification.message;
    
    if (message.length > 80) {
      message = message.slice(0, 80) + '...';
    }
    
    this.show(message, type, 4000);
  };

  NotificationService.prototype.success = function(message, duration) {
    this.show(message, 'success', duration);
  };

  NotificationService.prototype.error = function(message, duration) {
    this.show(message, 'error', duration);
  };

  NotificationService.prototype.warning = function(message, duration) {
    this.show(message, 'warning', duration);
  };

  NotificationService.prototype.info = function(message, duration) {
    this.show(message, 'info', duration);
  };

  /* ==================================================
     TYPE HELPERS
     ================================================== */

  NotificationService.prototype.getTypeIcon = function(type) {
    var icons = {
      appointment: '📅',
      reminder: '⏰',
      system: '🔔',
      complaint: '⚠️',
      user: '👤'
    };
    return icons[type] || '🔔';
  };

  NotificationService.prototype.getTypeColor = function(type) {
    var colors = {
      appointment: '#4274d9',
      reminder: '#e9b341',
      system: '#6c7480',
      complaint: '#b34d4d',
      user: '#25815b'
    };
    return colors[type] || '#4274d9';
  };

  /* ==================================================
     LISTENERS
     ================================================== */

  NotificationService.prototype.addListener = function(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  };

  NotificationService.prototype.removeListener = function(callback) {
    var index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  };

  NotificationService.prototype.notifyListeners = function(notification, action) {
    this.listeners.forEach(function(listener) {
      try {
        listener(notification, action);
      } catch (error) {
        console.warn('MON MÉDECIN: Notification listener error', error);
      }
    });
  };

  /* ==================================================
     INJECT STYLES
     ================================================== */

  NotificationService.prototype.injectStyles = function() {
    var style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .notification {
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      @media (max-width: 480px) {
        .notification-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  };

  /* ==================================================
     CREATE INSTANCE
     ================================================== */

  var notificationService = new NotificationService();
  notificationService.injectStyles();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      notificationService.init();
    });
  } else {
    notificationService.init();
  }
  
  window.MonMedecinNotificationService = notificationService;

})();