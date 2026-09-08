/* =====================================================
   MON MÉDECIN
   DOCTOR SCHEDULE - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const DoctorScheduleScreen = {


    /* ==================================================
       STATE
       ================================================== */

    schedule: null,

    messageTimer: null,


    /* ==================================================
       DEFAULT DAYS
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
        console.warn("MON MÉDECIN DOCTOR SCHEDULE:", "Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN DOCTOR SCHEDULE:", "Cannot write", key, error);
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

    getDoctor: function (app) {
      return app.state.doctor || app.state.user || null;
    },

    getDoctorId: function (app) {
      const doctor = this.getDoctor(app);
      return doctor?.id ?? doctor?.doctor_id ?? app.getDoctorId?.() ?? null;
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

      return {
        id: "SCHEDULE-" + doctorId,
        doctor_id: doctorId,
        doctorId: doctorId,
        slotDuration: 30,
        days: days,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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

      const normalized = {
        ...schedule,
        doctor_id: doctorId,
        doctorId: doctorId,
        slotDuration: Number(schedule.slotDuration) || 30,
        days: {}
      };

      const sourceDays = schedule.days || schedule.week || schedule.weeklySchedule || {};

      this.dayDefinitions.forEach(function (definition) {
        normalized.days[definition.key] = this.normalizeDay(sourceDays[definition.key]);
      }, this);

      return normalized;
    },


    /* ==================================================
       LOAD
       ================================================== */

    loadSchedule: function (app) {
      const doctorId = this.getDoctorId(app);
      if (!doctorId) {
        this.schedule = null;
        return null;
      }

      let schedules = this.readJSON(localStorage, "monmedecin-doctor-schedules", []);
      if (!Array.isArray(schedules)) schedules = [];

      let schedule = schedules.find(function (item) {
        return String(item.doctor_id || item.doctorId) === String(doctorId);
      });

      schedule = this.normalizeSchedule(schedule, doctorId);
      this.schedule = schedule;
      return schedule;
    },


    /* ==================================================
       TIME HELPERS
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
      if (end - start < 60) {
        return `مدة العمل في يوم ${label} يجب أن تكون ساعة على الأقل.`;
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
          enabled: Boolean(document.getElementById(`doctorScheduleEnabled-${key}`)?.checked),
          start: String(document.getElementById(`doctorScheduleStart-${key}`)?.value || "08:00"),
          end: String(document.getElementById(`doctorScheduleEnd-${key}`)?.value || "17:00")
        };
      });

      const slotDuration = Number(document.getElementById("doctorScheduleSlotDuration")?.value || 30);

      return { slotDuration, days };
    },


    /* ==================================================
       VALIDATE
       ================================================== */

    validate: function (data) {
      const allowedDurations = [15, 20, 30, 45, 60];
      if (!allowedDurations.includes(Number(data.slotDuration))) {
        return { valid: false, message: "مدة الموعد غير صحيحة." };
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
        return { valid: false, message: "يجب تفعيل يوم عمل واحد على الأقل." };
      }

      return { valid: true };
    },


    /* ==================================================
       SAVE SCHEDULE
       ================================================== */

    saveSchedule: function (data, app) {
      const doctorId = this.getDoctorId(app);
      if (!doctorId) {
        this.showMessage("تعذر تحديد حساب الطبيب.", "error");
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

      const now = new Date().toISOString();
      const existing = index >= 0 ? schedules[index] : null;

      const schedule = {
        ...(existing || {}),
        id: existing?.id || `SCHEDULE-${doctorId}`,
        doctor_id: doctorId,
        doctorId: doctorId,
        slotDuration: Number(data.slotDuration),
        days: data.days,
        createdAt: existing?.createdAt || now,
        updatedAt: now
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
      if (app && app.state) {
        app.state.doctorSchedule = schedule;
      }

      this.showMessage("تم حفظ جدول العمل بنجاح.", "success");
      return true;
    },


    /* ==================================================
       COPY DAY
       ================================================== */

    copyDayToAll: function (sourceKey) {
      const sourceEnabled = document.getElementById(`doctorScheduleEnabled-${sourceKey}`)?.checked;
      const sourceStart = document.getElementById(`doctorScheduleStart-${sourceKey}`)?.value;
      const sourceEnd = document.getElementById(`doctorScheduleEnd-${sourceKey}`)?.value;

      this.dayDefinitions.forEach(function (definition) {
        const enabled = document.getElementById(`doctorScheduleEnabled-${definition.key}`);
        const start = document.getElementById(`doctorScheduleStart-${definition.key}`);
        const end = document.getElementById(`doctorScheduleEnd-${definition.key}`);

        if (enabled) enabled.checked = Boolean(sourceEnabled);
        if (start && sourceStart) start.value = sourceStart;
        if (end && sourceEnd) end.value = sourceEnd;

        DoctorScheduleScreen.updateDayState(definition.key);
      });
    },


    /* ==================================================
       ENABLE ALL
       ================================================== */

    enableAllDays: function (value) {
      this.dayDefinitions.forEach(function (definition) {
        const input = document.getElementById(`doctorScheduleEnabled-${definition.key}`);
        if (input) input.checked = Boolean(value);
        DoctorScheduleScreen.updateDayState(definition.key);
      });
    },


    /* ==================================================
       UPDATE DAY UI
       ================================================== */

    updateDayState: function (key) {
      const enabled = document.getElementById(`doctorScheduleEnabled-${key}`)?.checked;
      const card = document.querySelector(`[data-doctor-schedule-day="${key}"]`);
      const start = document.getElementById(`doctorScheduleStart-${key}`);
      const end = document.getElementById(`doctorScheduleEnd-${key}`);

      card?.classList.toggle("is-disabled", !enabled);
      if (start) start.disabled = !enabled;
      if (end) end.disabled = !enabled;
    },


    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("doctorScheduleMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = "doctor-schedule-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 3500);
    },


    /* ==================================================
       RENDER DAY
       ================================================== */

    renderDay: function (definition) {
      const day = this.schedule?.days?.[definition.key] || this.createDefaultDay();

      return `
        <article class="doctor-schedule-day glass ${day.enabled ? "" : "is-disabled"}" data-doctor-schedule-day="${definition.key}">
          <div class="doctor-schedule-day__header">
            <div>
              <strong>${this.escapeHTML(definition.label)}</strong>
              <span>${day.enabled ? "يوم عمل" : "عطلة"}</span>
            </div>
            <label class="doctor-schedule-switch">
              <input id="doctorScheduleEnabled-${definition.key}" type="checkbox" ${day.enabled ? "checked" : ""}>
              <span></span>
            </label>
          </div>
          <div class="doctor-schedule-day__times">
            <label>
              <span>من</span>
              <input id="doctorScheduleStart-${definition.key}" type="time" value="${this.escapeHTML(day.start)}" ${day.enabled ? "" : "disabled"}>
            </label>
            <label>
              <span>إلى</span>
              <input id="doctorScheduleEnd-${definition.key}" type="time" value="${this.escapeHTML(day.end)}" ${day.enabled ? "" : "disabled"}>
            </label>
          </div>
          <button type="button" class="doctor-schedule-copy" data-doctor-schedule-copy="${definition.key}">
            تطبيق هذا اليوم على كل الأسبوع
          </button>
        </article>
      `;
    },


    /* ==================================================
       RENDER SUMMARY
       ================================================== */

    renderSummary: function () {
      if (!this.schedule) return "";

      const enabledDays = this.dayDefinitions.filter(function (definition) {
        return this.schedule?.days?.[definition.key]?.enabled !== false;
      }, this);

      return `
        <div class="doctor-schedule-summary__item">
          <span>أيام العمل</span>
          <strong>${enabledDays.length} / 7</strong>
        </div>
        <div class="doctor-schedule-summary__item">
          <span>مدة كل Slot</span>
          <strong>${Number(this.schedule.slotDuration) || 30} دقيقة</strong>
        </div>
      `;
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadSchedule(app);
      const doctor = this.getDoctor(app);
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="doctor-schedule ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-schedule__orb doctor-schedule__orb--blue"></div>
          <div class="doctor-schedule__orb doctor-schedule__orb--cyan"></div>

          <header class="doctor-schedule__header">
            <button id="doctorScheduleBack" class="doctor-schedule__back" type="button">→</button>
            <div class="doctor-schedule__header-copy">
              <strong>جدول العمل</strong>
              <span>${this.escapeHTML(doctor?.fullName || "الطبيب")}</span>
            </div>
            <button id="doctorScheduleTheme" class="doctor-schedule__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="doctor-schedule__container">
            <section class="doctor-schedule__hero">
              <span>AVAILABILITY</span>
              <h1>مواعيد العمل</h1>
              <p>حدّد أيام وساعات عملك ومدة الفاصل بين المواعيد التي ستظهر للمرضى أثناء الحجز.</p>
            </section>

            <div id="doctorScheduleMessage" class="doctor-schedule-message" hidden></div>

            <section class="doctor-schedule-info glass">
              <span>ℹ</span>
              <p>الجمعة ليست عطلة إجبارية. يمكنك تشغيل أو تعطيل أي يوم حسب نظام عملك.</p>
            </section>

            <section class="doctor-schedule-card glass">
              <div class="doctor-schedule-card__head">
                <div>
                  <span>إعدادات عامة</span>
                  <h2>مدة المواعيد</h2>
                </div>
                <span class="doctor-schedule-card__icon">⏱</span>
              </div>
              <label class="doctor-schedule-duration">
                <span>الفاصل الافتراضي بين الحجوزات</span>
                <select id="doctorScheduleSlotDuration">
                  ${[15, 20, 30, 45, 60].map(function(duration) {
                    return `
                      <option value="${duration}" ${Number(this.schedule?.slotDuration) === duration ? "selected" : ""}>
                        ${duration} دقيقة
                      </option>
                    `;
                  }, this).join("")}
                </select>
              </label>
              <div class="doctor-schedule-global-actions">
                <button id="doctorScheduleEnableAll" type="button">العمل طوال الأسبوع</button>
                <button id="doctorScheduleDisableAll" type="button">تعطيل جميع الأيام</button>
              </div>
            </section>

            <section class="doctor-schedule-summary glass" id="doctorScheduleSummary">
              ${this.renderSummary()}
            </section>

            <section class="doctor-schedule-days">
              ${this.dayDefinitions.map(function(definition) {
                return this.renderDay(definition);
              }, this).join("")}
            </section>

            <section class="doctor-schedule-save glass">
              <div>
                <strong>حفظ جدول العمل</strong>
                <span>ستظهر الأوقات الجديدة للمرضى مباشرة في شاشة الحجز.</span>
              </div>
              <button id="doctorScheduleSave" type="button">حفظ التغييرات</button>
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
              <button class="mobile-bottom-nav__item is-active" data-nav="schedule" type="button">
                <span class="mobile-bottom-nav__icon">▦</span>
                <span>الجدول</span>
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
      console.log("MON MÉDECIN: DoctorScheduleScreen init");

      document.getElementById("doctorScheduleBack")?.addEventListener("click", function () {
        app.navigate("/doctor/dashboard");
      });

      document.getElementById("doctorScheduleTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      this.dayDefinitions.forEach(function (definition) {
        document.getElementById(`doctorScheduleEnabled-${definition.key}`)?.addEventListener("change", function () {
          DoctorScheduleScreen.updateDayState(definition.key);
        });
      });

      document.querySelectorAll("[data-doctor-schedule-copy]").forEach(function (button) {
        button.addEventListener("click", function () {
          const key = this.dataset.doctorScheduleCopy;
          const confirmed = window.confirm("هل تريد تطبيق إعدادات هذا اليوم على جميع أيام الأسبوع؟");
          if (confirmed) {
            DoctorScheduleScreen.copyDayToAll(key);
          }
        });
      });

      document.getElementById("doctorScheduleEnableAll")?.addEventListener("click", function () {
        DoctorScheduleScreen.enableAllDays(true);
      });

      document.getElementById("doctorScheduleDisableAll")?.addEventListener("click", function () {
        DoctorScheduleScreen.enableAllDays(false);
      });

      document.getElementById("doctorScheduleSave")?.addEventListener("click", function () {
        const data = DoctorScheduleScreen.getFormData();
        const saved = DoctorScheduleScreen.saveSchedule(data, app);
        if (saved) {
          setTimeout(function () { app.render(); }, 300);
        }
      });

      // BOTTOM NAV - ADDED
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
      document.querySelectorAll("[data-nav='schedule']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/schedule");
        });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/account");
        });
      });
    }

  };


  window.DoctorScheduleScreen = DoctorScheduleScreen;

})();