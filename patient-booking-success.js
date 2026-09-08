/* =====================================================
   MON MÉDECIN
   PATIENT BOOKING SUCCESS - FIXED (WITH BOOKING NUMBER)
   ===================================================== */

(function () {
  "use strict";

  const PatientBookingSuccessScreen = {
    booking: null,
    bookingNumber: null,
    queuePosition: null,
    queueTotal: null,

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
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /* ==================================================
       LOAD BOOKING
       ================================================== */

    loadBooking: function (state) {
      let booking = null;

      // 1. Get booking number from sessionStorage
      this.bookingNumber = sessionStorage.getItem('monmedecin-last-booking-number');

      // 2. App state
      if (state && state.lastBooking && typeof state.lastBooking === "object") {
        booking = state.lastBooking;
      }

      // 3. Session storage
      if (!booking) {
        booking = this.readJSON(sessionStorage, "monmedecin-last-booking");
      }

      // 4. Patient appointments fallback
      if (!booking) {
        const appointments = this.readJSON(localStorage, "monmedecin-patient-appointments");
        if (Array.isArray(appointments) && appointments.length) {
          booking = appointments[appointments.length - 1];
        }
      }

      // 5. Shared appointments fallback
      if (!booking) {
        const appointments = this.readJSON(localStorage, "monmedecin-doctor-appointments");
        if (Array.isArray(appointments) && appointments.length) {
          booking = appointments[appointments.length - 1];
        }
      }

      this.booking = booking && typeof booking === "object" ? booking : null;
      
      // Set booking number from booking object if not set
      if (this.booking && !this.bookingNumber) {
        this.bookingNumber = this.booking.bookingNumber;
      }

      // Calculate queue position if appointment is arrived or in progress
      if (this.booking) {
        this.queuePosition = this.getQueuePosition(this.booking);
        this.queueTotal = this.getQueueTotal(this.booking);
      }

      return this.booking;
    },

    /* ==================================================
       QUEUE HELPERS
       ================================================== */

    getQueuePosition: function (booking) {
      if (!booking || !booking.doctor_id) return null;
      if (booking.status !== "arrived" && booking.status !== "in_progress") return null;
      
      if (!window.MonMedecinQueueService) return null;
      
      const doctorId = booking.doctor_id || booking.doctorId;
      const patientId = booking.patient_id || booking.patientId;
      
      try {
        const queue = window.MonMedecinQueueService.getActiveQueue(doctorId);
        const position = queue.findIndex(function(item) {
          return String(item.patientId) === String(patientId);
        });
        
        return position >= 0 ? position + 1 : null;
      } catch (error) {
        console.warn("MON MÉDECIN: Error getting queue position", error);
        return null;
      }
    },

    getQueueTotal: function (booking) {
      if (!booking || !booking.doctor_id) return null;
      if (booking.status !== "arrived" && booking.status !== "in_progress") return null;
      
      if (!window.MonMedecinQueueService) return null;
      
      const doctorId = booking.doctor_id || booking.doctorId;
      
      try {
        const queue = window.MonMedecinQueueService.getActiveQueue(doctorId);
        return queue.length;
      } catch (error) {
        console.warn("MON MÉDECIN: Error getting queue total", error);
        return null;
      }
    },

    /* ==================================================
       IS OTHER PERSON BOOKING
       ================================================== */

    isOtherPersonBooking: function () {
      return this.booking && this.booking.is_proxy_booking === true;
    },

    /* ==================================================
       GET BENEFICIARY
       ================================================== */

    getBeneficiary: function () {
      if (!this.booking) return null;
      return this.booking.beneficiary || null;
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
       FORMAT DATE
       ================================================== */

    formatDate: function (value) {
      if (!value) return "—";
      const parts = String(value).split("-").map(Number);
      if (parts.length !== 3) return value;
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      if (Number.isNaN(date.getTime())) return value;
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
       STATUS
       ================================================== */

    getStatusLabel: function (status) {
      switch (String(status || "").toLowerCase()) {
        case "pending": return "قيد الانتظار";
        case "confirmed": return "مؤكد";
        case "arrived": return "تم الوصول";
        case "in_progress": return "جاري الفحص";
        case "completed": return "مكتمل";
        case "cancelled":
        case "canceled": return "ملغى";
        case "rejected": return "مرفوض";
        case "no_show":
        case "no-show": return "لم يحضر";
        default: return "قيد الانتظار";
      }
    },

    getStatusClass: function (status) {
      switch (String(status || "").toLowerCase()) {
        case "confirmed": return "is-confirmed";
        case "arrived": return "is-arrived";
        case "in_progress": return "is-progress";
        case "completed": return "is-completed";
        case "cancelled":
        case "canceled":
        case "rejected": return "is-cancelled";
        case "no_show":
        case "no-show": return "is-no-show";
        case "pending":
        default: return "is-pending";
      }
    },

    /* ==================================================
       PAYMENT STATUS
       ================================================== */

    getPaymentLabel: function (status) {
      switch (String(status || "").toLowerCase()) {
        case "paid": return "مدفوع";
        case "refunded": return "مسترجع";
        case "unpaid":
        default: return "غير مدفوع";
      }
    },

    /* ==================================================
       DISPLAY BOOKING ID - رقم الحجز المختصر
       ================================================== */

    getShortBookingId: function () {
      if (!this.bookingNumber) return "—";
      const value = String(this.bookingNumber);
      if (value.length <= 8) return value;
      return "..." + value.slice(-8);
    },

    /* ==================================================
       DISPLAY FULL BOOKING ID
       ================================================== */

    getFullBookingId: function () {
      if (!this.bookingNumber) return "—";
      return String(this.bookingNumber);
    },

    /* ==================================================
       COPY BOOKING NUMBER
       ================================================== */

    copyBookingNumber: function () {
      const bookingNumber = this.getFullBookingId();
      if (!bookingNumber || bookingNumber === "—") {
        this.showMessage("لا يوجد رقم حجز للنسخ.", "error");
        return;
      }

      if (navigator.clipboard) {
        navigator.clipboard.writeText(bookingNumber).then(() => {
          this.showMessage("✅ تم نسخ رقم الحجز", "success");
        }).catch(() => {
          this.fallbackCopy(bookingNumber);
        });
      } else {
        this.fallbackCopy(bookingNumber);
      }
    },

    fallbackCopy: function (text) {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      this.showMessage("✅ تم نسخ رقم الحجز", "success");
    },

    /* ==================================================
       SHOW MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("bookingSuccessMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = "booking-success-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3500);
    },

    /* ==================================================
       RENDER EMPTY
       ================================================== */

    renderEmpty: function (isMobile) {
      return `
        <main class="patient-booking-success ${isMobile ? "mobile-app-page" : "website-page"}">

          <header class="patient-booking-success__header">
            <button id="patientBookingSuccessEmptyBack" class="patient-booking-success__back" type="button">→</button>
            <div>
              <strong>نتيجة الحجز</strong>
              <span>Mon Médecin</span>
            </div>
            <div></div>
          </header>

          <section class="patient-booking-success__container">
            <div class="patient-booking-success-empty glass">
              <div class="patient-booking-success-empty__icon">!</div>
              <h1>لا توجد معلومات حجز</h1>
              <p>لم نعثر على حجز حديث لعرضه.</p>
              <button id="patientBookingSuccessEmptyHome" type="button">العودة للرئيسية</button>
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
      this.loadBooking(state);

      const isMobile = state.deviceMode === 'mobile';

      if (!this.booking) {
        return this.renderEmpty(isMobile);
      }

      const statusLabel = this.getStatusLabel(this.booking.status);
      const statusClass = this.getStatusClass(this.booking.status);
      const beneficiary = this.getBeneficiary();
      const shortId = this.getShortBookingId();
      const fullId = this.getFullBookingId();
      const queuePosition = this.queuePosition;
      const queueTotal = this.queueTotal;

      // Show queue only if status is "arrived" or "in_progress"
      const showQueue = queuePosition !== null && queueTotal !== null;

      return `
        <main class="patient-booking-success ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <!-- ORBS -->
          <div class="patient-booking-success__orb patient-booking-success__orb--blue"></div>
          <div class="patient-booking-success__orb patient-booking-success__orb--green"></div>

          <!-- HEADER -->
          <header class="patient-booking-success__header">
            <button id="patientBookingSuccessBack" class="patient-booking-success__back" type="button">→</button>
            <div class="patient-booking-success__header-copy">
              <strong>تم إرسال الحجز</strong>
              <span>Mon Médecin</span>
            </div>
            <button id="patientBookingSuccessTheme" class="patient-booking-success__theme" type="button">◐</button>
          </header>

          <!-- CONTENT -->
          <section class="patient-booking-success__container">

            <!-- SUCCESS HERO -->
            <section class="patient-booking-success-hero glass">
              <div class="patient-booking-success-hero__icon">✓</div>
              <span>تم إرسال طلبك بنجاح</span>
              <h1>موعدك في انتظار التأكيد</h1>
              <p>تم تسجيل طلب الحجز وسيظهر للطبيب والسكرتارية لمراجعته وتأكيده.</p>
              <div class="patient-booking-success-status ${statusClass}">${statusLabel}</div>
            </section>

            <!-- 🔑 BOOKING NUMBER - رقم الحجز -->
            <section class="patient-booking-success-code glass">
              <div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;">
                <span>📋 رقم الحجز</span>
                <strong style="font-size:18px;letter-spacing:0.5px;" dir="ltr">${fullId}</strong>
                <small style="font-size:6px;color:#99a5b3;direction:ltr;">احتفظ بهذا الرقم للاستعلام عن موعدك</small>
              </div>
              <button id="patientBookingSuccessCopyId" type="button" style="
                min-height:32px;
                padding:0 10px;
                border:1px solid rgba(66,116,217,0.12);
                border-radius:9px;
                background:rgba(66,116,217,0.06);
                color:#4274d9;
                font-family:inherit;
                font-size:7px;
                font-weight:900;
                cursor:pointer;
              ">📋 نسخ</button>
            </section>

            <!-- QUEUE POSITION - يظهر فقط إذا كان الموعد مؤكداً -->
            ${showQueue ? `
              <section class="patient-booking-success-queue glass" style="
                display:flex;
                align-items:center;
                gap:16px;
                margin-top:13px;
                padding:16px 18px;
                border-radius:19px;
                background:rgba(66,116,217,0.06);
                border:1px solid rgba(66,116,217,0.1);
              ">
                <div style="
                  flex-shrink:0;
                  width:56px;
                  height:56px;
                  display:grid;
                  place-items:center;
                  border-radius:16px;
                  background:linear-gradient(135deg,#4274d9,#345fa9);
                  color:#ffffff;
                  font-size:22px;
                  font-weight:950;
                  box-shadow:0 8px 20px rgba(66,116,217,0.2);
                ">
                  #${queuePosition}
                </div>
                <div>
                  <span style="display:block;color:#4274d9;font-size:8px;font-weight:900;">⏳ دورك في قائمة الانتظار</span>
                  <strong style="display:block;font-size:18px;color:#172b47;">#${queuePosition}</strong>
                  <small style="display:block;margin-top:3px;color:#8492a3;font-size:8px;">
                    من ${queueTotal} مريض في قائمة الانتظار
                  </small>
                </div>
              </section>
            ` : `
              <!-- رسالة إضافية إذا كان الموعد لا يزال قيد الانتظار -->
              <section class="patient-booking-success-queue glass" style="
                display:flex;
                align-items:center;
                gap:14px;
                margin-top:13px;
                padding:14px 16px;
                border-radius:19px;
                background:rgba(222,166,53,0.06);
                border:1px solid rgba(222,166,53,0.1);
              ">
                <div style="
                  flex-shrink:0;
                  width:48px;
                  height:48px;
                  display:grid;
                  place-items:center;
                  border-radius:14px;
                  background:rgba(222,166,53,0.1);
                  font-size:20px;
                ">
                  ⏳
                </div>
                <div>
                  <span style="display:block;color:#9d7426;font-size:8px;font-weight:900;">في انتظار تأكيد الطبيب</span>
                  <strong style="display:block;font-size:13px;color:#172b47;">سيتم تحديد دورك بعد التأكيد</strong>
                  <small style="display:block;margin-top:3px;color:#8492a3;font-size:8px;">
                    عند تأكيد موعدك، سيظهر رقمك في قائمة الانتظار
                  </small>
                </div>
              </section>
            `}

            <!-- APPOINTMENT INFO -->
            <section class="patient-booking-success-card glass">
              <div class="patient-booking-success-card__heading">
                <span>تفاصيل الموعد</span>
                <strong>${this.escapeHTML(this.booking.service_name || "استشارة طبية")}</strong>
              </div>
              <div class="patient-booking-success-grid">
                <div>
                  <span>التاريخ</span>
                  <strong>${this.formatDate(this.booking.date)}</strong>
                </div>
                <div>
                  <span>الساعة</span>
                  <strong>${this.escapeHTML(this.booking.time || "—")}</strong>
                </div>
                <div>
                  <span>المدة</span>
                  <strong>${Number(this.booking.duration) || 30} دقيقة</strong>
                </div>
                <div>
                  <span>السعر</span>
                  <strong>${this.formatPrice(this.booking.price)} دج</strong>
                </div>
              </div>
            </section>

            <!-- DOCTOR -->
            <section class="patient-booking-success-card glass">
              <div class="patient-booking-success-card__heading">
                <span>الطبيب</span>
                <strong>${this.escapeHTML(this.booking.doctor_name || "طبيب")}</strong>
              </div>
              <div class="patient-booking-success-grid">
                <div>
                  <span>التخصص</span>
                  <strong>${this.escapeHTML(this.booking.specialty || "—")}</strong>
                </div>
                <div>
                  <span>العيادة</span>
                  <strong>${this.escapeHTML(this.booking.clinic || "—")}</strong>
                </div>
                <div>
                  <span>الولاية</span>
                  <strong>${this.escapeHTML(this.booking.wilaya || "—")}</strong>
                </div>
                <div>
                  <span>البلدية</span>
                  <strong>${this.escapeHTML(this.booking.commune || "—")}</strong>
                </div>
              </div>
            </section>

            <!-- PATIENT / BENEFICIARY -->
            <section class="patient-booking-success-card glass">
              <div class="patient-booking-success-card__heading">
                <span>${this.isOtherPersonBooking() ? '👤 المستفيد' : 'المريض'}</span>
                <strong>${this.escapeHTML(this.booking.patient_name || "مريض")}</strong>
              </div>

              ${this.isOtherPersonBooking() && beneficiary ? `
                <div class="patient-booking-success-grid" style="margin-top:8px;">
                  <div>
                    <span>تاريخ الميلاد</span>
                    <strong>${this.formatDate(beneficiary.birthDate)}</strong>
                  </div>
                  <div>
                    <span>رقم التعريف الوطني</span>
                    <strong dir="ltr">${this.escapeHTML(beneficiary.nationalId)}</strong>
                  </div>
                  ${beneficiary.phone ? `
                    <div>
                      <span>الهاتف</span>
                      <strong dir="ltr">${this.escapeHTML(beneficiary.phone)}</strong>
                    </div>
                  ` : ""}
                  <div>
                    <span>حجز بواسطة</span>
                    <strong>${this.escapeHTML(this.booking.created_by_name || "المريض")}</strong>
                  </div>
                </div>
                <div style="margin-top:10px;padding:8px 12px;border-radius:11px;background:rgba(66,116,217,0.06);border:1px solid rgba(66,116,217,0.08);">
                  <span style="font-size:7px;color:#4274d9;font-weight:850;">🛡 حجز نيابي - تم التحقق من هوية المستفيد</span>
                </div>
              ` : `
                ${this.booking.patient_phone ? `
                  <div class="patient-booking-success-line">
                    <span>الهاتف</span>
                    <strong>${this.escapeHTML(this.booking.patient_phone)}</strong>
                  </div>
                ` : ""}
              `}
            </section>

            <!-- STATUS -->
            <section class="patient-booking-success-card glass">
              <div class="patient-booking-success-card__heading">
                <span>الحالة</span>
                <strong>معلومات الطلب</strong>
              </div>
              <div class="patient-booking-success-grid">
                <div>
                  <span>حالة الحجز</span>
                  <strong>${statusLabel}</strong>
                </div>
                <div>
                  <span>الدفع</span>
                  <strong>${this.getPaymentLabel(this.booking.payment_status)}</strong>
                </div>
                <div>
                  <span>مصدر الحجز</span>
                  <strong>${this.booking.source === "proxy" ? "حجز نيابي" : "المريض"}</strong>
                </div>
                ${this.booking.created_by_name ? `
                  <div>
                    <span>تم الحجز بواسطة</span>
                    <strong>${this.escapeHTML(this.booking.created_by_name)}</strong>
                  </div>
                ` : ""}
              </div>
            </section>

            <!-- NOTES -->
            ${this.booking.reason || this.booking.notes ? `
              <section class="patient-booking-success-card glass">
                <div class="patient-booking-success-card__heading">
                  <span>معلومات الزيارة</span>
                  <strong>الملاحظات</strong>
                </div>
                ${this.booking.reason ? `
                  <div class="patient-booking-success-note">
                    <span>سبب الزيارة</span>
                    <p>${this.escapeHTML(this.booking.reason)}</p>
                  </div>
                ` : ""}
                ${this.booking.notes ? `
                  <div class="patient-booking-success-note">
                    <span>ملاحظات</span>
                    <p>${this.escapeHTML(this.booking.notes)}</p>
                  </div>
                ` : ""}
              </section>
            ` : ""}

            <!-- MESSAGE -->
            <section class="patient-booking-success-message glass">
              <div class="patient-booking-success-message__icon">i</div>
              <div>
                <strong>ماذا يحدث الآن؟</strong>
                <p>سيقوم الطبيب أو السكرتارية بمراجعة طلب الموعد. ستجد حالة الحجز داخل صفحة «مواعيدي».</p>
              </div>
            </section>

            <!-- ACTIONS -->
            <div class="patient-booking-success-actions">
              <button id="patientBookingSuccessAppointments" class="patient-booking-success-actions__primary" type="button">عرض مواعيدي</button>
              <button id="patientBookingSuccessHome" class="patient-booking-success-actions__secondary" type="button">العودة للرئيسية</button>
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
       INIT
       ================================================== */

    init: function (app) {
      // BACK
      document.getElementById("patientBookingSuccessBack")?.addEventListener("click", function () {
        app.navigate("/patient/appointments");
      });

      document.getElementById("patientBookingSuccessEmptyBack")?.addEventListener("click", function () {
        app.navigate("/patient/home");
      });

      document.getElementById("patientBookingSuccessEmptyHome")?.addEventListener("click", function () {
        app.navigate("/patient/home");
      });

      // THEME
      document.getElementById("patientBookingSuccessTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // APPOINTMENTS
      document.getElementById("patientBookingSuccessAppointments")?.addEventListener("click", function () {
        app.navigate("/patient/appointments");
      });

      // HOME
      document.getElementById("patientBookingSuccessHome")?.addEventListener("click", function () {
        app.navigate("/patient/home");
      });

      // COPY ID
      document.getElementById("patientBookingSuccessCopyId")?.addEventListener("click", function () {
        PatientBookingSuccessScreen.copyBookingNumber();
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

  window.PatientBookingSuccessScreen = PatientBookingSuccessScreen;

})();