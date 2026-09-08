/* =====================================================
   MON MÉDECIN
   SECRETARY PROFILE - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const SecretaryProfileScreen = {


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
        const saved = storage.getItem(key);
        if (!saved) return fallback;
        return JSON.parse(saved);
      } catch (error) {
        console.warn("MON MÉDECIN: تعذر قراءة", key);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN: تعذر حفظ", key);
        return false;
      }
    },


    /* ==================================================
       DEFAULT SECRETARY
       ================================================== */

    getDefaultSecretary: function () {
      return {
        id: "SEC-001",
        doctorId: 1,
        doctor_id: 1,
        firstName: "سمية",
        lastName: "بن صالح",
        fullName: "سمية بن صالح",
        phone: "",
        email: "",
        role: "secretary",
        active: true,
        permissions: {
          viewAppointments: true,
          confirmAppointments: true,
          cancelAppointments: false,
          confirmArrival: true,
          markNoShow: false,
          viewPatients: true,
          manageSchedule: false,
          editDoctorProfile: false
        }
      };
    },


    /* ==================================================
       LOAD SECRETARY
       ================================================== */

    loadSecretary: function (state) {
      let secretary = null;

      if (state && state.secretary && typeof state.secretary === "object") {
        secretary = state.secretary;
      }

      if (!secretary) {
        secretary = this.readJSON(sessionStorage, "monmedecin-secretary-session", null);
      }

      if (!secretary && state && state.user && state.user.role === "secretary") {
        secretary = state.user;
      }

      if (!secretary) {
        secretary = this.readJSON(localStorage, "monmedecin-doctor-secretary", null);
      }

      const defaults = this.getDefaultSecretary();

      this.secretary = {
        ...defaults,
        ...(secretary && typeof secretary === "object" ? secretary : {}),
        permissions: {
          ...defaults.permissions,
          ...(secretary && secretary.permissions ? secretary.permissions : {})
        }
      };

      return this.secretary;
    },


    /* ==================================================
       DOCTOR ID
       ================================================== */

    getDoctorId: function () {
      if (this.secretary.doctorId !== undefined && this.secretary.doctorId !== null) {
        return this.secretary.doctorId;
      }
      if (this.secretary.doctor_id !== undefined && this.secretary.doctor_id !== null) {
        return this.secretary.doctor_id;
      }
      return 1;
    },


    /* ==================================================
       LOAD DOCTOR
       ================================================== */

    loadDoctor: function () {
      const doctorId = this.getDoctorId();

      let doctor = null;

      const doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (Array.isArray(doctors)) {
        doctor = doctors.find(function (item) {
          return String(item.id) === String(doctorId);
        }) || null;
      }

      if (!doctor) {
        const currentDoctor = this.readJSON(localStorage, "monmedecin-doctor", null);
        if (currentDoctor && String(currentDoctor.id) === String(doctorId)) {
          doctor = currentDoctor;
        }
      }

      if (!doctor) {
        doctor = {
          id: doctorId,
          fullName: "الطبيب",
          specialty: "",
          clinic: ""
        };
      }

      this.doctor = doctor;
      return doctor;
    },


    /* ==================================================
       SECRETARY NAME
       ================================================== */

    getFullName: function () {
      return this.secretary.fullName ||
        [this.secretary.firstName, this.secretary.lastName].filter(Boolean).join(" ") ||
        "السكرتارية";
    },


    /* ==================================================
       PHONE NORMALIZATION
       ================================================== */

    normalizePhone: function (value) {
      return String(value || "").replace(/\s+/g, "").replace(/-/g, "");
    },

    isValidPhone: function (value) {
      if (!value) return true;
      return /^0[567][0-9]{8}$/.test(this.normalizePhone(value));
    },

    isValidEmail: function (value) {
      if (!value) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },


    /* ==================================================
       PERMISSION LABEL
       ================================================== */

    getPermissionLabel: function (key) {
      const labels = {
        viewAppointments: "عرض المواعيد",
        confirmAppointments: "تأكيد الحجوزات",
        cancelAppointments: "إلغاء المواعيد",
        confirmArrival: "تسجيل وصول المريض",
        markNoShow: "تسجيل عدم الحضور",
        viewPatients: "عرض المرضى",
        manageSchedule: "إدارة جدول الطبيب",
        editDoctorProfile: "تعديل الملف المهني"
      };
      return labels[key] || key;
    },


    /* ==================================================
       ACTIVE PERMISSIONS
       ================================================== */

    getActivePermissions: function () {
      return Object.entries(this.secretary.permissions || {})
        .filter(function ([key, enabled]) { return enabled === true; })
        .map(function ([key]) { return key; });
    },


    /* ==================================================
       READ FORM
       ================================================== */

    readForm: function () {
      const firstName = document.getElementById("secretaryProfileFirstName");
      const lastName = document.getElementById("secretaryProfileLastName");
      const phone = document.getElementById("secretaryProfilePhone");
      const email = document.getElementById("secretaryProfileEmail");

      this.secretary.firstName = String(firstName?.value || "").trim();
      this.secretary.lastName = String(lastName?.value || "").trim();
      this.secretary.fullName = [this.secretary.firstName, this.secretary.lastName].filter(Boolean).join(" ");
      this.secretary.phone = this.normalizePhone(phone?.value);
      this.secretary.email = String(email?.value || "").trim();
    },


    /* ==================================================
       VALIDATE
       ================================================== */

    validate: function () {
      if (!this.secretary.firstName) {
        return { valid: false, message: "أدخل الاسم." };
      }
      if (!this.secretary.lastName) {
        return { valid: false, message: "أدخل اللقب." };
      }
      if (!this.isValidPhone(this.secretary.phone)) {
        return { valid: false, message: "رقم الهاتف غير صحيح." };
      }
      if (!this.isValidEmail(this.secretary.email)) {
        return { valid: false, message: "البريد الإلكتروني غير صحيح." };
      }
      return { valid: true };
    },


    /* ==================================================
       SAVE SECRETARY
       ================================================== */

    save: function (app) {
      this.readForm();

      const validation = this.validate();
      if (!validation.valid) {
        this.showMessage(validation.message, "error");
        return false;
      }

      const now = new Date().toISOString();
      this.secretary.updatedAt = now;

      const doctorId = this.getDoctorId();
      this.secretary.doctorId = doctorId;
      this.secretary.doctor_id = doctorId;

      // Save to doctor-specific storage
      this.writeJSON(localStorage, `monmedecin-doctor-secretary-${doctorId}`, this.secretary);

      // Save to legacy storage
      this.writeJSON(localStorage, "monmedecin-doctor-secretary", this.secretary);

      // Save to registry
      let secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
      if (!Array.isArray(secretaries)) secretaries = [];

      const index = secretaries.findIndex(function (secretary) {
        return String(secretary.id) === String(this.secretary.id);
      }, this);

      if (index >= 0) {
        secretaries[index] = { ...this.secretary, updatedAt: now };
      } else {
        secretaries.push({ ...this.secretary, createdAt: now, updatedAt: now });
      }

      this.writeJSON(localStorage, "monmedecin-secretaries", secretaries);

      // Save to session
      this.writeJSON(sessionStorage, "monmedecin-secretary-session", this.secretary);

      // Update app state
      if (app && app.state) {
        app.state.secretary = this.secretary;
        if (app.state.user && app.state.user.role === "secretary") {
          app.state.user = { ...app.state.user, ...this.secretary };
        }
      }

      this.showMessage("تم حفظ بيانات الحساب بنجاح ✓", "success");
      return true;
    },


    /* ==================================================
       LOGOUT
       ================================================== */

    logout: function (app) {
      try {
        sessionStorage.removeItem("monmedecin-secretary-session");
      } catch (error) { /* no-op */ }

      if (app.state) {
        app.state.secretary = null;
        if (app.state.user && app.state.user.role === "secretary") {
          app.state.user = null;
        }
      }

      app.navigate("/login");
    },


    /* ==================================================
       SHOW MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("secretaryProfileMessage");
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
       RENDER PERMISSIONS
       ================================================== */

    renderPermissions: function () {
      const permissions = this.secretary.permissions || {};

      return Object.keys(permissions).map(function (key) {
        const enabled = permissions[key] === true;

        return `
          <div class="secretary-profile-permission ${enabled ? "is-enabled" : "is-disabled"}">
            <span>${enabled ? "✓" : "×"}</span>
            <div>
              <strong>${SecretaryProfileScreen.getPermissionLabel(key)}</strong>
              <small>${enabled ? "مسموح" : "غير مسموح"}</small>
            </div>
          </div>
        `;
      }).join("");
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state) {
      this.loadSecretary(state);
      this.loadDoctor();

      const isMobile = state.deviceMode === "mobile";

      const fullName = this.getFullName();
      const activePermissions = this.getActivePermissions().length;

      return `
        <main class="secretary-profile ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="secretary-profile__orb secretary-profile__orb--blue"></div>
          <div class="secretary-profile__orb secretary-profile__orb--purple"></div>

          <header class="secretary-profile__header">
            <button id="secretaryProfileBack" class="secretary-profile__back" type="button">→</button>
            <div class="secretary-profile__header-copy">
              <strong>حسابي</strong>
              <span>حساب السكرتارية</span>
            </div>
            <button id="secretaryProfileTheme" class="secretary-profile__theme" type="button">◐</button>
          </header>

          <section class="secretary-profile__container">

            <section class="secretary-profile-card glass">
              <div class="secretary-profile-card__avatar">${fullName.charAt(0)}</div>
              <div class="secretary-profile-card__identity">
                <span>السكرتارية</span>
                <h1>${fullName}</h1>
                <small>${this.secretary.phone || "بدون رقم هاتف"}</small>
              </div>
              <span class="secretary-profile-status ${this.secretary.active ? "is-active" : "is-inactive"}">
                ${this.secretary.active ? "الحساب نشط" : "الحساب متوقف"}
              </span>
            </section>

            <section class="secretary-profile-doctor glass">
              <div class="secretary-profile-doctor__icon">✚</div>
              <div>
                <span>الطبيب المرتبط بالحساب</span>
                <strong>${this.doctor.fullName || "الطبيب"}</strong>
                <small>${this.doctor.specialty || ""}${this.doctor.clinic ? ` • ${this.doctor.clinic}` : ""}</small>
              </div>
              <b>ID ${this.getDoctorId()}</b>
            </section>

            <section class="secretary-profile-stats">
              <article class="secretary-profile-stat glass">
                <span>الصلاحيات المفعلة</span>
                <strong>${activePermissions}</strong>
              </article>
              <article class="secretary-profile-stat glass">
                <span>نوع الحساب</span>
                <strong>سكرتارية</strong>
              </article>
              <article class="secretary-profile-stat glass">
                <span>الحالة</span>
                <strong>${this.secretary.active ? "نشط" : "متوقف"}</strong>
              </article>
            </section>

            <section class="secretary-profile-section glass">
              <div class="secretary-profile-section__heading">
                <span>البيانات</span>
                <h2>معلومات الحساب</h2>
              </div>
              <div class="secretary-profile-form">
                <label class="secretary-profile-field">
                  <span>الاسم</span>
                  <input id="secretaryProfileFirstName" type="text" value="${this.secretary.firstName || ""}" maxlength="60">
                </label>
                <label class="secretary-profile-field">
                  <span>اللقب</span>
                  <input id="secretaryProfileLastName" type="text" value="${this.secretary.lastName || ""}" maxlength="60">
                </label>
                <label class="secretary-profile-field">
                  <span>الهاتف</span>
                  <input id="secretaryProfilePhone" type="tel" value="${this.secretary.phone || ""}" maxlength="10" inputmode="tel" dir="ltr" placeholder="05XXXXXXXX">
                </label>
                <label class="secretary-profile-field">
                  <span>البريد الإلكتروني</span>
                  <input id="secretaryProfileEmail" type="email" value="${this.secretary.email || ""}" dir="ltr" placeholder="email@example.com">
                </label>
              </div>
            </section>

            <section class="secretary-profile__section">
              <div class="secretary-profile-section__heading">
                <span>صلاحيات الحساب</span>
                <h2>ما يسمح به الطبيب</h2>
              </div>
              <div class="secretary-profile-permissions">
                ${this.renderPermissions()}
              </div>
            </section>

            <section class="secretary-profile-info glass">
              <span>🔒</span>
              <div>
                <strong>الصلاحيات يحددها الطبيب</strong>
                <p>يمكنك تعديل بيانات حسابك الشخصية، لكن صلاحيات الوصول إلى المواعيد والمرضى والجدول يحددها الطبيب المرتبط بالحساب.</p>
              </div>
            </section>

            <div id="secretaryProfileMessage" class="secretary-profile-message" hidden></div>

            <div class="secretary-profile-actions">
              <button id="secretaryProfileLogout" class="secretary-profile-actions__logout" type="button">تسجيل الخروج</button>
              <button id="secretaryProfileSave" class="secretary-profile-actions__save" type="button">حفظ التعديلات</button>
            </div>

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
                <span>المواعيد</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="patients" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>المرضى</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="profile" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>حسابي</span>
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
      document.getElementById("secretaryProfileBack")?.addEventListener("click", function () {
        app.navigate("/secretary/dashboard");
      });

      document.getElementById("secretaryProfileTheme")?.addEventListener("click", function () {
        app.toggleTheme();
      });

      const save = document.getElementById("secretaryProfileSave");
      save?.addEventListener("click", function () {
        const saved = SecretaryProfileScreen.save(app);
        if (!saved) return;

        save.disabled = true;
        const original = save.textContent;
        save.textContent = "تم الحفظ ✓";

        setTimeout(function () {
          if (document.body.contains(save)) {
            save.disabled = false;
            save.textContent = original;
          }
        }, 1000);

        setTimeout(function () {
          app.render();
        }, 500);
      });

      document.getElementById("secretaryProfileLogout")?.addEventListener("click", function () {
        const confirmed = window.confirm("هل تريد تسجيل الخروج؟");
        if (confirmed) {
          SecretaryProfileScreen.logout(app);
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
      document.querySelectorAll("[data-nav='profile']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/profile");
        });
      });
    }

  };


  window.SecretaryProfileScreen = SecretaryProfileScreen;

})();