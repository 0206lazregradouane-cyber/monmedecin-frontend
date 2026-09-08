/* =====================================================
   MON MÉDECIN
   PATIENT FAVORITES - FIXED (WITH BOTTOM NAV)
   ===================================================== */

(function () {
  "use strict";

  const PatientFavoritesScreen = {
    /* ==================================================
       STATE
       ================================================== */

    favorites: [],
    filteredFavorites: [],
    searchQuery: "",
    messageTimer: null,

    /* ==================================================
       STORAGE
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
       PATIENT
       ================================================== */

    getPatientId: function (app) {
      return (
        app.state.patient?.id ||
        app.state.patient?.patient_id ||
        app.state.user?.id ||
        "guest"
      );
    },

    getFavoritesKey: function (app) {
      return "monmedecin-patient-favorites-" + this.getPatientId(app);
    },

    /* ==================================================
       LOAD FAVORITES
       ================================================== */

    loadFavorites: function (app) {
      const key = this.getFavoritesKey(app);
      this.favorites = this.readJSON(localStorage, key, []);

      if (!Array.isArray(this.favorites)) {
        this.favorites = [];
      }

      // ترتيب حسب تاريخ الإضافة (الأحدث أولاً)
      this.favorites.sort(function (a, b) {
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      });

      this.applyFilters();
      return this.favorites;
    },

    /* ==================================================
       SAVE FAVORITES
       ================================================== */

    saveFavorites: function (app) {
      const key = this.getFavoritesKey(app);
      return this.writeJSON(localStorage, key, this.favorites);
    },

    /* ==================================================
       REMOVE FAVORITE
       ================================================== */

    removeFavorite: function (doctorId, app) {
      const initialLength = this.favorites.length;

      this.favorites = this.favorites.filter(function (item) {
        return String(item.id) !== String(doctorId);
      });

      if (this.favorites.length === initialLength) {
        this.showMessage("لم يتم العثور على الطبيب في المفضلة.", "error");
        return false;
      }

      const saved = this.saveFavorites(app);
      if (!saved) {
        this.showMessage("تعذر حفظ التغييرات.", "error");
        return false;
      }

      this.applyFilters();
      this.refresh(app);
      this.showMessage("تم إزالة الطبيب من المفضلة.", "success");
      return true;
    },

    /* ==================================================
       APPLY FILTERS
       ================================================== */

    applyFilters: function () {
      const query = String(this.searchQuery || "").trim().toLowerCase();

      if (!query) {
        this.filteredFavorites = this.favorites.slice();
        return;
      }

      this.filteredFavorites = this.favorites.filter(function (item) {
        const searchable = [
          item.fullName,
          item.specialty,
          item.wilaya,
          item.commune,
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      });
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

    formatDate: function (value) {
      if (!value) return "—";
      try {
        return new Intl.DateTimeFormat("ar-DZ", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(value));
      } catch (error) {
        return value;
      }
    },

    getStars: function (rating) {
      const full = Math.floor(rating);
      const half = rating - full >= 0.5;
      let stars = "";
      for (let i = 0; i < full; i++) stars += "★";
      if (half) stars += "½";
      while (stars.length < 5) stars += "☆";
      return stars;
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("patientFavoritesMessage");
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
      }, 3000);
    },

    /* ==================================================
       RENDER FAVORITE CARD
       ================================================== */

    renderFavorite: function (favorite) {
      const rating = Number(favorite.rating) || 0;
      const stars = this.getStars(rating);

      return `
        <article class="patient-favorite-card glass">

          <div class="patient-favorite-card__top">

            <div class="patient-favorite-card__doctor">

              <div class="patient-favorite-card__avatar">
                ${this.escapeHTML(String(favorite.fullName || "ط").charAt(0))}
              </div>

              <div>
                <span>${this.escapeHTML(favorite.specialty || "طبيب")}</span>
                <h3>${this.escapeHTML(favorite.fullName || "طبيب")}</h3>
                <small>
                  ${this.escapeHTML(
                    [favorite.commune, favorite.wilaya]
                      .filter(Boolean)
                      .join("، ") || "الموقع غير محدد"
                  )}
                </small>
              </div>

            </div>

            <button
              class="patient-favorite-remove"
              data-favorite-remove="${this.escapeHTML(favorite.id)}"
              type="button"
              aria-label="إزالة من المفضلة"
            >
              ♥
            </button>

          </div>

          <div class="patient-favorite-card__meta">

            <div>
              <span>التقييم</span>
              <strong>${stars} ${rating.toFixed(1)}</strong>
            </div>

            <div>
              <span>الخبرة</span>
              <strong>${favorite.experienceYears || 0} سنة</strong>
            </div>

            <div>
              <span>أضيف في</span>
              <strong>${this.formatDate(favorite.addedAt)}</strong>
            </div>

          </div>

          <div class="patient-favorite-card__actions">

            <button
              class="is-view"
              data-favorite-view="${this.escapeHTML(favorite.id)}"
              type="button"
            >
              عرض الملف
            </button>

            <button
              class="is-book"
              data-favorite-book="${this.escapeHTML(favorite.id)}"
              type="button"
            >
              حجز موعد
            </button>

          </div>

        </article>
      `;
    },

    /* ==================================================
       RENDER LIST
       ================================================== */

    renderFavorites: function () {
      if (this.filteredFavorites.length === 0) {
        const hasFavorites = this.favorites.length > 0;

        return `
          <section class="patient-favorites-empty glass">

            <span>${hasFavorites ? "🔍" : "❤️"}</span>

            <h3>
              ${hasFavorites
                ? "لا توجد نتائج مطابقة"
                : "لا توجد أطباء في المفضلة"
              }
            </h3>

            <p>
              ${hasFavorites
                ? "لم نجد أطباء مطابقين للبحث الحالي."
                : "أضف الأطباء الذين تثق بهم إلى المفضلة للوصول السريع."
              }
            </p>

            ${!hasFavorites ? `
              <button
                id="patientFavoritesGoSearch"
                type="button"
              >
                البحث عن طبيب
              </button>
            ` : `
              <button
                id="patientFavoritesClearSearch"
                type="button"
              >
                مسح البحث
              </button>
            `}

          </section>
        `;
      }

      return this.filteredFavorites
        .map(function (favorite) {
          return PatientFavoritesScreen.renderFavorite(favorite);
        })
        .join("");
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadFavorites(app);

      const isMobile = state.deviceMode === "mobile";

      return `
        <main
          class="patient-favorites ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}"
        >

          <!-- ORBS -->
          <div class="patient-favorites__orb patient-favorites__orb--blue"></div>
          <div class="patient-favorites__orb patient-favorites__orb--cyan"></div>

          <!-- HEADER -->
          <header class="patient-favorites__header">

            <button
              id="patientFavoritesBack"
              class="patient-favorites__back"
              type="button"
            >
              →
            </button>

            <div class="patient-favorites__header-copy">
              <strong>المفضلة</strong>
              <span>أطبائي المفضلون</span>
            </div>

            <button
              id="patientFavoritesTheme"
              class="patient-favorites__theme"
              type="button"
            >
              ${state.theme === "dark" ? "☀" : "◐"}
            </button>

          </header>

          <!-- CONTENT -->
          <section class="patient-favorites__container">

            <!-- HERO -->
            <section class="patient-favorites__hero">
              <span>❤️</span>
              <h1>الأطباء المفضلون</h1>
              <p>
                الأطباء الذين حفظتهم للوصول السريع وحجز المواعيد بسهولة.
              </p>
            </section>

            <!-- STATS -->
            <section class="patient-favorites-stats">

              <article class="patient-favorites-stat glass">
                <span>الأطباء المفضلون</span>
                <strong>${this.favorites.length}</strong>
              </article>

              <article class="patient-favorites-stat glass">
                <span>متاحون للحجز</span>
                <strong>
                  ${this.favorites.filter(function (f) {
                    return f.available !== false;
                  }).length}
                </strong>
              </article>

            </section>

            <!-- SEARCH -->
            <section class="patient-favorites-search glass">

              <div class="patient-favorites-search__main">
                <span>⌕</span>
                <input
                  id="patientFavoritesSearch"
                  type="search"
                  value="${this.escapeHTML(this.searchQuery)}"
                  placeholder="ابحث في المفضلة..."
                  autocomplete="off"
                />
              </div>

            </section>

            <!-- MESSAGE -->
            <div
              id="patientFavoritesMessage"
              class="patient-favorites-message"
              style="display:none;padding:12px 14px;border-radius:14px;font-size:10px;font-weight:850;line-height:1.6;margin-bottom:14px;"
            ></div>

            <!-- RESULTS HEAD -->
            <section class="patient-favorites-results__head">

              <div>
                <span>المفضلة</span>
                <h2>أطبائي المفضلون</h2>
              </div>

              <strong id="patientFavoritesCount">
                ${this.filteredFavorites.length}
              </strong>

            </section>

            <!-- RESULTS -->
            <section
              id="patientFavoritesResults"
              class="patient-favorites-results"
            >
              ${this.renderFavorites()}
            </section>

          </section>

          <!-- BOTTOM NAV - FIXED -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">

              <button
                class="mobile-bottom-nav__item"
                data-nav="home"
                type="button"
              >
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>

              <button
                class="mobile-bottom-nav__item"
                data-nav="search"
                type="button"
              >
                <span class="mobile-bottom-nav__icon">⌕</span>
                <span>البحث</span>
              </button>

              <button
                class="mobile-bottom-nav__item is-active"
                data-nav="favorites"
                type="button"
              >
                <span class="mobile-bottom-nav__icon">❤️</span>
                <span>المفضلة</span>
              </button>

              <button
                class="mobile-bottom-nav__item"
                data-nav="profile"
                type="button"
              >
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>حسابي</span>
              </button>

            </nav>
          ` : ""}

        </main>
      `;
    },

    /* ==================================================
       REFRESH
       ================================================== */

    refresh: function (app) {
      const results = document.getElementById("patientFavoritesResults");
      const count = document.getElementById("patientFavoritesCount");

      if (results) {
        results.innerHTML = this.renderFavorites();
      }

      if (count) {
        count.textContent = String(this.filteredFavorites.length);
      }
    },

    /* ==================================================
       OPEN DOCTOR
       ================================================== */

    openDoctor: function (doctorId, app) {
      const favorite = this.favorites.find(function (f) {
        return String(f.id) === String(doctorId);
      });

      if (!favorite) {
        this.showMessage("لم يتم العثور على الطبيب.", "error");
        return;
      }

      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) {
        doctors = [];
      }

      const doctor = doctors.find(function (d) {
        return String(d.id) === String(doctorId);
      });

      if (!doctor) {
        this.showMessage("بيانات الطبيب غير مكتملة.", "error");
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
       BOOK DOCTOR
       ================================================== */

    bookDoctor: function (doctorId, app) {
      const favorite = this.favorites.find(function (f) {
        return String(f.id) === String(doctorId);
      });

      if (!favorite) {
        this.showMessage("لم يتم العثور على الطبيب.", "error");
        return;
      }

      if (favorite.available === false) {
        this.showMessage("هذا الطبيب غير متاح للحجز حالياً.", "error");
        return;
      }

      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) {
        doctors = [];
      }

      const doctor = doctors.find(function (d) {
        return String(d.id) === String(doctorId);
      });

      if (!doctor) {
        this.showMessage("بيانات الطبيب غير مكتملة.", "error");
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

      app.navigate("/patient/booking");
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      this.loadFavorites(app);

      // BACK
      document.getElementById("patientFavoritesBack")?.addEventListener("click", function () {
        app.navigate("/patient/home");
      });

      // THEME
      document.getElementById("patientFavoritesTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // SEARCH
      document.getElementById("patientFavoritesSearch")?.addEventListener("input", function (event) {
        PatientFavoritesScreen.searchQuery = event.target.value;
        PatientFavoritesScreen.applyFilters();
        PatientFavoritesScreen.refresh(app);
      });

      // GO SEARCH
      document.getElementById("patientFavoritesGoSearch")?.addEventListener("click", function () {
        app.navigate("/patient/search");
      });

      // CLEAR SEARCH
      document.getElementById("patientFavoritesClearSearch")?.addEventListener("click", function () {
        PatientFavoritesScreen.searchQuery = "";
        const searchInput = document.getElementById("patientFavoritesSearch");
        if (searchInput) {
          searchInput.value = "";
        }
        PatientFavoritesScreen.applyFilters();
        PatientFavoritesScreen.refresh(app);
      });

      // RESULTS
      document.getElementById("patientFavoritesResults")?.addEventListener("click", function (event) {
        // REMOVE
        const remove = event.target.closest("[data-favorite-remove]");
        if (remove) {
          const doctorId = remove.dataset.favoriteRemove;
          const confirmed = window.confirm("هل تريد إزالة هذا الطبيب من المفضلة؟");
          if (confirmed) {
            PatientFavoritesScreen.removeFavorite(doctorId, app);
          }
          return;
        }

        // VIEW
        const view = event.target.closest("[data-favorite-view]");
        if (view) {
          PatientFavoritesScreen.openDoctor(view.dataset.favoriteView, app);
          return;
        }

        // BOOK
        const book = event.target.closest("[data-favorite-book]");
        if (book) {
          PatientFavoritesScreen.bookDoctor(book.dataset.favoriteBook, app);
          return;
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
      document.querySelectorAll("[data-nav='favorites']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/favorites");
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

  window.PatientFavoritesScreen = PatientFavoritesScreen;
  window.FavoritesScreen = PatientFavoritesScreen;

})();