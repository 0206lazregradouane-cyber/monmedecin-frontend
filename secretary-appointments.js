/* =========================================================
   MON MÉDECIN
   SECRETARY APPOINTMENTS - FIXED
   ========================================================= */

(function () {

  "use strict";

  const SecretaryAppointmentsScreen = {
    appointments: [],
    filter: "all",
    search: "",
    messageTimer: null,

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
    // NORMALIZE APPOINTMENT - FIXED with createdAt
    // =====================================================

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
        patientName: appointment.patientName || appointment.patient_name || "مريض",
        patientPhone: appointment.patientPhone || appointment.patient_phone || "",
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
        let data = SecretaryAppointmentsScreen.readJSON(localStorage, key, []);
        if (!Array.isArray(data)) data = [];
        appointments.forEach(function (appointment) {
          const index = data.findIndex(function (item) {
            return String(item.id || item.appointment_id) === String(appointment.id || appointment.appointment_id);
          });
          if (index >= 0) data[index] = appointment;
          else data.push(appointment);
        });
        const saved = SecretaryAppointmentsScreen.writeJSON(localStorage, key, data);
        if (!saved) allSaved = false;
      });
      return allSaved;
    },

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    getSecretary: function (app) {
      return app.state.secretary || (app.state.role === "secretary" ? app.state.user : null);
    },

    getDoctor: function (app) {
      if (typeof app.getSecretaryDoctor === "function") {
        return app.getSecretaryDoctor() || null;
      }
      return null;
    },

    getDoctorId: function (app) {
      if (typeof app.getSecretaryDoctorId === "function") {
        return app.getSecretaryDoctorId();
      }
      const secretary = this.getSecretary(app);
      return secretary?.doctor_id || secretary?.doctorId || null;
    },

    hasPermission: function (app) {
      if (typeof app.secretaryCan === "function") {
        return app.secretaryCan("appointments");
      }
      return this.getSecretary(app)?.permissions?.appointments === true;
    },

    load: function (app) {
      try {
        this.appointments = this.getAppointmentsSafely(app)
          .map(function(appointment) {
            return SecretaryAppointmentsScreen.normalizeAppointment(appointment);
          })
          .filter(function(appointment) {
            return appointment !== null;
          });

        const secretary = this.getSecretary(app);
        const doctorId = secretary?.doctor_id || secretary?.doctorId || app.getSecretaryDoctorId?.();

        if (doctorId) {
          this.appointments = this.appointments.filter(function (apt) {
            return String(apt.doctor_id || apt.doctorId) === String(doctorId);
          });
        }

        this.appointments = [...this.appointments].sort(function (a, b) {
          return `${b.date || ""}T${b.time || "00:00"}`.localeCompare(`${a.date || ""}T${a.time || "00:00"}`);
        });

      } catch (error) {
        console.error("MON MÉDECIN SECRETARY APPOINTMENTS:", "Error loading appointments", error);
        this.appointments = [];
      }
    },

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
        confirmed: ["arrived", "no_show", "cancelled"]
      };
      return transitions[status] || [];
    },

    canTransition: function (currentStatus, nextStatus) {
      return this.getAllowedTransitions(currentStatus).includes(nextStatus);
    },

    // 🔑 ADD TO QUEUE
    addToQueue: function (doctorId, appointment) {
      if (!doctorId || !appointment) return false;
      if (!window.MonMedecinQueueService) return false;

      try {
        const result = window.MonMedecinQueueService.addFromAppointment(doctorId, appointment);
        if (result) {
          console.log("MON MÉDECIN: Added patient to queue:", result.patientName, "Number:", result.queueNumber);
          return true;
        }
      } catch (error) {
        console.warn("MON MÉDECIN: Error adding to queue:", error);
      }
      return false;
    },

    findAppointment: function (appointmentId) {
      return this.appointments.find(function (appointment) {
        return String(appointment.id || appointment.appointment_id) === String(appointmentId);
      }) || null;
    },

    updateStatus: function (appointmentId, nextStatus, app) {
      try {
        if (!this.hasPermission(app)) {
          this.showMessage("لا تملك صلاحية إدارة المواعيد.", "error");
          return false;
        }

        const secretary = this.getSecretary(app);
        const doctorId = this.getDoctorId(app);
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

        if (["in_progress", "completed"].includes(nextStatus)) {
          this.showMessage("بدء الفحص وإنهاؤه من صلاحيات الطبيب فقط.", "error");
          return false;
        }

        if (!this.canTransition(currentStatus, nextStatus)) {
          this.showMessage("هذا الانتقال غير مسموح للسكرتير.", "error");
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

        const secretaryDoctorId = secretary?.doctor_id || secretary?.doctorId;
        const appointmentDoctorId = previous.doctor_id || previous.doctorId;

        if (String(secretaryDoctorId) !== String(appointmentDoctorId)) {
          this.showMessage("لا يمكنك إدارة موعد تابع لطبيب آخر.", "error");
          return false;
        }

        const now = new Date().toISOString();
        const history = Array.isArray(previous.history) ? [...previous.history] : [];

        history.push({
          from: currentStatus,
          to: nextStatus,
          changedAt: now,
          changedByRole: "secretary",
          changedById: secretary?.id || secretary?.secretary_id || null,
          changedByName: secretary?.fullName || secretary?.name || "Secretary"
        });

        allAppointments[index] = {
          ...previous,
          status: nextStatus,
          updatedAt: now,
          lastStatusChangedAt: now,
          lastStatusChangedBy: "secretary",
          history: history
        };

        if (nextStatus === "confirmed") allAppointments[index].confirmedAt = now;
        if (nextStatus === "arrived") allAppointments[index].arrivedAt = now;
        if (nextStatus === "rejected") allAppointments[index].rejectedAt = now;
        if (nextStatus === "cancelled") allAppointments[index].cancelledAt = now;
        if (nextStatus === "no_show") allAppointments[index].noShowAt = now;

        const saved = this.saveAppointmentsToAllStores(allAppointments, app);
        if (!saved) {
          this.showMessage("تعذر حفظ حالة الموعد.", "error");
          return false;
        }

        // 🔑 ADD TO QUEUE IF STATUS IS "arrived"
        if (nextStatus === "arrived") {
          const appointmentData = allAppointments[index];
          const added = this.addToQueue(doctorId, appointmentData);
          if (added) {
            this.showMessage("✅ تم تسجيل وصول المريض وإضافته إلى قائمة الانتظار.", "success");
          } else {
            this.showMessage("⚠️ تم تسجيل الوصول لكن حدث خطأ في إضافة قائمة الانتظار.", "warning");
          }
        }

        this.load(app);
        this.showMessage(this.getSuccessMessage(nextStatus), "success");
        return true;

      } catch (error) {
        console.error("MON MÉDECIN SECRETARY: Error updating status:", error);
        this.showMessage("حدث خطأ أثناء تحديث حالة الموعد.", "error");
        return false;
      }
    },

    getSuccessMessage: function (status) {
      const map = {
        confirmed: "✅ تم تأكيد الموعد.",
        rejected: "❌ تم رفض الموعد.",
        cancelled: "❌ تم إلغاء الموعد.",
        arrived: "✅ تم تسجيل وصول المريض وإضافته إلى قائمة الانتظار.",
        no_show: "❌ تم تسجيل عدم حضور المريض."
      };
      return map[status] || "تم تحديث الموعد.";
    },

    showMessage: function (message, type) {
      const element = document.getElementById("secretaryAppointmentsMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }
      element.hidden = false;
      element.textContent = message;
      element.className = "secretary-appointments-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");
      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 4000);
    },

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
        arrived: this.appointments.filter(function (item) { return item.status === "arrived"; }).length
      };
    },

    renderAction: function (appointmentId, status, label, className) {
      return `
        <button type="button" class="secretary-appointment-action ${className || ""}" data-secretary-appointment-id="${this.escapeHTML(appointmentId)}" data-secretary-appointment-status="${this.escapeHTML(status)}">
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
            <div class="secretary-appointment-doctor-only">
              <span>🩺</span>
              <p>✅ تم تسجيل وصول المريض وإضافته إلى قائمة الانتظار. بدء الفحص من حساب الطبيب فقط.</p>
            </div>
          `;
        case "in_progress":
          return `
            <div class="secretary-appointment-doctor-only">
              <span>⚕</span>
              <p>⏳ الفحص جارٍ حاليًا. إنهاء الموعد من حساب الطبيب فقط.</p>
            </div>
          `;
        default:
          return `<span class="secretary-appointment-final">لا توجد إجراءات إدارية متاحة</span>`;
      }
    },

    renderAppointment: function (appointment) {
      const meta = this.getStatusMeta(appointment.status);

      return `
        <article class="secretary-appointment-card glass">
          <div class="secretary-appointment-card__top">
            <div class="secretary-appointment-card__patient">
              <div class="secretary-appointment-card__avatar">
                ${this.escapeHTML(String(appointment.patientName || "م").charAt(0))}
              </div>
              <div>
                <span>المريض</span>
                <h3>${this.escapeHTML(appointment.patientName || "مريض")}</h3>
                <small dir="ltr">${this.escapeHTML(appointment.patientPhone || appointment.patient_phone || "")}</small>
              </div>
            </div>
            <span class="secretary-appointment-status ${meta.className}">${this.escapeHTML(meta.label)}</span>
          </div>
          <div class="secretary-appointment-card__service">
            <span>الخدمة</span>
            <strong>${this.escapeHTML(appointment.serviceName || "استشارة")}</strong>
          </div>
          <div class="secretary-appointment-card__info">
            <div>
              <span>التاريخ</span>
              <strong dir="ltr">${this.escapeHTML(appointment.date || "—")}</strong>
            </div>
            <div>
              <span>البداية</span>
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
          <div class="secretary-appointment-card__actions">
            ${this.renderActions(appointment)}
          </div>
        </article>
      `;
    },

    renderList: function () {
      const appointments = this.getFilteredAppointments();

      if (appointments.length === 0) {
        return `
          <section class="secretary-appointments-empty glass">
            <span>📅</span>
            <h3>لا توجد مواعيد</h3>
            <p>لا توجد حجوزات مطابقة للفلاتر الحالية.</p>
          </section>
        `;
      }

      return appointments.map(function (appointment) {
        return SecretaryAppointmentsScreen.renderAppointment(appointment);
      }).join("");
    },

    render: function (state, app) {
      if (!this.hasPermission(app)) {
        return this.renderBlocked(state);
      }

      this.load(app);
      const stats = this.getStats();
      const doctor = this.getDoctor(app);
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="secretary-appointments ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="secretary-appointments__orb secretary-appointments__orb--blue"></div>
          <div class="secretary-appointments__orb secretary-appointments__orb--cyan"></div>

          <header class="secretary-appointments__header">
            <button id="secretaryAppointmentsBack" class="secretary-appointments__back" type="button">→</button>
            <div class="secretary-appointments__header-copy">
              <strong>مواعيد الطبيب</strong>
              <span>${this.escapeHTML(doctor?.fullName || doctor?.name || "الطبيب")}</span>
            </div>
            <button id="secretaryAppointmentsTheme" class="secretary-appointments__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="secretary-appointments__container">

            <section class="secretary-appointments__hero">
              <span>APPOINTMENTS</span>
              <h1>إدارة المواعيد</h1>
              <p>إدارة الجانب الإداري للحجوزات وتسجيل وصول المرضى.</p>
            </section>

            <section class="secretary-appointments-info glass">
              <span>ℹ</span>
              <p>يمكنك تأكيد ورفض وإلغاء الحجوزات وتسجيل وصول المريض. عند تسجيل الوصول، يتم إضافة المريض تلقائياً إلى قائمة الانتظار.</p>
            </section>

            <div id="secretaryAppointmentsMessage" class="secretary-appointments-message" hidden></div>

            <section class="secretary-appointments-stats">
              <button type="button" class="secretary-appointments-stat glass" data-secretary-appointments-filter="all">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </button>
              <button type="button" class="secretary-appointments-stat glass is-pending" data-secretary-appointments-filter="pending">
                <span>انتظار</span>
                <strong>${stats.pending}</strong>
              </button>
              <button type="button" class="secretary-appointments-stat glass is-confirmed" data-secretary-appointments-filter="confirmed">
                <span>مؤكدة</span>
                <strong>${stats.confirmed}</strong>
              </button>
              <button type="button" class="secretary-appointments-stat glass is-arrived" data-secretary-appointments-filter="arrived">
                <span>وصلوا</span>
                <strong>${stats.arrived}</strong>
              </button>
            </section>

            <section class="secretary-appointments-toolbar glass">
              <div class="secretary-appointments-search">
                <span>🔎</span>
                <input id="secretaryAppointmentsSearch" type="search" placeholder="ابحث باسم المريض أو الخدمة..." value="${this.escapeHTML(this.search)}">
              </div>
              <select id="secretaryAppointmentsFilter">
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

            <section id="secretaryAppointmentsList" class="secretary-appointments-list">
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
              <button class="mobile-bottom-nav__item" data-nav="queue" type="button">
                <span class="mobile-bottom-nav__icon">⏳</span>
                <span>قائمة الانتظار</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="patients" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>المرضى</span>
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

    renderBlocked: function (state) {
      return `
        <main class="secretary-appointments ${state.deviceMode === "mobile" ? "mobile-app-page" : "website-page"}">
          <section class="secretary-appointments-blocked glass">
            <span>🔒</span>
            <h1>لا توجد صلاحية</h1>
            <p>الطبيب لم يمنح حسابك صلاحية إدارة المواعيد.</p>
            <button id="secretaryAppointmentsBlockedBack" type="button">العودة للرئيسية</button>
          </section>
        </main>
      `;
    },

    refreshList: function () {
      const list = document.getElementById("secretaryAppointmentsList");
      if (list) {
        list.innerHTML = this.renderList();
      }
    },

    init: function (app) {
      console.log("MON MÉDECIN: SecretaryAppointmentsScreen init");

      document.getElementById("secretaryAppointmentsBlockedBack")?.addEventListener("click", function () {
        app.navigate("/secretary/dashboard");
      });

      if (!this.hasPermission(app)) return;

      document.getElementById("secretaryAppointmentsBack")?.addEventListener("click", function () {
        app.navigate("/secretary/dashboard");
      });

      document.getElementById("secretaryAppointmentsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.querySelectorAll("[data-secretary-appointments-filter]").forEach(function (button) {
        button.addEventListener("click", function () {
          SecretaryAppointmentsScreen.filter = this.dataset.secretaryAppointmentsFilter;
          const select = document.getElementById("secretaryAppointmentsFilter");
          if (select) select.value = SecretaryAppointmentsScreen.filter;
          SecretaryAppointmentsScreen.refreshList();
        });
      });

      document.getElementById("secretaryAppointmentsFilter")?.addEventListener("change", function () {
        SecretaryAppointmentsScreen.filter = this.value;
        SecretaryAppointmentsScreen.refreshList();
      });

      document.getElementById("secretaryAppointmentsSearch")?.addEventListener("input", function () {
        SecretaryAppointmentsScreen.search = this.value;
        SecretaryAppointmentsScreen.refreshList();
      });

      document.getElementById("secretaryAppointmentsList")?.addEventListener("click", function (event) {
        const button = event.target.closest("[data-secretary-appointment-status]");
        if (!button) return;

        const appointmentId = button.dataset.secretaryAppointmentId;
        const nextStatus = button.dataset.secretaryAppointmentStatus;

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

        const updated = SecretaryAppointmentsScreen.updateStatus(appointmentId, nextStatus, app);
        if (updated) {
          app.render();
        } else {
          button.disabled = false;
          button.textContent = button.dataset.originalLabel || "تأكيد";
        }
      });

      document.querySelectorAll("[data-secretary-appointment-status]").forEach(function (button) {
        button.dataset.originalLabel = button.textContent;
      });

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
      document.querySelectorAll("[data-nav='queue']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/queue");
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

  window.SecretaryAppointmentsScreen = SecretaryAppointmentsScreen;

})();