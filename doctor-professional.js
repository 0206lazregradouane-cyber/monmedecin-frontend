/* =====================================================
   MON MÉDECIN
   DOCTOR PROFESSIONAL PROFILE - COMPLETE
   ===================================================== */

(function () {
  "use strict";

  const DoctorProfessionalScreen = {
    /* ==================================================
       STATE
       ================================================== */

    doctor: null,
    professional: null,
    selectedWilaya: "",
    messageTimer: null,

    /* ==================================================
       SPECIALTIES
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
       SPECIALTIES HELPERS (من التخزين)
       ================================================== */

    getSpecialties: function () {
      // جلب التخصصات من التخزين
      const specialties = this.readJSON(localStorage, "monmedecin-specialties", null);
      
      if (specialties && Array.isArray(specialties) && specialties.length > 0) {
        return specialties.filter(function(s) {
          return s.active !== false;
        });
      }
      
      // إذا لم توجد تخصصات محفوظة، استخدم التخصصات الافتراضية
      if (window.MedicalSpecialties && typeof window.MedicalSpecialties.getAll === 'function') {
        const all = window.MedicalSpecialties.getAll();
        return all.map(function(s) {
          return {
            id: s.id,
            name: s.nameAr,
            icon: s.icon || '🩺',
            category: s.category || 'general',
            active: true
          };
        });
      }
      
      return this.specialties || [];
    },

    renderSpecialtyOptions: function (selectedValue) {
      const specialties = this.getSpecialties();
      
      if (specialties.length === 0) {
        return `<option value="">لا توجد تخصصات متاحة</option>`;
      }
      
      return specialties.map(function(s) {
        const value = s.id || s.name;
        const label = s.name || s.nameAr || value;
        const icon = s.icon || '🩺';
        const selected = String(value) === String(selectedValue) ? 'selected' : '';
        return `<option value="${this.escapeHTML(value)}" ${selected}>${icon} ${this.escapeHTML(label)}</option>`;
      }, this).join('');
    },

    /* ==================================================
       STORAGE HELPERS
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
       DOCTOR
       ================================================== */

    getDoctor: function (state) {
      let doctor = null;

      if (state && state.doctor && typeof state.doctor === "object") {
        doctor = state.doctor;
      }

      if (!doctor) {
        doctor = this.readJSON(localStorage, "monmedecin-doctor", null);
      }

      if (!doctor) {
        doctor = {
          id: 1,
          firstName: "أحمد",
          lastName: "بن عمر",
          fullName: "د. أحمد بن عمر",
          specialty: "أمراض القلب والأوعية الدموية",
          clinic: "عيادة النور",
          wilaya: "بسكرة",
          commune: "بسكرة",
          address: "",
          active: true,
          verified: true,
          approved: true
        };
      }

      if (doctor.id === undefined || doctor.id === null) {
        doctor.id = 1;
      }

      this.doctor = doctor;
      return doctor;
    },

    /* ==================================================
       DEFAULT PROFESSIONAL PROFILE
       ================================================== */

    getDefaultProfessional: function () {
      return {
        doctorId: this.doctor.id,
        publicVisible: true,
        title: this.doctor.fullName || "",
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

    loadProfessional: function (state) {
      this.getDoctor(state);

      const defaults = this.getDefaultProfessional();
      let professional = null;

      if (this.doctor.professional && typeof this.doctor.professional === "object") {
        professional = this.doctor.professional;
      }

      if (!professional) {
        professional = this.readJSON(
          localStorage,
          `monmedecin-doctor-professional-${this.doctor.id}`,
          null
        );
      }

      if (!professional && String(this.doctor.id) === "1") {
        professional = this.readJSON(localStorage, "monmedecin-doctor-professional", null);
      }

      this.professional = {
        ...defaults,
        ...(professional && typeof professional === "object" ? professional : {}),
        doctorId: this.doctor.id,
        languages: {
          ...defaults.languages,
          ...(professional && professional.languages ? professional.languages : {})
        },
        services: professional && Array.isArray(professional.services)
          ? professional.services.map(function (service, index) {
              return DoctorProfessionalScreen.normalizeService(service, index);
            })
          : defaults.services.map(function (service, index) {
              return DoctorProfessionalScreen.normalizeService(service, index);
            })
      };

      this.selectedWilaya = this.professional.wilaya || "";
      return this.professional;
    },

    /* ==================================================
       ALGERIA DATA
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
        if (commune && typeof commune === "object") return commune.name || "";
        return "";
      }).filter(Boolean);
    },

    /* ==================================================
       RENDER OPTIONS
       ================================================== */

    renderWilayaOptions: function () {
      return this.getWilayas().map(function (wilaya) {
        const selected = String(wilaya.name) === String(DoctorProfessionalScreen.professional.wilaya);
        return `<option value="${wilaya.code}" ${selected ? "selected" : ""}>${wilaya.code} - ${wilaya.name}</option>`;
      }).join("");
    },

    renderCommuneOptions: function () {
      let wilaya = this.findWilaya(this.selectedWilaya);
      if (!wilaya) wilaya = this.findWilaya(this.professional.wilaya);
      if (!wilaya) return "";

      return this.getCommunes(wilaya.code).map(function (commune) {
        const selected = String(commune) === String(DoctorProfessionalScreen.professional.commune);
        return `<option value="${commune}" ${selected ? "selected" : ""}>${commune}</option>`;
      }).join("");
    },

    /* ==================================================
       SERVICES
       ================================================== */

    getServices: function () {
      return this.professional.services || [];
    },

    createServiceId: function () {
      return "SERVICE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    },

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

    findService: function (serviceId) {
      return this.getServices().find(function (service) {
        return String(service.id) === String(serviceId);
      }) || null;
    },

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

    isServiceValid: function (service) {
      if (!service) return false;
      if (!String(service.name || "").trim()) return false;
      if (!Number.isFinite(Number(service.duration)) || Number(service.duration) < 5) return false;
      if (!Number.isFinite(Number(service.price)) || Number(service.price) < 0) return false;
      return true;
    },

    getActiveServicesCount: function () {
      return this.professional.services.filter(function (service) {
        return service.active !== false;
      }).length;
    },

    getLowestPrice: function () {
      const prices = this.professional.services
        .filter(function (service) { return service.active !== false; })
        .map(function (service) { return Number(service.price); })
        .filter(function (price) { return Number.isFinite(price) && price >= 0; });

      if (!prices.length) return 0;
      return Math.min(...prices);
    },

    /* ==================================================
       VALIDATE
       ================================================== */

    validate: function () {
      if (!String(this.professional.title || "").trim()) {
        return { valid: false, message: "أدخل الاسم المهني للطبيب." };
      }
      if (!String(this.professional.specialty || "").trim()) {
        return { valid: false, message: "اختر التخصص الطبي." };
      }
      if (!String(this.professional.wilaya || "").trim()) {
        return { valid: false, message: "اختر الولاية." };
      }
      if (!String(this.professional.commune || "").trim()) {
        return { valid: false, message: "اختر البلدية." };
      }
      if (!String(this.professional.clinic || "").trim()) {
        return { valid: false, message: "أدخل اسم العيادة أو مكان العمل." };
      }
      if (!Array.isArray(this.professional.services) || this.professional.services.length === 0) {
        return { valid: false, message: "أضف خدمة طبية واحدة على الأقل." };
      }

      const invalidService = this.professional.services.find(function (service) {
        return !DoctorProfessionalScreen.isServiceValid(service);
      });

      if (invalidService) {
        return { valid: false, message: "راجع أسماء الخدمات وأسعارها ومددها." };
      }

      return { valid: true };
    },

    /* ==================================================
       READ FORM
       ================================================== */

    readForm: function () {
      const title = document.getElementById("doctorProfessionalTitle");
      const specialty = document.getElementById("doctorProfessionalSpecialty");
      const clinic = document.getElementById("doctorProfessionalClinic");
      const experience = document.getElementById("doctorProfessionalExperience");
      const wilayaSelect = document.getElementById("doctorProfessionalWilaya");
      const commune = document.getElementById("doctorProfessionalCommune");
      const address = document.getElementById("doctorProfessionalAddress");
      const bio = document.getElementById("doctorProfessionalBio");
      const languageAr = document.getElementById("doctorProfessionalLanguageAr");
      const languageFr = document.getElementById("doctorProfessionalLanguageFr");
      const languageEn = document.getElementById("doctorProfessionalLanguageEn");
      const visibility = document.getElementById("doctorProfessionalVisibility");

      const wilaya = this.findWilaya(wilayaSelect?.value);

      this.professional.title = String(title?.value || "").trim();
      this.professional.specialty = specialty?.value || "";
      this.professional.clinic = String(clinic?.value || "").trim();
      this.professional.experienceYears = Math.max(Number(experience?.value) || 0, 0);
      this.professional.wilaya = wilaya ? wilaya.name : "";
      this.professional.commune = commune?.value || "";
      this.professional.address = String(address?.value || "").trim();
      this.professional.bio = String(bio?.value || "").trim();
      this.professional.publicVisible = Boolean(visibility?.checked);
      this.professional.languages = {
        ar: Boolean(languageAr?.checked),
        fr: Boolean(languageFr?.checked),
        en: Boolean(languageEn?.checked)
      };
    },

    /* ==================================================
       UPDATE COMMUNE SELECT
       ================================================== */

    updateCommuneSelect: function () {
      const commune = document.getElementById("doctorProfessionalCommune");
      if (!commune) return;

      commune.disabled = !this.selectedWilaya;
      const wilaya = this.findWilaya(this.selectedWilaya);
      const communes = wilaya ? this.getCommunes(wilaya.code) : [];

      commune.innerHTML = `
        <option value="">${wilaya ? "اختر البلدية" : "اختر الولاية أولاً"}</option>
        ${communes.map(function (name) {
          return `<option value="${name}">${name}</option>`;
        }).join("")}
      `;
    },

    /* ==================================================
       REFRESH SERVICES
       ================================================== */

    refreshServices: function () {
      const container = document.getElementById("doctorProfessionalServices");
      if (container) {
        container.innerHTML = this.renderServices();
      }

      const total = document.getElementById("doctorProfessionalServicesCount");
      const active = document.getElementById("doctorProfessionalActiveCount");
      const lowest = document.getElementById("doctorProfessionalLowestPrice");

      if (total) total.textContent = String(this.professional.services.length);
      if (active) active.textContent = String(this.getActiveServicesCount());
      if (lowest) lowest.textContent = `${this.getLowestPrice()} دج`;
    },

    /* ==================================================
       RENDER SERVICES
       ================================================== */

    renderServices: function () {
      if (!this.professional.services.length) {
        return `
          <div class="doctor-professional-empty glass">
            <strong>لا توجد خدمات</strong>
            <p>أضف أول خدمة حتى يتمكن المرضى من الحجز.</p>
          </div>
        `;
      }

      return this.professional.services.map(function (service) {
        return DoctorProfessionalScreen.renderService(service);
      }).join("");
    },

    renderService: function (service) {
      return `
        <article class="doctor-professional-service glass ${service.active ? "is-active" : "is-disabled"}" data-professional-service="${service.id}">
          <div class="doctor-professional-service__header">
            <div>
              <span>خدمة طبية</span>
              <strong>${service.name || "خدمة"}</strong>
            </div>
            <label class="doctor-professional-switch">
              <input type="checkbox" data-professional-service-active="${service.id}" ${service.active ? "checked" : ""}>
              <span></span>
            </label>
          </div>
          <div class="doctor-professional-service__fields">
            <label class="doctor-professional-field">
              <span>اسم الخدمة</span>
              <input type="text" value="${service.name}" data-professional-service-name="${service.id}" maxlength="100" placeholder="مثال: استشارة طبية">
            </label>
            <label class="doctor-professional-field">
              <span>مدة الموعد</span>
              <div class="doctor-professional-input-unit">
                <input type="number" value="${service.duration}" data-professional-service-duration="${service.id}" min="5" max="480" step="5">
                <small>دقيقة</small>
              </div>
            </label>
            <label class="doctor-professional-field">
              <span>السعر</span>
              <div class="doctor-professional-input-unit">
                <input type="number" value="${service.price}" data-professional-service-price="${service.id}" min="0" step="50">
                <small>دج</small>
              </div>
            </label>
          </div>
          <div class="doctor-professional-service__footer">
            <span>${service.active ? "متاحة للحجز" : "مخفية عن المرضى"}</span>
            <button data-professional-delete-service="${service.id}" type="button">حذف الخدمة</button>
          </div>
        </article>
      `;
    },

    /* ==================================================
       SAVE
       ================================================== */

    save: function (app) {
      this.readForm();

      const validation = this.validate();
      if (!validation.valid) {
        this.showMessage(validation.message, "error");
        return false;
      }

      const key = `monmedecin-doctor-professional-${this.doctor.id}`;
      const professionalSaved = this.writeJSON(localStorage, key, this.professional);

      // Save services to unified key
      let allServices = this.readJSON(localStorage, "monmedecin-doctor-services", []);
      if (!Array.isArray(allServices)) allServices = [];

      allServices = allServices.filter(function (service) {
        return String(service.doctor_id || service.doctorId) !== String(DoctorProfessionalScreen.doctor.id);
      });

      this.professional.services.forEach(function (service) {
        allServices.push({
          ...service,
          doctor_id: DoctorProfessionalScreen.doctor.id,
          doctorId: DoctorProfessionalScreen.doctor.id,
          updatedAt: new Date().toISOString()
        });
      });

      const servicesSaved = this.writeJSON(localStorage, "monmedecin-doctor-services", allServices);

      if (String(this.doctor.id) === "1") {
        this.writeJSON(localStorage, "monmedecin-doctor-professional", this.professional);
      }

      const doctorSnapshot = this.updateDoctorRegistry();
      this.doctor = { ...doctorSnapshot };

      this.writeJSON(localStorage, "monmedecin-doctor", this.doctor);

      if (typeof app.saveDoctor === "function") {
        app.saveDoctor(this.doctor);
      } else {
        app.state.doctor = this.doctor;
      }

      if (!professionalSaved || !servicesSaved) {
        this.showMessage("تعذر حفظ الملف المهني أو الخدمات.", "error");
        return false;
      }

      this.showMessage("تم حفظ الملف المهني والخدمات بنجاح ✓", "success");
      return true;
    },

    /* ==================================================
       UPDATE DOCTOR REGISTRY
       ================================================== */

    updateDoctorRegistry: function () {
      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) doctors = [];

      const doctorSnapshot = {
        ...this.doctor,
        fullName: this.professional.title || this.doctor.fullName || "",
        specialty: this.professional.specialty,
        specialtyId: this.professional.specialty,
        clinic: this.professional.clinic,
        wilaya: this.professional.wilaya,
        commune: this.professional.commune,
        address: this.professional.address,
        professional: { ...this.professional }
      };

      const index = doctors.findIndex(function (doctor) {
        return String(doctor.id) === String(DoctorProfessionalScreen.doctor.id);
      });

      if (index >= 0) {
        doctors[index] = doctorSnapshot;
      } else {
        doctors.push(doctorSnapshot);
      }

      this.writeJSON(localStorage, "monmedecin-doctors", doctors);
      return doctorSnapshot;
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("doctorProfessionalMessage");
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
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadProfessional(state);

      const isMobile = state.deviceMode === "mobile";
      const wilaya = this.findWilaya(this.professional.wilaya);
      if (wilaya) this.selectedWilaya = wilaya.code;

      return `
        <main class="doctor-professional ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-professional__orb doctor-professional__orb--blue"></div>
          <div class="doctor-professional__orb doctor-professional__orb--purple"></div>

          <header class="doctor-professional__header">
            <button id="doctorProfessionalBack" class="doctor-professional__back" type="button">→</button>
            <div class="doctor-professional__header-copy">
              <strong>الملف المهني</strong>
              <span>معلوماتك الظاهرة للمرضى</span>
            </div>
            <button id="doctorProfessionalTheme" class="doctor-professional__theme" type="button">◐</button>
          </header>

          <section class="doctor-professional__container">

            <section class="doctor-professional__hero">
              <span>الملف العام</span>
              <h1>بيانات الطبيب المهنية</h1>
              <p>هذه المعلومات يستخدمها المرضى في البحث والملف العام والحجز.</p>
            </section>

            <section class="doctor-professional-visibility glass">
              <div>
                <span>ظهور الملف</span>
                <strong>${this.professional.publicVisible ? "ظاهر للمرضى" : "مخفي"}</strong>
                <p>عند إخفاء الملف لن يظهر الطبيب في نتائج البحث.</p>
              </div>
              <label class="doctor-professional-switch">
                <input id="doctorProfessionalVisibility" type="checkbox" ${this.professional.publicVisible ? "checked" : ""}>
                <span></span>
              </label>
            </section>

            <section class="doctor-professional-section glass">
              <div class="doctor-professional-section__heading">
                <span>الملف العام</span>
                <h2>المعلومات الأساسية</h2>
              </div>
              <div class="doctor-professional-form">
                <label class="doctor-professional-field doctor-professional-field--full">
                  <span>الاسم الظاهر للمرضى</span>
                  <input id="doctorProfessionalTitle" type="text" value="${this.professional.title}" maxlength="100" placeholder="مثال: د. أحمد بن عمر">
                </label>
                <label class="doctor-professional-field doctor-professional-field--full">
                  <span>التخصص الطبي</span>
                  <select id="doctorProfessionalSpecialty">
                    <option value="">اختر التخصص</option>
                    ${this.renderSpecialtyOptions(this.professional.specialty || "")}
                  </select>
                </label>
                <label class="doctor-professional-field">
                  <span>سنوات الخبرة</span>
                  <div class="doctor-professional-input-unit">
                    <input id="doctorProfessionalExperience" type="number" value="${this.professional.experienceYears}" min="0" max="80" step="1">
                    <small>سنة</small>
                  </div>
                </label>
                <label class="doctor-professional-field">
                  <span>اسم العيادة / مكان العمل</span>
                  <input id="doctorProfessionalClinic" type="text" value="${this.professional.clinic}" maxlength="120" placeholder="مثال: عيادة الشفاء">
                </label>
              </div>
            </section>

            <section class="doctor-professional-section glass">
              <div class="doctor-professional-section__heading">
                <span>الموقع</span>
                <h2>الولاية والبلدية</h2>
              </div>
              <div class="doctor-professional-form">
                <label class="doctor-professional-field">
                  <span>الولاية</span>
                  <select id="doctorProfessionalWilaya">
                    <option value="">اختر الولاية</option>
                    ${this.renderWilayaOptions()}
                  </select>
                </label>
                <label class="doctor-professional-field">
                  <span>البلدية</span>
                  <select id="doctorProfessionalCommune" ${!this.selectedWilaya ? "disabled" : ""}>
                    <option value="">${this.selectedWilaya ? "اختر البلدية" : "اختر الولاية أولاً"}</option>
                    ${this.renderCommuneOptions()}
                  </select>
                </label>
                <label class="doctor-professional-field doctor-professional-field--full">
                  <span>عنوان العيادة</span>
                  <input id="doctorProfessionalAddress" type="text" value="${this.professional.address}" maxlength="200" placeholder="مثال: حي النصر، قرب المستشفى...">
                </label>
              </div>
            </section>

            <section class="doctor-professional-section glass">
              <div class="doctor-professional-section__heading">
                <span>نبذة</span>
                <h2>التعريف المهني</h2>
              </div>
              <label class="doctor-professional-field doctor-professional-field--full">
                <span>نبذة تظهر للمريض</span>
                <textarea id="doctorProfessionalBio" rows="5" maxlength="800" placeholder="اكتب نبذة قصيرة عن خبرتك ومجال عملك...">${this.professional.bio}</textarea>
              </label>
            </section>

            <section class="doctor-professional-section glass">
              <div class="doctor-professional-section__heading">
                <span>التواصل</span>
                <h2>اللغات</h2>
              </div>
              <div class="doctor-professional-languages">
                <label class="doctor-professional-language">
                  <input id="doctorProfessionalLanguageAr" type="checkbox" ${this.professional.languages.ar ? "checked" : ""}>
                  <span>العربية</span>
                </label>
                <label class="doctor-professional-language">
                  <input id="doctorProfessionalLanguageFr" type="checkbox" ${this.professional.languages.fr ? "checked" : ""}>
                  <span>Français</span>
                </label>
                <label class="doctor-professional-language">
                  <input id="doctorProfessionalLanguageEn" type="checkbox" ${this.professional.languages.en ? "checked" : ""}>
                  <span>English</span>
                </label>
              </div>
            </section>

            <section class="doctor-professional__section">
              <div class="doctor-professional-section__heading doctor-professional-section__heading--actions">
                <div>
                  <span>الخدمات والأسعار</span>
                  <h2>خدمات الطبيب</h2>
                </div>
                <button id="doctorProfessionalAddService" class="doctor-professional-add-service" type="button">+ إضافة خدمة</button>
              </div>

              <section class="doctor-professional-summary">
                <article class="doctor-professional-summary__item glass">
                  <span>جميع الخدمات</span>
                  <strong id="doctorProfessionalServicesCount">${this.professional.services.length}</strong>
                </article>
                <article class="doctor-professional-summary__item glass">
                  <span>المتاحة للحجز</span>
                  <strong id="doctorProfessionalActiveCount">${this.getActiveServicesCount()}</strong>
                </article>
                <article class="doctor-professional-summary__item glass">
                  <span>أقل سعر</span>
                  <strong id="doctorProfessionalLowestPrice">${this.getLowestPrice()} دج</strong>
                </article>
              </section>

              <div id="doctorProfessionalServices" class="doctor-professional-services">
                ${this.renderServices()}
              </div>
            </section>

            <div id="doctorProfessionalMessage" class="doctor-professional-message" hidden></div>

            <div class="doctor-professional-actions">
              <button id="doctorProfessionalSave" class="doctor-professional-actions__primary" type="button">حفظ الملف المهني</button>
            </div>

          </section>

          <!-- BOTTOM NAV -->
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
              <button class="mobile-bottom-nav__item is-active" data-nav="profile" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>ملفي</span>
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
      const back = document.getElementById("doctorProfessionalBack");
      const theme = document.getElementById("doctorProfessionalTheme");
      const wilaya = document.getElementById("doctorProfessionalWilaya");
      const commune = document.getElementById("doctorProfessionalCommune");
      const services = document.getElementById("doctorProfessionalServices");
      const addService = document.getElementById("doctorProfessionalAddService");
      const save = document.getElementById("doctorProfessionalSave");

      back?.addEventListener("click", function () {
        app.navigate("/doctor/dashboard");
      });

      theme?.addEventListener("click", function () {
        app.toggleTheme();
      });

      wilaya?.addEventListener("change", function () {
        DoctorProfessionalScreen.selectedWilaya = wilaya.value;
        DoctorProfessionalScreen.professional.commune = "";
        DoctorProfessionalScreen.updateCommuneSelect();
      });

      commune?.addEventListener("change", function () {
        DoctorProfessionalScreen.professional.commune = commune.value;
      });

      addService?.addEventListener("click", function () {
        DoctorProfessionalScreen.readForm();
        DoctorProfessionalScreen.addService();
      });

      services?.addEventListener("input", function (event) {
        const name = event.target.closest("[data-professional-service-name]");
        if (name) {
          DoctorProfessionalScreen.updateService(name.dataset.professionalServiceName, "name", name.value);
          return;
        }
        const duration = event.target.closest("[data-professional-service-duration]");
        if (duration) {
          DoctorProfessionalScreen.updateService(duration.dataset.professionalServiceDuration, "duration", duration.value);
          return;
        }
        const price = event.target.closest("[data-professional-service-price]");
        if (price) {
          DoctorProfessionalScreen.updateService(price.dataset.professionalServicePrice, "price", price.value);
        }
      });

      services?.addEventListener("change", function (event) {
        const active = event.target.closest("[data-professional-service-active]");
        if (!active) return;
        DoctorProfessionalScreen.updateService(active.dataset.professionalServiceActive, "active", active.checked);
        DoctorProfessionalScreen.refreshServices();
      });

      services?.addEventListener("click", function (event) {
        const remove = event.target.closest("[data-professional-delete-service]");
        if (!remove) return;
        const confirmed = window.confirm("هل تريد حذف هذه الخدمة؟");
        if (confirmed) {
          DoctorProfessionalScreen.deleteService(remove.dataset.professionalDeleteService);
        }
      });

      save?.addEventListener("click", function () {
        const saved = DoctorProfessionalScreen.save(app);
        if (!saved) return;

        save.disabled = true;
        const originalText = save.textContent;
        save.textContent = "تم الحفظ ✓";

        setTimeout(function () {
          if (document.body.contains(save)) {
            save.disabled = false;
            save.textContent = originalText;
          }
        }, 1000);
      });

      // BOTTOM NAV
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
      document.querySelectorAll("[data-nav='profile']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/profile");
        });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/account");
        });
      });
    }
  };

  window.DoctorProfessionalScreen = DoctorProfessionalScreen;

})();