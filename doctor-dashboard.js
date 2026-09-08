/* =========================================================
   MON MÉDECIN
   DOCTOR DASHBOARD - FIXED WITH QUEUE
   ========================================================= */

(function () {

  "use strict";


  const DoctorDashboardScreen = {


    /* =====================================================
       STATE
       ===================================================== */

    appointments: [],

    services: [],

    secretaries: [],

    schedule: null,


    /* =====================================================
       STORAGE HELPERS
       ===================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN DOCTOR DASHBOARD:", key, error);
        return fallback;
      }
    },

    ensureArray: function (value) {
      return Array.isArray(value) ? value : [];
    },


    /* =====================================================
       ESCAPE
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
       DOCTOR
       ===================================================== */

    getDoctor: function (app) {
      return (app.state.doctor || app.state.user || null);
    },

    getDoctorId: function (app) {
      const doctor = this.getDoctor(app);
      return (doctor?.id ?? doctor?.doctor_id ?? app.getDoctorId?.() ?? null);
    },


    /* =====================================================
       DATE
       ===================================================== */

    getToday: function () {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },


    /* =====================================================
       LOAD
       ===================================================== */

    load: function (app) {
      const doctorId = this.getDoctorId(app);

      if (!doctorId) {
        this.appointments = [];
        this.services = [];
        this.secretaries = [];
        this.schedule = null;
        return;
      }

      /* APPOINTMENTS */
      let allAppointments = [];

      if (typeof app.getAppointmentsSafely === "function") {
        allAppointments = app.getAppointmentsSafely();
      } else if (typeof app.getAppointments === "function") {
        allAppointments = app.getAppointments();
      } else {
        allAppointments = this.readJSON(localStorage, "monmedecin-appointments", []);
      }

      if (!Array.isArray(allAppointments)) {
        allAppointments = [];
      }

      this.appointments = allAppointments.filter(function (appointment) {
        return String(appointment.doctor_id ?? appointment.doctorId) === String(doctorId);
      });

      /* SERVICES */
      if (typeof app.getDoctorServices === "function") {
        this.services = app.getDoctorServices(doctorId, true);
      } else {
        this.services = this.ensureArray(
          this.readJSON(localStorage, "monmedecin-doctor-services", [])
        ).filter(function (service) {
          return String(service.doctor_id ?? service.doctorId) === String(doctorId);
        });
      }

      /* SECRETARIES */
      this.secretaries = this.ensureArray(
        this.readJSON(localStorage, "monmedecin-secretaries", [])
      ).filter(function (secretary) {
        return String(secretary.doctor_id ?? secretary.doctorId) === String(doctorId);
      });

      /* SCHEDULE */
      if (typeof app.getDoctorSchedule === "function") {
        this.schedule = app.getDoctorSchedule(doctorId);
      } else {
        const schedules = this.ensureArray(
          this.readJSON(localStorage, "monmedecin-doctor-schedules", [])
        );
        this.schedule = schedules.find(function (schedule) {
          return String(schedule.doctor_id ?? schedule.doctorId) === String(doctorId);
        }) || null;
      }

      this._hasServices = this.services.length > 0;
      this._hasSchedule = this.schedule !== null;
    },


    /* =====================================================
       STATS
       ===================================================== */

    getStats: function () {
      const today = this.getToday();

      const todayAppointments = this.appointments.filter(function (appointment) {
        return appointment.date === today;
      });

      const activeAppointments = this.appointments.filter(function (appointment) {
        return !["cancelled", "rejected"].includes(appointment.status);
      });

      const patientIds = new Set();
      activeAppointments.forEach(function (appointment) {
        const id = appointment.patient_id ?? appointment.patientId;
        if (id) {
          patientIds.add(String(id));
        }
      });

      return {
        today: todayAppointments.length,
        pending: this.appointments.filter(function (appointment) {
          return appointment.status === "pending";
        }).length,
        confirmed: this.appointments.filter(function (appointment) {
          return appointment.status === "confirmed";
        }).length,
        completed: this.appointments.filter(function (appointment) {
          return appointment.status === "completed";
        }).length,
        patients: patientIds.size,
        services: this.services.filter(function (service) {
          return service.active !== false;
        }).length,
        secretaries: this.secretaries.filter(function (secretary) {
          return secretary.active !== false;
        }).length,
        queueWaiting: this.getQueueWaitingCount()
      };
    },


    /* =====================================================
       QUEUE HELPERS
       ===================================================== */

    getQueueWaitingCount: function () {
      const doctorId = this.getDoctorId(window.App);
      if (!doctorId || !window.MonMedecinQueueService) {
        return 0;
      }
      try {
        const queue = window.MonMedecinQueueService.getActiveQueue(doctorId);
        return queue.filter(function(item) {
          return item.status === "waiting";
        }).length;
      } catch (error) {
        console.warn("MON MÉDECIN:", "Error getting queue count", error);
        return 0;
      }
    },


    /* =====================================================
       SCHEDULE STATUS
       ===================================================== */

    getScheduleSummary: function () {
      if (!this.schedule || !this.schedule.days) {
        return { configured: false, days: 0, slotDuration: 30 };
      }

      let days = 0;
      Object.values(this.schedule.days).forEach(function (day) {
        if (day?.enabled !== false) {
          days++;
        }
      });

      return {
        configured: true,
        days: days,
        slotDuration: Number(this.schedule.slotDuration) || 30
      };
    },


    /* =====================================================
       UPCOMING
       ===================================================== */

    getUpcomingAppointments: function () {
      const today = this.getToday();

      return this.appointments
        .filter(function (appointment) {
          if (["cancelled", "rejected", "completed", "no_show"].includes(appointment.status)) {
            return false;
          }
          return String(appointment.date || "") >= today;
        })
        .sort(function (a, b) {
          return `${a.date || ""}T${a.time || "00:00"}`.localeCompare(`${b.date || ""}T${b.time || "00:00"}`);
        })
        .slice(0, 5);
    },


    /* =====================================================
       STATUS
       ===================================================== */

    getStatus: function (status) {
      const map = {
        pending: { label: "قيد الانتظار", className: "is-pending" },
        confirmed: { label: "مؤكد", className: "is-confirmed" },
        arrived: { label: "وصل", className: "is-arrived" },
        in_progress: { label: "جاري الفحص", className: "is-progress" },
        completed: { label: "مكتمل", className: "is-completed" },
        cancelled: { label: "ملغى", className: "is-cancelled" },
        rejected: { label: "مرفوض", className: "is-rejected" },
        no_show: { label: "لم يحضر", className: "is-no-show" }
      };
      return map[status] || { label: status || "غير معروف", className: "is-default" };
    },


    /* =====================================================
       UPCOMING HTML
       ===================================================== */

    renderUpcoming: function () {
      const appointments = this.getUpcomingAppointments();

      if (appointments.length === 0) {
        return `
          <div class="doctor-dashboard-empty">
            <span>📅</span>
            <strong>لا توجد مواعيد قادمة</strong>
            <small>ستظهر هنا أقرب المواعيد الجديدة.</small>
          </div>
        `;
      }

      return appointments.map(function (appointment) {
        const meta = this.getStatus(appointment.status);
        return `
          <button type="button" class="doctor-dashboard-appointment" data-doctor-dashboard-appointment="${this.escapeHTML(appointment.id ?? appointment.appointment_id)}">
            <div class="doctor-dashboard-appointment__avatar">
              ${this.escapeHTML(String(appointment.patientName || "م").charAt(0))}
            </div>
            <div class="doctor-dashboard-appointment__copy">
              <strong>${this.escapeHTML(appointment.patientName || "مريض")}</strong>
              <span>${this.escapeHTML(appointment.serviceName || "استشارة")}</span>
              <small dir="ltr">${this.escapeHTML(appointment.date || "")} • ${this.escapeHTML(appointment.time || "")}</small>
            </div>
            <span class="doctor-dashboard-status ${meta.className}">${this.escapeHTML(meta.label)}</span>
          </button>
        `;
      }, this).join("");
    },


    /* =====================================================
       RENDER
       ===================================================== */

    render: function (state, app) {
      this.load(app);

      const doctor = this.getDoctor(app);
      const stats = this.getStats();
      const schedule = this.getScheduleSummary();

      const doctorName = doctor?.fullName || doctor?.name || "الطبيب";

      return `
        <main class="doctor-dashboard ${state.deviceMode === "mobile" ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <!-- BACKGROUND -->
          <div class="doctor-dashboard__orb doctor-dashboard__orb--blue"></div>
          <div class="doctor-dashboard__orb doctor-dashboard__orb--cyan"></div>

          <!-- HEADER -->
          <header class="doctor-dashboard__header">
            <div class="doctor-dashboard__identity">
              <div class="doctor-dashboard__avatar">
                ${this.escapeHTML(String(doctorName).charAt(0))}
              </div>
              <div>
                <span>مرحبًا</span>
                <strong>${this.escapeHTML(doctorName)}</strong>
              </div>
            </div>
            <div class="doctor-dashboard__header-actions">
              <button id="doctorDashboardNotifications" type="button" aria-label="الإشعارات">🔔</button>
              <button id="doctorDashboardTheme" type="button" aria-label="تغيير المظهر">${state.theme === "dark" ? "☀" : "◐"}</button>
            </div>
          </header>

          <!-- CONTENT -->
          <section class="doctor-dashboard__container">

            <!-- HERO -->
            <section class="doctor-dashboard__hero">
              <div>
                <span>DOCTOR SPACE</span>
                <h1>لوحة الطبيب</h1>
                <p>إدارة المواعيد والخدمات والجدول والسكرتارية من مكان واحد.</p>
              </div>
              <button id="doctorDashboardProfile" type="button">الملف الشخصي</button>
            </section>

            <!-- MAIN STATS -->
            <section class="doctor-dashboard-stats">
              <button class="doctor-dashboard-stat glass is-primary" data-doctor-dashboard-route="/doctor/appointments" type="button">
                <span>مواعيد اليوم</span>
                <strong>${stats.today}</strong>
                <small>عرض المواعيد</small>
              </button>
              <button class="doctor-dashboard-stat glass is-pending" data-doctor-dashboard-route="/doctor/appointments" type="button">
                <span>قيد الانتظار</span>
                <strong>${stats.pending}</strong>
                <small>طلبات جديدة</small>
              </button>
              <button class="doctor-dashboard-stat glass is-confirmed" data-doctor-dashboard-route="/doctor/appointments" type="button">
                <span>مؤكدة</span>
                <strong>${stats.confirmed}</strong>
                <small>حجوزات مؤكدة</small>
              </button>
              <button class="doctor-dashboard-stat glass is-completed" data-doctor-dashboard-route="/doctor/appointments" type="button">
                <span>مكتملة</span>
                <strong>${stats.completed}</strong>
                <small>إجمالي المكتمل</small>
              </button>
            </section>

            <!-- MANAGEMENT -->
            <section class="doctor-dashboard-section">
              <header class="doctor-dashboard-section__head">
                <div>
                  <span>الإدارة</span>
                  <h2>إدارة العيادة</h2>
                </div>
              </header>
              <div class="doctor-dashboard-management">
                <button class="doctor-dashboard-management__card glass" data-doctor-dashboard-route="/doctor/appointments" type="button">
                  <span class="doctor-dashboard-management__icon">📅</span>
                  <div>
                    <strong>المواعيد</strong>
                    <small>إدارة حجوزات المرضى</small>
                  </div>
                  <b>${stats.today}</b>
                </button>
                <button class="doctor-dashboard-management__card glass" data-doctor-dashboard-route="/doctor/queue" type="button">
                  <span class="doctor-dashboard-management__icon">⏳</span>
                  <div>
                    <strong>قائمة الانتظار</strong>
                    <small>إدارة مرضى العيادة</small>
                  </div>
                  <b>${stats.queueWaiting || 0}</b>
                </button>
                <button class="doctor-dashboard-management__card glass" data-doctor-dashboard-route="/doctor/patients" type="button">
                  <span class="doctor-dashboard-management__icon">👥</span>
                  <div>
                    <strong>المرضى</strong>
                    <small>المرضى المرتبطون بمواعيدك</small>
                  </div>
                  <b>${stats.patients}</b>
                </button>
                <button class="doctor-dashboard-management__card glass" data-doctor-dashboard-route="/doctor/services" type="button">
                  <span class="doctor-dashboard-management__icon">⚕</span>
                  <div>
                    <strong>الخدمات</strong>
                    <small>السعر ومدة الاستشارة</small>
                  </div>
                  <b>${stats.services}</b>
                </button>
                <button class="doctor-dashboard-management__card glass" data-doctor-dashboard-route="/doctor/schedule" type="button">
                  <span class="doctor-dashboard-management__icon">🕒</span>
                  <div>
                    <strong>جدول العمل</strong>
                    <small>${schedule.configured ? `${schedule.days} أيام • ${schedule.slotDuration} دقيقة` : "لم يتم ضبط الجدول"}</small>
                  </div>
                  <b>${schedule.days}</b>
                </button>
                <button class="doctor-dashboard-management__card glass" data-doctor-dashboard-route="/doctor/secretary" type="button">
                  <span class="doctor-dashboard-management__icon">🧑‍💼</span>
                  <div>
                    <strong>السكرتارية</strong>
                    <small>الحسابات والصلاحيات</small>
                  </div>
                  <b>${stats.secretaries}</b>
                </button>
                <button class="doctor-dashboard-management__card glass" data-doctor-dashboard-route="/doctor/account" type="button">
                  <span class="doctor-dashboard-management__icon">⚙</span>
                  <div>
                    <strong>الإعدادات</strong>
                    <small>إعدادات حساب الطبيب</small>
                  </div>
                  <b>→</b>
                </button>
              </div>
            </section>

            <!-- UPCOMING -->
            <section class="doctor-dashboard-upcoming glass">
              <header class="doctor-dashboard-upcoming__head">
                <div>
                  <span>NEXT</span>
                  <h2>المواعيد القادمة</h2>
                </div>
                <button id="doctorDashboardAllAppointments" type="button">عرض الكل</button>
              </header>
              <div class="doctor-dashboard-upcoming__list">
                ${this.renderUpcoming()}
              </div>
            </section>

            <!-- ACCOUNT -->
            <section class="doctor-dashboard-account glass">
              <div>
                <span>الحساب</span>
                <strong>${this.escapeHTML(doctorName)}</strong>
                <small>${this.escapeHTML(doctor?.specialty || doctor?.professional?.specialty || "طبيب")}</small>
              </div>
              <button id="doctorDashboardLogout" type="button">تسجيل الخروج</button>
            </section>

          </section>

        </main>
      `;
    },


    /* =====================================================
       INIT - FIXED
       ===================================================== */

    init: function (app) {

      /* THEME */
      document.getElementById("doctorDashboardTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      /* PROFILE */
      document.getElementById("doctorDashboardProfile")?.addEventListener("click", function () {
        app.navigate("/doctor/profile");
      });

      /* NOTIFICATIONS */
      document.getElementById("doctorDashboardNotifications")?.addEventListener("click", function () {
        app.navigate("/doctor/notifications");
      });

      /* ALL APPOINTMENTS */
      document.getElementById("doctorDashboardAllAppointments")?.addEventListener("click", function () {
        app.navigate("/doctor/appointments");
      });

      /* NAVIGATION CARDS */
      document.querySelectorAll("[data-doctor-dashboard-route]").forEach(function (element) {
        element.addEventListener("click", function () {
          const route = this.dataset.doctorDashboardRoute;
          if (route) {
            app.navigate(route);
          }
        });
      });

      /* UPCOMING APPOINTMENT */
      document.querySelectorAll("[data-doctor-dashboard-appointment]").forEach(function (element) {
        element.addEventListener("click", function () {
          const appointmentId = this.dataset.doctorDashboardAppointment;
          const appointment = typeof app.getAppointmentById === "function" ? app.getAppointmentById(appointmentId) : null;
          if (appointment && typeof app.selectAppointment === "function") {
            app.selectAppointment(appointment);
          }
          app.navigate("/doctor/appointments");
        });
      });

      /* LOGOUT */
      document.getElementById("doctorDashboardLogout")?.addEventListener("click", function () {
        if (confirm("هل تريد تسجيل الخروج؟")) {
          app.logout();
        }
      });

    }

  };


  /* =====================================================
     EXPOSE
     ===================================================== */

  window.DoctorDashboardScreen = DoctorDashboardScreen;


})();