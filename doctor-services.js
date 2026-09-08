/* =====================================================
   MON MÉDECIN
   DOCTOR SERVICES - WITH BOTTOM NAV
   ===================================================== */

(function () {

  "use strict";


  const DoctorServicesScreen = {


    /* ==================================================
       STATE
       ================================================== */

    services: [],

    selectedServiceId: null,

    editorOpen: false,

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
        console.warn("MON MÉDECIN DOCTOR SERVICES:", "Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN DOCTOR SERVICES:", "Cannot write", key, error);
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
       CREATE ID
       ================================================== */

    createServiceId: function () {
      return "SERVICE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    },


    /* ==================================================
       ALL SERVICES
       ================================================== */

    getAllServices: function () {
      let services = this.readJSON(localStorage, "monmedecin-doctor-services", []);
      if (!Array.isArray(services)) services = [];
      return services;
    },


    /* ==================================================
       LOAD SERVICES
       ================================================== */

    loadServices: function (app) {
      const doctorId = this.getDoctorId(app);
      if (!doctorId) {
        this.services = [];
        return [];
      }

      const services = this.getAllServices();

      this.services = services
        .filter(function (service) {
          return String(service.doctor_id || service.doctorId) === String(doctorId);
        })
        .sort(function (a, b) {
          return String(a.name || "").localeCompare(String(b.name || ""), "ar");
        });

      // If no services found, try to get from professional profile
      if (this.services.length === 0) {
        const professional = this.readJSON(
          localStorage,
          `monmedecin-doctor-professional-${doctorId}`,
          null
        );
        if (professional && Array.isArray(professional.services)) {
          this.syncFromProfessional(doctorId, professional.services);
        }
      }

      return this.services;
    },


    /* ==================================================
       SYNC FROM PROFESSIONAL
       ================================================== */

    syncFromProfessional: function (doctorId, professionalServices) {
      let allServices = this.getAllServices();

      allServices = allServices.filter(function (s) {
        return String(s.doctor_id || s.doctorId) !== String(doctorId);
      });

      professionalServices.forEach(function (service) {
        allServices.push({
          ...service,
          doctor_id: doctorId,
          doctorId: doctorId,
          updatedAt: new Date().toISOString()
        });
      });

      this.writeJSON(localStorage, "monmedecin-doctor-services", allServices);

      this.services = allServices
        .filter(function (service) {
          return String(service.doctor_id || service.doctorId) === String(doctorId);
        })
        .sort(function (a, b) {
          return String(a.name || "").localeCompare(String(b.name || ""), "ar");
        });
    },


    /* ==================================================
       FIND SERVICE
       ================================================== */

    findService: function (serviceId) {
      return this.services.find(function (service) {
        return String(service.id || service.service_id) === String(serviceId);
      }) || null;
    },


    /* ==================================================
       SELECT SERVICE
       ================================================== */

    openEditor: function (serviceId, app) {
      this.selectedServiceId = serviceId || null;
      this.editorOpen = true;
      app.render();
    },

    closeEditor: function (app) {
      this.selectedServiceId = null;
      this.editorOpen = false;
      app.render();
    },


    /* ==================================================
       VALIDATE
       ================================================== */

    validateService: function (data) {
      if (!data.name || data.name.length < 2) {
        return { valid: false, message: "أدخل اسم الخدمة." };
      }
      if (!Number.isFinite(data.price) || data.price < 0) {
        return { valid: false, message: "سعر الخدمة غير صحيح." };
      }
      if (!Number.isFinite(data.duration) || data.duration < 5) {
        return { valid: false, message: "مدة الخدمة يجب أن تكون 5 دقائق على الأقل." };
      }
      if (data.duration > 480) {
        return { valid: false, message: "مدة الخدمة كبيرة جدًا (الحد الأقصى 480 دقيقة)." };
      }
      return { valid: true };
    },


    /* ==================================================
       SAVE SERVICE
       ================================================== */

    saveService: function (data, app) {
      const doctorId = this.getDoctorId(app);
      if (!doctorId) {
        this.showMessage("تعذر تحديد حساب الطبيب.", "error");
        return false;
      }

      const validation = this.validateService(data);
      if (!validation.valid) {
        this.showMessage(validation.message, "error");
        return false;
      }

      let services = this.getAllServices();
      const now = new Date().toISOString();

      if (this.selectedServiceId) {
        const index = services.findIndex(function (service) {
          return String(service.id || service.service_id) === String(this.selectedServiceId) &&
                 String(service.doctor_id || service.doctorId) === String(doctorId);
        }, this);

        if (index < 0) {
          this.showMessage("تعذر العثور على الخدمة.", "error");
          return false;
        }

        services[index] = {
          ...services[index],
          name: data.name,
          description: data.description,
          price: data.price,
          duration: data.duration,
          durationMinutes: data.duration,
          active: data.active,
          updatedAt: now
        };

      } else {
        const id = this.createServiceId();
        services.push({
          id: id,
          service_id: id,
          doctor_id: doctorId,
          doctorId: doctorId,
          name: data.name,
          description: data.description,
          price: data.price,
          duration: data.duration,
          durationMinutes: data.duration,
          active: data.active,
          createdAt: now,
          updatedAt: now
        });
      }

      const saved = this.writeJSON(localStorage, "monmedecin-doctor-services", services);
      if (!saved) {
        this.showMessage("تعذر حفظ الخدمة.", "error");
        return false;
      }

      this.syncWithProfessional(doctorId, services);
      this.loadServices(app);
      this.selectedServiceId = null;
      this.editorOpen = false;
      this.showMessage("تم حفظ الخدمة بنجاح.", "success");
      return true;
    },


    /* ==================================================
       SYNC WITH PROFESSIONAL PROFILE
       ================================================== */

    syncWithProfessional: function (doctorId, services) {
      let professional = this.readJSON(
        localStorage,
        `monmedecin-doctor-professional-${doctorId}`,
        null
      );

      if (!professional) {
        professional = { doctorId: doctorId, services: [] };
      }

      const doctorServices = services.filter(function (s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId);
      });

      professional.services = doctorServices.map(function (s) {
        return {
          id: s.id,
          name: s.name,
          description: s.description || "",
          duration: s.duration || s.durationMinutes || 30,
          price: s.price || 0,
          active: s.active !== false
        };
      });

      this.writeJSON(localStorage, `monmedecin-doctor-professional-${doctorId}`, professional);

      let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      if (Array.isArray(doctors)) {
        const doctorIndex = doctors.findIndex(function (d) {
          return String(d.id) === String(doctorId);
        });
        if (doctorIndex >= 0) {
          if (!doctors[doctorIndex].professional) {
            doctors[doctorIndex].professional = {};
          }
          doctors[doctorIndex].professional.services = professional.services;
          this.writeJSON(localStorage, "monmedecin-doctors", doctors);
        }
      }

      if (typeof app !== 'undefined' && app.state && app.state.doctor) {
        if (!app.state.doctor.professional) {
          app.state.doctor.professional = {};
        }
        app.state.doctor.professional.services = professional.services;
      }
    },


    /* ==================================================
       TOGGLE SERVICE
       ================================================== */

    toggleService: function (serviceId, app) {
      const doctorId = this.getDoctorId(app);
      let services = this.getAllServices();

      const index = services.findIndex(function (service) {
        return String(service.id || service.service_id) === String(serviceId) &&
               String(service.doctor_id || service.doctorId) === String(doctorId);
      });

      if (index < 0) {
        this.showMessage("الخدمة غير موجودة.", "error");
        return false;
      }

      services[index] = {
        ...services[index],
        active: services[index].active === false,
        updatedAt: new Date().toISOString()
      };

      const saved = this.writeJSON(localStorage, "monmedecin-doctor-services", services);
      if (!saved) {
        this.showMessage("تعذر تحديث الخدمة.", "error");
        return false;
      }

      this.syncWithProfessional(doctorId, services);
      this.loadServices(app);
      this.showMessage(services[index].active ? "تم تفعيل الخدمة." : "تم تعطيل الخدمة.", "success");
      return true;
    },


    /* ==================================================
       DELETE SERVICE
       ================================================== */

    deleteService: function (serviceId, app) {
      const doctorId = this.getDoctorId(app);
      let services = this.getAllServices();

      const service = services.find(function (item) {
        return String(item.id || item.service_id) === String(serviceId) &&
               String(item.doctor_id || item.doctorId) === String(doctorId);
      });

      if (!service) {
        this.showMessage("الخدمة غير موجودة.", "error");
        return false;
      }

      let appointments = typeof app.getAppointments === "function" ? app.getAppointments() : [];
      const used = appointments.some(function (appointment) {
        return String(appointment.service_id || appointment.serviceId) === String(serviceId);
      });

      if (used) {
        services = services.map(function (item) {
          if (String(item.id || item.service_id) === String(serviceId)) {
            return { ...item, active: false, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          }
          return item;
        });

        this.writeJSON(localStorage, "monmedecin-doctor-services", services);
        this.syncWithProfessional(doctorId, services);
        this.loadServices(app);
        this.showMessage("تمت أرشفة الخدمة لأنها مستخدمة في حجوزات سابقة.", "info");
        return true;
      }

      const confirmed = window.confirm("هل تريد حذف هذه الخدمة نهائياً؟");
      if (!confirmed) return false;

      services = services.filter(function (item) {
        return !(String(item.id || item.service_id) === String(serviceId) &&
                 String(item.doctor_id || item.doctorId) === String(doctorId));
      });

      const saved = this.writeJSON(localStorage, "monmedecin-doctor-services", services);
      if (!saved) {
        this.showMessage("تعذر حذف الخدمة.", "error");
        return false;
      }

      this.syncWithProfessional(doctorId, services);
      this.loadServices(app);
      this.showMessage("تم حذف الخدمة.", "success");
      return true;
    },


    /* ==================================================
       STATS
       ================================================== */

    getStats: function () {
      return {
        total: this.services.length,
        active: this.services.filter(function (service) { return service.active !== false; }).length,
        disabled: this.services.filter(function (service) { return service.active === false; }).length
      };
    },


    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("doctorServicesMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = "doctor-services-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 3500);
    },


    /* ==================================================
       RENDER SERVICE CARD
       ================================================== */

    renderService: function (service) {
      const serviceId = service.id || service.service_id;
      const active = service.active !== false;

      return `
        <article class="doctor-service-card glass ${active ? "" : "is-disabled"}">
          <div class="doctor-service-card__top">
            <div class="doctor-service-card__icon">⚕</div>
            <div class="doctor-service-card__copy">
              <span>خدمة طبية</span>
              <h3>${this.escapeHTML(service.name || "خدمة")}</h3>
            </div>
            <span class="doctor-service-status ${active ? "is-active" : "is-disabled"}">
              ${active ? "نشطة" : "متوقفة"}
            </span>
          </div>
          <p class="doctor-service-card__description">
            ${this.escapeHTML(service.description || "لا يوجد وصف إضافي.")}
          </p>
          <div class="doctor-service-card__info">
            <div>
              <span>السعر</span>
              <strong>${Number(service.price) || 0} دج</strong>
            </div>
            <div>
              <span>المدة</span>
              <strong>${Number(service.duration || service.durationMinutes) || 30} دقيقة</strong>
            </div>
          </div>
          <div class="doctor-service-card__actions">
            <button type="button" class="doctor-service-action is-edit" data-doctor-service-edit="${this.escapeHTML(serviceId)}">تعديل</button>
            <button type="button" class="doctor-service-action is-toggle" data-doctor-service-toggle="${this.escapeHTML(serviceId)}">${active ? "تعطيل" : "تفعيل"}</button>
            <button type="button" class="doctor-service-action is-delete" data-doctor-service-delete="${this.escapeHTML(serviceId)}">حذف</button>
          </div>
        </article>
      `;
    },


    /* ==================================================
       RENDER SERVICES LIST
       ================================================== */

    renderServices: function () {
      if (this.services.length === 0) {
        return `
          <section class="doctor-services-empty glass">
            <span>⚕</span>
            <h3>لا توجد خدمات</h3>
            <p>أضف أول خدمة طبية حتى يتمكن المرضى من اختيارها عند الحجز.</p>
            <button id="doctorServicesEmptyAdd" type="button">إضافة خدمة</button>
          </section>
        `;
      }

      return this.services.map(function (service) {
        return DoctorServicesScreen.renderService(service);
      }).join("");
    },


    /* ==================================================
       RENDER EDITOR
       ================================================== */

    renderEditor: function () {
      if (!this.editorOpen) return "";

      const service = this.selectedServiceId ? this.findService(this.selectedServiceId) : null;
      const editing = Boolean(service);

      return `
        <div class="doctor-service-modal-overlay">
          <section class="doctor-service-modal glass">
            <header class="doctor-service-modal__header">
              <div>
                <span>${editing ? "تعديل" : "إضافة"}</span>
                <h2>${editing ? "تعديل الخدمة" : "خدمة جديدة"}</h2>
              </div>
              <button id="doctorServiceModalClose" type="button">×</button>
            </header>
            <form id="doctorServiceForm" class="doctor-service-form" novalidate>
              <label class="doctor-service-field">
                <span>اسم الخدمة</span>
                <input id="doctorServiceName" type="text" maxlength="100" value="${this.escapeHTML(service?.name || "")}" placeholder="مثال: استشارة عامة">
              </label>
              <label class="doctor-service-field">
                <span>الوصف</span>
                <textarea id="doctorServiceDescription" maxlength="500" placeholder="وصف مختصر للخدمة">${this.escapeHTML(service?.description || "")}</textarea>
              </label>
              <div class="doctor-service-form__grid">
                <label class="doctor-service-field">
                  <span>السعر بالدينار</span>
                  <input id="doctorServicePrice" type="number" inputmode="numeric" min="0" step="50" value="${service ? Number(service.price) || 0 : 1500}">
                </label>
                <label class="doctor-service-field">
                  <span>مدة الخدمة</span>
                  <select id="doctorServiceDuration">
                    ${[10, 15, 20, 30, 45, 60, 90, 120].map(function(duration) {
                      const current = Number(service?.duration || service?.durationMinutes || 30);
                      return `<option value="${duration}" ${current === duration ? "selected" : ""}>${duration} دقيقة</option>`;
                    }).join("")}
                  </select>
                </label>
              </div>
              <label class="doctor-service-active">
                <div>
                  <strong>الخدمة متاحة للحجز</strong>
                  <span>عندما تكون متوقفة لن تظهر للمريض.</span>
                </div>
                <input id="doctorServiceActive" type="checkbox" ${service?.active === false ? "" : "checked"}>
              </label>
              <button class="doctor-service-save" type="submit">${editing ? "حفظ التعديلات" : "إضافة الخدمة"}</button>
            </form>
          </section>
        </div>
      `;
    },


    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadServices(app);
      const doctor = this.getDoctor(app);
      const stats = this.getStats();
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="doctor-services ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="doctor-services__orb doctor-services__orb--blue"></div>
          <div class="doctor-services__orb doctor-services__orb--cyan"></div>

          <header class="doctor-services__header">
            <button id="doctorServicesBack" class="doctor-services__back" type="button">→</button>
            <div class="doctor-services__header-copy">
              <strong>الخدمات</strong>
              <span>${this.escapeHTML(doctor?.fullName || "الطبيب")}</span>
            </div>
            <button id="doctorServicesTheme" class="doctor-services__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="doctor-services__container">
            <section class="doctor-services__hero">
              <span>SERVICES</span>
              <h1>الخدمات الطبية</h1>
              <p>أضف خدماتك وحدد السعر والمدة، وستظهر الخدمات النشطة مباشرة للمرضى أثناء الحجز.</p>
            </section>

            <div id="doctorServicesMessage" class="doctor-services-message" hidden></div>

            <section class="doctor-services-stats">
              <article class="doctor-services-stat glass">
                <span>إجمالي الخدمات</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="doctor-services-stat glass is-active">
                <span>نشطة</span>
                <strong>${stats.active}</strong>
              </article>
              <article class="doctor-services-stat glass is-disabled">
                <span>متوقفة</span>
                <strong>${stats.disabled}</strong>
              </article>
            </section>

            <section class="doctor-services-toolbar glass">
              <div>
                <span>إدارة الخدمات</span>
                <strong>الخدمات التي يراها المريض</strong>
              </div>
              <button id="doctorServicesAdd" type="button">+ إضافة خدمة</button>
            </section>

            <section id="doctorServicesList" class="doctor-services-list">
              ${this.renderServices()}
            </section>
          </section>

          <div id="doctorServicesEditorRoot">${this.renderEditor()}</div>

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
              <button class="mobile-bottom-nav__item is-active" data-nav="services" type="button">
                <span class="mobile-bottom-nav__icon">⚕</span>
                <span>الخدمات</span>
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
      console.log("MON MÉDECIN: DoctorServicesScreen init");

      document.getElementById("doctorServicesBack")?.addEventListener("click", function () {
        app.navigate("/doctor/dashboard");
      });

      document.getElementById("doctorServicesTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.getElementById("doctorServicesAdd")?.addEventListener("click", function () {
        DoctorServicesScreen.openEditor(null, app);
      });

      document.getElementById("doctorServicesEmptyAdd")?.addEventListener("click", function () {
        DoctorServicesScreen.openEditor(null, app);
      });

      document.getElementById("doctorServicesList")?.addEventListener("click", function (event) {
        const edit = event.target.closest("[data-doctor-service-edit]");
        if (edit) {
          DoctorServicesScreen.openEditor(edit.dataset.doctorServiceEdit, app);
          return;
        }

        const toggle = event.target.closest("[data-doctor-service-toggle]");
        if (toggle) {
          const changed = DoctorServicesScreen.toggleService(toggle.dataset.doctorServiceToggle, app);
          if (changed) app.render();
          return;
        }

        const remove = event.target.closest("[data-doctor-service-delete]");
        if (remove) {
          DoctorServicesScreen.deleteService(remove.dataset.doctorServiceDelete, app);
          app.render();
        }
      });

      document.getElementById("doctorServicesEditorRoot")?.addEventListener("click", function (event) {
        if (event.target.closest("#doctorServiceModalClose")) {
          DoctorServicesScreen.closeEditor(app);
          return;
        }
        const overlay = event.target.closest(".doctor-service-modal-overlay");
        if (overlay && event.target === overlay) {
          DoctorServicesScreen.closeEditor(app);
        }
      });

      document.getElementById("doctorServiceForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = String(document.getElementById("doctorServiceName")?.value || "").trim();
        const description = String(document.getElementById("doctorServiceDescription")?.value || "").trim();
        const price = Number(document.getElementById("doctorServicePrice")?.value);
        const duration = Number(document.getElementById("doctorServiceDuration")?.value);
        const active = Boolean(document.getElementById("doctorServiceActive")?.checked);

        const saved = DoctorServicesScreen.saveService({ name, description, price, duration, active }, app);
        if (saved) app.render();
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
      document.querySelectorAll("[data-nav='services']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/services");
        });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/doctor/account");
        });
      });
    }

  };


  window.DoctorServicesScreen = DoctorServicesScreen;

})();