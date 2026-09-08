/* =========================================================
   MON MÉDECIN
   PATIENT HOME - 100% COMPLETE (FIXED)
   ========================================================= */

(function () {

  "use strict";

  const PatientHomeScreen = {
    appointments: [],
    doctors: [],

    /* =====================================================
       🔑 ENSURE ARRAY - التأكد من أن القيمة مصفوفة
       ===================================================== */

    ensureArray: function (value) {
      return Array.isArray(value) ? value : [];
    },

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN PATIENT HOME:", key, error);
        return fallback;
      }
    },

    getAppointmentsSafely: function (app) {
      // 🔑 التأكد من أن القيمة المرتجعة مصفوفة
      if (typeof app.getAppointmentsSafely === "function") {
        return this.ensureArray(app.getAppointmentsSafely());
      }
      if (typeof app.getAppointments === "function") {
        return this.ensureArray(app.getAppointments());
      }
      let appointments = this.readJSON(localStorage, "monmedecin-appointments", []);
      return this.ensureArray(appointments);
    },

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    getPatient: function (app) {
      return (
        app.state.patient ||
        (app.state.role === "patient" ? app.state.user : null)
      );
    },

    getToday: function () {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    },

    /* =====================================================
       🔑 LOAD - مع التأكد من أن البيانات مصفوفة
       ===================================================== */

    load: function (app) {
      try {
        // 🔑 التأكد من أن appointments مصفوفة
        var rawAppointments = this.getAppointmentsSafely(app);
        this.appointments = this.ensureArray(rawAppointments);
        
        const patientId = this.getPatient(app)?.id || app.state.patient?.patient_id || app.state.user?.id;

        if (patientId) {
          this.appointments = this.appointments.filter(function (apt) {
            return String(apt.patient_id || apt.patientId) === String(patientId);
          });
        }

        this.doctors = this.ensureArray(
          this.readJSON(localStorage, "monmedecin-doctors", [])
        );

        this.appointments = [...this.appointments].sort(function (a, b) {
          return `${b.date || ""}T${b.time || "00:00"}`.localeCompare(`${a.date || ""}T${a.time || "00:00"}`);
        });

      } catch (error) {
        console.error("MON MÉDECIN PATIENT HOME:", "Error loading data", error);
        this.appointments = [];
        this.doctors = [];
      }
    },

    /* =====================================================
       🔑 STATS - مع التأكد من أن البيانات مصفوفة
       ===================================================== */

    getStats: function () {
      var appointments = this.ensureArray(this.appointments);
      
      return {
        total: appointments.length,
        pending: appointments.filter(function (appointment) {
          return appointment.status === "pending";
        }).length,
        confirmed: appointments.filter(function (appointment) {
          return appointment.status === "confirmed";
        }).length,
        completed: appointments.filter(function (appointment) {
          return appointment.status === "completed";
        }).length
      };
    },

    /* =====================================================
       🔑 NEXT APPOINTMENT - مع التأكد من أن البيانات مصفوفة
       ===================================================== */

    getNextAppointment: function () {
      var appointments = this.ensureArray(this.appointments);
      
      const today = this.getToday();
      return appointments.filter(function (appointment) {
        if (["cancelled", "rejected", "completed", "no_show"].includes(appointment.status)) {
          return false;
        }
        return String(appointment.date || "") >= today;
      }).sort(function (a, b) {
        return `${a.date || ""}T${a.time || "00:00"}`.localeCompare(`${b.date || ""}T${b.time || "00:00"}`);
      })[0] || null;
    },

    getStatusMeta: function (status) {
      const map = {
        pending: { label: "قيد الانتظار", className: "is-pending" },
        confirmed: { label: "مؤكد", className: "is-confirmed" },
        arrived: { label: "تم تسجيل الوصول", className: "is-arrived" },
        in_progress: { label: "جاري الفحص", className: "is-progress" },
        completed: { label: "مكتمل", className: "is-completed" },
        cancelled: { label: "ملغى", className: "is-cancelled" },
        rejected: { label: "مرفوض", className: "is-rejected" },
        no_show: { label: "لم يحضر", className: "is-no-show" }
      };
      return map[status] || { label: status || "غير معروف", className: "is-default" };
    },

    findDoctor: function (doctorId) {
      return this.doctors.find(function (doctor) {
        return String(doctor.id || doctor.doctor_id) === String(doctorId);
      }) || null;
    },

    renderNextAppointment: function (app) {
      const appointment = this.getNextAppointment();
      if (!appointment) {
        return `
          <section class="patient-home-next glass is-empty">
            <div class="patient-home-next__empty-icon">📅</div>
            <div>
              <span>الموعد القادم</span>
              <strong>لا يوجد موعد قادم</strong>
              <small>ابحث عن طبيب واحجز موعدك.</small>
            </div>
            <button id="patientHomeBookNow" type="button">حجز موعد</button>
          </section>
        `;
      }

      const meta = this.getStatusMeta(appointment.status);
      const doctor = this.findDoctor(appointment.doctor_id || appointment.doctorId);
      const doctorName = appointment.doctorName || doctor?.fullName || doctor?.name || "طبيب";

      return `
        <section class="patient-home-next glass">
          <div class="patient-home-next__head">
            <div>
              <span>NEXT APPOINTMENT</span>
              <h2>موعدك القادم</h2>
            </div>
            <span class="patient-home-status ${meta.className}">${this.escapeHTML(meta.label)}</span>
          </div>
          <div class="patient-home-next__doctor">
            <div class="patient-home-next__avatar">${this.escapeHTML(String(doctorName).charAt(0))}</div>
            <div>
              <strong>${this.escapeHTML(doctorName)}</strong>
              <span>${this.escapeHTML(appointment.doctorSpecialty || doctor?.specialty || doctor?.professional?.specialty || "طبيب")}</span>
              <small>${this.escapeHTML(appointment.serviceName || "استشارة")}</small>
            </div>
          </div>
          <div class="patient-home-next__details">
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
          </div>
          <button id="patientHomeNextAppointment" type="button" data-patient-home-appointment="${this.escapeHTML(appointment.id || appointment.appointment_id)}">
            عرض تفاصيل الموعد
          </button>
        </section>
      `;
    },

    render: function (state, app) {
      this.load(app);
      const patient = this.getPatient(app);
      const patientName = patient?.fullName || patient?.name || "المريض";
      const stats = this.getStats();
      const isMobile = state.deviceMode === 'mobile';

      return `
        <main class="patient-home ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="patient-home__orb patient-home__orb--blue"></div>
          <div class="patient-home__orb patient-home__orb--cyan"></div>

          <header class="patient-home__header">
            <div class="patient-home__identity">
              <div class="patient-home__avatar">${this.escapeHTML(String(patientName).charAt(0))}</div>
              <div>
                <span>مرحبًا</span>
                <strong>${this.escapeHTML(patientName)}</strong>
              </div>
            </div>
            <div class="patient-home__header-actions">
              <button id="patientHomeNotifications" type="button" aria-label="الإشعارات">🔔</button>
              <button id="patientHomeSettings" type="button" aria-label="الإعدادات">⚙</button>
              <button id="patientHomeTheme" type="button" aria-label="تغيير المظهر">${state.theme === "dark" ? "☀" : "◐"}</button>
            </div>
          </header>

          <section class="patient-home__container">

            <section class="patient-home__hero">
              <span>MON MÉDECIN</span>
              <h1>صحتك أقرب</h1>
              <p>ابحث عن الطبيب المناسب، اطلع على خدماته واحجز موعدك بسهولة.</p>
            </section>

            <button id="patientHomeSearch" class="patient-home-search glass" type="button">
              <span>🔎</span>
              <div>
                <strong>ابحث عن طبيب</strong>
                <small>التخصص، الاسم أو الطبيب</small>
              </div>
              <b>←</b>
            </button>

            ${this.renderNextAppointment(app)}

            <section class="patient-home-stats">
              <button class="patient-home-stat glass" type="button" data-patient-home-route="/patient/appointments">
                <span>كل المواعيد</span>
                <strong>${stats.total}</strong>
              </button>
              <button class="patient-home-stat glass is-pending" type="button" data-patient-home-route="/patient/appointments">
                <span>قيد الانتظار</span>
                <strong>${stats.pending}</strong>
              </button>
              <button class="patient-home-stat glass is-confirmed" type="button" data-patient-home-route="/patient/appointments">
                <span>مؤكدة</span>
                <strong>${stats.confirmed}</strong>
              </button>
              <button class="patient-home-stat glass is-completed" type="button" data-patient-home-route="/patient/appointments">
                <span>مكتملة</span>
                <strong>${stats.completed}</strong>
              </button>
            </section>

            <section class="patient-home-section">
              <header class="patient-home-section__head">
                <span>QUICK ACCESS</span>
                <h2>الوصول السريع</h2>
              </header>
              <div class="patient-home-actions">
                <button class="patient-home-action glass" type="button" data-patient-home-route="/patient/search">
                  <span>🔎</span>
                  <div>
                    <strong>البحث</strong>
                    <small>العثور على طبيب</small>
                  </div>
                </button>
                <button class="patient-home-action glass" type="button" data-patient-home-route="/patient/appointments">
                  <span>📅</span>
                  <div>
                    <strong>مواعيدي</strong>
                    <small>متابعة الحجوزات</small>
                  </div>
                </button>
                <button class="patient-home-action glass" type="button" data-patient-home-route="/patient/favorites">
                  <span>❤</span>
                  <div>
                    <strong>المفضلة</strong>
                    <small>الأطباء المحفوظون</small>
                  </div>
                </button>
                <button class="patient-home-action glass" type="button" data-patient-home-route="/patient/profile">
                  <span>👤</span>
                  <div>
                    <strong>حسابي</strong>
                    <small>البيانات الشخصية</small>
                  </div>
                </button>
                <button class="patient-home-action glass" type="button" data-patient-home-route="/patient/notifications">
                  <span>🔔</span>
                  <div>
                    <strong>الإشعارات</strong>
                    <small>تحديثات المواعيد</small>
                  </div>
                </button>
              </div>
            </section>

            <section class="patient-home-account glass">
              <div>
                <span>الحساب</span>
                <strong>${this.escapeHTML(patientName)}</strong>
                <small dir="ltr">${this.escapeHTML(patient?.phone || patient?.email || "")}</small>
              </div>
              <button id="patientHomeLogout" class="patient-home-logout" type="button">
                تسجيل الخروج
              </button>
            </section>

          </section>

          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item is-active" data-nav="home" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="search" type="button">
                <span class="mobile-bottom-nav__icon">⌕</span>
                <span>البحث</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>مواعيدي</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="profile" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>ملفي الشخصي</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    init: function (app) {
      // THEME
      document.getElementById("patientHomeTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // SEARCH
      document.getElementById("patientHomeSearch")?.addEventListener("click", function () {
        app.navigate("/patient/search");
      });

      // BOOK NOW
      document.getElementById("patientHomeBookNow")?.addEventListener("click", function () {
        app.navigate("/patient/search");
      });

      // NOTIFICATIONS
      document.getElementById("patientHomeNotifications")?.addEventListener("click", function () {
        app.navigate("/patient/notifications");
      });

      // SETTINGS
      document.getElementById("patientHomeSettings")?.addEventListener("click", function () {
        app.navigate("/patient/profile");
      });

      // ROUTES
      document.querySelectorAll("[data-patient-home-route]").forEach(function (element) {
        element.addEventListener("click", function () {
          const route = this.dataset.patientHomeRoute;
          if (route) {
            app.navigate(route);
          }
        });
      });

      // NEXT APPOINTMENT
      document.getElementById("patientHomeNextAppointment")?.addEventListener("click", function () {
        const appointmentId = this.dataset.patientHomeAppointment;
        const appointment = typeof app.getAppointmentById === "function"
          ? app.getAppointmentById(appointmentId)
          : null;
        if (appointment && typeof app.selectAppointment === "function") {
          app.selectAppointment(appointment);
        }
        app.navigate("/patient/appointments");
      });

      // LOGOUT
      const logoutBtn = document.getElementById("patientHomeLogout");
      if (logoutBtn) {
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        const newLogoutBtn = document.getElementById("patientHomeLogout");
        newLogoutBtn?.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (confirm("هل تريد تسجيل الخروج؟")) {
            app.logout();
          }
        });
      }

      // BOTTOM NAV
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

  window.PatientHomeScreen = PatientHomeScreen;

})();