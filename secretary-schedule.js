/* =====================================================
   MON MÉDECIN
   SECRETARY SCHEDULE - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const SecretaryScheduleScreen = {


    /* ==================================================
       STATE
       ================================================== */

    schedule: null,

    messageTimer: null,


    /* ==================================================
       DAYS
       ================================================== */

    dayDefinitions: [
      { key: "saturday", label: "السبت" },
      { key: "sunday", label: "الأحد" },
      { key: "monday", label: "الاثنين" },
      { key: "tuesday", label: "الثلاثاء" },
      { key: "wednesday", label: "الأربعاء" },
      { key: "thursday", label: "الخميس" },
      { key: "friday", label: "الجمعة" }
    ],


    /* ==================================================
       STORAGE
       ================================================== */

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN SECRETARY SCHEDULE:", "Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN SECRETARY SCHEDULE:", "Cannot write", key, error);
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
       SECRETARY
       ================================================== */

    getSecretary: function (app) {
      return app.state.secretary || app.state.user || null;
    },


    /* ==================================================
       DOCTOR ID
       ================================================== */

    getDoctorId: function (app) {
      if (typeof app.getSecretaryDoctorId === "function") {
        const doctorId = app.getSecretaryDoctorId();
        if (doctorId) return doctorId;
      }

      const secretary = this.getSecretary(app);
      return secretary?.doctor_id || secretary?.doctorId || null;
    },


    /* ==================================================
       DOCTOR
       ================================================== */

    getDoctor: function (app) {
      if (typeof app.getSecretaryDoctor === "function") {
        return app.getSecretaryDoctor() || null;
      }

      const doctorId = this.getDoctorId(app);
      if (!doctorId) return null;

      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (!Array.isArray(doctors)) doctors = [];

      return doctors.find(function (doctor) {
        return String(doctor.id || doctor.doctor_id) === String(doctorId);
      }) || null;
    },


    /* ==================================================
       PERMISSION
       ================================================== */

    hasPermission: function (app) {
      if (typeof app.secretaryCan === "function") {
        return app.secretaryCan("schedule");
      }
      return this.getSecretary(app)?.permissions?.schedule === true;
    },


    /* ==================================================
       DEFAULT DAY
       ================================================== */

    createDefaultDay: function () {
      return { enabled: true, start: "08:00", end: "17:00" };
    },


    /* ==================================================
       DEFAULT SCHEDULE
       ================================================== */

    createDefaultSchedule: function (doctorId) {
      const days = {};
      this.dayDefinitions.forEach(function (definition) {
        days[definition.key] = this.createDefaultDay();
      }, this);

      const now = new Date().toISOString();

      return {
        id: `SCHEDULE-${doctorId}`,
        doctor_id: doctorId,
        doctorId: doctorId,
        slotDuration: 30,
        days: days,
        createdAt: now,
        updatedAt: now
      };
    },


    /* ==================================================
       NORMALIZE DAY
       ================================================== */

    normalizeDay: function (day) {
      return {
        enabled: day?.enabled !== false,
        start: day?.start || day?.startTime || "08:00",
        end: day?.end || day?.endTime || "17:00"
      };
    },


    /* ==================================================
       NORMALIZE SCHEDULE
       ================================================== */

    normalizeSchedule: function (schedule, doctorId) {
      if (!schedule || typeof schedule !== "object") {
        return this.createDefaultSchedule(doctorId);
      }

      const sourceDays = schedule.days || schedule.week || schedule.weeklySchedule || {};
      const days = {};

      this.dayDefinitions.forEach(function (definition) {
        days[definition.key] = this.normalizeDay(sourceDays[definition.key]);
      }, this);

      return {
        ...schedule,
        doctor_id: doctorId,
        doctorId: doctorId,
        slotDuration: Number(schedule.slotDuration) || 30,
        days: days
      };
    },


    /* ==================================================
       LOAD SCHEDULE
       ================================================== */

    loadSchedule: function (app) {
      const doctorId = this.getDoctorId(app);

      if (!doctorId) {
        this.schedule = null;
        return null;
      }

      let schedule = null;

      if (typeof app.getDoctorSchedule === "function") {
        schedule = app.getDoctorSchedule(doctorId);
      }

      if (!schedule) {
        let schedules = this.readJSON(localStorage, "monmedecin-doctor-schedules", []);
        if (!Array.isArray(schedules)) schedules = [];

        schedule = schedules.find(function (item) {
          return String(item.doctor_id || item.doctorId) === String(doctorId);
        }) || null;
      }

      this.schedule = this.normalizeSchedule(schedule, doctorId);
      return this.schedule;
    },


    /* ==================================================
       TIME
       ================================================== */

    timeToMinutes: function (value) {
      const parts = String(value || "").split(":").map(Number);
      if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
      return parts[0] * 60 + parts[1];
    },


    /* ==================================================
       VALIDATE DAY
       ================================================== */

    validateDay: function (day, label) {
      if (day.enabled === false) return null;

      const start = this.timeToMinutes(day.start);
      const end = this.timeToMinutes(day.end);

      if (start === null || end === null) {
        return `تحقق من أوقات يوم ${label}.`;
      }
      if (end <= start) {
        return `وقت نهاية ${label} يجب أن يكون بعد وقت البداية.`;
      }
      return null;
    },


    /* ==================================================
       GET FORM DATA
       ================================================== */

    getFormData: function () {
      const days = {};

      this.dayDefinitions.forEach(function (definition) {
        const key = definition.key;
        days[key] = {
          enabled: Boolean(document.getElementById(`secretaryScheduleEnabled-${key}`)?.checked),
          start: String(document.getElementById(`secretaryScheduleStart-${key}`)?.value || "08:00"),
          end: String(document.getElementById(`secretaryScheduleEnd-${key}`)?.value || "17:00")
        };
      });

      return {
        slotDuration: Number(document.getElementById("secretaryScheduleSlotDuration")?.value || 30),
        days: days
      };
    },


    /* ==================================================
       VALIDATE
       ================================================== */

    validate: function (data) {
      const allowedDurations = [15, 20, 30, 45, 60];

      if (!allowedDurations.includes(Number(data.slotDuration))) {
        return { valid: false, message: "مدة الفاصل بين الحجوزات غير صحيحة." };
      }

      let enabledDays = 0;

      for (const definition of this.dayDefinitions) {
        const day = data.days[definition.key];
        if (day.enabled) enabledDays++;

        const error = this.validateDay(day, definition.label);
        if (error) {
          return { valid: false, message: error };
        }
      }

      if (enabledDays === 0) {
        return { valid: false, message: "يجب أن يبقى يوم عمل واحد على الأقل." };
      }

      return { valid: true };
    },


    /* ==================================================
       SAVE
       ================================================== */

    saveSchedule: function (data, app) {
      if (!this.hasPermission(app)) {
        this.showMessage("لا تملك صلاحية تعديل جدول الطبيب.", "error");
        return false;
      }

      const doctorId = this.getDoctorId(app);
      if (!doctorId) {
        this.showMessage("تعذر تحديد الطبيب المرتبط بحسابك.", "error");
        return false;
      }

      const validation = this.validate(data);
      if (!validation.valid) {
        this.showMessage(validation.message, "error");
        return false;
      }

      let schedules = this.readJSON(localStorage, "monmedecin-doctor-schedules", []);
      if (!Array.isArray(schedules)) schedules = [];

      const index = schedules.findIndex(function (schedule) {
        return String(schedule.doctor_id || schedule.doctorId) === String(doctorId);
      });

      const existing = index >= 0 ? schedules[index] : null;
      const secretary = this.getSecretary(app);
      const now = new Date().toISOString();

      const schedule = {
        ...(existing || {}),
        id: existing?.id || `SCHEDULE-${doctorId}`,
        doctor_id: doctorId,
        doctorId: doctorId,
        slotDuration: Number(data.slotDuration),
        days: data.days,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        lastUpdatedBy: "secretary",
        lastUpdatedById: secretary?.id || secretary?.secretary_id || null,
        lastUpdatedByName: secretary?.fullName || secretary?.name || "Secretary"
      };

      if (index >= 0) {
        schedules[index] = schedule;
      } else {
        schedules.push(schedule);
      }

      const saved = this.writeJSON(localStorage, "monmedecin-doctor-schedules", schedules);
      if (!saved) {
        this.showMessage("تعذر حفظ جدول العمل.", "error");
        return false;
      }

      this.schedule = schedule;
      this.showMessage("تم تحديث جدول الطبيب بنجاح.", "success");
      return true;
    },


    /* ==================================================
       UPDATE DAY UI
       ================================================== */

    updateDayState: function (key) {
      const enabled = document.getElementById(`secretaryScheduleEnabled-${key}`)?.checked;
      const card = document.querySelector(`[data-secretary-schedule-day="${key}"]`);
      const start = document.getElementById(`secretaryScheduleStart-${key}`);
      const end = document.getElementById(`secretaryScheduleEnd-${key}`);

      card?.classList.toggle("is-disabled", !enabled);
      if (start) start.disabled = !enabled;
      if (end) end.disabled = !enabled;
    },


    /* ==================================================
       COPY DAY
       ================================================== */

    copyDayToAll: function (sourceKey) {
      const enabled = Boolean(document.getElementById(`secretaryScheduleEnabled-${sourceKey}`)?.checked);
      const start = document.getElementById(`secretaryScheduleStart-${sourceKey}`)?.value || "08:00";
      const end = document.getElementById(`secretaryScheduleEnd-${sourceKey}`)?.value || "17:00";

      this.dayDefinitions.forEach(function (definition) {
        const dayEnabled = document.getElementById(`secretaryScheduleEnabled-${definition.key}`);
        const dayStart = document.getElementById(`secretaryScheduleStart-${definition.key}`);
        const dayEnd = document.getElementById(`secretaryScheduleEnd-${definition.key}`);

        if (dayEnabled) dayEnabled.checked = enabled;
        if (dayStart) dayStart.value = start;
        if (dayEnd) dayEnd.value = end;

        SecretaryScheduleScreen.updateDayState(definition.key);
      });
    },


    /* ==================================================
       ENABLE ALL
       ================================================== */

    enableAllDays: function (enabled) {
      this.dayDefinitions.forEach(function (definition) {
        const input = document.getElementById(`secretaryScheduleEnabled-${definition.key}`);
        if (input) input.checked = Boolean(enabled);
        SecretaryScheduleScreen.updateDayState(definition.key);
      });
    },


    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("secretaryScheduleMessage");
      if (!element) return;

      element.hidden = false;
      element.textContent = message;
      element.className = "secretary-schedule-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 3500);
    },


    /* ==================================================
       DAY
       ================================================== */

    renderDay: function (definition) {
      const day = this.schedule?.days?.[definition.key] || this.createDefaultDay();

      return `
        <article class="secretary-schedule-day glass ${day.enabled ? "" : "is-disabled"}" data-secretary-schedule-day="${definition.key}">
          <div class="secretary-schedule-day__header">
            <div>
              <strong>${this.escapeHTML(definition.label)}</strong>
              <span>${day.enabled ? "يوم عمل" : "عطلة"}</span>
            </div>
            <label class="secretary-schedule-switch">
              <input id="secretaryScheduleEnabled-${definition.key}" type="checkbox" ${day.enabled ? "checked" : ""}>
              <span></span>
            </label>
          </div>
          <div class="secretary-schedule-day__times">
            <label>
              <span>من</span>
              <input id="secretaryScheduleStart-${definition.key}" type="time" value="${this.escapeHTML(day.start)}" ${day.enabled ? "" : "disabled"}>
            </label>
            <label>
              <span>إلى</span>
              <input id="secretaryScheduleEnd-${definition.key}" type="time" value="${this.escapeHTML(day.end)}" ${day.enabled ? "" : "disabled"}>
            </label>
          </div>
          <button type="button" class="secretary-schedule-copy" data-secretary-schedule-copy="${definition.key}">
            تطبيق على كل الأسبوع
          </button>
        </article>
      `;
    },


    /* ==================================================
       SUMMARY
       ================================================== */

    renderSummary: function () {
      if (!this.schedule) return "";

      const enabledDays = this.dayDefinitions.filter(function (definition) {
        return this.schedule?.days?.[definition.key]?.enabled !== false;
      }, this).length;

      return `
        <div class="secretary-schedule-summary__item">
          <span>أيام العمل</span>
          <strong>${enabledDays} / 7</strong>
        </div>
        <div class="secretary-schedule-summary__item">
          <span>الفاصل بين المواعيد</span>
          <strong>${Number(this.schedule.slotDuration) || 30} دقيقة</strong>
        </div>
      `;
    },


    /* ==================================================
       BLOCKED
       ================================================== */

    renderBlocked: function (state) {
      return `
        <main class="secretary-schedule ${state.deviceMode === "mobile" ? "mobile-app-page" : "website-page"}">
          <section class="secretary-schedule-blocked glass">
            <span>🔒</span>
            <h1>لا توجد صلاحية</h1>
            <p>الطبيب لم يمنح حسابك صلاحية تعديل جدول العمل.</p>
            <button id="secretaryScheduleBlockedBack" type="button">العودة للرئيسية</button>
          </section>
        </main>
      `;
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      if (!this.hasPermission(app)) {
        return this.renderBlocked(state);
      }

      this.loadSchedule(app);

      const doctor = this.getDoctor(app);
      const secretary = this.getSecretary(app);
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="secretary-schedule ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="secretary-schedule__orb secretary-schedule__orb--blue"></div>
          <div class="secretary-schedule__orb secretary-schedule__orb--cyan"></div>

          <header class="secretary-schedule__header">
            <button id="secretaryScheduleBack" class="secretary-schedule__back" type="button">→</button>
            <div class="secretary-schedule__header-copy">
              <strong>جدول الطبيب</strong>
              <span>${this.escapeHTML(doctor?.fullName || "الطبيب")}</span>
            </div>
            <button id="secretaryScheduleTheme" class="secretary-schedule__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="secretary-schedule__container">

            <section class="secretary-schedule__hero">
              <span>SECRETARY</span>
              <h1>تنظيم جدول العمل</h1>
              <p>عدّل أيام وساعات عمل الطبيب حسب الصلاحية التي منحها لك.</p>
            </section>

            <div id="secretaryScheduleMessage" class="secretary-schedule-message" hidden></div>

            <section class="secretary-schedule-account glass">
              <div>
                <span>السكرتير</span>
                <strong>${this.escapeHTML(secretary?.fullName || "سكرتير")}</strong>
              </div>
              <div>
                <span>الطبيب المرتبط</span>
                <strong>${this.escapeHTML(doctor?.fullName || "—")}</strong>
              </div>
            </section>

            <section class="secretary-schedule-info glass">
              <span>ℹ</span>
              <p>أي تعديل تحفظه هنا يغيّر جدول الطبيب نفسه، ولذلك ستتغير الأوقات التي تظهر للمرضى عند الحجز.</p>
            </section>

            <section class="secretary-schedule-card glass">
              <div class="secretary-schedule-card__head">
                <div>
                  <span>الحجوزات</span>
                  <h2>الفاصل بين المواعيد</h2>
                </div>
                <span class="secretary-schedule-card__icon">⏱</span>
              </div>
              <label class="secretary-schedule-duration">
                <span>Slot Duration</span>
                <select id="secretaryScheduleSlotDuration">
                  ${[15, 20, 30, 45, 60].map(function(duration) {
                    return `
                      <option value="${duration}" ${Number(this.schedule?.slotDuration) === duration ? "selected" : ""}>
                        ${duration} دقيقة
                      </option>
                    `;
                  }, this).join("")}
                </select>
              </label>
              <div class="secretary-schedule-global-actions">
                <button id="secretaryScheduleEnableAll" type="button">العمل طوال الأسبوع</button>
                <button id="secretaryScheduleDisableAll" type="button">تعطيل جميع الأيام</button>
              </div>
            </section>

            <section id="secretaryScheduleSummary" class="secretary-schedule-summary glass">
              ${this.renderSummary()}
            </section>

            <section class="secretary-schedule-days">
              ${this.dayDefinitions.map(function(definition) {
                return this.renderDay(definition);
              }, this).join("")}
            </section>

            <section class="secretary-schedule-save glass">
              <div>
                <strong>حفظ جدول الطبيب</strong>
                <span>التعديلات ستصبح المصدر الجديد لأوقات الحجز.</span>
              </div>
              <button id="secretaryScheduleSave" type="button">حفظ التغييرات</button>
            </section>

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
              <button class="mobile-bottom-nav__item is-active" data-nav="schedule" type="button">
                <span class="mobile-bottom-nav__icon">▦</span>
                <span>الجدول</span>
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
      document.getElementById("secretaryScheduleBlockedBack")?.addEventListener("click", function () {
        app.navigate("/secretary/dashboard");
      });

      if (!this.hasPermission(app)) return;

      document.getElementById("secretaryScheduleBack")?.addEventListener("click", function () {
        app.navigate("/secretary/dashboard");
      });

      document.getElementById("secretaryScheduleTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      this.dayDefinitions.forEach(function (definition) {
        document.getElementById(`secretaryScheduleEnabled-${definition.key}`)?.addEventListener("change", function () {
          SecretaryScheduleScreen.updateDayState(definition.key);
        });
      });

      document.querySelectorAll("[data-secretary-schedule-copy]").forEach(function (button) {
        button.addEventListener("click", function () {
          const confirmed = window.confirm("هل تريد تطبيق إعدادات هذا اليوم على جميع أيام الأسبوع؟");
          if (confirmed) {
            SecretaryScheduleScreen.copyDayToAll(this.dataset.secretaryScheduleCopy);
          }
        });
      });

      document.getElementById("secretaryScheduleEnableAll")?.addEventListener("click", function () {
        SecretaryScheduleScreen.enableAllDays(true);
      });

      document.getElementById("secretaryScheduleDisableAll")?.addEventListener("click", function () {
        SecretaryScheduleScreen.enableAllDays(false);
      });

      document.getElementById("secretaryScheduleSave")?.addEventListener("click", function () {
        const data = SecretaryScheduleScreen.getFormData();
        const saved = SecretaryScheduleScreen.saveSchedule(data, app);
        if (saved) app.render();
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
      document.querySelectorAll("[data-nav='schedule']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/secretary/schedule");
        });
      });
    }

  };


  window.SecretaryScheduleScreen = SecretaryScheduleScreen;

})();