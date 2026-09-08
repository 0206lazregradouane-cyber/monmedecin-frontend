/* =====================================================
   MON MÉDECIN
   ADMIN REPORTS - COMPLETE WITH COMMISSIONS
   ===================================================== */

(function () {
  "use strict";

  const AdminReportsScreen = {
    /* ==================================================
       STATE
       ================================================== */

    doctors: [],
    patients: [],
    appointments: [],
    services: [],
    filteredAppointments: [],
    selectedTab: "overview",
    dateFrom: "",
    dateTo: "",
    statusFilter: "all",
    messageTimer: null,
    isLoading: false,

    // ===== إعدادات العمولة =====
    commissionRate: 10, // نسبة العمولة 10% (قابلة للتعديل)
    commissionPerAppointment: 0, // عمولة ثابتة لكل موعد (0 = غير مفعل)
    currency: 'دج',

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
       COMMISSION SETTINGS
       ================================================== */

    getCommissionSettings: function() {
      const settings = this.readJSON(localStorage, "monmedecin-commission-settings", null);
      if (settings) {
        this.commissionRate = settings.rate || 10;
        this.commissionPerAppointment = settings.perAppointment || 0;
      }
      return {
        rate: this.commissionRate,
        perAppointment: this.commissionPerAppointment
      };
    },

    saveCommissionSettings: function(rate, perAppointment) {
      const settings = {
        rate: Number(rate) || 10,
        perAppointment: Number(perAppointment) || 0,
        updatedAt: new Date().toISOString()
      };
      this.writeJSON(localStorage, "monmedecin-commission-settings", settings);
      this.commissionRate = settings.rate;
      this.commissionPerAppointment = settings.perAppointment;
      return settings;
    },

    /* ==================================================
       LOAD DATA
       ================================================== */

    loadData: function () {
      this.getCommissionSettings();
      
      this.doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      this.patients = this.readJSON(localStorage, "monmedecin-patients", []);
      this.appointments = this.readJSON(localStorage, "monmedecin-appointments", []);
      this.services = this.readJSON(localStorage, "monmedecin-doctor-services", []);

      if (!Array.isArray(this.doctors)) this.doctors = [];
      if (!Array.isArray(this.patients)) this.patients = [];
      if (!Array.isArray(this.appointments)) this.appointments = [];
      if (!Array.isArray(this.services)) this.services = [];

      this.appointments.sort(function (a, b) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      this.applyFilters();
      return this.getStats();
    },

    /* ==================================================
       APPLY FILTERS
       ================================================== */

    applyFilters: function () {
      const from = this.dateFrom;
      const to = this.dateTo;
      const status = this.statusFilter;

      this.filteredAppointments = this.appointments.filter(function (apt) {
        const date = apt.date || apt.appointment_date || "";

        if (from && date < from) return false;
        if (to && date > to) return false;
        if (status !== "all" && apt.status !== status) return false;

        return true;
      });
    },

    /* ==================================================
       GET STATS - WITH COMMISSIONS
       ================================================== */

    getStats: function () {
      const totalAppointments = this.appointments.length;
      const completedAppointments = this.appointments.filter(function (a) {
        return a.status === "completed";
      }).length;

      const pendingAppointments = this.appointments.filter(function (a) {
        return a.status === "pending";
      }).length;

      const confirmedAppointments = this.appointments.filter(function (a) {
        return a.status === "confirmed";
      }).length;

      const cancelledAppointments = this.appointments.filter(function (a) {
        return ["cancelled", "rejected"].includes(a.status);
      }).length;

      // ===== الإيرادات والعمولات =====
      let revenue = 0;
      let commissionTotal = 0;
      let commissionByDoctor = {};
      let appointmentsByDoctor = {};

      this.appointments.forEach(function (a) {
        if (a.status === "completed" && a.price) {
          const price = Number(a.price) || 0;
          revenue += price;
          
          // حساب العمولة
          let commission = 0;
          if (AdminReportsScreen.commissionPerAppointment > 0) {
            commission = AdminReportsScreen.commissionPerAppointment;
          } else {
            commission = (price * AdminReportsScreen.commissionRate) / 100;
          }
          commissionTotal += commission;

          // تجميع العمولات حسب الطبيب
          const doctorId = a.doctor_id || a.doctorId;
          if (doctorId) {
            if (!commissionByDoctor[doctorId]) {
              commissionByDoctor[doctorId] = 0;
              appointmentsByDoctor[doctorId] = 0;
            }
            commissionByDoctor[doctorId] += commission;
            appointmentsByDoctor[doctorId] += 1;
          }
        }
      });

      const activeDoctors = this.doctors.filter(function (d) {
        return d.active !== false;
      }).length;

      const activePatients = this.patients.filter(function (p) {
        return p.active !== false;
      }).length;

      const today = this.getToday();
      const todayAppointments = this.appointments.filter(function (a) {
        return a.date === today;
      }).length;

      // ===== إحصائيات العمولات حسب الطبيب =====
      const doctorCommissionStats = Object.keys(commissionByDoctor).map(function(doctorId) {
        const doctor = this.doctors.find(function(d) {
          return String(d.id) === String(doctorId);
        });
        return {
          doctorId: doctorId,
          doctorName: doctor?.fullName || doctor?.name || 'طبيب',
          specialty: doctor?.specialty || '',
          appointments: appointmentsByDoctor[doctorId] || 0,
          commission: commissionByDoctor[doctorId] || 0
        };
      }, this).sort(function(a, b) {
        return b.commission - a.commission;
      });

      return {
        totalDoctors: this.doctors.length,
        activeDoctors: activeDoctors,
        totalPatients: this.patients.length,
        activePatients: activePatients,
        totalAppointments: totalAppointments,
        completedAppointments: completedAppointments,
        pendingAppointments: pendingAppointments,
        confirmedAppointments: confirmedAppointments,
        cancelledAppointments: cancelledAppointments,
        todayAppointments: todayAppointments,
        revenue: revenue,
        commissionTotal: commissionTotal,
        commissionRate: this.commissionRate,
        commissionPerAppointment: this.commissionPerAppointment,
        doctorCommissionStats: doctorCommissionStats,
        averageCommission: completedAppointments > 0 ? commissionTotal / completedAppointments : 0
      };
    },

    /* ==================================================
       GET TODAY
       ================================================== */

    getToday: function () {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    },

    /* ==================================================
       GET MONTHLY DATA - WITH COMMISSIONS
       ================================================== */

    getMonthlyData: function () {
      const months = [];
      const counts = [];
      const revenues = [];
      const commissions = [];

      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey =
          month.getFullYear() +
          "-" +
          String(month.getMonth() + 1).padStart(2, "0");

        let count = 0;
        let revenue = 0;
        let commission = 0;

        this.appointments.forEach(function (a) {
          const date = a.date || "";
          if (date.startsWith(monthKey) && a.status === "completed") {
            count++;
            const price = Number(a.price) || 0;
            revenue += price;
            
            if (AdminReportsScreen.commissionPerAppointment > 0) {
              commission += AdminReportsScreen.commissionPerAppointment;
            } else {
              commission += (price * AdminReportsScreen.commissionRate) / 100;
            }
          }
        });

        months.push(
          month.toLocaleDateString("ar-DZ", { month: "short" })
        );
        counts.push(count);
        revenues.push(revenue);
        commissions.push(commission);
      }

      return { 
        months: months, 
        counts: counts, 
        revenues: revenues, 
        commissions: commissions 
      };
    },

    /* ==================================================
       GET DOCTOR STATS - WITH COMMISSIONS
       ================================================== */

    getDoctorStats: function () {
      return this.doctors.map(function (doctor) {
        const appointments = this.appointments.filter(function (a) {
          return String(a.doctor_id || a.doctorId) === String(doctor.id);
        });

        const completed = appointments.filter(function (a) {
          return a.status === "completed";
        }).length;

        let revenue = 0;
        let commission = 0;

        completed.forEach(function (a) {
          const price = Number(a.price) || 0;
          revenue += price;
          
          if (AdminReportsScreen.commissionPerAppointment > 0) {
            commission += AdminReportsScreen.commissionPerAppointment;
          } else {
            commission += (price * AdminReportsScreen.commissionRate) / 100;
          }
        });

        return {
          id: doctor.id,
          name: doctor.fullName || doctor.name || "طبيب",
          specialty: doctor.specialty || "",
          totalAppointments: appointments.length,
          completed: completed,
          revenue: revenue,
          commission: commission,
          active: doctor.active !== false,
          approved: doctor.approved !== false
        };
      }, this).sort(function(a, b) {
        return b.commission - a.commission;
      });
    },

    /* ==================================================
       EXPORT CSV - WITH COMMISSIONS
       ================================================== */

    exportCSV: function () {
      const data = this.filteredAppointments;

      if (data.length === 0) {
        this.showMessage("لا توجد بيانات للتصدير.", "error");
        return;
      }

      const headers = [
        "رقم الموعد",
        "المريض",
        "الطبيب",
        "الخدمة",
        "التاريخ",
        "الوقت",
        "الحالة",
        "السعر",
        "العمولة"
      ];

      const rows = data.map(function (a) {
        let commission = 0;
        if (a.status === "completed") {
          const price = Number(a.price) || 0;
          if (AdminReportsScreen.commissionPerAppointment > 0) {
            commission = AdminReportsScreen.commissionPerAppointment;
          } else {
            commission = (price * AdminReportsScreen.commissionRate) / 100;
          }
        }
        return [
          a.id || "",
          a.patient_name || a.patientName || "",
          a.doctor_name || a.doctorName || "",
          a.service_name || a.serviceName || "",
          a.date || "",
          a.time || "",
          this.getStatusLabel(a.status),
          a.price || 0,
          commission.toFixed(2)
        ].join(",");
      }, this);

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "report-" + this.getToday() + ".csv";
      link.click();
      URL.revokeObjectURL(link.href);

      this.showMessage("تم تصدير التقرير بنجاح.", "success");
    },

    /* ==================================================
       STATUS LABEL
       ================================================== */

    getStatusLabel: function (status) {
      const labels = {
        pending: "قيد الانتظار",
        confirmed: "مؤكد",
        arrived: "وصل",
        in_progress: "جاري الفحص",
        completed: "مكتمل",
        rejected: "مرفوض",
        cancelled: "ملغى",
        no_show: "لم يحضر",
      };
      return labels[status] || status || "غير معروف";
    },

    getStatusClass: function (status) {
      const classes = {
        pending: "is-pending",
        confirmed: "is-confirmed",
        arrived: "is-confirmed",
        in_progress: "is-confirmed",
        completed: "is-completed",
        rejected: "is-cancelled",
        cancelled: "is-cancelled",
        no_show: "is-cancelled",
      };
      return classes[status] || "";
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
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("adminReportsMessage");
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
       REFRESH DATA
       ================================================== */

    refreshData: function (app) {
      if (this.isLoading) return;

      this.isLoading = true;
      const button = document.getElementById("adminReportsChartRefresh");
      if (button) {
        button.disabled = true;
        button.textContent = "⏳ جاري...";
      }

      setTimeout(function () {
        AdminReportsScreen.loadData();
        AdminReportsScreen.isLoading = false;
        if (button) {
          button.disabled = false;
          button.textContent = "تحديث";
        }
        AdminReportsScreen.showMessage("تم تحديث البيانات.", "success");
        app.render();
      }, 500);
    },

    /* ==================================================
       RENDER COMMISSION SETTINGS
       ================================================== */

    renderCommissionSettings: function () {
      return `
        <div class="admin-reports-commission-settings glass" style="margin-bottom:15px;padding:16px;border-radius:19px;border:2px solid rgba(66,116,217,0.1);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <span style="display:block;color:#4274d9;font-size:9px;font-weight:900;">💰 إعدادات العمولة</span>
              <h3 style="margin:4px 0 0;font-size:15px;font-weight:950;color:#172b47;">نظام العمولات</h3>
              <small style="display:block;margin-top:4px;color:#8492a3;font-size:8px;">
                تحصل على عمولة من كل موعد مكتمل
              </small>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <label style="display:flex;align-items:center;gap:6px;font-size:8px;font-weight:850;color:#708197;">
                <span>نسبة العمولة</span>
                <input id="commissionRate" type="number" min="0" max="100" step="0.5" 
                  value="${this.commissionRate}" 
                  style="width:60px;min-height:32px;padding:0 6px;border:1px solid rgba(38,71,114,0.09);border-radius:8px;text-align:center;font-size:9px;">
                <span>%</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:8px;font-weight:850;color:#708197;">
                <span>عمولة ثابتة</span>
                <input id="commissionPerAppointment" type="number" min="0" step="50" 
                  value="${this.commissionPerAppointment}" 
                  style="width:70px;min-height:32px;padding:0 6px;border:1px solid rgba(38,71,114,0.09);border-radius:8px;text-align:center;font-size:9px;">
                <span>دج</span>
              </label>
              <button id="saveCommissionSettings" type="button" 
                style="min-height:32px;padding:0 14px;border:0;border-radius:9px;background:linear-gradient(135deg,#4274d9,#345fa9);color:#fff;font-size:8px;font-weight:900;cursor:pointer;">
                حفظ الإعدادات
              </button>
            </div>
          </div>
          <div style="margin-top:10px;padding:8px 12px;border-radius:10px;background:rgba(66,116,217,0.04);border:1px solid rgba(66,116,217,0.06);">
            <small style="color:#8492a3;font-size:7px;">
              💡 العمولة تحسب كالتالي: 
              ${this.commissionPerAppointment > 0 
                ? this.commissionPerAppointment + ' دج لكل موعد مكتمل' 
                : this.commissionRate + '% من سعر الخدمة لكل موعد مكتمل'}
            </small>
          </div>
        </div>
      `;
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      const stats = this.loadData();
      const monthly = this.getMonthlyData();
      const doctorStats = this.getDoctorStats();
      const isMobile = state.deviceMode === "mobile";

      const maxCount = Math.max(...monthly.counts, 1);
      const maxRevenue = Math.max(...monthly.revenues, 1);
      const maxCommission = Math.max(...monthly.commissions, 1);

      // مخطط العمود الأول: عدد المواعيد
      const chartBars = monthly.months.map(function (month, index) {
        const height = Math.max(4, (monthly.counts[index] / maxCount) * 100);
        return `
          <div class="admin-reports-bar">
            <div
              class="admin-reports-bar__fill"
              style="height:${height}%;"
            ></div>
            <div class="admin-reports-bar__value">${monthly.counts[index]}</div>
            <div class="admin-reports-bar__label">${month}</div>
          </div>
        `;
      }).join("");

      // مخطط العمود الثاني: الإيرادات والعمولات
      const revenueBars = monthly.months.map(function (month, index) {
        const revHeight = Math.max(4, (monthly.revenues[index] / maxRevenue) * 100);
        const comHeight = Math.max(4, (monthly.commissions[index] / maxCommission) * 100);
        return `
          <div class="admin-reports-bar">
            <div class="admin-reports-bar__group">
              <div
                class="admin-reports-bar__fill is-revenue"
                style="height:${revHeight}%;"
                title="الإيرادات: ${AdminReportsScreen.formatPrice(monthly.revenues[index])} دج"
              ></div>
              <div
                class="admin-reports-bar__fill is-commission"
                style="height:${comHeight}%;"
                title="العمولة: ${AdminReportsScreen.formatPrice(monthly.commissions[index])} دج"
              ></div>
            </div>
            <div class="admin-reports-bar__value">${AdminReportsScreen.formatPrice(monthly.revenues[index])}</div>
            <div class="admin-reports-bar__label">${month}</div>
          </div>
        `;
      }).join("");

      // جدول العمولات حسب الطبيب
      const doctorCommissionRows = doctorStats.slice(0, 10).map(function(d) {
        return `
          <tr>
            <td>${AdminReportsScreen.escapeHTML(d.name)}</td>
            <td>${AdminReportsScreen.escapeHTML(d.specialty || "—")}</td>
            <td>${d.totalAppointments}</td>
            <td>${d.completed}</td>
            <td>${AdminReportsScreen.formatPrice(d.revenue)} دج</td>
            <td style="color:#4274d9;font-weight:950;">${AdminReportsScreen.formatPrice(d.commission)} دج</td>
            <td>
              <span class="status-badge ${d.active ? "is-confirmed" : "is-cancelled"}">
                ${d.active ? "نشط" : "متوقف"}
              </span>
            </td>
          </tr>
        `;
      }).join("");

      // جدول آخر المواعيد مع العمولة
      const tableRows = this.filteredAppointments.slice(0, 15).map(function (a) {
        let commission = 0;
        if (a.status === "completed") {
          const price = Number(a.price) || 0;
          if (AdminReportsScreen.commissionPerAppointment > 0) {
            commission = AdminReportsScreen.commissionPerAppointment;
          } else {
            commission = (price * AdminReportsScreen.commissionRate) / 100;
          }
        }
        return `
          <tr>
            <td>${AdminReportsScreen.escapeHTML(String(a.id || "").slice(-8))}</td>
            <td>${AdminReportsScreen.escapeHTML(a.patient_name || a.patientName || "—")}</td>
            <td>${AdminReportsScreen.escapeHTML(a.doctor_name || a.doctorName || "—")}</td>
            <td>${AdminReportsScreen.escapeHTML(a.service_name || a.serviceName || "—")}</td>
            <td dir="ltr">${AdminReportsScreen.escapeHTML(a.date || "—")}</td>
            <td dir="ltr">${AdminReportsScreen.escapeHTML(a.time || "—")}</td>
            <td>
              <span class="status-badge ${AdminReportsScreen.getStatusClass(a.status)}">
                ${AdminReportsScreen.getStatusLabel(a.status)}
              </span>
            </td>
            <td>${AdminReportsScreen.formatPrice(a.price || 0)} دج</td>
            <td style="color:#4274d9;font-weight:950;">${AdminReportsScreen.formatPrice(commission)} دج</td>
          </tr>
        `;
      }, this).join("");

      return `
        <main class="admin-reports ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="admin-reports__orb admin-reports__orb--blue"></div>
          <div class="admin-reports__orb admin-reports__orb--cyan"></div>

          <header class="admin-reports__header">

            <button
              id="adminReportsBack"
              class="admin-reports__back"
              type="button"
            >
              →
            </button>

            <div class="admin-reports__header-copy">
              <strong>التقارير والإحصائيات</strong>
              <span>تحليل بيانات المنصة</span>
            </div>

            <button
              id="adminReportsTheme"
              class="admin-reports__theme"
              type="button"
            >
              ${state.theme === "dark" ? "☀" : "◐"}
            </button>

          </header>

          <section class="admin-reports__container">

            <section class="admin-reports__hero">
              <span>📊</span>
              <h1>التقارير</h1>
              <p>
                نظرة شاملة على أداء المنصة مع إحصائيات دقيقة ومؤشرات رئيسية.
              </p>
            </section>

            <!-- ========================================== -->
            <!-- إعدادات العمولة -->
            <!-- ========================================== -->
            ${this.renderCommissionSettings()}

            <section class="admin-reports-summary">

              <article class="admin-reports-summary-item glass is-doctors">
                <span>الأطباء</span>
                <strong>${stats.totalDoctors}</strong>
                <small>${stats.activeDoctors} نشط</small>
              </article>

              <article class="admin-reports-summary-item glass is-patients">
                <span>المرضى</span>
                <strong>${stats.totalPatients}</strong>
                <small>${stats.activePatients} نشط</small>
              </article>

              <article class="admin-reports-summary-item glass is-appointments">
                <span>المواعيد</span>
                <strong>${stats.totalAppointments}</strong>
                <small>${stats.todayAppointments} اليوم</small>
              </article>

              <article class="admin-reports-summary-item glass is-revenue" style="border-color:rgba(66,116,217,0.12);">
                <span>الإيرادات</span>
                <strong>${this.formatPrice(stats.revenue)} دج</strong>
                <small>من المواعيد المكتملة</small>
              </article>

              <!-- ===== إضافة: إجمالي العمولات ===== -->
              <article class="admin-reports-summary-item glass is-commission" style="border-color:rgba(66,116,217,0.2);background:rgba(66,116,217,0.05);">
                <span>💰 إجمالي العمولات</span>
                <strong style="color:#4274d9;">${this.formatPrice(stats.commissionTotal)} دج</strong>
                <small>${stats.commissionRate}% من ${stats.completedAppointments} موعد مكتمل</small>
              </article>

              <article class="admin-reports-summary-item glass is-commission" style="border-color:rgba(66,116,217,0.12);">
                <span>📊 متوسط العمولة</span>
                <strong style="color:#345fa9;">${this.formatPrice(stats.averageCommission)} دج</strong>
                <small>لكل موعد مكتمل</small>
              </article>

            </section>

            <section class="admin-reports-filters glass">

              <input
                id="adminReportsDateFrom"
                type="date"
                value="${this.escapeHTML(this.dateFrom)}"
                placeholder="من"
              />

              <input
                id="adminReportsDateTo"
                type="date"
                value="${this.escapeHTML(this.dateTo)}"
                placeholder="إلى"
              />

              <select id="adminReportsStatus">
                <option value="all" ${this.statusFilter === "all" ? "selected" : ""}>كل الحالات</option>
                <option value="pending" ${this.statusFilter === "pending" ? "selected" : ""}>قيد الانتظار</option>
                <option value="confirmed" ${this.statusFilter === "confirmed" ? "selected" : ""}>مؤكدة</option>
                <option value="completed" ${this.statusFilter === "completed" ? "selected" : ""}>مكتملة</option>
                <option value="cancelled" ${this.statusFilter === "cancelled" ? "selected" : ""}>ملغاة</option>
              </select>

              <button id="adminReportsExport" type="button">
                📥 تصدير CSV
              </button>

            </section>

            <div class="admin-reports-tabs">

              <button
                class="admin-reports-tab ${this.selectedTab === "overview" ? "is-active" : ""}"
                data-tab="overview"
                type="button"
              >
                📊 نظرة عامة
              </button>

              <button
                class="admin-reports-tab ${this.selectedTab === "appointments" ? "is-active" : ""}"
                data-tab="appointments"
                type="button"
              >
                📅 المواعيد
              </button>

              <button
                class="admin-reports-tab ${this.selectedTab === "doctors" ? "is-active" : ""}"
                data-tab="doctors"
                type="button"
              >
                ⚕ الأطباء
              </button>

              <button
                class="admin-reports-tab ${this.selectedTab === "commission" ? "is-active" : ""}"
                data-tab="commission"
                type="button"
              >
                💰 العمولات
              </button>

            </div>

            <div
              id="adminReportsMessage"
              class="admin-reports-message"
              hidden
            ></div>

            <div id="adminReportsTabContent">

              ${this.selectedTab === "overview" ? `
                <!-- ===== الرسم البياني الأول: المواعيد ===== -->
                <section class="admin-reports-chart glass">

                  <div class="admin-reports-chart__head">
                    <div>
                      <span>المواعيد الشهرية</span>
                      <h2>آخر 6 أشهر</h2>
                    </div>
                    <button id="adminReportsChartRefresh" type="button">
                      تحديث
                    </button>
                  </div>

                  <div class="admin-reports-chart__visual">
                    ${chartBars || `
                      <div class="admin-reports-empty" style="grid-column:auto;width:100%;">
                        <span>📊</span>
                        <h3>لا توجد بيانات</h3>
                        <p>لم يتم العثور على مواعيد لعرضها.</p>
                      </div>
                    `}
                  </div>

                </section>

                <!-- ===== الرسم البياني الثاني: الإيرادات والعمولات ===== -->
                <section class="admin-reports-chart glass">

                  <div class="admin-reports-chart__head">
                    <div>
                      <span>الإيرادات والعمولات</span>
                      <h2>آخر 6 أشهر</h2>
                    </div>
                    <span style="font-size:8px;color:#8492a3;display:flex;gap:10px;">
                      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#25815b;"></span> الإيرادات</span>
                      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#4274d9;"></span> العمولات</span>
                    </span>
                  </div>

                  <div class="admin-reports-chart__visual" style="display:flex;align-items:flex-end;justify-content:space-around;gap:6px;padding-top:10px;min-height:200px;">
                    ${revenueBars || `
                      <div class="admin-reports-empty" style="grid-column:auto;width:100%;">
                        <span>📊</span>
                        <h3>لا توجد بيانات</h3>
                        <p>لم يتم العثور على إيرادات لعرضها.</p>
                      </div>
                    `}
                  </div>

                </section>

                <!-- ===== ملخص الحالات ===== -->
                <section class="admin-reports-chart glass">
                  <div class="admin-reports-chart__head">
                    <div>
                      <span>تفاصيل المواعيد</span>
                      <h2>حالة الحجوزات</h2>
                    </div>
                  </div>

                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">

                    <div style="padding:12px;border-radius:12px;background:rgba(222,166,53,0.06);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">قيد الانتظار</span>
                      <strong style="display:block;font-size:18px;color:#9d7426;">${stats.pendingAppointments}</strong>
                    </div>

                    <div style="padding:12px;border-radius:12px;background:rgba(66,116,217,0.06);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">مؤكدة</span>
                      <strong style="display:block;font-size:18px;color:#3f70bd;">${stats.confirmedAppointments}</strong>
                    </div>

                    <div style="padding:12px;border-radius:12px;background:rgba(37,158,106,0.06);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">مكتملة</span>
                      <strong style="display:block;font-size:18px;color:#25815b;">${stats.completedAppointments}</strong>
                    </div>

                    <div style="padding:12px;border-radius:12px;background:rgba(179,77,77,0.06);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">ملغاة</span>
                      <strong style="display:block;font-size:18px;color:#b34d4d;">${stats.cancelledAppointments}</strong>
                    </div>

                    <div style="padding:12px;border-radius:12px;background:rgba(66,116,217,0.06);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">اليوم</span>
                      <strong style="display:block;font-size:18px;color:#3f70bd;">${stats.todayAppointments}</strong>
                    </div>

                  </div>
                </section>

                <!-- ===== ملخص العمولات ===== -->
                <section class="admin-reports-chart glass">
                  <div class="admin-reports-chart__head">
                    <div>
                      <span>💰 ملخص العمولات</span>
                      <h2>إحصائيات العمولات</h2>
                    </div>
                  </div>

                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">

                    <div style="padding:12px;border-radius:12px;background:rgba(66,116,217,0.06);text-align:center;border:1px solid rgba(66,116,217,0.08);">
                      <span style="display:block;color:#8492a3;font-size:8px;">إجمالي العمولات</span>
                      <strong style="display:block;font-size:20px;color:#4274d9;">${this.formatPrice(stats.commissionTotal)} دج</strong>
                    </div>

                    <div style="padding:12px;border-radius:12px;background:rgba(66,116,217,0.06);text-align:center;border:1px solid rgba(66,116,217,0.08);">
                      <span style="display:block;color:#8492a3;font-size:8px;">متوسط العمولة</span>
                      <strong style="display:block;font-size:20px;color:#345fa9;">${this.formatPrice(stats.averageCommission)} دج</strong>
                      <small style="display:block;font-size:7px;color:#8492a3;">لكل موعد مكتمل</small>
                    </div>

                    <div style="padding:12px;border-radius:12px;background:rgba(66,116,217,0.06);text-align:center;border:1px solid rgba(66,116,217,0.08);">
                      <span style="display:block;color:#8492a3;font-size:8px;">نسبة العمولة</span>
                      <strong style="display:block;font-size:20px;color:#3f70bd;">${stats.commissionRate}%</strong>
                      <small style="display:block;font-size:7px;color:#8492a3;">من سعر الخدمة</small>
                    </div>

                    <div style="padding:12px;border-radius:12px;background:rgba(37,158,106,0.06);text-align:center;border:1px solid rgba(37,158,106,0.08);">
                      <span style="display:block;color:#8492a3;font-size:8px;">المواعيد المكتملة</span>
                      <strong style="display:block;font-size:20px;color:#25815b;">${stats.completedAppointments}</strong>
                      <small style="display:block;font-size:7px;color:#8492a3;">المواعيد التي تم احتساب العمولة عليها</small>
                    </div>

                  </div>
                </section>
              ` : ""}

              ${this.selectedTab === "appointments" ? `
                <section class="admin-reports-chart glass">

                  <div class="admin-reports-chart__head">
                    <div>
                      <span>قائمة المواعيد</span>
                      <h2>آخر الحجوزات (${this.filteredAppointments.length})</h2>
                    </div>
                  </div>

                  ${this.filteredAppointments.length === 0 ? `
                    <div class="admin-reports-empty" style="grid-column:auto;">
                      <span>📅</span>
                      <h3>لا توجد مواعيد</h3>
                      <p>لم يتم العثور على مواعيد مطابقة للفلاتر الحالية.</p>
                    </div>
                  ` : `
                    <div class="admin-reports-table-wrap">
                      <table class="admin-reports-table">
                        <thead>
                          <tr>
                            <th>الرقم</th>
                            <th>المريض</th>
                            <th>الطبيب</th>
                            <th>الخدمة</th>
                            <th>التاريخ</th>
                            <th>الوقت</th>
                            <th>الحالة</th>
                            <th>السعر</th>
                            <th style="color:#4274d9;">💰 العمولة</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tableRows}
                        </tbody>
                      </table>
                    </div>
                  `}

                </section>
              ` : ""}

              ${this.selectedTab === "doctors" ? `
                <section class="admin-reports-chart glass">

                  <div class="admin-reports-chart__head">
                    <div>
                      <span>أداء الأطباء</span>
                      <h2>إحصائيات الأطباء</h2>
                    </div>
                  </div>

                  ${doctorStats.length === 0 ? `
                    <div class="admin-reports-empty" style="grid-column:auto;">
                      <span>⚕</span>
                      <h3>لا يوجد أطباء</h3>
                      <p>لم يتم العثور على أطباء مسجلين.</p>
                    </div>
                  ` : `
                    <div class="admin-reports-table-wrap">
                      <table class="admin-reports-table">
                        <thead>
                          <tr>
                            <th>الطبيب</th>
                            <th>التخصص</th>
                            <th>المواعيد</th>
                            <th>المكتملة</th>
                            <th>الإيرادات</th>
                            <th style="color:#4274d9;">💰 العمولة</th>
                            <th>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${doctorCommissionRows}
                        </tbody>
                      </table>
                    </div>
                  `}

                </section>
              ` : ""}

              ${this.selectedTab === "commission" ? `
                <section class="admin-reports-chart glass">

                  <div class="admin-reports-chart__head">
                    <div>
                      <span>💰 تقرير العمولات</span>
                      <h2>تفاصيل العمولات</h2>
                    </div>
                  </div>

                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:15px;">

                    <div style="padding:14px;border-radius:14px;background:rgba(66,116,217,0.06);border:1px solid rgba(66,116,217,0.1);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">إجمالي العمولات</span>
                      <strong style="display:block;font-size:22px;color:#4274d9;">${this.formatPrice(stats.commissionTotal)} دج</strong>
                    </div>

                    <div style="padding:14px;border-radius:14px;background:rgba(37,158,106,0.06);border:1px solid rgba(37,158,106,0.1);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">المواعيد المكتملة</span>
                      <strong style="display:block;font-size:22px;color:#25815b;">${stats.completedAppointments}</strong>
                    </div>

                    <div style="padding:14px;border-radius:14px;background:rgba(222,166,53,0.06);border:1px solid rgba(222,166,53,0.1);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">متوسط العمولة</span>
                      <strong style="display:block;font-size:22px;color:#9d7426;">${this.formatPrice(stats.averageCommission)} دج</strong>
                    </div>

                    <div style="padding:14px;border-radius:14px;background:rgba(66,116,217,0.04);border:1px solid rgba(66,116,217,0.08);text-align:center;">
                      <span style="display:block;color:#8492a3;font-size:8px;">نسبة العمولة</span>
                      <strong style="display:block;font-size:22px;color:#345fa9;">${stats.commissionRate}%</strong>
                    </div>

                  </div>

                  <!-- قائمة العمولات حسب الطبيب -->
                  <div style="margin-top:10px;">
                    <h3 style="font-size:13px;font-weight:950;color:#172b47;margin-bottom:10px;">📊 العمولات حسب الطبيب</h3>
                    ${doctorStats.filter(d => d.commission > 0).length === 0 ? `
                      <div style="padding:20px;text-align:center;color:#8492a3;font-size:9px;">
                        لا توجد عمولات مسجلة حتى الآن.
                      </div>
                    ` : `
                      <div class="admin-reports-table-wrap">
                        <table class="admin-reports-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>الطبيب</th>
                              <th>التخصص</th>
                              <th>المواعيد المكتملة</th>
                              <th style="color:#4274d9;">💰 إجمالي العمولة</th>
                              <th>نسبة العمولة</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${doctorStats.filter(d => d.commission > 0).sort((a, b) => b.commission - a.commission).map(function(d, index) {
                              const percentage = stats.commissionTotal > 0 ? ((d.commission / stats.commissionTotal) * 100).toFixed(1) : 0;
                              return `
                                <tr>
                                  <td>${index + 1}</td>
                                  <td><strong>${AdminReportsScreen.escapeHTML(d.name)}</strong></td>
                                  <td>${AdminReportsScreen.escapeHTML(d.specialty || "—")}</td>
                                  <td>${d.completed}</td>
                                  <td style="color:#4274d9;font-weight:950;">${AdminReportsScreen.formatPrice(d.commission)} دج</td>
                                  <td>${percentage}%</td>
                                </tr>
                              `;
                            }).join("")}
                          </tbody>
                          <tfoot style="font-weight:900;">
                            <tr>
                              <td colspan="3" style="text-align:left;">المجموع</td>
                              <td>${doctorStats.reduce((sum, d) => sum + d.completed, 0)}</td>
                              <td style="color:#4274d9;">${AdminReportsScreen.formatPrice(stats.commissionTotal)} دج</td>
                              <td>100%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    `}
                  </div>

                </section>
              ` : ""}

            </div>

            <!-- ============================================= -->
            <!-- LOGOUT BUTTON -->
            <!-- ============================================= -->
            <section style="margin-top: 20px;">
              <button id="adminReportsLogout" class="admin-reports-logout" type="button">
                تسجيل الخروج من لوحة الإدارة
              </button>
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
              <button class="mobile-bottom-nav__item is-active" data-nav="reports" type="button">
                <span class="mobile-bottom-nav__icon">📊</span>
                <span>التقارير</span>
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
       INIT - FIXED
       ================================================== */

    init: function (app) {
      this.loadData();

      // ==============================================
      // BACK
      // ==============================================
      document.getElementById("adminReportsBack")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });

      // ==============================================
      // THEME
      // ==============================================
      document.getElementById("adminReportsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // ==============================================
      // LOGOUT
      // ==============================================
      document.getElementById("adminReportsLogout")?.addEventListener("click", function () {
        if (confirm("هل تريد تسجيل الخروج من لوحة الإدارة؟")) {
          try {
            sessionStorage.removeItem("monmedecin-admin-session");
          } catch (error) {
            console.warn("Error clearing admin session:", error);
          }
          app.logout();
        }
      });

      // ==============================================
      // COMMISSION SETTINGS
      // ==============================================
      document.getElementById("saveCommissionSettings")?.addEventListener("click", function () {
        const rate = document.getElementById("commissionRate")?.value;
        const perAppointment = document.getElementById("commissionPerAppointment")?.value;
        
        if (rate === undefined || perAppointment === undefined) return;
        
        const settings = AdminReportsScreen.saveCommissionSettings(rate, perAppointment);
        AdminReportsScreen.showMessage(
          "✅ تم حفظ إعدادات العمولة: " + 
          (settings.perAppointment > 0 
            ? settings.perAppointment + ' دج لكل موعد' 
            : settings.rate + '% من سعر الخدمة'),
          "success"
        );
        app.render();
      });

      // ==============================================
      // TABS
      // ==============================================
      document.querySelectorAll(".admin-reports-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          AdminReportsScreen.selectedTab = this.dataset.tab;

          document.querySelectorAll(".admin-reports-tab").forEach(function (t) {
            t.classList.toggle("is-active", t === tab);
          });

          app.render();
        });
      });

      // ==============================================
      // DATE FROM
      // ==============================================
      document.getElementById("adminReportsDateFrom")?.addEventListener("change", function () {
        AdminReportsScreen.dateFrom = this.value;
        AdminReportsScreen.applyFilters();
        app.render();
      });

      // ==============================================
      // DATE TO
      // ==============================================
      document.getElementById("adminReportsDateTo")?.addEventListener("change", function () {
        AdminReportsScreen.dateTo = this.value;
        AdminReportsScreen.applyFilters();
        app.render();
      });

      // ==============================================
      // STATUS FILTER
      // ==============================================
      document.getElementById("adminReportsStatus")?.addEventListener("change", function () {
        AdminReportsScreen.statusFilter = this.value;
        AdminReportsScreen.applyFilters();
        app.render();
      });

      // ==============================================
      // EXPORT
      // ==============================================
      document.getElementById("adminReportsExport")?.addEventListener("click", function () {
        AdminReportsScreen.exportCSV();
      });

      // ==============================================
      // REFRESH CHART
      // ==============================================
      document.getElementById("adminReportsChartRefresh")?.addEventListener("click", function () {
        AdminReportsScreen.refreshData(app);
      });

      // ==============================================
      // BOTTOM NAV
      // ==============================================
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
      document.querySelectorAll("[data-nav='reports']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/reports");
        });
      });
      document.querySelectorAll("[data-nav='settings']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/settings");
        });
      });
    }
  };

  window.AdminReportsScreen = AdminReportsScreen;

})();