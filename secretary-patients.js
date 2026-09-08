/* =====================================================
   MON MÉDECIN
   SECRETARY PATIENTS - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const SecretaryPatientsScreen = {


    /* ==================================================
       STATE
       ================================================== */

    patients: [],

    appointments: [],

    filteredPatients: [],

    secretary: null,

    doctor: null,

    selectedPatientId: null,

    filters: {
      query: ""
    },


    /* ==================================================
       STORAGE
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


    /* ==================================================
       GET APPOINTMENTS SAFELY
       ================================================== */

    getAppointmentsSafely: function () {
      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];

      const map = new Map();

      stores.forEach(function (key) {
        const data = SecretaryPatientsScreen.readJSON(localStorage, key, []);
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
       NORMALIZE STATUS
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
       NORMALIZE PATIENT
       ================================================== */

    normalizePatient: function (patient, index) {
      if (!patient || typeof patient !== "object") return null;

      const fullName = patient.fullName || patient.name ||
        [patient.firstName, patient.lastName].filter(Boolean).join(" ") ||
        "مريض";

      return {
        ...patient,
        id: patient.id || patient.patient_id || patient.phone || `PATIENT-${index + 1}`,
        fullName: fullName,
        phone: patient.phone || "",
        email: patient.email || "",
        gender: patient.gender || "",
        birthDate: patient.birthDate || patient.birth_date || "",
        wilaya: patient.wilaya || "",
        commune: patient.commune || "",
        active: patient.active !== false
      };
    },


    /* ==================================================
       NORMALIZE APPOINTMENT
       ================================================== */

    normalizeAppointment: function (appointment) {
      if (!appointment || typeof appointment !== "object") return null;

      return {
        ...appointment,
        id: appointment.id || "APT-UNKNOWN",
        doctor_id: appointment.doctor_id || appointment.doctorId || null,
        patient_id: appointment.patient_id || appointment.patientId || null,
        patient_name: appointment.patient_name || appointment.patientName || "مريض",
        service_name: appointment.service_name || appointment.serviceName || "موعد طبي",
        date: appointment.date || appointment.appointment_date || "",
        time: appointment.time || appointment.appointment_time || "",
        status: this.normalizeStatus(appointment.status)
      };
    },


    /* ==================================================
       LOAD DATA
       ================================================== */

    loadData: function (app) {
      this.secretary = app.state.secretary || app.state.user || {};
      this.doctor = typeof app.getSecretaryDoctor === "function" ? app.getSecretaryDoctor() : null;

      const doctorId = this.secretary?.doctor_id || this.secretary?.doctorId || this.doctor?.id;

      // Get all patients from registry
      let allPatients = this.readJSON(localStorage, "monmedecin-patients", []);
      if (!Array.isArray(allPatients)) allPatients = [];

      // Get all appointments from all stores
      const allAppointments = this.getAppointmentsSafely();

      // Filter appointments for this doctor
      const scopedAppointments = allAppointments.filter(function (apt) {
        return String(apt.doctor_id || apt.doctorId) === String(doctorId);
      });

      // Get unique patient IDs from appointments
      const patientIds = new Set();
      scopedAppointments.forEach(function (apt) {
        const patientId = apt.patient_id || apt.patientId;
        if (patientId) {
          patientIds.add(String(patientId));
        }
      });

      // Filter patients who have appointments with this doctor
      this.patients = allPatients
        .filter(function (patient) {
          return patientIds.has(String(patient.id || patient.patient_id));
        })
        .map(function (patient, index) {
          return SecretaryPatientsScreen.normalizePatient(patient, index);
        })
        .filter(Boolean);

      // Store scoped appointments
      this.appointments = scopedAppointments
        .map(function (appointment) {
          return SecretaryPatientsScreen.normalizeAppointment(appointment);
        })
        .filter(Boolean);

      const selectedId = sessionStorage.getItem("monmedecin-secretary-selected-patient-id");
      if (selectedId && this.patients.some(function (patient) {
        return String(patient.id) === String(selectedId);
      })) {
        this.selectedPatientId = selectedId;
      }

      this.applyFilters();
      return { patients: this.patients, appointments: this.appointments };
    },


    /* ==================================================
       PATIENT APPOINTMENTS
       ================================================== */

    getPatientAppointments: function (patientId) {
      return this.appointments
        .filter(function (appointment) {
          return String(appointment.patient_id) === String(patientId);
        })
        .sort(function (a, b) {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
          return dateB.getTime() - dateA.getTime();
        });
    },

    getAppointmentCount: function (patientId) {
      return this.getPatientAppointments(patientId).length;
    },

    getCompletedCount: function (patientId) {
      return this.getPatientAppointments(patientId).filter(function (appointment) {
        return appointment.status === "completed";
      }).length;
    },

    getLastAppointment: function (patientId) {
      const appointments = this.getPatientAppointments(patientId);
      return appointments[0] || null;
    },


    /* ==================================================
       FILTER
       ================================================== */

    matchesQuery: function (patient) {
      if (!this.filters.query) return true;

      const query = this.normalizeText(this.filters.query);
      return [
        patient.fullName,
        patient.phone,
        patient.email,
        patient.wilaya,
        patient.commune,
        patient.id
      ].some(function (value) {
        return SecretaryPatientsScreen.normalizeText(value).includes(query);
      });
    },

    applyFilters: function () {
      this.filteredPatients = this.patients
        .filter(function (patient) {
          return SecretaryPatientsScreen.matchesQuery(patient);
        })
        .sort(function (a, b) {
          return String(a.fullName).localeCompare(String(b.fullName), "ar");
        });

      return this.filteredPatients;
    },

    resetFilters: function () {
      this.filters = { query: "" };
    },


    /* ==================================================
       FIND
       ================================================== */

    findPatient: function (patientId) {
      return this.patients.find(function (patient) {
        return String(patient.id) === String(patientId);
      }) || null;
    },


    /* ==================================================
       SELECT
       ================================================== */

    selectPatient: function (patientId, app) {
      const patient = this.findPatient(patientId);
      if (!patient) return;

      this.selectedPatientId = patient.id;
      sessionStorage.setItem("monmedecin-secretary-selected-patient-id", String(patient.id));
      this.refreshDetails(app);
    },

    closeDetails: function (app) {
      this.selectedPatientId = null;
      sessionStorage.removeItem("monmedecin-secretary-selected-patient-id");
      this.refreshDetails(app);
    },


    /* ==================================================
       FORMAT DATE
       ================================================== */

    formatDate: function (value) {
      if (!value) return "—";
      try {
        return new Intl.DateTimeFormat("ar-DZ", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }).format(new Date(`${value}T12:00:00`));
      } catch (error) {
        return value;
      }
    },

    getGenderLabel: function (value) {
      const gender = String(value || "").trim().toLowerCase();
      if (["male", "m", "homme"].includes(gender)) return "ذكر";
      if (["female", "f", "femme"].includes(gender)) return "أنثى";
      return "غير محدد";
    },


    /* ==================================================
       RENDER PATIENT CARD
       ================================================== */

    renderPatient: function (patient) {
      const appointmentCount = this.getAppointmentCount(patient.id);
      const completedCount = this.getCompletedCount(patient.id);
      const lastAppointment = this.getLastAppointment(patient.id);

      return `
        <article class="secretary-patient-card glass">
          <div class="secretary-patient-card__top">
            <div class="secretary-patient-card__identity">
              <div class="secretary-patient-card__avatar">
                ${this.escapeHTML(String(patient.fullName || "م").charAt(0))}
              </div>
              <div>
                <span>مريض</span>
                <h3>${this.escapeHTML(patient.fullName)}</h3>
                <small dir="ltr">${this.escapeHTML(patient.phone || "بدون هاتف")}</small>
              </div>
            </div>
            <span class="secretary-patient-active ${patient.active ? "is-on" : "is-off"}">
              ${patient.active ? "نشط" : "متوقف"}
            </span>
          </div>
          <div class="secretary-patient-card__meta">
            <div>
              <span>الحجوزات</span>
              <strong>${appointmentCount}</strong>
            </div>
            <div>
              <span>المكتملة</span>
              <strong>${completedCount}</strong>
            </div>
          </div>
          <div class="secretary-patient-card__last">
            <span>آخر موعد مع الطبيب</span>
            <strong>${lastAppointment ? this.formatDate(lastAppointment.date) : "لا يوجد"}</strong>
            ${lastAppointment ? `<small>${this.escapeHTML(lastAppointment.service_name)}</small>` : ""}
          </div>
          <div class="secretary-patient-card__actions">
            <button data-secretary-patient-view="${this.escapeHTML(patient.id)}" type="button">التفاصيل</button>
          </div>
        </article>
      `;
    },


    /* ==================================================
       RENDER LIST
       ================================================== */

    renderPatients: function () {
      if (this.filteredPatients.length === 0) {
        return `
          <section class="secretary-patients-empty glass">
            <span>👤</span>
            <h3>لا توجد نتائج</h3>
            <p>لا توجد نتائج مطابقة، أو لا توجد حجوزات بين هذا الطبيب والمرضى بعد.</p>
            <button id="secretaryPatientsResetEmpty" type="button">مسح البحث</button>
          </section>
        `;
      }

      return this.filteredPatients.map(function (patient) {
        return SecretaryPatientsScreen.renderPatient(patient);
      }).join("");
    },


    /* ==================================================
       HISTORY ROW
       ================================================== */

    renderAppointmentRow: function (appointment) {
      return `
        <article class="secretary-patient-history-row">
          <div>
            <span>التاريخ</span>
            <strong>${this.formatDate(appointment.date)}</strong>
            <small dir="ltr">${this.escapeHTML(appointment.time)}</small>
          </div>
          <div>
            <span>الخدمة</span>
            <strong>${this.escapeHTML(appointment.service_name)}</strong>
          </div>
          <span class="secretary-patient-history-status is-${appointment.status}">
            ${this.getStatusLabel(appointment.status)}
          </span>
        </article>
      `;
    },


    /* ==================================================
       DETAILS
       ================================================== */

    renderDetails: function (app) {
      if (!this.selectedPatientId) return "";

      const patient = this.findPatient(this.selectedPatientId);
      if (!patient) return "";

      const appointments = this.getPatientAppointments(patient.id);

      return `
        <div class="secretary-patient-detail-overlay">
          <section class="secretary-patient-detail glass">
            <header class="secretary-patient-detail__header">
              <div>
                <span>بيانات المريض</span>
                <h2>${this.escapeHTML(patient.fullName)}</h2>
              </div>
              <button id="secretaryPatientDetailClose" type="button">×</button>
            </header>

            <div class="secretary-patient-detail__identity">
              <div class="secretary-patient-detail__avatar">
                ${this.escapeHTML(String(patient.fullName || "م").charAt(0))}
              </div>
              <div>
                <strong>${this.escapeHTML(patient.fullName)}</strong>
                <span>${patient.active ? "حساب نشط" : "حساب متوقف"}</span>
                <small>${appointments.length} موعد مع الطبيب</small>
              </div>
            </div>

            <div class="secretary-patient-detail__grid">
              <div>
                <span>الهاتف</span>
                <strong dir="ltr">${this.escapeHTML(patient.phone || "—")}</strong>
              </div>
              <div>
                <span>البريد</span>
                <strong dir="ltr">${this.escapeHTML(patient.email || "—")}</strong>
              </div>
              <div>
                <span>الجنس</span>
                <strong>${this.getGenderLabel(patient.gender)}</strong>
              </div>
              <div>
                <span>تاريخ الميلاد</span>
                <strong>${patient.birthDate ? this.formatDate(patient.birthDate) : "—"}</strong>
              </div>
              <div>
                <span>الولاية</span>
                <strong>${this.escapeHTML(patient.wilaya || "—")}</strong>
              </div>
              <div>
                <span>البلدية</span>
                <strong>${this.escapeHTML(patient.commune || "—")}</strong>
              </div>
              <div>
                <span>عدد الحجوزات</span>
                <strong>${appointments.length}</strong>
              </div>
              <div>
                <span>المكتملة</span>
                <strong>${this.getCompletedCount(patient.id)}</strong>
              </div>
            </div>

            <section class="secretary-patient-detail__history">
              <div class="secretary-patient-detail__section-head">
                <span>السجل</span>
                <h3>الحجوزات مع الطبيب</h3>
              </div>
              <div class="secretary-patient-history">
                ${appointments.length ? appointments.map(function (appointment) {
                  return SecretaryPatientsScreen.renderAppointmentRow(appointment);
                }).join("") : `
                  <div class="secretary-patient-detail__empty">لا توجد حجوزات مسجلة.</div>
                `}
              </div>
            </section>

            <button id="secretaryPatientOpenAppointments" data-patient-id="${this.escapeHTML(patient.id)}" class="secretary-patient-detail__appointments-button" type="button">
              عرض حجوزات هذا المريض
            </button>

          </section>
        </div>
      `;
    },


    /* ==================================================
       REFRESH
       ================================================== */

    refresh: function (app) {
      const results = document.getElementById("secretaryPatientsResults");
      const count = document.getElementById("secretaryPatientsResultsCount");

      if (results) {
        results.innerHTML = this.renderPatients();
      }
      if (count) {
        count.textContent = String(this.filteredPatients.length);
      }
      this.refreshDetails(app);
    },

    refreshDetails: function (app) {
      const root = document.getElementById("secretaryPatientDetailRoot");
      if (root) {
        root.innerHTML = this.renderDetails(app);
      }
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadData(app);

      const isMobile = state.deviceMode === "mobile";
      const doctorName = this.doctor?.fullName || this.doctor?.name || this.doctor?.professional?.title || "الطبيب";

      return `
        <main class="secretary-patients ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="secretary-patients__orb secretary-patients__orb--blue"></div>
          <div class="secretary-patients__orb secretary-patients__orb--cyan"></div>

          <header class="secretary-patients__header">
            <button id="secretaryPatientsBack" class="secretary-patients__back" type="button">→</button>
            <div class="secretary-patients__header-copy">
              <strong>مرضى الطبيب</strong>
              <span>${this.escapeHTML(doctorName)}</span>
            </div>
            <button id="secretaryPatientsTheme" class="secretary-patients__theme" type="button">◐</button>
          </header>

          <section class="secretary-patients__container">

            <section class="secretary-patients__hero">
              <span>المرضى</span>
              <h1>مرضى الطبيب</h1>
              <p>تظهر هنا فقط حسابات المرضى الذين لديهم حجوزات مع الطبيب المرتبط بحسابك.</p>
            </section>

            <section class="secretary-patients-stats">
              <article class="secretary-patients-stat glass">
                <span>المرضى</span>
                <strong>${this.patients.length}</strong>
              </article>
              <article class="secretary-patients-stat glass">
                <span>الحجوزات</span>
                <strong>${this.appointments.length}</strong>
              </article>
              <article class="secretary-patients-stat glass is-success">
                <span>مكتملة</span>
                <strong>${this.appointments.filter(function (appointment) {
                  return appointment.status === "completed";
                }).length}</strong>
              </article>
            </section>

            <section class="secretary-patients-search glass">
              <div class="secretary-patients-search__main">
                <span>⌕</span>
                <input id="secretaryPatientsQuery" type="search" value="${this.escapeHTML(this.filters.query)}" placeholder="اسم المريض، الهاتف، الولاية..." autocomplete="off">
              </div>
              <button id="secretaryPatientsReset" type="button">مسح البحث</button>
            </section>

            <section class="secretary-patients-results__head">
              <div>
                <span>النتائج</span>
                <h2>قائمة المرضى</h2>
              </div>
              <strong id="secretaryPatientsResultsCount">${this.filteredPatients.length}</strong>
            </section>

            <section id="secretaryPatientsResults" class="secretary-patients-results">
              ${this.renderPatients()}
            </section>

          </section>

          <div id="secretaryPatientDetailRoot">${this.renderDetails(app)}</div>

          <!-- BOTTOM NAV - ADDED -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>الحجوزات</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="patients" type="button">
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


    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      console.log("MON MÉDECIN: SecretaryPatientsScreen init");

      document.getElementById("secretaryPatientsBack")?.addEventListener("click", function () {
        app.navigate("/secretary/dashboard");
      });

      document.getElementById("secretaryPatientsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
      });

      document.getElementById("secretaryPatientsQuery")?.addEventListener("input", function (event) {
        SecretaryPatientsScreen.filters.query = event.target.value;
        SecretaryPatientsScreen.applyFilters();
        SecretaryPatientsScreen.refresh(app);
      });

      document.getElementById("secretaryPatientsReset")?.addEventListener("click", function () {
        SecretaryPatientsScreen.resetFilters();
        app.render();
      });

      document.getElementById("secretaryPatientsResults")?.addEventListener("click", function (event) {
        const view = event.target.closest("[data-secretary-patient-view]");
        if (view) {
          SecretaryPatientsScreen.selectPatient(view.dataset.secretaryPatientView, app);
          return;
        }
        const reset = event.target.closest("#secretaryPatientsResetEmpty");
        if (reset) {
          SecretaryPatientsScreen.resetFilters();
          app.render();
        }
      });

      document.getElementById("secretaryPatientDetailRoot")?.addEventListener("click", function (event) {
        if (event.target.closest("#secretaryPatientDetailClose")) {
          SecretaryPatientsScreen.closeDetails(app);
          return;
        }
        if (event.target.closest(".secretary-patient-detail-overlay") === event.target) {
          SecretaryPatientsScreen.closeDetails(app);
          return;
        }
        const appointments = event.target.closest("#secretaryPatientOpenAppointments");
        if (appointments) {
          const patientId = appointments.dataset.patientId;
          sessionStorage.setItem("monmedecin-secretary-filter-patient-id", patientId);
          app.navigate("/secretary/appointments");
        }
      });

      // BOTTOM NAV - ADDED
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


  window.SecretaryPatientsScreen = SecretaryPatientsScreen;

})();