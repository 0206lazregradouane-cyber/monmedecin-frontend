/* =====================================================
   MON MÉDECIN
   DOCTOR PATIENT DETAILS - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const DoctorPatientScreen = {


    /* ==================================================
       STATE
       ================================================== */

    doctor: null,

    patient: null,

    appointments: [],


    /* ==================================================
       STORAGE
       ================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const saved = storage.getItem(key);
        if (!saved) return fallback;
        return JSON.parse(saved);
      } catch (error) {
        console.warn("MON MÉDECIN: تعذر قراءة", key);
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
        const data = DoctorPatientScreen.readJSON(localStorage, key, []);
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
       CURRENT DOCTOR
       ================================================== */

    loadDoctor: function (state) {
      let doctor = null;

      if (state && state.doctor && typeof state.doctor === "object") {
        doctor = state.doctor;
      }

      if (!doctor) {
        doctor = this.readJSON(localStorage, "monmedecin-doctor", null);
      }

      if (!doctor) {
        const doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
        if (Array.isArray(doctors) && doctors.length > 0) {
          if (state && state.user && state.user.id) {
            doctor = doctors.find(function (d) {
              return String(d.id) === String(state.user.id);
            }) || null;
          }
          if (!doctor) {
            doctor = doctors.find(function (d) {
              return d.active !== false;
            }) || doctors[0] || null;
          }
        }
      }

      if (!doctor) {
        doctor = { id: 1, fullName: "الطبيب" };
      }

      this.doctor = doctor;
      return doctor;
    },


    /* ==================================================
       LOAD SELECTED PATIENT
       ================================================== */

    loadPatient: function (state) {
      let patient = null;

      if (state && state.selectedPatient && typeof state.selectedPatient === "object") {
        patient = state.selectedPatient;
      }

      if (!patient) {
        patient = this.readJSON(sessionStorage, "monmedecin-doctor-selected-patient", null);
      }

      this.patient = patient && typeof patient === "object" ? patient : null;
      return this.patient;
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


    /* ==================================================
       NORMALIZE APPOINTMENT
       ================================================== */

    normalizeAppointment: function (appointment) {
      if (!appointment || typeof appointment !== "object") return null;

      return {
        ...appointment,
        doctor_id: appointment.doctor_id || appointment.doctorId || null,
        patient_id: appointment.patient_id || appointment.patientId || null,
        service_id: appointment.service_id || appointment.serviceId || null,
        patient_name: appointment.patient_name || appointment.patientName || "مريض",
        patient_phone: appointment.patient_phone || appointment.phone || "",
        service_name: appointment.service_name || appointment.serviceName || "استشارة طبية",
        date: appointment.date || appointment.appointment_date || "",
        time: appointment.time || appointment.appointment_time || "",
        duration: Number(appointment.duration || appointment.service_duration || 30) || 30,
        price: Number(appointment.price || appointment.service_price || 0) || 0,
        reason: appointment.reason || "",
        notes: appointment.notes || "",
        status: this.normalizeStatus(appointment.status),
        payment_status: appointment.payment_status || appointment.paymentStatus || "unpaid",
        arrived: appointment.arrived === true
      };
    },


    /* ==================================================
       MERGE APPOINTMENTS
       ================================================== */

    getAllAppointments: function () {
      const allAppointments = this.getAppointmentsSafely();
      return allAppointments.map(function (raw) {
        return DoctorPatientScreen.normalizeAppointment(raw);
      }).filter(Boolean);
    },


    /* ==================================================
       PATIENT MATCH
       ================================================== */

    belongsToPatient: function (appointment) {
      if (!appointment || !this.patient) return false;

      if (this.patient.id !== undefined && this.patient.id !== null &&
          appointment.patient_id !== undefined && appointment.patient_id !== null) {
        return String(appointment.patient_id) === String(this.patient.id);
      }

      if (this.patient.phone && appointment.patient_phone) {
        return String(appointment.patient_phone) === String(this.patient.phone);
      }

      return false;
    },


    /* ==================================================
       DOCTOR MATCH
       ================================================== */

    belongsToDoctor: function (appointment) {
      if (!appointment || !this.doctor) return false;
      return String(appointment.doctor_id) === String(this.doctor.id);
    },


    /* ==================================================
       LOAD APPOINTMENTS
       ================================================== */

    loadAppointments: function () {
      this.appointments = this.getAllAppointments()
        .filter(function (appointment) {
          return DoctorPatientScreen.belongsToDoctor(appointment) &&
                 DoctorPatientScreen.belongsToPatient(appointment);
        })
        .sort(function (a, b) {
          return DoctorPatientScreen.getTimestamp(b) - DoctorPatientScreen.getTimestamp(a);
        });

      return this.appointments;
    },


    /* ==================================================
       TIMESTAMP
       ================================================== */

    getTimestamp: function (appointment) {
      if (!appointment || !appointment.date) return 0;
      const date = new Date(`${appointment.date}T${appointment.time || "00:00"}:00`);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    },


    /* ==================================================
       FORMAT DATE
       ================================================== */

    formatDate: function (value) {
      if (!value) return "—";
      const date = new Date(`${value}T12:00:00`);
      if (Number.isNaN(date.getTime())) return value;
      try {
        return new Intl.DateTimeFormat("ar-DZ", {
          weekday: "short",
          day: "numeric",
          month: "long",
          year: "numeric"
        }).format(date);
      } catch (error) {
        return value;
      }
    },


    /* ==================================================
       PRICE
       ================================================== */

    formatPrice: function (value) {
      try {
        return new Intl.NumberFormat("fr-DZ").format(Number(value) || 0);
      } catch (error) {
        return String(Number(value) || 0);
      }
    },


    /* ==================================================
       STATUS
       ================================================== */

    getStatus: function (status) {
      const normalized = this.normalizeStatus(status);

      const statuses = {
        pending: { label: "قيد الانتظار", className: "is-pending" },
        confirmed: { label: "مؤكد", className: "is-confirmed" },
        in_progress: { label: "قيد المعاينة", className: "is-progress" },
        completed: { label: "مكتمل", className: "is-completed" },
        cancelled: { label: "ملغي", className: "is-cancelled" },
        no_show: { label: "لم يحضر", className: "is-noshow" }
      };

      return statuses[normalized] || statuses.pending;
    },


    /* ==================================================
       STATISTICS
       ================================================== */

    getCompletedAppointments: function () {
      return this.appointments.filter(function (appointment) {
        return appointment.status === "completed";
      });
    },

    getCancelledAppointments: function () {
      return this.appointments.filter(function (appointment) {
        return appointment.status === "cancelled";
      });
    },

    getNoShowAppointments: function () {
      return this.appointments.filter(function (appointment) {
        return appointment.status === "no_show";
      });
    },

    getTotalSpent: function () {
      return this.getCompletedAppointments().reduce(function (total, appointment) {
        return total + (Number(appointment.price) || 0);
      }, 0);
    },

    getFirstAppointment: function () {
      if (this.appointments.length === 0) return null;
      return [...this.appointments].sort(function (a, b) {
        return DoctorPatientScreen.getTimestamp(a) - DoctorPatientScreen.getTimestamp(b);
      })[0];
    },

    getLastAppointment: function () {
      if (this.appointments.length === 0) return null;
      return this.appointments[0];
    },


    /* ==================================================
       RENDER APPOINTMENT
       ================================================== */

    renderAppointment: function (appointment) {
      const status = this.getStatus(appointment.status);

      return `
        <article class="doctor-patient-appointment glass">
          <div class="doctor-patient-appointment__top">
            <div>
              <span>${appointment.service_name}</span>
              <strong>${this.formatDate(appointment.date)}</strong>
            </div>
            <span class="doctor-patient-appointment__status ${status.className}">
              ${status.label}
            </span>
          </div>
          <div class="doctor-patient-appointment__grid">
            <div>
              <span>الساعة</span>
              <strong>${appointment.time || "—"}</strong>
            </div>
            <div>
              <span>المدة</span>
              <strong>${appointment.duration || 30} دقيقة</strong>
            </div>
            <div>
              <span>السعر</span>
              <strong>${this.formatPrice(appointment.price)} دج</strong>
            </div>
          </div>
          ${appointment.reason ? `
            <div class="doctor-patient-appointment__note">
              <span>سبب الزيارة</span>
              <p>${appointment.reason}</p>
            </div>
          ` : ""}
          ${appointment.notes ? `
            <div class="doctor-patient-appointment__note">
              <span>ملاحظات المريض</span>
              <p>${appointment.notes}</p>
            </div>
          ` : ""}
          ${appointment.arrived ? `
            <div class="doctor-patient-appointment__arrived">
              ✓ تم تسجيل وصول المريض
            </div>
          ` : ""}
          <div class="doctor-patient-appointment__reference">
            <span>رقم الحجز</span>
            <strong dir="ltr">${appointment.id || "—"}</strong>
          </div>
        </article>
      `;
    },


    /* ==================================================
       RENDER HISTORY
       ================================================== */

    renderHistory: function () {
      if (this.appointments.length === 0) {
        return `
          <div class="doctor-patient-empty glass">
            <span>◷</span>
            <h3>لا يوجد سجل حجوزات</h3>
            <p>لم نعثر على حجوزات لهذا المريض معك.</p>
          </div>
        `;
      }

      return this.appointments.map(function (appointment) {
        return DoctorPatientScreen.renderAppointment(appointment);
      }).join("");
    },


    /* ==================================================
       RENDER INVALID
       ================================================== */

    renderInvalid: function (isMobile) {
      return `
        <main class="doctor-patient ${isMobile ? "mobile-app-page" : "website-page"}">
          <header class="doctor-patient__header">
            <button id="doctorPatientInvalidBack" class="doctor-patient__back" type="button">→</button>
            <div class="doctor-patient__header-copy">
              <strong>ملف المريض</strong>
              <span>Mon Médecin</span>
            </div>
            <div></div>
          </header>
          <section class="doctor-patient__container">
            <section class="doctor-patient-empty glass">
              <span>!</span>
              <h1>لم يتم تحديد مريض</h1>
              <p>ارجع إلى قائمة المرضى واختر المريض الذي تريد عرض ملفه.</p>
            </section>
          </section>
        </main>
      `;
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state) {
      this.loadDoctor(state);
      this.loadPatient(state);

      const isMobile = state.deviceMode === "mobile";

      if (!this.patient) {
        return this.renderInvalid(isMobile);
      }

      this.loadAppointments();

      const firstAppointment = this.getFirstAppointment();
      const lastAppointment = this.getLastAppointment();
      const completed = this.getCompletedAppointments().length;
      const noShow = this.getNoShowAppointments().length;
      const cancelled = this.getCancelledAppointments().length;

      return `
        <main class="doctor-patient ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-patient__orb doctor-patient__orb--blue"></div>
          <div class="doctor-patient__orb doctor-patient__orb--purple"></div>

          <header class="doctor-patient__header">
            <button id="doctorPatientBack" class="doctor-patient__back" type="button">→</button>
            <div class="doctor-patient__header-copy">
              <strong>ملف المريض</strong>
              <span>سجل الحجوزات</span>
            </div>
            <button id="doctorPatientTheme" class="doctor-patient__theme" type="button">◐</button>
          </header>

          <section class="doctor-patient__container">

            <section class="doctor-patient-profile glass">
              <div class="doctor-patient-profile__avatar">
                ${(this.patient.fullName || "م").charAt(0)}
              </div>
              <div class="doctor-patient-profile__identity">
                <span>المريض</span>
                <h1>${this.patient.fullName || "مريض"}</h1>
                ${this.patient.phone ? `
                  <a href="tel:${this.patient.phone}" dir="ltr">${this.patient.phone}</a>
                ` : `
                  <small>لا يوجد رقم هاتف</small>
                `}
                ${this.patient.email ? `<small>${this.patient.email}</small>` : ""}
              </div>
            </section>

            <section class="doctor-patient-stats">
              <article class="doctor-patient-stat glass">
                <span>جميع المواعيد</span>
                <strong>${this.appointments.length}</strong>
              </article>
              <article class="doctor-patient-stat glass">
                <span>المكتملة</span>
                <strong>${completed}</strong>
              </article>
              <article class="doctor-patient-stat glass">
                <span>عدم الحضور</span>
                <strong>${noShow}</strong>
              </article>
              <article class="doctor-patient-stat glass">
                <span>الملغاة</span>
                <strong>${cancelled}</strong>
              </article>
            </section>

            <section class="doctor-patient-summary glass">
              <div>
                <span>أول حجز</span>
                <strong>${firstAppointment ? this.formatDate(firstAppointment.date) : "—"}</strong>
              </div>
              <div>
                <span>آخر حجز</span>
                <strong>${lastAppointment ? this.formatDate(lastAppointment.date) : "—"}</strong>
              </div>
              <div>
                <span>قيمة المعاينات المكتملة</span>
                <strong>${this.formatPrice(this.getTotalSpent())} دج</strong>
              </div>
            </section>

            <section class="doctor-patient-privacy glass">
              <span>🔒</span>
              <div>
                <strong>سجل خاص بعلاقتك مع هذا المريض</strong>
                <p>تظهر هنا فقط حجوزات المريض التي تمت مع حساب الطبيب الحالي.</p>
              </div>
            </section>

            <section class="doctor-patient__section">
              <div class="doctor-patient__section-head">
                <div>
                  <span>سجل المواعيد</span>
                  <h2>تاريخ الحجوزات</h2>
                </div>
                <strong>${this.appointments.length}</strong>
              </div>
              <div class="doctor-patient-history">
                ${this.renderHistory()}
              </div>
            </section>

          </section>

          <!-- BOTTOM NAV - ADDED -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>المواعيد</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="patients" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>المرضى</span>
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


    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      const goPatients = function () {
        app.navigate("/doctor/patients");
      };

      document.getElementById("doctorPatientBack")?.addEventListener("click", goPatients);
      document.getElementById("doctorPatientInvalidBack")?.addEventListener("click", goPatients);

      document.getElementById("doctorPatientTheme")?.addEventListener("click", function () {
        app.toggleTheme();
      });

      // BOTTOM NAV - ADDED
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
      document.querySelectorAll("[data-nav='patients']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/patients");
        });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/account");
        });
      });
    }

  };


  window.DoctorPatientScreen = DoctorPatientScreen;

})();