/* =========================================================
   MON MÉDECIN
   ADMIN DASHBOARD - FIXED (WITH DATA CLEANUP LINK)
   ========================================================= */

(function () {
  "use strict";

  const AdminDashboardScreen = {
    doctors: [],
    patients: [],
    secretaries: [],
    appointments: [],
    services: [],
    schedules: [],

    /* =====================================================
       STORAGE
       ===================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN ADMIN DASHBOARD:", key, error);
        return fallback;
      }
    },

    ensureArray: function (value) {
      return Array.isArray(value) ? value : [];
    },

    /* =====================================================
       GET APPOINTMENTS SAFELY - FIXED
       ===================================================== */

    getAppointmentsSafely: function () {
      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];
      const map = new Map();
      stores.forEach(function (key) {
        const data = AdminDashboardScreen.readJSON(localStorage, key, []);
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
       ADMIN
       ===================================================== */

    getAdmin: function (app) {
      return app.state.admin || (app.state.role === "admin" ? app.state.user : null);
    },

    /* =====================================================
       ACTIVE ACCOUNT
       ===================================================== */

    isActive: function (account) {
      if (!account) return false;
      if (account.active === false) return false;
      const status = String(account.status || "").trim().toLowerCase();
      return !["inactive", "disabled", "blocked", "suspended", "deleted"].includes(status);
    },

    /* =====================================================
       LOAD - FIXED: Clear cache before loading
       ===================================================== */

    load: function (app) {
      // مسح الكاش المؤقت للتأكد من جلب أحدث البيانات
      this.clearCache();
      
      this.doctors = this.ensureArray(this.readJSON(localStorage, "monmedecin-doctors", []));
      this.patients = this.ensureArray(this.readJSON(localStorage, "monmedecin-patients", []));
      this.secretaries = this.ensureArray(this.readJSON(localStorage, "monmedecin-secretaries", []));
      this.appointments = this.getAppointmentsSafely();
      this.services = this.ensureArray(this.readJSON(localStorage, "monmedecin-doctor-services", []));
      this.schedules = this.ensureArray(this.readJSON(localStorage, "monmedecin-doctor-schedules", []));
    },

    /* =====================================================
       CLEAR CACHE - NEW
       ===================================================== */

    clearCache: function () {
      // لا يوجد كاش فعلي، لكننا نضمن جلب البيانات من التخزين
      console.log('🔄 AdminDashboard: Loading fresh data');
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
       STATS - FIXED: Use fresh data
       ===================================================== */

    getStats: function () {
      const today = this.getToday();
      const activeDoctors = this.doctors.filter(function (doctor) {
        return this.isActive(doctor);
      }, this).length;
      const inactiveDoctors = this.doctors.length - activeDoctors;
      const activeSecretaries = this.secretaries.filter(function (secretary) {
        return this.isActive(secretary);
      }, this).length;
      const activePatients = this.patients.filter(function (patient) {
        return this.isActive(patient);
      }, this).length;

      return {
        doctors: this.doctors.length,
        doctorsActive: activeDoctors,
        doctorsInactive: inactiveDoctors,
        patients: this.patients.length,
        patientsActive: activePatients,
        secretaries: this.secretaries.length,
        secretariesActive: activeSecretaries,
        appointments: this.appointments.length,
        todayAppointments: this.appointments.filter(function (appointment) {
          return appointment.date === today;
        }).length,
        pendingAppointments: this.appointments.filter(function (appointment) {
          return appointment.status === "pending";
        }).length,
        completedAppointments: this.appointments.filter(function (appointment) {
          return appointment.status === "completed";
        }).length,
        cancelledAppointments: this.appointments.filter(function (appointment) {
          return ["cancelled", "rejected"].includes(appointment.status);
        }).length,
        services: this.services.length,
        activeServices: this.services.filter(function (service) {
          return service.active !== false;
        }).length,
        schedules: this.schedules.length
      };
    },

    /* =====================================================
       STATUS
       ===================================================== */

    getAppointmentStatus: function (status) {
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
       RECENT APPOINTMENTS - FIXED: Use fresh data
       ===================================================== */

    getRecentAppointments: function () {
      return [...this.appointments]
        .sort(function (a, b) {
          const first = a.createdAt || a.date + "T" + (a.time || "00:00");
          const second = b.createdAt || b.date + "T" + (b.time || "00:00");
          return String(second).localeCompare(String(first));
        })
        .slice(0, 6);
    },

    /* =====================================================
       RECENT APPOINTMENTS HTML
       ===================================================== */

    renderRecentAppointments: function () {
      const appointments = this.getRecentAppointments();
      if (appointments.length === 0) {
        return `
          <div class="admin-dashboard-empty">
            <span>📅</span>
            <strong>لا توجد مواعيد بعد</strong>
            <small>ستظهر آخر الحجوزات هنا بمجرد بدء استخدام المنصة.</small>
          </div>
        `;
      }
      return appointments.map(function (appointment) {
        const meta = this.getAppointmentStatus(appointment.status);
        return `
          <button type="button" class="admin-dashboard-appointment" data-admin-dashboard-appointment="${this.escapeHTML(appointment.id || appointment.appointment_id)}">
            <div class="admin-dashboard-appointment__avatar">
              ${this.escapeHTML(String(appointment.patientName || "م").charAt(0))}
            </div>
            <div class="admin-dashboard-appointment__copy">
              <strong>${this.escapeHTML(appointment.patientName || "مريض")}</strong>
              <span>${this.escapeHTML(appointment.doctorName || "طبيب")}</span>
              <small dir="ltr">${this.escapeHTML(appointment.date || "")} • ${this.escapeHTML(appointment.time || "")}</small>
            </div>
            <span class="admin-dashboard-status ${meta.className}">${this.escapeHTML(meta.label)}</span>
          </button>
        `;
      }, this).join("");
    },

    /* =====================================================
       MANAGEMENT CARD
       ===================================================== */

    renderManagementCard: function (options) {
      return `
        <button class="admin-dashboard-management__card glass" type="button" data-admin-dashboard-route="${this.escapeHTML(options.route)}">
          <span class="admin-dashboard-management__icon">${options.icon}</span>
          <div>
            <strong>${this.escapeHTML(options.title)}</strong>
            <small>${this.escapeHTML(options.description)}</small>
          </div>
          <b>${options.count !== undefined ? this.escapeHTML(options.count) : "→"}</b>
        </button>
      `;
    },

    /* =====================================================
       RENDER - 100% COMPLETE
       ===================================================== */

    render: function (state, app) {
      this.load(app);
      const admin = this.getAdmin(app);
      const stats = this.getStats();
      const adminName = admin?.fullName || admin?.name || "Administrateur";
      const isMobile = state.deviceMode === 'mobile';

      // Get cleanup logs count
      const logs = this.readJSON(localStorage, 'monmedecin-cleanup-logs', []);
      const hasCleanupLogs = Array.isArray(logs) && logs.length > 0;

      return `
        <main class="admin-dashboard ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <!-- BACKGROUND -->
          <div class="admin-dashboard__orb admin-dashboard__orb--blue"></div>
          <div class="admin-dashboard__orb admin-dashboard__orb--cyan"></div>

          <!-- HEADER -->
          <header class="admin-dashboard__header">
            <div class="admin-dashboard__identity">
              <div class="admin-dashboard__avatar">A</div>
              <div>
                <span>Administration</span>
                <strong>${this.escapeHTML(adminName)}</strong>
              </div>
            </div>
            <div class="admin-dashboard__header-actions">
              <button id="adminDashboardNotifications" type="button" aria-label="الإشعارات">🔔</button>
              <button id="adminDashboardTheme" type="button" aria-label="تغيير المظهر">${state.theme === "dark" ? "☀" : "◐"}</button>
            </div>
          </header>

          <!-- CONTENT -->
          <section class="admin-dashboard__container">

            <!-- HERO -->
            <section class="admin-dashboard__hero">
              <div>
                <span>ADMIN CONTROL</span>
                <h1>لوحة الإدارة</h1>
                <p>مراقبة الأطباء والمرضى والمواعيد والحسابات وإدارة منصة Mon Médecin.</p>
              </div>
              <button id="adminDashboardAddDoctor" type="button">+ إضافة طبيب</button>
            </section>

            <!-- PRIMARY STATS -->
            <section class="admin-dashboard-stats">
              <button class="admin-dashboard-stat glass is-doctors" type="button" data-admin-dashboard-route="/admin/doctors">
                <span>الأطباء</span>
                <strong>${stats.doctors}</strong>
                <small>${stats.doctorsActive} نشط</small>
              </button>
              <button class="admin-dashboard-stat glass is-patients" type="button" data-admin-dashboard-route="/admin/patients">
                <span>المرضى</span>
                <strong>${stats.patients}</strong>
                <small>${stats.patientsActive} نشط</small>
              </button>
              <button class="admin-dashboard-stat glass is-secretaries" type="button" data-admin-dashboard-route="/admin/users">
                <span>السكرتارية</span>
                <strong>${stats.secretaries}</strong>
                <small>${stats.secretariesActive} نشط</small>
              </button>
              <button class="admin-dashboard-stat glass is-appointments" type="button" data-admin-dashboard-route="/admin/appointments">
                <span>المواعيد</span>
                <strong>${stats.appointments}</strong>
                <small>${stats.todayAppointments} اليوم</small>
              </button>
            </section>

            <!-- ALERTS -->
            <section class="admin-dashboard-alerts">
              <article class="admin-dashboard-alert glass is-warning">
                <span>⏳</span>
                <div>
                  <strong>طلبات الحجز المنتظرة</strong>
                  <small>تحتاج متابعة من الطبيب أو السكرتارية</small>
                </div>
                <b>${stats.pendingAppointments}</b>
              </article>
              <article class="admin-dashboard-alert glass is-danger">
                <span>⛔</span>
                <div>
                  <strong>أطباء متوقفون</strong>
                  <small>الحسابات غير النشطة حاليًا</small>
                </div>
                <b>${stats.doctorsInactive}</b>
              </article>
              <article class="admin-dashboard-alert glass is-success">
                <span>✓</span>
                <div>
                  <strong>مواعيد مكتملة</strong>
                  <small>إجمالي الخدمات المنجزة</small>
                </div>
                <b>${stats.completedAppointments}</b>
              </article>
            </section>

            <!-- MANAGEMENT -->
            <section class="admin-dashboard-section">
              <header class="admin-dashboard-section__head">
                <div>
                  <span>MANAGEMENT</span>
                  <h2>إدارة المنصة</h2>
                </div>
              </header>
              <div class="admin-dashboard-management">
                ${this.renderManagementCard({ route: "/admin/doctors", icon: "⚕", title: "الأطباء", description: "إضافة وإدارة حسابات الأطباء", count: stats.doctors })}
                ${this.renderManagementCard({ route: "/admin/patients", icon: "👥", title: "المرضى", description: "إدارة حسابات المرضى", count: stats.patients })}
                ${this.renderManagementCard({ route: "/admin/users", icon: "🧑‍💼", title: "المستخدمون", description: "الأطباء والمرضى والسكرتارية", count: stats.doctors + stats.patients + stats.secretaries })}
                ${this.renderManagementCard({ route: "/admin/appointments", icon: "📅", title: "المواعيد", description: "متابعة حجوزات المنصة", count: stats.appointments })}
                ${this.renderManagementCard({ route: "/admin/specialties", icon: "🩺", title: "التخصصات", description: "إدارة تخصصات الأطباء" })}
                ${this.renderManagementCard({ route: "/admin/complaints", icon: "⚠", title: "الشكاوى", description: "متابعة البلاغات والشكاوى" })}
                ${this.renderManagementCard({ route: "/admin/reports", icon: "📊", title: "التقارير", description: "الإحصائيات وتقارير المنصة" })}
                ${this.renderManagementCard({ route: "/admin/content", icon: "📝", title: "المحتوى", description: "إدارة محتوى التطبيق" })}
                ${this.renderManagementCard({ route: "/admin/settings", icon: "⚙", title: "الإعدادات", description: "إعدادات النظام", count: hasCleanupLogs ? '🧹' : undefined })}
              </div>
            </section>

            <!-- SYSTEM SUMMARY -->
            <section class="admin-dashboard-system glass">
              <header>
                <span>SYSTEM</span>
                <h2>حالة بيانات المنصة</h2>
              </header>
              <div class="admin-dashboard-system__grid">
                <div>
                  <span>خدمات الأطباء</span>
                  <strong>${stats.services}</strong>
                  <small>${stats.activeServices} نشطة</small>
                </div>
                <div>
                  <span>جداول الأطباء</span>
                  <strong>${stats.schedules}</strong>
                  <small>جدول محفوظ</small>
                </div>
                <div>
                  <span>حجوزات ملغاة</span>
                  <strong>${stats.cancelledAppointments}</strong>
                  <small>ملغاة أو مرفوضة</small>
                </div>
                <div>
                  <span>مواعيد اليوم</span>
                  <strong>${stats.todayAppointments}</strong>
                  <small>على كامل المنصة</small>
                </div>
              </div>
            </section>

            <!-- RECENT APPOINTMENTS -->
            <section class="admin-dashboard-recent glass">
              <header class="admin-dashboard-recent__head">
                <div>
                  <span>ACTIVITY</span>
                  <h2>آخر المواعيد</h2>
                </div>
                <button id="adminDashboardAllAppointments" type="button">عرض الكل</button>
              </header>
              <div class="admin-dashboard-recent__list">
                ${this.renderRecentAppointments()}
              </div>
            </section>

            <!-- ADMIN ACCOUNT -->
            <section class="admin-dashboard-account glass">
              <div>
                <span>حساب الإدارة</span>
                <strong>${this.escapeHTML(adminName)}</strong>
                <small dir="ltr">${this.escapeHTML(admin?.email || "")}</small>
              </div>
              <div class="admin-dashboard-account__actions">
                <button id="adminDashboardProfile" type="button">الحساب</button>
                <button id="adminDashboardLogout" class="is-logout" type="button">تسجيل الخروج</button>
              </div>
            </section>

          </section>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item is-active" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="doctors" type="button">
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

    /* =====================================================
       INIT - FIXED
       ===================================================== */

    init: function (app) {
      // THEME
      document.getElementById("adminDashboardTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // NOTIFICATIONS
      document.getElementById("adminDashboardNotifications")?.addEventListener("click", function () {
        app.navigate("/admin/notifications");
      });

      // ADD DOCTOR
      document.getElementById("adminDashboardAddDoctor")?.addEventListener("click", function () {
        app.navigate("/admin/doctors");
      });

      // ROUTES
      document.querySelectorAll("[data-admin-dashboard-route]").forEach(function (element) {
        element.addEventListener("click", function () {
          const route = this.dataset.adminDashboardRoute;
          if (route) {
            app.navigate(route);
          }
        });
      });

      // ALL APPOINTMENTS
      document.getElementById("adminDashboardAllAppointments")?.addEventListener("click", function () {
        app.navigate("/admin/appointments");
      });

      // APPOINTMENT DETAIL
      document.querySelectorAll("[data-admin-dashboard-appointment]").forEach(function (element) {
        element.addEventListener("click", function () {
          const appointmentId = this.dataset.adminDashboardAppointment;
          const appointment = typeof app.getAppointmentById === "function"
            ? app.getAppointmentById(appointmentId)
            : null;
          if (appointment && typeof app.selectAppointment === "function") {
            app.selectAppointment(appointment);
          }
          app.navigate("/admin/appointments");
        });
      });

      // PROFILE
      document.getElementById("adminDashboardProfile")?.addEventListener("click", function () {
        app.navigate("/admin/settings");
      });

      // LOGOUT - FIXED
      document.getElementById("adminDashboardLogout")?.addEventListener("click", function () {
        if (confirm("هل تريد تسجيل الخروج من لوحة الإدارة؟")) {
          app.logout();
        }
      });

      // BOTTOM NAV
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

  window.AdminDashboardScreen = AdminDashboardScreen;

})();