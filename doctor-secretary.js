/* =====================================================
   MON MÉDECIN
   DOCTOR SECRETARY - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const DoctorSecretaryScreen = {


    /* ==================================================
       STATE
       ================================================== */

    secretaries: [],

    selectedSecretaryId: null,

    editorOpen: false,

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
        console.warn("MON MÉDECIN DOCTOR SECRETARY:", "Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN DOCTOR SECRETARY:", "Cannot write", key, error);
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
       DOCTOR
       ================================================== */

    getDoctor: function (app) {
      return app.state.doctor || app.state.user || null;
    },

    getDoctorId: function (app) {
      const doctor = this.getDoctor(app);
      return doctor?.id ?? doctor?.doctor_id ?? app.getDoctorId?.() ?? null;
    },


    /* ==================================================
       CREATE ID
       ================================================== */

    createSecretaryId: function () {
      return "SECRETARY-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    },


    /* ==================================================
       GET ALL SECRETARIES
       ================================================== */

    getAllSecretaries: function () {
      let secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
      if (!Array.isArray(secretaries)) secretaries = [];
      return secretaries;
    },


    /* ==================================================
       LOAD SCOPED
       ================================================== */

    loadSecretaries: function (app) {
      const doctorId = this.getDoctorId(app);
      if (!doctorId) {
        this.secretaries = [];
        return [];
      }

      this.secretaries = this.getAllSecretaries()
        .filter(function (secretary) {
          return String(secretary.doctor_id || secretary.doctorId) === String(doctorId);
        })
        .sort(function (a, b) {
          return String(a.fullName || a.name || "").localeCompare(String(b.fullName || b.name || ""), "ar");
        });

      return this.secretaries;
    },


    /* ==================================================
       FIND SECRETARY
       ================================================== */

    findSecretary: function (secretaryId) {
      return this.secretaries.find(function (secretary) {
        return String(secretary.id || secretary.secretary_id) === String(secretaryId);
      }) || null;
    },


    /* ==================================================
       OPEN / CLOSE EDITOR
       ================================================== */

    openEditor: function (secretaryId, app) {
      this.selectedSecretaryId = secretaryId || null;
      this.editorOpen = true;
      app.render();
    },

    closeEditor: function (app) {
      this.selectedSecretaryId = null;
      this.editorOpen = false;
      app.render();
    },


    /* ==================================================
       PHONE NORMALIZATION
       ================================================== */

    normalizePhone: function (phone) {
      return String(phone || "").replace(/\s+/g, "").replace(/-/g, "").trim();
    },

    isValidPhone: function (phone) {
      const normalized = this.normalizePhone(phone);
      return /^0[5-7][0-9]{8}$/.test(normalized);
    },

    isValidPassword: function (password) {
      return String(password || "").length >= 6;
    },


    /* ==================================================
       CHECK PHONE UNIQUE
       ================================================== */

    phoneExists: function (phone, excludeSecretaryId) {
      const normalized = this.normalizePhone(phone);
      const secretaries = this.getAllSecretaries();

      const secretaryExists = secretaries.some(function (secretary) {
        const id = secretary.id || secretary.secretary_id;
        if (excludeSecretaryId && String(id) === String(excludeSecretaryId)) return false;
        return DoctorSecretaryScreen.normalizePhone(secretary.phone) === normalized;
      });
      if (secretaryExists) return true;

      let patients = this.readJSON(localStorage, "monmedecin-patients", []);
      if (!Array.isArray(patients)) patients = [];
      if (patients.some(function (patient) {
        return DoctorSecretaryScreen.normalizePhone(patient.phone) === normalized;
      })) return true;

      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) doctors = [];
      return doctors.some(function (doctor) {
        return DoctorSecretaryScreen.normalizePhone(doctor.phone) === normalized;
      });
    },


    /* ==================================================
       VALIDATE DATA
       ================================================== */

    validateSecretary: function (data, editing) {
      if (!data.fullName || data.fullName.length < 2) {
        return { valid: false, message: "أدخل اسم السكرتير أو السكرتيرة." };
      }
      if (!this.isValidPhone(data.phone)) {
        return { valid: false, message: "رقم الهاتف غير صحيح. استخدم رقمًا جزائريًا مثل 0550123456." };
      }
      if (this.phoneExists(data.phone, editing ? this.selectedSecretaryId : null)) {
        return { valid: false, message: "رقم الهاتف مستخدم في حساب آخر." };
      }
      if (!editing && !this.isValidPassword(data.password)) {
        return { valid: false, message: "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل." };
      }
      if (editing && data.password && !this.isValidPassword(data.password)) {
        return { valid: false, message: "كلمة المرور الجديدة يجب أن تحتوي على 6 أحرف على الأقل." };
      }
      return { valid: true };
    },


    /* ==================================================
       SAVE SECRETARY
       ================================================== */

    saveSecretary: function (data, app) {
      const doctor = this.getDoctor(app);
      const doctorId = this.getDoctorId(app);

      if (!doctor || !doctorId) {
        this.showMessage("تعذر تحديد حساب الطبيب.", "error");
        return false;
      }

      const editing = Boolean(this.selectedSecretaryId);
      const validation = this.validateSecretary(data, editing);
      if (!validation.valid) {
        this.showMessage(validation.message, "error");
        return false;
      }

      let secretaries = this.getAllSecretaries();
      const now = new Date().toISOString();

      if (editing) {
        const index = secretaries.findIndex(function (secretary) {
          return String(secretary.id || secretary.secretary_id) === String(this.selectedSecretaryId) &&
                 String(secretary.doctor_id || secretary.doctorId) === String(doctorId);
        }, this);

        if (index < 0) {
          this.showMessage("تعذر العثور على حساب السكرتير.", "error");
          return false;
        }

        const previous = secretaries[index];
        secretaries[index] = {
          ...previous,
          fullName: data.fullName,
          name: data.fullName,
          phone: this.normalizePhone(data.phone),
          email: data.email,
          gender: data.gender,
          active: data.active,
          permissions: {
            appointments: Boolean(data.permissions.appointments),
            patients: Boolean(data.permissions.patients),
            schedule: Boolean(data.permissions.schedule),
            services: false,
            doctorProfile: false,
            financial: false
          },
          updatedAt: now
        };

        if (data.password) {
          secretaries[index].password = data.password;
          secretaries[index].passwordUpdatedAt = now;
        }

      } else {
        const id = this.createSecretaryId();
        secretaries.push({
          id: id,
          secretary_id: id,
          role: "secretary",
          doctor_id: doctorId,
          doctorId: doctorId,
          doctorName: doctor.fullName || doctor.name || "Doctor",
          fullName: data.fullName,
          name: data.fullName,
          phone: this.normalizePhone(data.phone),
          email: data.email,
          password: data.password,
          gender: data.gender,
          active: data.active,
          status: data.active ? "active" : "inactive",
          permissions: {
            appointments: Boolean(data.permissions.appointments),
            patients: Boolean(data.permissions.patients),
            schedule: Boolean(data.permissions.schedule),
            services: false,
            doctorProfile: false,
            financial: false
          },
          createdByRole: "doctor",
          createdByDoctorId: doctorId,
          createdAt: now,
          updatedAt: now
        });
      }

      const saved = this.writeJSON(localStorage, "monmedecin-secretaries", secretaries);
      if (!saved) {
        this.showMessage("تعذر حفظ حساب السكرتير.", "error");
        return false;
      }

      this.loadSecretaries(app);
      this.selectedSecretaryId = null;
      this.editorOpen = false;
      this.showMessage(editing ? "تم تحديث حساب السكرتير." : "تم إنشاء حساب السكرتير بنجاح.", "success");
      return true;
    },


    /* ==================================================
       TOGGLE ACTIVE
       ================================================== */

    toggleActive: function (secretaryId, app) {
      const doctorId = this.getDoctorId(app);
      let secretaries = this.getAllSecretaries();

      const index = secretaries.findIndex(function (secretary) {
        return String(secretary.id || secretary.secretary_id) === String(secretaryId) &&
               String(secretary.doctor_id || secretary.doctorId) === String(doctorId);
      });

      if (index < 0) {
        this.showMessage("الحساب غير موجود.", "error");
        return false;
      }

      const active = secretaries[index].active === false;
      secretaries[index] = {
        ...secretaries[index],
        active: active,
        status: active ? "active" : "inactive",
        updatedAt: new Date().toISOString()
      };

      const saved = this.writeJSON(localStorage, "monmedecin-secretaries", secretaries);
      if (!saved) {
        this.showMessage("تعذر تحديث الحساب.", "error");
        return false;
      }

      this.loadSecretaries(app);
      this.showMessage(active ? "تم تفعيل حساب السكرتير." : "تم تعطيل حساب السكرتير.", "success");
      return true;
    },


    /* ==================================================
       DELETE SECRETARY
       ================================================== */

    deleteSecretary: function (secretaryId, app) {
      const doctorId = this.getDoctorId(app);

      const exists = this.secretaries.some(function (secretary) {
        return String(secretary.id || secretary.secretary_id) === String(secretaryId) &&
               String(secretary.doctor_id || secretary.doctorId) === String(doctorId);
      });

      if (!exists) {
        this.showMessage("الحساب غير موجود.", "error");
        return false;
      }

      const confirmed = window.confirm("هل تريد حذف حساب السكرتير نهائيًا؟");
      if (!confirmed) return false;

      let secretaries = this.getAllSecretaries();
      secretaries = secretaries.filter(function (secretary) {
        return !(String(secretary.id || secretary.secretary_id) === String(secretaryId) &&
                 String(secretary.doctor_id || secretary.doctorId) === String(doctorId));
      });

      const saved = this.writeJSON(localStorage, "monmedecin-secretaries", secretaries);
      if (!saved) {
        this.showMessage("تعذر حذف الحساب.", "error");
        return false;
      }

      this.loadSecretaries(app);
      this.showMessage("تم حذف حساب السكرتير.", "success");
      return true;
    },


    /* ==================================================
       STATS
       ================================================== */

    getStats: function () {
      return {
        total: this.secretaries.length,
        active: this.secretaries.filter(function (secretary) { return secretary.active !== false; }).length,
        inactive: this.secretaries.filter(function (secretary) { return secretary.active === false; }).length
      };
    },


    /* ==================================================
       PERMISSION LABELS
       ================================================== */

    getPermissionsList: function (secretary) {
      const permissions = secretary.permissions || {};
      const labels = [];
      if (permissions.appointments) labels.push("المواعيد");
      if (permissions.patients) labels.push("المرضى");
      if (permissions.schedule) labels.push("الجدول");
      return labels;
    },


    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("doctorSecretaryMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = "doctor-secretary-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 3500);
    },


    /* ==================================================
       RENDER SECRETARY CARD
       ================================================== */

    renderSecretary: function (secretary) {
      const secretaryId = secretary.id || secretary.secretary_id;
      const active = secretary.active !== false;
      const permissions = this.getPermissionsList(secretary);

      return `
        <article class="doctor-secretary-card glass ${active ? "" : "is-disabled"}">
          <div class="doctor-secretary-card__top">
            <div class="doctor-secretary-card__person">
              <div class="doctor-secretary-card__avatar">
                ${this.escapeHTML(String(secretary.fullName || secretary.name || "س").charAt(0))}
              </div>
              <div>
                <span>${secretary.gender === "female" ? "سكرتيرة" : "سكرتير"}</span>
                <h3>${this.escapeHTML(secretary.fullName || secretary.name || "سكرتير")}</h3>
                <small dir="ltr">${this.escapeHTML(secretary.phone || "")}</small>
              </div>
            </div>
            <span class="doctor-secretary-status ${active ? "is-active" : "is-inactive"}">
              ${active ? "نشط" : "متوقف"}
            </span>
          </div>
          ${secretary.email ? `
            <div class="doctor-secretary-card__email" dir="ltr">${this.escapeHTML(secretary.email)}</div>
          ` : ""}
          <div class="doctor-secretary-card__permissions">
            <span>الصلاحيات</span>
            <div>
              ${permissions.length ? permissions.map(function(permission) {
                return `<b>${this.escapeHTML(permission)}</b>`;
              }, this).join("") : `<small>لا توجد صلاحيات تشغيلية.</small>`}
            </div>
          </div>
          <div class="doctor-secretary-card__actions">
            <button type="button" class="doctor-secretary-action is-edit" data-doctor-secretary-edit="${this.escapeHTML(secretaryId)}">تعديل</button>
            <button type="button" class="doctor-secretary-action is-toggle" data-doctor-secretary-toggle="${this.escapeHTML(secretaryId)}">${active ? "تعطيل" : "تفعيل"}</button>
            <button type="button" class="doctor-secretary-action is-delete" data-doctor-secretary-delete="${this.escapeHTML(secretaryId)}">حذف</button>
          </div>
        </article>
      `;
    },


    /* ==================================================
       RENDER SECRETARIES LIST
       ================================================== */

    renderSecretaries: function () {
      if (this.secretaries.length === 0) {
        return `
          <section class="doctor-secretary-empty glass">
            <span>👤</span>
            <h3>لا يوجد سكرتير</h3>
            <p>أضف حساب سكرتير أو سكرتيرة لمساعدتك في إدارة العيادة.</p>
            <button id="doctorSecretaryEmptyAdd" type="button">إضافة سكرتير</button>
          </section>
        `;
      }

      return this.secretaries.map(function (secretary) {
        return DoctorSecretaryScreen.renderSecretary(secretary);
      }).join("");
    },


    /* ==================================================
       RENDER EDITOR
       ================================================== */

    renderEditor: function () {
      if (!this.editorOpen) return "";

      const secretary = this.selectedSecretaryId ? this.findSecretary(this.selectedSecretaryId) : null;
      const editing = Boolean(secretary);
      const permissions = secretary?.permissions || {};

      return `
        <div class="doctor-secretary-modal-overlay">
          <section class="doctor-secretary-modal glass">
            <header class="doctor-secretary-modal__header">
              <div>
                <span>${editing ? "تعديل الحساب" : "حساب جديد"}</span>
                <h2>${editing ? "تعديل السكرتير" : "إضافة سكرتير"}</h2>
              </div>
              <button id="doctorSecretaryModalClose" type="button">×</button>
            </header>
            <div class="doctor-secretary-modal__note">
              <span>🔐</span>
              <p>هذا الحساب سيدخل من شاشة تسجيل الدخول العادية، وسيتم ربطه تلقائيًا بحسابك كطبيب.</p>
            </div>
            <form id="doctorSecretaryForm" class="doctor-secretary-form" novalidate>
              <label class="doctor-secretary-field">
                <span>الاسم الكامل</span>
                <input id="doctorSecretaryName" type="text" maxlength="100" value="${this.escapeHTML(secretary?.fullName || secretary?.name || "")}" placeholder="اسم السكرتير أو السكرتيرة">
              </label>
              <label class="doctor-secretary-field">
                <span>رقم الهاتف</span>
                <input id="doctorSecretaryPhone" type="tel" inputmode="tel" maxlength="10" dir="ltr" value="${this.escapeHTML(secretary?.phone || "")}" placeholder="0550123456">
              </label>
              <label class="doctor-secretary-field">
                <span>البريد الإلكتروني</span>
                <input id="doctorSecretaryEmail" type="email" dir="ltr" maxlength="150" value="${this.escapeHTML(secretary?.email || "")}" placeholder="secretary@example.com">
              </label>
              <label class="doctor-secretary-field">
                <span>النوع</span>
                <select id="doctorSecretaryGender">
                  <option value="male" ${secretary?.gender !== "female" ? "selected" : ""}>سكرتير</option>
                  <option value="female" ${secretary?.gender === "female" ? "selected" : ""}>سكرتيرة</option>
                </select>
              </label>
              <label class="doctor-secretary-field">
                <span>${editing ? "كلمة مرور جديدة — اختياري" : "كلمة المرور"}</span>
                <div class="doctor-secretary-password">
                  <input id="doctorSecretaryPassword" type="password" autocomplete="new-password" minlength="6" placeholder="${editing ? "اتركها فارغة للإبقاء على الحالية" : "6 أحرف على الأقل"}">
                  <button id="doctorSecretaryPasswordToggle" type="button">👁</button>
                </div>
              </label>
              <label class="doctor-secretary-active">
                <div>
                  <strong>الحساب نشط</strong>
                  <span>الحساب المتوقف لا يستطيع تسجيل الدخول.</span>
                </div>
                <input id="doctorSecretaryActive" type="checkbox" ${secretary?.active === false ? "" : "checked"}>
              </label>
              <section class="doctor-secretary-permissions">
                <header>
                  <span>صلاحيات الحساب</span>
                  <h3>ماذا يستطيع السكرتير إدارةه؟</h3>
                </header>
                <label class="doctor-secretary-permission">
                  <div>
                    <strong>المواعيد</strong>
                    <span>تأكيد، رفض، تسجيل الوصول وإدارة الحجوزات.</span>
                  </div>
                  <input id="doctorSecretaryPermissionAppointments" type="checkbox" ${permissions.appointments === false ? "" : "checked"}>
                </label>
                <label class="doctor-secretary-permission">
                  <div>
                    <strong>المرضى</strong>
                    <span>الاطلاع على قائمة مرضى الطبيب والبيانات الإدارية المسموحة.</span>
                  </div>
                  <input id="doctorSecretaryPermissionPatients" type="checkbox" ${permissions.patients === true ? "checked" : ""}>
                </label>
                <label class="doctor-secretary-permission">
                  <div>
                    <strong>جدول العمل</strong>
                    <span>تعديل أيام وساعات العمل والفاصل بين الحجوزات.</span>
                  </div>
                  <input id="doctorSecretaryPermissionSchedule" type="checkbox" ${permissions.schedule === true ? "checked" : ""}>
                </label>
              </section>
              <div class="doctor-secretary-locked">
                <span>🛡</span>
                <p>الخدمات الطبية، الملف المهني للطبيب، والمعلومات المالية تبقى تحت تحكم الطبيب فقط.</p>
              </div>
              <button class="doctor-secretary-save" type="submit">${editing ? "حفظ التعديلات" : "إنشاء الحساب"}</button>
            </form>
          </section>
        </div>
      `;
    },


    /* ==================================================
       GET FORM DATA
       ================================================== */

    getFormData: function () {
      return {
        fullName: String(document.getElementById("doctorSecretaryName")?.value || "").trim(),
        phone: this.normalizePhone(document.getElementById("doctorSecretaryPhone")?.value || ""),
        email: String(document.getElementById("doctorSecretaryEmail")?.value || "").trim(),
        gender: document.getElementById("doctorSecretaryGender")?.value || "male",
        password: document.getElementById("doctorSecretaryPassword")?.value || "",
        active: Boolean(document.getElementById("doctorSecretaryActive")?.checked),
        permissions: {
          appointments: Boolean(document.getElementById("doctorSecretaryPermissionAppointments")?.checked),
          patients: Boolean(document.getElementById("doctorSecretaryPermissionPatients")?.checked),
          schedule: Boolean(document.getElementById("doctorSecretaryPermissionSchedule")?.checked)
        }
      };
    },


    /* ==================================================
       TOGGLE PASSWORD
       ================================================== */

    togglePassword: function () {
      const input = document.getElementById("doctorSecretaryPassword");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadSecretaries(app);
      const doctor = this.getDoctor(app);
      const stats = this.getStats();
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="doctor-secretary ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-secretary__orb doctor-secretary__orb--blue"></div>
          <div class="doctor-secretary__orb doctor-secretary__orb--cyan"></div>

          <header class="doctor-secretary__header">
            <button id="doctorSecretaryBack" class="doctor-secretary__back" type="button">→</button>
            <div class="doctor-secretary__header-copy">
              <strong>السكرتارية</strong>
              <span>${this.escapeHTML(doctor?.fullName || "الطبيب")}</span>
            </div>
            <button id="doctorSecretaryTheme" class="doctor-secretary__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="doctor-secretary__container">
            <section class="doctor-secretary__hero">
              <span>TEAM</span>
              <h1>السكرتير والسكرتيرة</h1>
              <p>أنشئ حساب السكرتير وحدد ما يمكنه إدارته داخل حساب العيادة.</p>
            </section>

            <div id="doctorSecretaryMessage" class="doctor-secretary-message" hidden></div>

            <section class="doctor-secretary-info glass">
              <span>ℹ</span>
              <p>السكرتير لا يسجل حسابًا بنفسه. أنت تنشئ الحساب هنا، وبعدها يستخدم رقم الهاتف وكلمة المرور للدخول من شاشة Login العادية.</p>
            </section>

            <section class="doctor-secretary-stats">
              <article class="doctor-secretary-stat glass">
                <span>الحسابات</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="doctor-secretary-stat glass is-active">
                <span>نشطة</span>
                <strong>${stats.active}</strong>
              </article>
              <article class="doctor-secretary-stat glass is-inactive">
                <span>متوقفة</span>
                <strong>${stats.inactive}</strong>
              </article>
            </section>

            <section class="doctor-secretary-toolbar glass">
              <div>
                <span>فريق العيادة</span>
                <strong>إدارة حسابات السكرتارية</strong>
              </div>
              <button id="doctorSecretaryAdd" type="button">+ إضافة سكرتير</button>
            </section>

            <section id="doctorSecretaryList" class="doctor-secretary-list">
              ${this.renderSecretaries()}
            </section>
          </section>

          <div id="doctorSecretaryEditorRoot">${this.renderEditor()}</div>

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
              <button class="mobile-bottom-nav__item" data-nav="secretary" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>السكرتارية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="account" type="button">
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
      console.log("MON MÉDECIN: DoctorSecretaryScreen init");

      document.getElementById("doctorSecretaryBack")?.addEventListener("click", function () {
        app.navigate("/doctor/dashboard");
      });

      document.getElementById("doctorSecretaryTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.getElementById("doctorSecretaryAdd")?.addEventListener("click", function () {
        DoctorSecretaryScreen.openEditor(null, app);
      });

      document.getElementById("doctorSecretaryEmptyAdd")?.addEventListener("click", function () {
        DoctorSecretaryScreen.openEditor(null, app);
      });

      document.getElementById("doctorSecretaryList")?.addEventListener("click", function (event) {
        const edit = event.target.closest("[data-doctor-secretary-edit]");
        if (edit) {
          DoctorSecretaryScreen.openEditor(edit.dataset.doctorSecretaryEdit, app);
          return;
        }

        const toggle = event.target.closest("[data-doctor-secretary-toggle]");
        if (toggle) {
          const changed = DoctorSecretaryScreen.toggleActive(toggle.dataset.doctorSecretaryToggle, app);
          if (changed) app.render();
          return;
        }

        const remove = event.target.closest("[data-doctor-secretary-delete]");
        if (remove) {
          const confirmed = window.confirm("هل تريد حذف حساب السكرتير نهائيًا؟");
          if (confirmed) {
            DoctorSecretaryScreen.deleteSecretary(remove.dataset.doctorSecretaryDelete, app);
            app.render();
          }
        }
      });

      document.getElementById("doctorSecretaryEditorRoot")?.addEventListener("click", function (event) {
        if (event.target.closest("#doctorSecretaryModalClose")) {
          DoctorSecretaryScreen.closeEditor(app);
          return;
        }
        const overlay = event.target.closest(".doctor-secretary-modal-overlay");
        if (overlay && event.target === overlay) {
          DoctorSecretaryScreen.closeEditor(app);
        }
      });

      document.getElementById("doctorSecretaryPasswordToggle")?.addEventListener("click", function () {
        DoctorSecretaryScreen.togglePassword();
      });

      document.getElementById("doctorSecretaryForm")?.addEventListener("submit", function (event) {
        event.preventDefault();
        const data = DoctorSecretaryScreen.getFormData();
        const saved = DoctorSecretaryScreen.saveSecretary(data, app);
        if (saved) app.render();
      });

      // BOTTOM NAV - ADDED
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/dashboard");
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/appointments");
        });
      });
      document.querySelectorAll("[data-nav='secretary']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/secretary");
        });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/account");
        });
      });
    }

  };


  window.DoctorSecretaryScreen = DoctorSecretaryScreen;

})();