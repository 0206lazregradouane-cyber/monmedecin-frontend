/* =====================================================
   MON MÉDECIN
   ADMIN COMPLAINTS - WITH BOTTOM NAV
   ===================================================== */

(function () {
  "use strict";

  const AdminComplaintsScreen = {
    complaints: [],
    filteredComplaints: [],
    selectedTab: "all",
    searchQuery: "",
    selectedComplaintId: null,
    messageTimer: null,

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

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

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

    loadComplaints: function () {
      this.complaints = this.readJSON(localStorage, "monmedecin-complaints", []);
      if (!Array.isArray(this.complaints)) {
        this.complaints = [];
      }
      this.complaints.sort(function (a, b) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      this.applyFilters();
      return this.complaints;
    },

    saveComplaints: function () {
      return this.writeJSON(localStorage, "monmedecin-complaints", this.complaints);
    },

    applyFilters: function () {
      const tab = this.selectedTab;
      const query = this.normalizeText(this.searchQuery);

      this.filteredComplaints = this.complaints.filter(function (complaint) {
        if (tab !== "all" && complaint.status !== tab) {
          return false;
        }
        if (query) {
          const searchable = [
            complaint.senderName,
            complaint.subject,
            complaint.message,
            complaint.senderEmail,
          ].join(" ");
          if (!this.normalizeText(searchable).includes(query)) {
            return false;
          }
        }
        return true;
      }, this);
    },

    resolveComplaint: function (complaintId) {
      const index = this.complaints.findIndex(function (c) {
        return String(c.id) === String(complaintId);
      });
      if (index === -1) {
        this.showMessage("تعذر العثور على الشكوى.", "error");
        return false;
      }
      const complaint = this.complaints[index];
      complaint.status = "resolved";
      complaint.resolvedAt = new Date().toISOString();
      complaint.updatedAt = new Date().toISOString();
      this.complaints[index] = complaint;
      this.saveComplaints();
      this.applyFilters();
      this.refresh();
      this.closeDetails();
      this.showMessage("تم حل الشكوى.", "success");
      return true;
    },

    rejectComplaint: function (complaintId) {
      const index = this.complaints.findIndex(function (c) {
        return String(c.id) === String(complaintId);
      });
      if (index === -1) {
        this.showMessage("تعذر العثور على الشكوى.", "error");
        return false;
      }
      const complaint = this.complaints[index];
      complaint.status = "rejected";
      complaint.rejectedAt = new Date().toISOString();
      complaint.updatedAt = new Date().toISOString();
      this.complaints[index] = complaint;
      this.saveComplaints();
      this.applyFilters();
      this.refresh();
      this.closeDetails();
      this.showMessage("تم رفض الشكوى.", "success");
      return true;
    },

    deleteComplaint: function (complaintId) {
      const exists = this.complaints.some(function (c) {
        return String(c.id) === String(complaintId);
      });
      if (!exists) {
        this.showMessage("تعذر العثور على الشكوى.", "error");
        return false;
      }
      const confirmed = window.confirm("هل تريد حذف هذه الشكوى نهائياً؟");
      if (!confirmed) return false;
      this.complaints = this.complaints.filter(function (c) {
        return String(c.id) !== String(complaintId);
      });
      this.saveComplaints();
      this.applyFilters();
      this.refresh();
      this.closeDetails();
      this.showMessage("تم حذف الشكوى.", "success");
      return true;
    },

    getStats: function () {
      const pending = this.complaints.filter(function (c) { return c.status === "pending"; }).length;
      const resolved = this.complaints.filter(function (c) { return c.status === "resolved"; }).length;
      const rejected = this.complaints.filter(function (c) { return c.status === "rejected"; }).length;
      return {
        total: this.complaints.length,
        pending: pending,
        resolved: resolved,
        rejected: rejected,
      };
    },

    getStatusLabel: function (status) {
      const labels = {
        pending: "قيد المعالجة",
        resolved: "تم الحل",
        rejected: "مرفوضة",
      };
      return labels[status] || status || "غير معروف";
    },

    getStatusClass: function (status) {
      return "is-" + (status || "pending");
    },

    getRoleLabel: function (role) {
      const labels = {
        patient: "مريض",
        doctor: "طبيب",
        secretary: "سكرتير",
        admin: "مدير",
      };
      return labels[role] || role || "مستخدم";
    },

    showMessage: function (message, type) {
      const element = document.getElementById("adminComplaintsMessage");
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

    selectComplaint: function (complaintId) {
      this.selectedComplaintId = complaintId;
      this.refreshDetails();
    },

    closeDetails: function () {
      this.selectedComplaintId = null;
      this.refreshDetails();
    },

    formatDate: function (value) {
      if (!value) return "—";
      try {
        return new Intl.DateTimeFormat("ar-DZ", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(value));
      } catch (error) {
        return value;
      }
    },

    renderDetails: function () {
      if (!this.selectedComplaintId) return "";

      const complaint = this.complaints.find(function (c) {
        return String(c.id) === String(this.selectedComplaintId);
      }, this);

      if (!complaint) return "";

      const statusClass = this.getStatusClass(complaint.status);
      const statusLabel = this.getStatusLabel(complaint.status);

      return `
        <div class="admin-complaint-detail-overlay">
          <section class="admin-complaint-detail glass">
            <header class="admin-complaint-detail__header">
              <div>
                <span>${this.escapeHTML(complaint.id)}</span>
                <h2>${this.escapeHTML(complaint.subject)}</h2>
              </div>
              <button id="adminComplaintDetailClose" type="button">×</button>
            </header>
            <div class="admin-complaint-detail__sender">
              <div class="admin-complaint-detail__sender-avatar">
                ${this.escapeHTML(String(complaint.senderName || "م").charAt(0))}
              </div>
              <div>
                <strong>${this.escapeHTML(complaint.senderName)}</strong>
                <span>${this.escapeHTML(this.getRoleLabel(complaint.senderRole))}</span>
                <small dir="ltr">${this.escapeHTML(complaint.senderEmail || complaint.senderPhone || "")}</small>
              </div>
              <span class="admin-complaint-status ${statusClass}" style="align-self:center;">${statusLabel}</span>
            </div>
            <div class="admin-complaint-detail__subject">الموضوع: ${this.escapeHTML(complaint.subject)}</div>
            <div class="admin-complaint-detail__message">${this.escapeHTML(complaint.message)}</div>
            <div class="admin-complaint-detail__grid">
              <div><span>تاريخ الشكوى</span><strong>${this.formatDate(complaint.createdAt)}</strong></div>
              <div><span>آخر تحديث</span><strong>${this.formatDate(complaint.updatedAt)}</strong></div>
              ${complaint.resolvedAt ? `<div><span>تاريخ الحل</span><strong>${this.formatDate(complaint.resolvedAt)}</strong></div>` : ""}
              ${complaint.rejectedAt ? `<div><span>تاريخ الرفض</span><strong>${this.formatDate(complaint.rejectedAt)}</strong></div>` : ""}
            </div>
            ${complaint.status === "pending" ? `
              <div class="admin-complaint-detail__actions">
                <button class="is-resolve" data-complaint-resolve="${this.escapeHTML(complaint.id)}" type="button">✓ حل الشكوى</button>
                <button class="is-reject" data-complaint-reject="${this.escapeHTML(complaint.id)}" type="button">✕ رفض الشكوى</button>
              </div>
            ` : `
              <div class="admin-complaint-detail__actions" style="grid-template-columns:1fr;">
                <button class="is-delete" data-complaint-delete="${this.escapeHTML(complaint.id)}" type="button" style="border:1px solid rgba(210,72,72,0.12);background:rgba(210,72,72,0.06);color:#b34d4d;">🗑 حذف الشكوى</button>
              </div>
            `}
          </section>
        </div>
      `;
    },

    refreshDetails: function () {
      const container = document.getElementById("adminComplaintsDetailRoot");
      if (container) {
        container.innerHTML = this.renderDetails();
      }
    },

    renderComplaint: function (complaint) {
      const statusClass = this.getStatusClass(complaint.status);
      const statusLabel = this.getStatusLabel(complaint.status);
      const isResolved = complaint.status === "resolved";

      return `
        <article class="admin-complaint-card glass ${isResolved ? "is-resolved" : ""}">
          <div class="admin-complaint-card__top">
            <div class="admin-complaint-card__sender">
              <div class="admin-complaint-card__avatar">
                ${this.escapeHTML(String(complaint.senderName || "م").charAt(0))}
              </div>
              <div>
                <span class="role-badge ${complaint.senderRole === "patient" ? "is-patient" : "is-doctor"}">
                  ${this.escapeHTML(this.getRoleLabel(complaint.senderRole))}
                </span>
                <h3>${this.escapeHTML(complaint.senderName)}</h3>
                <small dir="ltr">${this.escapeHTML(complaint.senderEmail || complaint.senderPhone || "")}</small>
              </div>
            </div>
            <span class="admin-complaint-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="admin-complaint-card__content">
            <div class="subject">${this.escapeHTML(complaint.subject)}</div>
            <div class="message">${this.escapeHTML(complaint.message)}</div>
          </div>
          <div class="admin-complaint-card__meta">
            <div><span>التاريخ</span><strong>${this.formatDate(complaint.createdAt)}</strong></div>
            <div><span>المصدر</span><strong>${this.escapeHTML(this.getRoleLabel(complaint.senderRole))}</strong></div>
            <div><span>المعرف</span><strong dir="ltr">${this.escapeHTML(String(complaint.id).slice(-8))}</strong></div>
          </div>
          <div class="admin-complaint-card__actions">
            <button class="is-view" data-complaint-view="${this.escapeHTML(complaint.id)}" type="button">التفاصيل</button>
            ${complaint.status === "pending" ? `
              <button class="is-resolve" data-complaint-resolve="${this.escapeHTML(complaint.id)}" type="button">حل</button>
              <button class="is-reject" data-complaint-reject="${this.escapeHTML(complaint.id)}" type="button">رفض</button>
            ` : ""}
            <button class="is-delete" data-complaint-delete="${this.escapeHTML(complaint.id)}" type="button">حذف</button>
          </div>
        </article>
      `;
    },

    renderComplaints: function () {
      if (this.filteredComplaints.length === 0) {
        return `
          <section class="admin-complaints-empty glass">
            <span>⚠️</span>
            <h3>${this.complaints.length === 0 ? "لا توجد شكاوى" : "لا توجد نتائج مطابقة"}</h3>
            <p>${this.complaints.length === 0 ? "لم يتم تسجيل أي شكاوى بعد." : "لم نجد شكاوى مطابقة للبحث أو الفلاتر الحالية."}</p>
          </section>
        `;
      }
      return this.filteredComplaints.map(function (complaint) {
        return AdminComplaintsScreen.renderComplaint(complaint);
      }).join("");
    },

    render: function (state, app) {
      this.loadComplaints();
      const stats = this.getStats();
      const isMobile = state.deviceMode === "mobile";

      const countAll = stats.total;
      const countPending = stats.pending;
      const countResolved = stats.resolved;
      const countRejected = stats.rejected;

      return `
        <main class="admin-complaints ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="admin-complaints__orb admin-complaints__orb--blue"></div>
          <div class="admin-complaints__orb admin-complaints__orb--cyan"></div>

          <header class="admin-complaints__header">
            <button id="adminComplaintsBack" class="admin-complaints__back" type="button">→</button>
            <div class="admin-complaints__header-copy">
              <strong>إدارة الشكاوى</strong>
              <span>متابعة البلاغات</span>
            </div>
            <button id="adminComplaintsTheme" class="admin-complaints__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="admin-complaints__container">

            <section class="admin-complaints__hero">
              <span>⚠️</span>
              <h1>الشكاوى</h1>
              <p>متابعة وإدارة شكاوى المرضى والأطباء واتخاذ الإجراء المناسب.</p>
            </section>

            <section class="admin-complaints-stats">
              <article class="admin-complaints-stat glass is-total">
                <span>جميع الشكاوى</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="admin-complaints-stat glass is-pending">
                <span>قيد المعالجة</span>
                <strong>${stats.pending}</strong>
              </article>
              <article class="admin-complaints-stat glass is-resolved">
                <span>تم الحل</span>
                <strong>${stats.resolved}</strong>
              </article>
              <article class="admin-complaints-stat glass is-rejected">
                <span>مرفوضة</span>
                <strong>${stats.rejected}</strong>
              </article>
            </section>

            <div class="admin-complaints-tabs">
              <button class="admin-complaints-tab ${this.selectedTab === "all" ? "is-active" : ""}" data-tab="all" type="button">الكل <span class="badge">${countAll}</span></button>
              <button class="admin-complaints-tab ${this.selectedTab === "pending" ? "is-active" : ""}" data-tab="pending" type="button">قيد المعالجة <span class="badge">${countPending}</span></button>
              <button class="admin-complaints-tab ${this.selectedTab === "resolved" ? "is-active" : ""}" data-tab="resolved" type="button">✓ محلولة <span class="badge">${countResolved}</span></button>
              <button class="admin-complaints-tab ${this.selectedTab === "rejected" ? "is-active" : ""}" data-tab="rejected" type="button">✕ مرفوضة <span class="badge">${countRejected}</span></button>
            </div>

            <section class="admin-complaints-search glass">
              <div class="admin-complaints-search__main">
                <span>⌕</span>
                <input id="adminComplaintsSearch" type="search" value="${this.escapeHTML(this.searchQuery)}" placeholder="ابحث باسم المرسل أو الموضوع..." autocomplete="off" />
              </div>
            </section>

            <div id="adminComplaintsMessage" class="admin-complaints-message" style="display:none;padding:12px 14px;border-radius:14px;font-size:10px;font-weight:850;line-height:1.6;margin-bottom:14px;"></div>

            <section class="admin-complaints-results__head">
              <div>
                <span>نتائج الإدارة</span>
                <h2>قائمة الشكاوى</h2>
              </div>
              <strong id="adminComplaintsCount">${this.filteredComplaints.length}</strong>
            </section>

            <section id="adminComplaintsResults" class="admin-complaints-results">
              ${this.renderComplaints()}
            </section>

          </section>

          <div id="adminComplaintsDetailRoot">${this.renderDetails()}</div>

          <!-- BOTTOM NAV - ADDED -->
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
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>الحجوزات</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="complaints" type="button">
                <span class="mobile-bottom-nav__icon">⚠️</span>
                <span>الشكاوى</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    refresh: function () {
      const results = document.getElementById("adminComplaintsResults");
      const count = document.getElementById("adminComplaintsCount");
      if (results) {
        results.innerHTML = this.renderComplaints();
      }
      if (count) {
        count.textContent = String(this.filteredComplaints.length);
      }
      this.refreshDetails();
    },

    init: function (app) {
      this.loadComplaints();

      document.getElementById("adminComplaintsBack")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });

      document.getElementById("adminComplaintsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.querySelectorAll(".admin-complaints-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          AdminComplaintsScreen.selectedTab = this.dataset.tab;
          document.querySelectorAll(".admin-complaints-tab").forEach(function (t) {
            t.classList.toggle("is-active", t === tab);
          });
          AdminComplaintsScreen.applyFilters();
          AdminComplaintsScreen.refresh();
        });
      });

      document.getElementById("adminComplaintsSearch")?.addEventListener("input", function (event) {
        AdminComplaintsScreen.searchQuery = event.target.value;
        AdminComplaintsScreen.applyFilters();
        AdminComplaintsScreen.refresh();
      });

      document.getElementById("adminComplaintsResults")?.addEventListener("click", function (event) {
        const view = event.target.closest("[data-complaint-view]");
        if (view) {
          AdminComplaintsScreen.selectComplaint(view.dataset.complaintView);
          return;
        }
        const resolve = event.target.closest("[data-complaint-resolve]");
        if (resolve) {
          if (window.confirm("هل تريد حل هذه الشكوى؟")) {
            AdminComplaintsScreen.resolveComplaint(resolve.dataset.complaintResolve);
          }
          return;
        }
        const reject = event.target.closest("[data-complaint-reject]");
        if (reject) {
          if (window.confirm("هل تريد رفض هذه الشكوى؟")) {
            AdminComplaintsScreen.rejectComplaint(reject.dataset.complaintReject);
          }
          return;
        }
        const remove = event.target.closest("[data-complaint-delete]");
        if (remove) {
          AdminComplaintsScreen.deleteComplaint(remove.dataset.complaintDelete);
        }
      });

      document.getElementById("adminComplaintsDetailRoot")?.addEventListener("click", function (event) {
        if (event.target.closest("#adminComplaintDetailClose")) {
          AdminComplaintsScreen.closeDetails();
          return;
        }
        if (event.target.closest(".admin-complaint-detail-overlay") === event.target) {
          AdminComplaintsScreen.closeDetails();
          return;
        }
        const resolve = event.target.closest("[data-complaint-resolve]");
        if (resolve) {
          if (window.confirm("هل تريد حل هذه الشكوى؟")) {
            AdminComplaintsScreen.resolveComplaint(resolve.dataset.complaintResolve);
          }
          return;
        }
        const reject = event.target.closest("[data-complaint-reject]");
        if (reject) {
          if (window.confirm("هل تريد رفض هذه الشكوى؟")) {
            AdminComplaintsScreen.rejectComplaint(reject.dataset.complaintReject);
          }
          return;
        }
        const remove = event.target.closest("[data-complaint-delete]");
        if (remove) {
          AdminComplaintsScreen.deleteComplaint(remove.dataset.complaintDelete);
        }
      });

      // BOTTOM NAV - ADDED
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
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/appointments");
        });
      });
      document.querySelectorAll("[data-nav='complaints']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/complaints");
        });
      });
    }
  };

  window.AdminComplaintsScreen = AdminComplaintsScreen;
})();