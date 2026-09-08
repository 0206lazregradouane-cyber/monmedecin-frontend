/* =========================================================
   MON MÉDECIN
   PATIENT APPOINTMENTS - FIXED (WITH BOOKING NUMBER)
   ========================================================= */

(function () {

  "use strict";

  const PatientAppointmentsScreen = {

    /* =====================================================
       STATE
       ===================================================== */

    appointments: [],
    filter: "all",
    search: "",
    expandedAppointmentId: null,
    messageTimer: null,

    /* =====================================================
       🔑 ENSURE ARRAY - التأكد من أن القيمة مصفوفة
       ===================================================== */

    ensureArray: function (value) {
      return Array.isArray(value) ? value : [];
    },

    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    /* =====================================================
       STORAGE HELPERS
       ===================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN:", "Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN:", "Cannot write", key, error);
        return false;
      }
    },

    /* =====================================================
       NORMALIZE APPOINTMENT - FIXED with createdAt
       ===================================================== */

    normalizeAppointment: function (appointment) {
      if (!appointment || typeof appointment !== "object") {
        return null;
      }

      // التأكد من وجود createdAt
      let createdAt = appointment.createdAt || appointment.created_at;
      if (!createdAt && appointment.date) {
        createdAt = appointment.date + 'T00:00:00';
      }
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      // التأكد من وجود updatedAt
      let updatedAt = appointment.updatedAt || appointment.updated_at;
      if (!updatedAt) {
        updatedAt = createdAt;
      }

      return {
        ...appointment,
        id: appointment.id ?? "APT-UNKNOWN",
        doctor_id: appointment.doctor_id ?? appointment.doctorId ?? null,
        patient_id: appointment.patient_id ?? appointment.patientId ?? null,
        doctorName: appointment.doctorName || appointment.doctor_name || "طبيب",
        doctorSpecialty: appointment.doctorSpecialty || appointment.doctor_specialty || "",
        serviceName: appointment.serviceName || appointment.service_name || "استشارة",
        date: appointment.date || appointment.appointment_date || "",
        time: appointment.time || appointment.appointment_time || "",
        duration: Number(appointment.duration || appointment.service_duration) || 30,
        price: Number(appointment.price || appointment.service_price) || 0,
        status: appointment.status || "pending",
        createdAt: createdAt,
        updatedAt: updatedAt
      };
    },

    /* =====================================================
       🔑 GET APPOINTMENTS - مع التأكد من أن القيمة مصفوفة
       ===================================================== */

    getAppointmentsSafely: function (app) {
      if (typeof app.getAppointmentsSafely === "function") {
        return this.ensureArray(app.getAppointmentsSafely());
      }
      if (typeof app.getAppointments === "function") {
        return this.ensureArray(app.getAppointments());
      }
      let appointments = this.readJSON(localStorage, "monmedecin-appointments", []);
      return this.ensureArray(appointments);
    },

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
        let data = PatientAppointmentsScreen.readJSON(localStorage, key, []);
        if (!Array.isArray(data)) data = [];
        appointments.forEach(function (appointment) {
          const index = data.findIndex(function (item) {
            return String(item.id || item.appointment_id) === String(appointment.id || appointment.appointment_id);
          });
          if (index >= 0) data[index] = appointment;
          else data.push(appointment);
        });
        const saved = PatientAppointmentsScreen.writeJSON(localStorage, key, data);
        if (!saved) allSaved = false;
      });
      return allSaved;
    },

    /* =====================================================
       PATIENT
       ===================================================== */

    getPatient: function (app) {
      return (
        app.state.patient ||
        (app.state.role === "patient" ? app.state.user : null)
      );
    },

    getPatientId: function (app) {
      const patient = this.getPatient(app);
      return patient?.id || patient?.patient_id || null;
    },

    /* =====================================================
       🔑 LOAD - مع التأكد من أن البيانات مصفوفة
       ===================================================== */

    load: function (app) {
      try {
        // 🔑 التأكد من أن appointments مصفوفة
        var rawAppointments = this.getAppointmentsSafely(app);
        this.appointments = this.ensureArray(rawAppointments)
          .map(function(appointment) {
            return PatientAppointmentsScreen.normalizeAppointment(appointment);
          })
          .filter(function(appointment) {
            return appointment !== null;
          });
        
        const patientId = this.getPatientId(app);
        if (patientId) {
          this.appointments = this.appointments.filter(function (apt) {
            return String(apt.patient_id || apt.patientId) === String(patientId);
          });
        }
        this.appointments = [...this.appointments].sort(function (a, b) {
          return `${b.date || ""}T${b.time || "00:00"}`.localeCompare(`${a.date || ""}T${a.time || "00:00"}`);
        });
      } catch (error) {
        console.error("MON MÉDECIN PATIENT APPOINTMENTS:", "Error loading appointments", error);
        this.appointments = [];
      }
    },

    /* =====================================================
       STATUS META
       ===================================================== */

    getStatusMeta: function (status) {
      const map = {
        pending: { label: "قيد الانتظار", description: "تم إرسال طلب الحجز وينتظر معالجة الطبيب أو السكرتارية.", className: "is-pending", step: 1 },
        confirmed: { label: "تم التأكيد", description: "تم تأكيد موعدك.", className: "is-confirmed", step: 2 },
        arrived: { label: "تم تسجيل الوصول", description: "تم تسجيل وصولك إلى العيادة.", className: "is-arrived", step: 3 },
        in_progress: { label: "جاري الفحص", description: "بدأ الطبيب الفحص.", className: "is-progress", step: 4 },
        completed: { label: "مكتمل", description: "تم إنهاء الموعد.", className: "is-completed", step: 5 },
        rejected: { label: "مرفوض", description: "تم رفض طلب الموعد.", className: "is-rejected", step: 0 },
        cancelled: { label: "ملغى", description: "تم إلغاء الموعد.", className: "is-cancelled", step: 0 },
        no_show: { label: "لم يتم الحضور", description: "تم تسجيل عدم الحضور لهذا الموعد.", className: "is-no-show", step: 0 }
      };
      return map[status] || { label: status || "غير معروف", description: "حالة الموعد غير معروفة.", className: "is-default", step: 0 };
    },

    /* =====================================================
       CAN PATIENT CANCEL
       ===================================================== */

    canCancel: function (appointment) {
      if (!appointment) return false;
      return ["pending", "confirmed"].includes(appointment.status);
    },

    /* =====================================================
       FIND
       ===================================================== */

    findAppointment: function (appointmentId) {
      return this.appointments.find(function (appointment) {
        return String(appointment.id || appointment.appointment_id) === String(appointmentId);
      }) || null;
    },

    /* =====================================================
       CANCEL APPOINTMENT
       ===================================================== */

    cancelAppointment: function (appointmentId, app) {
      try {
        console.log("MON MÉDECIN: Cancelling appointment", appointmentId);
        const patient = this.getPatient(app);
        const patientId = this.getPatientId(app);
        const appointment = this.findAppointment(appointmentId);
        if (!appointment) {
          this.showMessage("تعذر العثور على الموعد.", "error");
          return false;
        }
        const appointmentPatientId = appointment.patient_id || appointment.patientId;
        if (String(patientId) !== String(appointmentPatientId)) {
          this.showMessage("لا يمكنك إلغاء موعد تابع لمريض آخر.", "error");
          return false;
        }
        if (!this.canCancel(appointment)) {
          this.showMessage("لا يمكن إلغاء الموعد في حالته الحالية.", "error");
          return false;
        }

        let allAppointments = this.getAppointmentsSafely(app);
        if (!Array.isArray(allAppointments)) allAppointments = [];
        const index = allAppointments.findIndex(function (item) {
          return String(item.id || item.appointment_id) === String(appointmentId);
        });
        if (index < 0) {
          this.showMessage("تعذر تحديث الموعد.", "error");
          return false;
        }

        const previous = allAppointments[index];
        const now = new Date().toISOString();
        const history = Array.isArray(previous.history) ? [...previous.history] : [];
        history.push({
          from: previous.status,
          to: "cancelled",
          changedAt: now,
          changedByRole: "patient",
          changedById: patient?.id || patient?.patient_id || null,
          changedByName: patient?.fullName || patient?.name || "Patient"
        });

        allAppointments[index] = {
          ...previous,
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: "patient",
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: "patient",
          history: history
        };

        const saved = this.saveAppointmentsToAllStores(allAppointments, app);
        if (!saved) {
          this.showMessage("تعذر حفظ إلغاء الموعد.", "error");
          return false;
        }

        this.load(app);
        this.showMessage("تم إلغاء الموعد.", "success");
        return true;

      } catch (error) {
        console.error("MON MÉDECIN: Error cancelling appointment:", error);
        this.showMessage("حدث خطأ أثناء إلغاء الموعد: " + (error.message || "خطأ غير معروف"), "error");
        return false;
      }
    },

    /* =====================================================
       MESSAGE
       ===================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("patientAppointmentsMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }
      element.hidden = false;
      element.textContent = message;
      element.className = "patient-appointments-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");
      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 4000);
    },

    /* =====================================================
       FILTER
       ===================================================== */

    getFilteredAppointments: function () {
      let appointments = [...this.appointments];
      if (this.filter !== "all") {
        appointments = appointments.filter(function (appointment) {
          return appointment.status === this.filter;
        }, this);
      }
      const search = String(this.search || "").trim().toLowerCase();
      if (search) {
        appointments = appointments.filter(function (appointment) {
          const haystack = [
            appointment.doctorName,
            appointment.doctorSpecialty,
            appointment.serviceName,
            appointment.date,
            appointment.time,
            appointment.bookingNumber
          ].join(" ").toLowerCase();
          return haystack.includes(search);
        });
      }
      return appointments;
    },

    /* =====================================================
       STATS
       ===================================================== */

    getStats: function () {
      return {
        total: this.appointments.length,
        pending: this.appointments.filter(function (item) { return item.status === "pending"; }).length,
        confirmed: this.appointments.filter(function (item) { return item.status === "confirmed"; }).length,
        completed: this.appointments.filter(function (item) { return item.status === "completed"; }).length
      };
    },

    /* =====================================================
       WORKFLOW
       ===================================================== */

    renderWorkflow: function (appointment) {
      const meta = this.getStatusMeta(appointment.status);
      if (["rejected", "cancelled", "no_show"].includes(appointment.status)) {
        return `
          <div class="patient-appointment-workflow is-final-special">
            <div class="patient-appointment-workflow__final ${meta.className}">
              <span>${appointment.status === "rejected" ? "✕" : (appointment.status === "cancelled" ? "⊘" : "!")}</span>
              <div>
                <strong>${this.escapeHTML(meta.label)}</strong>
                <small>${this.escapeHTML(meta.description)}</small>
              </div>
            </div>
          </div>
        `;
      }

      const steps = [
        { key: "pending", title: "تم طلب الموعد", step: 1 },
        { key: "confirmed", title: "تم التأكيد", step: 2 },
        { key: "arrived", title: "الوصول", step: 3 },
        { key: "in_progress", title: "الفحص", step: 4 },
        { key: "completed", title: "مكتمل", step: 5 }
      ];

      return `
        <div class="patient-appointment-workflow">
          ${steps.map(function (item) {
            const active = meta.step >= item.step;
            const current = appointment.status === item.key;
            return `
              <div class="patient-appointment-workflow__step ${active ? "is-active" : ""} ${current ? "is-current" : ""}">
                <span>${active ? "✓" : item.step}</span>
                <small>${PatientAppointmentsScreen.escapeHTML(item.title)}</small>
              </div>
            `;
          }).join("")}
        </div>
      `;
    },

    /* =====================================================
       HISTORY
       ===================================================== */

    getHistoryRoleLabel: function (role) {
      const labels = { admin: "الإدارة", doctor: "الطبيب", secretary: "السكرتارية", patient: "المريض" };
      return labels[role] || role || "النظام";
    },

    renderHistory: function (appointment) {
      const history = Array.isArray(appointment.history) ? appointment.history : [];
      if (history.length === 0) {
        return `<div class="patient-appointment-history__empty">لا يوجد سجل تغييرات إضافي لهذا الموعد.</div>`;
      }
      return `
        <div class="patient-appointment-history">
          <h4>سجل حالة الموعد</h4>
          <div class="patient-appointment-history__list">
            ${history.slice().reverse().map(function (item) {
              const from = PatientAppointmentsScreen.getStatusMeta(item.from);
              const to = PatientAppointmentsScreen.getStatusMeta(item.to);
              return `
                <div class="patient-appointment-history__item">
                  <span class="patient-appointment-history__dot ${to.className}"></span>
                  <div>
                    <strong>${PatientAppointmentsScreen.escapeHTML(from.label)} ← ${PatientAppointmentsScreen.escapeHTML(to.label)}</strong>
                    <small>بواسطة: ${PatientAppointmentsScreen.escapeHTML(PatientAppointmentsScreen.getHistoryRoleLabel(item.changedByRole))}</small>
                    ${item.changedAt ? `<small dir="ltr">${PatientAppointmentsScreen.escapeHTML(item.changedAt)}</small>` : ""}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    },

    /* =====================================================
       APPOINTMENT CARD - 🔑 مع رقم الحجز
       ===================================================== */

    renderAppointment: function (appointment) {
      const id = appointment.id || appointment.appointment_id;
      const bookingNumber = appointment.bookingNumber || '---';
      const meta = this.getStatusMeta(appointment.status);
      const expanded = String(this.expandedAppointmentId) === String(id);
      const canCancel = this.canCancel(appointment);

      return `
        <article class="patient-appointment-card glass ${expanded ? "is-expanded" : ""}">
          
          <!-- 🔑 رقم الحجز -->
          <div class="patient-appointment-booking-number">
            <span class="booking-label">📋 رقم الحجز</span>
            <strong class="booking-number" dir="ltr">${bookingNumber}</strong>
          </div>
          
          <div class="patient-appointment-card__top">
            <div class="patient-appointment-card__doctor">
              <div class="patient-appointment-card__avatar">${this.escapeHTML(String(appointment.doctorName || "ط").charAt(0))}</div>
              <div>
                <span>الطبيب</span>
                <h3>${this.escapeHTML(appointment.doctorName || "طبيب")}</h3>
                <small>${this.escapeHTML(appointment.doctorSpecialty || "طبيب")}</small>
              </div>
            </div>
            <span class="patient-appointment-status ${meta.className}">${this.escapeHTML(meta.label)}</span>
          </div>
          <div class="patient-appointment-card__service">
            <span>الخدمة</span>
            <strong>${this.escapeHTML(appointment.serviceName || "استشارة")}</strong>
          </div>
          <div class="patient-appointment-card__info">
            <div>
              <span>التاريخ</span>
              <strong dir="ltr">${this.escapeHTML(appointment.date || "—")}</strong>
            </div>
            <div>
              <span>الوقت</span>
              <strong dir="ltr">${this.escapeHTML(appointment.time || "—")}</strong>
            </div>
            <div>
              <span>النهاية</span>
              <strong dir="ltr">${this.escapeHTML(appointment.endTime || "—")}</strong>
            </div>
            <div>
              <span>المدة</span>
              <strong>${Number(appointment.duration) || 30} دقيقة</strong>
            </div>
          </div>
          <div class="patient-appointment-card__status-note ${meta.className}">
            <span>ℹ</span>
            <p>${this.escapeHTML(meta.description)}</p>
          </div>
          ${this.renderWorkflow(appointment)}
          <div class="patient-appointment-card__actions">
            <button type="button" class="patient-appointment-details" data-patient-appointment-details="${this.escapeHTML(id)}">
              ${expanded ? "إخفاء التفاصيل" : "تفاصيل الموعد"}
            </button>
            ${canCancel ? `
              <button type="button" class="patient-appointment-cancel" data-patient-appointment-cancel="${this.escapeHTML(id)}">إلغاء الموعد</button>
            ` : ""}
          </div>
          ${expanded ? `
            <section class="patient-appointment-card__expanded">
              <div class="patient-appointment-reference">
                <span>رقم الحجز</span>
                <strong dir="ltr">${bookingNumber}</strong>
              </div>
              <div class="patient-appointment-reference">
                <span>رقم الموعد</span>
                <strong dir="ltr">${this.escapeHTML(id)}</strong>
              </div>
              ${appointment.price !== undefined ? `
                <div class="patient-appointment-reference">
                  <span>السعر</span>
                  <strong>${this.escapeHTML(appointment.price)} دج</strong>
                </div>
              ` : ""}
              ${this.renderHistory(appointment)}
            </section>
          ` : ""}
        </article>
      `;
    },

    /* =====================================================
       LIST
       ===================================================== */

    renderList: function () {
      const appointments = this.getFilteredAppointments();
      if (appointments.length === 0) {
        return `
          <section class="patient-appointments-empty glass">
            <span>📅</span>
            <h3>لا توجد مواعيد</h3>
            <p>لم يتم العثور على حجوزات مطابقة للفلاتر الحالية.</p>
            <button id="patientAppointmentsSearchDoctor" type="button">ابحث عن طبيب</button>
          </section>
        `;
      }
      return appointments.map(function (appointment) {
        return PatientAppointmentsScreen.renderAppointment(appointment);
      }).join("");
    },

    /* =====================================================
       RENDER
       ===================================================== */

    render: function (state, app) {
      this.load(app);
      const stats = this.getStats();
      const isMobile = state.deviceMode === 'mobile';

      return `
        <main class="patient-appointments ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="patient-appointments__orb patient-appointments__orb--blue"></div>
          <div class="patient-appointments__orb patient-appointments__orb--cyan"></div>

          <!-- HEADER -->
          <header class="patient-appointments__header">
            <button id="patientAppointmentsBack" class="patient-appointments__back" type="button">→</button>
            <div class="patient-appointments__header-copy">
              <strong>مواعيدي</strong>
              <span>متابعة حجوزاتك الطبية</span>
            </div>
            <button id="patientAppointmentsTheme" class="patient-appointments__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="patient-appointments__container">

            <!-- HERO -->
            <section class="patient-appointments__hero">
              <span>MY APPOINTMENTS</span>
              <h1>حجوزاتي</h1>
              <p>تابع حالة كل موعد من إرسال الطلب إلى انتهاء الفحص.</p>
            </section>

            <!-- MESSAGE -->
            <div id="patientAppointmentsMessage" class="patient-appointments-message" hidden></div>

            <!-- STATS -->
            <section class="patient-appointments-stats">
              <button type="button" class="patient-appointments-stat glass" data-patient-appointments-filter="all">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </button>
              <button type="button" class="patient-appointments-stat glass is-pending" data-patient-appointments-filter="pending">
                <span>انتظار</span>
                <strong>${stats.pending}</strong>
              </button>
              <button type="button" class="patient-appointments-stat glass is-confirmed" data-patient-appointments-filter="confirmed">
                <span>مؤكدة</span>
                <strong>${stats.confirmed}</strong>
              </button>
              <button type="button" class="patient-appointments-stat glass is-completed" data-patient-appointments-filter="completed">
                <span>مكتملة</span>
                <strong>${stats.completed}</strong>
              </button>
            </section>

            <!-- TOOLBAR -->
            <section class="patient-appointments-toolbar glass">
              <div class="patient-appointments-search">
                <span>🔎</span>
                <input id="patientAppointmentsSearch" type="search" placeholder="ابحث بالطبيب أو الخدمة أو رقم الحجز..." value="${this.escapeHTML(this.search)}">
              </div>
              <select id="patientAppointmentsFilter">
                <option value="all" ${this.filter === "all" ? "selected" : ""}>كل الحالات</option>
                <option value="pending" ${this.filter === "pending" ? "selected" : ""}>قيد الانتظار</option>
                <option value="confirmed" ${this.filter === "confirmed" ? "selected" : ""}>مؤكدة</option>
                <option value="arrived" ${this.filter === "arrived" ? "selected" : ""}>تم الوصول</option>
                <option value="in_progress" ${this.filter === "in_progress" ? "selected" : ""}>جاري الفحص</option>
                <option value="completed" ${this.filter === "completed" ? "selected" : ""}>مكتملة</option>
                <option value="cancelled" ${this.filter === "cancelled" ? "selected" : ""}>ملغاة</option>
                <option value="rejected" ${this.filter === "rejected" ? "selected" : ""}>مرفوضة</option>
                <option value="no_show" ${this.filter === "no_show" ? "selected" : ""}>لم يتم الحضور</option>
              </select>
            </section>

            <!-- LIST -->
            <section id="patientAppointmentsList" class="patient-appointments-list">
              ${this.renderList()}
            </section>

          </section>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="home" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="search" type="button">
                <span class="mobile-bottom-nav__icon">⌕</span>
                <span>البحث</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>مواعيدي</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="profile" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>حسابي</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    /* =====================================================
       REFRESH LIST
       ===================================================== */

    refreshList: function () {
      const list = document.getElementById("patientAppointmentsList");
      if (list) {
        list.innerHTML = this.renderList();
      }
    },

    /* =====================================================
       INIT
       ===================================================== */

    init: function (app) {
      console.log("MON MÉDECIN: PatientAppointmentsScreen init");

      /* BACK */
      document.getElementById("patientAppointmentsBack")?.addEventListener("click", function () {
        app.navigate("/patient/home");
      });

      /* THEME */
      document.getElementById("patientAppointmentsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      /* STAT FILTER */
      document.querySelectorAll("[data-patient-appointments-filter]").forEach(function (button) {
        button.addEventListener("click", function () {
          PatientAppointmentsScreen.filter = this.dataset.patientAppointmentsFilter;
          const select = document.getElementById("patientAppointmentsFilter");
          if (select) select.value = PatientAppointmentsScreen.filter;
          PatientAppointmentsScreen.refreshList();
        });
      });

      /* FILTER SELECT */
      document.getElementById("patientAppointmentsFilter")?.addEventListener("change", function () {
        PatientAppointmentsScreen.filter = this.value;
        PatientAppointmentsScreen.refreshList();
      });

      /* SEARCH */
      document.getElementById("patientAppointmentsSearch")?.addEventListener("input", function () {
        PatientAppointmentsScreen.search = this.value;
        PatientAppointmentsScreen.refreshList();
      });

      /* LIST EVENTS */
      document.getElementById("patientAppointmentsList")?.addEventListener("click", function (event) {
        /* DETAILS */
        const details = event.target.closest("[data-patient-appointment-details]");
        if (details) {
          const id = details.dataset.patientAppointmentDetails;
          if (String(PatientAppointmentsScreen.expandedAppointmentId) === String(id)) {
            PatientAppointmentsScreen.expandedAppointmentId = null;
          } else {
            PatientAppointmentsScreen.expandedAppointmentId = id;
          }
          PatientAppointmentsScreen.refreshList();
          return;
        }

        /* CANCEL */
        const cancel = event.target.closest("[data-patient-appointment-cancel]");
        if (cancel) {
          const id = cancel.dataset.patientAppointmentCancel;
          const confirmed = window.confirm("هل تريد إلغاء هذا الموعد؟");
          if (!confirmed) return;
          cancel.disabled = true;
          cancel.textContent = "⏳ جاري...";
          const cancelled = PatientAppointmentsScreen.cancelAppointment(id, app);
          if (cancelled) {
            app.render();
          } else {
            cancel.disabled = false;
            cancel.textContent = "إلغاء الموعد";
          }
          return;
        }
      });

      /* EMPTY SEARCH DOCTOR */
      document.getElementById("patientAppointmentsSearchDoctor")?.addEventListener("click", function () {
        app.navigate("/patient/search");
      });

      /* BOTTOM NAV */
      document.querySelectorAll("[data-nav='home']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/home");
        });
      });
      document.querySelectorAll("[data-nav='search']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/search");
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/appointments");
        });
      });
      document.querySelectorAll("[data-nav='profile']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/profile");
        });
      });
    }
  };

  window.PatientAppointmentsScreen = PatientAppointmentsScreen;

})();