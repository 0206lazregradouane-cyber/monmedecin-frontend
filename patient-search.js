/* =========================================================
   MON MÉDECIN
   PATIENT SEARCH - FIXED (WITH BOTTOM NAV)
   ========================================================= */

(function () {
  "use strict";

  const PatientSearchScreen = {
    /* ==================================================
       STATE
       ================================================== */

    doctors: [],
    filteredDoctors: [],
    filters: {
      query: "",
      specialty: "",
      wilaya: "",
      commune: "",
      minRating: "",
      maxPrice: "",
      availability: ""
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
       SPECIALTIES HELPERS
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
      
      return [];
    },

    renderSpecialtyOptions: function () {
      const specialties = this.getSpecialties();
      const selected = this.filters.specialty || '';
      
      if (specialties.length === 0) {
        return `<option value="">كل التخصصات</option>`;
      }
      
      return specialties.map(function(s) {
        const value = s.id || s.name;
        const label = s.name || s.nameAr || value;
        const icon = s.icon || '🩺';
        const selectedAttr = String(value) === String(selected) ? 'selected' : '';
        return `<option value="${this.escapeHTML(value)}" ${selectedAttr}>${icon} ${this.escapeHTML(label)}</option>`;
      }, this).join('');
    },

    /* ==================================================
       GET DOCTOR SERVICES FROM UNIFIED KEY
       ================================================== */

    getDoctorServicesFromUnifiedKey: function (doctorId) {
      if (!doctorId) return [];
      const services = this.readJSON(localStorage, "monmedecin-doctor-services", []);
      if (!Array.isArray(services)) return [];
      return services.filter(function (s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId) && s.active !== false;
      });
    },

    /* ==================================================
       CHECK DOCTOR HAS SCHEDULE
       ================================================== */

    doctorHasSchedule: function (doctorId) {
      if (!doctorId) return false;
      const schedules = this.readJSON(localStorage, "monmedecin-doctor-schedules", []);
      if (!Array.isArray(schedules)) return false;
      const schedule = schedules.find(function (s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId);
      });
      if (!schedule) return false;
      const days = schedule.days || schedule.week || schedule.weeklySchedule || {};
      return Object.values(days).some(function (day) {
        return day && day.enabled !== false;
      });
    },

    /* ==================================================
       TEXT NORMALIZATION
       ================================================== */

    normalizeText: function (value) {
      if (window.MedicalSpecialties && typeof window.MedicalSpecialties.normalizeText === "function") {
        return window.MedicalSpecialties.normalizeText(value);
      }
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
       NORMALIZE DOCTOR
       ================================================== */

    normalizeDoctor: function (doctor, index) {
      if (!doctor || typeof doctor !== "object") return null;

      const professional = doctor.professional && typeof doctor.professional === "object" ? doctor.professional : {};
      const doctorId = doctor.id || doctor.doctor_id;

      let services = this.getDoctorServicesFromUnifiedKey(doctorId);
      if (services.length === 0) {
        services = Array.isArray(professional.services) ? professional.services : (Array.isArray(doctor.services) ? doctor.services : []);
      }

      const activeServices = services.filter(function (service) {
        return service && service.active !== false;
      });

      const prices = activeServices.map(function (service) {
        return Number(service.price);
      }).filter(function (price) {
        return Number.isFinite(price) && price >= 0;
      });

      const minPrice = prices.length ? Math.min(...prices) : Number(doctor.price ?? professional.price ?? 0) || 0;

      const specialtyValue = professional.specialty ?? doctor.specialty ?? "";
      let specialtyObject = null;
      if (window.MedicalSpecialties && typeof window.MedicalSpecialties.resolve === "function") {
        specialtyObject = window.MedicalSpecialties.resolve(specialtyValue);
      }

      const specialtyId = specialtyObject ? specialtyObject.id : String(specialtyValue || "");
      const specialtyName = specialtyObject ? specialtyObject.nameAr : String(specialtyValue || "");

      const hasSchedule = this.doctorHasSchedule(doctorId);
      const isAvailable = doctor.available !== false &&
        doctor.acceptingBookings !== false &&
        doctor.active !== false &&
        activeServices.length > 0 &&
        hasSchedule;

      return {
        ...doctor,
        id: doctor.id || `DOCTOR-${index + 1}`,
        fullName: doctor.fullName ?? doctor.name ?? professional.title ?? "طبيب",
        specialty: specialtyName,
        specialtyId: specialtyId,
        clinic: professional.clinic ?? doctor.clinic ?? "",
        wilaya: professional.wilaya ?? doctor.wilaya ?? "",
        commune: professional.commune ?? doctor.commune ?? "",
        address: professional.address ?? doctor.address ?? "",
        bio: professional.bio ?? doctor.bio ?? "",
        experienceYears: Number(professional.experienceYears ?? doctor.experienceYears ?? 0) || 0,
        rating: Number(doctor.rating ?? professional.rating ?? 0) || 0,
        reviewsCount: Number(doctor.reviewsCount ?? doctor.reviewCount ?? professional.reviewsCount ?? 0) || 0,
        active: doctor.active !== false,
        publicVisible: professional.publicVisible !== false && doctor.publicVisible !== false,
        approved: doctor.approved !== false && doctor.status !== "rejected",
        available: isAvailable,
        hasSchedule: hasSchedule,
        services: activeServices,
        minPrice: minPrice,
        professional: {
          ...professional,
          specialty: specialtyName,
          services: activeServices
        }
      };
    },

    /* ==================================================
       LOAD DOCTORS
       ================================================== */

    loadDoctors: function () {
      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) doctors = [];

      const currentDoctor = this.readJSON(localStorage, "monmedecin-doctor", null);
      if (currentDoctor && typeof currentDoctor === "object") {
        const exists = doctors.some(function (doctor) {
          return String(doctor.id) === String(currentDoctor.id);
        });
        if (!exists) doctors.push(currentDoctor);
      }

      this.doctors = doctors.map(function (doctor, index) {
        return PatientSearchScreen.normalizeDoctor(doctor, index);
      }).filter(function (doctor) {
        return Boolean(doctor);
      }).filter(function (doctor) {
        return doctor.publicVisible !== false && doctor.approved !== false;
      });

      this.filteredDoctors = this.doctors.slice();
      return this.doctors;
    },

    /* ==================================================
       ALGERIA DATA
       ================================================== */

    getWilayas: function () {
      if (!window.AlgeriaLocations || !Array.isArray(window.AlgeriaLocations.wilayas)) return [];
      return window.AlgeriaLocations.wilayas;
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
       FILTER LOGIC
       ================================================== */

    doctorMatchesQuery: function (doctor, query) {
      if (!query) return true;
      const normalizedQuery = this.normalizeText(query);

      const searchable = [
        doctor.fullName,
        doctor.specialty,
        doctor.specialtyId,
        doctor.clinic,
        doctor.wilaya,
        doctor.commune,
        doctor.address,
        doctor.bio
      ];

      doctor.services.forEach(function (service) {
        searchable.push(service.name);
      });

      const directMatch = searchable.some(function (value) {
        return PatientSearchScreen.normalizeText(value).includes(normalizedQuery);
      });

      if (directMatch) return true;

      if (window.MedicalSpecialties && typeof window.MedicalSpecialties.search === "function") {
        const matchedSpecialties = window.MedicalSpecialties.search(query);
        return matchedSpecialties.some(function (specialty) {
          return String(specialty.id) === String(doctor.specialtyId) ||
            PatientSearchScreen.normalizeText(specialty.nameAr) === PatientSearchScreen.normalizeText(doctor.specialty);
        });
      }

      return false;
    },

    doctorMatchesSpecialty: function (doctor) {
      if (!this.filters.specialty) return true;
      const selected = String(this.filters.specialty);

      if (String(doctor.specialtyId) === selected) return true;

      if (window.MedicalSpecialties && typeof window.MedicalSpecialties.resolve === "function") {
        const specialty = window.MedicalSpecialties.resolve(selected);
        if (specialty) {
          return String(doctor.specialtyId) === String(specialty.id);
        }
      }

      return this.normalizeText(doctor.specialty) === this.normalizeText(selected);
    },

    doctorMatchesWilaya: function (doctor) {
      if (!this.filters.wilaya) return true;
      const wilaya = this.findWilaya(this.filters.wilaya);
      const expected = wilaya ? wilaya.name : this.filters.wilaya;
      return this.normalizeText(doctor.wilaya) === this.normalizeText(expected);
    },

    doctorMatchesCommune: function (doctor) {
      if (!this.filters.commune) return true;
      return this.normalizeText(doctor.commune) === this.normalizeText(this.filters.commune);
    },

    doctorMatchesRating: function (doctor) {
      if (!this.filters.minRating) return true;
      return Number(doctor.rating) >= Number(this.filters.minRating);
    },

    doctorMatchesPrice: function (doctor) {
      if (!this.filters.maxPrice) return true;
      return Number(doctor.minPrice) <= Number(this.filters.maxPrice);
    },

    doctorMatchesAvailability: function (doctor) {
      if (!this.filters.availability) return true;
      if (this.filters.availability === "available") {
        return doctor.available === true;
      }
      return true;
    },

    applyFilters: function () {
      this.filteredDoctors = this.doctors.filter(function (doctor) {
        return (
          PatientSearchScreen.doctorMatchesQuery(doctor, PatientSearchScreen.filters.query) &&
          PatientSearchScreen.doctorMatchesSpecialty(doctor) &&
          PatientSearchScreen.doctorMatchesWilaya(doctor) &&
          PatientSearchScreen.doctorMatchesCommune(doctor) &&
          PatientSearchScreen.doctorMatchesRating(doctor) &&
          PatientSearchScreen.doctorMatchesPrice(doctor) &&
          PatientSearchScreen.doctorMatchesAvailability(doctor)
        );
      }).sort(function (a, b) {
        if (a.available !== b.available) return a.available ? -1 : 1;
        if (Number(b.rating) !== Number(a.rating)) return Number(b.rating) - Number(a.rating);
        return Number(a.minPrice) - Number(b.minPrice);
      });

      return this.filteredDoctors;
    },

    /* ==================================================
       FORMAT
       ================================================== */

    formatPrice: function (value) {
      try {
        return new Intl.NumberFormat("fr-DZ").format(Number(value) || 0);
      } catch (error) {
        return String(Number(value) || 0);
      }
    },

    /* ==================================================
       ACTIVE FILTER COUNT
       ================================================== */

    getActiveFilterCount: function () {
      return [
        this.filters.specialty,
        this.filters.wilaya,
        this.filters.commune,
        this.filters.minRating,
        this.filters.maxPrice,
        this.filters.availability
      ].filter(Boolean).length;
    },

    /* ==================================================
       RENDER DOCTOR CARD
       ================================================== */

    renderDoctor: function (doctor) {
      const rating = Number(doctor.rating) || 0;
      const availabilityText = doctor.available ? "متاح للحجز" : (doctor.hasSchedule ? "غير متاح حالياً" : "لا يوجد جدول عمل");

      return `
        <article class="patient-search-doctor glass">
          <div class="patient-search-doctor__top">
            <div class="patient-search-doctor__identity">
              <div class="patient-search-doctor__avatar">
                ${doctor.fullName.replace(/^د\.?\s*/, "").charAt(0)}
              </div>
              <div>
                <span>${doctor.specialty || "طبيب"}</span>
                <h3>${doctor.fullName}</h3>
                <small>${[doctor.commune, doctor.wilaya].filter(Boolean).join("، ") || "الموقع غير محدد"}</small>
              </div>
            </div>
            <span class="patient-search-doctor__availability ${doctor.available ? "is-available" : "is-unavailable"}">
              ${availabilityText}
            </span>
          </div>
          <div class="patient-search-doctor__meta">
            <div>
              <span>التقييم</span>
              <strong>★ ${rating.toFixed(1)}</strong>
              <small>${doctor.reviewsCount} تقييم</small>
            </div>
            <div>
              <span>الخبرة</span>
              <strong>${doctor.experienceYears}</strong>
              <small>سنة</small>
            </div>
            <div>
              <span>ابتداءً من</span>
              <strong>${this.formatPrice(doctor.minPrice)} دج</strong>
              <small>للاستشارة</small>
            </div>
          </div>
          ${doctor.clinic ? `
            <div class="patient-search-doctor__clinic">
              <span>العيادة</span>
              <strong>${doctor.clinic}</strong>
            </div>
          ` : ""}
          ${doctor.services.length ? `
            <div class="patient-search-doctor__services">
              ${doctor.services.slice(0, 3).map(function (service) {
                return `<span>${service.name || "خدمة"}</span>`;
              }).join("")}
            </div>
          ` : ""}
          <button class="patient-search-doctor__open" data-patient-search-doctor="${doctor.id}" type="button" ${!doctor.available ? 'disabled style="opacity:0.6;"' : ''}>
            ${doctor.available ? "عرض الطبيب" : "غير متاح حالياً"}
          </button>
        </article>
      `;
    },

    /* ==================================================
       RENDER DOCTORS LIST
       ================================================== */

    renderDoctors: function () {
      if (this.filteredDoctors.length === 0) {
        return `
          <section class="patient-search-empty glass">
            <span>⌕</span>
            <h3>لم نجد طبيبًا مطابقًا</h3>
            <p>جرّب تعديل التخصص أو الولاية أو البلدية أو إزالة بعض الفلاتر.</p>
            <button id="patientSearchResetEmpty" type="button">مسح الفلاتر</button>
          </section>
        `;
      }
      return this.filteredDoctors.map(function (doctor) {
        return PatientSearchScreen.renderDoctor(doctor);
      }).join("");
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadDoctors();
      this.applyFilters();
      const isMobile = state.deviceMode === 'mobile';

      return `
        <main class="patient-search ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="patient-search__orb patient-search__orb--blue"></div>
          <div class="patient-search__orb patient-search__orb--cyan"></div>

          <header class="patient-search__header">
            <button id="patientSearchBack" class="patient-search__back" type="button">→</button>
            <div class="patient-search__header-copy">
              <strong>البحث عن طبيب</strong>
              <span>Mon Médecin</span>
            </div>
            <button id="patientSearchTheme" class="patient-search__theme" type="button">◐</button>
          </header>

          <section class="patient-search__container">

            <section class="patient-search-main glass">
              <div class="patient-search-main__icon">⌕</div>
              <input id="patientSearchQuery" type="search" value="${this.filters.query}" placeholder="اسم الطبيب أو التخصص..." autocomplete="off">
              <button id="patientSearchFilterToggle" class="patient-search-main__filter" type="button">
                فلترة
                ${this.getActiveFilterCount() ? `<span>${this.getActiveFilterCount()}</span>` : ""}
              </button>
            </section>

            <section id="patientSearchFilters" class="patient-search-filters glass ${this.getActiveFilterCount() ? "is-open" : ""}">
              <div class="patient-search-filters__heading">
                <div>
                  <span>فلترة النتائج</span>
                  <h2>ابحث بدقة</h2>
                </div>
                <button id="patientSearchReset" type="button">مسح</button>
              </div>
              <div class="patient-search-filters__grid">
                <label class="patient-search-field">
                  <span>التخصص الطبي</span>
                  <select id="patientSearchSpecialty">
                    <option value="">كل التخصصات</option>
                    ${this.renderSpecialtyOptions()}
                  </select>
                </label>
                <label class="patient-search-field">
                  <span>الولاية</span>
                  <select id="patientSearchWilaya">
                    <option value="">كل الولايات</option>
                    ${this.renderWilayaOptions()}
                  </select>
                </label>
                <label class="patient-search-field">
                  <span>البلدية</span>
                  <select id="patientSearchCommune" ${!this.filters.wilaya ? "disabled" : ""}>
                    <option value="">${this.filters.wilaya ? "كل البلديات" : "اختر الولاية أولاً"}</option>
                    ${this.renderCommuneOptions()}
                  </select>
                </label>
                <label class="patient-search-field">
                  <span>أقل تقييم</span>
                  <select id="patientSearchRating">
                    <option value="">كل التقييمات</option>
                    <option value="3" ${this.filters.minRating === "3" ? "selected" : ""}>3 نجوم فأكثر</option>
                    <option value="4" ${this.filters.minRating === "4" ? "selected" : ""}>4 نجوم فأكثر</option>
                    <option value="4.5" ${this.filters.minRating === "4.5" ? "selected" : ""}>4.5 فأكثر</option>
                  </select>
                </label>
                <label class="patient-search-field">
                  <span>السعر الأقصى</span>
                  <select id="patientSearchPrice">
                    <option value="">أي سعر</option>
                    <option value="1000" ${this.filters.maxPrice === "1000" ? "selected" : ""}>حتى 1000 دج</option>
                    <option value="1500" ${this.filters.maxPrice === "1500" ? "selected" : ""}>حتى 1500 دج</option>
                    <option value="2000" ${this.filters.maxPrice === "2000" ? "selected" : ""}>حتى 2000 دج</option>
                    <option value="3000" ${this.filters.maxPrice === "3000" ? "selected" : ""}>حتى 3000 دج</option>
                    <option value="5000" ${this.filters.maxPrice === "5000" ? "selected" : ""}>حتى 5000 دج</option>
                  </select>
                </label>
                <label class="patient-search-field">
                  <span>التوفر</span>
                  <select id="patientSearchAvailability">
                    <option value="">الكل</option>
                    <option value="available" ${this.filters.availability === "available" ? "selected" : ""}>المتاحون للحجز فقط</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="patient-search-results__head">
              <div>
                <span>نتائج البحث</span>
                <h2>الأطباء</h2>
              </div>
              <strong id="patientSearchCount">${this.filteredDoctors.length}</strong>
            </section>

            <section id="patientSearchResults" class="patient-search-results">
              ${this.renderDoctors()}
            </section>

          </section>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="home" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="search" type="button">
                <span class="mobile-bottom-nav__icon">⌕</span>
                <span>البحث</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>حجوزاتي</span>
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
       UPDATE COMMUNES
       ================================================== */

    updateCommuneOptions: function () {
      const commune = document.getElementById("patientSearchCommune");
      if (!commune) return;

      if (!this.filters.wilaya) {
        commune.disabled = true;
        commune.innerHTML = `<option value="">اختر الولاية أولاً</option>`;
        return;
      }

      const communes = this.getCommunes(this.filters.wilaya);
      commune.disabled = false;
      commune.innerHTML = `
        <option value="">كل البلديات</option>
        ${communes.map(function (name) {
          return `<option value="${name}">${name}</option>`;
        }).join("")}
      `;
    },

    /* ==================================================
       REFRESH RESULTS
       ================================================== */

    refreshResults: function (app) {
      this.applyFilters();
      const results = document.getElementById("patientSearchResults");
      const count = document.getElementById("patientSearchCount");
      if (results) results.innerHTML = this.renderDoctors();
      if (count) count.textContent = String(this.filteredDoctors.length);
      this.bindDynamicButtons(app);
    },

    /* ==================================================
       RESET FILTERS
       ================================================== */

    resetFilters: function () {
      this.filters = {
        query: "",
        specialty: "",
        wilaya: "",
        commune: "",
        minRating: "",
        maxPrice: "",
        availability: ""
      };
    },

    /* ==================================================
       OPEN DOCTOR
       ================================================== */

    openDoctor: function (doctorId, app) {
      const doctor = this.doctors.find(function (item) {
        return String(item.id) === String(doctorId);
      });
      if (!doctor) return;
      if (!doctor.available) {
        window.alert("هذا الطبيب غير متاح للحجز حالياً.");
        return;
      }
      if (typeof app.selectDoctor === "function") {
        app.selectDoctor(doctor);
      } else {
        app.state.selectedDoctor = doctor;
        try {
          sessionStorage.setItem("monmedecin-selected-doctor", JSON.stringify(doctor));
        } catch (error) { /* no-op */ }
      }
      app.navigate("/patient/doctor");
    },

    /* ==================================================
       DYNAMIC BUTTONS
       ================================================== */

    bindDynamicButtons: function (app) {
      const results = document.getElementById("patientSearchResults");
      if (!results) return;
      if (results.dataset.bound === "true") return;
      results.dataset.bound = "true";

      results.addEventListener("click", function (event) {
        const doctorButton = event.target.closest("[data-patient-search-doctor]");
        if (doctorButton && app) {
          PatientSearchScreen.openDoctor(doctorButton.dataset.patientSearchDoctor, app);
          return;
        }
        const reset = event.target.closest("#patientSearchResetEmpty");
        if (reset && app) {
          PatientSearchScreen.resetFilters();
          app.render();
        }
      });
    },

    /* ==================================================
       RENDER WILAYAS
       ================================================== */

    renderWilayaOptions: function () {
      return this.getWilayas().map(function (wilaya) {
        const selected = String(wilaya.code) === String(PatientSearchScreen.filters.wilaya);
        return `<option value="${wilaya.code}" ${selected ? "selected" : ""}>${wilaya.name}</option>`;
      }).join("");
    },

    /* ==================================================
       RENDER COMMUNES
       ================================================== */

    renderCommuneOptions: function () {
      return this.getCommunes(this.filters.wilaya).map(function (commune) {
        const selected = String(commune) === String(PatientSearchScreen.filters.commune);
        return `<option value="${commune}" ${selected ? "selected" : ""}>${commune}</option>`;
      }).join("");
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      /* BACK */
      document.getElementById("patientSearchBack")?.addEventListener("click", function () {
        app.navigate("/patient/home");
      });

      /* THEME */
      document.getElementById("patientSearchTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      /* FILTER TOGGLE */
      document.getElementById("patientSearchFilterToggle")?.addEventListener("click", function () {
        document.getElementById("patientSearchFilters")?.classList.toggle("is-open");
      });

      /* SEARCH QUERY */
      const query = document.getElementById("patientSearchQuery");
      query?.addEventListener("input", function () {
        PatientSearchScreen.filters.query = query.value;
        PatientSearchScreen.refreshResults(app);
      });

      /* SPECIALTY */
      document.getElementById("patientSearchSpecialty")?.addEventListener("change", function (event) {
        PatientSearchScreen.filters.specialty = event.target.value;
        PatientSearchScreen.refreshResults(app);
      });

      /* WILAYA */
      document.getElementById("patientSearchWilaya")?.addEventListener("change", function (event) {
        PatientSearchScreen.filters.wilaya = event.target.value;
        PatientSearchScreen.filters.commune = "";
        PatientSearchScreen.updateCommuneOptions();
        PatientSearchScreen.refreshResults(app);
      });

      /* COMMUNE */
      document.getElementById("patientSearchCommune")?.addEventListener("change", function (event) {
        PatientSearchScreen.filters.commune = event.target.value;
        PatientSearchScreen.refreshResults(app);
      });

      /* RATING */
      document.getElementById("patientSearchRating")?.addEventListener("change", function (event) {
        PatientSearchScreen.filters.minRating = event.target.value;
        PatientSearchScreen.refreshResults(app);
      });

      /* PRICE */
      document.getElementById("patientSearchPrice")?.addEventListener("change", function (event) {
        PatientSearchScreen.filters.maxPrice = event.target.value;
        PatientSearchScreen.refreshResults(app);
      });

      /* AVAILABILITY */
      document.getElementById("patientSearchAvailability")?.addEventListener("change", function (event) {
        PatientSearchScreen.filters.availability = event.target.value;
        PatientSearchScreen.refreshResults(app);
      });

      /* RESET */
      document.getElementById("patientSearchReset")?.addEventListener("click", function () {
        PatientSearchScreen.resetFilters();
        app.render();
      });

      /* RESULTS */
      this.bindDynamicButtons(app);

      /* BOTTOM NAV */
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

  window.PatientSearchScreen = PatientSearchScreen;

})();