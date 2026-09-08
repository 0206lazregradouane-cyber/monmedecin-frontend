/* =====================================================
   MON MÉDECIN
   SECRETARY SETTINGS - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const SecretarySettingsScreen = {


    /* ==================================================
       STATE
       ================================================== */

    secretary: null,

    doctor: null,

    messageTimer: null,


    /* ==================================================
       STORAGE
       ================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN:", "Cannot read", key);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN:", "Cannot save", key);
        return false;
      }
    },


    /* ==================================================
       ESCAPE
       ================================================== */

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },


    /* ==================================================
       NORMALIZE PHONE
       ================================================== */

    normalizePhone: function (phone) {
      let value = String(phone || "")
        .replace(/\s+/g, "")
        .replace(/-/g, "")
        .trim();

      if (value.startsWith("+213")) {
        value = "0" + value.slice(4);
      } else if (value.startsWith("213") && value.length >= 12) {
        value = "0" + value.slice(3);
      }

      return value;
    },


    /* ==================================================
       LOAD
       ================================================== */

    loadData: function (app) {
      // Get secretary from app state
      this.secretary = app.state.secretary || app.state.user || {};

      // Get doctor linked to secretary
      this.doctor = typeof app.getSecretaryDoctor === "function"
        ? app.getSecretaryDoctor()
        : null;

      // If secretary doesn't have full data, try to load from registry
      if (!this.secretary.id) {
        const secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
        if (Array.isArray(secretaries)) {
          if (this.secretary.phone) {
            const found = secretaries.find(function (s) {
              return SecretarySettingsScreen.normalizePhone(s.phone) ===
                     SecretarySettingsScreen.normalizePhone(SecretarySettingsScreen.secretary.phone);
            });
            if (found) {
              this.secretary = { ...this.secretary, ...found };
            }
          }
        }
      }

      return { secretary: this.secretary, doctor: this.doctor };
    },


    /* ==================================================
       FIND SECRETARY INDEX
       ================================================== */

    getSecretaryIndex: function () {
      let secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
      if (!Array.isArray(secretaries)) secretaries = [];

      const currentId = this.secretary?.id || this.secretary?.secretary_id;
      const index = secretaries.findIndex(function (item) {
        return String(item.id || item.secretary_id) === String(currentId);
      });

      return { secretaries, index };
    },


    /* ==================================================
       UPDATE ACCOUNT
       ================================================== */

    updateAccount: function (data, app) {
      const result = this.getSecretaryIndex();

      if (result.index < 0) {
        // If not found in registry, try to add it
        let secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
        if (!Array.isArray(secretaries)) secretaries = [];

        const newSecretary = {
          ...this.secretary,
          ...data,
          updatedAt: new Date().toISOString()
        };

        secretaries.push(newSecretary);

        const saved = this.writeJSON(localStorage, "monmedecin-secretaries", secretaries);
        if (!saved) {
          this.showMessage("تعذر حفظ البيانات.", "error");
          return false;
        }

        this.secretary = newSecretary;
        app.state.secretary = newSecretary;
        if (app.state.user && app.state.user.role === "secretary") {
          app.state.user = { ...app.state.user, ...newSecretary };
        }

        this.showMessage("تم حفظ بيانات الحساب.", "success");
        return true;
      }

      const secretary = result.secretaries[result.index];

      secretary.fullName = data.fullName;
      secretary.email = data.email;
      secretary.gender = data.gender;
      secretary.updatedAt = new Date().toISOString();

      // SECURITY: We deliberately DO NOT change:
      // - doctor_id
      // - doctorId
      // - permissions
      // - role
      // - phone

      result.secretaries[result.index] = secretary;

      const saved = this.writeJSON(localStorage, "monmedecin-secretaries", result.secretaries);
      if (!saved) {
        this.showMessage("تعذر حفظ البيانات.", "error");
        return false;
      }

      this.secretary = secretary;
      app.state.secretary = secretary;
      app.state.user = {
        ...app.state.user,
        fullName: secretary.fullName,
        email: secretary.email,
        gender: secretary.gender
      };

      this.updateSession(app);

      this.showMessage("تم حفظ بيانات الحساب.", "success");
      return true;
    },


    /* ==================================================
       UPDATE SESSION
       ================================================== */

    updateSession: function (app) {
      const current = this.readJSON(sessionStorage, "monmedecin-session", null);
      if (current) {
        const updated = {
          ...current,
          user: {
            ...(current.user || {}),
            ...app.state.user
          }
        };
        sessionStorage.setItem("monmedecin-session", JSON.stringify(updated));
      }

      const persistent = this.readJSON(localStorage, "monmedecin-session", null);
      if (persistent) {
        const updated = {
          ...persistent,
          user: {
            ...(persistent.user || {}),
            ...app.state.user
          }
        };
        localStorage.setItem("monmedecin-session", JSON.stringify(updated));
      }
    },


    /* ==================================================
       PASSWORD
       ================================================== */

    changePassword: function (currentPassword, newPassword, confirmPassword, app) {
      const result = this.getSecretaryIndex();

      if (result.index < 0) {
        this.showMessage("تعذر العثور على الحساب.", "error");
        return false;
      }

      const secretary = result.secretaries[result.index];

      if (String(secretary.password || "") !== String(currentPassword || "")) {
        this.showMessage("كلمة المرور الحالية غير صحيحة.", "error");
        return false;
      }

      if (String(newPassword || "").length < 6) {
        this.showMessage("كلمة المرور الجديدة يجب أن تحتوي على 6 أحرف على الأقل.", "error");
        return false;
      }

      if (newPassword !== confirmPassword) {
        this.showMessage("كلمتا المرور الجديدتان غير متطابقتين.", "error");
        return false;
      }

      if (currentPassword === newPassword) {
        this.showMessage("اختر كلمة مرور جديدة مختلفة عن الحالية.", "error");
        return false;
      }

      secretary.password = newPassword;
      secretary.updatedAt = new Date().toISOString();

      result.secretaries[result.index] = secretary;

      const saved = this.writeJSON(localStorage, "monmedecin-secretaries", result.secretaries);
      if (!saved) {
        this.showMessage("تعذر تغيير كلمة المرور.", "error");
        return false;
      }

      this.secretary = secretary;
      app.state.secretary = secretary;
      app.state.user = { ...app.state.user, password: newPassword };
      this.updateSession(app);

      this.showMessage("تم تغيير كلمة المرور بنجاح.", "success");
      return true;
    },


    /* ==================================================
       VALIDATE PROFILE
       ================================================== */

    validateProfile: function (data) {
      const errors = {};

      if (!data.fullName || data.fullName.length < 3) {
        errors.fullName = "أدخل الاسم الكامل.";
      }

      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = "البريد الإلكتروني غير صحيح.";
      }

      return { valid: Object.keys(errors).length === 0, errors: errors };
    },


    /* ==================================================
       CLEAR ERRORS
       ================================================== */

    clearErrors: function () {
      document.querySelectorAll(".secretary-settings-error").forEach(function (element) {
        element.textContent = "";
      });
    },


    /* ==================================================
       SHOW ERRORS
       ================================================== */

    showErrors: function (errors) {
      const map = {
        fullName: "secretarySettingsNameError",
        email: "secretarySettingsEmailError"
      };

      Object.keys(errors).forEach(function (key) {
        const element = document.getElementById(map[key]);
        if (element) {
          element.textContent = errors[key];
        }
      });
    },


    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("secretarySettingsMessage");
      if (!element) return;

      element.hidden = false;
      element.textContent = message;
      element.classList.remove("is-success", "is-error");
      element.classList.add(type === "success" ? "is-success" : "is-error");

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3000);
    },


    /* ==================================================
       PERMISSION LABEL
       ================================================== */

    renderPermissions: function () {
      const permissions = this.secretary?.permissions || {};

      const items = [
        { key: "appointments", label: "إدارة الحجوزات" },
        { key: "patients", label: "عرض المرضى" },
        { key: "schedule", label: "إدارة الجدول" },
        { key: "services", label: "إدارة الخدمات" },
        { key: "doctorProfile", label: "تعديل ملف الطبيب" },
        { key: "financial", label: "البيانات المالية" }
      ];

      return items.map(function (item) {
        const enabled = permissions[item.key] === true;

        return `
          <div class="secretary-settings-permission ${enabled ? "is-enabled" : "is-disabled"}">
            <span>${enabled ? "✓" : "×"}</span>
            <strong>${SecretarySettingsScreen.escapeHTML(item.label)}</strong>
          </div>
        `;
      }).join("");
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadData(app);

      const isMobile = state.deviceMode === "mobile";

      const doctorName = this.doctor?.fullName || this.doctor?.name || this.doctor?.professional?.title || "الطبيب";
      const specialty = this.doctor?.specialty || this.doctor?.professional?.specialty || "";
      const secretaryName = this.secretary?.fullName || this.secretary?.name || "السكرتير";
      const doctorId = this.secretary?.doctor_id || this.secretary?.doctorId || "—";

      return `
        <main class="secretary-settings ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="secretary-settings__orb secretary-settings__orb--blue"></div>
          <div class="secretary-settings__orb secretary-settings__orb--cyan"></div>

          <header class="secretary-settings__header">
            <button id="secretarySettingsBack" class="secretary-settings__back" type="button">→</button>
            <div class="secretary-settings__header-copy">
              <strong>إعدادات الحساب</strong>
              <span>حساب السكرتير</span>
            </div>
            <button id="secretarySettingsTheme" class="secretary-settings__theme" type="button">◐</button>
          </header>

          <section class="secretary-settings__container">

            <section class="secretary-settings__hero">
              <span>الحساب</span>
              <h1>الإعدادات</h1>
              <p>إدارة بيانات حسابك وإعدادات التطبيق.</p>
            </section>

            <div id="secretarySettingsMessage" class="secretary-settings-message" hidden></div>

            <section class="secretary-settings-account glass">
              <div class="secretary-settings-account__avatar">
                ${this.escapeHTML(String(secretaryName).charAt(0))}
              </div>
              <div class="secretary-settings-account__content">
                <span>سكرتير / سكرتيرة</span>
                <h2>${this.escapeHTML(secretaryName)}</h2>
                <small dir="ltr">${this.escapeHTML(this.secretary?.phone || "")}</small>
              </div>
              <span class="secretary-settings-account__status ${this.secretary?.active !== false ? "is-active" : "is-disabled"}">
                ${this.secretary?.active !== false ? "نشط" : "متوقف"}
              </span>
            </section>

            <section class="secretary-settings-card glass">
              <div class="secretary-settings-card__head">
                <div>
                  <span>الارتباط</span>
                  <h2>الطبيب المرتبط بالحساب</h2>
                </div>
                <span class="secretary-settings-card__icon">+</span>
              </div>
              <div class="secretary-settings-doctor">
                <div class="secretary-settings-doctor__avatar">
                  ${this.escapeHTML(String(doctorName).replace(/^د\.?\s*/, "").charAt(0))}
                </div>
                <div>
                  <strong>${this.escapeHTML(doctorName)}</strong>
                  <span>${this.escapeHTML(specialty)}</span>
                  <small dir="ltr">Doctor ID: ${this.escapeHTML(doctorId)}</small>
                </div>
              </div>
              <div class="secretary-settings-lock-note">
                <span>🔒</span>
                <p>لا يمكن تغيير الطبيب المرتبط من حساب السكرتير. يتم إنشاء هذا الارتباط تلقائيًا عندما ينشئ الطبيب الحساب.</p>
              </div>
            </section>

            <section class="secretary-settings-card glass">
              <div class="secretary-settings-card__head">
                <div>
                  <span>المعلومات</span>
                  <h2>بيانات الحساب</h2>
                </div>
                <span class="secretary-settings-card__icon">👤</span>
              </div>
              <form id="secretarySettingsProfileForm" class="secretary-settings-form" novalidate>
                <div class="secretary-settings-grid">
                  <label class="secretary-settings-field">
                    <span>الاسم الكامل</span>
                    <input id="secretarySettingsName" type="text" maxlength="100" value="${this.escapeHTML(this.secretary?.fullName || "")}" placeholder="الاسم الكامل">
                    <small id="secretarySettingsNameError" class="secretary-settings-error"></small>
                  </label>
                  <label class="secretary-settings-field">
                    <span>رقم الهاتف</span>
                    <input type="tel" value="${this.escapeHTML(this.secretary?.phone || "")}" disabled dir="ltr">
                    <small>رقم الهاتف هو معرف تسجيل الدخول ولا يمكن تغييره من هنا.</small>
                  </label>
                  <label class="secretary-settings-field">
                    <span>البريد الإلكتروني</span>
                    <input id="secretarySettingsEmail" type="email" value="${this.escapeHTML(this.secretary?.email || "")}" placeholder="name@example.com" dir="ltr">
                    <small id="secretarySettingsEmailError" class="secretary-settings-error"></small>
                  </label>
                  <label class="secretary-settings-field">
                    <span>الجنس</span>
                    <select id="secretarySettingsGender">
                      <option value="" ${!this.secretary?.gender ? "selected" : ""}>غير محدد</option>
                      <option value="male" ${this.secretary?.gender === "male" ? "selected" : ""}>ذكر</option>
                      <option value="female" ${this.secretary?.gender === "female" ? "selected" : ""}>أنثى</option>
                    </select>
                  </label>
                </div>
                <button class="secretary-settings-primary-button" type="submit">حفظ البيانات</button>
              </form>
            </section>

            <section class="secretary-settings-card glass">
              <div class="secretary-settings-card__head">
                <div>
                  <span>الوصول</span>
                  <h2>صلاحيات الحساب</h2>
                </div>
                <span class="secretary-settings-card__icon">✓</span>
              </div>
              <div class="secretary-settings-permissions">
                ${this.renderPermissions()}
              </div>
              <div class="secretary-settings-lock-note">
                <span>🔒</span>
                <p>الصلاحيات يحددها الطبيب صاحب الحساب، ولا يستطيع السكرتير تغييرها بنفسه.</p>
              </div>
            </section>

            <section class="secretary-settings-card glass">
              <div class="secretary-settings-card__head">
                <div>
                  <span>الأمان</span>
                  <h2>تغيير كلمة المرور</h2>
                </div>
                <span class="secretary-settings-card__icon">●</span>
              </div>
              <form id="secretarySettingsPasswordForm" class="secretary-settings-form" novalidate>
                <div class="secretary-settings-grid">
                  <label class="secretary-settings-field">
                    <span>كلمة المرور الحالية</span>
                    <input id="secretarySettingsCurrentPassword" type="password" autocomplete="current-password" placeholder="كلمة المرور الحالية">
                  </label>
                  <label class="secretary-settings-field">
                    <span>كلمة المرور الجديدة</span>
                    <input id="secretarySettingsNewPassword" type="password" autocomplete="new-password" placeholder="6 أحرف على الأقل">
                  </label>
                  <label class="secretary-settings-field">
                    <span>تأكيد كلمة المرور</span>
                    <input id="secretarySettingsConfirmPassword" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور">
                  </label>
                </div>
                <button class="secretary-settings-primary-button" type="submit">تغيير كلمة المرور</button>
              </form>
            </section>

            <section class="secretary-settings-card glass">
              <div class="secretary-settings-card__head">
                <div>
                  <span>التطبيق</span>
                  <h2>التفضيلات</h2>
                </div>
                <span class="secretary-settings-card__icon">⚙</span>
              </div>
              <div class="secretary-settings-grid">
                <label class="secretary-settings-field">
                  <span>اللغة</span>
                  <select id="secretarySettingsLanguage">
                    <option value="ar" ${state.language === "ar" ? "selected" : ""}>العربية</option>
                    <option value="fr" ${state.language === "fr" ? "selected" : ""}>Français</option>
                    <option value="en" ${state.language === "en" ? "selected" : ""}>English</option>
                  </select>
                </label>
                <div class="secretary-settings-theme-control">
                  <span>المظهر</span>
                  <button id="secretarySettingsThemeToggle" type="button">
                    <span>◐</span>
                    <strong>${state.theme === "dark" ? "الوضع الداكن" : "الوضع الفاتح"}</strong>
                  </button>
                </div>
              </div>
            </section>

            <section class="secretary-settings-card secretary-settings-card--danger glass">
              <div class="secretary-settings-card__head">
                <div>
                  <span>الجلسة</span>
                  <h2>تسجيل الخروج</h2>
                </div>
                <span class="secretary-settings-card__icon">→</span>
              </div>
              <p class="secretary-settings-card__description">سيتم إنهاء جلسة السكرتير الحالية والعودة إلى شاشة تسجيل الدخول المشتركة.</p>
              <button id="secretarySettingsLogout" class="secretary-settings-logout" type="button">تسجيل الخروج</button>
            </section>

          </section>

          <!-- BOTTOM NAV - ADDED -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>الحجوزات</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="patients" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>المرضى</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="settings" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>الإعدادات</span>
              </button>
            </nav>
          ` : ""}

        </main>
      `;
    },


    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      document.getElementById("secretarySettingsBack")?.addEventListener("click", function () {
        app.navigate("/secretary/dashboard");
      });

      document.getElementById("secretarySettingsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // PROFILE FORM
      document.getElementById("secretarySettingsProfileForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        SecretarySettingsScreen.clearErrors();

        const data = {
          fullName: String(document.getElementById("secretarySettingsName")?.value || "").trim(),
          email: String(document.getElementById("secretarySettingsEmail")?.value || "").trim().toLowerCase(),
          gender: String(document.getElementById("secretarySettingsGender")?.value || "")
        };

        const validation = SecretarySettingsScreen.validateProfile(data);
        if (!validation.valid) {
          SecretarySettingsScreen.showErrors(validation.errors);
          return;
        }

        const updated = SecretarySettingsScreen.updateAccount(data, app);
        if (updated) {
          setTimeout(function () { app.render(); }, 500);
        }
      });

      // PASSWORD FORM
      document.getElementById("secretarySettingsPasswordForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const currentPassword = String(document.getElementById("secretarySettingsCurrentPassword")?.value || "");
        const newPassword = String(document.getElementById("secretarySettingsNewPassword")?.value || "");
        const confirmPassword = String(document.getElementById("secretarySettingsConfirmPassword")?.value || "");

        const changed = SecretarySettingsScreen.changePassword(currentPassword, newPassword, confirmPassword, app);
        if (changed) {
          document.getElementById("secretarySettingsPasswordForm")?.reset();
        }
      });

      // LANGUAGE
      document.getElementById("secretarySettingsLanguage")?.addEventListener("change", function (event) {
        app.setLanguage(event.target.value);
      });

      // THEME CONTROL
      document.getElementById("secretarySettingsThemeToggle")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // LOGOUT
      document.getElementById("secretarySettingsLogout")?.addEventListener("click", function () {
        const confirmed = window.confirm("هل تريد تسجيل الخروج؟");
        if (confirmed) {
          app.logout();
        }
      });

      // BOTTOM NAV - ADDED
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/dashboard");
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/appointments");
        });
      });
      document.querySelectorAll("[data-nav='patients']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/patients");
        });
      });
      document.querySelectorAll("[data-nav='settings']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/settings");
        });
      });
    }

  };


  window.SecretarySettingsScreen = SecretarySettingsScreen;

})();