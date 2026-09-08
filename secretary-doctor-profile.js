/* =====================================================
   MON MÉDECIN
   SECRETARY DOCTOR PROFILE - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const SecretaryDoctorProfileScreen = {


    /* ==================================================
       STATE
       ================================================== */

    secretary: null,

    doctor: null,

    doctorId: null,

    professional: null,

    selectedWilaya: "",

    messageTimer: null,


    /* ==================================================
       MEDICAL SPECIALTIES
       ================================================== */

    specialties: [
      "الطب العام", "طب الأسرة", "الطب الباطني", "أمراض القلب",
      "أمراض القلب والأوعية الدموية", "طب الأوعية الدموية",
      "أمراض الصدر والجهاز التنفسي", "أمراض الرئة",
      "أمراض الجهاز الهضمي", "أمراض الكبد",
      "أمراض الغدد الصماء", "السكري وأمراض الاستقلاب",
      "أمراض الكلى", "أمراض الروماتيزم", "أمراض الدم",
      "الأمراض المعدية", "أمراض الحساسية", "المناعة الطبية",
      "طب الأطفال", "طب حديثي الولادة",
      "أمراض النساء والتوليد", "طب الأعصاب", "جراحة الأعصاب",
      "الطب النفسي", "الطب النفسي للأطفال والمراهقين",
      "الأمراض الجلدية", "الأمراض الجلدية والتناسلية",
      "طب وجراحة العيون", "الأنف والأذن والحنجرة",
      "جراحة المسالك البولية", "الجراحة العامة",
      "جراحة العظام والرضوض", "جراحة الرضوض",
      "جراحة القلب", "جراحة القلب والأوعية الدموية",
      "جراحة الصدر", "جراحة الأوعية الدموية",
      "جراحة الأطفال", "جراحة التجميل والترميم",
      "جراحة الوجه والفكين", "التخدير والإنعاش",
      "الإنعاش الطبي", "طب الاستعجالات", "طب الأورام",
      "العلاج الإشعاعي للأورام", "الأشعة والتصوير الطبي",
      "التصوير الطبي", "الطب النووي",
      "التشريح وعلم الخلايا المرضية", "البيولوجيا الطبية",
      "الكيمياء الحيوية الطبية", "الأحياء الدقيقة الطبية",
      "الطفيليات الطبية", "المناعة الطبية والمخبرية",
      "الطب الفيزيائي وإعادة التأهيل", "طب العمل",
      "الطب الشرعي", "علم الأوبئة والطب الوقائي",
      "طب الشيخوخة", "الطب الرياضي", "التغذية الطبية",
      "طب وجراحة الأسنان", "تقويم الأسنان",
      "أمراض وجراحة اللثة", "جراحة الفم",
      "تركيبات الأسنان", "علاج وترميم الأسنان",
      "طب أسنان الأطفال"
    ],


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
       DEFAULT SECRETARY
       ================================================== */

    getDefaultSecretary: function () {
      return {
        id: "SEC-001",
        doctorId: 1,
        doctor_id: 1,
        active: true,
        permissions: {
          viewAppointments: true,
          confirmAppointments: true,
          cancelAppointments: false,
          confirmArrival: true,
          markNoShow: false,
          viewPatients: true,
          manageSchedule: false,
          editDoctorProfile: false
        }
      };
    },


    /* ==================================================
       LOAD SECRETARY
       ================================================== */

    loadSecretary: function (state) {
      let secretary = null;

      if (state && state.secretary && typeof state.secretary === "object") {
        secretary = state.secretary;
      }

      if (!secretary) {
        secretary = this.readJSON(sessionStorage, "monmedecin-secretary-session", null);
      }

      if (!secretary && state && state.user && state.user.role === "secretary") {
        secretary = state.user;
      }

      if (!secretary) {
        secretary = this.readJSON(localStorage, "monmedecin-doctor-secretary", null);
      }

      const defaults = this.getDefaultSecretary();

      this.secretary = {
        ...defaults,
        ...(secretary && typeof secretary === "object" ? secretary : {}),
        permissions: {
          ...defaults.permissions,
          ...(secretary && secretary.permissions ? secretary.permissions : {})
        }
      };

      return this.secretary;
    },


    /* ==================================================
       PERMISSION
       ================================================== */

    canEditDoctorProfile: function () {
      return this.secretary &&
             this.secretary.active !== false &&
             this.secretary.permissions &&
             this.secretary.permissions.editDoctorProfile === true;
    },


    /* ==================================================
       DOCTOR ID
       ================================================== */

    getDoctorId: function () {
      if (this.secretary && this.secretary.doctorId !== undefined && this.secretary.doctorId !== null) {
        return this.secretary.doctorId;
      }
      if (this.secretary && this.secretary.doctor_id !== undefined && this.secretary.doctor_id !== null) {
        return this.secretary.doctor_id;
      }
      return 1;
    },


    /* ==================================================
       LOAD DOCTOR
       ================================================== */

    loadDoctor: function () {
      this.doctorId = this.getDoctorId();

      let doctor = null;

      const doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (Array.isArray(doctors)) {
        doctor = doctors.find(function (item) {
          return String(item.id) === String(this.doctorId);
        }, this) || null;
      }

      if (!doctor) {
        const currentDoctor = this.readJSON(localStorage, "monmedecin-doctor", null);
        if (currentDoctor && String(currentDoctor.id) === String(this.doctorId)) {
          doctor = currentDoctor;
        }
      }

      if (!doctor) {
        doctor = {
          id: this.doctorId,
          fullName: "الطبيب",
          specialty: "الطب العام",
          clinic: "",
          wilaya: "",
          commune: ""
        };
      }

      this.doctor = doctor;
      return doctor;
    },


    /* ==================================================
       DEFAULT PROFESSIONAL
       ================================================== */

    getDefaultProfessional: function () {
      return {
        doctorId: this.doctorId,
        publicVisible: true,
        title: this.doctor.fullName || "الطبيب",
        specialty: this.doctor.specialty || "الطب العام",
        clinic: this.doctor.clinic || "",
        wilaya: this.doctor.wilaya || "",
        commune: this.doctor.commune || "",
        address: this.doctor.address || "",
        experienceYears: 0,
        bio: "",
        languages: { ar: true, fr: true, en: false },
        services: [
          { id: "consultation", name: "استشارة طبية", duration: 30, price: 2500, active: true }
        ]
      };
    },


    /* ==================================================
       NORMALIZE SERVICE
       ================================================== */

    normalizeService: function (service, index) {
      return {
        id: service?.id || `service-${Date.now()}-${index}`,
        name: String(service?.name || "خدمة طبية").trim(),
        duration: Math.max(Number(service?.duration) || 30, 5),
        price: Math.max(Number(service?.price) || 0, 0),
        active: service?.active !== false
      };
    },


    /* ==================================================
       LOAD PROFESSIONAL
       ================================================== */

    loadProfessional: function () {
      const defaults = this.getDefaultProfessional();

      let professional = null;

      // Doctor-specific storage
      professional = this.readJSON(
        localStorage,
        `monmedecin-doctor-professional-${this.doctorId}`,
        null
      );

      // Embedded doctor professional
      if (!professional && this.doctor.professional && typeof this.doctor.professional === "object") {
        professional = this.doctor.professional;
      }

      // Legacy doctor 1
      if (!professional && String(this.doctorId) === "1") {
        professional = this.readJSON(localStorage, "monmedecin-doctor-professional", null);
      }

      this.professional = {
        ...defaults,
        ...(professional && typeof professional === "object" ? professional : {}),
        doctorId: this.doctorId,
        languages: {
          ...defaults.languages,
          ...(professional && professional.languages ? professional.languages : {})
        },
        services: professional && Array.isArray(professional.services)
          ? professional.services.map(function (service, index) {
              return SecretaryDoctorProfileScreen.normalizeService(service, index);
            })
          : defaults.services.map(function (service, index) {
              return SecretaryDoctorProfileScreen.normalizeService(service, index);
            })
      };

      this.selectedWilaya = this.professional.wilaya || "";
      return this.professional;
    },


    /* ==================================================
       ALGERIA LOCATIONS
       ================================================== */

    getAlgeriaData: function () {
      if (window.AlgeriaLocations && Array.isArray(window.AlgeriaLocations.wilayas)) {
        return window.AlgeriaLocations;
      }
      return { wilayas: [] };
    },

    getWilayas: function () {
      return this.getAlgeriaData().wilayas || [];
    },

    findWilaya: function (value) {
      if (!value) return null;
      return this.getWilayas().find(function (wilaya) {
        return String(wilaya.code) === String(value) || String(wilaya.name) === String(value);
      }) || null;
    },

    getCommunes: function (wilayaValue) {
      const wilaya = this.findWilaya(wilayaValue);
      if (!wilaya || !Array.isArray(wilaya.communes)) return [];
      return wilaya.communes.map(function (commune) {
        if (typeof commune === "string") return commune;
        return commune?.name || "";
      }).filter(Boolean);
    },


    /* ==================================================
       RENDER OPTIONS
       ================================================== */

    renderSpecialtyOptions: function () {
      return this.specialties.map(function (specialty) {
        const selected = specialty === this.professional.specialty;
        return `<option value="${specialty}" ${selected ? "selected" : ""}>${specialty}</option>`;
      }, this).join("");
    },

    renderWilayaOptions: function () {
      return this.getWilayas().map(function (wilaya) {
        const selected = String(wilaya.name) === String(this.professional.wilaya);
        return `<option value="${wilaya.code}" ${selected ? "selected" : ""}>${wilaya.code} - ${wilaya.name}</option>`;
      }, this).join("");
    },

    renderCommuneOptions: function () {
      let wilaya = this.findWilaya(this.selectedWilaya);
      if (!wilaya) wilaya = this.findWilaya(this.professional.wilaya);
      if (!wilaya) return "";

      return this.getCommunes(wilaya.code).map(function (commune) {
        const selected = String(commune) === String(this.professional.commune);
        return `<option value="${commune}" ${selected ? "selected" : ""}>${commune}</option>`;
      }, this).join("");
    },


    /* ==================================================
       CREATE SERVICE ID
       ================================================== */

    createServiceId: function () {
      return "SERVICE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    },


    /* ==================================================
       FIND SERVICE
       ================================================== */

    findService: function (serviceId) {
      return this.professional.services.find(function (service) {
        return String(service.id) === String(serviceId);
      }) || null;
    },


    /* ==================================================
       ADD SERVICE
       ================================================== */

    addService: function () {
      this.professional.services.push({
        id: this.createServiceId(),
        name: "خدمة جديدة",
        duration: 30,
        price: 0,
        active: true
      });
      this.refreshServices();
    },


    /* ==================================================
       DELETE SERVICE
       ================================================== */

    deleteService: function (serviceId) {
      if (this.professional.services.length <= 1) {
        this.showMessage("يجب الاحتفاظ بخدمة واحدة على الأقل.", "error");
        return;
      }

      this.professional.services = this.professional.services.filter(function (service) {
        return String(service.id) !== String(serviceId);
      });

      this.refreshServices();
    },


    /* ==================================================
       UPDATE SERVICE
       ================================================== */

    updateService: function (serviceId, field, value) {
      const service = this.findService(serviceId);
      if (!service) return;

      switch (field) {
        case "name":
          service.name = String(value || "");
          break;
        case "duration":
          service.duration = Math.max(Number(value) || 5, 5);
          break;
        case "price":
          service.price = Math.max(Number(value) || 0, 0);
          break;
        case "active":
          service.active = Boolean(value);
          break;
      }
    },


    /* ==================================================
       VALIDATE SERVICE
       ================================================== */

    isServiceValid: function (service) {
      if (!service) return false;
      if (!String(service.name || "").trim()) return false;
      if (Number(service.duration) < 5) return false;
      if (Number(service.price) < 0) return false;
      return true;
    },


    /* ==================================================
       VALIDATE
       ================================================== */

    validate: function () {
      if (!this.professional.title.trim()) {
        return { valid: false, message: "أدخل الاسم المهني للطبيب." };
      }
      if (!this.professional.specialty) {
        return { valid: false, message: "اختر التخصص الطبي." };
      }
      if (!this.professional.wilaya) {
        return { valid: false, message: "اختر الولاية." };
      }
      if (!this.professional.commune) {
        return { valid: false, message: "اختر البلدية." };
      }
      if (!this.professional.clinic.trim()) {
        return { valid: false, message: "أدخل اسم العيادة." };
      }
      if (!Array.isArray(this.professional.services) || this.professional.services.length === 0) {
        return { valid: false, message: "يجب أن يحتوي الطبيب على خدمة واحدة على الأقل." };
      }

      const invalid = this.professional.services.find(function (service) {
        return !SecretaryDoctorProfileScreen.isServiceValid(service);
      });

      if (invalid) {
        return { valid: false, message: "راجع أسماء الخدمات ومددها وأسعارها." };
      }

      return { valid: true };
    },


    /* ==================================================
       READ FORM
       ================================================== */

    readForm: function () {
      const title = document.getElementById("secretaryDoctorProfileTitle");
      const specialty = document.getElementById("secretaryDoctorProfileSpecialty");
      const experience = document.getElementById("secretaryDoctorProfileExperience");
      const clinic = document.getElementById("secretaryDoctorProfileClinic");
      const wilayaSelect = document.getElementById("secretaryDoctorProfileWilaya");
      const commune = document.getElementById("secretaryDoctorProfileCommune");
      const address = document.getElementById("secretaryDoctorProfileAddress");
      const bio = document.getElementById("secretaryDoctorProfileBio");
      const ar = document.getElementById("secretaryDoctorProfileLanguageAr");
      const fr = document.getElementById("secretaryDoctorProfileLanguageFr");
      const en = document.getElementById("secretaryDoctorProfileLanguageEn");
      const visibility = document.getElementById("secretaryDoctorProfileVisibility");

      const wilaya = this.findWilaya(wilayaSelect?.value);

      this.professional.title = String(title?.value || "").trim();
      this.professional.specialty = specialty?.value || "";
      this.professional.experienceYears = Math.max(Number(experience?.value) || 0, 0);
      this.professional.clinic = String(clinic?.value || "").trim();
      this.professional.wilaya = wilaya ? wilaya.name : "";
      this.professional.commune = commune?.value || "";
      this.professional.address = String(address?.value || "").trim();
      this.professional.bio = String(bio?.value || "").trim();
      this.professional.publicVisible = Boolean(visibility?.checked);
      this.professional.languages = {
        ar: Boolean(ar?.checked),
        fr: Boolean(fr?.checked),
        en: Boolean(en?.checked)
      };
    },


    /* ==================================================
       UPDATE COMMUNE SELECT
       ================================================== */

    updateCommuneSelect: function () {
      const select = document.getElementById("secretaryDoctorProfileCommune");
      if (!select) return;

      const wilaya = this.findWilaya(this.selectedWilaya);
      const communes = wilaya ? this.getCommunes(wilaya.code) : [];

      select.disabled = !wilaya;
      select.innerHTML = `
        <option value="">${wilaya ? "اختر البلدية" : "اختر الولاية أولاً"}</option>
        ${communes.map(function (commune) {
          return `<option value="${commune}">${commune}</option>`;
        }).join("")}
      `;
    },


    /* ==================================================
       ACTIVE SERVICES
       ================================================== */

    getActiveServicesCount: function () {
      return this.professional.services.filter(function (service) {
        return service.active !== false;
      }).length;
    },


    /* ==================================================
       LOWEST PRICE
       ================================================== */

    getLowestPrice: function () {
      const prices = this.professional.services
        .filter(function (service) { return service.active !== false; })
        .map(function (service) { return Number(service.price); })
        .filter(function (price) { return Number.isFinite(price) && price >= 0; });

      if (!prices.length) return 0;
      return Math.min(...prices);
    },


    /* ==================================================
       RENDER SERVICE
       ================================================== */

    renderService: function (service) {
      return `
        <article class="secretary-doctor-profile-service glass ${service.active ? "is-active" : "is-disabled"}">
          <div class="secretary-doctor-profile-service__header">
            <div>
              <span>خدمة طبية</span>
              <strong>${service.name}</strong>
            </div>
            <label class="secretary-doctor-profile-switch">
              <input type="checkbox" data-secretary-doctor-service-active="${service.id}" ${service.active ? "checked" : ""}>
              <span></span>
            </label>
          </div>
          <div class="secretary-doctor-profile-service__fields">
            <label class="secretary-doctor-profile-field">
              <span>اسم الخدمة</span>
              <input type="text" value="${service.name}" maxlength="100" data-secretary-doctor-service-name="${service.id}">
            </label>
            <label class="secretary-doctor-profile-field">
              <span>المدة</span>
              <div class="secretary-doctor-profile-input-unit">
                <input type="number" value="${service.duration}" min="5" max="480" step="5" data-secretary-doctor-service-duration="${service.id}">
                <small>دقيقة</small>
              </div>
            </label>
            <label class="secretary-doctor-profile-field">
              <span>السعر</span>
              <div class="secretary-doctor-profile-input-unit">
                <input type="number" value="${service.price}" min="0" step="50" data-secretary-doctor-service-price="${service.id}">
                <small>دج</small>
              </div>
            </label>
          </div>
          <div class="secretary-doctor-profile-service__footer">
            <span>${service.active ? "متاحة للمرضى" : "مخفية"}</span>
            <button type="button" data-secretary-doctor-service-delete="${service.id}">حذف</button>
          </div>
        </article>
      `;
    },


    /* ==================================================
       RENDER SERVICES
       ================================================== */

    renderServices: function () {
      return this.professional.services.map(function (service) {
        return SecretaryDoctorProfileScreen.renderService(service);
      }).join("");
    },


    /* ==================================================
       REFRESH SERVICES
       ================================================== */

    refreshServices: function () {
      const container = document.getElementById("secretaryDoctorProfileServices");
      if (container) {
        container.innerHTML = this.renderServices();
      }

      const total = document.getElementById("secretaryDoctorProfileServicesCount");
      const active = document.getElementById("secretaryDoctorProfileActiveServices");
      const lowest = document.getElementById("secretaryDoctorProfileLowestPrice");

      if (total) total.textContent = String(this.professional.services.length);
      if (active) active.textContent = String(this.getActiveServicesCount());
      if (lowest) lowest.textContent = `${this.getLowestPrice()} دج`;
    },


    /* ==================================================
       SAVE
       ================================================== */

    save: function () {
      if (!this.canEditDoctorProfile()) {
        this.showMessage("لا تملك صلاحية تعديل الملف المهني.", "error");
        return false;
      }

      this.readForm();

      const validation = this.validate();
      if (!validation.valid) {
        this.showMessage(validation.message, "error");
        return false;
      }

      // Save professional
      const saved = this.writeJSON(
        localStorage,
        `monmedecin-doctor-professional-${this.doctorId}`,
        this.professional
      );

      // Legacy doctor 1
      if (String(this.doctorId) === "1") {
        this.writeJSON(localStorage, "monmedecin-doctor-professional", this.professional);
      }

      // Build doctor snapshot
      const updatedDoctor = {
        ...this.doctor,
        fullName: this.professional.title,
        specialty: this.professional.specialty,
        clinic: this.professional.clinic,
        wilaya: this.professional.wilaya,
        commune: this.professional.commune,
        address: this.professional.address,
        professional: { ...this.professional }
      };

      // Update doctor registry
      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) doctors = [];

      const index = doctors.findIndex(function (doctor) {
        return String(doctor.id) === String(this.doctorId);
      }, this);

      if (index >= 0) {
        doctors[index] = updatedDoctor;
      } else {
        doctors.push(updatedDoctor);
      }

      this.writeJSON(localStorage, "monmedecin-doctors", doctors);

      // Update current local doctor if same
      const currentDoctor = this.readJSON(localStorage, "monmedecin-doctor", null);
      if (currentDoctor && String(currentDoctor.id) === String(this.doctorId)) {
        this.writeJSON(localStorage, "monmedecin-doctor", updatedDoctor);
      }

      this.doctor = updatedDoctor;

      if (!saved) {
        this.showMessage("تعذر حفظ الملف المهني.", "error");
        return false;
      }

      this.showMessage("تم حفظ ملف الطبيب بنجاح ✓", "success");
      return true;
    },


    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("secretaryDoctorProfileMessage");
      if (!element) return;

      element.hidden = false;
      element.textContent = message;
      element.classList.remove("is-success", "is-error");
      element.classList.add(type === "success" ? "is-success" : "is-error");

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3000);
    },


    /* ==================================================
       NO PERMISSION
       ================================================== */

    renderNoPermission: function (isMobile) {
      return `
        <main class="secretary-doctor-profile ${isMobile ? "mobile-app-page" : "website-page"}">
          <header class="secretary-doctor-profile__header">
            <button id="secretaryDoctorProfileBackNoPermission" class="secretary-doctor-profile__back" type="button">→</button>
            <div class="secretary-doctor-profile__header-copy">
              <strong>ملف الطبيب</strong>
              <span>Mon Médecin</span>
            </div>
            <div></div>
          </header>
          <section class="secretary-doctor-profile__container">
            <section class="secretary-doctor-profile-no-permission glass">
              <span>🔒</span>
              <h1>لا توجد صلاحية</h1>
              <p>لم يمنح الطبيب لهذا الحساب صلاحية تعديل الملف المهني.</p>
            </section>
          </section>
        </main>
      `;
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state) {
      this.loadSecretary(state);
      this.loadDoctor();

      const isMobile = state.deviceMode === "mobile";

      if (!this.canEditDoctorProfile()) {
        return this.renderNoPermission(isMobile);
      }

      this.loadProfessional();

      const wilaya = this.findWilaya(this.professional.wilaya);
      if (wilaya) {
        this.selectedWilaya = wilaya.code;
      }

      return `
        <main class="secretary-doctor-profile ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="secretary-doctor-profile__orb secretary-doctor-profile__orb--blue"></div>
          <div class="secretary-doctor-profile__orb secretary-doctor-profile__orb--purple"></div>

          <header class="secretary-doctor-profile__header">
            <button id="secretaryDoctorProfileBack" class="secretary-doctor-profile__back" type="button">→</button>
            <div class="secretary-doctor-profile__header-copy">
              <strong>ملف الطبيب</strong>
              <span>تعديل الملف المهني</span>
            </div>
            <button id="secretaryDoctorProfileTheme" class="secretary-doctor-profile__theme" type="button">◐</button>
          </header>

          <section class="secretary-doctor-profile__container">

            <section class="secretary-doctor-profile-doctor glass">
              <span>تعديل ملف</span>
              <strong>${this.doctor.fullName || "الطبيب"}</strong>
              <small>Doctor ID: ${this.doctorId}</small>
            </section>

            <section class="secretary-doctor-profile__hero">
              <span>الملف المهني</span>
              <h1>بيانات الطبيب</h1>
              <p>يمكنك تعديل المعلومات التي تظهر للمرضى حسب الصلاحية التي منحها الطبيب.</p>
            </section>

            <section class="secretary-doctor-profile-visibility glass">
              <div>
                <span>ظهور الملف</span>
                <strong>إظهار الطبيب في نتائج البحث</strong>
              </div>
              <label class="secretary-doctor-profile-switch">
                <input id="secretaryDoctorProfileVisibility" type="checkbox" ${this.professional.publicVisible ? "checked" : ""}>
                <span></span>
              </label>
            </section>

            <section class="secretary-doctor-profile-section glass">
              <div class="secretary-doctor-profile-section__heading">
                <span>المعلومات</span>
                <h2>البيانات الأساسية</h2>
              </div>
              <div class="secretary-doctor-profile-form">
                <label class="secretary-doctor-profile-field secretary-doctor-profile-field--full">
                  <span>الاسم الظاهر للمرضى</span>
                  <input id="secretaryDoctorProfileTitle" type="text" value="${this.professional.title}" maxlength="100">
                </label>
                <label class="secretary-doctor-profile-field secretary-doctor-profile-field--full">
                  <span>التخصص الطبي</span>
                  <select id="secretaryDoctorProfileSpecialty">
                    <option value="">اختر التخصص</option>
                    ${this.renderSpecialtyOptions()}
                  </select>
                </label>
                <label class="secretary-doctor-profile-field">
                  <span>سنوات الخبرة</span>
                  <div class="secretary-doctor-profile-input-unit">
                    <input id="secretaryDoctorProfileExperience" type="number" value="${this.professional.experienceYears}" min="0" max="80">
                    <small>سنة</small>
                  </div>
                </label>
                <label class="secretary-doctor-profile-field">
                  <span>العيادة</span>
                  <input id="secretaryDoctorProfileClinic" type="text" value="${this.professional.clinic}" maxlength="120">
                </label>
              </div>
            </section>

            <section class="secretary-doctor-profile-section glass">
              <div class="secretary-doctor-profile-section__heading">
                <span>الموقع</span>
                <h2>الولاية والبلدية</h2>
              </div>
              <div class="secretary-doctor-profile-form">
                <label class="secretary-doctor-profile-field">
                  <span>الولاية</span>
                  <select id="secretaryDoctorProfileWilaya">
                    <option value="">اختر الولاية</option>
                    ${this.renderWilayaOptions()}
                  </select>
                </label>
                <label class="secretary-doctor-profile-field">
                  <span>البلدية</span>
                  <select id="secretaryDoctorProfileCommune" ${!this.selectedWilaya ? "disabled" : ""}>
                    <option value="">اختر البلدية</option>
                    ${this.renderCommuneOptions()}
                  </select>
                </label>
                <label class="secretary-doctor-profile-field secretary-doctor-profile-field--full">
                  <span>عنوان العيادة</span>
                  <input id="secretaryDoctorProfileAddress" type="text" value="${this.professional.address}" maxlength="200">
                </label>
              </div>
            </section>

            <section class="secretary-doctor-profile-section glass">
              <div class="secretary-doctor-profile-section__heading">
                <span>التعريف</span>
                <h2>نبذة الطبيب</h2>
              </div>
              <label class="secretary-doctor-profile-field secretary-doctor-profile-field--full">
                <textarea id="secretaryDoctorProfileBio" rows="5" maxlength="800" placeholder="نبذة قصيرة عن الطبيب...">${this.professional.bio}</textarea>
              </label>
            </section>

            <section class="secretary-doctor-profile-section glass">
              <div class="secretary-doctor-profile-section__heading">
                <span>التواصل</span>
                <h2>اللغات</h2>
              </div>
              <div class="secretary-doctor-profile-languages">
                <label class="secretary-doctor-profile-language">
                  <input id="secretaryDoctorProfileLanguageAr" type="checkbox" ${this.professional.languages.ar ? "checked" : ""}>
                  <span>العربية</span>
                </label>
                <label class="secretary-doctor-profile-language">
                  <input id="secretaryDoctorProfileLanguageFr" type="checkbox" ${this.professional.languages.fr ? "checked" : ""}>
                  <span>Français</span>
                </label>
                <label class="secretary-doctor-profile-language">
                  <input id="secretaryDoctorProfileLanguageEn" type="checkbox" ${this.professional.languages.en ? "checked" : ""}>
                  <span>English</span>
                </label>
              </div>
            </section>

            <section class="secretary-doctor-profile__section">
              <div class="secretary-doctor-profile-section__heading secretary-doctor-profile-section__heading--actions">
                <div>
                  <span>الخدمات</span>
                  <h2>خدمات الطبيب</h2>
                </div>
                <button id="secretaryDoctorProfileAddService" class="secretary-doctor-profile-add-service" type="button">+ إضافة خدمة</button>
              </div>

              <section class="secretary-doctor-profile-stats">
                <article class="secretary-doctor-profile-stat glass">
                  <span>الخدمات</span>
                  <strong id="secretaryDoctorProfileServicesCount">${this.professional.services.length}</strong>
                </article>
                <article class="secretary-doctor-profile-stat glass">
                  <span>المتاحة</span>
                  <strong id="secretaryDoctorProfileActiveServices">${this.getActiveServicesCount()}</strong>
                </article>
                <article class="secretary-doctor-profile-stat glass">
                  <span>أقل سعر</span>
                  <strong id="secretaryDoctorProfileLowestPrice">${this.getLowestPrice()} دج</strong>
                </article>
              </section>

              <div id="secretaryDoctorProfileServices" class="secretary-doctor-profile-services">
                ${this.renderServices()}
              </div>
            </section>

            <section class="secretary-doctor-profile-info glass">
              <span>🔒</span>
              <div>
                <strong>ملف الطبيب المرتبط فقط</strong>
                <p>هذه الصلاحية لا تسمح بتعديل أي طبيب آخر في النظام.</p>
              </div>
            </section>

            <div id="secretaryDoctorProfileMessage" class="secretary-doctor-profile-message" hidden></div>

            <div class="secretary-doctor-profile-actions">
              <button id="secretaryDoctorProfileSave" class="secretary-doctor-profile-actions__save" type="button">حفظ ملف الطبيب</button>
            </div>

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
              <button class="mobile-bottom-nav__item" data-nav="patients" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>المرضى</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="doctor-profile" type="button">
                <span class="mobile-bottom-nav__icon">✚</span>
                <span>ملف الطبيب</span>
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
      const goDashboard = function () {
        app.navigate("/secretary/dashboard");
      };

      document.getElementById("secretaryDoctorProfileBack")?.addEventListener("click", goDashboard);
      document.getElementById("secretaryDoctorProfileBackNoPermission")?.addEventListener("click", goDashboard);

      document.getElementById("secretaryDoctorProfileTheme")?.addEventListener("click", function () {
        app.toggleTheme();
      });

      document.getElementById("secretaryDoctorProfileWilaya")?.addEventListener("change", function (event) {
        SecretaryDoctorProfileScreen.selectedWilaya = event.target.value;
        SecretaryDoctorProfileScreen.professional.commune = "";
        SecretaryDoctorProfileScreen.updateCommuneSelect();
      });

      document.getElementById("secretaryDoctorProfileAddService")?.addEventListener("click", function () {
        SecretaryDoctorProfileScreen.readForm();
        SecretaryDoctorProfileScreen.addService();
      });

      const services = document.getElementById("secretaryDoctorProfileServices");

      services?.addEventListener("input", function (event) {
        const name = event.target.closest("[data-secretary-doctor-service-name]");
        if (name) {
          SecretaryDoctorProfileScreen.updateService(name.dataset.secretaryDoctorServiceName, "name", name.value);
          return;
        }
        const duration = event.target.closest("[data-secretary-doctor-service-duration]");
        if (duration) {
          SecretaryDoctorProfileScreen.updateService(duration.dataset.secretaryDoctorServiceDuration, "duration", duration.value);
          return;
        }
        const price = event.target.closest("[data-secretary-doctor-service-price]");
        if (price) {
          SecretaryDoctorProfileScreen.updateService(price.dataset.secretaryDoctorServicePrice, "price", price.value);
        }
      });

      services?.addEventListener("change", function (event) {
        const active = event.target.closest("[data-secretary-doctor-service-active]");
        if (!active) return;

        SecretaryDoctorProfileScreen.updateService(active.dataset.secretaryDoctorServiceActive, "active", active.checked);
        SecretaryDoctorProfileScreen.refreshServices();
      });

      services?.addEventListener("click", function (event) {
        const remove = event.target.closest("[data-secretary-doctor-service-delete]");
        if (!remove) return;

        const confirmed = window.confirm("هل تريد حذف هذه الخدمة؟");
        if (confirmed) {
          SecretaryDoctorProfileScreen.deleteService(remove.dataset.secretaryDoctorServiceDelete);
        }
      });

      const save = document.getElementById("secretaryDoctorProfileSave");

      save?.addEventListener("click", function () {
        const saved = SecretaryDoctorProfileScreen.save();
        if (!saved) return;

        save.disabled = true;
        const original = save.textContent;
        save.textContent = "تم الحفظ ✓";

        setTimeout(function () {
          if (document.body.contains(save)) {
            save.disabled = false;
            save.textContent = original;
          }
        }, 1000);
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
      document.querySelectorAll("[data-nav='doctor-profile']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/doctor-profile");
        });
      });
    }

  };


  window.SecretaryDoctorProfileScreen = SecretaryDoctorProfileScreen;

})();