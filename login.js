/* =========================================================
   MON MÉDECIN
   LOGIN SCREEN - FIXED
   ========================================================= */

(function () {

  "use strict";

  const LoginScreen = {
    loading: false,
    passwordVisible: false,
    messageTimer: null,

    // =====================================================
    // STORAGE
    // =====================================================

    readJSON: function (key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("Mon Médecin login read error:", key, error);
        return fallback;
      }
    },

    writeJSON: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("Mon Médecin login write error:", key, error);
        return false;
      }
    },

    ensureArray: function (value) {
      return Array.isArray(value) ? value : [];
    },

    // =====================================================
    // NORMALIZE
    // =====================================================

    normalizeEmail: function (value) {
      return String(value || "").trim().toLowerCase();
    },

    normalizePhone: function (value) {
      return String(value || "").trim().replace(/\s+/g, "").replace(/-/g, "");
    },

    normalizeIdentifier: function (value) {
      const identifier = String(value || "").trim();
      if (identifier.includes("@")) {
        return this.normalizeEmail(identifier);
      }
      return this.normalizePhone(identifier);
    },

    // =====================================================
    // ADMIN
    // =====================================================

    ensureDefaultAdmin: function () {
      const admins = this.ensureArray(this.readJSON("monmedecin-admins", []));
      const email = "radouanelazreg00@gmail.com";
      const exists = admins.some((admin) => {
        return this.normalizeEmail(admin.email) === email;
      });

      if (!exists) {
        const now = new Date().toISOString();
        admins.push({
          id: "ADMIN-MAIN",
          admin_id: "ADMIN-MAIN",
          role: "admin",
          fullName: "Administrateur",
          name: "Administrateur",
          email: email,
          password: "radouane2003",
          active: true,
          status: "active",
          canChangePassword: true,
          createdAt: now,
          updatedAt: now
        });
        this.writeJSON("monmedecin-admins", admins);
        
        // 🔑 حفظ الإداري في monmedecin-users أيضاً
        let users = this.ensureArray(this.readJSON("monmedecin-users", []));
        users = users.filter(function(u) {
          return String(u.id) !== "ADMIN-MAIN";
        });
        users.push({
          id: "ADMIN-MAIN",
          role: "admin",
          fullName: "Administrateur",
          email: email,
          password: "radouane2003",
          active: true,
          status: "active",
          _source: "admin"
        });
        this.writeJSON("monmedecin-users", users);
      }
      return admins;
    },

    // =====================================================
    // COLLECTIONS
    // =====================================================

    getAdmins: function () {
      return this.ensureDefaultAdmin();
    },

    getDoctors: function () {
      return this.ensureArray(this.readJSON("monmedecin-doctors", []));
    },

    getSecretaries: function () {
      return this.ensureArray(this.readJSON("monmedecin-secretaries", []));
    },

    getPatients: function () {
      return this.ensureArray(this.readJSON("monmedecin-patients", []));
    },

    getUsers: function () {
      return this.ensureArray(this.readJSON("monmedecin-users", []));
    },

    // =====================================================
    // 🔑 ACCOUNT MATCHING - مع البحث في monmedecin-users
    // =====================================================

    accountMatches: function (account, identifier) {
      if (!account) return false;

      const target = this.normalizeIdentifier(identifier);
      const email = this.normalizeEmail(account.email);
      const phone = this.normalizePhone(account.phone);

      return (email && email === target) || (phone && phone === target);
    },

    findAccountIn: function (collection, identifier) {
      return collection.find(function(account) {
        return this.accountMatches(account, identifier);
      }, this) || null;
    },

    findAccount: function (identifier) {
      // 🔑 1. البحث في monmedecin-users أولاً (المصدر الموحد)
      const users = this.getUsers();
      const userAccount = this.findAccountIn(users, identifier);
      if (userAccount) {
        const role = userAccount.role || "patient";
        return { role: role, account: userAccount };
      }

      // 2. البحث في المجموعات الأخرى (للتوافق مع الإصدارات السابقة)
      const groups = [
        { role: "admin", accounts: this.getAdmins() },
        { role: "doctor", accounts: this.getDoctors() },
        { role: "secretary", accounts: this.getSecretaries() },
        { role: "patient", accounts: this.getPatients() }
      ];

      for (const group of groups) {
        const account = this.findAccountIn(group.accounts, identifier);
        if (account) {
          return { role: group.role, account: account };
        }
      }
      return null;
    },

    // =====================================================
    // 🔑 VALIDATE - مع إنشاء تلقائي للخدمات والجدول
    // =====================================================

    validateLogin: function (found, password, app) {
      if (!found) {
        return { valid: false, message: "لم يتم العثور على الحساب." };
      }

      const storedPassword = String(found.account?.password || "");
      if (storedPassword !== String(password || "")) {
        return { valid: false, message: "كلمة المرور غير صحيحة." };
      }

      if (!this.isActive(found.account)) {
        return { valid: false, message: "هذا الحساب متوقف حاليًا." };
      }

      if (found.role === "secretary") {
        const doctor = this.getSecretaryDoctor(found.account);
        if (!doctor) {
          return { valid: false, message: "حساب السكرتير غير مرتبط بطبيب." };
        }
        if (!this.isActive(doctor)) {
          return { valid: false, message: "حساب الطبيب المرتبط بهذا الحساب متوقف." };
        }
      }

      // 🔑 تحسين التحقق من خدمات الطبيب وجدوله
      if (found.role === "doctor") {
        const doctorId = found.account?.id || found.account?.doctor_id;
        
        // التحقق من الخدمات
        let hasServices = this.doctorHasServices(doctorId, app);
        if (!hasServices) {
          // محاولة إنشاء خدمات افتراضية
          this.createDefaultServices(doctorId);
          hasServices = this.doctorHasServices(doctorId, app);
        }
        if (!hasServices) {
          return { valid: false, message: "حساب الطبيب لا يحتوي على خدمات. يرجى إضافة خدمات من لوحة الإدارة." };
        }
        
        // التحقق من الجدول
        let hasSchedule = this.doctorHasSchedule(doctorId, app);
        if (!hasSchedule) {
          // محاولة إنشاء جدول افتراضي
          this.createDefaultSchedule(doctorId);
          hasSchedule = this.doctorHasSchedule(doctorId, app);
        }
        if (!hasSchedule) {
          return { valid: false, message: "حساب الطبيب لا يحتوي على جدول عمل. يرجى إعداد الجدول من لوحة التحكم." };
        }
      }

      return { valid: true };
    },

    // =====================================================
    // 🔑 DOCTOR SERVICES - مع إنشاء تلقائي
    // =====================================================

    doctorHasServices: function (doctorId, app) {
      if (!doctorId) return false;

      if (app && typeof app.doctorHasServices === 'function') {
        return app.doctorHasServices(doctorId);
      }

      const services = this.readJSON("monmedecin-doctor-services", []);
      if (!Array.isArray(services)) return false;

      return services.some(function (s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId) && s.active !== false;
      });
    },

    doctorHasSchedule: function (doctorId, app) {
      if (!doctorId) return false;

      if (app && typeof app.doctorHasSchedule === 'function') {
        return app.doctorHasSchedule(doctorId);
      }

      const schedules = this.readJSON("monmedecin-doctor-schedules", []);
      if (!Array.isArray(schedules)) return false;

      const schedule = schedules.find(function (s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId);
      });

      if (!schedule) return false;

      const days = schedule.days || schedule.week || schedule.weeklySchedule || {};
      return Object.values(days).some(function (day) {
        return day && day.enabled !== false;
      });
    },

    // =====================================================
    // 🔑 CREATE DEFAULT SERVICES AND SCHEDULE
    // =====================================================

    createDefaultServices: function (doctorId) {
      let services = this.readJSON("monmedecin-doctor-services", []);
      if (!Array.isArray(services)) services = [];
      
      const exists = services.some(function(s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId);
      });
      
      if (!exists) {
        services.push({
          id: "SERVICE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
          doctor_id: doctorId,
          doctorId: doctorId,
          name: "استشارة طبية",
          description: "استشارة طبية عامة",
          price: 1500,
          duration: 30,
          durationMinutes: 30,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        this.writeJSON("monmedecin-doctor-services", services);
      }
    },

    createDefaultSchedule: function (doctorId) {
      let schedules = this.readJSON("monmedecin-doctor-schedules", []);
      if (!Array.isArray(schedules)) schedules = [];
      
      const exists = schedules.some(function(s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId);
      });
      
      if (!exists) {
        const defaultDays = {
          saturday: { enabled: true, start: "08:00", end: "17:00" },
          sunday: { enabled: true, start: "08:00", end: "17:00" },
          monday: { enabled: true, start: "08:00", end: "17:00" },
          tuesday: { enabled: true, start: "08:00", end: "17:00" },
          wednesday: { enabled: true, start: "08:00", end: "17:00" },
          thursday: { enabled: true, start: "08:00", end: "17:00" },
          friday: { enabled: false, start: "08:00", end: "17:00" }
        };
        schedules.push({
          id: "SCHEDULE-" + doctorId,
          doctor_id: doctorId,
          doctorId: doctorId,
          slotDuration: 30,
          days: defaultDays,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        this.writeJSON("monmedecin-doctor-schedules", schedules);
      }
    },

    // =====================================================
    // ACCOUNT STATUS
    // =====================================================

    isActive: function (account) {
      if (!account) return false;
      if (account.active === false) return false;

      const status = String(account.status || "").trim().toLowerCase();
      return !["inactive", "disabled", "blocked", "suspended", "deleted"].includes(status);
    },

    // =====================================================
    // SECRETARY DOCTOR
    // =====================================================

    getSecretaryDoctor: function (secretary) {
      const doctorId = secretary?.doctor_id || secretary?.doctorId;
      if (!doctorId) return null;

      return this.getDoctors().find(function (doctor) {
        const id = doctor.id || doctor.doctor_id;
        return String(id) === String(doctorId);
      }) || null;
    },

    // =====================================================
    // SESSION
    // =====================================================

    createSession: function (role, account) {
      const userId = account.id || account.user_id || account.patient_id || account.doctor_id || account.secretary_id || account.admin_id || null;

      return {
        authenticated: true,
        role: role,
        userId: userId,
        doctorId: role === "doctor" ? userId : (role === "secretary" ? (account.doctor_id || account.doctorId || null) : null),
        loginAt: new Date().toISOString()
      };
    },

    saveSession: function (role, account, remember) {
      const session = this.createSession(role, account);
      session.remember = Boolean(remember);

      const sessionSaved = this.writeJSON("monmedecin-session", session);
      const currentUserSaved = this.writeJSON("monmedecin-current-user", {
        role: role,
        account: account
      });

      return sessionSaved && currentUserSaved;
    },

    applyState: function (app, role, account) {
      app.state.authenticated = true;
      app.state.role = role;
      app.state.user = account;
      app.state.patient = role === "patient" ? account : null;
      app.state.doctor = role === "doctor" ? account : null;
      app.state.secretary = role === "secretary" ? account : null;
      app.state.admin = role === "admin" ? account : null;
    },

    // =====================================================
    // ROUTE
    // =====================================================

    getRoleRoute: function (role, app) {
      const preferred = {
        admin: "/admin/dashboard",
        doctor: "/doctor/dashboard",
        secretary: "/secretary/dashboard",
        patient: "/patient/home"
      };

      const target = preferred[role];
      if (target && app.routes && app.routes[target]) {
        return target;
      }

      if (app.routes && app.routes["/patient/home"]) {
        return "/patient/home";
      }

      return "/";
    },

    // =====================================================
    // LOGIN
    // =====================================================

    login: function (identifier, password, remember, app) {
      if (!String(identifier || "").trim()) {
        return { success: false, message: "أدخل رقم الهاتف أو البريد الإلكتروني." };
      }

      if (String(password || "").length < 1) {
        return { success: false, message: "أدخل كلمة المرور." };
      }

      const found = this.findAccount(identifier);
      const validation = this.validateLogin(found, password, app);

      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      const saved = this.saveSession(found.role, found.account, remember);
      if (!saved) {
        return { success: false, message: "تعذر حفظ جلسة تسجيل الدخول." };
      }

      this.applyState(app, found.role, found.account);

      return {
        success: true,
        role: found.role,
        account: found.account,
        route: this.getRoleRoute(found.role, app)
      };
    },

    // =====================================================
    // MESSAGE
    // =====================================================

    showMessage: function (message, type) {
      const element = document.getElementById("loginMessage");
      if (!element) return;

      element.hidden = false;
      element.textContent = message;
      element.className = "login-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");

      window.clearTimeout(this.messageTimer);
      this.messageTimer = window.setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3500);
    },

    // =====================================================
    // LOADING
    // =====================================================

    setLoading: function (loading) {
      this.loading = Boolean(loading);
      const button = document.getElementById("loginSubmit");
      if (!button) return;

      button.disabled = this.loading;
      button.innerHTML = this.loading
        ? `<span class="login-spinner"></span><span>جاري تسجيل الدخول...</span>`
        : `<span>تسجيل الدخول</span><span class="login-submit__arrow">←</span>`;
    },

    // =====================================================
    // RENDER
    // =====================================================

    render: function (state, app) {
      this.ensureDefaultAdmin();
      const isDesktop = state.deviceMode === "desktop";

      return `
        <main class="login-screen ${isDesktop ? 'login-screen--website' : 'login-screen--app'}">
          <div class="login-grid"></div>
          <div class="login-orb login-orb--blue"></div>
          <div class="login-orb login-orb--purple"></div>

          <header class="login-header">
            <button class="login-header__control" id="loginBack" type="button" aria-label="العودة">→</button>
            <button class="login-header__brand" id="loginBrand" type="button">
              <span class="login-header__logo">M</span>
              <span class="login-header__brand-copy">
                <strong>Mon Médecin</strong>
                <small>Votre santé, plus proche.</small>
              </span>
            </button>
            <button class="login-header__control" id="loginTheme" type="button" aria-label="تغيير المظهر">
              ${state.theme === "dark" ? "☀" : "◐"}
            </button>
          </header>

          <section class="login-layout">
            <section class="login-intro">
              <span class="login-intro__badge">أهلاً بعودتك</span>
              <h1>صحتك <span>أقرب إليك.</span></h1>
              <p>منصة صحية حديثة تساعدك على الوصول إلى طبيبك، تنظيم مواعيدك ومتابعة رحلتك الصحية بسهولة.</p>

              <div class="login-visual-card glass">
                <div class="login-visual-card__top">
                  <div class="login-visual-card__logo">M</div>
                  <div>
                    <small>MON MÉDECIN</small>
                    <strong>Votre espace santé</strong>
                  </div>
                  <span class="login-visual-card__online"><i></i>En ligne</span>
                </div>
                <div class="login-visual-card__main">
                  <div class="login-visual-card__medical"><span>+</span></div>
                  <div>
                    <small>Votre santé</small>
                    <strong>Toujours avec vous</strong>
                    <p>Médecins • Rendez-vous • Suivi</p>
                  </div>
                </div>
                <div class="login-visual-card__grid">
                  <div><span>📅</span><strong>Rendez-vous</strong><small>Simple</small></div>
                  <div><span>🩺</span><strong>Médecins</strong><small>Proches</small></div>
                  <div><span>🔔</span><strong>Suivi</strong><small>Continu</small></div>
                </div>
              </div>

              <div class="login-benefits">
                <div class="login-benefit">
                  <span>✓</span>
                  <div><strong>حجز سهل</strong><small>اختر الطبيب والموعد المناسب</small></div>
                </div>
                <div class="login-benefit">
                  <span>✓</span>
                  <div><strong>متابعة واضحة</strong><small>تابع حالة موعدك خطوة بخطوة</small></div>
                </div>
                <div class="login-benefit">
                  <span>✓</span>
                  <div><strong>تجربة موحدة</strong><small>للمريض والطبيب والسكرتارية</small></div>
                </div>
              </div>
            </section>

            <section class="login-form-column">
              <div class="login-mobile-intro">
                <div class="login-mobile-intro__logo"><span>M</span></div>
                <span class="login-mobile-intro__badge">BIENVENUE</span>
                <h2>مرحبًا بعودتك</h2>
                <p>أدخل بيانات حسابك للمتابعة.</p>
              </div>

              <form class="login-form glass" id="loginForm" novalidate>
                <div class="login-form__title">
                  <span>CONNECTION</span>
                  <h2>تسجيل الدخول</h2>
                  <p>يمكنك الدخول برقم الهاتف أو البريد الإلكتروني.</p>
                </div>

                <div class="login-message" id="loginMessage" hidden></div>

                <div class="login-field">
                  <label for="loginIdentifier">الهاتف أو البريد الإلكتروني</label>
                  <div class="login-input">
                    <span class="login-input__icon">👤</span>
                    <input id="loginIdentifier" type="text" autocomplete="username" placeholder="0550 12 34 56 أو example@email.com">
                  </div>
                </div>

                <div class="login-field">
                  <div class="login-label-row">
                    <label for="loginPassword">كلمة المرور</label>
                    <button class="login-forgot" id="loginForgot" type="button">نسيت كلمة المرور؟</button>
                  </div>
                  <div class="login-input">
                    <span class="login-input__icon">●</span>
                    <input id="loginPassword" type="password" autocomplete="current-password" placeholder="أدخل كلمة المرور">
                    <button class="login-password-toggle" id="loginPasswordToggle" type="button" aria-label="إظهار كلمة المرور">👁</button>
                  </div>
                </div>

                <div class="login-options">
                  <label class="login-remember">
                    <input id="loginRemember" type="checkbox" checked>
                    <span>تذكرني</span>
                  </label>
                  <span class="login-secure-label">🛡 اتصال آمن</span>
                </div>

                <button class="login-submit btn btn-primary" id="loginSubmit" type="submit">
                  <span>تسجيل الدخول</span>
                  <span class="login-submit__arrow">←</span>
                </button>

                <div class="login-divider">
                  <span></span>
                  <small>أو</small>
                  <span></span>
                </div>

                <div class="login-register">
                  <span>ليس لديك حساب؟</span>
                  <button id="loginRegister" type="button">إنشاء حساب مريض</button>
                </div>

                <div class="login-staff-note">
                  <span>⚕</span>
                  <p>حساب الطبيب تنشئه الإدارة، أما السكرتير أو السكرتيرة فينشئ حسابه الطبيب.</p>
                </div>
              </form>
            </section>
          </section>
        </main>
      `;
    },

    // =====================================================
    // INIT - FIXED
    // =====================================================

    init: function (app) {
      const back = document.getElementById("loginBack");
      const brand = document.getElementById("loginBrand");
      const theme = document.getElementById("loginTheme");
      const form = document.getElementById("loginForm");
      const identifier = document.getElementById("loginIdentifier");
      const password = document.getElementById("loginPassword");
      const toggle = document.getElementById("loginPasswordToggle");
      const register = document.getElementById("loginRegister");
      const forgot = document.getElementById("loginForgot");
      const remember = document.getElementById("loginRemember");

      back?.addEventListener("click", function () {
        app.navigate("/onboarding");
      });

      brand?.addEventListener("click", function () {
        app.navigate("/onboarding");
      });

      theme?.addEventListener("click", function () {
        app.toggleTheme();
        if (typeof app.render === "function") {
          app.render();
        }
      });

      register?.addEventListener("click", function () {
        app.navigate("/register");
      });

      forgot?.addEventListener("click", function () {
        if (app.routes && app.routes["/forgot-password"]) {
          app.navigate("/forgot-password");
          return;
        }
        LoginScreen.showMessage("استرجاع كلمة المرور سيتم ربطه بنظام المصادقة النهائي.", "info");
      });

      toggle?.addEventListener("click", function () {
        if (!password) return;
        LoginScreen.passwordVisible = !LoginScreen.passwordVisible;
        password.type = LoginScreen.passwordVisible ? "text" : "password";
        toggle.textContent = LoginScreen.passwordVisible ? "🙈" : "👁";
      });

      // Enter key on identifier fields
      identifier?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          password?.focus();
          event.preventDefault();
        }
      });

      password?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          form?.dispatchEvent(new Event("submit"));
          event.preventDefault();
        }
      });

      form?.addEventListener("submit", function (event) {
        event.preventDefault();

        if (LoginScreen.loading) return;

        const identifierValue = identifier?.value?.trim() || "";
        const passwordValue = password?.value || "";

        LoginScreen.setLoading(true);

        setTimeout(function () {
          const result = LoginScreen.login(
            identifierValue,
            passwordValue,
            remember?.checked,
            app
          );

          if (!result.success) {
            LoginScreen.setLoading(false);
            LoginScreen.showMessage(result.message, "error");
            return;
          }

          LoginScreen.showMessage("تم تسجيل الدخول بنجاح.", "success");
          LoginScreen.setLoading(false);
          app.navigate(result.route);
        }, 100);
      });
    }
  };

  window.LoginScreen = LoginScreen;

})();