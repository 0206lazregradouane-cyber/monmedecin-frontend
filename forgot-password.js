/* =====================================================
   MON MÉDECIN
   FORGOT PASSWORD SCREEN

   FILE:// COMPATIBLE VERSION

   FEATURES:
   - Enter email or phone
   - Find account across all roles
   - Send reset link (demo)
   - Success screen
   - Back to login

   SUPPORTS:
   - Admin
   - Doctor
   - Secretary
   - Patient
   ===================================================== */

(function () {
  "use strict";

  const ForgotPasswordScreen = {
    /* ==================================================
       STATE
       ================================================== */

    loading: false,
    sent: false,
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
       NORMALIZE
       ================================================== */

    normalizeEmail: function (value) {
      return String(value || "").trim().toLowerCase();
    },

    normalizePhone: function (value) {
      return String(value || "")
        .replace(/\s+/g, "")
        .replace(/-/g, "")
        .trim();
    },

    normalizeIdentifier: function (value) {
      const str = String(value || "").trim();
      if (str.includes("@")) {
        return { type: "email", value: this.normalizeEmail(str) };
      }
      return { type: "phone", value: this.normalizePhone(str) };
    },

    /* ==================================================
       FIND ACCOUNT
       ================================================== */

    findAccount: function (identifier) {
      const normalized = this.normalizeIdentifier(identifier);
      const target = normalized.value;

      if (!target) return null;

      const collections = [
        { role: "admin", key: "monmedecin-admins" },
        { role: "doctor", key: "monmedecin-doctors" },
        { role: "secretary", key: "monmedecin-secretaries" },
        { role: "patient", key: "monmedecin-patients" },
      ];

      for (const collection of collections) {
        const accounts = this.readJSON(localStorage, collection.key, []);
        if (!Array.isArray(accounts)) continue;

        const found = accounts.find(function (account) {
          if (!account) return false;

          if (normalized.type === "email") {
            const email = ForgotPasswordScreen.normalizeEmail(account.email);
            if (email && email === target) return true;
          }

          if (normalized.type === "phone") {
            const phone = ForgotPasswordScreen.normalizePhone(account.phone);
            if (phone && phone === target) return true;
          }

          return false;
        });

        if (found) {
          return {
            role: collection.role,
            account: found,
            identifier: normalized.type === "email" ? found.email : found.phone,
          };
        }
      }

      return null;
    },

    /* ==================================================
       SEND RESET LINK
       ================================================== */

    sendResetLink: function (identifier) {
      if (!identifier || String(identifier).trim().length < 3) {
        return {
          success: false,
          message: "أدخل بريداً إلكترونياً أو رقم هاتف صحيحاً.",
        };
      }

      const found = this.findAccount(identifier);

      if (!found) {
        return {
          success: false,
          message: "لم يتم العثور على حساب بهذه المعلومات.",
        };
      }

      // ================================================
      // DEMO: محاكاة إرسال رابط إعادة تعيين
      // ================================================

      const resetToken = "RESET-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();

      // حفظ طلب إعادة التعيين
      const resetRequests = this.readJSON(sessionStorage, "monmedecin-reset-requests", []);
      resetRequests.push({
        userId: found.account.id,
        role: found.role,
        token: resetToken,
        identifier: found.identifier,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 ساعة
        used: false,
      });
      this.writeJSON(sessionStorage, "monmedecin-reset-requests", resetRequests);

      // محاكاة إرسال البريد/الرسالة
      console.log("🔐 MON MÉDECIN: Reset link sent to", found.identifier);
      console.log("🔗 Reset token:", resetToken);
      console.log("📧 Simulated email to:", found.account.email || found.identifier);

      return {
        success: true,
        message:
          "تم إرسال رابط إعادة تعيين كلمة المرور إلى " +
          found.identifier +
          ". يرجى التحقق من بريدك الإلكتروني أو هاتفك.",
        account: found.account,
        role: found.role,
        identifier: found.identifier,
        token: resetToken,
      };
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("forgotPasswordMessage");
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
      }, 5000);
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      const isMobile = state.deviceMode === "mobile";

      return `
        <main
          class="forgot-password ${isMobile ? "mobile-app-page" : "website-page"}"
        >

          <!-- BACKGROUND -->
          <div
            class="forgot-password__orb forgot-password__orb--blue"
          ></div>
          <div
            class="forgot-password__orb forgot-password__orb--cyan"
          ></div>

          <!-- HEADER -->
          <header class="forgot-password__header">
            <button
              id="forgotPasswordBack"
              class="forgot-password__back"
              type="button"
            >
              →
            </button>

            <div class="forgot-password__header-copy">
              <strong>استعادة كلمة المرور</strong>
              <span>Mon Médecin</span>
            </div>

            <button
              id="forgotPasswordTheme"
              class="forgot-password__theme"
              type="button"
            >
              ${state.theme === "dark" ? "☀" : "◐"}
            </button>
          </header>

          <!-- CONTENT -->
          <section class="forgot-password__container">

            <!-- HERO -->
            <section class="forgot-password__hero">
              <span>🔑</span>
              <h1>نسيت كلمة المرور؟</h1>
              <p>
                أدخل بريدك الإلكتروني أو رقم هاتفك وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
              </p>
            </section>

            <!-- MESSAGE -->
            <div
              id="forgotPasswordMessage"
              class="forgot-password-message"
              hidden
            ></div>

            <!-- CARD -->
            <section class="forgot-password-card glass">

              ${this.sent ? this.renderSuccess() : this.renderForm()}

            </section>

          </section>

        </main>
      `;
    },

    renderForm: function () {
      return `
        <form id="forgotPasswordForm" class="forgot-password-form" novalidate>

          <div class="forgot-password-card__icon">
            🔒
          </div>

          <h2>استعادة الحساب</h2>
          <p>
            سنرسل لك رابطاً لإعادة تعيين كلمة المرور عبر البريد الإلكتروني أو الهاتف.
          </p>

          <!-- IDENTIFIER -->
          <label class="forgot-password-field" style="margin-top:16px;">
            <span>البريد الإلكتروني أو رقم الهاتف</span>
            <div class="forgot-password-input">
              <span>📧</span>
              <input
                id="forgotPasswordIdentifier"
                type="text"
                autocomplete="username"
                placeholder="example@email.com أو 0550 12 34 56"
                dir="ltr"
              />
            </div>
          </label>

          <!-- SUBMIT -->
          <button
            id="forgotPasswordSubmit"
            class="forgot-password-submit"
            type="submit"
          >
            إرسال رابط إعادة التعيين
          </button>

          <!-- BACK TO LOGIN -->
          <button
            id="forgotPasswordGoLogin"
            class="forgot-password-back-login"
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
        <div class="forgot-password-success">
          <span>📨</span>
          <h2>تم إرسال رابط إعادة التعيين</h2>
          <p>
            تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني أو هاتفك.
            يرجى التحقق من صندوق الوارد واتباع التعليمات.
          </p>
          <button
            id="forgotPasswordDone"
            class="forgot-password-submit"
            type="button"
            style="margin-top:16px;"
          >
            العودة إلى تسجيل الدخول
          </button>
        </div>
      `;
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      // BACK
      document.getElementById("forgotPasswordBack")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // THEME
      document.getElementById("forgotPasswordTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // BACK TO LOGIN
      document.getElementById("forgotPasswordGoLogin")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // DONE
      document.getElementById("forgotPasswordDone")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // FORM
      document.getElementById("forgotPasswordForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        if (ForgotPasswordScreen.loading) return;

        const identifier = document.getElementById("forgotPasswordIdentifier")?.value || "";

        ForgotPasswordScreen.loading = true;
        const submit = document.getElementById("forgotPasswordSubmit");
        if (submit) {
          submit.disabled = true;
          submit.textContent = "⏳ جاري الإرسال...";
        }

        setTimeout(function () {
          const result = ForgotPasswordScreen.sendResetLink(identifier);

          ForgotPasswordScreen.loading = false;
          if (submit) {
            submit.disabled = false;
            submit.textContent = "إرسال رابط إعادة التعيين";
          }

          if (result.success) {
            ForgotPasswordScreen.sent = true;
            ForgotPasswordScreen.showMessage(result.message, "success");
            app.render();
          } else {
            ForgotPasswordScreen.showMessage(result.message, "error");
          }
        }, 400);
      });

      // ENTER KEY
      document.getElementById("forgotPasswordIdentifier")?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          document.getElementById("forgotPasswordForm")?.dispatchEvent(new Event("submit"));
        }
      });
    },
  };

  /* ====================================================
     EXPOSE
     ==================================================== */

  window.ForgotPasswordScreen = ForgotPasswordScreen;

})();