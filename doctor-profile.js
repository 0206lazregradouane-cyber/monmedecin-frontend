/* =====================================================
   MON MÉDECIN
   PUBLIC DOCTOR PROFILE - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const DoctorProfileScreen = {


    /* ==================================================
       STATE
       ================================================== */

    doctor: null,

    services: [],

    selectedServiceId: null,

    isFavorite: false,


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

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN:", "Cannot save", key);
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
       GET SERVICES FROM UNIFIED KEY
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
       LOAD SELECTED DOCTOR
       ================================================== */

    loadDoctor: function (state) {
      let doctor = null;

      if (state && state.selectedDoctor && typeof state.selectedDoctor === "object") {
        doctor = state.selectedDoctor;
      }

      if (!doctor) {
        doctor = this.readJSON(sessionStorage, "monmedecin-selected-doctor", null);
      }

      if (!doctor) {
        const selectedId = sessionStorage.getItem("monmedecin-selected-doctor-id");
        if (selectedId) {
          const doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
          if (Array.isArray(doctors)) {
            doctor = doctors.find(function (item) {
              return String(item.id) === String(selectedId);
            }) || null;
          }
        }
      }

      if (!doctor) {
        doctor = {
          id: "demo-doctor",
          fullName: "د. أحمد بن عمر",
          specialty: "الطب العام",
          clinic: "عيادة Mon Médecin",
          wilaya: "بسكرة",
          commune: "بسكرة",
          address: "",
          rating: 4.8,
          reviewsCount: 35,
          experienceYears: 8,
          available: true,
          active: true,
          professional: {
            publicVisible: true,
            title: "د. أحمد بن عمر",
            specialty: "الطب العام",
            clinic: "عيادة Mon Médecin",
            wilaya: "بسكرة",
            commune: "بسكرة",
            address: "",
            experienceYears: 8,
            bio: "طبيب عام يقدم الاستشارات الطبية والمتابعة الصحية.",
            languages: { ar: true, fr: true, en: false },
            services: [
              { id: "consultation", name: "استشارة طبية", duration: 30, price: 2500, active: true }
            ]
          }
        };
      }

      const doctorId = doctor.id || doctor.doctor_id;

      // Try to get services from unified key
      const unifiedServices = this.getDoctorServicesFromUnifiedKey(doctorId);

      if (unifiedServices.length > 0) {
        doctor.services = unifiedServices;
      } else {
        const professional = doctor.professional || {};
        const embeddedServices = Array.isArray(professional.services)
          ? professional.services
          : (Array.isArray(doctor.services) ? doctor.services : []);
        doctor.services = embeddedServices;
      }

      this.doctor = this.normalizeDoctor(doctor);
      this.services = this.doctor.services;
      return this.doctor;
    },


    /* ==================================================
       RESOLVE SPECIALTY
       ================================================== */

    resolveSpecialty: function (value) {
      if (window.MedicalSpecialties && typeof window.MedicalSpecialties.resolve === "function") {
        const result = window.MedicalSpecialties.resolve(value);
        if (result) {
          return { id: result.id, name: result.nameAr, icon: result.icon || "🩺" };
        }
      }
      return { id: String(value || ""), name: String(value || "طبيب"), icon: "🩺" };
    },


    /* ==================================================
       NORMALIZE SERVICE
       ================================================== */

    normalizeService: function (service, index) {
      if (!service || typeof service !== "object") return null;
      return {
        id: service.id || `service-${index + 1}`,
        name: String(service.name || service.title || "خدمة طبية"),
        description: String(service.description || ""),
        duration: Number(service.duration || service.serviceDuration || 30) || 30,
        price: Number(service.price || service.servicePrice || 0) || 0,
        active: service.active !== false
      };
    },


    /* ==================================================
       NORMALIZE DOCTOR
       ================================================== */

    normalizeDoctor: function (doctor) {
      const professional = doctor.professional && typeof doctor.professional === "object" ? doctor.professional : {};
      const specialty = this.resolveSpecialty(professional.specialty || doctor.specialty || "");

      const rawServices = Array.isArray(doctor.services)
        ? doctor.services
        : (Array.isArray(professional.services) ? professional.services : []);

      const services = rawServices
        .map(function (service, index) {
          return DoctorProfileScreen.normalizeService(service, index);
        })
        .filter(function (service) {
          return service && service.active !== false;
        });

      return {
        ...doctor,
        id: doctor.id || "unknown-doctor",
        fullName: professional.title || doctor.fullName || doctor.name || "طبيب",
        specialty: specialty.name,
        specialtyId: specialty.id,
        specialtyIcon: specialty.icon,
        clinic: professional.clinic || doctor.clinic || "",
        wilaya: professional.wilaya || doctor.wilaya || "",
        commune: professional.commune || doctor.commune || "",
        address: professional.address || doctor.address || "",
        bio: professional.bio || doctor.bio || "",
        experienceYears: Number(professional.experienceYears || doctor.experienceYears || 0) || 0,
        rating: Number(doctor.rating || professional.rating || 0) || 0,
        reviewsCount: Number(doctor.reviewsCount || doctor.reviewCount || professional.reviewsCount || 0) || 0,
        available: doctor.available !== false && doctor.acceptingBookings !== false && doctor.active !== false,
        publicVisible: professional.publicVisible !== false && doctor.publicVisible !== false,
        languages: {
          ar: professional.languages?.ar !== false,
          fr: professional.languages?.fr === true,
          en: professional.languages?.en === true
        },
        services: services,
        professional: {
          ...professional,
          specialty: specialty.name,
          services: services
        }
      };
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
       LOWEST PRICE
       ================================================== */

    getLowestPrice: function () {
      const prices = this.services
        .map(function (service) { return Number(service.price); })
        .filter(function (value) { return Number.isFinite(value) && value >= 0; });

      if (!prices.length) return 0;
      return Math.min(...prices);
    },


    /* ==================================================
       LANGUAGES
       ================================================== */

    getLanguages: function () {
      const languages = [];
      if (this.doctor.languages.ar) languages.push("العربية");
      if (this.doctor.languages.fr) languages.push("Français");
      if (this.doctor.languages.en) languages.push("English");
      return languages;
    },


    /* ==================================================
       FAVORITES
       ================================================== */

    getPatientId: function (state) {
      return state?.patient?.id || state?.user?.id || "guest";
    },

    getFavoritesKey: function (state) {
      return "monmedecin-patient-favorites-" + this.getPatientId(state);
    },

    loadFavoriteState: function (state) {
      const favorites = this.readJSON(localStorage, this.getFavoritesKey(state), []);
      if (!Array.isArray(favorites)) {
        this.isFavorite = false;
        return;
      }
      this.isFavorite = favorites.some(function (item) {
        const id = typeof item === "object" ? item.id : item;
        return String(id) === String(DoctorProfileScreen.doctor.id);
      });
    },

    toggleFavorite: function (state) {
      const key = this.getFavoritesKey(state);
      let favorites = this.readJSON(localStorage, key, []);
      if (!Array.isArray(favorites)) favorites = [];

      const doctorId = String(this.doctor.id);
      const exists = favorites.some(function (item) {
        const id = typeof item === "object" ? item.id : item;
        return String(id) === doctorId;
      });

      if (exists) {
        favorites = favorites.filter(function (item) {
          const id = typeof item === "object" ? item.id : item;
          return String(id) !== doctorId;
        });
        this.isFavorite = false;
      } else {
        favorites.push({
          id: this.doctor.id,
          fullName: this.doctor.fullName,
          specialty: this.doctor.specialty,
          wilaya: this.doctor.wilaya,
          commune: this.doctor.commune,
          rating: this.doctor.rating,
          addedAt: new Date().toISOString()
        });
        this.isFavorite = true;
      }

      this.writeJSON(localStorage, key, favorites);
      return this.isFavorite;
    },


    /* ==================================================
       SELECT SERVICE
       ================================================== */

    selectService: function (serviceId) {
      const exists = this.services.some(function (service) {
        return String(service.id) === String(serviceId);
      });
      if (!exists) return false;
      this.selectedServiceId = serviceId;
      return true;
    },

    getSelectedService: function () {
      if (!this.selectedServiceId) return null;
      return this.services.find(function (service) {
        return String(service.id) === String(this.selectedServiceId);
      }, this) || null;
    },


    /* ==================================================
       BOOK
       ================================================== */

    startBooking: function (app) {
      if (!this.doctor.available) {
        window.alert("الطبيب لا يستقبل حجوزات حاليًا.");
        return;
      }

      let service = this.getSelectedService();

      if (!service && this.services.length === 1) {
        service = this.services[0];
        this.selectedServiceId = service.id;
      }

      if (!service) {
        window.alert("اختر الخدمة الطبية أولًا.");
        const services = document.getElementById("doctorProfileServices");
        services?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      app.state.selectedDoctor = this.doctor;
      app.state.selectedService = service;

      this.writeJSON(sessionStorage, "monmedecin-selected-doctor", this.doctor);
      this.writeJSON(sessionStorage, "monmedecin-selected-service", service);
      sessionStorage.setItem("monmedecin-selected-doctor-id", String(this.doctor.id));

      app.navigate("/patient/booking");
    },


    /* ==================================================
       RENDER SERVICE
       ================================================== */

    renderService: function (service) {
      const selected = String(this.selectedServiceId) === String(service.id);

      return `
        <button class="doctor-public-service glass ${selected ? "is-selected" : ""}" type="button" data-doctor-profile-service="${this.escapeHTML(service.id)}">
          <div class="doctor-public-service__radio">
            <span></span>
          </div>
          <div class="doctor-public-service__content">
            <strong>${this.escapeHTML(service.name)}</strong>
            ${service.description ? `<p>${this.escapeHTML(service.description)}</p>` : ""}
            <div class="doctor-public-service__meta">
              <span>◷ ${service.duration} دقيقة</span>
              <span>${this.formatPrice(service.price)} دج</span>
            </div>
          </div>
        </button>
      `;
    },


    /* ==================================================
       RENDER SERVICES
       ================================================== */

    renderServices: function () {
      if (!this.services.length) {
        return `
          <div class="doctor-public-empty glass">
            <span>🩺</span>
            <strong>لا توجد خدمات متاحة</strong>
            <p>لم يضف الطبيب خدمات قابلة للحجز بعد.</p>
          </div>
        `;
      }

      return this.services.map(function (service) {
        return DoctorProfileScreen.renderService(service);
      }).join("");
    },


    /* ==================================================
       RENDER STARS
       ================================================== */

    renderStars: function () {
      const rating = Math.max(0, Math.min(5, Number(this.doctor.rating) || 0));
      let html = "";
      for (let index = 1; index <= 5; index++) {
        html += `
          <span class="doctor-public-star ${index <= Math.round(rating) ? "is-active" : ""}">★</span>
        `;
      }
      return html;
    },


    /* ==================================================
       REFRESH SERVICES UI
       ================================================== */

    refreshServices: function () {
      const container = document.getElementById("doctorProfileServicesList");
      if (!container) return;
      container.innerHTML = this.renderServices();
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state) {
      this.loadDoctor(state);
      this.loadFavoriteState(state);

      if (!this.selectedServiceId && this.services.length === 1) {
        this.selectedServiceId = this.services[0].id;
      }

      const isMobile = state.deviceMode === "mobile";
      const languages = this.getLanguages();

      return `
        <main class="doctor-public-profile ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-public-profile__orb doctor-public-profile__orb--blue"></div>
          <div class="doctor-public-profile__orb doctor-public-profile__orb--cyan"></div>

          <header class="doctor-public-profile__header">
            <button id="doctorProfileBack" class="doctor-public-profile__back" type="button">→</button>
            <div class="doctor-public-profile__header-copy">
              <strong>ملف الطبيب</strong>
              <span>Mon Médecin</span>
            </div>
            <button id="doctorProfileFavorite" class="doctor-public-profile__favorite ${this.isFavorite ? "is-active" : ""}" type="button" aria-label="المفضلة">
              ${this.isFavorite ? "♥" : "♡"}
            </button>
          </header>

          <section class="doctor-public-profile__container">

            <section class="doctor-public-card glass">
              <div class="doctor-public-card__top">
                <div class="doctor-public-card__avatar">
                  ${this.escapeHTML(this.doctor.fullName.replace(/^د\.?\s*/, "").charAt(0))}
                </div>
                <div class="doctor-public-card__identity">
                  <span>${this.escapeHTML(this.doctor.specialty)}</span>
                  <h1>${this.escapeHTML(this.doctor.fullName)}</h1>
                  <small>${[this.doctor.commune, this.doctor.wilaya].filter(Boolean).map(this.escapeHTML.bind(this)).join("، ") || "الموقع غير محدد"}</small>
                </div>
                <span class="doctor-public-card__availability ${this.doctor.available ? "is-available" : "is-unavailable"}">
                  ${this.doctor.available ? "متاح للحجز" : "غير متاح حاليًا"}
                </span>
              </div>
              <div class="doctor-public-card__rating">
                <div class="doctor-public-stars">${this.renderStars()}</div>
                <strong>${Number(this.doctor.rating).toFixed(1)}</strong>
                <span>(${this.doctor.reviewsCount} تقييم)</span>
              </div>
            </section>

            <section class="doctor-public-stats">
              <article class="doctor-public-stat glass">
                <span>الخبرة</span>
                <strong>${this.doctor.experienceYears}</strong>
                <small>سنة</small>
              </article>
              <article class="doctor-public-stat glass">
                <span>الخدمات</span>
                <strong>${this.services.length}</strong>
                <small>خدمة</small>
              </article>
              <article class="doctor-public-stat glass">
                <span>ابتداءً من</span>
                <strong>${this.formatPrice(this.getLowestPrice())}</strong>
                <small>دج</small>
              </article>
            </section>

            ${this.doctor.clinic || this.doctor.address ? `
              <section class="doctor-public-section glass">
                <div class="doctor-public-section__heading">
                  <span>العيادة</span>
                  <h2>مكان الاستقبال</h2>
                </div>
                ${this.doctor.clinic ? `
                  <div class="doctor-public-info-row">
                    <span>🏥</span>
                    <div>
                      <small>العيادة</small>
                      <strong>${this.escapeHTML(this.doctor.clinic)}</strong>
                    </div>
                  </div>
                ` : ""}
                ${this.doctor.address ? `
                  <div class="doctor-public-info-row">
                    <span>⌖</span>
                    <div>
                      <small>العنوان</small>
                      <strong>${this.escapeHTML(this.doctor.address)}</strong>
                    </div>
                  </div>
                ` : ""}
              </section>
            ` : ""}

            ${this.doctor.bio ? `
              <section class="doctor-public-section glass">
                <div class="doctor-public-section__heading">
                  <span>عن الطبيب</span>
                  <h2>نبذة مهنية</h2>
                </div>
                <p class="doctor-public-bio">${this.escapeHTML(this.doctor.bio)}</p>
              </section>
            ` : ""}

            ${languages.length ? `
              <section class="doctor-public-section glass">
                <div class="doctor-public-section__heading">
                  <span>التواصل</span>
                  <h2>اللغات</h2>
                </div>
                <div class="doctor-public-languages">
                  ${languages.map(function (language) {
                    return `<span>${DoctorProfileScreen.escapeHTML(language)}</span>`;
                  }).join("")}
                </div>
              </section>
            ` : ""}

            <section id="doctorProfileServices" class="doctor-public-profile__section">
              <div class="doctor-public-section__heading">
                <span>الحجز</span>
                <h2>اختر الخدمة</h2>
                <p>اختر الخدمة الطبية قبل متابعة الحجز.</p>
              </div>
              <div id="doctorProfileServicesList" class="doctor-public-services">
                ${this.renderServices()}
              </div>
            </section>

            <section class="doctor-public-booking-info glass">
              <span>i</span>
              <div>
                <strong>الموعد حسب جدول الطبيب</strong>
                <p>بعد اختيار الخدمة ستنتقل لاختيار اليوم والساعة المتاحة حسب جدول العمل والحجوزات الموجودة.</p>
              </div>
            </section>

            <div class="doctor-public-actions">
              <button id="doctorProfileBook" class="doctor-public-actions__book" type="button" ${!this.doctor.available || !this.services.length ? "disabled" : ""}>
                ${!this.doctor.available ? "الحجز غير متاح حاليًا" : (!this.services.length ? "لا توجد خدمات للحجز" : "متابعة الحجز")}
              </button>
            </div>

          </section>

          <!-- BOTTOM NAV - ADDED -->
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
          ` : ""}

        </main>
      `;
    },


    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      const favorite = document.getElementById("doctorProfileFavorite");

      document.getElementById("doctorProfileBack")?.addEventListener("click", function () {
        app.navigate("/patient/search");
      });

      favorite?.addEventListener("click", function () {
        const active = DoctorProfileScreen.toggleFavorite(app.state);
        favorite.classList.toggle("is-active", active);
        favorite.textContent = active ? "♥" : "♡";
      });

      document.getElementById("doctorProfileServicesList")?.addEventListener("click", function (event) {
        const button = event.target.closest("[data-doctor-profile-service]");
        if (!button) return;

        const selected = DoctorProfileScreen.selectService(button.dataset.doctorProfileService);
        if (!selected) return;

        DoctorProfileScreen.refreshServices();
      });

      document.getElementById("doctorProfileBook")?.addEventListener("click", function () {
        DoctorProfileScreen.startBooking(app);
      });

      // BOTTOM NAV - ADDED
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


  window.DoctorProfileScreen = DoctorProfileScreen;

})();