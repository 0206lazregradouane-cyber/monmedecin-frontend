/* =====================================================
   MON MÉDECIN
   ADMIN DOCTORS MANAGEMENT - FIXED (with Users Sync)
   ===================================================== */

(function () {
  "use strict";

  const AdminDoctorsScreen = {
    doctors: [],
    filteredDoctors: [],
    selectedDoctorId: null,
    filters: {
      query: "",
      status: "",
      specialty: ""
    },
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
       ESCAPE HTML
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
       PHONE
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
       TEXT
       ================================================== */

    normalizeText: function (value) {
      return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ة/g, "ه");
    },

    /* ==================================================
       ID
       ================================================== */

    createDoctorId: function () {
      return "DOCTOR-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    },

    /* ==================================================
       SPECIALTIES HELPERS
       ================================================== */

    getSpecialties: function () {
      const specialties = this.readJSON(localStorage, "monmedecin-specialties", null);
      
      if (specialties && Array.isArray(specialties) && specialties.length > 0) {
        return specialties.filter(function(s) {
          return s.active !== false;
        });
      }
      
      if (window.MedicalSpecialties && typeof window.MedicalSpecialties.getAll === 'function') {
        const all = window.MedicalSpecialties.getAll();
        return all.map(function(s) {
          return {
            id: s.id,
            name: s.nameAr,
            icon: s.icon || '🩺',
            category: s.category || 'general',
            active: true
          };
        });
      }
      
      return [];
    },

    renderSpecialtyOptions: function (selectedValue) {
      var specialties = this.getSpecialties();
      var self = this;
      
      if (specialties.length === 0) {
        return '<option value="">لا توجد تخصصات متاحة</option>';
      }
      
      return specialties.map(function(s) {
        var value = s.id || s.name;
        var label = s.name || s.nameAr || value;
        var icon = s.icon || '🩺';
        var selected = String(value) === String(selectedValue) ? 'selected' : '';
        return '<option value="' + self.escapeHTML(value) + '" ' + selected + '>' + icon + ' ' + self.escapeHTML(label) + '</option>';
      }).join('');
    },

    /* ==================================================
       LOAD DOCTORS
       ================================================== */

    loadDoctors: function () {
      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) {
        doctors = [];
      }
      this.doctors = doctors;
      this.applyFilters();
      return doctors;
    },

    /* ==================================================
       SAVE DOCTORS
       ================================================== */

    saveDoctors: function () {
      return this.writeJSON(localStorage, "monmedecin-doctors", this.doctors);
    },

    /* ==================================================
       🔑 SYNC TO USERS - حفظ في monmedecin-users
       ================================================== */

    syncToUsers: function (doctor) {
      if (!doctor) return false;
      
      let users = this.readJSON(localStorage, "monmedecin-users", []);
      if (!Array.isArray(users)) users = [];
      
      // إزالة أي إدخال مكرر
      users = users.filter(function(u) {
        return String(u.id) !== String(doctor.id);
      });
      
      // إضافة الطبيب كـ مستخدم موحد
      users.push({
        ...doctor,
        role: "doctor",
        _source: "doctor",
        fullName: doctor.fullName || doctor.name || "",
        phone: doctor.phone || "",
        email: doctor.email || "",
        password: doctor.password || "",
        active: doctor.active !== false,
        status: doctor.status || (doctor.approved ? "approved" : "pending")
      });
      
      return this.writeJSON(localStorage, "monmedecin-users", users);
    },

    /* ==================================================
       🔑 REMOVE FROM USERS - حذف من monmedecin-users
       ================================================== */

    removeFromUsers: function (doctorId) {
      if (!doctorId) return false;
      
      let users = this.readJSON(localStorage, "monmedecin-users", []);
      if (!Array.isArray(users)) return true;
      
      users = users.filter(function(u) {
        return String(u.id) !== String(doctorId);
      });
      
      return this.writeJSON(localStorage, "monmedecin-users", users);
    },

    /* ==================================================
       FIND DOCTOR
       ================================================== */

    findDoctor: function (doctorId) {
      return this.doctors.find(function (doctor) {
        return String(doctor.id ?? doctor.doctor_id) === String(doctorId);
      }) || null;
    },

    /* ==================================================
       PHONE EXISTS
       ================================================== */

    phoneExists: function (phone, ignoredDoctorId) {
      const normalized = this.normalizePhone(phone);

      // DOCTORS
      const doctorExists = this.doctors.some(function (doctor) {
        if (ignoredDoctorId && String(doctor.id) === String(ignoredDoctorId)) {
          return false;
        }
        return this.normalizePhone(doctor.phone) === normalized;
      }, this);
      if (doctorExists) return true;

      // PATIENTS
      let patients = this.readJSON(localStorage, "monmedecin-patients", []);
      if (!Array.isArray(patients)) {
        patients = [];
      }
      if (patients.some(function (patient) {
        return this.normalizePhone(patient.phone) === normalized;
      }, this)) {
        return true;
      }

      // SECRETARIES
      let secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
      if (!Array.isArray(secretaries)) {
        secretaries = [];
      }
      if (secretaries.some(function (secretary) {
        return this.normalizePhone(secretary.phone) === normalized;
      }, this)) {
        return true;
      }

      // ADMIN
      const admin = this.readJSON(localStorage, "monmedecin-admin", null);
      if (admin && this.normalizePhone(admin.phone) === normalized) {
        return true;
      }

      // USERS
      let users = this.readJSON(localStorage, "monmedecin-users", []);
      if (!Array.isArray(users)) {
        users = [];
      }
      if (users.some(function (user) {
        return this.normalizePhone(user.phone) === normalized;
      }, this)) {
        return true;
      }

      return false;
    },

    /* ==================================================
       VALIDATE DOCTOR
       ================================================== */

    validateDoctor: function (data, editingId) {
      const errors = {};
      if (!data.fullName || data.fullName.length < 3) {
        errors.fullName = "أدخل اسم الطبيب الكامل.";
      }
      if (!/^(05|06|07)[0-9]{8}$/.test(data.phone)) {
        errors.phone = "أدخل رقم هاتف جزائري صحيح.";
      } else if (this.phoneExists(data.phone, editingId)) {
        errors.phone = "رقم الهاتف مستخدم في حساب آخر.";
      }
      if (!data.specialty) {
        errors.specialty = "اختر تخصص الطبيب.";
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = "البريد الإلكتروني غير صحيح.";
      }
      if (!editingId && data.password.length < 6) {
        errors.password = "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل.";
      }
      if (data.password && data.password.length < 6) {
        errors.password = "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل.";
      }
      if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "كلمتا المرور غير متطابقتين.";
      }
      return {
        valid: Object.keys(errors).length === 0,
        errors: errors
      };
    },

    /* ==================================================
       🔑 CREATE DOCTOR - مع حفظ في monmedecin-users
       ================================================== */

    createDoctor: function (data) {
      const now = new Date().toISOString();
      const doctor = {
        id: this.createDoctorId(),
        doctor_id: null,
        role: "doctor",
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        password: data.password,
        gender: data.gender,
        specialty: data.specialty,
        specialtyId: data.specialty,
        wilaya: data.wilaya,
        commune: data.commune,
        address: data.address,
        professional: {
          title: data.fullName,
          specialty: data.specialty,
          registrationNumber: data.registrationNumber,
          experienceYears: Number(data.experienceYears) || 0
        },
        approved: data.approved,
        status: data.approved ? "approved" : "pending",
        active: true,
        receivesAppointments: true,
        profileVisible: data.approved,
        createdBy: "admin",
        createdAt: now,
        updatedAt: now
      };
      doctor.doctor_id = doctor.id;

      // 1. حفظ في monmedecin-doctors
      this.doctors.push(doctor);
      const saved = this.saveDoctors();
      if (!saved) return null;

      // 🔑 2. حفظ في monmedecin-users للمصادقة الموحدة
      this.syncToUsers(doctor);

      // 3. إنشاء الخدمات الافتراضية
      this.createDefaultServices(doctor.id);
      
      // 4. إنشاء الجدول الافتراضي
      this.createDefaultSchedule(doctor.id);

      this.applyFilters();
      return doctor;
    },

    /* ==================================================
       CREATE DEFAULT SERVICES
       ================================================== */

    createDefaultServices: function (doctorId) {
      let services = this.readJSON(localStorage, "monmedecin-doctor-services", []);
      if (!Array.isArray(services)) {
        services = [];
      }
      services = services.filter(function (service) {
        return String(service.doctor_id || service.doctorId) !== String(doctorId);
      });
      services.push({
        id: "SERVICE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
        service_id: null,
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
      this.writeJSON(localStorage, "monmedecin-doctor-services", services);
    },

    /* ==================================================
       CREATE DEFAULT SCHEDULE
       ================================================== */

    createDefaultSchedule: function (doctorId) {
      let schedules = this.readJSON(localStorage, "monmedecin-doctor-schedules", []);
      if (!Array.isArray(schedules)) {
        schedules = [];
      }
      schedules = schedules.filter(function (schedule) {
        return String(schedule.doctor_id || schedule.doctorId) !== String(doctorId);
      });
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
      this.writeJSON(localStorage, "monmedecin-doctor-schedules", schedules);
    },

    /* ==================================================
       🔑 UPDATE DOCTOR - مع تحديث في monmedecin-users
       ================================================== */

    updateDoctor: function (doctorId, data) {
      const doctor = this.findDoctor(doctorId);
      if (!doctor) return false;

      // تحديث بيانات الطبيب
      doctor.fullName = data.fullName;
      doctor.phone = data.phone;
      doctor.email = data.email;
      doctor.gender = data.gender;
      doctor.specialty = data.specialty;
      doctor.specialtyId = data.specialty;
      doctor.wilaya = data.wilaya;
      doctor.commune = data.commune;
      doctor.address = data.address;
      doctor.professional = {
        ...(doctor.professional || {}),
        title: data.fullName,
        specialty: data.specialty,
        registrationNumber: data.registrationNumber,
        experienceYears: Number(data.experienceYears) || 0
      };
      doctor.approved = data.approved;
      doctor.status = data.approved ? "approved" : "pending";
      doctor.profileVisible = data.approved;
      if (data.password) {
        doctor.password = data.password;
      }
      doctor.updatedAt = new Date().toISOString();

      // 1. حفظ في monmedecin-doctors
      this.saveDoctors();
      
      // 🔑 2. تحديث في monmedecin-users
      this.syncToUsers(doctor);

      this.applyFilters();
      return true;
    },

    /* ==================================================
       TOGGLE ACTIVE - مع تحديث في monmedecin-users
       ================================================== */

    toggleActive: function (doctorId) {
      const doctor = this.findDoctor(doctorId);
      if (!doctor) return false;
      doctor.active = doctor.active === false;
      doctor.updatedAt = new Date().toISOString();
      this.saveDoctors();
      // 🔑 تحديث في monmedecin-users
      this.syncToUsers(doctor);
      this.applyFilters();
      this.showMessage(doctor.active ? "تم تفعيل حساب الطبيب." : "تم تعطيل حساب الطبيب.", "success");
      return true;
    },

    /* ==================================================
       TOGGLE APPROVAL - مع تحديث في monmedecin-users
       ================================================== */

    toggleApproval: function (doctorId) {
      const doctor = this.findDoctor(doctorId);
      if (!doctor) return false;
      doctor.approved = doctor.approved !== true;
      doctor.status = doctor.approved ? "approved" : "pending";
      doctor.profileVisible = doctor.approved;
      doctor.updatedAt = new Date().toISOString();
      this.saveDoctors();
      // 🔑 تحديث في monmedecin-users
      this.syncToUsers(doctor);
      this.applyFilters();
      this.showMessage(doctor.approved ? "تم اعتماد الطبيب." : "تم إلغاء اعتماد الطبيب.", "success");
      return true;
    },

    /* ==================================================
       🔑 DELETE DOCTOR - مع حذف من monmedecin-users
       ================================================== */

    deleteDoctor: function (doctorId) {
      const doctor = this.findDoctor(doctorId);
      if (!doctor) return false;
      const confirmed = window.confirm("هل تريد حذف حساب الطبيب نهائيًا؟ سيتم أيضًا حذف حسابات السكرتير المرتبطة به.");
      if (!confirmed) return false;

      // 1. حذف من monmedecin-doctors
      this.doctors = this.doctors.filter(function (item) {
        return String(item.id) !== String(doctorId);
      });
      this.saveDoctors();

      // 🔑 2. حذف من monmedecin-users
      this.removeFromUsers(doctorId);

      // 3. حذف السكرتارية المرتبطة
      let secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
      if (Array.isArray(secretaries)) {
        secretaries = secretaries.filter(function (secretary) {
          return String(secretary.doctor_id ?? secretary.doctorId) !== String(doctorId);
        });
        this.writeJSON(localStorage, "monmedecin-secretaries", secretaries);
      }

      this.selectedDoctorId = null;
      this.applyFilters();
      this.showMessage("تم حذف الطبيب.", "success");
      return true;
    },

    /* ==================================================
       FILTER
       ================================================== */

    applyFilters: function () {
      const query = this.normalizeText(this.filters.query);
      this.filteredDoctors = this.doctors.filter(function (doctor) {
        if (query) {
          const matched = [
            doctor.fullName,
            doctor.phone,
            doctor.email,
            doctor.specialty,
            doctor.wilaya,
            doctor.commune,
            doctor.id
          ].some(function (value) {
            return this.normalizeText(value).includes(query);
          }, this);
          if (!matched) return false;
        }

        if (this.filters.status) {
          if (this.filters.status === "active" && doctor.active === false) return false;
          if (this.filters.status === "inactive" && doctor.active !== false) return false;
          if (this.filters.status === "approved" && doctor.approved !== true) return false;
          if (this.filters.status === "pending" && doctor.approved === true) return false;
        }

        if (this.filters.specialty && doctor.specialty !== this.filters.specialty) {
          return false;
        }

        return true;
      }, this);
      return this.filteredDoctors;
    },

    /* ==================================================
       FORM DATA
       ================================================== */

    getFormData: function () {
      return {
        fullName: String(document.getElementById("adminDoctorFullName")?.value || "").trim(),
        phone: this.normalizePhone(document.getElementById("adminDoctorPhone")?.value),
        email: String(document.getElementById("adminDoctorEmail")?.value || "").trim().toLowerCase(),
        gender: String(document.getElementById("adminDoctorGender")?.value || ""),
        specialty: String(document.getElementById("adminDoctorSpecialty")?.value || ""),
        wilaya: String(document.getElementById("adminDoctorWilaya")?.value || "").trim(),
        commune: String(document.getElementById("adminDoctorCommune")?.value || "").trim(),
        address: String(document.getElementById("adminDoctorAddress")?.value || "").trim(),
        registrationNumber: String(document.getElementById("adminDoctorRegistrationNumber")?.value || "").trim(),
        experienceYears: Number(document.getElementById("adminDoctorExperienceYears")?.value || 0) || 0,
        password: String(document.getElementById("adminDoctorPassword")?.value || ""),
        confirmPassword: String(document.getElementById("adminDoctorConfirmPassword")?.value || ""),
        approved: Boolean(document.getElementById("adminDoctorApproved")?.checked)
      };
    },

    /* ==================================================
       ERRORS
       ================================================== */

    clearErrors: function () {
      document.querySelectorAll(".admin-doctors-error").forEach(function (element) {
        element.textContent = "";
      });
    },

    showErrors: function (errors) {
      const map = {
        fullName: "adminDoctorFullNameError",
        phone: "adminDoctorPhoneError",
        email: "adminDoctorEmailError",
        specialty: "adminDoctorSpecialtyError",
        password: "adminDoctorPasswordError",
        confirmPassword: "adminDoctorConfirmPasswordError"
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
      const element = document.getElementById("adminDoctorsMessage");
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
       SELECT DOCTOR
       ================================================== */

    selectDoctor: function (doctorId, app) {
      const doctor = this.findDoctor(doctorId);
      if (!doctor) return;
      this.selectedDoctorId = doctor.id;
      sessionStorage.setItem("monmedecin-admin-selected-doctor-id", String(doctor.id));
      app.render();
    },

    closeDoctor: function (app) {
      this.selectedDoctorId = null;
      sessionStorage.removeItem("monmedecin-admin-selected-doctor-id");
      app.render();
    },

    /* ==================================================
       RENDER DOCTOR CARD
       ================================================== */

    renderDoctor: function (doctor) {
      const isActive = doctor.active !== false;
      const isApproved = doctor.approved === true;
      
      return `
        <article class="admin-doctor-card glass ${isActive ? "" : "is-inactive"}">
          <div class="admin-doctor-card__top">
            <div class="admin-doctor-card__identity">
              <div class="admin-doctor-card__avatar">${this.escapeHTML(String(doctor.fullName || "ط").charAt(0))}</div>
              <div>
                <span>طبيب</span>
                <h3>${this.escapeHTML(doctor.fullName)}</h3>
                <small>${this.escapeHTML(doctor.specialty || "")}</small>
              </div>
            </div>
            <div class="admin-doctor-card__badges">
              <span class="admin-doctor-status ${isActive ? "is-on" : "is-off"}">${isActive ? "نشط" : "متوقف"}</span>
              <span class="admin-doctor-approval ${isApproved ? "is-approved" : "is-pending"}">${isApproved ? "معتمد" : "بانتظار الاعتماد"}</span>
            </div>
          </div>
          <div class="admin-doctor-card__meta">
            <div>
              <span>الهاتف</span>
              <strong dir="ltr">${this.escapeHTML(doctor.phone)}</strong>
            </div>
            <div>
              <span>الولاية</span>
              <strong>${this.escapeHTML(doctor.wilaya || "—")}</strong>
            </div>
            <div>
              <span>الخبرة</span>
              <strong>${Number(doctor.professional?.experienceYears) || 0} سنة</strong>
            </div>
            <div>
              <span>ID</span>
              <strong dir="ltr">${this.escapeHTML(doctor.id)}</strong>
            </div>
          </div>
          <div class="admin-doctor-card__actions">
            <button class="is-view" data-admin-doctor-view="${this.escapeHTML(doctor.id)}" type="button">التفاصيل / التعديل</button>
            <button class="${isApproved ? "is-unapprove" : "is-approve"}" data-admin-doctor-approval="${this.escapeHTML(doctor.id)}" type="button">${isApproved ? "إلغاء الاعتماد" : "اعتماد"}</button>
            <button class="${isActive ? "is-disable" : "is-enable"}" data-admin-doctor-active="${this.escapeHTML(doctor.id)}" type="button">${isActive ? "تعطيل" : "تفعيل"}</button>
            <button class="is-delete" data-admin-doctor-delete="${this.escapeHTML(doctor.id)}" type="button">حذف</button>
          </div>
        </article>
      `;
    },

    /* ==================================================
       RENDER DOCTORS LIST
       ================================================== */

    renderDoctors: function () {
      if (this.filteredDoctors.length === 0) {
        return `
          <section class="admin-doctors-empty glass">
            <span>+</span>
            <h3>لا يوجد أطباء</h3>
            <p>أنشئ أول حساب طبيب أو غيّر معايير البحث الحالية.</p>
          </section>
        `;
      }
      return this.filteredDoctors.map(function (doctor) {
        return this.renderDoctor(doctor);
      }, this).join("");
    },

    /* ==================================================
       RENDER EDIT MODAL
       ================================================== */

    renderEditModal: function () {
      if (!this.selectedDoctorId) return "";
      const doctor = this.findDoctor(this.selectedDoctorId);
      if (!doctor) return "";
      return `
        <div class="admin-doctor-modal-overlay">
          <section class="admin-doctor-modal glass">
            <header class="admin-doctor-modal__header">
              <div>
                <span>تعديل الطبيب</span>
                <h2>${this.escapeHTML(doctor.fullName)}</h2>
              </div>
              <button id="adminDoctorModalClose" type="button">×</button>
            </header>
            ${this.renderDoctorForm(doctor, true)}
          </section>
        </div>
      `;
    },

    /* ==================================================
       RENDER DOCTOR FORM
       ================================================== */

    renderDoctorForm: function (doctor, editing) {
      const data = doctor || {};
      return `
        <form id="${editing ? "adminDoctorEditForm" : "adminDoctorCreateForm"}" class="admin-doctor-form" novalidate>
          <div class="admin-doctor-form__grid">
            <label class="admin-doctor-field">
              <span>الاسم الكامل</span>
              <input id="adminDoctorFullName" type="text" maxlength="100" value="${this.escapeHTML(data.fullName || "")}" placeholder="د. الاسم واللقب">
              <small id="adminDoctorFullNameError" class="admin-doctors-error"></small>
            </label>
            <label class="admin-doctor-field">
              <span>رقم الهاتف</span>
              <input id="adminDoctorPhone" type="tel" inputmode="numeric" maxlength="10" value="${this.escapeHTML(data.phone || "")}" placeholder="0550 12 34 56" dir="ltr">
              <small id="adminDoctorPhoneError" class="admin-doctors-error"></small>
            </label>
            <label class="admin-doctor-field">
              <span>البريد الإلكتروني</span>
              <input id="adminDoctorEmail" type="email" value="${this.escapeHTML(data.email || "")}" placeholder="doctor@example.com" dir="ltr">
              <small id="adminDoctorEmailError" class="admin-doctors-error"></small>
            </label>
            <label class="admin-doctor-field">
              <span>الجنس</span>
              <select id="adminDoctorGender">
                <option value="" ${!data.gender ? "selected" : ""}>غير محدد</option>
                <option value="male" ${data.gender === "male" ? "selected" : ""}>ذكر</option>
                <option value="female" ${data.gender === "female" ? "selected" : ""}>أنثى</option>
              </select>
            </label>
            <label class="admin-doctor-field">
              <span>التخصص</span>
              <select id="adminDoctorSpecialty">
                <option value="">اختر التخصص</option>
                ${this.renderSpecialtyOptions(data.specialty || "")}
              </select>
              <small id="adminDoctorSpecialtyError" class="admin-doctors-error"></small>
            </label>
            <label class="admin-doctor-field">
              <span>رقم التسجيل المهني</span>
              <input id="adminDoctorRegistrationNumber" type="text" value="${this.escapeHTML(data.professional?.registrationNumber || "")}" placeholder="رقم التسجيل">
            </label>
            <label class="admin-doctor-field">
              <span>سنوات الخبرة</span>
              <input id="adminDoctorExperienceYears" type="number" min="0" max="70" value="${Number(data.professional?.experienceYears) || 0}">
            </label>
            <label class="admin-doctor-field">
              <span>الولاية</span>
              <input id="adminDoctorWilaya" type="text" value="${this.escapeHTML(data.wilaya || "")}" placeholder="الولاية">
            </label>
            <label class="admin-doctor-field">
              <span>البلدية</span>
              <input id="adminDoctorCommune" type="text" value="${this.escapeHTML(data.commune || "")}" placeholder="البلدية">
            </label>
            <label class="admin-doctor-field admin-doctor-field--full">
              <span>العنوان</span>
              <input id="adminDoctorAddress" type="text" value="${this.escapeHTML(data.address || "")}" placeholder="عنوان العيادة">
            </label>
            <label class="admin-doctor-field">
              <span>${editing ? "كلمة مرور جديدة" : "كلمة المرور"}</span>
              <input id="adminDoctorPassword" type="password" autocomplete="new-password" placeholder="${editing ? "اتركها فارغة للاحتفاظ بالحالية" : "6 أحرف على الأقل"}">
              <small id="adminDoctorPasswordError" class="admin-doctors-error"></small>
            </label>
            <label class="admin-doctor-field">
              <span>تأكيد كلمة المرور</span>
              <input id="adminDoctorConfirmPassword" type="password" autocomplete="new-password" placeholder="تأكيد كلمة المرور">
              <small id="adminDoctorConfirmPasswordError" class="admin-doctors-error"></small>
            </label>
          </div>
          <label class="admin-doctor-approved-control">
            <input id="adminDoctorApproved" type="checkbox" ${data.approved === true ? "checked" : ""}>
            <span></span>
            <div>
              <strong>اعتماد الطبيب</strong>
              <small>الطبيب المعتمد يمكن إظهار ملفه للمرضى.</small>
            </div>
          </label>
          <button class="admin-doctor-form__submit" type="submit">${editing ? "حفظ التعديلات" : "إنشاء حساب الطبيب"}</button>
        </form>
      `;
    },

    /* ==================================================
       STATS
       ================================================== */

    getStats: function () {
      return {
        total: this.doctors.length,
        active: this.doctors.filter(function (doctor) {
          return doctor.active !== false;
        }).length,
        approved: this.doctors.filter(function (doctor) {
          return doctor.approved === true;
        }).length,
        pending: this.doctors.filter(function (doctor) {
          return doctor.approved !== true;
        }).length
      };
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadDoctors();
      const stats = this.getStats();
      const isMobile = state.deviceMode === 'mobile';

      return `
        <main class="admin-doctors ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="admin-doctors__orb admin-doctors__orb--blue"></div>
          <div class="admin-doctors__orb admin-doctors__orb--cyan"></div>

          <header class="admin-doctors__header">
            <button id="adminDoctorsBack" class="admin-doctors__back" type="button">→</button>
            <div class="admin-doctors__header-copy">
              <strong>إدارة الأطباء</strong>
              <span>إنشاء وإدارة حسابات الأطباء</span>
            </div>
            <button id="adminDoctorsTheme" class="admin-doctors__theme" type="button">◐</button>
          </header>

          <section class="admin-doctors__container">

            <section class="admin-doctors__hero">
              <span>الإدارة</span>
              <h1>الأطباء</h1>
              <p>إنشاء حسابات الأطباء واعتمادها وتفعيلها. الطبيب بعد ذلك يدخل من نفس شاشة تسجيل الدخول.</p>
            </section>

            <div id="adminDoctorsMessage" class="admin-doctors-message" hidden></div>

            <section class="admin-doctors-stats">
              <article class="admin-doctors-stat glass">
                <span>إجمالي الأطباء</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="admin-doctors-stat glass is-success">
                <span>النشطون</span>
                <strong>${stats.active}</strong>
              </article>
              <article class="admin-doctors-stat glass is-approved">
                <span>المعتمدون</span>
                <strong>${stats.approved}</strong>
              </article>
              <article class="admin-doctors-stat glass is-warning">
                <span>بانتظار الاعتماد</span>
                <strong>${stats.pending}</strong>
              </article>
            </section>

            <section class="admin-doctors-create glass">
              <div class="admin-doctors-create__head">
                <div>
                  <span>حساب جديد</span>
                  <h2>إضافة طبيب</h2>
                </div>
                <span class="admin-doctors-create__icon">+</span>
              </div>
              ${this.renderDoctorForm(null, false)}
            </section>

            <section class="admin-doctors-filters glass">
              <div class="admin-doctors-search">
                <span>⌕</span>
                <input id="adminDoctorsQuery" type="search" value="${this.escapeHTML(this.filters.query)}" placeholder="اسم الطبيب، الهاتف، التخصص...">
              </div>
              <select id="adminDoctorsStatus">
                <option value="">كل الحالات</option>
                <option value="active" ${this.filters.status === "active" ? "selected" : ""}>نشط</option>
                <option value="inactive" ${this.filters.status === "inactive" ? "selected" : ""}>متوقف</option>
                <option value="approved" ${this.filters.status === "approved" ? "selected" : ""}>معتمد</option>
                <option value="pending" ${this.filters.status === "pending" ? "selected" : ""}>بانتظار الاعتماد</option>
              </select>
              <select id="adminDoctorsSpecialty">
                <option value="">كل التخصصات</option>
                ${this.renderSpecialtyOptions(this.filters.specialty)}
              </select>
              <button id="adminDoctorsReset" type="button">مسح</button>
            </section>

            <section class="admin-doctors-results__head">
              <div>
                <span>القائمة</span>
                <h2>حسابات الأطباء</h2>
              </div>
              <strong id="adminDoctorsResultsCount">${this.filteredDoctors.length}</strong>
            </section>

            <section id="adminDoctorsResults" class="admin-doctors-results">${this.renderDoctors()}</section>

          </section>

          <div id="adminDoctorModalRoot">${this.renderEditModal()}</div>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="doctors" type="button">
                <span class="mobile-bottom-nav__icon">✚</span>
                <span>الأطباء</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>الحجوزات</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="settings" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>الإعدادات</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      // BACK
      document.getElementById("adminDoctorsBack")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });

      // THEME
      document.getElementById("adminDoctorsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // PHONE
      document.getElementById("adminDoctorPhone")?.addEventListener("input", function (event) {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
      });

      // CREATE
      document.getElementById("adminDoctorCreateForm")?.addEventListener("submit", function (event) {
        event.preventDefault();
        AdminDoctorsScreen.clearErrors();
        const data = AdminDoctorsScreen.getFormData();
        const validation = AdminDoctorsScreen.validateDoctor(data, null);
        if (!validation.valid) {
          AdminDoctorsScreen.showErrors(validation.errors);
          return;
        }
        const doctor = AdminDoctorsScreen.createDoctor(data);
        if (!doctor) {
          AdminDoctorsScreen.showMessage("تعذر إنشاء حساب الطبيب.", "error");
          return;
        }
        AdminDoctorsScreen.showMessage("تم إنشاء حساب الطبيب بنجاح مع خدمات افتراضية وجدول عمل. يمكن للطبيب الآن تسجيل الدخول بنفس الهاتف وكلمة المرور.", "success");
        app.render();
      });

      // SEARCH
      document.getElementById("adminDoctorsQuery")?.addEventListener("input", function (event) {
        AdminDoctorsScreen.filters.query = event.target.value;
        AdminDoctorsScreen.applyFilters();
        const results = document.getElementById("adminDoctorsResults");
        const count = document.getElementById("adminDoctorsResultsCount");
        if (results) {
          results.innerHTML = AdminDoctorsScreen.renderDoctors();
        }
        if (count) {
          count.textContent = String(AdminDoctorsScreen.filteredDoctors.length);
        }
      });

      // STATUS FILTER
      document.getElementById("adminDoctorsStatus")?.addEventListener("change", function (event) {
        AdminDoctorsScreen.filters.status = event.target.value;
        app.render();
      });

      // SPECIALTY FILTER
      document.getElementById("adminDoctorsSpecialty")?.addEventListener("change", function (event) {
        AdminDoctorsScreen.filters.specialty = event.target.value;
        app.render();
      });

      // RESET
      document.getElementById("adminDoctorsReset")?.addEventListener("click", function () {
        AdminDoctorsScreen.filters = { query: "", status: "", specialty: "" };
        app.render();
      });

      // CARD ACTIONS
      document.getElementById("adminDoctorsResults")?.addEventListener("click", function (event) {
        const view = event.target.closest("[data-admin-doctor-view]");
        if (view) {
          AdminDoctorsScreen.selectDoctor(view.dataset.adminDoctorView, app);
          return;
        }
        const approval = event.target.closest("[data-admin-doctor-approval]");
        if (approval) {
          AdminDoctorsScreen.toggleApproval(approval.dataset.adminDoctorApproval);
          app.render();
          return;
        }
        const active = event.target.closest("[data-admin-doctor-active]");
        if (active) {
          AdminDoctorsScreen.toggleActive(active.dataset.adminDoctorActive);
          app.render();
          return;
        }
        const remove = event.target.closest("[data-admin-doctor-delete]");
        if (remove) {
          AdminDoctorsScreen.deleteDoctor(remove.dataset.adminDoctorDelete);
          app.render();
        }
      });

      // MODAL
      document.getElementById("adminDoctorModalRoot")?.addEventListener("click", function (event) {
        const close = event.target.closest("#adminDoctorModalClose");
        if (close) {
          AdminDoctorsScreen.closeDoctor(app);
          return;
        }
        const overlay = event.target.closest(".admin-doctor-modal-overlay");
        if (overlay && event.target === overlay) {
          AdminDoctorsScreen.closeDoctor(app);
        }
      });

      // EDIT FORM
      document.getElementById("adminDoctorModalRoot")?.addEventListener("submit", function (event) {
        if (event.target.id !== "adminDoctorEditForm") return;
        event.preventDefault();
        AdminDoctorsScreen.clearErrors();
        const data = AdminDoctorsScreen.getFormData();
        const validation = AdminDoctorsScreen.validateDoctor(data, AdminDoctorsScreen.selectedDoctorId);
        if (!validation.valid) {
          AdminDoctorsScreen.showErrors(validation.errors);
          return;
        }
        const updated = AdminDoctorsScreen.updateDoctor(AdminDoctorsScreen.selectedDoctorId, data);
        if (!updated) return;
        AdminDoctorsScreen.selectedDoctorId = null;
        sessionStorage.removeItem("monmedecin-admin-selected-doctor-id");
        AdminDoctorsScreen.showMessage("تم تحديث حساب الطبيب.", "success");
        app.render();
      });

      // BOTTOM NAV
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/dashboard");
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/appointments");
        });
      });
      document.querySelectorAll("[data-nav='settings']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/settings");
        });
      });
    }
  };

  window.AdminDoctorsScreen = AdminDoctorsScreen;

})();