/* =====================================================
   MON MÉDECIN
   RESET PASSWORD SCREEN

   FILE:// COMPATIBLE VERSION

   FEATURES:
   - Validate reset token
   - Set new password
   - Password strength requirements
   - Toggle password visibility
   - Success screen
   - Invalid token handling

   SUPPORTS:
   - Admin
   - Doctor
   - Secretary
   - Patient
   ===================================================== */

(function () {
  "use strict";

  const ResetPasswordScreen = {
    /* ==================================================
       STATE
       ================================================== */

    loading: false,
    completed: false,
    tokenValid: null,
    tokenData: null,
    messageTimer: null,

    newPasswordVisible: false,
    confirmPasswordVisible: false,

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
       NORMALIZE
       ================================================== */

    normalizeIdentifier: function (value) {
      const str = String(value || "").trim();
      if (str.includes("@")) {
        return { type: "email", value: str.toLowerCase().trim() };
      }
      return { type: "phone", value: str.replace(/\s+/g, "").replace(/-/g, "").trim() };
    },

    /* ==================================================
       VALIDATE TOKEN
       ================================================== */

    validateToken: function (token) {
      if (!token) return { valid: false, reason: "الرمز غير موجود" };

      const requests = this.readJSON(sessionStorage, "monmedecin-reset-requests", []);
      if (!Array.isArray(requests) || requests.length === 0) {
        return { valid: false, reason: "لا توجد طلبات إعادة تعيين" };
      }

      const found = requests.find(function (req) {
        return req.token === token && req.used === false;
      });

      if (!found) {
        return { valid: false, reason: "الرمز غير صالح أو تم استخدامه" };
      }

      // التحقق من صلاحية الرمز (ساعة واحدة)
      const now = new Date();
      const expires = new Date(found.expiresAt);

      if (now > expires) {
        return { valid: false, reason: "انتهت صلاحية الرمز" };
      }

      return {
        valid: true,
        data: found,
      };
    },

    /* ==================================================
       RESET PASSWORD
       ================================================== */

    resetPassword: function (newPassword, confirmPassword) {
      // التحقق من صحة كلمة المرور
      if (!newPassword || newPassword.length < 8) {
        this.showMessage("كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل.", "error");
        return false;
      }

      if (newPassword !== confirmPassword) {
        this.showMessage("تأكيد كلمة المرور غير مطابق.", "error");
        return false;
      }

      if (!/[A-Z]/.test(newPassword)) {
        this.showMessage("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل.", "error");
        return false;
      }

      if (!/[a-z]/.test(newPassword)) {
        this.showMessage("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل.", "error");
        return false;
      }

      if (!/[0-9]/.test(newPassword)) {
        this.showMessage("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.", "error");
        return false;
      }

      if (!/[!@#$%^&*]/.test(newPassword)) {
        this.showMessage("كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*).", "error");
        return false;
      }

      if (!this.tokenValid || !this.tokenData) {
        this.showMessage("الرمز غير صالح. يرجى طلب رابط جديد.", "error");
        return false;
      }

      const tokenData = this.tokenData;
      const role = tokenData.role;
      const userId = tokenData.userId;

      // تحديث كلمة المرور
      const storageKey = this.getStorageKey(role);
      let accounts = this.readJSON(localStorage, storageKey, []);

      if (!Array.isArray(accounts)) {
        accounts = [];
      }

      const index = accounts.findIndex(function (acc) {
        return String(acc.id) === String(userId);
      });

      if (index === -1) {
        this.showMessage("تعذر العثور على الحساب.", "error");
        return false;
      }

      accounts[index] = {
        ...accounts[index],
        password: newPassword,
        passwordResetAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = this.writeJSON(localStorage, storageKey, accounts);

      if (!saved) {
        this.showMessage("تعذر حفظ كلمة المرور الجديدة.", "error");
        return false;
      }

      // تحديث حالة الرمز في الطلبات
      const requests = this.readJSON(sessionStorage, "monmedecin-reset-requests", []);
      const requestIndex = requests.findIndex(function (req) {
        return req.token === tokenData.token;
      });

      if (requestIndex !== -1) {
        requests[requestIndex].used = true;
        requests[requestIndex].usedAt = new Date().toISOString();
        this.writeJSON(sessionStorage, "monmedecin-reset-requests", requests);
      }

      this.completed = true;
      this.showMessage("تم إعادة تعيين كلمة المرور بنجاح.", "success");

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

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("resetPasswordMessage");
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
      const password = document.getElementById("resetPasswordNew")?.value || "";

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
      const isMobile = state.deviceMode === "mobile";

      // الحصول على الرمز من URL
      const token = this.getTokenFromURL();

      // التحقق من الرمز
      if (token && this.tokenValid === null) {
        const result = this.validateToken(token);
        this.tokenValid = result.valid;
        this.tokenData = result.valid ? result.data : null;

        if (!result.valid) {
          console.warn("MON MÉDECIN: Invalid reset token:", result.reason);
        }
      }

      const tokenResult = this.tokenValid;
      const tokenInfo = this.tokenData;

      return `
        <main
          class="reset-password ${isMobile ? "mobile-app-page" : "website-page"}"
        >

          <!-- BACKGROUND -->
          <div
            class="reset-password__orb reset-password__orb--blue"
          ></div>
          <div
            class="reset-password__orb reset-password__orb--cyan"
          ></div>

          <!-- HEADER -->
          <header class="reset-password__header">
            <button
              id="resetPasswordBack"
              class="reset-password__back"
              type="button"
            >
              →
            </button>

            <div class="reset-password__header-copy">
              <strong>إعادة تعيين كلمة المرور</strong>
              <span>Mon Médecin</span>
            </div>

            <button
              id="resetPasswordTheme"
              class="reset-password__theme"
              type="button"
            >
              ${state.theme === "dark" ? "☀" : "◐"}
            </button>
          </header>

          <!-- CONTENT -->
          <section class="reset-password__container">

            <!-- HERO -->
            <section class="reset-password__hero">
              <span>🔐</span>
              <h1>إعادة تعيين كلمة المرور</h1>
              <p>
                أدخل كلمة مرور جديدة قوية لحسابك.
              </p>
            </section>

            <!-- MESSAGE -->
            <div
              id="resetPasswordMessage"
              class="reset-password-message"
              hidden
            ></div>

            <!-- CARD -->
            <section class="reset-password-card glass">

              ${this.completed
                ? this.renderSuccess()
                : (tokenResult === false
                    ? this.renderInvalid()
                    : (tokenResult === true
                        ? this.renderForm(tokenInfo)
                        : this.renderLoading()
                      )
                  )}

            </section>

          </section>

        </main>
      `;
    },

    renderLoading: function () {
      return `
        <div style="padding: 30px 10px; text-align: center;">
          <div style="
            width: 40px;
            height: 40px;
            margin: 0 auto;
            border: 3px solid rgba(66, 116, 217, 0.15);
            border-top-color: #4274d9;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "></div>
          <p style="margin-top: 14px; color: #8492a3; font-size: 10px;">
            جاري التحقق من الرابط...
          </p>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
    },

    renderForm: function (tokenInfo) {
      const roleLabel = {
        admin: "مدير",
        doctor: "طبيب",
        secretary: "سكرتير",
        patient: "مريض",
      };

      const role = roleLabel[tokenInfo?.role] || "مستخدم";

      return `
        <form id="resetPasswordForm" class="reset-password-form" novalidate>

          <div class="reset-password-card__icon">
            🔑
          </div>

          <h2>كلمة مرور جديدة</h2>
          <p>
            للحساب: ${this.escapeHTML(role)}<br>
            <span style="font-size:8px;color:#708197;">
              ${this.escapeHTML(tokenInfo?.identifier || "")}
            </span>
          </p>

          ${tokenInfo?.token ? `
            <div class="reset-password-token-info">
              <span>🔐</span>
              <span>${this.escapeHTML(tokenInfo.token)}</span>
            </div>
          ` : ''}

          <!-- NEW PASSWORD -->
          <label class="reset-password-field">
            <span>كلمة المرور الجديدة</span>
            <div class="reset-password-input">
              <input
                id="resetPasswordNew"
                type="password"
                autocomplete="new-password"
                placeholder="8 أحرف على الأقل"
                dir="ltr"
              />
              <button
                id="resetPasswordNewToggle"
                class="reset-password-toggle"
                type="button"
              >
                👁
              </button>
            </div>
          </label>

          <!-- CONFIRM PASSWORD -->
          <label class="reset-password-field">
            <span>تأكيد كلمة المرور الجديدة</span>
            <div class="reset-password-input">
              <input
                id="resetPasswordConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="أعد كتابة كلمة المرور"
                dir="ltr"
              />
              <button
                id="resetPasswordConfirmToggle"
                class="reset-password-toggle"
                type="button"
              >
                👁
              </button>
            </div>
          </label>

          <!-- REQUIREMENTS -->
          <div class="reset-password-requirements">
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
            id="resetPasswordSubmit"
            class="reset-password-submit"
            type="submit"
          >
            إعادة تعيين كلمة المرور
          </button>

          <!-- BACK TO LOGIN -->
          <button
            id="resetPasswordGoLogin"
            class="reset-password-back-login"
            type="button"
          >
            <span>←</span>
            <span>العودة إلى تسجيل الدخول</span>
          </button>

        </form>
      `;
    },

    renderSuccess: function () {
      return `
        <div class="reset-password-success">
          <span>✅</span>
          <h2>تم إعادة تعيين كلمة المرور</h2>
          <p>
            تم تغيير كلمة المرور الخاصة بحسابك بنجاح.
            يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
          </p>
          <button
            id="resetPasswordDone"
            class="reset-password-submit"
            type="button"
            style="margin-top:16px;"
          >
            الذهاب إلى تسجيل الدخول
          </button>
        </div>
      `;
    },

    renderInvalid: function () {
      return `
        <div class="reset-password-invalid">
          <span>🔒</span>
          <h2>الرابط غير صالح</h2>
          <p>
            رابط إعادة تعيين كلمة المرور غير صالح أو انتهت صلاحيته.
            يرجى طلب رابط جديد من صفحة "نسيت كلمة المرور".
          </p>
          <button
            id="resetPasswordInvalidGo"
            class="reset-password-submit"
            type="button"
            style="margin-top:16px;"
          >
            طلب رابط جديد
          </button>
        </div>
      `;
    },

    /* ==================================================
       HELPERS
       ================================================== */

    getTokenFromURL: function () {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : "");
      return params.get("token") || null;
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      // THEME
      document.getElementById("resetPasswordTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // BACK
      document.getElementById("resetPasswordBack")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // BACK TO LOGIN
      document.getElementById("resetPasswordGoLogin")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // DONE
      document.getElementById("resetPasswordDone")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // INVALID GO
      document.getElementById("resetPasswordInvalidGo")?.addEventListener("click", function () {
        app.navigate("/forgot-password");
      });

      // TOGGLE PASSWORD
      const toggles = [
        { id: "resetPasswordNewToggle", input: "resetPasswordNew" },
        { id: "resetPasswordConfirmToggle", input: "resetPasswordConfirm" },
      ];

      toggles.forEach(function (item) {
        document.getElementById(item.id)?.addEventListener("click", function () {
          ResetPasswordScreen.togglePassword(item.input, this);
        });
      });

      // REQUIREMENTS
      document.getElementById("resetPasswordNew")?.addEventListener("input", function () {
        ResetPasswordScreen.updateRequirements();
      });

      // FORM
      document.getElementById("resetPasswordForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        if (ResetPasswordScreen.loading) return;

        const newPassword = document.getElementById("resetPasswordNew")?.value || "";
        const confirmPassword = document.getElementById("resetPasswordConfirm")?.value || "";

        ResetPasswordScreen.loading = true;
        const submit = document.getElementById("resetPasswordSubmit");
        if (submit) {
          submit.disabled = true;
          submit.textContent = "⏳ جاري التغيير...";
        }

        setTimeout(function () {
          const success = ResetPasswordScreen.resetPassword(newPassword, confirmPassword);

          ResetPasswordScreen.loading = false;
          if (submit) {
            submit.disabled = false;
            submit.textContent = "إعادة تعيين كلمة المرور";
          }

          if (success) {
            setTimeout(function () {
              app.render();
            }, 500);
          }
        }, 300);
      });

      // ENTER KEY
      document.getElementById("resetPasswordConfirm")?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          document.getElementById("resetPasswordForm")?.dispatchEvent(new Event("submit"));
        }
      });
    },
  };

  /* ====================================================
     EXPOSE
     ==================================================== */

  window.ResetPasswordScreen = ResetPasswordScreen;

})();