/* =====================================================
   MON MÉDECIN
   PATIENT BOOKING CONFIRM - FIXED (WITH BOTTOM NAV)
   ===================================================== */

(function () {
  "use strict";

  const PatientBookingConfirmScreen = {
    doctor: null,
    patient: null,
    service: null,
    beneficiary: null,
    selectedDate: "",
    selectedTime: "",
    reason: "",
    notes: "",

    /* ==================================================
       STORAGE
       ================================================== */

    readJSON: function (storage, key) {
      try {
        const saved = storage.getItem(key);
        if (!saved) return null;
        return JSON.parse(saved);
      } catch (error) {
        console.warn("MON MÉDECIN: تعذر قراءة", key);
        return null;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN: تعذر حفظ", key);
        return false;
      }
    },

    /* ==================================================
       ESCAPE HTML
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
       LOAD DOCTOR
       ================================================== */

    loadDoctor: function (state) {
      let doctor = null;
      if (state && state.selectedDoctor && typeof state.selectedDoctor === "object") {
        doctor = state.selectedDoctor;
      }
      if (!doctor) {
        doctor = this.readJSON(sessionStorage, "monmedecin-booking-doctor");
      }
      if (!doctor) {
        doctor = this.readJSON(sessionStorage, "monmedecin-search-selected-doctor");
      }
      this.doctor = doctor && typeof doctor === "object" ? doctor : null;
      return this.doctor;
    },

    /* ==================================================
       LOAD PATIENT
       ================================================== */

    loadPatient: function (state) {
      let patient = null;
      if (state && state.patient && typeof state.patient === "object") {
        patient = state.patient;
      }
      if (!patient) {
        patient = this.readJSON(localStorage, "monmedecin-patient");
      }
      if (!patient) {
        const user = this.readJSON(localStorage, "monmedecin-user");
        if (user && user.role === "patient") {
          patient = user;
        }
      }
      this.patient = patient && typeof patient === "object" ? patient : {
        id: "demo-patient",
        fullName: "مريض تجريبي",
        phone: ""
      };
      return this.patient;
    },

    /* ==================================================
       LOAD BENEFICIARY (FOR OTHER PERSON BOOKING)
       ================================================== */

    loadBeneficiary: function () {
      const beneficiary = this.readJSON(sessionStorage, "monmedecin-booking-beneficiary", null);
      this.beneficiary = beneficiary && typeof beneficiary === "object" && beneficiary.isOtherPerson === true
        ? beneficiary
        : null;
      return this.beneficiary;
    },

    /* ==================================================
       IS OTHER PERSON BOOKING
       ================================================== */

    isOtherPersonBooking: function () {
      return this.beneficiary !== null;
    },

    /* ==================================================
       LOAD SERVICE
       ================================================== */

    loadService: function () {
      const serviceId = sessionStorage.getItem("monmedecin-booking-service");
      const name = sessionStorage.getItem("monmedecin-booking-service-name") || "استشارة طبية";
      const duration = Number(sessionStorage.getItem("monmedecin-booking-service-duration")) || 30;
      const price = Number(sessionStorage.getItem("monmedecin-booking-service-price")) || 0;
      this.service = {
        id: serviceId || "consultation",
        name: name,
        duration: duration,
        price: price
      };
      return this.service;
    },

    /* ==================================================
       LOAD DRAFT
       ================================================== */

    loadDraft: function (state) {
      this.selectedDate = state?.selectedBookingDate || sessionStorage.getItem("monmedecin-booking-date") || "";
      this.selectedTime = state?.selectedBookingTime || sessionStorage.getItem("monmedecin-booking-time") || "";
      this.reason = state?.bookingReason || sessionStorage.getItem("monmedecin-booking-reason") || "";
      this.notes = state?.bookingNotes || sessionStorage.getItem("monmedecin-booking-notes") || "";
    },

    /* ==================================================
       VALIDATE
       ================================================== */

    isValid: function () {
      return Boolean(
        this.doctor &&
        this.doctor.id !== undefined &&
        this.doctor.id !== null &&
        this.patient &&
        this.patient.id !== undefined &&
        this.patient.id !== null &&
        this.service &&
        this.service.id &&
        this.selectedDate &&
        this.selectedTime
      );
    },

    /* ==================================================
       FORMAT PRICE
       ================================================== */

    formatPrice: function (value) {
      try {
        return new Intl.NumberFormat("fr-DZ").format(Number(value) || 0);
      } catch (error) {
        return String(Number(value) || 0);
      }
    },

    /* ==================================================
       DATE LABEL
       ================================================== */

    formatDate: function (value) {
      if (!value) return "—";
      const parts = String(value).split("-").map(Number);
      if (parts.length !== 3) return value;
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      try {
        return new Intl.DateTimeFormat("ar-DZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }).format(date);
      } catch (error) {
        return value;
      }
    },

    /* ==================================================
       CREATE BOOKING ID
       ================================================== */

    createBookingId: function () {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8).toUpperCase();
      return "BK-" + timestamp + "-" + random;
    },

    /* ==================================================
       BUILD BOOKING
       ================================================== */

    buildBooking: function () {
      const now = new Date().toISOString();

      // Get patient name from beneficiary or current user
      let patientName = "";
      let patientPhone = "";

      if (this.isOtherPersonBooking()) {
        patientName = this.beneficiary.fullName ||
          [this.beneficiary.firstName, this.beneficiary.lastName].filter(Boolean).join(" ") ||
          "مستفيد";
        patientPhone = this.beneficiary.phone || "";
      } else {
        patientName = this.patient.fullName || this.patient.name ||
          [this.patient.firstName, this.patient.lastName].filter(Boolean).join(" ") || "مريض";
        patientPhone = this.patient.phone || "";
      }

      const doctorName = this.doctor.fullName || this.doctor.professional?.title ||
        [this.doctor.firstName, this.doctor.lastName].filter(Boolean).join(" ") || "طبيب";
      const professional = this.doctor.professional || {};

      const booking = {
        id: this.createBookingId(),
        doctor_id: this.doctor.id,
        patient_id: this.isOtherPersonBooking() ? null : this.patient.id,
        service_id: this.service.id,
        doctor_name: doctorName,
        patient_name: patientName,
        patient_phone: patientPhone,
        service_name: this.service.name,
        specialty: professional.specialty || this.doctor.specialty || "",
        clinic: professional.clinic || this.doctor.clinic || "",
        wilaya: professional.wilaya || this.doctor.wilaya || "",
        commune: professional.commune || this.doctor.commune || "",
        date: this.selectedDate,
        time: this.selectedTime,
        duration: Number(this.service.duration) || 30,
        price: Number(this.service.price) || 0,
        reason: this.reason || "",
        notes: this.notes || "",
        status: "pending",
        payment_status: "unpaid",
        source: this.isOtherPersonBooking() ? "proxy" : "patient",
        is_proxy_booking: this.isOtherPersonBooking(),
        created_by: this.patient.id,
        created_by_name: this.patient.fullName || this.patient.name || "المريض",
        created_at: now,
        updated_at: now
      };

      // Add beneficiary data if proxy booking
      if (this.isOtherPersonBooking()) {
        booking.beneficiary = {
          firstName: this.beneficiary.firstName,
          lastName: this.beneficiary.lastName,
          fullName: this.beneficiary.fullName,
          birthDate: this.beneficiary.birthDate,
          nationalId: this.beneficiary.nationalId,
          phone: this.beneficiary.phone || "",
          verifiedAt: this.beneficiary.verifiedAt || now
        };
      }

      return booking;
    },

    /* ==================================================
       GET STORE
       ================================================== */

    getAppointments: function (key) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    },

    /* ==================================================
       DUPLICATE CHECK
       ================================================== */

    bookingAlreadyExists: function () {
      const appointments = this.getAppointments("monmedecin-doctor-appointments");
      return appointments.some(function (appointment) {
        if (!appointment) return false;
        const status = String(appointment.status || "").toLowerCase();
        const ignored = ["cancelled", "canceled", "rejected"].includes(status);
        return (
          !ignored &&
          String(appointment.doctor_id) === String(this.doctor.id) &&
          String(appointment.date) === String(this.selectedDate) &&
          String(appointment.time) === String(this.selectedTime)
        );
      }, this);
    },

    /* ==================================================
       SAVE BOOKING TO STORE
       ================================================== */

    saveBooking: function (booking) {
      if (!booking) return false;

      // MAIN SHARED STORE
      const doctorAppointments = this.getAppointments("monmedecin-doctor-appointments");
      doctorAppointments.push(booking);
      const doctorSaved = this.writeJSON(localStorage, "monmedecin-doctor-appointments", doctorAppointments);

      // PATIENT STORE
      const patientAppointments = this.getAppointments("monmedecin-patient-appointments");
      patientAppointments.push(booking);
      const patientSaved = this.writeJSON(localStorage, "monmedecin-patient-appointments", patientAppointments);

      // LEGACY SHARED
      const legacy = this.getAppointments("monmedecin-appointments");
      legacy.push(booking);
      this.writeJSON(localStorage, "monmedecin-appointments", legacy);

      // PROXY BOOKINGS STORE
      if (booking.is_proxy_booking) {
        let proxyBookings = this.getAppointments("monmedecin-proxy-bookings");
        proxyBookings.push({
          ...booking.beneficiary,
          bookingId: booking.id,
          bookedBy: booking.created_by,
          bookedByName: booking.created_by_name,
          bookingDate: booking.date,
          bookingTime: booking.time,
          createdAt: new Date().toISOString()
        });
        this.writeJSON(localStorage, "monmedecin-proxy-bookings", proxyBookings);
      }

      // LATEST BOOKING
      this.writeJSON(sessionStorage, "monmedecin-last-booking", booking);

      return doctorSaved && patientSaved;
    },

    /* ==================================================
       CLEAR TEMP DRAFT
       ================================================== */

    clearDraft: function (app) {
      if (typeof app.clearBookingDraft === "function") {
        app.clearBookingDraft();
      }
      try {
        [
          "monmedecin-booking-date",
          "monmedecin-booking-time",
          "monmedecin-booking-reason",
          "monmedecin-booking-notes"
        ].forEach(function (key) {
          sessionStorage.removeItem(key);
        });
        // Clear beneficiary data
        sessionStorage.removeItem("monmedecin-booking-beneficiary");
      } catch (error) { /* no-op */ }
    },

    /* ==================================================
       CONFIRM
       ================================================== */

    confirm: function (app) {
      if (!this.isValid()) {
        console.warn("MON MÉDECIN: بيانات الحجز ناقصة.");
        return false;
      }

      // Re-check slot
      if (this.bookingAlreadyExists()) {
        const error = document.getElementById("patientBookingConfirmError");
        if (error) {
          error.textContent = "هذا الموعد تم حجزه بالفعل. ارجع واختر ساعة أخرى.";
          error.hidden = false;
        }
        return false;
      }

      const booking = this.buildBooking();
      const saved = this.saveBooking(booking);

      if (!saved) {
        const error = document.getElementById("patientBookingConfirmError");
        if (error) {
          error.textContent = "تعذر حفظ الحجز. حاول مرة أخرى.";
          error.hidden = false;
        }
        return false;
      }

      app.state.lastBooking = booking;
      this.clearDraft(app);
      app.navigate("/patient/booking/success");

      return true;
    },

    /* ==================================================
       RENDER INVALID
       ================================================== */

    renderInvalid: function (isMobile) {
      return `
        <main class="patient-booking-confirm ${isMobile ? "mobile-app-page" : "website-page"}">
          <header class="patient-booking-confirm__header">
            <button id="patientBookingConfirmInvalidBack" class="patient-booking-confirm__back" type="button">→</button>
            <div>
              <strong>تأكيد الحجز</strong>
              <span>Mon Médecin</span>
            </div>
            <div></div>
          </header>

          <section class="patient-booking-confirm__container">
            <div class="patient-booking-confirm-empty glass">
              <h1>بيانات الحجز غير مكتملة</h1>
              <p>ارجع إلى شاشة الحجز واختر الطبيب والخدمة والتاريخ والساعة.</p>
            </div>
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
              <button class="mobile-bottom-nav__item is-active" data-nav="booking" type="button">
                <span class="mobile-bottom-nav__icon">📅</span>
                <span>حجز</span>
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

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadDoctor(state);
      this.loadPatient(state);
      this.loadBeneficiary();
      this.loadService();
      this.loadDraft(state);

      const isMobile = state.deviceMode === 'mobile';

      if (!this.isValid()) {
        return this.renderInvalid(isMobile);
      }

      const professional = this.doctor.professional || {};
      const doctorName = this.doctor.fullName || professional.title || "طبيب";

      // Get patient name from beneficiary or current user
      let patientName = "";
      if (this.isOtherPersonBooking()) {
        patientName = this.beneficiary.fullName ||
          [this.beneficiary.firstName, this.beneficiary.lastName].filter(Boolean).join(" ") ||
          "مستفيد";
      } else {
        patientName = this.patient.fullName || this.patient.name ||
          [this.patient.firstName, this.patient.lastName].filter(Boolean).join(" ") || "مريض";
      }

      return `
        <main class="patient-booking-confirm ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <!-- ORBS -->
          <div class="patient-booking-confirm__orb patient-booking-confirm__orb--blue"></div>
          <div class="patient-booking-confirm__orb patient-booking-confirm__orb--purple"></div>

          <!-- HEADER -->
          <header class="patient-booking-confirm__header">
            <button id="patientBookingConfirmBack" class="patient-booking-confirm__back" type="button">→</button>
            <div class="patient-booking-confirm__header-copy">
              <strong>تأكيد الحجز</strong>
              <span>Mon Médecin</span>
            </div>
            <button id="patientBookingConfirmTheme" class="patient-booking-confirm__theme" type="button">◐</button>
          </header>

          <!-- CONTENT -->
          <section class="patient-booking-confirm__container">

            <!-- HERO -->
            <section class="patient-booking-confirm__hero">
              <span>الخطوة الأخيرة</span>
              <h1>راجع معلومات الموعد</h1>
              <p>تأكد من الطبيب والخدمة والتاريخ والساعة قبل إرسال طلب الحجز.</p>
            </section>

            <!-- DOCTOR -->
            <section class="patient-booking-confirm-card glass">
              <div class="patient-booking-confirm-card__title">
                <span>الطبيب</span>
                <strong>${this.escapeHTML(doctorName)}</strong>
              </div>
              <div class="patient-booking-confirm-grid">
                <div>
                  <span>التخصص</span>
                  <strong>${this.escapeHTML(professional.specialty || this.doctor.specialty || "—")}</strong>
                </div>
                <div>
                  <span>العيادة</span>
                  <strong>${this.escapeHTML(professional.clinic || this.doctor.clinic || "—")}</strong>
                </div>
                <div>
                  <span>الولاية</span>
                  <strong>${this.escapeHTML(professional.wilaya || this.doctor.wilaya || "—")}</strong>
                </div>
                <div>
                  <span>البلدية</span>
                  <strong>${this.escapeHTML(professional.commune || this.doctor.commune || "—")}</strong>
                </div>
              </div>
            </section>

            <!-- APPOINTMENT -->
            <section class="patient-booking-confirm-card glass">
              <div class="patient-booking-confirm-card__title">
                <span>تفاصيل الموعد</span>
                <strong>${this.escapeHTML(this.service.name)}</strong>
              </div>
              <div class="patient-booking-confirm-grid">
                <div>
                  <span>التاريخ</span>
                  <strong>${this.formatDate(this.selectedDate)}</strong>
                </div>
                <div>
                  <span>الساعة</span>
                  <strong>${this.escapeHTML(this.selectedTime)}</strong>
                </div>
                <div>
                  <span>المدة</span>
                  <strong>${this.service.duration} دقيقة</strong>
                </div>
                <div>
                  <span>السعر</span>
                  <strong>${this.formatPrice(this.service.price)} دج</strong>
                </div>
              </div>
            </section>

            <!-- PATIENT / BENEFICIARY -->
            <section class="patient-booking-confirm-card glass">
              <div class="patient-booking-confirm-card__title">
                <span>${this.isOtherPersonBooking() ? '👤 المستفيد' : 'المريض'}</span>
                <strong>${this.escapeHTML(patientName)}</strong>
              </div>

              ${this.isOtherPersonBooking() && this.beneficiary ? `
                <div class="patient-booking-confirm-grid" style="margin-top:8px;">
                  <div>
                    <span>تاريخ الميلاد</span>
                    <strong>${this.formatDate(this.beneficiary.birthDate)}</strong>
                  </div>
                  <div>
                    <span>رقم التعريف الوطني</span>
                    <strong dir="ltr">${this.escapeHTML(this.beneficiary.nationalId)}</strong>
                  </div>
                  ${this.beneficiary.phone ? `
                    <div>
                      <span>الهاتف</span>
                      <strong dir="ltr">${this.escapeHTML(this.beneficiary.phone)}</strong>
                    </div>
                  ` : ""}
                  <div>
                    <span>حجز بواسطة</span>
                    <strong>${this.escapeHTML(this.patient.fullName || this.patient.name || "المريض")}</strong>
                  </div>
                </div>
                <div style="margin-top:10px;padding:8px 12px;border-radius:11px;background:rgba(66,116,217,0.06);border:1px solid rgba(66,116,217,0.08);">
                  <span style="font-size:7px;color:#4274d9;font-weight:850;">🛡 حجز نيابي - تم التحقق من هوية المستفيد</span>
                </div>
              ` : `
                ${this.patient.phone ? `
                  <div class="patient-booking-confirm-line">
                    <span>الهاتف</span>
                    <strong>${this.escapeHTML(this.patient.phone)}</strong>
                  </div>
                ` : ""}
              `}
            </section>

            <!-- NOTES -->
            ${this.reason || this.notes ? `
              <section class="patient-booking-confirm-card glass">
                <div class="patient-booking-confirm-card__title">
                  <span>معلومات إضافية</span>
                  <strong>ملاحظات الزيارة</strong>
                </div>
                ${this.reason ? `
                  <div class="patient-booking-confirm-note">
                    <span>سبب الزيارة</span>
                    <p>${this.escapeHTML(this.reason)}</p>
                  </div>
                ` : ""}
                ${this.notes ? `
                  <div class="patient-booking-confirm-note">
                    <span>ملاحظات</span>
                    <p>${this.escapeHTML(this.notes)}</p>
                  </div>
                ` : ""}
              </section>
            ` : ""}

            <!-- STATUS -->
            <section class="patient-booking-confirm-status glass">
              <div class="patient-booking-confirm-status__icon">✓</div>
              <div>
                <strong>سيتم إرسال طلب الحجز للطبيب</strong>
                <p>حالة الطلب عند الإنشاء ستكون «قيد الانتظار» حتى يتم تأكيده.</p>
              </div>
            </section>

            <!-- ERROR -->
            <div id="patientBookingConfirmError" class="patient-booking-confirm-error" hidden></div>

            <!-- ACTIONS -->
            <div class="patient-booking-confirm-actions">
              <button id="patientBookingConfirmEdit" class="patient-booking-confirm-actions__secondary" type="button">تعديل الموعد</button>
              <button id="patientBookingConfirmSubmit" class="patient-booking-confirm-actions__primary" type="button">تأكيد الحجز</button>
            </div>

          </section>

          <!-- BOTTOM NAV - FIXED -->
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
              <button class="mobile-bottom-nav__item is-active" data-nav="booking" type="button">
                <span class="mobile-bottom-nav__icon">📅</span>
                <span>حجز</span>
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

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      const goBooking = function () {
        app.navigate("/patient/booking");
      };

      // BACK
      document.getElementById("patientBookingConfirmBack")?.addEventListener("click", goBooking);
      document.getElementById("patientBookingConfirmInvalidBack")?.addEventListener("click", goBooking);
      document.getElementById("patientBookingConfirmEdit")?.addEventListener("click", goBooking);

      // THEME
      document.getElementById("patientBookingConfirmTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // CONFIRM
      document.getElementById("patientBookingConfirmSubmit")?.addEventListener("click", function () {
        this.disabled = true;
        const success = PatientBookingConfirmScreen.confirm(app);
        if (!success) {
          this.disabled = false;
        }
      });

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
      document.querySelectorAll("[data-nav='booking']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/booking");
        });
      });
      document.querySelectorAll("[data-nav='profile']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/profile");
        });
      });
    }
  };

  window.PatientBookingConfirmScreen = PatientBookingConfirmScreen;

})();