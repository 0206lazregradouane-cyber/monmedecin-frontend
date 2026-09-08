/* =========================================================
   MON MÉDECIN
   DOCTOR APPOINTMENTS - FIXED
   ========================================================= */

(function () {
  "use strict";

  const DoctorAppointmentsScreen = {
    appointments: [],
    filter: "all",
    search: "",
    messageTimer: null,

    // =====================================================
    // STORAGE HELPERS
    // =====================================================

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

    // =====================================================
    // APPOINTMENT HELPERS
    // =====================================================

    getAppointmentsSafely: function (app) {
      if (typeof app.getAppointmentsSafely === "function") {
        return app.getAppointmentsSafely();
      }
      if (typeof app.getAppointments === "function") {
        return app.getAppointments();
      }
      let appointments = this.readJSON(localStorage, "monmedecin-appointments", []);
      if (!Array.isArray(appointments)) appointments = [];
      return appointments;
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
        let data = DoctorAppointmentsScreen.readJSON(localStorage, key, []);
        if (!Array.isArray(data)) data = [];
        appointments.forEach(function (appointment) {
          const index = data.findIndex(function (item) {
            return String(item.id || item.appointment_id) === String(appointment.id || appointment.appointment_id);
          });
          if (index >= 0) data[index] = appointment;
          else data.push(appointment);
        });
        const saved = DoctorAppointmentsScreen.writeJSON(localStorage, key, data);
        if (!saved) allSaved = false;
      });
      return allSaved;
    },

    // =====================================================
    // ESCAPE HTML
    // =====================================================

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    // =====================================================
    // DOCTOR
    // =====================================================

    getDoctor: function (app) {
      return app.state.doctor || app.state.user || null;
    },

    getDoctorId: function (app) {
      const doctor = this.getDoctor(app);
      return doctor?.id ?? doctor?.doctor_id ?? app.getDoctorId?.() ?? null;
    },

    // =====================================================
    // TIME HELPERS
    // =====================================================

    timeToMinutes: function (value) {
      const parts = String(value || '').split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      return parts[0] * 60 + parts[1];
    },

    // =====================================================
    // CONFLICT CHECK - FIXED
    // =====================================================

    checkConflict: function(app, appointmentId, newStatus) {
      const doctorId = this.getDoctorId(app);
      const appointment = this.findAppointment(appointmentId);
      if (!appointment) return { hasConflict: false };

      // Only check for confirmed or arrived status
      if (!['confirmed', 'arrived'].includes(newStatus)) {
        return { hasConflict: false };
      }

      // Use centralized conflict check from app
      if (app && typeof app.checkAppointmentConflict === 'function') {
        return app.checkAppointmentConflict(
          doctorId,
          appointment.date,
          appointment.time,
          appointment.duration || 30,
          appointmentId
        );
      }

      // Fallback to manual check
      const allAppointments = this.getAppointmentsSafely(app);
      const start = this.timeToMinutes(appointment.time);
      if (start === null) return { hasConflict: false };
      const end = start + (appointment.duration || 30);

      const conflict = allAppointments.some(function(a) {
        if (String(a.id) === String(appointmentId)) return false;
        if (String(a.doctor_id || a.doctorId) !== String(doctorId)) return false;
        if (a.date !== appointment.date) return false;
        if (['cancelled', 'rejected'].includes(a.status)) return false;

        const aptStart = this.timeToMinutes(a.time);
        if (aptStart === null) return false;
        const aptEnd = aptStart + (a.duration || 30);

        return start < aptEnd && aptStart < end;
      }, this);

      return {
        hasConflict: conflict,
        message: conflict ? '⚠️ هذا الوقت يتعارض مع موعد آخر!' : null
      };
    },

    // =====================================================
    // LOAD
    // =====================================================

    load: function (app) {
      try {
        this.appointments = this.getAppointmentsSafely(app);
        const doctorId = this.getDoctorId(app);
        if (doctorId) {
          this.appointments = this.appointments.filter(function (apt) {
            return String(apt.doctor_id || apt.doctorId) === String(doctorId);
          });
        }
        this.appointments = [...this.appointments].sort(function (a, b) {
          return `${b.date || ""}T${b.time || "00:00"}`.localeCompare(`${a.date || ""}T${a.time || "00:00"}`);
        });
      } catch (error) {
        console.error("MON MÉDECIN DOCTOR APPOINTMENTS:", "Error loading appointments", error);
        this.appointments = [];
      }
    },

    // =====================================================
    // STATUS
    // =====================================================

    getStatusMeta: function (status) {
      const map = {
        pending: { label: "قيد الانتظار", className: "is-pending" },
        confirmed: { label: "مؤكد", className: "is-confirmed" },
        arrived: { label: "وصل", className: "is-arrived" },
        in_progress: { label: "جاري الفحص", className: "is-progress" },
        completed: { label: "مكتمل", className: "is-completed" },
        rejected: { label: "مرفوض", className: "is-rejected" },
        cancelled: { label: "ملغى", className: "is-cancelled" },
        no_show: { label: "لم يحضر", className: "is-no-show" }
      };
      return map[status] || { label: status || "غير معروف", className: "is-default" };
    },

    isFinalStatus: function (status) {
      return ["completed", "rejected", "cancelled", "no_show"].includes(status);
    },

    getAllowedTransitions: function (status) {
      const transitions = {
        pending: ["confirmed", "rejected", "cancelled"],
        confirmed: ["arrived", "no_show", "cancelled"],
        arrived: ["in_progress"],
        in_progress: ["completed"]
      };
      return transitions[status] || [];
    },

    canTransition: function (currentStatus, nextStatus) {
      return this.getAllowedTransitions(currentStatus).includes(nextStatus);
    },

    findAppointment: function (appointmentId) {
      return this.appointments.find(function (appointment) {
        return String(appointment.id || appointment.appointment_id) === String(appointmentId);
      }) || null;
    },

    // =====================================================
    // UPDATE STATUS - FIXED
    // =====================================================

    updateStatus: function (appointmentId, nextStatus, app) {
      try {
        const doctor = this.getDoctor(app);
        const appointment = this.findAppointment(appointmentId);
        if (!appointment) {
          this.showMessage("تعذر العثور على الموعد.", "error");
          return false;
        }

        const currentStatus = appointment.status;
        if (this.isFinalStatus(currentStatus)) {
          this.showMessage("هذا الموعد في حالة نهائية ولا يمكن تعديله.", "error");
          return false;
        }

        if (!this.canTransition(currentStatus, nextStatus)) {
          this.showMessage("هذا الانتقال غير مسموح في Workflow الموعد.", "error");
          return false;
        }

        // Check conflict before confirming
        if (['confirmed', 'arrived'].includes(nextStatus)) {
          const conflict = this.checkConflict(app, appointmentId, nextStatus);
          if (conflict.hasConflict) {
            this.showMessage(conflict.message + ' لا يمكن تأكيد الموعد.', 'error');
            return false;
          }
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

        const now = new Date().toISOString();
        const previous = allAppointments[index];
        const history = Array.isArray(previous.history) ? [...previous.history] : [];

        history.push({
          from: currentStatus,
          to: nextStatus,
          changedAt: now,
          changedByRole: "doctor",
          changedById: doctor?.id || doctor?.doctor_id || null,
          changedByName: doctor?.fullName || doctor?.name || "Doctor"
        });

        allAppointments[index] = {
          ...previous,
          status: nextStatus,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: "doctor",
          history: history
        };

        if (nextStatus === "confirmed") allAppointments[index].confirmedAt = now;
        if (nextStatus === "arrived") allAppointments[index].arrivedAt = now;
        if (nextStatus === "in_progress") allAppointments[index].startedAt = now;
        if (nextStatus === "completed") allAppointments[index].completedAt = now;
        if (nextStatus === "rejected") allAppointments[index].rejectedAt = now;
        if (nextStatus === "cancelled") allAppointments[index].cancelledAt = now;
        if (nextStatus === "no_show") allAppointments[index].noShowAt = now;

        const saved = this.saveAppointmentsToAllStores(allAppointments, app);
        if (!saved) {
          this.showMessage("تعذر حفظ حالة الموعد.", "error");
          return false;
        }

        this.load(app);
        this.showMessage(this.getTransitionSuccessMessage(nextStatus), "success");
        return true;

      } catch (error) {
        console.error("MON MÉDECIN: Error updating status:", error);
        this.showMessage("حدث خطأ أثناء تحديث حالة الموعد.", "error");
        return false;
      }
    },

    getTransitionSuccessMessage: function (status) {
      const map = {
        confirmed: "✅ تم تأكيد الموعد.",
        rejected: "❌ تم رفض الموعد.",
        cancelled: "❌ تم إلغاء الموعد.",
        arrived: "✅ تم تسجيل وصول المريض.",
        in_progress: "⏳ تم بدء الفحص.",
        completed: "✅ تم إنهاء الموعد بنجاح.",
        no_show: "❌ تم تسجيل عدم حضور المريض."
      };
      return map[status] || "تم تحديث الموعد.";
    },

    // =====================================================
    // MESSAGE
    // =====================================================

    showMessage: function (message, type) {
      const element = document.getElementById("doctorAppointmentsMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }
      element.hidden = false;
      element.textContent = message;
      element.className = "doctor-appointments-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");
      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 4000);
    },

    // =====================================================
    // FILTER & RENDER
    // =====================================================

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
            appointment.patientName,
            appointment.patientPhone,
            appointment.patient_phone,
            appointment.serviceName,
            appointment.date,
            appointment.time
          ].join(" ").toLowerCase();
          return haystack.includes(search);
        });
      }
      return appointments;
    },

    getStats: function () {
      return {
        total: this.appointments.length,
        pending: this.appointments.filter(function (item) { return item.status === "pending"; }).length,
        confirmed: this.appointments.filter(function (item) { return item.status === "confirmed"; }).length,
        completed: this.appointments.filter(function (item) { return item.status === "completed"; }).length
      };
    },

    // =====================================================
    // RENDER
    // =====================================================

    renderAction: function (appointmentId, status, label, className) {
      return `
        <button type="button" class="doctor-appointment-action ${className || ""}" data-doctor-appointment-id="${this.escapeHTML(appointmentId)}" data-doctor-appointment-status="${this.escapeHTML(status)}">
          ${this.escapeHTML(label)}
        </button>
      `;
    },

    renderActions: function (appointment) {
      const id = appointment.id || appointment.appointment_id;

      switch (appointment.status) {
        case "pending":
          return `
            ${this.renderAction(id, "confirmed", "✅ تأكيد", "is-confirm")}
            ${this.renderAction(id, "rejected", "❌ رفض", "is-reject")}
            ${this.renderAction(id, "cancelled", "❌ إلغاء", "is-cancel")}
          `;
        case "confirmed":
          return `
            ${this.renderAction(id, "arrived", "✅ تسجيل الوصول", "is-arrived")}
            ${this.renderAction(id, "no_show", "❌ لم يحضر", "is-no-show")}
            ${this.renderAction(id, "cancelled", "❌ إلغاء", "is-cancel")}
          `;
        case "arrived":
          return `
            ${this.renderAction(id, "in_progress", "⏳ بدء الفحص", "is-start")}
          `;
        case "in_progress":
          return `
            ${this.renderAction(id, "completed", "✅ إنهاء الموعد", "is-complete")}
          `;
        default:
          return `<span class="doctor-appointment-final">لا توجد إجراءات متاحة</span>`;
      }
    },

    renderAppointment: function (appointment) {
      const status = this.getStatusMeta(appointment.status);
      const duration = Number(appointment.duration) || 30;

      return `
        <article class="doctor-appointment-card glass">
          <div class="doctor-appointment-card__top">
            <div class="doctor-appointment-card__patient">
              <div class="doctor-appointment-card__avatar">
                ${this.escapeHTML(String(appointment.patientName || "م").charAt(0))}
              </div>
              <div>
                <span>المريض</span>
                <h3>${this.escapeHTML(appointment.patientName || "مريض")}</h3>
                <small dir="ltr">${this.escapeHTML(appointment.patientPhone || appointment.patient_phone || "")}</small>
              </div>
            </div>
            <span class="doctor-appointment-status ${status.className}">${this.escapeHTML(status.label)}</span>
          </div>
          <div class="doctor-appointment-card__service">
            <span>الخدمة</span>
            <strong>${this.escapeHTML(appointment.serviceName || "استشارة")}</strong>
          </div>
          <div class="doctor-appointment-card__info">
            <div>
              <span>التاريخ</span>
              <strong dir="ltr">${this.escapeHTML(appointment.date || "—")}</strong>
            </div>
            <div>
              <span>من</span>
              <strong dir="ltr">${this.escapeHTML(appointment.time || "—")}</strong>
            </div>
            <div>
              <span>إلى</span>
              <strong dir="ltr">${this.escapeHTML(appointment.endTime || "—")}</strong>
            </div>
            <div>
              <span>المدة</span>
              <strong>${duration} دقيقة</strong>
            </div>
          </div>
          <div class="doctor-appointment-card__actions">
            ${this.renderActions(appointment)}
          </div>
        </article>
      `;
    },

    renderList: function () {
      const appointments = this.getFilteredAppointments();
      if (appointments.length === 0) {
        return `
          <section class="doctor-appointments-empty glass">
            <span>📅</span>
            <h3>لا توجد مواعيد</h3>
            <p>لا توجد حجوزات مطابقة للفلاتر الحالية.</p>
          </section>
        `;
      }
      return appointments.map(function (appointment) {
        return DoctorAppointmentsScreen.renderAppointment(appointment);
      }).join("");
    },

    render: function (state, app) {
      this.load(app);
      const stats = this.getStats();
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="doctor-appointments ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-appointments__orb doctor-appointments__orb--blue"></div>
          <div class="doctor-appointments__orb doctor-appointments__orb--cyan"></div>

          <header class="doctor-appointments__header">
            <button id="doctorAppointmentsBack" class="doctor-appointments__back" type="button">→</button>
            <div class="doctor-appointments__header-copy">
              <strong>المواعيد</strong>
              <span>إدارة حجوزات المرضى</span>
            </div>
            <button id="doctorAppointmentsTheme" class="doctor-appointments__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="doctor-appointments__container">
            <section class="doctor-appointments__hero">
              <span>APPOINTMENTS</span>
              <h1>مواعيد المرضى</h1>
              <p>تابع الحجوزات من الطلب وحتى إنهاء الفحص.</p>
            </section>

            <div id="doctorAppointmentsMessage" class="doctor-appointments-message" hidden></div>

            <section class="doctor-appointments-stats">
              <button type="button" class="doctor-appointments-stat glass" data-doctor-appointments-filter="all">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </button>
              <button type="button" class="doctor-appointments-stat glass is-pending" data-doctor-appointments-filter="pending">
                <span>انتظار</span>
                <strong>${stats.pending}</strong>
              </button>
              <button type="button" class="doctor-appointments-stat glass is-confirmed" data-doctor-appointments-filter="confirmed">
                <span>مؤكدة</span>
                <strong>${stats.confirmed}</strong>
              </button>
              <button type="button" class="doctor-appointments-stat glass is-completed" data-doctor-appointments-filter="completed">
                <span>مكتملة</span>
                <strong>${stats.completed}</strong>
              </button>
            </section>

            <section class="doctor-appointments-toolbar glass">
              <div class="doctor-appointments-search">
                <span>🔎</span>
                <input id="doctorAppointmentsSearch" type="search" placeholder="ابحث باسم المريض أو الخدمة..." value="${this.escapeHTML(this.search)}">
              </div>
              <select id="doctorAppointmentsFilter">
                <option value="all" ${this.filter === "all" ? "selected" : ""}>كل الحالات</option>
                <option value="pending" ${this.filter === "pending" ? "selected" : ""}>قيد الانتظار</option>
                <option value="confirmed" ${this.filter === "confirmed" ? "selected" : ""}>مؤكدة</option>
                <option value="arrived" ${this.filter === "arrived" ? "selected" : ""}>وصل</option>
                <option value="in_progress" ${this.filter === "in_progress" ? "selected" : ""}>جاري الفحص</option>
                <option value="completed" ${this.filter === "completed" ? "selected" : ""}>مكتملة</option>
                <option value="rejected" ${this.filter === "rejected" ? "selected" : ""}>مرفوضة</option>
                <option value="cancelled" ${this.filter === "cancelled" ? "selected" : ""}>ملغاة</option>
                <option value="no_show" ${this.filter === "no_show" ? "selected" : ""}>لم يحضر</option>
              </select>
            </section>

            <section id="doctorAppointmentsList" class="doctor-appointments-list">
              ${this.renderList()}
            </section>

          </section>

          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>المواعيد</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="schedule" type="button">
                <span class="mobile-bottom-nav__icon">▦</span>
                <span>الجدول</span>
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

    refreshList: function () {
      const list = document.getElementById("doctorAppointmentsList");
      if (list) {
        list.innerHTML = this.renderList();
      }
    },

    // =====================================================
    // INIT - FIXED
    // =====================================================

    init: function (app) {
      console.log("MON MÉDECIN: DoctorAppointmentsScreen init");

      document.getElementById("doctorAppointmentsBack")?.addEventListener("click", function () {
        app.navigate("/doctor/dashboard");
      });

      document.getElementById("doctorAppointmentsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.querySelectorAll("[data-doctor-appointments-filter]").forEach(function (button) {
        button.addEventListener("click", function () {
          DoctorAppointmentsScreen.filter = this.dataset.doctorAppointmentsFilter;
          const select = document.getElementById("doctorAppointmentsFilter");
          if (select) select.value = DoctorAppointmentsScreen.filter;
          DoctorAppointmentsScreen.refreshList();
        });
      });

      document.getElementById("doctorAppointmentsFilter")?.addEventListener("change", function () {
        DoctorAppointmentsScreen.filter = this.value;
        DoctorAppointmentsScreen.refreshList();
      });

      document.getElementById("doctorAppointmentsSearch")?.addEventListener("input", function () {
        DoctorAppointmentsScreen.search = this.value;
        DoctorAppointmentsScreen.refreshList();
      });

      document.getElementById("doctorAppointmentsList")?.addEventListener("click", function (event) {
        const button = event.target.closest("[data-doctor-appointment-status]");
        if (!button) return;

        const appointmentId = button.dataset.doctorAppointmentId;
        const nextStatus = button.dataset.doctorAppointmentStatus;

        let confirmed = true;
        if (["rejected", "cancelled", "no_show"].includes(nextStatus)) {
          confirmed = window.confirm(
            nextStatus === "rejected" ? "هل تريد رفض هذا الموعد؟" :
            nextStatus === "cancelled" ? "هل تريد إلغاء هذا الموعد؟" :
            "هل تريد تسجيل أن المريض لم يحضر؟"
          );
        }
        if (!confirmed) return;

        button.disabled = true;
        button.textContent = "⏳ جاري...";

        const updated = DoctorAppointmentsScreen.updateStatus(appointmentId, nextStatus, app);
        if (updated) {
          app.render();
        } else {
          button.disabled = false;
          button.textContent = button.dataset.originalLabel || "تأكيد";
        }
      });

      document.querySelectorAll("[data-doctor-appointment-status]").forEach(function (button) {
        button.dataset.originalLabel = button.textContent;
      });

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
      document.querySelectorAll("[data-nav='schedule']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/schedule");
        });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/account");
        });
      });
    }
  };

  window.DoctorAppointmentsScreen = DoctorAppointmentsScreen;

})();