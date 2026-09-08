/* =====================================================
   MON MÉDECIN
   CHANGE PASSWORD SCREEN

   FILE:// COMPATIBLE VERSION

   FEATURES:
   - Current password validation
   - New password with requirements
   - Password confirmation
   - Toggle password visibility
   - Real-time password strength indicator
   - Success page after change

   SUPPORTS:
   - Admin
   - Doctor
   - Secretary
   - Patient
   ===================================================== */

(function () {
  "use strict";

  const ChangePasswordScreen = {
    /* ==================================================
       STATE
       ================================================== */

    currentPasswordVisible: false,
    newPasswordVisible: false,
    confirmPasswordVisible: false,
    loading: false,
    changed: false,
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
        console.warn("MON MÉDECIN: Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN: Cannot write", key, error);
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
       USER
       ================================================== */

    getUser: function (app) {
      return app.state.user || null;
    },

    getRole: function (app) {
      return app.state.role || null;
    },

    getRoleHome: function (app) {
      const routes = {
        admin: "/admin/dashboard",
        doctor: "/doctor/dashboard",
        secretary: "/secretary/dashboard",
        patient: "/patient/home",
      };
      const role = this.getRole(app);
      return routes[role] || "/login";
    },

    /* ==================================================
       VALIDATE
       ================================================== */

    validate: function (currentPassword, newPassword, confirmPassword) {
      const errors = [];

      if (!currentPassword || currentPassword.length < 1) {
        errors.push("أدخل كلمة المرور الحالية.");
      }

      if (!newPassword || newPassword.length < 8) {
        errors.push("كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل.");
      }

      if (newPassword && newPassword.length > 0 && newPassword.length < 8) {
        errors.push("كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل.");
      }

      if (newPassword && !/[A-Z]/.test(newPassword)) {
        errors.push("كلمة المرور الجديدة يجب أن تحتوي على حرف كبير واحد على الأقل.");
      }

      if (newPassword && !/[a-z]/.test(newPassword)) {
        errors.push("كلمة المرور الجديدة يجب أن تحتوي على حرف صغير واحد على الأقل.");
      }

      if (newPassword && !/[0-9]/.test(newPassword)) {
        errors.push("كلمة المرور الجديدة يجب أن تحتوي على رقم واحد على الأقل.");
      }

      if (newPassword && !/[!@#$%^&*]/.test(newPassword)) {
        errors.push("كلمة المرور الجديدة يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*).");
      }

      if (newPassword !== confirmPassword) {
        errors.push("تأكيد كلمة المرور غير مطابق.");
      }

      if (currentPassword && newPassword && currentPassword === newPassword) {
        errors.push("كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.");
      }

      return {
        valid: errors.length === 0,
        errors: errors,
      };
    },

    /* ==================================================
       CHANGE PASSWORD
       ================================================== */

    changePassword: function (app) {
      const currentPassword = document.getElementById("changePasswordCurrent")?.value || "";
      const newPassword = document.getElementById("changePasswordNew")?.value || "";
      const confirmPassword = document.getElementById("changePasswordConfirm")?.value || "";

      const validation = this.validate(currentPassword, newPassword, confirmPassword);

      if (!validation.valid) {
        this.showMessage(validation.errors.join(" "), "error");
        return false;
      }

      const user = this.getUser(app);
      const role = this.getRole(app);

      if (!user) {
        this.showMessage("تعذر العثور على الحساب.", "error");
        return false;
      }

      // تحقق من كلمة المرور الحالية
      if (user.password !== currentPassword) {
        this.showMessage("كلمة المرور الحالية غير صحيحة.", "error");
        return false;
      }

      // تحديث كلمة المرور
      const updatedUser = {
        ...user,
        password: newPassword,
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // حفظ في التخزين المناسب حسب الدور
      const storageKey = this.getStorageKey(role);
      let accounts = this.readJSON(localStorage, storageKey, []);

      if (!Array.isArray(accounts)) {
        accounts = [];
      }

      const index = accounts.findIndex(function (acc) {
        return String(acc.id) === String(user.id);
      });

      if (index >= 0) {
        accounts[index] = updatedUser;
      } else {
        accounts.push(updatedUser);
      }

      const saved = this.writeJSON(localStorage, storageKey, accounts);

      if (!saved) {
        this.showMessage("تعذر حفظ كلمة المرور الجديدة.", "error");
        return false;
      }

      // تحديث الحالة
      app.state.user = updatedUser;

      // تحديث حسب الدور
      if (role === "admin") app.state.admin = updatedUser;
      if (role === "doctor") app.state.doctor = updatedUser;
      if (role === "secretary") app.state.secretary = updatedUser;
      if (role === "patient") app.state.patient = updatedUser;

      // تحديث الجلسة
      this.updateSession(app, updatedUser);

      this.changed = true;
      this.showMessage("تم تغيير كلمة المرور بنجاح.", "success");

      return true;
    },

    getStorageKey: function (role) {
      const keys = {
        admin: "monmedecin-admins",
        doctor: "monmedecin-doctors",
        secretary: "monmedecin-secretaries",
        patient: "monmedecin-patients",
      };
      return keys[role] || "monmedecin-users";
    },

    updateSession: function (app, user) {
      const session = this.readJSON(localStorage, "monmedecin-session", null);
      if (session) {
        const currentUser = this.readJSON(localStorage, "monmedecin-current-user", null);
        if (currentUser) {
          this.writeJSON(localStorage, "monmedecin-current-user", {
            ...currentUser,
            account: user,
          });
        }
      }
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("changePasswordMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;

      element.classList.remove("is-success", "is-error", "is-info");
      element.classList.add(
        type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error"
      );

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 4000);
    },

    /* ==================================================
       TOGGLE PASSWORD
       ================================================== */

    togglePassword: function (inputId, button) {
      const input = document.getElementById(inputId);
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.textContent = isPassword ? "🙈" : "👁";
    },

    /* ==================================================
       UPDATE REQUIREMENTS
       ================================================== */

    updateRequirements: function () {
      const password = document.getElementById("changePasswordNew")?.value || "";

      const requirements = [
        { id: "reqLength", test: password.length >= 8 },
        { id: "reqUppercase", test: /[A-Z]/.test(password) },
        { id: "reqLowercase", test: /[a-z]/.test(password) },
        { id: "reqNumber", test: /[0-9]/.test(password) },
        { id: "reqSpecial", test: /[!@#$%^&*]/.test(password) },
      ];

      requirements.forEach(function (req) {
        const element = document.getElementById(req.id);
        if (element) {
          element.classList.toggle("is-met", req.test);
        }
      });
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      const user = this.getUser(app);
      const role = this.getRole(app);

      if (!user) {
        return this.renderInvalid(state);
      }

      const isMobile = state.deviceMode === "mobile";

      return `
        <main
          class="change-password ${isMobile ? "mobile-app-page" : "website-page"}"
        >

          <!-- BACKGROUND -->
          <div
            class="change-password__orb change-password__orb--blue"
          ></div>
          <div
            class="change-password__orb change-password__orb--cyan"
          ></div>

          <!-- HEADER -->
          <header class="change-password__header">
            <button
              id="changePasswordBack"
              class="change-password__back"
              type="button"
            >
              →
            </button>

            <div class="change-password__header-copy">
              <strong>تغيير كلمة المرور</strong>
              <span>${this.escapeHTML(role || "الحساب")}</span>
            </div>

            <button
              id="changePasswordTheme"
              class="change-password__theme"
              type="button"
            >
              ${state.theme === "dark" ? "☀" : "◐"}
            </button>
          </header>

          <!-- CONTENT -->
          <section class="change-password__container">

            <!-- HERO -->
            <section class="change-password__hero">
              <span>🔐 الأمان</span>
              <h1>تغيير كلمة المرور</h1>
              <p>
                حافظ على أمان حسابك بتغيير كلمة المرور بانتظام.
              </p>
            </section>

            <!-- MESSAGE -->
            <div
              id="changePasswordMessage"
              class="change-password-message"
              hidden
            ></div>

            <!-- CARD -->
            <section class="change-password-card glass">

              <div class="change-password-card__head">
                <div>
                  <span>الحساب</span>
                  <h2>${this.escapeHTML(user.fullName || user.name || "المستخدم")}</h2>
                </div>
                <span class="change-password-card__icon">●</span>
              </div>

              ${this.changed ? this.renderSuccess(app) : this.renderForm()}

            </section>

          </section>

        </main>
      `;
    },

    renderForm: function () {
      return `
        <form id="changePasswordForm" class="change-password-form" novalidate>

          <!-- CURRENT PASSWORD -->
          <label class="change-password-field">
            <span>كلمة المرور الحالية</span>
            <div class="change-password-input">
              <input
                id="changePasswordCurrent"
                type="password"
                autocomplete="current-password"
                placeholder="أدخل كلمة المرور الحالية"
                dir="ltr"
              />
              <button
                id="changePasswordCurrentToggle"
                class="change-password-toggle"
                type="button"
              >
                👁
              </button>
            </div>
          </label>

          <!-- NEW PASSWORD -->
          <label class="change-password-field">
            <span>كلمة المرور الجديدة</span>
            <div class="change-password-input">
              <input
                id="changePasswordNew"
                type="password"
                autocomplete="new-password"
                placeholder="8 أحرف على الأقل"
                dir="ltr"
              />
              <button
                id="changePasswordNewToggle"
                class="change-password-toggle"
                type="button"
              >
                👁
              </button>
            </div>
          </label>

          <!-- CONFIRM PASSWORD -->
          <label class="change-password-field">
            <span>تأكيد كلمة المرور الجديدة</span>
            <div class="change-password-input">
              <input
                id="changePasswordConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="أعد كتابة كلمة المرور"
                dir="ltr"
              />
              <button
                id="changePasswordConfirmToggle"
                class="change-password-toggle"
                type="button"
              >
                👁
              </button>
            </div>
          </label>

          <!-- REQUIREMENTS -->
          <div class="change-password-requirements">
            <span>متطلبات كلمة المرور:</span>
            <ul>
              <li id="reqLength">8 أحرف على الأقل</li>
              <li id="reqUppercase">حرف كبير واحد على الأقل (A-Z)</li>
              <li id="reqLowercase">حرف صغير واحد على الأقل (a-z)</li>
              <li id="reqNumber">رقم واحد على الأقل (0-9)</li>
              <li id="reqSpecial">رمز خاص واحد على الأقل (!@#$%^&*)</li>
            </ul>
          </div>

          <!-- SUBMIT -->
          <button
            id="changePasswordSubmit"
            class="change-password-submit"
            type="submit"
          >
            تغيير كلمة المرور
          </button>

        </form>
      `;
    },

    renderSuccess: function (app) {
      const homeRoute = this.getRoleHome(app);
      return `
        <div class="change-password-success">
          <span>✅</span>
          <h2>تم تغيير كلمة المرور</h2>
          <p>تم تحديث كلمة المرور الخاصة بحسابك بنجاح.</p>
          <button id="changePasswordDone" type="button">
            العودة للرئيسية
          </button>
        </div>
      `;
    },

    renderInvalid: function (state) {
      return `
        <main class="change-password ${state.deviceMode === "mobile" ? "mobile-app-page" : "website-page"}">
          <div class="change-password__orb change-password__orb--blue"></div>
          <div class="change-password__orb change-password__orb--cyan"></div>

          <header class="change-password__header">
            <button
              id="changePasswordInvalidBack"
              class="change-password__back"
              type="button"
            >
              →
            </button>
            <div class="change-password__header-copy">
              <strong>تغيير كلمة المرور</strong>
              <span>Mon Médecin</span>
            </div>
            <div></div>
          </header>

          <section class="change-password__container">
            <section class="change-password-card glass" style="text-align:center;padding:40px 20px;">
              <div style="font-size:48px;margin-bottom:16px;">🔒</div>
              <h2 style="color:#172b47;font-size:18px;">لم يتم تحديد حساب</h2>
              <p style="color:#8492a3;font-size:10px;line-height:1.8;max-width:360px;margin:8px auto 0;">
                يرجى تسجيل الدخول أولاً لتغيير كلمة المرور.
              </p>
              <button
                id="changePasswordInvalidLogin"
                style="
                  min-height:42px;
                  padding:0 16px;
                  margin-top:16px;
                  border:0;
                  border-radius:12px;
                  background:#4274d9;
                  color:#ffffff;
                  font-family:inherit;
                  font-size:8px;
                  font-weight:900;
                  cursor:pointer;
                "
                type="button"
              >
                تسجيل الدخول
              </button>
            </section>
          </section>
        </main>
      `;
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      // BACK
      const backButtons = [
        "changePasswordBack",
        "changePasswordInvalidBack",
        "changePasswordDone",
      ];

      backButtons.forEach(function (id) {
        document.getElementById(id)?.addEventListener("click", function () {
          app.navigate(ChangePasswordScreen.getRoleHome(app));
        });
      });

      // THEME
      document.getElementById("changePasswordTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // INVALID LOGIN
      document.getElementById("changePasswordInvalidLogin")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // TOGGLE PASSWORD
      const toggles = [
        { id: "changePasswordCurrentToggle", input: "changePasswordCurrent" },
        { id: "changePasswordNewToggle", input: "changePasswordNew" },
        { id: "changePasswordConfirmToggle", input: "changePasswordConfirm" },
      ];

      toggles.forEach(function (item) {
        document.getElementById(item.id)?.addEventListener("click", function () {
          ChangePasswordScreen.togglePassword(item.input, this);
        });
      });

      // REQUIREMENTS
      document.getElementById("changePasswordNew")?.addEventListener("input", function () {
        ChangePasswordScreen.updateRequirements();
      });

      // FORM
      document.getElementById("changePasswordForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        if (ChangePasswordScreen.loading) return;

        ChangePasswordScreen.loading = true;
        const submit = document.getElementById("changePasswordSubmit");
        if (submit) {
          submit.disabled = true;
          submit.textContent = "⏳ جاري التغيير...";
        }

        setTimeout(function () {
          const success = ChangePasswordScreen.changePassword(app);

          ChangePasswordScreen.loading = false;
          if (submit) {
            submit.disabled = false;
            submit.textContent = "تغيير كلمة المرور";
          }

          if (success) {
            // إعادة العرض لإظهار شاشة النجاح
            setTimeout(function () {
              app.render();
            }, 500);
          }
        }, 300);
      });
    },
  };

  /* ====================================================
     EXPOSE
     ==================================================== */

  window.ChangePasswordScreen = ChangePasswordScreen;
  window.AdminChangePasswordScreen = ChangePasswordScreen;
  window.DoctorChangePasswordScreen = ChangePasswordScreen;
  window.SecretaryChangePasswordScreen = ChangePasswordScreen;
  window.PatientChangePasswordScreen = ChangePasswordScreen;

})();