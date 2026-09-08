/* =====================================================
   MON MÉDECIN
   DOCTOR ACCOUNT - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const DoctorAccountScreen = {


    /* ==================================================
       GET DOCTOR
       ================================================== */

    getDoctor: function (state) {
      if (state && state.doctor) {
        return state.doctor;
      }

      try {
        const saved = localStorage.getItem("monmedecin-doctor");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        }
      } catch (error) {
        console.warn("Mon Médecin: تعذر قراءة بيانات الطبيب.");
      }

      return {
        id: 1,
        firstName: "أحمد",
        lastName: "بن عمر",
        fullName: "د. أحمد بن عمر",
        phone: "0550000000",
        specialty: "أمراض القلب والأوعية الدموية",
        clinic: "عيادة النور",
        wilaya: "بسكرة",
        commune: "بسكرة",
        address: "",
        verified: true,
        active: true
      };
    },


    /* ==================================================
       GET SECRETARY
       ================================================== */

    getSecretary: function () {
      try {
        const saved = localStorage.getItem("monmedecin-doctor-secretary");
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch (error) {
        console.warn("تعذر قراءة بيانات السكرتارية.");
      }
      return null;
    },


    /* ==================================================
       GET SCHEDULE
       ================================================== */

    getSchedule: function () {
      try {
        const saved = localStorage.getItem("monmedecin-doctor-schedule");
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    },


    /* ==================================================
       ACTIVE DAYS
       ================================================== */

    getActiveDaysCount: function () {
      return this.getSchedule().filter(function (day) {
        return day.enabled === true;
      }).length;
    },


    /* ==================================================
       APPOINTMENTS COUNT
       ================================================== */

    getAppointmentsCount: function () {
      try {
        const saved = localStorage.getItem("monmedecin-doctor-appointments");
        const parsed = JSON.parse(saved || "[]");
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch (error) {
        return 0;
      }
    },


    /* ==================================================
       SAVE DOCTOR
       ================================================== */

    saveDoctor: function (doctor, app) {
      doctor.fullName = `د. ${doctor.firstName} ${doctor.lastName}`.trim();

      try {
        localStorage.setItem("monmedecin-doctor", JSON.stringify(doctor));
      } catch (error) {
        console.warn("تعذر حفظ بيانات الطبيب.");
      }

      let doctors = app.readJSON?.(localStorage, "monmedecin-doctors", []) || [];
      if (!Array.isArray(doctors)) doctors = [];

      const index = doctors.findIndex(function (d) {
        return String(d.id) === String(doctor.id);
      });

      if (index >= 0) {
        doctors[index] = { ...doctors[index], ...doctor, updatedAt: new Date().toISOString() };
      } else {
        doctors.push({ ...doctor, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }

      app.writeJSON?.(localStorage, "monmedecin-doctors", doctors);

      if (app && app.state) {
        app.state.doctor = doctor;
        if (app.state.user && app.state.user.role === "doctor") {
          app.state.user = doctor;
        }
      }
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state) {
      const doctor = this.getDoctor(state);
      const secretary = this.getSecretary();
      const isMobile = state.deviceMode === "mobile";

      const firstLetter = (doctor.firstName || doctor.fullName || "ط")
        .replace("د. ", "")
        .charAt(0);

      const activeDays = this.getActiveDaysCount();
      const appointmentsCount = this.getAppointmentsCount();

      return `
        <main class="doctor-account ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-account__orb doctor-account__orb--blue"></div>
          <div class="doctor-account__orb doctor-account__orb--purple"></div>

          <header class="doctor-account__header">
            <button class="doctor-account__back" id="doctorAccountBack" type="button">→</button>
            <div class="doctor-account__header-copy">
              <strong>حسابي</strong>
              <span>إعدادات الطبيب</span>
            </div>
            <button class="doctor-account__theme" id="doctorAccountTheme" type="button">◐</button>
          </header>

          <section class="doctor-account__container">

            <section class="doctor-account-profile glass">
              <div class="doctor-account-profile__avatar">${firstLetter}</div>
              <div class="doctor-account-profile__identity">
                <span>حساب الطبيب</span>
                <h1>${doctor.fullName}</h1>
                <p>${doctor.specialty}</p>
                <small>${doctor.clinic}</small>
              </div>
              <span class="doctor-account-profile__status ${doctor.verified ? "is-verified" : "is-pending"}">
                ${doctor.verified ? "موثّق" : "قيد المراجعة"}
              </span>
            </section>

            <section class="doctor-account-stats">
              <article class="doctor-account-stat glass">
                <span>◷</span>
                <div>
                  <small>الحجوزات</small>
                  <strong>${appointmentsCount}</strong>
                </div>
              </article>
              <article class="doctor-account-stat glass">
                <span>▦</span>
                <div>
                  <small>أيام العمل</small>
                  <strong>${activeDays}</strong>
                </div>
              </article>
              <article class="doctor-account-stat glass">
                <span>S</span>
                <div>
                  <small>السكرتارية</small>
                  <strong>${secretary ? (secretary.active ? "نشطة" : "متوقفة") : "غير مضافة"}</strong>
                </div>
              </article>
              <article class="doctor-account-stat glass">
                <span>${doctor.active ? "✓" : "×"}</span>
                <div>
                  <small>استقبال الحجوزات</small>
                  <strong>${doctor.active ? "مفتوح" : "متوقف"}</strong>
                </div>
              </article>
            </section>

            <section class="doctor-account-card glass">
              <div class="doctor-account-card__heading">
                <div>
                  <span>البيانات</span>
                  <h2>المعلومات الشخصية</h2>
                </div>
              </div>
              <div class="doctor-account-form-grid">
                <label class="doctor-account-field">
                  <span>الاسم</span>
                  <input id="doctorAccountFirstName" type="text" value="${doctor.firstName || ""}" maxlength="50">
                </label>
                <label class="doctor-account-field">
                  <span>اللقب</span>
                  <input id="doctorAccountLastName" type="text" value="${doctor.lastName || ""}" maxlength="50">
                </label>
                <label class="doctor-account-field">
                  <span>رقم الهاتف</span>
                  <input id="doctorAccountPhone" type="tel" inputmode="numeric" maxlength="10" dir="ltr" value="${doctor.phone || ""}">
                </label>
              </div>
            </section>

            <section class="doctor-account-card glass">
              <div class="doctor-account-card__heading">
                <div>
                  <span>المعلومات المهنية</span>
                  <h2>بيانات العيادة</h2>
                </div>
              </div>
              <div class="doctor-account-form-grid">
                <label class="doctor-account-field">
                  <span>التخصص</span>
                  <input id="doctorAccountSpecialty" type="text" value="${doctor.specialty || ""}" readonly>
                  <small>التخصص يُغيّر لاحقًا بعد التحقق من الإدارة.</small>
                </label>
                <label class="doctor-account-field">
                  <span>اسم العيادة</span>
                  <input id="doctorAccountClinic" type="text" maxlength="100" value="${doctor.clinic || ""}">
                </label>
                <label class="doctor-account-field">
                  <span>الولاية</span>
                  <input id="doctorAccountWilaya" type="text" value="${doctor.wilaya || ""}" readonly>
                </label>
                <label class="doctor-account-field">
                  <span>البلدية</span>
                  <input id="doctorAccountCommune" type="text" value="${doctor.commune || ""}" readonly>
                </label>
                <label class="doctor-account-field doctor-account-field--full">
                  <span>عنوان العيادة</span>
                  <input id="doctorAccountAddress" type="text" maxlength="150" placeholder="مثال: حي 500 مسكن، بسكرة" value="${doctor.address || ""}">
                </label>
              </div>
              <div class="doctor-account-form__message" id="doctorAccountFormMessage"></div>
              <button class="btn btn-primary doctor-account-save" id="doctorAccountSave" type="button">حفظ التعديلات</button>
            </section>

            <section class="doctor-account-card glass">
              <div class="doctor-account-card__heading">
                <div>
                  <span>إدارة الحساب</span>
                  <h2>العيادة والحساب</h2>
                </div>
              </div>
              <div class="doctor-account-actions">
                <button class="doctor-account-action" id="doctorAccountSchedule" type="button">
                  <span>▦</span>
                  <div>
                    <strong>جدول العمل</strong>
                    <small>إدارة أيام وساعات استقبال المرضى</small>
                  </div>
                  <b>←</b>
                </button>
                <button class="doctor-account-action" id="doctorAccountSecretary" type="button">
                  <span>S</span>
                  <div>
                    <strong>السكرتارية</strong>
                    <small>الحساب والصلاحيات</small>
                  </div>
                  <b>←</b>
                </button>
                <button class="doctor-account-action" id="doctorAccountPatients" type="button">
                  <span>◉</span>
                  <div>
                    <strong>المرضى</strong>
                    <small>سجل المرضى والحجوزات</small>
                  </div>
                  <b>←</b>
                </button>
              </div>
            </section>

            <section class="doctor-account-card glass">
              <div class="doctor-account-card__heading">
                <div>
                  <span>الحجوزات</span>
                  <h2>استقبال الحجوزات</h2>
                </div>
              </div>
              <label class="doctor-account-availability">
                <div>
                  <strong>استقبال حجوزات جديدة</strong>
                  <small>عند الإيقاف لن تظهر أوقات جديدة للحجز.</small>
                </div>
                <input id="doctorAccountAvailability" type="checkbox" ${doctor.active ? "checked" : ""}>
              </label>
            </section>

            <button class="doctor-account-logout" id="doctorAccountLogout" type="button">
              تسجيل الخروج من حساب الطبيب
            </button>

            <p class="doctor-account-version">Mon Médecin • Doctor • v1.0.0</p>

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
              <button class="mobile-bottom-nav__item is-active" data-nav="account" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>حسابي</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="profile" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>ملفي</span>
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
      const doctor = this.getDoctor(app.state);

      const back = document.getElementById("doctorAccountBack");
      const theme = document.getElementById("doctorAccountTheme");
      const firstName = document.getElementById("doctorAccountFirstName");
      const lastName = document.getElementById("doctorAccountLastName");
      const phone = document.getElementById("doctorAccountPhone");
      const clinic = document.getElementById("doctorAccountClinic");
      const address = document.getElementById("doctorAccountAddress");
      const save = document.getElementById("doctorAccountSave");
      const message = document.getElementById("doctorAccountFormMessage");
      const availability = document.getElementById("doctorAccountAvailability");
      const schedule = document.getElementById("doctorAccountSchedule");
      const secretary = document.getElementById("doctorAccountSecretary");
      const patients = document.getElementById("doctorAccountPatients");
      const logout = document.getElementById("doctorAccountLogout");

      back?.addEventListener("click", function () {
        app.navigate("/doctor/dashboard");
      });

      theme?.addEventListener("click", function () {
        app.toggleTheme();
      });

      phone?.addEventListener("input", function () {
        phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
      });

      save?.addEventListener("click", function () {
        message.textContent = "";

        const newFirstName = firstName.value.trim();
        const newLastName = lastName.value.trim();
        const newPhone = phone.value.trim();
        const newClinic = clinic.value.trim();
        const newAddress = address.value.trim();

        if (newFirstName.length < 2) {
          message.textContent = "أدخل الاسم بشكل صحيح.";
          return;
        }
        if (newLastName.length < 2) {
          message.textContent = "أدخل اللقب بشكل صحيح.";
          return;
        }
        if (newPhone && !/^(05|06|07)[0-9]{8}$/.test(newPhone)) {
          message.textContent = "رقم الهاتف غير صحيح.";
          return;
        }
        if (newClinic.length < 2) {
          message.textContent = "أدخل اسم العيادة.";
          return;
        }

        doctor.firstName = newFirstName;
        doctor.lastName = newLastName;
        doctor.phone = newPhone;
        doctor.clinic = newClinic;
        doctor.address = newAddress;

        DoctorAccountScreen.saveDoctor(doctor, app);

        message.textContent = "تم حفظ معلومات الحساب بنجاح.";

        setTimeout(function () {
          app.render();
        }, 500);
      });

      availability?.addEventListener("change", function () {
        doctor.active = availability.checked;
        DoctorAccountScreen.saveDoctor(doctor, app);
      });

      schedule?.addEventListener("click", function () {
        app.navigate("/doctor/schedule");
      });

      secretary?.addEventListener("click", function () {
        app.navigate("/doctor/secretary");
      });

      patients?.addEventListener("click", function () {
        app.navigate("/doctor/patients");
      });

      logout?.addEventListener("click", function () {
        if (typeof app.clearDoctorSession === "function") {
          app.clearDoctorSession();
        }
        app.navigate("/login");
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
      document.querySelectorAll("[data-nav='account']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/account");
        });
      });
      document.querySelectorAll("[data-nav='profile']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/profile");
        });
      });
    }

  };


  window.DoctorAccountScreen = DoctorAccountScreen;

})();