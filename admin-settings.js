/* =====================================================
   MON MÉDECIN
   ADMIN SETTINGS - FIXED (FULL CLEANUP)
   ===================================================== */

(function () {
  "use strict";

  const AdminSettingsScreen = {
    admin: null,
    messageTimer: null,
    passwordVisible: false,
    newPasswordVisible: false,
    confirmPasswordVisible: false,
    cleanupInProgress: false,

    /* ==================================================
       STORAGE HELPERS
       ================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN:", "Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN:", "Cannot write", key, error);
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

    normalizePhone: function (phone) {
      let value = String(phone || "")
        .replace(/\s+/g, "")
        .replace(/-/g, "")
        .replace(/\./g, "")
        .trim();
      if (value.startsWith("+213")) {
        value = "0" + value.slice(4);
      } else if (value.startsWith("00213")) {
        value = "0" + value.slice(5);
      } else if (value.startsWith("213") && value.length >= 12) {
        value = "0" + value.slice(3);
      }
      return value;
    },

    /* ==================================================
       ADMIN MANAGEMENT
       ================================================== */

    loadAdmin: function (app) {
      let admins = this.readJSON(localStorage, "monmedecin-admins", []);
      if (!Array.isArray(admins)) {
        admins = [];
      }
      const currentAdmin = app.state.admin || app.state.user;
      let admin = null;
      if (currentAdmin && currentAdmin.id) {
        admin = admins.find(function (a) {
          return String(a.id) === String(currentAdmin.id);
        }) || null;
      }
      if (!admin) {
        admin = this.readJSON(localStorage, "monmedecin-admin", null);
      }
      if (!admin) {
        admin = app.state.admin || app.state.user || {};
      }
      this.admin = admin;
      return this.admin;
    },

    saveAdmin: function (admin, app) {
      this.writeJSON(localStorage, "monmedecin-admin", admin);
      let admins = this.readJSON(localStorage, "monmedecin-admins", []);
      if (!Array.isArray(admins)) {
        admins = [];
      }
      const index = admins.findIndex(function (a) {
        return String(a.id) === String(admin.id);
      });
      if (index >= 0) {
        admins[index] = {
          ...admins[index],
          ...admin,
          updatedAt: new Date().toISOString()
        };
      } else {
        admins.push({
          ...admin,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      this.writeJSON(localStorage, "monmedecin-admins", admins);
      if (app && app.state) {
        app.state.admin = admin;
        if (app.state.user && app.state.user.role === "admin") {
          app.state.user = admin;
        }
      }
      this.admin = admin;
    },

    validateProfile: function (data) {
      const errors = {};
      if (!data.fullName || data.fullName.length < 3) {
        errors.fullName = "أدخل الاسم الكامل.";
      }
      if (data.phone && !/^(05|06|07)[0-9]{8}$/.test(data.phone)) {
        errors.phone = "رقم الهاتف غير صحيح.";
      }
      return {
        valid: Object.keys(errors).length === 0,
        errors: errors
      };
    },

    updateProfile: function (data, app) {
      const admin = this.loadAdmin(app);
      if (!admin) {
        this.showMessage("تعذر تحميل حساب الإدارة.", "error");
        return false;
      }
      const updated = {
        ...admin,
        fullName: data.fullName,
        phone: data.phone,
        role: "admin",
        updatedAt: new Date().toISOString()
      };
      this.saveAdmin(updated, app);
      this.showMessage("تم حفظ بيانات الحساب.", "success");
      return true;
    },

    changePassword: function (currentPassword, newPassword, confirmPassword, app) {
      const admin = this.loadAdmin(app);
      if (!admin) {
        this.showMessage("تعذر العثور على حساب الإدارة.", "error");
        return false;
      }
      if (String(admin.password || "") !== String(currentPassword || "")) {
        this.showMessage("كلمة المرور الحالية غير صحيحة.", "error");
        return false;
      }
      if (String(newPassword || "").length < 8) {
        this.showMessage("كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل.", "error");
        return false;
      }
      if (newPassword !== confirmPassword) {
        this.showMessage("كلمتا المرور الجديدتان غير متطابقتين.", "error");
        return false;
      }
      if (newPassword === currentPassword) {
        this.showMessage("اختر كلمة مرور جديدة مختلفة عن الحالية.", "error");
        return false;
      }
      const updated = {
        ...admin,
        password: newPassword,
        role: "admin",
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.saveAdmin(updated, app);
      this.showMessage("تم تغيير كلمة المرور بنجاح.", "success");
      return true;
    },

    /* ==================================================
       🗑️ FULL DATA CLEANUP - DELETE ALL APPOINTMENTS
       ================================================== */

    getAppointmentsStats: function () {
      const appointments = this.readJSON(localStorage, "monmedecin-appointments", []);
      return {
        total: appointments.length
      };
    },

    getAppointmentsFromAllStores: function () {
      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];

      const map = new Map();

      stores.forEach(function (key) {
        const data = this.readJSON(localStorage, key, []);
        if (Array.isArray(data)) {
          data.forEach(function (appointment) {
            const id = appointment.id || appointment.appointment_id;
            if (id) {
              map.set(String(id), appointment);
            }
          });
        }
      }, this);

      return Array.from(map.values());
    },

    // ==================================================
    // DELETE ALL APPOINTMENTS - COMPLETE CLEANUP
    // ==================================================

    deleteAllAppointments: function (app) {
      console.log('🗑️ AdminSettingsScreen.deleteAllAppointments called');
      
      return new Promise(function(resolve, reject) {
        try {
          // 1. Get all appointments from all stores
          let appointments = AdminSettingsScreen.getAppointmentsFromAllStores();
          
          if (!Array.isArray(appointments)) {
            appointments = [];
          }

          const originalCount = appointments.length;
          console.log('📊 Total appointments before deletion:', originalCount);

          if (originalCount === 0) {
            resolve({
              success: true,
              deleted: 0,
              remaining: 0,
              original: 0,
              message: '✅ لا توجد مواعيد لحذفها. السجل فارغ بالفعل.'
            });
            return;
          }

          // 2. Create backup BEFORE deletion
          const backupKey = AdminSettingsScreen.backupAppointments(appointments);
          console.log('💾 Backup created:', backupKey);

          // 3. Delete from ALL stores
          const allStores = [
            "monmedecin-appointments",
            "monmedecin-doctor-appointments",
            "monmedecin-patient-appointments"
          ];

          let allSaved = true;
          let savedCount = 0;

          allStores.forEach(function(key) {
            const saved = AdminSettingsScreen.writeJSON(localStorage, key, []);
            if (saved) {
              savedCount++;
              console.log('✅ Cleared', key, 'successfully');
            } else {
              allSaved = false;
              console.warn('❌ Failed to clear', key);
            }
          });

          // 4. If saving failed, restore from backup
          if (!allSaved || savedCount < allStores.length) {
            console.warn('⚠️ Saving failed, restoring from backup...');
            const restored = AdminSettingsScreen.restoreFromBackup(backupKey);
            if (restored) {
              reject(new Error('فشل حفظ البيانات. تم استعادة النسخة الاحتياطية. لم يتم حذف أي موعد.'));
            } else {
              reject(new Error('فشل حفظ البيانات ولم نتمكن من استعادة النسخة الاحتياطية.'));
            }
            return;
          }

          // 5. Save cleanup log
          const log = {
            timestamp: new Date().toISOString(),
            action: 'DELETE_ALL',
            deleted: originalCount,
            remaining: 0,
            original: originalCount,
            backupKey: backupKey,
            performedBy: AdminSettingsScreen.admin?.id || 'admin',
            performedByName: AdminSettingsScreen.admin?.fullName || 'Administrator',
            note: '✅ تم حذف جميع المواعيد بنجاح.'
          };

          let logs = AdminSettingsScreen.readJSON(localStorage, 'monmedecin-cleanup-logs', []);
          if (!Array.isArray(logs)) logs = [];
          logs.unshift(log);
          if (logs.length > 50) logs = logs.slice(0, 50);
          AdminSettingsScreen.writeJSON(localStorage, 'monmedecin-cleanup-logs', logs);

          // 6. Update UI stats
          const totalCount = document.getElementById('adminAppointmentsTotalCount');
          if (totalCount) {
            totalCount.textContent = '0';
          }

          // 7. Update stats in dashboard
          const statsElements = document.querySelectorAll('.admin-dashboard-stat.is-appointments strong, .admin-appointments-stat strong');
          statsElements.forEach(function(el) {
            el.textContent = '0';
          });

          resolve({
            success: true,
            backupKey: backupKey,
            deleted: originalCount,
            remaining: 0,
            original: originalCount,
            message: '✅ تم حذف جميع المواعيد (' + originalCount + ' موعد) بنجاح.'
          });

        } catch (error) {
          console.error('❌ Cleanup error:', error);
          reject(error);
        }
      });
    },

    // ==================================================
    // BACKUP & RESTORE
    // ==================================================

    backupAppointments: function (appointments) {
      const data = {
        appointments: appointments || [],
        timestamp: new Date().toISOString(),
        count: appointments ? appointments.length : 0,
        backupType: 'appointments-full-backup'
      };

      const backupKey = 'monmedecin-appointments-backup-' + new Date().toISOString().replace(/[:.]/g, '-');
      this.writeJSON(localStorage, backupKey, data);

      const allBackups = Object.keys(localStorage).filter(function(key) {
        return key.startsWith('monmedecin-appointments-backup-');
      });

      if (allBackups.length > 10) {
        allBackups.sort();
        const toRemove = allBackups.slice(0, allBackups.length - 10);
        toRemove.forEach(function(key) {
          localStorage.removeItem(key);
        });
      }

      return backupKey;
    },

    restoreFromBackup: function (backupKey) {
      const backupData = this.readJSON(localStorage, backupKey, null);
      if (!backupData || !backupData.appointments) {
        return false;
      }

      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];

      let allRestored = true;

      stores.forEach(function (key) {
        const saved = this.writeJSON(localStorage, key, backupData.appointments);
        if (!saved) {
          allRestored = false;
        }
      }, this);

      return allRestored;
    },

    listBackups: function () {
      const backups = [];
      Object.keys(localStorage).forEach(function(key) {
        if (key.startsWith('monmedecin-appointments-backup-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            backups.push({
              key: key,
              timestamp: data.timestamp,
              count: data.count || 0
            });
          } catch (e) {}
        }
      });
      return backups.sort(function(a, b) {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
    },

    loadCleanupLogs: function () {
      const logs = this.readJSON(localStorage, 'monmedecin-cleanup-logs', []);
      const container = document.getElementById('adminCleanupLogs');
      const list = document.getElementById('adminCleanupLogsList');
      const restoreContainer = document.getElementById('adminBackupRestore');

      if (!container || !list) return;

      if (logs.length === 0) {
        container.style.display = 'none';
        if (restoreContainer) restoreContainer.style.display = 'none';
        return;
      }

      container.style.display = 'block';
      if (restoreContainer) {
        restoreContainer.style.display = 'block';
      }

      list.innerHTML = logs.slice(0, 10).map(function(log) {
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleDateString('ar-DZ', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const statusColor = log.deleted > 0 ? '#4274d9' : '#8492a3';
        const actionLabel = log.action === 'DELETE_ALL' ? '🗑️ حذف الكل' : '🧹 تنظيف';

        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(36,67,105,0.04);">
            <div>
              <span style="font-size:8px;font-weight:800;color:#172b47;">${dateStr}</span>
              <span style="font-size:7px;color:#8492a3;margin-right:8px;">${actionLabel}</span>
              <span style="font-size:7px;color:${statusColor};margin-right:8px;">${log.deleted} موعد محذوف</span>
              ${log.deleted > 0 ? `<span style="font-size:7px;color:#25815b;margin-right:8px;">✅ السجل فارغ</span>` : ''}
            </div>
            <div>
              <span style="font-size:7px;color:#8492a3;margin-left:8px;">${log.remaining} متبقي</span>
              ${log.backupKey ? `
                <button 
                  class="admin-restore-backup" 
                  data-backup-key="${log.backupKey}"
                  style="
                    min-height:24px;
                    padding:0 8px;
                    border:1px solid rgba(37,158,106,0.15);
                    border-radius:8px;
                    background:rgba(37,158,106,0.08);
                    color:#25815b;
                    font-size:6px;
                    font-weight:900;
                    cursor:pointer;
                    font-family:inherit;
                  "
                >
                  استعادة
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    },

    restoreBackup: function (backupKey) {
      return new Promise(function(resolve, reject) {
        if (!backupKey) {
          reject(new Error('لم يتم تحديد نسخة احتياطية'));
          return;
        }

        const backupData = AdminSettingsScreen.readJSON(localStorage, backupKey, null);
        if (!backupData || !backupData.appointments) {
          reject(new Error('النسخة الاحتياطية غير صالحة'));
          return;
        }

        const confirmed = window.confirm(
          '⚠️ سيتم استعادة ' + backupData.count + ' موعد من النسخة الاحتياطية.\n' +
          'سيتم استبدال جميع المواعيد الحالية.\n\n' +
          'هل أنت متأكد؟'
        );

        if (!confirmed) {
          reject(new Error('تم إلغاء الاستعادة'));
          return;
        }

        const stores = [
          "monmedecin-appointments",
          "monmedecin-doctor-appointments",
          "monmedecin-patient-appointments"
        ];

        let allRestored = true;

        stores.forEach(function(key) {
          const saved = AdminSettingsScreen.writeJSON(localStorage, key, backupData.appointments);
          if (!saved) {
            allRestored = false;
          }
        });

        if (allRestored) {
          const totalCount = document.getElementById('adminAppointmentsTotalCount');
          if (totalCount) {
            totalCount.textContent = backupData.count || 0;
          }
          AdminSettingsScreen.loadCleanupLogs();
          resolve({
            success: true,
            count: backupData.count || 0,
            message: '✅ تم استعادة ' + (backupData.count || 0) + ' موعد من النسخة الاحتياطية.'
          });
        } else {
          reject(new Error('فشل استعادة النسخة الاحتياطية'));
        }
      });
    },

    showMessage: function (message, type) {
      const element = document.getElementById("adminSettingsMessage");
      if (!element) return;
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
      }, 5000);
    },

    clearErrors: function () {
      document.querySelectorAll(".admin-settings-error").forEach(function (element) {
        element.textContent = "";
      });
    },

    showErrors: function (errors) {
      const map = {
        fullName: "adminSettingsNameError",
        phone: "adminSettingsPhoneError"
      };
      Object.keys(errors).forEach(function (key) {
        const element = document.getElementById(map[key]);
        if (element) {
          element.textContent = errors[key];
        }
      });
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      const admin = this.loadAdmin(app);
      const isMobile = state.deviceMode === "mobile";
      const isDark = state.theme === "dark";
      const adminName = admin?.fullName || "مدير Mon Médecin";
      const stats = this.getAppointmentsStats();
      const backups = this.listBackups();

      return `
        <main
          class="
            admin-settings
            ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}
          "
        >

          <!-- BACKGROUND -->
          <div class="admin-settings__orb admin-settings__orb--blue"></div>
          <div class="admin-settings__orb admin-settings__orb--cyan"></div>

          <!-- HEADER -->
          <header class="admin-settings__header">
            <button
              id="adminSettingsBack"
              class="admin-settings__back"
              type="button"
            >
              →
            </button>
            <div class="admin-settings__header-copy">
              <strong>إعدادات الإدارة</strong>
              <span>Mon Médecin Admin</span>
            </div>
            <button
              id="adminSettingsTheme"
              class="admin-settings__theme"
              type="button"
            >
              ${isDark ? "☀" : "◐"}
            </button>
          </header>

          <!-- CONTENT -->
          <section class="admin-settings__container">

            <section class="admin-settings__hero">
              <span>ADMIN</span>
              <h1>إعدادات الحساب</h1>
              <p>إدارة بيانات حساب المسؤول وكلمة المرور وإعدادات المنصة.</p>
            </section>

            <div id="adminSettingsMessage" class="admin-settings-message" hidden></div>

            <section class="admin-settings-account glass">
              <div class="admin-settings-account__avatar">
                ${this.escapeHTML(String(adminName).charAt(0))}
              </div>
              <div class="admin-settings-account__content">
                <span>مسؤول المنصة</span>
                <h2>${this.escapeHTML(adminName)}</h2>
                <small>role: admin</small>
              </div>
              <span class="admin-settings-account__status">نشط</span>
            </section>

            <section class="admin-settings-card glass">
              <div class="admin-settings-card__head">
                <div>
                  <span>الهوية</span>
                  <h2>حساب الإدارة</h2>
                </div>
                <span class="admin-settings-card__icon">⚙</span>
              </div>
              <div class="admin-settings-identity">
                <div>
                  <span>البريد الإلكتروني الإداري</span>
                  <strong dir="ltr">${this.escapeHTML(admin?.email || "")}</strong>
                </div>
                <div>
                  <span>Admin ID</span>
                  <strong dir="ltr">${this.escapeHTML(admin?.id || "ADMIN-001")}</strong>
                </div>
              </div>
              <div class="admin-settings-lock-note">
                <span>🔒</span>
                <p>البريد الإداري ومعرف الحساب وصلاحية Admin لا يمكن تغييرها من هذه الشاشة.</p>
              </div>
            </section>

            <section class="admin-settings-card glass">
              <div class="admin-settings-card__head">
                <div>
                  <span>المعلومات</span>
                  <h2>البيانات الشخصية</h2>
                </div>
                <span class="admin-settings-card__icon">👤</span>
              </div>
              <form id="adminSettingsProfileForm" class="admin-settings-form" novalidate>
                <div class="admin-settings-grid">
                  <label class="admin-settings-field">
                    <span>الاسم</span>
                    <input
                      id="adminSettingsName"
                      type="text"
                      maxlength="100"
                      value="${this.escapeHTML(admin?.fullName || "")}"
                      placeholder="اسم المسؤول"
                    >
                    <small id="adminSettingsNameError" class="admin-settings-error"></small>
                  </label>
                  <label class="admin-settings-field">
                    <span>رقم الهاتف</span>
                    <input
                      id="adminSettingsPhone"
                      type="tel"
                      inputmode="numeric"
                      maxlength="10"
                      value="${this.escapeHTML(admin?.phone || "")}"
                      placeholder="0550123456"
                      dir="ltr"
                    >
                    <small id="adminSettingsPhoneError" class="admin-settings-error"></small>
                  </label>
                  <label class="admin-settings-field">
                    <span>البريد الإلكتروني</span>
                    <input
                      type="email"
                      value="${this.escapeHTML(admin?.email || "")}"
                      disabled
                      dir="ltr"
                    >
                  </label>
                  <label class="admin-settings-field">
                    <span>نوع الحساب</span>
                    <input type="text" value="Administrator" disabled>
                  </label>
                </div>
                <button class="admin-settings-primary-button" type="submit">حفظ البيانات</button>
              </form>
            </section>

            <section class="admin-settings-card glass">
              <div class="admin-settings-card__head">
                <div>
                  <span>الأمان</span>
                  <h2>تغيير كلمة المرور</h2>
                </div>
                <span class="admin-settings-card__icon">●</span>
              </div>
              <form id="adminSettingsPasswordForm" class="admin-settings-form" novalidate>
                <div class="admin-settings-grid">
                  <label class="admin-settings-field">
                    <span>كلمة المرور الحالية</span>
                    <div class="admin-settings-password">
                      <input
                        id="adminSettingsCurrentPassword"
                        type="password"
                        autocomplete="current-password"
                        placeholder="كلمة المرور الحالية"
                        dir="ltr"
                      >
                      <button id="adminSettingsCurrentToggle" type="button">👁</button>
                    </div>
                  </label>
                  <label class="admin-settings-field">
                    <span>كلمة المرور الجديدة</span>
                    <div class="admin-settings-password">
                      <input
                        id="adminSettingsNewPassword"
                        type="password"
                        autocomplete="new-password"
                        placeholder="8 أحرف على الأقل"
                        dir="ltr"
                      >
                      <button id="adminSettingsNewToggle" type="button">👁</button>
                    </div>
                  </label>
                  <label class="admin-settings-field">
                    <span>تأكيد كلمة المرور الجديدة</span>
                    <div class="admin-settings-password">
                      <input
                        id="adminSettingsConfirmPassword"
                        type="password"
                        autocomplete="new-password"
                        placeholder="أعد كتابة كلمة المرور"
                        dir="ltr"
                      >
                      <button id="adminSettingsConfirmToggle" type="button">👁</button>
                    </div>
                  </label>
                </div>
                <div class="admin-settings-security-note">
                  <span>🔐</span>
                  <p>بعد تغيير كلمة المرور سيتم استخدام الجديدة في تسجيل الدخول التالي، ولن يعيد التطبيق كلمة المرور القديمة.</p>
                </div>
                <button class="admin-settings-primary-button" type="submit">تغيير كلمة المرور</button>
              </form>
            </section>

            <section class="admin-settings-card glass">
              <div class="admin-settings-card__head">
                <div>
                  <span>التطبيق</span>
                  <h2>التفضيلات</h2>
                </div>
                <span class="admin-settings-card__icon">◐</span>
              </div>
              <div class="admin-settings-grid">
                <label class="admin-settings-field">
                  <span>اللغة</span>
                  <select id="adminSettingsLanguage">
                    <option value="ar" ${state.language === "ar" ? "selected" : ""}>العربية</option>
                    <option value="fr" ${state.language === "fr" ? "selected" : ""}>Français</option>
                    <option value="en" ${state.language === "en" ? "selected" : ""}>English</option>
                  </select>
                </label>
                <div class="admin-settings-theme-control">
                  <span>المظهر</span>
                  <button id="adminSettingsThemeToggle" type="button">
                    <span>${isDark ? "☀" : "◐"}</span>
                    <strong>${isDark ? "الوضع الداكن" : "الوضع الفاتح"}</strong>
                  </button>
                </div>
              </div>
            </section>

            <!-- ============================================
                 🗑️ FULL CLEANUP - حذف جميع المواعيد
                 ============================================ -->
            <section class="admin-settings-card glass" style="border-color: rgba(179,77,77,0.15);">
              <div class="admin-settings-card__head">
                <div>
                  <span>🗑️ مسح جميع المواعيد</span>
                  <h2>حذف كامل لسجل المواعيد</h2>
                </div>
                <span class="admin-settings-card__icon" style="background:rgba(179,77,77,0.1);color:#b34d4d;">🧹</span>
              </div>

              <p class="admin-settings-description" style="margin-bottom:12px;color:#b34d4d;font-weight:700;">
                ⚠️ <strong>تحذير:</strong> هذا الإجراء سيحذف <strong>جميع المواعيد</strong> من النظام نهائياً!
                <br>
                <span style="font-size:8px;color:#8492a3;font-weight:400;">
                  📌 سيتم حذف المواعيد من جميع السجلات (المريض، الطبيب، والإدارة).
                </span>
                <br>
                <span style="font-size:7px;color:#25815b;font-weight:400;">
                  ✅ يتم إنشاء نسخة احتياطية تلقائياً قبل الحذف. يمكنك استعادتها لاحقاً.
                </span>
              </p>

              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:14px;">
                <div style="padding:10px;border-radius:12px;background:rgba(179,77,77,0.06);text-align:center;">
                  <span style="display:block;color:#8492a3;font-size:7px;">إجمالي المواعيد</span>
                  <strong style="font-size:16px;color:#b34d4d;" id="adminAppointmentsTotalCount">${stats.total}</strong>
                </div>
              </div>

              <button
                id="adminSettingsFullCleanupBtn"
                class="admin-settings-primary-button"
                type="button"
                style="background:linear-gradient(135deg,#b34d4d,#8a3a3a);margin-bottom:8px;"
              >
                🗑️ حذف جميع المواعيد (${stats.total})
              </button>

              <div id="adminCleanupLogs" style="margin-top:12px;display:none;">
                <span style="display:block;color:#8492a3;font-size:8px;font-weight:800;margin-bottom:8px;">📋 سجل عمليات الحذف</span>
                <div id="adminCleanupLogsList" style="max-height:150px;overflow-y:auto;border-radius:12px;background:rgba(247,250,254,0.7);padding:8px;">
                </div>
              </div>

              <div id="adminBackupRestore" style="margin-top:12px;display:none;">
                <hr style="border:none;border-top:1px solid rgba(36,67,105,0.06);margin:12px 0;">
                <span style="display:block;color:#8492a3;font-size:8px;font-weight:800;margin-bottom:8px;">💾 استعادة من نسخة احتياطية</span>
                <p style="font-size:8px;color:#8492a3;margin-bottom:10px;">
                  يمكنك استعادة المواعيد من أحدث نسخة احتياطية. هذا سيستبدل جميع المواعيد الحالية.
                </p>
                <div id="adminBackupList" style="max-height:120px;overflow-y:auto;border-radius:12px;background:rgba(247,250,254,0.7);padding:8px;">
                  ${backups.length > 0 ? backups.slice(0,5).map(function(b) {
                    const date = new Date(b.timestamp);
                    const dateStr = date.toLocaleDateString('ar-DZ', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(36,67,105,0.03);">
                        <span style="font-size:7px;color:#8492a3;">${dateStr} - ${b.count} موعد</span>
                        <button 
                          class="admin-restore-backup"
                          data-backup-key="${b.key}"
                          style="
                            min-height:24px;
                            padding:0 8px;
                            border:1px solid rgba(37,158,106,0.15);
                            border-radius:8px;
                            background:rgba(37,158,106,0.08);
                            color:#25815b;
                            font-size:6px;
                            font-weight:900;
                            cursor:pointer;
                            font-family:inherit;
                          "
                        >
                          استعادة
                        </button>
                      </div>
                    `;
                  }).join('') : `
                    <div style="text-align:center;padding:8px;color:#8492a3;font-size:7px;">
                      لا توجد نسخ احتياطية متاحة
                    </div>
                  `}
                </div>
              </div>
            </section>

            <section class="admin-settings-card admin-settings-card--danger glass">
              <div class="admin-settings-card__head">
                <div>
                  <span>الجلسة</span>
                  <h2>تسجيل الخروج</h2>
                </div>
                <span class="admin-settings-card__icon">→</span>
              </div>
              <p class="admin-settings-description">سيتم إنهاء جلسة الإدارة والعودة إلى شاشة تسجيل الدخول.</p>
              <button id="adminSettingsLogout" class="admin-settings-logout" type="button">تسجيل الخروج</button>
            </section>

          </section>

          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button id="adminSettingsNavDashboard" class="mobile-bottom-nav__item" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button id="adminSettingsNavDoctors" class="mobile-bottom-nav__item" type="button">
                <span class="mobile-bottom-nav__icon">✚</span>
                <span>الأطباء</span>
              </button>
              <button id="adminSettingsNavAppointments" class="mobile-bottom-nav__item" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>الحجوزات</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>الإعدادات</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    /* ==================================================
       INIT - FIXED
       ================================================== */

    init: function (app) {
      console.log('🔧 AdminSettingsScreen.init called');
      
      this.loadAdmin(app);
      this.loadCleanupLogs();

      const stats = this.getAppointmentsStats();
      const totalCount = document.getElementById('adminAppointmentsTotalCount');
      if (totalCount) {
        totalCount.textContent = stats.total;
      }

      // ==============================================
      // الأزرار الأساسية
      // ==============================================

      document.getElementById("adminSettingsBack")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });

      document.getElementById("adminSettingsTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.getElementById("adminSettingsPhone")?.addEventListener("input", function (event) {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
      });

      document.getElementById("adminSettingsProfileForm")?.addEventListener("submit", function (event) {
        event.preventDefault();
        AdminSettingsScreen.clearErrors();
        const data = {
          fullName: String(document.getElementById("adminSettingsName")?.value || "").trim(),
          phone: AdminSettingsScreen.normalizePhone(document.getElementById("adminSettingsPhone")?.value)
        };
        const validation = AdminSettingsScreen.validateProfile(data);
        if (!validation.valid) {
          AdminSettingsScreen.showErrors(validation.errors);
          return;
        }
        const updated = AdminSettingsScreen.updateProfile(data, app);
        if (updated) {
          setTimeout(function () { app.render(); }, 500);
        }
      });

      document.getElementById("adminSettingsPasswordForm")?.addEventListener("submit", function (event) {
        event.preventDefault();
        const currentPassword = String(document.getElementById("adminSettingsCurrentPassword")?.value || "");
        const newPassword = String(document.getElementById("adminSettingsNewPassword")?.value || "");
        const confirmPassword = String(document.getElementById("adminSettingsConfirmPassword")?.value || "");
        const changed = AdminSettingsScreen.changePassword(currentPassword, newPassword, confirmPassword, app);
        if (changed) {
          document.getElementById("adminSettingsPasswordForm")?.reset();
        }
      });

      const toggles = [
        { button: "adminSettingsCurrentToggle", input: "adminSettingsCurrentPassword", state: "passwordVisible" },
        { button: "adminSettingsNewToggle", input: "adminSettingsNewPassword", state: "newPasswordVisible" },
        { button: "adminSettingsConfirmToggle", input: "adminSettingsConfirmPassword", state: "confirmPasswordVisible" }
      ];
      toggles.forEach(function (item) {
        document.getElementById(item.button)?.addEventListener("click", function () {
          const input = document.getElementById(item.input);
          if (!input) return;
          AdminSettingsScreen[item.state] = !AdminSettingsScreen[item.state];
          const visible = AdminSettingsScreen[item.state];
          input.type = visible ? "text" : "password";
          this.textContent = visible ? "🙈" : "👁";
        });
      });

      document.getElementById("adminSettingsLanguage")?.addEventListener("change", function (event) {
        app.setLanguage(event.target.value);
      });

      document.getElementById("adminSettingsThemeToggle")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.getElementById("adminSettingsLogout")?.addEventListener("click", function () {
        if (!window.confirm("هل تريد تسجيل الخروج من حساب الإدارة؟")) return;
        app.logout();
      });

      // ==============================================
      // 🗑️ FULL CLEANUP - حذف جميع المواعيد
      // ==============================================

      document.getElementById("adminSettingsFullCleanupBtn")?.addEventListener("click", function () {
        if (AdminSettingsScreen.cleanupInProgress) return;

        const stats = AdminSettingsScreen.getAppointmentsStats();
        if (stats.total === 0) {
          AdminSettingsScreen.showMessage("✅ لا توجد مواعيد لحذفها. السجل فارغ بالفعل.", "info");
          return;
        }

        if (!window.confirm(
          "⚠️ تحذير نهائي: هذا الإجراء سيحذف جميع المواعيد (" + stats.total + " موعد) نهائياً!\n\n" +
          "✅ سيتم إنشاء نسخة احتياطية تلقائياً قبل الحذف.\n" +
          "💾 يمكنك استعادة البيانات من النسخة الاحتياطية.\n\n" +
          "📌 بعد الحذف، سيظهر عدد المواعيد = 0 في جميع الشاشات.\n\n" +
          "هل أنت متأكد من الاستمرار؟"
        )) return;

        if (!window.confirm("⚠️ تأكيد نهائي: هل تريد حذف جميع المواعيد؟")) return;

        const btn = document.getElementById("adminSettingsFullCleanupBtn");
        btn.disabled = true;
        btn.textContent = "⏳ جاري الحذف...";
        AdminSettingsScreen.cleanupInProgress = true;

        AdminSettingsScreen.deleteAllAppointments(app)
          .then(function(result) {
            AdminSettingsScreen.showMessage(result.message, "success");
            
            // تحديث العداد في جميع الشاشات
            const totalCount = document.getElementById('adminAppointmentsTotalCount');
            if (totalCount) {
              totalCount.textContent = '0';
            }
            
            // تحديث إحصائيات المواعيد في كل مكان
            document.querySelectorAll('.admin-appointments-stat strong, .admin-dashboard-stat.is-appointments strong, .doctor-dashboard-stat.is-primary strong, .secretary-appointments-stat strong, .patient-appointments-stat strong').forEach(function(el) {
              if (el.textContent && el.textContent !== '0') {
                el.textContent = '0';
              }
            });
            
            AdminSettingsScreen.loadCleanupLogs();
            app.render();
          })
          .catch(function(error) {
            AdminSettingsScreen.showMessage("❌ خطأ: " + error.message, "error");
          })
          .finally(function() {
            btn.disabled = false;
            btn.textContent = "🗑️ حذف جميع المواعيد (0)";
            AdminSettingsScreen.cleanupInProgress = false;
          });
      });

      // ==============================================
      // RESTORE BACKUP
      // ==============================================

      document.addEventListener('click', function(event) {
        const restoreBtn = event.target.closest('.admin-restore-backup');
        if (!restoreBtn) return;

        const backupKey = restoreBtn.dataset.backupKey;
        if (!backupKey) return;

        if (AdminSettingsScreen.cleanupInProgress) {
          AdminSettingsScreen.showMessage("يوجد عملية حذف قيد التنفيذ، انتظر حتى الانتهاء.", "error");
          return;
        }

        restoreBtn.disabled = true;
        restoreBtn.textContent = "⏳ جاري...";

        AdminSettingsScreen.restoreBackup(backupKey)
          .then(function(result) {
            AdminSettingsScreen.showMessage(result.message, "success");
            AdminSettingsScreen.loadCleanupLogs();
            app.render();
          })
          .catch(function(error) {
            AdminSettingsScreen.showMessage("❌ خطأ: " + error.message, "error");
          })
          .finally(function() {
            restoreBtn.disabled = false;
            restoreBtn.textContent = "استعادة";
          });
      });

      // ==============================================
      // BOTTOM NAV
      // ==============================================

      document.getElementById("adminSettingsNavDashboard")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });
      document.getElementById("adminSettingsNavDoctors")?.addEventListener("click", function () {
        app.navigate("/admin/doctors");
      });
      document.getElementById("adminSettingsNavAppointments")?.addEventListener("click", function () {
        app.navigate("/admin/appointments");
      });
    }
  };

  window.AdminSettingsScreen = AdminSettingsScreen;

})();