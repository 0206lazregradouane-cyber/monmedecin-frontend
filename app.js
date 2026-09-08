// =========================================================
// MON MÉDECIN - APP CORE (VERSION UNIFIÉE)
// =========================================================

(function() {
  'use strict';

  // =========================================================
  // التحقق من التبعيات
  // =========================================================

  if (!window.MonMedecinHelpers) {
    console.error('❌ MonMedecinHelpers not loaded!');
    return;
  }

  if (!window.MonMedecinConstants) {
    console.error('❌ MonMedecinConstants not loaded!');
    return;
  }

  if (!window.MonMedecinDataService) {
    console.error('❌ MonMedecinDataService not loaded!');
    return;
  }

  if (!window.MonMedecinAuthService) {
    console.error('❌ MonMedecinAuthService not loaded!');
    return;
  }

  var Helpers = window.MonMedecinHelpers;
  var Constants = window.MonMedecinConstants;
  var DataService = window.MonMedecinDataService;
  var AuthService = window.MonMedecinAuthService;

  var readJSON = Helpers.readJSON;
  var writeJSON = Helpers.writeJSON;
  var removeStorage = Helpers.removeStorage;
  var escapeHTML = Helpers.escapeHTML;
  var getRoleHome = Helpers.getRoleHome;

  var STORAGE_KEYS = Constants.STORAGE_KEYS;
  var SESSION_KEYS = Constants.SESSION_KEYS;
  var ROLES = Constants.ROLES;
  var PUBLIC_ROUTES = Constants.PUBLIC_ROUTES;

  // =========================================================
  // CLASS APP
  // =========================================================

  function App() {
    // ===== الحالة =====
    this.state = {
      route: '/splash',
      previousRoute: null,
      theme: 'light',
      deviceMode: 'mobile',
      language: 'ar',
      authenticated: false,
      role: null,
      user: null,
      admin: null,
      doctor: null,
      secretary: null,
      patient: null,
      selectedDoctor: null,
      selectedService: null,
      selectedAppointment: null,
      booted: false,
      _logoutInProgress: false,
    };

    // ===== العناصر =====
    this.root = null;
    this.routes = this.getRoutes();
    this._eventListeners = [];
    this._globalButtonFixApplied = false;
    this._notificationBellInitialized = false;

    // ===== مراجع للخدمات =====
    this.data = DataService;
    this.auth = AuthService;

    // ===== المستمعون =====
    this.auth.addListener(this.handleAuthEvent.bind(this));
    this.data.addListener(this.handleDataEvent.bind(this));

    console.log('✅ App core initialized');
  }

  // =========================================================
  // ROUTES
  // =========================================================

  App.prototype.getRoutes = function() {
    return {
      '/splash': { public: true, screens: ['SplashScreen'] },
      '/onboarding': { public: true, screens: ['OnboardingScreen'] },
      '/login': { public: true, screens: ['LoginScreen'] },
      '/register': { public: true, screens: ['RegisterScreen'] },
      '/forgot-password': { public: true, screens: ['ForgotPasswordScreen'] },
      '/reset-password': { public: true, screens: ['ResetPasswordScreen'] },
      '/change-password': { roles: ['admin', 'doctor', 'secretary', 'patient'], screens: ['ChangePasswordScreen'] },

      '/patient/home': { roles: ['patient'], screens: ['PatientHomeScreen'] },
      '/patient/search': { roles: ['patient'], screens: ['PatientSearchScreen'] },
      '/patient/doctor': { roles: ['patient'], screens: ['DoctorProfileScreen'] },
      '/patient/booking': { roles: ['patient'], screens: ['PatientBookingScreen'] },
      '/patient/booking-other': { roles: ['patient'], screens: ['PatientBookingOtherScreen'] },
      '/patient/booking/confirm': { roles: ['patient'], screens: ['PatientBookingConfirmScreen'] },
      '/patient/booking/success': { roles: ['patient'], screens: ['PatientBookingSuccessScreen'] },
      '/patient/appointments': { roles: ['patient'], screens: ['PatientAppointmentsScreen'] },
      '/patient/favorites': { roles: ['patient'], screens: ['PatientFavoritesScreen'] },
      '/patient/profile': { roles: ['patient'], screens: ['PatientProfileScreen'] },
      '/patient/notifications': { roles: ['patient'], screens: ['PatientNotificationsScreen'] },

      '/doctor/dashboard': { roles: ['doctor'], screens: ['DoctorDashboardScreen'] },
      '/doctor/appointments': { roles: ['doctor'], screens: ['DoctorAppointmentsScreen'] },
      '/doctor/schedule': { roles: ['doctor'], screens: ['DoctorScheduleScreen'] },
      '/doctor/services': { roles: ['doctor'], screens: ['DoctorServicesScreen'] },
      '/doctor/secretary': { roles: ['doctor'], screens: ['DoctorSecretaryScreen'] },
      '/doctor/patients': { roles: ['doctor'], screens: ['DoctorPatientScreen'] },
      '/doctor/profile': { roles: ['doctor'], screens: ['DoctorProfileScreen'] },
      '/doctor/account': { roles: ['doctor'], screens: ['DoctorAccountScreen'] },
      '/doctor/professional': { roles: ['doctor'], screens: ['DoctorProfessionalScreen'] },
      '/doctor/notifications': { roles: ['doctor'], screens: ['DoctorNotificationsScreen'] },
      '/doctor/queue': { roles: ['doctor'], screens: ['DoctorQueueScreen'] },
      '/doctor/settings': { roles: ['doctor'], screens: ['DoctorAccountScreen'] },

      '/secretary/dashboard': { roles: ['secretary'], screens: ['SecretaryDashboardScreen'] },
      '/secretary/appointments': { roles: ['secretary'], permission: 'appointments', screens: ['SecretaryAppointmentsScreen'] },
      '/secretary/patients': { roles: ['secretary'], permission: 'patients', screens: ['SecretaryPatientsScreen'] },
      '/secretary/schedule': { roles: ['secretary'], permission: 'schedule', screens: ['SecretaryScheduleScreen'] },
      '/secretary/profile': { roles: ['secretary'], screens: ['SecretaryProfileScreen'] },
      '/secretary/settings': { roles: ['secretary'], screens: ['SecretarySettingsScreen'] },
      '/secretary/doctor-profile': { roles: ['secretary'], permission: 'doctorProfile', screens: ['SecretaryDoctorProfileScreen'] },
      '/secretary/notifications': { roles: ['secretary'], screens: ['SecretaryNotificationsScreen'] },
      '/secretary/queue': { roles: ['secretary'], permission: 'appointments', screens: ['SecretaryQueueScreen'] },

      '/admin/dashboard': { roles: ['admin'], screens: ['AdminDashboardScreen'] },
      '/admin/doctors': { roles: ['admin'], screens: ['AdminDoctorsScreen'] },
      '/admin/patients': { roles: ['admin'], screens: ['AdminPatientsScreen'] },
      '/admin/appointments': { roles: ['admin'], screens: ['AdminAppointmentsScreen'] },
      '/admin/settings': { roles: ['admin'], screens: ['AdminSettingsScreen'] },
      '/admin/users': { roles: ['admin'], screens: ['AdminUsersScreen'] },
      '/admin/reports': { roles: ['admin'], screens: ['AdminReportsScreen'] },
      '/admin/complaints': { roles: ['admin'], screens: ['AdminComplaintsScreen'] },
      '/admin/notifications': { roles: ['admin'], screens: ['AdminNotificationsScreen'] },
      '/admin/content': { roles: ['admin'], screens: ['AdminContentScreen'] },
      '/admin/specialties': { roles: ['admin'], screens: ['AdminSpecialtiesScreen'] }
    };
  };

  // =========================================================
  // BOOT - تشغيل التطبيق
  // =========================================================

  App.prototype.boot = function() {
    if (this.state.booted) return;
    this.state.booted = true;

    console.log('🏥 Mon Médecin v2.0 - Starting...');

    this.root = document.getElementById('app') || this.createRoot();

    this.loadTheme();

    this.detectDeviceMode();

    this.restoreSession();

    this.initNotificationService();

    this.initQueueService();

    this.initReminderScheduler();

    var self = this;
    window.addEventListener('hashchange', function() { self.handleRoute(); });
    window.addEventListener('resize', this.debounce(function() { self.handleResize(); }, 150));

    var initialRoute = this.getInitialRoute();
    window.location.hash = initialRoute;

    this.state.route = initialRoute;
    this.render();

    console.log('✅ Mon Médecin v2.0 - Ready');
  };

  // =========================================================
  // تهيئة الخدمات
  // =========================================================

  App.prototype.initNotificationService = function() {
    try {
      if (window.MonMedecinNotificationService) {
        window.MonMedecinNotificationService.init();
        console.log('✅ Notification service initialized');
      }
    } catch (error) {
      console.warn('⚠️ Notification service init error:', error);
    }
  };

  App.prototype.initQueueService = function() {
    try {
      if (window.MonMedecinQueueService) {
        window.MonMedecinQueueService.init();
        console.log('✅ Queue service initialized');
      }
    } catch (error) {
      console.warn('⚠️ Queue service init error:', error);
    }
  };

  App.prototype.initReminderScheduler = function() {
    try {
      if (window.MonMedecinReminderScheduler) {
        window.MonMedecinReminderScheduler.start();
        console.log('✅ Reminder scheduler started');
      }
    } catch (error) {
      console.warn('⚠️ Reminder scheduler start error:', error);
    }
  };

  // =========================================================
  // إنشاء العنصر الرئيسي
  // =========================================================

  App.prototype.createRoot = function() {
    var root = document.createElement('div');
    root.id = 'app';
    document.body.prepend(root);
    return root;
  };

  // =========================================================
  // المظهر (Theme)
  // =========================================================

  App.prototype.loadTheme = function() {
    var stored = readJSON(localStorage, STORAGE_KEYS.THEME, 'light');
    this.state.theme = (stored === 'dark' || stored === 'light') ? stored : 'light';
    this.applyTheme();
  };

  App.prototype.applyTheme = function() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
    if (document.body) {
      document.body.classList.toggle('dark', this.state.theme === 'dark');
    }
  };

  App.prototype.toggleTheme = function() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    writeJSON(localStorage, STORAGE_KEYS.THEME, this.state.theme);
    writeJSON(localStorage, STORAGE_KEYS.THEME_USER_CHOSEN, 'true');
    this.applyTheme();
    this.render();
  };

  App.prototype.setLanguage = function(lang) {
    if (['ar', 'fr', 'en'].includes(lang)) {
      this.state.language = lang;
      this.render();
    }
  };

  // =========================================================
  // الجهاز (Device)
  // =========================================================

  App.prototype.detectDeviceMode = function() {
    this.state.deviceMode = window.innerWidth <= 760 ? 'mobile' : 'desktop';
  };

  App.prototype.handleResize = function() {
    var previous = this.state.deviceMode;
    this.detectDeviceMode();
    if (previous !== this.state.deviceMode) {
      this.render();
      if (!this._notificationBellInitialized) {
        this.addNotificationBell();
      }
    }
  };

  // =========================================================
  // الجلسة (Session)
  // =========================================================

  App.prototype.restoreSession = function() {
    try {
      var result = this.auth.restoreSession();
      if (result) {
        this.state.authenticated = true;
        this.state.role = result.role;
        this.state.user = result.user;
        this.applyRoleState(result.role, result.user);
        return true;
      }
    } catch (error) {
      console.warn('MON MÉDECIN: Session restore error:', error);
    }

    return this.restoreLegacySession();
  };

  App.prototype.restoreLegacySession = function() {
    try {
      var session = readJSON(localStorage, 'monmedecin-session', null);
      if (session && session.authenticated) {
        var userData = readJSON(localStorage, 'monmedecin-current-user', null);
        if (userData && userData.account) {
          this.state.authenticated = true;
          this.state.role = userData.role;
          this.state.user = userData.account;
          this.applyRoleState(userData.role, userData.account);
          return true;
        }
      }
    } catch (error) {
      console.warn('MON MÉDECIN: Legacy session restore error:', error);
    }

    return false;
  };

  App.prototype.applyRoleState = function(role, account) {
    this.state.admin = role === ROLES.ADMIN ? account : null;
    this.state.doctor = role === ROLES.DOCTOR ? account : null;
    this.state.secretary = role === ROLES.SECRETARY ? account : null;
    this.state.patient = role === ROLES.PATIENT ? account : null;
    this.state.user = account;
  };

  // =========================================================
  // تسجيل الخروج
  // =========================================================

  App.prototype.logout = function() {
    if (this.state._logoutInProgress) return;
    this.state._logoutInProgress = true;

    console.log('🚪 Logging out...');

    this.auth.logout();

    this.state.authenticated = false;
    this.state.role = null;
    this.state.user = null;
    this.state.admin = null;
    this.state.doctor = null;
    this.state.secretary = null;
    this.state.patient = null;
    this._notificationBellInitialized = false;
    this._globalButtonFixApplied = false;
    this.state._logoutInProgress = false;

    this.navigate('/login');
  };

  // =========================================================
  // التوجيه (Routing)
  // =========================================================

  App.prototype.getInitialRoute = function() {
    var hash = this.normalizeRoute(window.location.hash);

    if (this.state.authenticated && this.state.role) {
      if (PUBLIC_ROUTES.indexOf(hash) !== -1 || hash === '/') {
        return getRoleHome(this.state.role);
      }
      return hash;
    }

    if (hash && PUBLIC_ROUTES.indexOf(hash) === -1 && hash !== '/') {
      return '/login';
    }

    return hash || '/splash';
  };

  App.prototype.normalizeRoute = function(value) {
    var route = String(value || '').replace(/^#/, '').trim();
    if (!route || route === '/') route = '/splash';
    if (route.charAt(0) !== '/') route = '/' + route;
    route = route.replace(/\/+/g, '/');
    if (route.length > 1 && route.charAt(route.length - 1) === '/') {
      route = route.slice(0, -1);
    }
    return route;
  };

  App.prototype.navigate = function(route, options) {
    var opts = options || {};
    var normalized = this.normalizeRoute(route);

    if (!this.routes[normalized]) {
      console.warn('MON MÉDECIN: Route not found', normalized);
      var fallback = this.state.authenticated ? getRoleHome(this.state.role) : '/login';
      if (this.routes[fallback]) {
        window.location.hash = fallback;
        return;
      }
      window.location.hash = '/login';
      return;
    }

    if (opts.replace) {
      var base = window.location.href.split('#')[0];
      window.location.replace(base + '#' + normalized);
      return;
    }

    if (window.location.hash === '#' + normalized) {
      this.handleRoute();
      return;
    }

    window.location.hash = normalized;
  };

  App.prototype.back = function(fallback) {
    if (this.state.previousRoute) {
      this.navigate(this.state.previousRoute);
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.navigate(fallback || getRoleHome(this.state.role));
  };

  App.prototype.handleRoute = function() {
    var route = this.normalizeRoute(window.location.hash);
    this.state.previousRoute = this.state.route;
    this.state.route = route;

    var access = this.canAccessRoute(route);
    if (!access.allowed) {
      this.navigate(access.redirect, { replace: true });
      return;
    }

    if (!this._notificationBellInitialized) {
      this.addNotificationBell();
    }

    this.render();
  };

  // =========================================================
  // التحكم في الوصول
  // =========================================================

  App.prototype.canAccessRoute = function(route) {
    var definition = this.routes[route];

    if (!definition) {
      return {
        allowed: false,
        redirect: this.state.authenticated ? getRoleHome(this.state.role) : '/login'
      };
    }

    if (definition.public) {
      if (this.state.authenticated && (route === '/login' || route === '/register')) {
        return {
          allowed: false,
          redirect: getRoleHome(this.state.role)
        };
      }
      return { allowed: true };
    }

    if (!this.state.authenticated || !this.state.role) {
      return { allowed: false, redirect: '/login' };
    }

    if (definition.roles && definition.roles.indexOf(this.state.role) === -1) {
      return { allowed: false, redirect: getRoleHome(this.state.role) };
    }

    if (this.state.role === ROLES.SECRETARY && definition.permission) {
      if (!this.secretaryCan(definition.permission)) {
        return { allowed: false, redirect: '/secretary/dashboard' };
      }
    }

    return { allowed: true };
  };

  // =========================================================
  // صلاحيات السكرتير
  // =========================================================

  App.prototype.secretaryCan = function(permission) {
    return this.auth.secretaryCan(permission);
  };

  App.prototype.getSecretaryDoctor = function() {
    return this.auth.getSecretaryDoctor();
  };

  App.prototype.getSecretaryDoctorId = function() {
    return this.auth.getSecretaryDoctorId();
  };

  // =========================================================
  // التصيير (Render)
  // =========================================================

  App.prototype.render = function() {
    this.detectDeviceMode();
    this.applyTheme();

    var route = this.state.route;
    var definition = this.routes[route];

    if (!definition) {
      this.navigate(this.state.authenticated ? getRoleHome(this.state.role) : '/login');
      return;
    }

    var resolved = this.resolveScreen(definition);
    if (!resolved) {
      this.root.innerHTML = this.renderMissingScreen(route, definition);
      return;
    }

    try {
      var self = this;
      this.root.innerHTML = resolved.screen.render(this.state, this);

      if (typeof resolved.screen.init === 'function') {
        setTimeout(function() {
          resolved.screen.init(self);

          if (!self._notificationBellInitialized) {
            self.addNotificationBell();
          }

          self.fixGlobalButtons();
        }, 100);
      }

      window.scrollTo(0, 0);
    } catch (error) {
      console.error('❌ Render error:', error);
      this.root.innerHTML = this.renderErrorScreen(error);
    }
  };

  App.prototype.resolveScreen = function(definition) {
    if (!definition || !Array.isArray(definition.screens)) return null;

    for (var i = 0; i < definition.screens.length; i++) {
      var screenName = definition.screens[i];
      var screen = window[screenName];
      if (screen && typeof screen.render === 'function') {
        return { name: screenName, screen: screen };
      }
    }

    if (window.ComingSoonScreen && typeof window.ComingSoonScreen.render === 'function') {
      return { name: 'ComingSoonScreen', screen: window.ComingSoonScreen };
    }

    return null;
  };

  // =========================================================
  // شاشات الخطأ
  // =========================================================

  App.prototype.renderMissingScreen = function(route, definition) {
    var names = definition?.screens || [];
    return `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;direction:rtl;background:#f7f9fc;">
        <section style="width:min(100%,520px);padding:24px;border-radius:22px;background:#fff;box-shadow:0 18px 50px rgba(20,50,90,.08);">
          <div style="width:55px;height:55px;display:grid;place-items:center;border-radius:17px;background:rgba(66,116,217,.09);font-size:22px;">⚕</div>
          <h1 style="margin:0;font-size:20px;color:#172c48;">الشاشة غير محملة</h1>
          <p style="margin:8px 0 0;color:#7c8a9c;font-size:12px;line-height:1.8;">المسار موجود لكن ملف الشاشة لم يتم تحميله.</p>
          <div style="margin-top:14px;padding:12px;border-radius:12px;background:#f7f9fc;font-family:monospace;font-size:11px;overflow-wrap:anywhere;">Route: ${escapeHTML(route)}</div>
          <div style="margin-top:8px;padding:12px;border-radius:12px;background:#f7f9fc;font-family:monospace;font-size:11px;overflow-wrap:anywhere;">Screen: ${escapeHTML(names.join(' / '))}</div>
          <button onclick="window.App.navigate('${getRoleHome(this.state.role)}')" style="width:100%;min-height:44px;margin-top:14px;border:0;border-radius:13px;background:#4274d9;color:#fff;font-weight:800;cursor:pointer;">العودة للرئيسية</button>
        </section>
      </main>
    `;
  };

  App.prototype.renderErrorScreen = function(error) {
    return `
      <main style="min-height:100vh;display:grid;place-items:center;padding:20px;direction:rtl;background:#f7f9fc;">
        <section style="width:min(100%,520px);padding:22px;border-radius:20px;background:white;box-shadow:0 15px 45px rgba(20,50,90,.1);">
          <h1 style="margin:0;color:#a64040;font-size:18px;">حدث خطأ في الشاشة</h1>
          <p style="color:#728196;line-height:1.7;font-size:12px;">افتح Console لمعرفة التفاصيل.</p>
          <code style="display:block;direction:ltr;margin-top:10px;overflow-wrap:anywhere;">${escapeHTML(error?.message || String(error))}</code>
        </section>
      </main>
    `;
  };

  // =========================================================
  // جرس الإشعارات
  // =========================================================

  App.prototype.addNotificationBell = function() {
    if (this._notificationBellInitialized) return;

    var self = this;
    setTimeout(function() {
      try {
        if (window.NotificationBell && typeof window.NotificationBell.init === 'function') {
          window.NotificationBell.init(self);
          self._notificationBellInitialized = true;
          console.log('✅ Notification bell initialized');
        }
      } catch (error) {
        console.warn('⚠️ Notification bell init error:', error);
      }
    }, 300);
  };

  // =========================================================
  // إصلاح الأزرار العامة
  // =========================================================

  App.prototype.fixGlobalButtons = function() {
    if (this._globalButtonFixApplied) return;
    this._globalButtonFixApplied = true;

    var app = this;

    document.querySelectorAll('[id$="Back"]').forEach(function(btn) {
      if (btn._backFixed) return;
      btn._backFixed = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var role = app.state.role || 'patient';
        app.navigate(getRoleHome(role));
      });
    });

    document.querySelectorAll('[id$="Theme"]').forEach(function(btn) {
      if (btn._themeFixed) return;
      btn._themeFixed = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.toggleTheme();
        app.render();
      });
    });

    document.querySelectorAll('[id$="Notifications"]').forEach(function(btn) {
      if (btn._notifFixed) return;
      btn._notifFixed = true;
      var role = app.state.role || 'patient';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.navigate('/' + role + '/notifications');
      });
    });

    document.querySelectorAll('[id$="Logout"]').forEach(function(btn) {
      if (btn._logoutFixed) return;
      btn._logoutFixed = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('هل تريد تسجيل الخروج؟')) {
          app.logout();
        }
      });
    });

    var navMap = {
      'home': '/patient/home',
      'search': '/patient/search',
      'appointments': '/patient/appointments',
      'favorites': '/patient/favorites',
      'profile': '/patient/profile',
      'dashboard': '/doctor/dashboard',
      'schedule': '/doctor/schedule',
      'services': '/doctor/services',
      'secretary': '/doctor/secretary',
      'account': '/doctor/account',
      'queue': '/doctor/queue',
      'patients': '/secretary/patients',
      'settings': '/secretary/settings',
      'doctors': '/admin/doctors',
      'content': '/admin/content',
      'users': '/admin/users',
      'reports': '/admin/reports',
      'complaints': '/admin/complaints',
      'specialties': '/admin/specialties',
      'notifications': '/patient/notifications',
      'booking': '/patient/booking',
      'doctor-profile': '/secretary/doctor-profile'
    };

    Object.keys(navMap).forEach(function(nav) {
      document.querySelectorAll('[data-nav="' + nav + '"]').forEach(function(btn) {
        if (btn._navFixed) return;
        btn._navFixed = true;
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          app.navigate(navMap[nav]);
        });
      });
    });
  };

  // =========================================================
  // دوال مساعدة للتخزين
  // =========================================================

  App.prototype.readJSON = function(storage, key, fallback) {
    return readJSON(storage, key, fallback);
  };

  App.prototype.writeJSON = function(storage, key, value) {
    return writeJSON(storage, key, value);
  };

  App.prototype.escapeHTML = function(value) {
    return escapeHTML(value);
  };

  // =========================================================
  // GET APPOINTMENTS SAFELY
  // =========================================================

  App.prototype.getAppointmentsSafely = function() {
    if (this.data && typeof this.data.getAppointments === 'function') {
      var result = this.data.getAppointments();
      return Array.isArray(result) ? result : [];
    }

    var stores = [
      'monmedecin-appointments',
      'monmedecin-doctor-appointments',
      'monmedecin-patient-appointments'
    ];

    var map = new Map();

    stores.forEach(function(key) {
      try {
        var data = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(data)) {
          data.forEach(function(appointment) {
            var id = appointment.id || appointment.appointment_id;
            if (id) {
              map.set(String(id), appointment);
            }
          });
        }
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot read', key, error);
      }
    });

    return Array.from(map.values());
  };

  App.prototype.getAppointments = function() {
    return this.getAppointmentsSafely();
  };

  // =========================================================
  // SAVE APPOINTMENTS TO ALL STORES
  // =========================================================

  App.prototype.saveAppointmentsToAllStores = function(appointments) {
    if (!Array.isArray(appointments)) {
      console.warn('MON MÉDECIN: saveAppointmentsToAllStores called with non-array');
      return false;
    }

    if (this.data && typeof this.data.saveAppointments === 'function') {
      return this.data.saveAppointments(appointments);
    }

    var stores = [
      'monmedecin-appointments',
      'monmedecin-doctor-appointments',
      'monmedecin-patient-appointments'
    ];

    var allSaved = true;

    stores.forEach(function(key) {
      try {
        var data = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(data)) data = [];

        appointments.forEach(function(appointment) {
          var index = data.findIndex(function(item) {
            return String(item.id || item.appointment_id) === String(appointment.id || appointment.appointment_id);
          });
          if (index >= 0) {
            data[index] = appointment;
          } else {
            data.push(appointment);
          }
        });

        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot save', key, error);
        allSaved = false;
      }
    });

    return allSaved;
  };

  App.prototype.getAppointmentById = function(id) {
    return this.data.findAppointment(id);
  };

  // =========================================================
  // CHECK APPOINTMENT CONFLICT
  // =========================================================

  App.prototype.checkAppointmentConflict = function(doctorId, date, time, duration, excludeId) {
    if (this.data && typeof this.data.checkAppointmentConflict === 'function') {
      return this.data.checkAppointmentConflict(doctorId, date, time, duration, excludeId);
    }

    var appointments = this.getAppointmentsSafely();
    if (!Array.isArray(appointments)) {
      return { hasConflict: false };
    }

    var start = this.timeToMinutes(time);
    if (start === null) {
      return { hasConflict: false };
    }

    var end = start + (duration || 30);

    var conflict = appointments.some(function(appointment) {
      if (excludeId && String(appointment.id) === String(excludeId)) return false;
      if (String(appointment.doctor_id || appointment.doctorId) !== String(doctorId)) return false;
      if (appointment.date !== date) return false;
      if (['cancelled', 'rejected'].indexOf(appointment.status) !== -1) return false;

      var aptStart = this.timeToMinutes(appointment.time);
      if (aptStart === null) return false;
      var aptEnd = aptStart + (appointment.duration || 30);

      return start < aptEnd && aptStart < end;
    }, this);

    return {
      hasConflict: conflict,
      message: conflict ? 'هذا الوقت محجوز بالفعل' : null
    };
  };

  // =========================================================
  // TIME TO MINUTES
  // =========================================================

  App.prototype.timeToMinutes = function(value) {
    var parts = String(value || '').split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return parts[0] * 60 + parts[1];
  };

  // =========================================================
  // دوال مساعدة للأطباء
  // =========================================================

  App.prototype.doctorHasServices = function(doctorId) {
    if (!doctorId) return false;
    var services = this.data.getDoctorServices(doctorId);
    return services.some(function(s) { return s.active !== false; });
  };

  App.prototype.doctorHasSchedule = function(doctorId) {
    if (!doctorId) return false;
    var schedule = this.data.getDoctorSchedule(doctorId);
    if (!schedule) return false;
    var days = schedule.days || {};
    var hasActive = false;
    Object.keys(days).forEach(function(key) {
      if (days[key] && days[key].enabled !== false) {
        hasActive = true;
      }
    });
    return hasActive;
  };

  App.prototype.getDoctorSchedule = function(doctorId) {
    return this.data.getDoctorSchedule(doctorId);
  };

  App.prototype.getDoctorServices = function(doctorId, onlyActive) {
    var services = this.data.getDoctorServices(doctorId);
    if (onlyActive) {
      return services.filter(function(s) { return s.active !== false; });
    }
    return services;
  };

  App.prototype.getDoctors = function() {
    return this.data.getDoctors();
  };

  App.prototype.saveDoctor = function(doctor) {
    if (!doctor) return false;
    return this.data.updateDoctor(doctor.id, doctor);
  };

  // =========================================================
  // دوال مساعدة للسكرتير
  // =========================================================

  App.prototype.getSecretaries = function() {
    return this.data.getSecretaries();
  };

  // =========================================================
  // دوال مساعدة للمرضى
  // =========================================================

  App.prototype.getPatients = function() {
    return this.data.getPatients();
  };

  // =========================================================
  // دوال مساعدة للتحديد
  // =========================================================

  App.prototype.selectDoctor = function(doctor) {
    this.state.selectedDoctor = doctor;
    if (doctor) {
      try {
        sessionStorage.setItem(SESSION_KEYS.SELECTED_DOCTOR, JSON.stringify(doctor));
        sessionStorage.setItem(SESSION_KEYS.SELECTED_DOCTOR_ID, String(doctor.id));
      } catch (e) {}
    }
  };

  App.prototype.selectService = function(service) {
    this.state.selectedService = service;
    if (service) {
      try {
        sessionStorage.setItem(SESSION_KEYS.SELECTED_SERVICE, JSON.stringify(service));
      } catch (e) {}
    }
  };

  App.prototype.selectAppointment = function(appointment) {
    this.state.selectedAppointment = appointment;
    if (appointment) {
      try {
        sessionStorage.setItem(SESSION_KEYS.SELECTED_APPOINTMENT, JSON.stringify(appointment));
      } catch (e) {}
    }
  };

  // =========================================================
  // الإشعارات (Toast Notifications)
  // =========================================================

  App.prototype.showToast = function(message, type) {
    if (window.MonMedecinNotificationService) {
      window.MonMedecinNotificationService.show(message, type);
      return;
    }

    var colors = {
      success: '#25815b',
      error: '#b34d4d',
      warning: '#9d7426',
      info: '#4274d9'
    };

    var toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      border-radius: 14px;
      background: ${colors[type] || colors.info};
      color: white;
      font-size: 10px;
      font-weight: 850;
      max-width: 90%;
      z-index: 9999;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      text-align: center;
      direction: rtl;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(function() {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 3000);
  };

  App.prototype.notifySuccess = function(message) {
    this.showToast(message, 'success');
  };

  App.prototype.notifyError = function(message) {
    this.showToast(message, 'error');
  };

  App.prototype.notifyWarning = function(message) {
    this.showToast(message, 'warning');
  };

  App.prototype.notifyInfo = function(message) {
    this.showToast(message, 'info');
  };

  // =========================================================
  // الحصول على دور المستخدم
  // =========================================================

  App.prototype.getRoleHome = function(role) {
    return getRoleHome(role);
  };

  // =========================================================
  // الدوال العامة
  // =========================================================

  App.prototype.getUsers = function() {
    return this.data.getUsers();
  };

  // =========================================================
  // المساعدات العامة
  // =========================================================

  App.prototype.debounce = function(fn, delay) {
    var timer = null;
    var self = this;
    return function() {
      var args = arguments;
      var context = self;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, delay);
    };
  };

  // =========================================================
  // معالجة أحداث المصادقة
  // =========================================================

  App.prototype.handleAuthEvent = function(event, data) {
    if (event === 'login') {
      this.state.authenticated = true;
      this.state.role = data.user?.role;
      this.state.user = data.user;
      if (data.user) {
        this.applyRoleState(data.user.role, data.user);
      }
      this._globalButtonFixApplied = false;
      this.render();
    }

    if (event === 'logout') {
      this.state.authenticated = false;
      this.state.role = null;
      this.state.user = null;
      this.state.admin = null;
      this.state.doctor = null;
      this.state.secretary = null;
      this.state.patient = null;
      this._globalButtonFixApplied = false;
      this.render();
    }

    if (event === 'refresh') {
      if (data.user) {
        this.state.user = data.user;
        this.applyRoleState(data.user.role, data.user);
        this.render();
      }
    }
  };

  // =========================================================
  // معالجة أحداث البيانات
  // =========================================================

  App.prototype.handleDataEvent = function(event, data) {
    if (event === 'appointmentCreated' || event === 'appointmentUpdated') {
      this.render();
    }
  };

  // =========================================================
  // إنشاء التطبيق وتشغيله
  // =========================================================

  var app = new App();
  window.App = app;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      app.boot();
    });
  } else {
    app.boot();
  }

  console.log('✅ App core loaded');

})();