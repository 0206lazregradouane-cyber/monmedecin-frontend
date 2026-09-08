/* =====================================================
   MON MÉDECIN
   PATIENT BOOKING OTHER - حجز لشخص آخر
   =====================================================

   FEATURES:
   - إدخال بيانات المستفيد (الاسم، اللقب، تاريخ الميلاد، رقم التعريف الوطني - اختياري)
   - التحقق من صحة البيانات (رقابة متشددة)
   - حفظ بيانات المستفيد مؤقتاً للاستخدام في الحجز
   - الانتقال إلى شاشة الحجز مع بيانات المستفيد
   ===================================================== */

(function () {
  "use strict";

  const PatientBookingOtherScreen = {
    /* ==================================================
       STATE
       ================================================== */

    beneficiary: {
      firstName: "",
      lastName: "",
      birthDate: "",
      nationalId: "",
      phone: "",
    },

    verified: false,
    loading: false,
    messageTimer: null,

    /* ==================================================
       STORAGE HELPERS
       ================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN: Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN: Cannot write", key, error);
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
       GET PATIENT
       ================================================== */

    getPatient: function (app) {
      return app.state.patient || app.state.user || null;
    },

    /* ==================================================
       GET PATIENT NAME
       ================================================== */

    getPatientName: function (app) {
      const patient = this.getPatient(app);
      return patient?.fullName || patient?.name || "المريض";
    },

    /* ==================================================
       VALIDATE NATIONAL ID (رقم التعريف الوطني) - اختياري
       ================================================== */

    validateNationalId: function (value) {
      // إذا كان الحقل فارغاً، يعتبر صحيحاً (اختياري)
      if (!value || value.trim().length === 0) {
        return { valid: true, message: "اختياري" };
      }

      // التحقق من أن الرقم يتكون من 12 رقم
      const clean = String(value || "").replace(/\s/g, "");
      if (!/^\d{12}$/.test(clean)) {
        return { valid: false, message: "رقم التعريف الوطني يجب أن يتكون من 12 رقم." };
      }

      // التحقق من أن الرقم يبدأ بـ 1 أو 2 (للأفراد)
      const firstDigit = clean.charAt(0);
      if (!["1", "2"].includes(firstDigit)) {
        return { valid: false, message: "رقم التعريف الوطني غير صحيح." };
      }

      // التحقق من صحة الرقم باستخدام خوارزمية Luhn
      const isValid = this.luhnCheck(clean);
      if (!isValid) {
        return { valid: false, message: "رقم التعريف الوطني غير صالح." };
      }

      return { valid: true };
    },

    /* ==================================================
       LUHN ALGORITHM (للتحقق من صحة الأرقام الوطنية)
       ================================================== */

    luhnCheck: function (value) {
      let sum = 0;
      let alternate = false;

      for (let i = value.length - 1; i >= 0; i--) {
        let n = parseInt(value.charAt(i), 10);
        if (alternate) {
          n *= 2;
          if (n > 9) {
            n = (n % 10) + 1;
          }
        }
        sum += n;
        alternate = !alternate;
      }

      return (sum % 10) === 0;
    },

    /* ==================================================
       VALIDATE FORM
       ================================================== */

    validateForm: function (data) {
      const errors = {};

      // الاسم الأول - إلزامي
      if (!data.firstName || data.firstName.trim().length < 2) {
        errors.firstName = "أدخل الاسم الأول (حرفين على الأقل).";
      } else if (!/^[\u0600-\u06FF\s]+$/.test(data.firstName.trim())) {
        errors.firstName = "الاسم يجب أن يكون بالأحرف العربية فقط.";
      }

      // اللقب - إلزامي
      if (!data.lastName || data.lastName.trim().length < 2) {
        errors.lastName = "أدخل اللقب (حرفين على الأقل).";
      } else if (!/^[\u0600-\u06FF\s]+$/.test(data.lastName.trim())) {
        errors.lastName = "اللقب يجب أن يكون بالأحرف العربية فقط.";
      }

      // تاريخ الميلاد - إلزامي
      if (!data.birthDate) {
        errors.birthDate = "أدخل تاريخ الميلاد.";
      } else {
        const birthDate = new Date(data.birthDate);
        const now = new Date();
        const age = now.getFullYear() - birthDate.getFullYear();

        if (birthDate > now) {
          errors.birthDate = "تاريخ الميلاد لا يمكن أن يكون في المستقبل.";
        } else if (age < 0 || age > 120) {
          errors.birthDate = "عمر غير صحيح (يجب أن يكون بين 0 و 120 سنة).";
        }
      }

      // رقم التعريف الوطني - اختياري (التحقق فقط إذا تم إدخاله)
      if (data.nationalId && data.nationalId.trim().length > 0) {
        const nationalIdResult = this.validateNationalId(data.nationalId);
        if (!nationalIdResult.valid) {
          errors.nationalId = nationalIdResult.message;
        }
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors: errors,
      };
    },

    /* ==================================================
       GET FORM DATA
       ================================================== */

    getFormData: function () {
      return {
        firstName: String(document.getElementById("bookingOtherFirstName")?.value || "").trim(),
        lastName: String(document.getElementById("bookingOtherLastName")?.value || "").trim(),
        birthDate: String(document.getElementById("bookingOtherBirthDate")?.value || "").trim(),
        nationalId: String(document.getElementById("bookingOtherNationalId")?.value || "")
          .trim()
          .replace(/\s/g, ""),
        phone: String(document.getElementById("bookingOtherPhone")?.value || "").trim(),
      };
    },

    /* ==================================================
       SHOW ERRORS
       ================================================== */

    showErrors: function (errors) {
      const fieldMap = {
        firstName: "bookingOtherFirstNameError",
        lastName: "bookingOtherLastNameError",
        birthDate: "bookingOtherBirthDateError",
        nationalId: "bookingOtherNationalIdError",
      };

      Object.keys(fieldMap).forEach(function (key) {
        const element = document.getElementById(fieldMap[key]);
        if (element) {
          element.textContent = errors[key] || "";
        }
      });
    },

    /* ==================================================
       CLEAR ERRORS
       ================================================== */

    clearErrors: function () {
      document.querySelectorAll(".booking-other-error").forEach(function (element) {
        element.textContent = "";
      });
    },

    /* ==================================================
       SHOW MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("bookingOtherMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;

      element.classList.remove("is-success", "is-error", "is-info");
      element.classList.add(
        type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error"
      );

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 4000);
    },

    /* ==================================================
       SET LOADING
       ================================================== */

    setLoading: function (loading) {
      this.loading = Boolean(loading);
      const button = document.getElementById("bookingOtherSubmit");
      if (button) {
        button.disabled = this.loading;
        button.textContent = this.loading ? "⏳ جاري التحقق..." : "تأكيد بيانات المستفيد";
      }
    },

    /* ==================================================
       SAVE BENEFICIARY
       ================================================== */

    saveBeneficiary: function (data, app) {
      const patient = this.getPatient(app);

      // حفظ بيانات المستفيد في sessionStorage للاستخدام في الحجز
      const beneficiary = {
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: data.firstName + " " + data.lastName,
        birthDate: data.birthDate,
        nationalId: data.nationalId || "",
        phone: data.phone || "",
        isOtherPerson: true,
        bookedBy: patient?.id || "unknown",
        bookedByName: this.getPatientName(app),
        verifiedAt: new Date().toISOString(),
        hasNationalId: data.nationalId && data.nationalId.trim().length > 0,
      };

      this.writeJSON(sessionStorage, "monmedecin-booking-beneficiary", beneficiary);

      // حفظ أيضاً في localStorage كسجل للحجوزات النيابية
      let proxyBookings = this.readJSON(localStorage, "monmedecin-proxy-bookings", []);
      if (!Array.isArray(proxyBookings)) {
        proxyBookings = [];
      }

      proxyBookings.push({
        ...beneficiary,
        proxyBookingId: "PROXY-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
        createdAt: new Date().toISOString(),
      });

      this.writeJSON(localStorage, "monmedecin-proxy-bookings", proxyBookings);

      this.beneficiary = beneficiary;
      this.verified = true;

      return beneficiary;
    },

    /* ==================================================
       PROCEED TO BOOKING
       ================================================== */

    proceedToBooking: function (app) {
      // الانتقال إلى شاشة الحجز مع بيانات المستفيد
      app.navigate("/patient/booking");
    },

    /* ==================================================
       CHECK FOR EXISTING BENEFICIARY
       ================================================== */

    checkExistingBeneficiary: function (nationalId) {
      if (!nationalId || nationalId.trim().length === 0) {
        return false;
      }

      const proxyBookings = this.readJSON(localStorage, "monmedecin-proxy-bookings", []);
      if (!Array.isArray(proxyBookings)) return false;

      // البحث عن مستفيد بنفس رقم التعريف الوطني
      const existing = proxyBookings.find(function (booking) {
        return booking.nationalId === nationalId;
      });

      return existing ? existing : false;
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      const patient = this.getPatient(app);
      const patientName = this.getPatientName(app);
      const isMobile = state.deviceMode === "mobile";

      // التحقق من وجود مريض مسجل الدخول
      if (!patient) {
        return `
          <main class="patient-booking-other ${isMobile ? "mobile-app-page" : "website-page"}">
            <section class="patient-booking-other__container">
              <div class="patient-booking-other-empty glass" style="padding:40px 20px;border-radius:22px;text-align:center;">
                <span style="font-size:48px;display:block;margin-bottom:16px;">🔒</span>
                <h2 style="color:#172b47;font-size:18px;font-weight:950;">يجب تسجيل الدخول أولاً</h2>
                <p style="color:#8492a3;font-size:10px;line-height:1.7;margin:8px 0 16px;">
                  لحجز موعد لشخص آخر، يجب أن تكون مسجلاً كمتلقي رعاية.
                </p>
                <button id="bookingOtherGoLogin" type="button" style="min-height:42px;padding:0 16px;border:0;border-radius:12px;background:#4274d9;color:#fff;font-weight:900;cursor:pointer;font-size:8px;">
                  تسجيل الدخول
                </button>
              </div>
            </section>
          </main>
        `;
      }

      return `
        <main class="patient-booking-other ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <!-- BACKGROUND -->
          <div class="patient-booking-other__orb patient-booking-other__orb--blue"></div>
          <div class="patient-booking-other__orb patient-booking-other__orb--cyan"></div>

          <!-- HEADER -->
          <header class="patient-booking-other__header">
            <button id="bookingOtherBack" class="patient-booking-other__back" type="button">→</button>
            <div class="patient-booking-other__header-copy">
              <strong>حجز لشخص آخر</strong>
              <span>${this.escapeHTML(patientName)}</span>
            </div>
            <button id="bookingOtherTheme" class="patient-booking-other__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <!-- CONTENT -->
          <section class="patient-booking-other__container">

            <!-- HERO -->
            <section class="patient-booking-other__hero">
              <span>👤 حجز نيابي</span>
              <h1>حجز موعد لشخص آخر</h1>
              <p>أدخل بيانات الشخص الذي تريد حجز الموعد له. سيتم حفظ هذه البيانات في سجل الحجوزات النيابية.</p>
            </section>

            <!-- SECURITY NOTICE -->
            <section class="patient-booking-other-notice glass">
              <span class="patient-booking-other-notice__icon">🛡</span>
              <div>
                <strong>حجز برقابة متشددة</strong>
                <p>هذه الخدمة مسجلة باسمك كمتلقي رعاية. يتم تسجيل كل عملية حجز مع بيانات المستفيد للتحقق من هويته.</p>
              </div>
            </section>

            <!-- CARD -->
            <section class="patient-booking-other-card glass">
              <div class="patient-booking-other-card__head">
                <div>
                  <span>بيانات المستفيد</span>
                  <h2>المعلومات الشخصية</h2>
                </div>
                <span class="patient-booking-other-card__icon">📋</span>
              </div>

              <!-- MESSAGE -->
              <div id="bookingOtherMessage" class="patient-booking-other-message" hidden></div>

              <!-- FORM -->
              <form id="bookingOtherForm" class="patient-booking-other-form" novalidate>

                <!-- FIRST NAME -->
                <label class="patient-booking-other-field">
                  <span>الاسم الأول *</span>
                  <input
                    id="bookingOtherFirstName"
                    type="text"
                    maxlength="50"
                    placeholder="مثال: محمد"
                    autocomplete="given-name"
                    dir="rtl"
                  />
                  <small id="bookingOtherFirstNameError" class="booking-other-error" style="display:block;min-height:14px;margin-top:4px;color:#b34d4d;font-size:7px;font-weight:800;"></small>
                </label>

                <!-- LAST NAME -->
                <label class="patient-booking-other-field">
                  <span>اللقب *</span>
                  <input
                    id="bookingOtherLastName"
                    type="text"
                    maxlength="50"
                    placeholder="مثال: بن علي"
                    autocomplete="family-name"
                    dir="rtl"
                  />
                  <small id="bookingOtherLastNameError" class="booking-other-error" style="display:block;min-height:14px;margin-top:4px;color:#b34d4d;font-size:7px;font-weight:800;"></small>
                </label>

                <!-- BIRTH DATE -->
                <label class="patient-booking-other-field">
                  <span>تاريخ الميلاد *</span>
                  <div class="patient-booking-other-identifier">
                    <span>📅</span>
                    <input
                      id="bookingOtherBirthDate"
                      type="date"
                      autocomplete="bday"
                      max="${this.getMaxDate()}"
                    />
                  </div>
                  <small id="bookingOtherBirthDateError" class="booking-other-error" style="display:block;min-height:14px;margin-top:4px;color:#b34d4d;font-size:7px;font-weight:800;"></small>
                </label>

                <!-- NATIONAL ID (اختياري) -->
                <label class="patient-booking-other-field">
                  <span>رقم التعريف الوطني (اختياري)</span>
                  <div class="patient-booking-other-identifier">
                    <span>🆔</span>
                    <input
                      id="bookingOtherNationalId"
                      type="text"
                      maxlength="12"
                      placeholder="12 رقم (اختياري)"
                      inputmode="numeric"
                      dir="ltr"
                    />
                  </div>
                  <small id="bookingOtherNationalIdError" class="booking-other-error" style="display:block;min-height:14px;margin-top:4px;color:#b34d4d;font-size:7px;font-weight:800;"></small>
                  <span class="helper">اختياري - يتم التحقق من صحة الرقم إذا تم إدخاله.</span>
                </label>

                <!-- PHONE (اختياري) -->
                <label class="patient-booking-other-field patient-booking-other-field--full">
                  <span>رقم الهاتف (اختياري)</span>
                  <div class="patient-booking-other-identifier">
                    <span>📱</span>
                    <input
                      id="bookingOtherPhone"
                      type="tel"
                      maxlength="10"
                      placeholder="0550 12 34 56"
                      inputmode="tel"
                      dir="ltr"
                    />
                  </div>
                  <span class="helper">رقم هاتف المستفيد للتواصل (اختياري).</span>
                </label>

              </form>

              <!-- ACTIONS -->
              <div class="patient-booking-other-actions">
                <button id="bookingOtherCancel" class="patient-booking-other-actions__secondary" type="button">
                  إلغاء
                </button>
                <button id="bookingOtherSubmit" class="patient-booking-other-actions__primary" type="button">
                  تأكيد بيانات المستفيد
                </button>
              </div>

            </section>

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
       GET MAX DATE
       ================================================== */

    getMaxDate: function () {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      console.log("MON MÉDECIN: PatientBookingOtherScreen init");

      // BACK
      document.getElementById("bookingOtherBack")?.addEventListener("click", function () {
        app.navigate("/patient/booking");
      });

      // THEME
      document.getElementById("bookingOtherTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // CANCEL
      document.getElementById("bookingOtherCancel")?.addEventListener("click", function () {
        app.navigate("/patient/booking");
      });

      // GO LOGIN
      document.getElementById("bookingOtherGoLogin")?.addEventListener("click", function () {
        app.navigate("/login");
      });

      // NATIONAL ID - Only numbers
      document.getElementById("bookingOtherNationalId")?.addEventListener("input", function (event) {
        this.value = this.value.replace(/\D/g, "").slice(0, 12);
      });

      // PHONE - Only numbers
      document.getElementById("bookingOtherPhone")?.addEventListener("input", function (event) {
        this.value = this.value.replace(/\D/g, "").slice(0, 10);
      });

      // SUBMIT
      document.getElementById("bookingOtherSubmit")?.addEventListener("click", function () {
        if (PatientBookingOtherScreen.loading) return;

        PatientBookingOtherScreen.clearErrors();

        const data = PatientBookingOtherScreen.getFormData();

        // Validation
        const validation = PatientBookingOtherScreen.validateForm(data);

        if (!validation.valid) {
          PatientBookingOtherScreen.showErrors(validation.errors);
          PatientBookingOtherScreen.showMessage("يرجى تصحيح الأخطاء في النموذج.", "error");
          return;
        }

        // Check if national ID exists (only if provided)
        let existing = null;
        if (data.nationalId && data.nationalId.trim().length > 0) {
          existing = PatientBookingOtherScreen.checkExistingBeneficiary(data.nationalId);
          if (existing) {
            const confirmExisting = window.confirm(
              "⚠️ يوجد سجل سابق لهذا رقم التعريف الوطني.\n" +
              "الاسم: " + existing.firstName + " " + existing.lastName + "\n" +
              "تاريخ الميلاد: " + existing.birthDate + "\n\n" +
              "هل تريد استخدام هذه البيانات؟"
            );

            if (confirmExisting) {
              // Use existing data
              data.firstName = existing.firstName;
              data.lastName = existing.lastName;
              data.birthDate = existing.birthDate;
              data.phone = existing.phone || data.phone;
              data.nationalId = existing.nationalId;
            }
          }
        }

        // Save beneficiary
        PatientBookingOtherScreen.setLoading(true);

        setTimeout(function () {
          const beneficiary = PatientBookingOtherScreen.saveBeneficiary(data, app);

          PatientBookingOtherScreen.setLoading(false);

          if (beneficiary) {
            PatientBookingOtherScreen.showMessage(
              "✅ تم حفظ بيانات المستفيد بنجاح. سيتم استخدامها في الحجز.",
              "success"
            );

            // Proceed to booking
            setTimeout(function () {
              PatientBookingOtherScreen.proceedToBooking(app);
            }, 600);
          } else {
            PatientBookingOtherScreen.showMessage(
              "❌ حدث خطأ أثناء حفظ بيانات المستفيد.",
              "error"
            );
          }
        }, 300);
      });

      // ENTER KEY
      document.getElementById("bookingOtherFirstName")?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          document.getElementById("bookingOtherLastName")?.focus();
          event.preventDefault();
        }
      });

      document.getElementById("bookingOtherLastName")?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          document.getElementById("bookingOtherBirthDate")?.focus();
          event.preventDefault();
        }
      });

      document.getElementById("bookingOtherBirthDate")?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          document.getElementById("bookingOtherNationalId")?.focus();
          event.preventDefault();
        }
      });

      document.getElementById("bookingOtherNationalId")?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          document.getElementById("bookingOtherSubmit")?.click();
          event.preventDefault();
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
    },
  };

  /* ====================================================
     EXPOSE
     ==================================================== */

  window.PatientBookingOtherScreen = PatientBookingOtherScreen;

})();