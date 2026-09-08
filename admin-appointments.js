/* =====================================================
   MON MÉDECIN
   ADMIN APPOINTMENTS - FIXED WITH ADMIN FILTER
   
   FILE:// COMPATIBLE VERSION

   FIXES:
   - Uses app.getAppointmentsSafely()
   - Uses app.saveAppointmentsToAllStores()
   - Better data loading and sync
   - Status change history tracking
   - Added createdAt normalization for old appointments
   - 🔑 ADMIN FILTER: Shows only recent/completed appointments for admin
   ===================================================== */

(function () {

  "use strict";

  const AdminAppointmentsScreen = {

    /* ==================================================
       STATE
       ================================================== */

    appointments: [],
    doctors: [],
    patients: [],
    filteredAppointments: [],
    selectedAppointmentId: null,
    showAllAppointments: false, // 🔑 تبديل عرض كل المواعيد

    filters: {
      query: "",
      status: "",
      date: "",
      doctorId: "",
      patientId: ""
    },

    messageTimer: null,

    /* ==================================================
       STORAGE HELPERS
       ================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const value = storage.getItem(key);
        if (!value) return fallback;
        return JSON.parse(value);
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
       GET ADMIN ID
       ================================================== */

    getAdminId: function (app) {
      const admin = app.state?.admin || app.state?.user;
      return admin?.id || admin?.admin_id || null;
    },

    /* ==================================================
       GET APPOINTMENTS - WITH ADMIN FILTER 🔑
       ================================================== */

    getAppointmentsSafely: function (app) {
      if (typeof app.getAppointmentsSafely === "function") {
        return app.getAppointmentsSafely();
      }

      if (typeof app.getAppointments === "function") {
        return app.getAppointments();
      }

      // Fallback
      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];

      const map = new Map();

      stores.forEach(function (key) {
        const data = AdminAppointmentsScreen.readJSON(localStorage, key, []);
        if (Array.isArray(data)) {
          data.forEach(function (appointment) {
            const id = appointment.id || appointment.appointment_id;
            if (id) {
              map.set(String(id), appointment);
            }
          });
        }
      });

      return Array.from(map.values());
    },

    /* ==================================================
       SAVE APPOINTMENTS
       ================================================== */

    saveAppointmentsToAllStores: function (appointments, app) {
      if (typeof app.saveAppointmentsToAllStores === "function") {
        return app.saveAppointmentsToAllStores(appointments);
      }

      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];

      let allSaved = true;

      stores.forEach(function (key) {
        let data = AdminAppointmentsScreen.readJSON(localStorage, key, []);
        if (!Array.isArray(data)) data = [];

        appointments.forEach(function (appointment) {
          const index = data.findIndex(function (item) {
            return String(item.id || item.appointment_id) === String(appointment.id || appointment.appointment_id);
          });
          if (index >= 0) {
            data[index] = appointment;
          } else {
            data.push(appointment);
          }
        });

        const saved = AdminAppointmentsScreen.writeJSON(localStorage, key, data);
        if (!saved) allSaved = false;
      });

      return allSaved;
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
       NORMALIZE TEXT
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
       NORMALIZE APPOINTMENT
       ================================================== */

    normalizeAppointment: function (appointment) {
      if (!appointment || typeof appointment !== "object") {
        return null;
      }

      let createdAt = appointment.createdAt || appointment.created_at;
      if (!createdAt && appointment.date) {
        createdAt = appointment.date + 'T00:00:00';
      }
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      let updatedAt = appointment.updatedAt || appointment.updated_at;
      if (!updatedAt) {
        updatedAt = createdAt;
      }

      return {
        ...appointment,
        id: appointment.id ?? "APT-UNKNOWN",
        doctor_id: appointment.doctor_id ?? appointment.doctorId ?? null,
        doctor_name: appointment.doctor_name ?? appointment.doctorName ?? "طبيب",
        doctor_specialty: appointment.doctor_specialty ?? appointment.specialty ?? "",
        patient_id: appointment.patient_id ?? appointment.patientId ?? null,
        patient_name: appointment.patient_name ?? appointment.patientName ?? "مريض",
        patient_phone: appointment.patient_phone ?? appointment.patientPhone ?? "",
        service_id: appointment.service_id ?? appointment.serviceId ?? null,
        service_name: appointment.service_name ?? appointment.serviceName ?? "خدمة طبية",
        service_price: Number(appointment.service_price ?? appointment.price ?? 0) || 0,
        service_duration: Number(appointment.service_duration ?? appointment.duration ?? 30) || 30,
        date: appointment.date ?? appointment.appointment_date ?? "",
        time: appointment.time ?? appointment.appointment_time ?? "",
        reason: appointment.reason ?? "",
        notes: appointment.notes ?? "",
        status: this.normalizeStatus(appointment.status),
        createdAt: createdAt,
        updatedAt: updatedAt,
        createdBy: appointment.createdBy || appointment.created_by || appointment.source || 'patient'
      };
    },

    /* ==================================================
       STATUS
       ================================================== */

    normalizeStatus: function (value) {
      const status = String(value || "pending").trim().toLowerCase();

      switch (status) {
        case "pending":
        case "confirmed":
        case "in_progress":
        case "completed":
        case "cancelled":
        case "no_show":
          return status;
        case "canceled":
        case "rejected":
          return "cancelled";
        case "in-progress":
          return "in_progress";
        case "no-show":
          return "no_show";
        default:
          return "pending";
      }
    },

    getStatusLabel: function (status) {
      switch (this.normalizeStatus(status)) {
        case "pending": return "قيد الانتظار";
        case "confirmed": return "مؤكد";
        case "in_progress": return "جاري";
        case "completed": return "مكتمل";
        case "cancelled": return "ملغى";
        case "no_show": return "عدم حضور";
        default: return "غير معروف";
      }
    },

    /* ==================================================
       🔑 ADMIN FILTER - فلترة المواعيد للمدير
       ================================================== */

    filterAppointmentsForAdmin: function (appointments, app) {
      const adminId = this.getAdminId(app);
      const showAll = this.showAllAppointments;

      // إذا كان المدير يريد عرض الكل
      if (showAll) {
        return appointments;
      }

      // 🔑 الفلترة الذكية: إخفاء المواعيد القديمة والمكتملة
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return appointments.filter(function (apt) {
        // 1. المواعيد النشطة تظهر دائماً
        if (['pending', 'confirmed', 'arrived', 'in_progress'].includes(apt.status)) {
          return true;
        }

        // 2. المواعيد التي أنشأها المدير تظهر دائماً
        if (apt.createdBy === 'admin' || apt.createdBy === adminId) {
          return true;
        }

        // 3. المواعيد المكتملة/الملغاة: تظهر فقط إذا كانت حديثة (أقل من 7 أيام)
        const aptDate = new Date(apt.date || apt.createdAt || apt.updatedAt);
        if (aptDate >= sevenDaysAgo) {
          return true;
        }

        // 4. المواعيد القديمة المكتملة/الملغاة: مخفية عن المدير
        return false;
      });
    },

    /* ==================================================
       LOAD DOCTORS
       ================================================== */

    loadDoctors: function () {
      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) doctors = [];
      this.doctors = doctors;
      return doctors;
    },

    /* ==================================================
       LOAD PATIENTS
       ================================================== */

    loadPatients: function () {
      let patients = this.readJSON(localStorage, "monmedecin-patients", []);
      if (!Array.isArray(patients)) patients = [];
      this.patients = patients;
      return patients;
    },

    /* ==================================================
       LOAD APPOINTMENTS - WITH ADMIN FILTER 🔑
       ================================================== */

    loadAppointments: function (app) {
      // جلب جميع المواعيد من التخزين
      let allAppointments = this.getAppointmentsSafely(app)
        .map(function (appointment) {
          return AdminAppointmentsScreen.normalizeAppointment(appointment);
        })
        .filter(function (appointment) {
          return appointment !== null;
        });

      // 🔑 تطبيق فلترة المدير
      this.appointments = this.filterAppointmentsForAdmin(allAppointments, app);

      // ترتيب تنازلي حسب التاريخ
      this.appointments.sort(function (a, b) {
        const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
        const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
        return dateB.getTime() - dateA.getTime();
      });

      // استعادة الموعد المحدد من الجلسة
      const selectedId = sessionStorage.getItem("monmedecin-admin-selected-appointment-id");
      if (selectedId && this.appointments.some(function (apt) {
        return String(apt.id) === String(selectedId);
      })) {
        this.selectedAppointmentId = selectedId;
      }

      this.applyFilters();
      return this.appointments;
    },

    /* ==================================================
       LOAD DATA
       ================================================== */

    loadData: function (app) {
      this.loadDoctors();
      this.loadPatients();
      this.loadAppointments(app);
    },

    /* ==================================================
       FILTER MATCH
       ================================================== */

    matchesQuery: function (appointment) {
      if (!this.filters.query) return true;

      const query = this.normalizeText(this.filters.query);

      return [
        appointment.id,
        appointment.patient_name,
        appointment.patient_phone,
        appointment.doctor_name,
        appointment.doctor_specialty,
        appointment.service_name,
        appointment.reason,
        appointment.notes
      ].some(function (value) {
        return AdminAppointmentsScreen.normalizeText(value).includes(query);
      });
    },

    matchesStatus: function (appointment) {
      if (!this.filters.status) return true;
      return appointment.status === this.filters.status;
    },

    matchesDate: function (appointment) {
      if (!this.filters.date) return true;
      return appointment.date === this.filters.date;
    },

    matchesDoctor: function (appointment) {
      if (!this.filters.doctorId) return true;
      return String(appointment.doctor_id) === String(this.filters.doctorId);
    },

    matchesPatient: function (appointment) {
      if (!this.filters.patientId) return true;
      return String(appointment.patient_id) === String(this.filters.patientId);
    },

    /* ==================================================
       APPLY FILTERS
       ================================================== */

    applyFilters: function () {
      this.filteredAppointments = this.appointments.filter(function (appointment) {
        return (
          AdminAppointmentsScreen.matchesQuery(appointment) &&
          AdminAppointmentsScreen.matchesStatus(appointment) &&
          AdminAppointmentsScreen.matchesDate(appointment) &&
          AdminAppointmentsScreen.matchesDoctor(appointment) &&
          AdminAppointmentsScreen.matchesPatient(appointment)
        );
      });

      return this.filteredAppointments;
    },

    /* ==================================================
       COUNTS
       ================================================== */

    countStatus: function (status) {
      return this.appointments.filter(function (apt) {
        return apt.status === status;
      }).length;
    },

    getTodayValue: function () {
      const date = new Date();
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-");
    },

    countToday: function () {
      const today = this.getTodayValue();
      return this.appointments.filter(function (apt) {
        return apt.date === today;
      }).length;
    },

    /* ==================================================
       FIND
       ================================================== */

    findAppointment: function (appointmentId) {
      return this.appointments.find(function (apt) {
        return String(apt.id) === String(appointmentId);
      }) || null;
    },

    /* ==================================================
       UPDATE EVERY STORE
       ================================================== */

    syncAppointment: function (updatedAppointment, app) {
      let allAppointments = this.getAppointmentsSafely(app);

      const index = allAppointments.findIndex(function (item) {
        return String(item.id) === String(updatedAppointment.id);
      });

      if (index >= 0) {
        allAppointments[index] = updatedAppointment;
      } else {
        allAppointments.push(updatedAppointment);
      }

      return this.saveAppointmentsToAllStores(allAppointments, app);
    },

    /* ==================================================
       CHANGE STATUS
       ================================================== */

    changeStatus: function (appointmentId, status, app) {
      const appointment = this.findAppointment(appointmentId);
      if (!appointment) return false;

      const normalized = this.normalizeStatus(status);
      const admin = app.state?.admin || app.state?.user;
      const now = new Date().toISOString();

      const history = Array.isArray(appointment.history) ? [...appointment.history] : [];
      history.push({
        from: appointment.status,
        to: normalized,
        changedAt: now,
        changedByRole: "admin",
        changedById: admin?.id || admin?.admin_id || null,
        changedByName: admin?.fullName || admin?.name || "Administrator"
      });

      appointment.status = normalized;
      appointment.updatedAt = now;
      appointment.updatedBy = "admin";
      appointment.lastStatusChangedAt = now;
      appointment.lastStatusChangedBy = "admin";
      appointment.history = history;

      if (normalized === "cancelled") {
        appointment.cancelledBy = "admin";
        appointment.cancelledAt = appointment.updatedAt;
      }
      if (normalized === "confirmed") {
        appointment.confirmedAt = appointment.updatedAt;
      }
      if (normalized === "completed") {
        appointment.completedAt = appointment.updatedAt;
      }

      const synced = this.syncAppointment(appointment, app);
      if (!synced) {
        this.showMessage("تعذر حفظ التغييرات.", "error");
        return false;
      }

      this.loadAppointments(app);
      this.refresh();
      this.showMessage("تم تحديث حالة الحجز.", "success");
      return true;
    },

    /* ==================================================
       SELECT APPOINTMENT
       ================================================== */

    selectAppointment: function (appointmentId) {
      const appointment = this.findAppointment(appointmentId);
      if (!appointment) return;

      this.selectedAppointmentId = appointment.id;
      sessionStorage.setItem("monmedecin-admin-selected-appointment-id", String(appointment.id));
      this.refreshDetails();
    },

    closeDetails: function () {
      this.selectedAppointmentId = null;
      sessionStorage.removeItem("monmedecin-admin-selected-appointment-id");
      this.refreshDetails();
    },

    /* ==================================================
       FORMAT
       ================================================== */

    formatDate: function (value) {
      if (!value) return "—";
      try {
        return new Intl.DateTimeFormat("ar-DZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }).format(new Date(`${value}T12:00:00`));
      } catch (error) {
        return value;
      }
    },

    formatPrice: function (value) {
      try {
        return new Intl.NumberFormat("fr-DZ").format(Number(value) || 0);
      } catch (error) {
        return String(Number(value) || 0);
      }
    },

    /* ==================================================
       RENDER OPTIONS
       ================================================== */

    renderDoctorOptions: function () {
      return this.doctors.map(function (doctor) {
        const id = doctor.id || doctor.doctor_id;
        const name = doctor.fullName || doctor.name || doctor.professional?.title || "طبيب";
        return `
          <option value="${AdminAppointmentsScreen.escapeHTML(id)}"
            ${String(AdminAppointmentsScreen.filters.doctorId) === String(id) ? "selected" : ""}>
            ${AdminAppointmentsScreen.escapeHTML(name)}
          </option>
        `;
      }).join("");
    },

    renderPatientOptions: function () {
      return this.patients.map(function (patient) {
        const id = patient.id || patient.patient_id || patient.phone;
        const name = patient.fullName || patient.name || "مريض";
        return `
          <option value="${AdminAppointmentsScreen.escapeHTML(id)}"
            ${String(AdminAppointmentsScreen.filters.patientId) === String(id) ? "selected" : ""}>
            ${AdminAppointmentsScreen.escapeHTML(name)}
          </option>
        `;
      }).join("");
    },

    /* ==================================================
       RENDER APPOINTMENT CARD
       ================================================== */

    renderAppointment: function (appointment) {
      const statusLabel = this.getStatusLabel(appointment.status);
      const statusClass = `is-${appointment.status}`;

      return `
        <article class="admin-appointment-card glass status-${appointment.status}">
          <div class="admin-appointment-card__top">
            <div class="admin-appointment-card__patient">
              <div class="admin-appointment-card__avatar">
                ${this.escapeHTML(String(appointment.patient_name || "م").charAt(0))}
              </div>
              <div>
                <span>المريض</span>
                <h3>${this.escapeHTML(appointment.patient_name)}</h3>
                <small dir="ltr">${this.escapeHTML(appointment.patient_phone || appointment.patient_id || "")}</small>
              </div>
            </div>
            <span class="admin-appointment-status ${statusClass}">${statusLabel}</span>
          </div>

          <div class="admin-appointment-card__doctor">
            <span>الطبيب</span>
            <strong>${this.escapeHTML(appointment.doctor_name)}</strong>
            <small>${this.escapeHTML(appointment.doctor_specialty)}</small>
          </div>

          <div class="admin-appointment-card__meta">
            <div>
              <span>التاريخ</span>
              <strong>${this.formatDate(appointment.date)}</strong>
            </div>
            <div>
              <span>الساعة</span>
              <strong dir="ltr">${this.escapeHTML(appointment.time)}</strong>
            </div>
            <div>
              <span>الخدمة</span>
              <strong>${this.escapeHTML(appointment.service_name)}</strong>
            </div>
            <div>
              <span>السعر</span>
              <strong>${this.formatPrice(appointment.service_price)} دج</strong>
            </div>
          </div>

          <div class="admin-appointment-card__actions">
            <button class="is-view" data-admin-appointment-view="${this.escapeHTML(appointment.id)}" type="button">
              التفاصيل
            </button>

            ${appointment.status === "pending" ? `
              <button class="is-confirm" data-admin-appointment-status="${this.escapeHTML(appointment.id)}" data-status="confirmed" type="button">
                تأكيد
              </button>
            ` : ""}

            ${appointment.status === "confirmed" ? `
              <button class="is-progress" data-admin-appointment-status="${this.escapeHTML(appointment.id)}" data-status="in_progress" type="button">
                بدء
              </button>
            ` : ""}

            ${appointment.status === "in_progress" ? `
              <button class="is-complete" data-admin-appointment-status="${this.escapeHTML(appointment.id)}" data-status="completed" type="button">
                إكمال
              </button>
            ` : ""}

            ${!["completed", "cancelled", "no_show"].includes(appointment.status) ? `
              <button class="is-cancel" data-admin-appointment-status="${this.escapeHTML(appointment.id)}" data-status="cancelled" type="button">
                إلغاء
              </button>
            ` : ""}

            ${appointment.status === "completed" || appointment.status === "cancelled" ? `
              <button class="is-archive" data-admin-appointment-archive="${this.escapeHTML(appointment.id)}" type="button" style="border:1px solid rgba(66,116,217,0.1);background:rgba(66,116,217,0.06);color:#3f70b8;">
                ${appointment.status === "completed" ? "✅ مكتمل" : "❌ ملغى"}
              </button>
            ` : ""}
          </div>
        </article>
      `;
    },

    /* ==================================================
       RENDER LIST
       ================================================== */

    renderAppointments: function () {
      if (this.filteredAppointments.length === 0) {
        return `
          <section class="admin-appointments-empty glass">
            <span>◷</span>
            <h3>لا توجد حجوزات</h3>
            <p>
              ${this.appointments.length === 0 
                ? 'لم يتم العثور على حجوزات في النظام.' 
                : 'لم نجد حجوزات مطابقة للفلاتر الحالية.'}
            </p>
            ${this.appointments.length > 0 ? `
              <button id="adminAppointmentsShowAll" type="button" style="margin-top:8px;border:1px solid rgba(66,116,217,0.1);background:rgba(66,116,217,0.06);color:#3f70b8;">
                عرض جميع المواعيد (${this.appointments.length})
              </button>
            ` : `
              <button id="adminAppointmentsResetEmpty" type="button">مسح الفلاتر</button>
            `}
          </section>
        `;
      }

      return this.filteredAppointments.map(function (appointment) {
        return AdminAppointmentsScreen.renderAppointment(appointment);
      }).join("");
    },

    /* ==================================================
       RENDER DETAILS
       ================================================== */

    renderDetails: function () {
      if (!this.selectedAppointmentId) return "";

      const appointment = this.findAppointment(this.selectedAppointmentId);
      if (!appointment) return "";

      const history = Array.isArray(appointment.history) ? appointment.history : [];

      return `
        <div class="admin-appointment-detail-overlay">
          <section class="admin-appointment-detail glass">
            <header class="admin-appointment-detail__header">
              <div>
                <span>تفاصيل الحجز</span>
                <h2>${this.escapeHTML(appointment.id)}</h2>
              </div>
              <button id="adminAppointmentDetailClose" type="button">×</button>
            </header>

            <div class="admin-appointment-detail__status">
              <span>الحالة الحالية</span>
              <strong class="admin-appointment-status is-${appointment.status}">
                ${this.getStatusLabel(appointment.status)}
              </strong>
            </div>

            <div class="admin-appointment-detail__grid">
              <div>
                <span>المريض</span>
                <strong>${this.escapeHTML(appointment.patient_name)}</strong>
              </div>
              <div>
                <span>هاتف المريض</span>
                <strong dir="ltr">${this.escapeHTML(appointment.patient_phone || "—")}</strong>
              </div>
              <div>
                <span>الطبيب</span>
                <strong>${this.escapeHTML(appointment.doctor_name)}</strong>
              </div>
              <div>
                <span>التخصص</span>
                <strong>${this.escapeHTML(appointment.doctor_specialty || "—")}</strong>
              </div>
              <div>
                <span>الخدمة</span>
                <strong>${this.escapeHTML(appointment.service_name)}</strong>
              </div>
              <div>
                <span>السعر</span>
                <strong>${this.formatPrice(appointment.service_price)} دج</strong>
              </div>
              <div>
                <span>التاريخ</span>
                <strong>${this.formatDate(appointment.date)}</strong>
              </div>
              <div>
                <span>الساعة</span>
                <strong dir="ltr">${this.escapeHTML(appointment.time)}</strong>
              </div>
              <div>
                <span>المدة</span>
                <strong>${appointment.service_duration} دقيقة</strong>
              </div>
              <div>
                <span>مصدر الحجز</span>
                <strong>${appointment.createdBy === "admin" ? "المدير" : this.escapeHTML(appointment.createdBy || "—")}</strong>
              </div>
            </div>

            ${appointment.reason ? `
              <div class="admin-appointment-detail__text">
                <span>سبب الزيارة</span>
                <p>${this.escapeHTML(appointment.reason)}</p>
              </div>
            ` : ""}

            ${appointment.notes ? `
              <div class="admin-appointment-detail__text">
                <span>الملاحظات</span>
                <p>${this.escapeHTML(appointment.notes)}</p>
              </div>
            ` : ""}

            ${history.length > 0 ? `
              <div class="admin-appointment-detail__history">
                <span>سجل التغييرات</span>
                <div class="admin-appointment-detail__history-list">
                  ${history.slice().reverse().map(function (item) {
                    const fromLabel = AdminAppointmentsScreen.getStatusLabel(item.from);
                    const toLabel = AdminAppointmentsScreen.getStatusLabel(item.to);
                    const changedBy = item.changedByName || item.changedByRole || "النظام";
                    return `
                      <div class="admin-appointment-history-item">
                        <span class="admin-appointment-history-dot is-${item.to}"></span>
                        <div>
                          <strong>${fromLabel} ← ${toLabel}</strong>
                          <small>بواسطة: ${AdminAppointmentsScreen.escapeHTML(changedBy)}</small>
                          <small dir="ltr">${AdminAppointmentsScreen.escapeHTML(item.changedAt || "")}</small>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            ` : ""}

            <div class="admin-appointment-detail__actions">
              <select id="adminAppointmentDetailStatus">
                <option value="pending" ${appointment.status === "pending" ? "selected" : ""}>قيد الانتظار</option>
                <option value="confirmed" ${appointment.status === "confirmed" ? "selected" : ""}>مؤكد</option>
                <option value="in_progress" ${appointment.status === "in_progress" ? "selected" : ""}>جاري</option>
                <option value="completed" ${appointment.status === "completed" ? "selected" : ""}>مكتمل</option>
                <option value="cancelled" ${appointment.status === "cancelled" ? "selected" : ""}>ملغى</option>
                <option value="no_show" ${appointment.status === "no_show" ? "selected" : ""}>عدم حضور</option>
              </select>
              <button id="adminAppointmentDetailSaveStatus" data-appointment-id="${this.escapeHTML(appointment.id)}" type="button">
                حفظ الحالة
              </button>
            </div>

          </section>
        </div>
      `;
    },

    /* ==================================================
       REFRESH
       ================================================== */

    refresh: function () {
      const results = document.getElementById("adminAppointmentsResults");
      const count = document.getElementById("adminAppointmentsResultsCount");

      if (results) {
        results.innerHTML = this.renderAppointments();
      }

      if (count) {
        count.textContent = String(this.filteredAppointments.length);
      }

      // تحديث الإحصائيات
      const pending = document.getElementById("adminAppointmentsPendingCount");
      const confirmed = document.getElementById("adminAppointmentsConfirmedCount");
      const completed = document.getElementById("adminAppointmentsCompletedCount");
      const today = document.getElementById("adminAppointmentsTodayCount");

      if (pending) pending.textContent = String(this.countStatus("pending"));
      if (confirmed) confirmed.textContent = String(this.countStatus("confirmed"));
      if (completed) completed.textContent = String(this.countStatus("completed"));
      if (today) today.textContent = String(this.countToday());

      this.refreshDetails();
    },

    refreshDetails: function () {
      const container = document.getElementById("adminAppointmentsDetailRoot");
      if (container) {
        container.innerHTML = this.renderDetails();
      }
    },

    /* ==================================================
       RESET
       ================================================== */

    resetFilters: function () {
      this.filters = {
        query: "",
        status: "",
        date: "",
        doctorId: "",
        patientId: ""
      };
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("adminAppointmentsMessage");
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
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadData(app);

      const isMobile = state.deviceMode === "mobile";
      const hasFiltered = this.filteredAppointments.length > 0;
      const totalCount = this.appointments.length;

      return `
        <main class="admin-appointments ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="admin-appointments__orb admin-appointments__orb--blue"></div>
          <div class="admin-appointments__orb admin-appointments__orb--cyan"></div>

          <header class="admin-appointments__header">
            <button id="adminAppointmentsBack" class="admin-appointments__back" type="button">→</button>
            <div class="admin-appointments__header-copy">
              <strong>إدارة الحجوزات</strong>
              <span>${this.showAllAppointments ? "عرض الكل" : "عرض المواعيد النشطة والحديثة"}</span>
            </div>
            <button id="adminAppointmentsTheme" class="admin-appointments__theme" type="button">◐</button>
          </header>

          <section class="admin-appointments__container">

            <section class="admin-appointments__hero">
              <span>الحجوزات</span>
              <h1>إدارة المواعيد</h1>
              <p>مراقبة حجوزات المرضى والأطباء، وتغيير حالة الموعد عند الحاجة.</p>
            </section>

            <!-- 🔑 زر تبديل عرض المواعيد -->
            <section style="display:flex;gap:8px;margin-bottom:13px;flex-wrap:wrap;">
              <button id="adminAppointmentsToggleFilter" 
                type="button" 
                style="min-height:36px;padding:0 14px;border:1px solid ${this.showAllAppointments ? 'rgba(66,116,217,0.15)' : 'rgba(66,116,217,0.1)'};border-radius:11px;background:${this.showAllAppointments ? 'rgba(66,116,217,0.08)' : 'rgba(66,116,217,0.04)'};color:#3f70b8;font-family:inherit;font-size:8px;font-weight:900;cursor:pointer;transition:all 0.2s ease;">
                ${this.showAllAppointments ? '🔽 إخفاء المواعيد القديمة' : '📋 عرض جميع المواعيد (' + totalCount + ')'}
              </button>
              <button id="adminAppointmentsRefresh" 
                type="button" 
                style="min-height:36px;padding:0 14px;border:1px solid rgba(66,116,217,0.1);border-radius:11px;background:rgba(66,116,217,0.04);color:#3f70b8;font-family:inherit;font-size:8px;font-weight:900;cursor:pointer;">
                🔄 تحديث
              </button>
            </section>

            <section class="admin-appointments-stats">
              <article class="admin-appointments-stat glass">
                <span>الكل</span>
                <strong>${this.appointments.length}</strong>
              </article>
              <article class="admin-appointments-stat glass is-warning">
                <span>قيد الانتظار</span>
                <strong id="adminAppointmentsPendingCount">${this.countStatus("pending")}</strong>
              </article>
              <article class="admin-appointments-stat glass is-success">
                <span>مؤكدة</span>
                <strong id="adminAppointmentsConfirmedCount">${this.countStatus("confirmed")}</strong>
              </article>
              <article class="admin-appointments-stat glass">
                <span>مكتملة</span>
                <strong id="adminAppointmentsCompletedCount">${this.countStatus("completed")}</strong>
              </article>
              <article class="admin-appointments-stat glass">
                <span>اليوم</span>
                <strong id="adminAppointmentsTodayCount">${this.countToday()}</strong>
              </article>
            </section>

            <section class="admin-appointments-search glass">
              <div class="admin-appointments-search__main">
                <span>⌕</span>
                <input id="adminAppointmentsQuery" type="search" value="${this.escapeHTML(this.filters.query)}" placeholder="اسم المريض أو الطبيب أو الخدمة..." autocomplete="off">
              </div>
              <div class="admin-appointments-search__filters">
                <label>
                  <span>الحالة</span>
                  <select id="adminAppointmentsStatus">
                    <option value="">كل الحالات</option>
                    <option value="pending" ${this.filters.status === "pending" ? "selected" : ""}>قيد الانتظار</option>
                    <option value="confirmed" ${this.filters.status === "confirmed" ? "selected" : ""}>مؤكد</option>
                    <option value="in_progress" ${this.filters.status === "in_progress" ? "selected" : ""}>جاري</option>
                    <option value="completed" ${this.filters.status === "completed" ? "selected" : ""}>مكتمل</option>
                    <option value="cancelled" ${this.filters.status === "cancelled" ? "selected" : ""}>ملغى</option>
                    <option value="no_show" ${this.filters.status === "no_show" ? "selected" : ""}>عدم حضور</option>
                  </select>
                </label>
                <label>
                  <span>التاريخ</span>
                  <input id="adminAppointmentsDate" type="date" value="${this.escapeHTML(this.filters.date)}">
                </label>
                <label>
                  <span>الطبيب</span>
                  <select id="adminAppointmentsDoctor">
                    <option value="">كل الأطباء</option>
                    ${this.renderDoctorOptions()}
                  </select>
                </label>
                <label>
                  <span>المريض</span>
                  <select id="adminAppointmentsPatient">
                    <option value="">كل المرضى</option>
                    ${this.renderPatientOptions()}
                  </select>
                </label>
                <button id="adminAppointmentsReset" type="button">مسح الفلاتر</button>
              </div>
            </section>

            <div id="adminAppointmentsMessage" class="admin-appointments-message" hidden></div>

            <section class="admin-appointments-results__head">
              <div>
                <span>نتائج الإدارة</span>
                <h2>جميع الحجوزات</h2>
              </div>
              <strong id="adminAppointmentsResultsCount">${this.filteredAppointments.length}</strong>
            </section>

            <section id="adminAppointmentsResults" class="admin-appointments-results">
              ${this.renderAppointments()}
            </section>

          </section>

          <div id="adminAppointmentsDetailRoot">${this.renderDetails()}</div>

          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="doctors" type="button">
                <span class="mobile-bottom-nav__icon">✚</span>
                <span>الأطباء</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>الحجوزات</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="settings" type="button">
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
      console.log("MON MÉDECIN: AdminAppointmentsScreen init");

      // ===== BACK =====
      document.getElementById("adminAppointmentsBack")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });

      // ===== THEME =====
      document.getElementById("adminAppointmentsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // ===== 🔑 TOGGLE FILTER =====
      document.getElementById("adminAppointmentsToggleFilter")?.addEventListener("click", function () {
        AdminAppointmentsScreen.showAllAppointments = !AdminAppointmentsScreen.showAllAppointments;
        AdminAppointmentsScreen.loadAppointments(app);
        AdminAppointmentsScreen.refresh();
      });

      // ===== 🔄 REFRESH =====
      document.getElementById("adminAppointmentsRefresh")?.addEventListener("click", function () {
        AdminAppointmentsScreen.loadAppointments(app);
        AdminAppointmentsScreen.refresh();
        AdminAppointmentsScreen.showMessage("تم تحديث البيانات.", "success");
      });

      // ===== QUERY =====
      document.getElementById("adminAppointmentsQuery")?.addEventListener("input", function (event) {
        AdminAppointmentsScreen.filters.query = event.target.value;
        AdminAppointmentsScreen.applyFilters();
        AdminAppointmentsScreen.refresh();
      });

      // ===== STATUS =====
      document.getElementById("adminAppointmentsStatus")?.addEventListener("change", function (event) {
        AdminAppointmentsScreen.filters.status = event.target.value;
        AdminAppointmentsScreen.applyFilters();
        AdminAppointmentsScreen.refresh();
      });

      // ===== DATE =====
      document.getElementById("adminAppointmentsDate")?.addEventListener("change", function (event) {
        AdminAppointmentsScreen.filters.date = event.target.value;
        AdminAppointmentsScreen.applyFilters();
        AdminAppointmentsScreen.refresh();
      });

      // ===== DOCTOR =====
      document.getElementById("adminAppointmentsDoctor")?.addEventListener("change", function (event) {
        AdminAppointmentsScreen.filters.doctorId = event.target.value;
        AdminAppointmentsScreen.applyFilters();
        AdminAppointmentsScreen.refresh();
      });

      // ===== PATIENT =====
      document.getElementById("adminAppointmentsPatient")?.addEventListener("change", function (event) {
        AdminAppointmentsScreen.filters.patientId = event.target.value;
        AdminAppointmentsScreen.applyFilters();
        AdminAppointmentsScreen.refresh();
      });

      // ===== RESET =====
      document.getElementById("adminAppointmentsReset")?.addEventListener("click", function () {
        AdminAppointmentsScreen.resetFilters();
        // إعادة تعيين قيم الحقول
        const queryInput = document.getElementById("adminAppointmentsQuery");
        const statusSelect = document.getElementById("adminAppointmentsStatus");
        const dateInput = document.getElementById("adminAppointmentsDate");
        const doctorSelect = document.getElementById("adminAppointmentsDoctor");
        const patientSelect = document.getElementById("adminAppointmentsPatient");

        if (queryInput) queryInput.value = "";
        if (statusSelect) statusSelect.value = "";
        if (dateInput) dateInput.value = "";
        if (doctorSelect) doctorSelect.value = "";
        if (patientSelect) patientSelect.value = "";

        AdminAppointmentsScreen.applyFilters();
        AdminAppointmentsScreen.refresh();
      });

      // ===== RESULTS EVENTS =====
      document.getElementById("adminAppointmentsResults")?.addEventListener("click", function (event) {
        // VIEW
        const view = event.target.closest("[data-admin-appointment-view]");
        if (view) {
          AdminAppointmentsScreen.selectAppointment(view.dataset.adminAppointmentView);
          return;
        }

        // STATUS CHANGE
        const status = event.target.closest("[data-admin-appointment-status]");
        if (status) {
          const nextStatus = status.dataset.status;
          const appointmentId = status.dataset.adminAppointmentStatus;

          if (nextStatus === "cancelled") {
            const confirmed = window.confirm("هل تريد إلغاء هذا الحجز إدارياً؟");
            if (!confirmed) return;
          }

          AdminAppointmentsScreen.changeStatus(appointmentId, nextStatus, app);
          return;
        }

        // SHOW ALL (from empty state)
        const showAll = event.target.closest("#adminAppointmentsShowAll");
        if (showAll) {
          AdminAppointmentsScreen.showAllAppointments = true;
          AdminAppointmentsScreen.loadAppointments(app);
          AdminAppointmentsScreen.refresh();
          return;
        }

        // RESET (from empty state)
        const reset = event.target.closest("#adminAppointmentsResetEmpty");
        if (reset) {
          AdminAppointmentsScreen.resetFilters();
          app.render();
        }
      });

      // ===== DETAILS EVENTS =====
      document.getElementById("adminAppointmentsDetailRoot")?.addEventListener("click", function (event) {
        const close = event.target.closest("#adminAppointmentDetailClose");
        if (close) {
          AdminAppointmentsScreen.closeDetails();
          return;
        }

        const overlay = event.target.closest(".admin-appointment-detail-overlay");
        if (overlay && event.target === overlay) {
          AdminAppointmentsScreen.closeDetails();
          return;
        }

        const save = event.target.closest("#adminAppointmentDetailSaveStatus");
        if (save) {
          const select = document.getElementById("adminAppointmentDetailStatus");
          if (!select) return;

          AdminAppointmentsScreen.changeStatus(save.dataset.appointmentId, select.value, app);
        }
      });

      // ===== NAV =====
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/dashboard");
        });
      });

      document.querySelectorAll("[data-nav='doctors']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/doctors");
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

  /* ====================================================
     EXPOSE
     ==================================================== */

  window.AdminAppointmentsScreen = AdminAppointmentsScreen;

})();