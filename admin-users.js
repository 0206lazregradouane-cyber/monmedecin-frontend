/* =====================================================
   MON MÉDECIN
   ADMIN USERS MANAGEMENT - WITH BOTTOM NAV
   ===================================================== */

(function () {
  "use strict";

  const AdminUsersScreen = {
    /* ==================================================
       STATE
       ================================================== */

    allUsers: [],
    filteredUsers: [],
    selectedTab: "all",
    searchQuery: "",
    selectedUserId: null,
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
       TEXT
       ================================================== */

    normalizeText: function (value) {
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
       🔑 LOAD USERS - استخدام monmedecin-users كمصدر رئيسي
       ================================================== */

    loadUsers: function () {
      // 1. استخدام monmedecin-users كمصدر رئيسي
      let allUsers = this.readJSON(localStorage, "monmedecin-users", []);
      if (!Array.isArray(allUsers)) allUsers = [];
      
      // 2. إذا لم يوجد مستخدمون في monmedecin-users، استخدم المجموعات المنفصلة
      if (allUsers.length === 0) {
        const doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
        const patients = this.readJSON(localStorage, "monmedecin-patients", []);
        const secretaries = this.readJSON(localStorage, "monmedecin-secretaries", []);
        const admins = this.readJSON(localStorage, "monmedecin-admins", []);
        
        // دمج جميع المستخدمين
        if (Array.isArray(doctors)) {
          doctors.forEach(function(user) {
            allUsers.push({
              ...user,
              _role: "doctor",
              _roleLabel: "طبيب",
              _roleClass: "is-doctor",
              _roleIcon: "⚕"
            });
          });
        }
        
        if (Array.isArray(patients)) {
          patients.forEach(function(user) {
            allUsers.push({
              ...user,
              _role: "patient",
              _roleLabel: "مريض",
              _roleClass: "is-patient",
              _roleIcon: "👤"
            });
          });
        }
        
        if (Array.isArray(secretaries)) {
          secretaries.forEach(function(user) {
            allUsers.push({
              ...user,
              _role: "secretary",
              _roleLabel: "سكرتير",
              _roleClass: "is-secretary",
              _roleIcon: "🧑‍💼"
            });
          });
        }
        
        if (Array.isArray(admins)) {
          admins.forEach(function(user) {
            allUsers.push({
              ...user,
              _role: "admin",
              _roleLabel: "مدير",
              _roleClass: "is-admin",
              _roleIcon: "🔷"
            });
          });
        }
      } else {
        // معالجة المستخدمين من monmedecin-users
        allUsers = allUsers.map(function(user) {
          const role = user.role || "patient";
          const roleMap = {
            admin: { label: "مدير", class: "is-admin", icon: "🔷" },
            doctor: { label: "طبيب", class: "is-doctor", icon: "⚕" },
            secretary: { label: "سكرتير", class: "is-secretary", icon: "🧑‍💼" },
            patient: { label: "مريض", class: "is-patient", icon: "👤" }
          };
          const info = roleMap[role] || roleMap.patient;
          return {
            ...user,
            _role: role,
            _roleLabel: info.label,
            _roleClass: info.class,
            _roleIcon: info.icon
          };
        });
      }

      this.allUsers = allUsers;

      this.allUsers.sort(function (a, b) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      this.applyFilters();
      return this.allUsers;
    },

    /* ==================================================
       APPLY FILTERS
       ================================================== */

    applyFilters: function () {
      const tab = this.selectedTab;
      const query = this.normalizeText(this.searchQuery);

      this.filteredUsers = this.allUsers.filter(function (user) {
        if (tab !== "all" && user._role !== tab) {
          return false;
        }

        if (query) {
          const searchable = [
            user.fullName,
            user.name,
            user.phone,
            user.email,
            user.specialty,
            user.wilaya,
            user.id,
          ].join(" ");

          if (!this.normalizeText(searchable).includes(query)) {
            return false;
          }
        }

        return true;
      }, this);
    },

    /* ==================================================
       TOGGLE ACTIVE
       ================================================== */

    toggleActive: function (userId, role) {
      const storageKey = this.getStorageKey(role);
      let users = this.readJSON(localStorage, storageKey, []);

      if (!Array.isArray(users)) {
        users = [];
      }

      const index = users.findIndex(function (u) {
        return String(u.id) === String(userId);
      });

      if (index === -1) {
        this.showMessage("تعذر العثور على المستخدم.", "error");
        return false;
      }

      const user = users[index];
      user.active = user.active === false;
      user.updatedAt = new Date().toISOString();

      users[index] = user;

      const saved = this.writeJSON(localStorage, storageKey, users);
      if (!saved) {
        this.showMessage("تعذر تحديث حالة المستخدم.", "error");
        return false;
      }

      // 🔑 تحديث في monmedecin-users
      let allUsers = this.readJSON(localStorage, "monmedecin-users", []);
      if (Array.isArray(allUsers)) {
        const idx = allUsers.findIndex(function(u) {
          return String(u.id) === String(userId);
        });
        if (idx >= 0) {
          allUsers[idx].active = user.active;
          allUsers[idx].updatedAt = new Date().toISOString();
          this.writeJSON(localStorage, "monmedecin-users", allUsers);
        }
      }

      this.loadUsers();
      this.refresh();

      this.showMessage(
        user.active ? "تم تفعيل الحساب." : "تم تعطيل الحساب.",
        "success"
      );

      return true;
    },

    /* ==================================================
       DELETE USER
       ================================================== */

    deleteUser: function (userId, role) {
      const storageKey = this.getStorageKey(role);
      let users = this.readJSON(localStorage, storageKey, []);

      if (!Array.isArray(users)) {
        users = [];
      }

      const exists = users.some(function (u) {
        return String(u.id) === String(userId);
      });

      if (!exists) {
        this.showMessage("تعذر العثور على المستخدم.", "error");
        return false;
      }

      const confirmed = window.confirm("هل تريد حذف هذا المستخدم نهائياً؟");
      if (!confirmed) return false;

      users = users.filter(function (u) {
        return String(u.id) !== String(userId);
      });

      const saved = this.writeJSON(localStorage, storageKey, users);
      if (!saved) {
        this.showMessage("تعذر حذف المستخدم.", "error");
        return false;
      }

      // 🔑 حذف من monmedecin-users
      let allUsers = this.readJSON(localStorage, "monmedecin-users", []);
      if (Array.isArray(allUsers)) {
        allUsers = allUsers.filter(function(u) {
          return String(u.id) !== String(userId);
        });
        this.writeJSON(localStorage, "monmedecin-users", allUsers);
      }

      this.loadUsers();
      this.refresh();

      this.showMessage("تم حذف المستخدم.", "success");
      return true;
    },

    /* ==================================================
       GET STORAGE KEY
       ================================================== */

    getStorageKey: function (role) {
      const keys = {
        admin: "monmedecin-admins",
        doctor: "monmedecin-doctors",
        secretary: "monmedecin-secretaries",
        patient: "monmedecin-patients",
      };
      return keys[role] || "";
    },

    /* ==================================================
       STATS
       ================================================== */

    getStats: function () {
      const doctors = this.allUsers.filter(function (u) {
        return u._role === "doctor";
      });
      const patients = this.allUsers.filter(function (u) {
        return u._role === "patient";
      });
      const secretaries = this.allUsers.filter(function (u) {
        return u._role === "secretary";
      });

      return {
        total: this.allUsers.length,
        doctors: doctors.length,
        patients: patients.length,
        secretaries: secretaries.length,
      };
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("adminUsersMessage");
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
       RENDER USER CARD
       ================================================== */

    renderUser: function (user) {
      const isActive = user.active !== false;
      const fullName = user.fullName || user.name || "مستخدم";

      return `
        <article class="admin-user-card glass ${isActive ? "" : "is-inactive"}">

          <div class="admin-user-card__top">

            <div class="admin-user-card__identity">

              <div class="admin-user-card__avatar">
                ${this.escapeHTML(String(fullName).charAt(0))}
              </div>

              <div>
                <span class="role-badge ${user._roleClass}">
                  ${user._roleIcon} ${this.escapeHTML(user._roleLabel)}
                </span>
                <h3>${this.escapeHTML(fullName)}</h3>
                <small dir="ltr">
                  ${this.escapeHTML(user.phone || user.email || "—")}
                </small>
              </div>

            </div>

            <span class="admin-user-status ${isActive ? "is-active" : "is-inactive"}">
              ${isActive ? "نشط" : "متوقف"}
            </span>

          </div>

          <div class="admin-user-card__meta">

            <div>
              <span>${user._role === "doctor" ? "التخصص" : "الدور"}</span>
              <strong>
                ${this.escapeHTML(
                  user._role === "doctor"
                    ? (user.specialty || user._roleLabel)
                    : user._roleLabel
                )}
              </strong>
            </div>

            <div>
              <span>الولاية</span>
              <strong>${this.escapeHTML(user.wilaya || "—")}</strong>
            </div>

          </div>

          <div class="admin-user-card__actions">

            <button
              class="is-view"
              data-admin-user-view="${this.escapeHTML(user.id)}"
              data-admin-user-role="${this.escapeHTML(user._role)}"
              type="button"
            >
              التفاصيل
            </button>

            <button
              class="is-toggle"
              data-admin-user-toggle="${this.escapeHTML(user.id)}"
              data-admin-user-role="${this.escapeHTML(user._role)}"
              type="button"
            >
              ${isActive ? "تعطيل" : "تفعيل"}
            </button>

            <button
              class="is-delete"
              data-admin-user-delete="${this.escapeHTML(user.id)}"
              data-admin-user-role="${this.escapeHTML(user._role)}"
              type="button"
            >
              حذف
            </button>

          </div>

        </article>
      `;
    },

    /* ==================================================
       RENDER LIST
       ================================================== */

    renderUsers: function () {
      if (this.filteredUsers.length === 0) {
        return `
          <section class="admin-users-empty glass">

            <span>👤</span>

            <h3>
              ${this.allUsers.length === 0
                ? "لا يوجد مستخدمون"
                : "لا توجد نتائج مطابقة"
              }
            </h3>

            <p>
              ${this.allUsers.length === 0
                ? "لم يتم العثور على أي مستخدمين مسجلين في النظام."
                : "لم نجد مستخدمين مطابقين للبحث أو الفلاتر الحالية."
              }
            </p>

          </section>
        `;
      }

      return this.filteredUsers
        .map(function (user) {
          return AdminUsersScreen.renderUser(user);
        })
        .join("");
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadUsers();

      const stats = this.getStats();
      const isMobile = state.deviceMode === "mobile";

      const countAll = this.allUsers.length;
      const countDoctors = this.allUsers.filter(function (u) { return u._role === "doctor"; }).length;
      const countPatients = this.allUsers.filter(function (u) { return u._role === "patient"; }).length;
      const countSecretaries = this.allUsers.filter(function (u) { return u._role === "secretary"; }).length;

      return `
        <main class="admin-users ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="admin-users__orb admin-users__orb--blue"></div>
          <div class="admin-users__orb admin-users__orb--cyan"></div>

          <header class="admin-users__header">

            <button
              id="adminUsersBack"
              class="admin-users__back"
              type="button"
            >
              →
            </button>

            <div class="admin-users__header-copy">
              <strong>إدارة المستخدمين</strong>
              <span>جميع حسابات المنصة</span>
            </div>

            <button
              id="adminUsersTheme"
              class="admin-users__theme"
              type="button"
            >
              ${state.theme === "dark" ? "☀" : "◐"}
            </button>

          </header>

          <section class="admin-users__container">

            <section class="admin-users__hero">
              <span>👥</span>
              <h1>المستخدمين</h1>
              <p>
                إدارة جميع حسابات المنصة: الأطباء، المرضى، والسكرتارية.
              </p>
            </section>

            <section class="admin-users-stats">

              <article class="admin-users-stat glass is-total">
                <span>إجمالي المستخدمين</span>
                <strong>${stats.total}</strong>
              </article>

              <article class="admin-users-stat glass is-doctors">
                <span>الأطباء</span>
                <strong>${stats.doctors}</strong>
              </article>

              <article class="admin-users-stat glass is-patients">
                <span>المرضى</span>
                <strong>${stats.patients}</strong>
              </article>

              <article class="admin-users-stat glass is-secretaries">
                <span>السكرتارية</span>
                <strong>${stats.secretaries}</strong>
              </article>

            </section>

            <div class="admin-users-tabs">

              <button
                class="admin-users-tab ${this.selectedTab === "all" ? "is-active" : ""}"
                data-tab="all"
                type="button"
              >
                الكل
                <span class="badge">${countAll}</span>
              </button>

              <button
                class="admin-users-tab ${this.selectedTab === "doctor" ? "is-active" : ""}"
                data-tab="doctor"
                type="button"
              >
                ⚕ الأطباء
                <span class="badge">${countDoctors}</span>
              </button>

              <button
                class="admin-users-tab ${this.selectedTab === "patient" ? "is-active" : ""}"
                data-tab="patient"
                type="button"
              >
                👤 المرضى
                <span class="badge">${countPatients}</span>
              </button>

              <button
                class="admin-users-tab ${this.selectedTab === "secretary" ? "is-active" : ""}"
                data-tab="secretary"
                type="button"
              >
                🧑‍💼 السكرتارية
                <span class="badge">${countSecretaries}</span>
              </button>

            </div>

            <section class="admin-users-search glass">

              <div class="admin-users-search__main">
                <span>⌕</span>
                <input
                  id="adminUsersSearch"
                  type="search"
                  value="${this.escapeHTML(this.searchQuery)}"
                  placeholder="ابحث بالاسم، الهاتف، البريد..."
                  autocomplete="off"
                />
              </div>

            </section>

            <div
              id="adminUsersMessage"
              class="admin-users-message"
              style="display:none;padding:12px 14px;border-radius:14px;font-size:10px;font-weight:850;line-height:1.6;margin-bottom:14px;"
            ></div>

            <section class="admin-users-results__head">

              <div>
                <span>نتائج الإدارة</span>
                <h2>قائمة المستخدمين</h2>
              </div>

              <strong id="adminUsersCount">
                ${this.filteredUsers.length}
              </strong>

            </section>

            <section
              id="adminUsersResults"
              class="admin-users-results"
            >
              ${this.renderUsers()}
            </section>

          </section>

          <!-- BOTTOM NAV -->
          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="doctors" type="button">
                <span class="mobile-bottom-nav__icon">✚</span>
                <span>الأطباء</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="users" type="button">
                <span class="mobile-bottom-nav__icon">👥</span>
                <span>المستخدمين</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="settings" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>الإعدادات</span>
              </button>
            </nav>
          ` : ""}

        </main>
      `;
    },

    /* ==================================================
       REFRESH
       ================================================== */

    refresh: function () {
      const results = document.getElementById("adminUsersResults");
      const count = document.getElementById("adminUsersCount");

      if (results) {
        results.innerHTML = this.renderUsers();
      }

      if (count) {
        count.textContent = String(this.filteredUsers.length);
      }
    },

    /* ==================================================
       VIEW USER
       ================================================== */

    viewUser: function (userId, role, app) {
      const routes = {
        doctor: "/admin/doctors",
        patient: "/admin/patients",
        secretary: "/admin/doctors",
        admin: "/admin/settings",
      };

      sessionStorage.setItem("monmedecin-admin-selected-user-id", userId);
      sessionStorage.setItem("monmedecin-admin-selected-user-role", role);

      const route = routes[role] || "/admin/dashboard";
      app.navigate(route);
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      this.loadUsers();

      document.getElementById("adminUsersBack")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });

      document.getElementById("adminUsersTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.querySelectorAll(".admin-users-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          AdminUsersScreen.selectedTab = this.dataset.tab;

          document.querySelectorAll(".admin-users-tab").forEach(function (t) {
            t.classList.toggle("is-active", t === tab);
          });

          AdminUsersScreen.applyFilters();
          AdminUsersScreen.refresh();
        });
      });

      document.getElementById("adminUsersSearch")?.addEventListener("input", function (event) {
        AdminUsersScreen.searchQuery = event.target.value;
        AdminUsersScreen.applyFilters();
        AdminUsersScreen.refresh();
      });

      document.getElementById("adminUsersResults")?.addEventListener("click", function (event) {
        const view = event.target.closest("[data-admin-user-view]");
        if (view) {
          AdminUsersScreen.viewUser(
            view.dataset.adminUserView,
            view.dataset.adminUserRole,
            app
          );
          return;
        }

        const toggle = event.target.closest("[data-admin-user-toggle]");
        if (toggle) {
          AdminUsersScreen.toggleActive(
            toggle.dataset.adminUserToggle,
            toggle.dataset.adminUserRole
          );
          return;
        }

        const remove = event.target.closest("[data-admin-user-delete]");
        if (remove) {
          AdminUsersScreen.deleteUser(
            remove.dataset.adminUserDelete,
            remove.dataset.adminUserRole
          );
        }
      });

      // BOTTOM NAV
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/dashboard");
        });
      });
      document.querySelectorAll("[data-nav='doctors']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/doctors");
        });
      });
      document.querySelectorAll("[data-nav='users']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/users");
        });
      });
      document.querySelectorAll("[data-nav='settings']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/settings");
        });
      });
    }
  };

  window.AdminUsersScreen = AdminUsersScreen;

})();