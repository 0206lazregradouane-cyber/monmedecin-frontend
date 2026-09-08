/* =========================================================
   MON MÉDECIN
   SECRETARY DASHBOARD - WITH QUEUE
   ========================================================= */

(function () {

  "use strict";


  const SecretaryDashboardScreen = {


    /* =====================================================
       STATE
       ===================================================== */

    appointments: [],

    doctor: null,

    secretary: null,

    schedule: null,


    /* =====================================================
       STORAGE
       ===================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN SECRETARY DASHBOARD:", key, error);
        return fallback;
      }
    },

    ensureArray: function (value) {
      return Array.isArray(value) ? value : [];
    },


    /* =====================================================
       GET APPOINTMENTS SAFELY
       ===================================================== */

    getAppointmentsSafely: function () {
      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];

      const map = new Map();

      stores.forEach(function (key) {
        const data = SecretaryDashboardScreen.readJSON(localStorage, key, []);
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
       SECRETARY
       ===================================================== */

    getSecretary: function (app) {
      return app.state.secretary || (app.state.role === "secretary" ? app.state.user : null);
    },


    /* =====================================================
       DOCTOR
       ===================================================== */

    getDoctor: function (app) {
      if (typeof app.getSecretaryDoctor === "function") {
        return app.getSecretaryDoctor() || null;
      }

      const secretary = this.getSecretary(app);
      const doctorId = secretary?.doctor_id || secretary?.doctorId;

      if (!doctorId) return null;

      const doctors = this.ensureArray(this.readJSON(localStorage, "monmedecin-doctors", []));
      return doctors.find(function (doctor) {
        return String(doctor.id || doctor.doctor_id) === String(doctorId);
      }) || null;
    },


    /* =====================================================
       DOCTOR ID
       ===================================================== */

    getDoctorId: function (app) {
      if (typeof app.getSecretaryDoctorId === "function") {
        return app.getSecretaryDoctorId() || null;
      }

      const secretary = this.getSecretary(app);
      return secretary?.doctor_id || secretary?.doctorId || null;
    },


    /* =====================================================
       PERMISSION
       ===================================================== */

    can: function (permission, app) {
      if (typeof app.secretaryCan === "function") {
        return app.secretaryCan(permission);
      }
      return this.getSecretary(app)?.permissions?.[permission] === true;
    },


    /* =====================================================
       TODAY
       ===================================================== */

    getToday: function () {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    },


    /* =====================================================
       LOAD
       ===================================================== */

    load: function (app) {
      this.secretary = this.getSecretary(app);
      this.doctor = this.getDoctor(app);

      const allAppointments = this.getAppointmentsSafely();
      const doctorId = this.getDoctorId(app);

      if (doctorId) {
        this.appointments = allAppointments.filter(function (appointment) {
          return String(appointment.doctor_id || appointment.doctorId) === String(doctorId);
        });
      } else {
        this.appointments = [];
      }

      if (doctorId && typeof app.getDoctorSchedule === "function") {
        this.schedule = app.getDoctorSchedule(doctorId);
      } else {
        this.schedule = null;
      }
    },


    /* =====================================================
       STATS
       ===================================================== */

    getStats: function () {
      const today = this.getToday();
      const patientIds = new Set();

      this.appointments.forEach(function (appointment) {
        if (["cancelled", "rejected"].includes(appointment.status)) return;
        const patientId = appointment.patient_id || appointment.patientId;
        if (patientId) {
          patientIds.add(String(patientId));
        }
      });

      return {
        today: this.appointments.filter(function (appointment) {
          return appointment.date === today;
        }).length,
        pending: this.appointments.filter(function (appointment) {
          return appointment.status === "pending";
        }).length,
        confirmed: this.appointments.filter(function (appointment) {
          return appointment.status === "confirmed";
        }).length,
        arrived: this.appointments.filter(function (appointment) {
          return appointment.status === "arrived";
        }).length,
        patients: patientIds.size,
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
       SCHEDULE SUMMARY
       ===================================================== */

    getScheduleSummary: function () {
      if (!this.schedule || !this.schedule.days) {
        return { configured: false, workingDays: 0, slotDuration: 30 };
      }

      let workingDays = 0;
      Object.values(this.schedule.days).forEach(function (day) {
        if (day?.enabled !== false) workingDays++;
      });

      return {
        configured: true,
        workingDays: workingDays,
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
          if (["completed", "cancelled", "rejected", "no_show"].includes(appointment.status)) {
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

    getStatusMeta: function (status) {
      const map = {
        pending: { label: "قيد الانتظار", className: "is-pending" },
        confirmed: { label: "مؤكد", className: "is-confirmed" },
        arrived: { label: "وصل", className: "is-arrived" },
        in_progress: { label: "جاري الفحص", className: "is-progress" },
        completed: { label: "مكتمل", className: "is-completed" }
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
          <div class="secretary-dashboard-empty">
            <span>📅</span>
            <strong>لا توجد مواعيد قادمة</strong>
            <small>ستظهر هنا أقرب حجوزات الطبيب.</small>
          </div>
        `;
      }

      return appointments.map(function (appointment) {
        const meta = this.getStatusMeta(appointment.status);

        return `
          <button type="button" class="secretary-dashboard-appointment" data-secretary-dashboard-appointment="${this.escapeHTML(appointment.id || appointment.appointment_id)}">
            <div class="secretary-dashboard-appointment__avatar">
              ${this.escapeHTML(String(appointment.patientName || "م").charAt(0))}
            </div>
            <div class="secretary-dashboard-appointment__copy">
              <strong>${this.escapeHTML(appointment.patientName || "مريض")}</strong>
              <span>${this.escapeHTML(appointment.serviceName || "استشارة")}</span>
              <small dir="ltr">${this.escapeHTML(appointment.date || "")} • ${this.escapeHTML(appointment.time || "")}</small>
            </div>
            <span class="secretary-dashboard-status ${meta.className}">${this.escapeHTML(meta.label)}</span>
          </button>
        `;
      }, this).join("");
    },


    /* =====================================================
       PERMISSION CARD
       ===================================================== */

    renderPermissionCard: function (options) {
      if (!options.allowed) return "";

      return `
        <button class="secretary-dashboard-tool glass" type="button" data-secretary-dashboard-route="${this.escapeHTML(options.route)}">
          <span class="secretary-dashboard-tool__icon">${options.icon}</span>
          <div>
            <strong>${this.escapeHTML(options.title)}</strong>
            <small>${this.escapeHTML(options.description)}</small>
          </div>
          <b>${options.count !== undefined ? this.escapeHTML(options.count) : "→"}</b>
        </button>
      `;
    },


    /* =====================================================
       NO PERMISSIONS
       ===================================================== */

    renderNoOperationalPermissions: function (app) {
      const anyPermission = this.can("appointments", app) || this.can("patients", app) || this.can("schedule", app);

      if (anyPermission) return "";

      return `
        <section class="secretary-dashboard-no-permissions glass">
          <span>🔒</span>
          <div>
            <strong>لا توجد صلاحيات تشغيلية</strong>
            <p>حسابك نشط، لكن الطبيب لم يمنحك بعد صلاحية إدارة المواعيد أو المرضى أو جدول العمل.</p>
          </div>
        </section>
      `;
    },


    /* =====================================================
       RENDER
       ===================================================== */

    render: function (state, app) {
      this.load(app);

      const stats = this.getStats();
      const schedule = this.getScheduleSummary();

      const secretaryName = this.secretary?.fullName || this.secretary?.name || "السكرتير";
      const doctorName = this.doctor?.fullName || this.doctor?.name || "الطبيب";

      const canAppointments = this.can("appointments", app);
      const canPatients = this.can("patients", app);
      const canSchedule = this.can("schedule", app);
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="secretary-dashboard ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="secretary-dashboard__orb secretary-dashboard__orb--blue"></div>
          <div class="secretary-dashboard__orb secretary-dashboard__orb--cyan"></div>

          <header class="secretary-dashboard__header">
            <div class="secretary-dashboard__identity">
              <div class="secretary-dashboard__avatar">
                ${this.escapeHTML(String(secretaryName).charAt(0))}
              </div>
              <div>
                <span>سكرتارية الطبيب</span>
                <strong>${this.escapeHTML(secretaryName)}</strong>
              </div>
            </div>
            <div class="secretary-dashboard__header-actions">
              <button id="secretaryDashboardTheme" type="button" aria-label="تغيير المظهر">
                ${state.theme === "dark" ? "☀" : "◐"}
              </button>
            </div>
          </header>

          <section class="secretary-dashboard__container">

            <section class="secretary-dashboard__hero">
              <span>SECRETARY SPACE</span>
              <h1>لوحة السكرتارية</h1>
              <p>إدارة المهام التي منحها لك الطبيب داخل العيادة.</p>
            </section>

            <section class="secretary-dashboard-doctor glass">
              <div class="secretary-dashboard-doctor__icon">⚕</div>
              <div>
                <span>الطبيب المرتبط</span>
                <strong>${this.escapeHTML(doctorName)}</strong>
                <small>${this.escapeHTML(this.doctor?.specialty || this.doctor?.professional?.specialty || "طبيب")}</small>
              </div>
            </section>

            ${canAppointments ? `
              <section class="secretary-dashboard-stats">
                <button class="secretary-dashboard-stat glass is-primary" type="button" data-secretary-dashboard-route="/secretary/appointments">
                  <span>مواعيد اليوم</span>
                  <strong>${stats.today}</strong>
                  <small>كل حجوزات اليوم</small>
                </button>
                <button class="secretary-dashboard-stat glass is-pending" type="button" data-secretary-dashboard-route="/secretary/appointments">
                  <span>قيد الانتظار</span>
                  <strong>${stats.pending}</strong>
                  <small>تحتاج معالجة</small>
                </button>
                <button class="secretary-dashboard-stat glass is-confirmed" type="button" data-secretary-dashboard-route="/secretary/appointments">
                  <span>مؤكدة</span>
                  <strong>${stats.confirmed}</strong>
                  <small>حجوزات مؤكدة</small>
                </button>
                <button class="secretary-dashboard-stat glass is-arrived" type="button" data-secretary-dashboard-route="/secretary/appointments">
                  <span>وصلوا</span>
                  <strong>${stats.arrived}</strong>
                  <small>تم تسجيل الوصول</small>
                </button>
              </section>
            ` : ""}

            ${this.renderNoOperationalPermissions(app)}

            <section class="secretary-dashboard-section">
              <header class="secretary-dashboard-section__head">
                <div>
                  <span>الصلاحيات</span>
                  <h2>أدوات السكرتارية</h2>
                </div>
              </header>
              <div class="secretary-dashboard-tools">
                ${this.renderPermissionCard({
                  allowed: canAppointments,
                  route: "/secretary/appointments",
                  icon: "📅",
                  title: "المواعيد",
                  description: "إدارة حجوزات المرضى",
                  count: stats.today
                })}
                ${this.renderPermissionCard({
                  allowed: canAppointments,
                  route: "/secretary/queue",
                  icon: "⏳",
                  title: "قائمة الانتظار",
                  description: "إدارة مرضى العيادة",
                  count: stats.queueWaiting
                })}
                ${this.renderPermissionCard({
                  allowed: canPatients,
                  route: "/secretary/patients",
                  icon: "👥",
                  title: "المرضى",
                  description: "قائمة مرضى الطبيب",
                  count: stats.patients
                })}
                ${this.renderPermissionCard({
                  allowed: canSchedule,
                  route: "/secretary/schedule",
                  icon: "🕒",
                  title: "جدول العمل",
                  description: schedule.configured ? `${schedule.workingDays} أيام • ${schedule.slotDuration} دقيقة` : "إعداد جدول الطبيب",
                  count: schedule.workingDays
                })}
                <button class="secretary-dashboard-tool glass" type="button" data-secretary-dashboard-route="/secretary/profile">
                  <span class="secretary-dashboard-tool__icon">👤</span>
                  <div>
                    <strong>حسابي</strong>
                    <small>بيانات حساب السكرتير</small>
                  </div>
                  <b>→</b>
                </button>
                <button class="secretary-dashboard-tool glass" type="button" data-secretary-dashboard-route="/secretary/settings">
                  <span class="secretary-dashboard-tool__icon">⚙</span>
                  <div>
                    <strong>الإعدادات</strong>
                    <small>إعدادات الحساب</small>
                  </div>
                  <b>→</b>
                </button>
              </div>
            </section>

            ${canAppointments ? `
              <section class="secretary-dashboard-upcoming glass">
                <header class="secretary-dashboard-upcoming__head">
                  <div>
                    <span>NEXT</span>
                    <h2>المواعيد القادمة</h2>
                  </div>
                  <button id="secretaryDashboardAllAppointments" type="button">عرض الكل</button>
                </header>
                <div class="secretary-dashboard-upcoming__list">
                  ${this.renderUpcoming()}
                </div>
              </section>
            ` : ""}

            <section class="secretary-dashboard-permissions glass">
              <header>
                <span>ACCESS</span>
                <strong>صلاحيات حسابك</strong>
              </header>
              <div>
                <span class="${canAppointments ? "is-enabled" : "is-disabled"}">المواعيد ${canAppointments ? "✓" : "×"}</span>
                <span class="${canPatients ? "is-enabled" : "is-disabled"}">المرضى ${canPatients ? "✓" : "×"}</span>
                <span class="${canSchedule ? "is-enabled" : "is-disabled"}">الجدول ${canSchedule ? "✓" : "×"}</span>
              </div>
            </section>

            <section class="secretary-dashboard-account glass">
              <div>
                <span>الحساب</span>
                <strong>${this.escapeHTML(secretaryName)}</strong>
                <small>${this.secretary?.gender === "female" ? "سكرتيرة" : "سكرتير"}</small>
              </div>
              <button id="secretaryDashboardLogout" type="button">تسجيل الخروج</button>
            </section>

          </section>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item is-active" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
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


    /* =====================================================
       INIT
       ===================================================== */

    init: function (app) {
      document.getElementById("secretaryDashboardTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.querySelectorAll("[data-secretary-dashboard-route]").forEach(function (element) {
        element.addEventListener("click", function () {
          const route = this.dataset.secretaryDashboardRoute;
          if (route) {
            app.navigate(route);
          }
        });
      });

      document.getElementById("secretaryDashboardAllAppointments")?.addEventListener("click", function () {
        app.navigate("/secretary/appointments");
      });

      document.querySelectorAll("[data-secretary-dashboard-appointment]").forEach(function (element) {
        element.addEventListener("click", function () {
          const id = this.dataset.secretaryDashboardAppointment;
          const appointment = typeof app.getAppointmentById === "function" ? app.getAppointmentById(id) : null;
          if (appointment && typeof app.selectAppointment === "function") {
            app.selectAppointment(appointment);
          }
          app.navigate("/secretary/appointments");
        });
      });

      document.getElementById("secretaryDashboardLogout")?.addEventListener("click", function () {
        app.logout();
      });

      // BOTTOM NAV
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


  window.SecretaryDashboardScreen = SecretaryDashboardScreen;

})();