/* =====================================================
   MON MÉDECIN
   PATIENT BOOKING - FIXED
   ===================================================== */

(function () {
  "use strict";

  const PatientBookingScreen = {
    doctor: null,
    services: [],
    schedule: null,
    selectedServiceId: null,
    selectedDate: null,
    selectedTime: null,
    loading: false,
    messageTimer: null,

    // ==================================================
    // STORAGE HELPERS
    // ==================================================

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN BOOKING:", "Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN BOOKING:", "Cannot save", key, error);
        return false;
      }
    },

    // ==================================================
    // 🔑 ENSURE ARRAY - التأكد من أن القيمة مصفوفة
    // ==================================================

    ensureArray: function (value) {
      return Array.isArray(value) ? value : [];
    },

    // ==================================================
    // GENERATE BOOKING NUMBER
    // ==================================================

    generateBookingNumber: function () {
      const today = this.getToday();
      const appointments = this.getAppointmentsSafely(window.App);
      const todayAppointments = appointments.filter(function(a) {
        return a.date === this.getToday();
      }, this);
      const count = todayAppointments.length + 1;
      return 'BK-' + today.replace(/-/g, '') + '-' + String(count).padStart(4, '0');
    },

    // ==================================================
    // 🔑 GET APPOINTMENTS SAFELY - مع التأكد من أن القيمة مصفوفة
    // ==================================================

    getAppointmentsSafely: function (app) {
      if (typeof app.getAppointmentsSafely === "function") {
        var result = app.getAppointmentsSafely();
        return this.ensureArray(result);
      }
      if (typeof app.getAppointments === "function") {
        var result = app.getAppointments();
        return this.ensureArray(result);
      }
      var appointments = this.readJSON(localStorage, "monmedecin-appointments", []);
      return this.ensureArray(appointments);
    },

    saveAppointmentsToAllStores: function (appointments, app) {
      if (typeof app.saveAppointmentsToAllStores === "function") {
        return app.saveAppointmentsToAllStores(appointments);
      }
      const stores = [
        "monmedecin-appointments",
        "monmedecin-doctor-appointments",
        "monmedecin-patient-appointments"
      ];
      let allSaved = true;
      stores.forEach(function (key) {
        let data = PatientBookingScreen.readJSON(localStorage, key, []);
        if (!Array.isArray(data)) {
          data = [];
        }
        appointments.forEach(function (appointment) {
          const index = data.findIndex(function (item) {
            return String(item.id || item.appointment_id) === String(appointment.id || appointment.appointment_id);
          });
          if (index >= 0) {
            data[index] = appointment;
          } else {
            data.push(appointment);
          }
        });
        const saved = PatientBookingScreen.writeJSON(localStorage, key, data);
        if (!saved) {
          allSaved = false;
        }
      });
      return allSaved;
    },

    // ==================================================
    // ESCAPE HTML
    // ==================================================

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    // ==================================================
    // ID GENERATORS
    // ==================================================

    createAppointmentId: function () {
      return "APT-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    },

    getToday: function () {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    },

    // ==================================================
    // DOCTOR / PATIENT HELPERS
    // ==================================================

    getDoctorId: function (doctor) {
      return doctor?.id ?? doctor?.doctor_id ?? null;
    },

    getPatientId: function (app) {
      return app.state.patient?.id ?? app.state.patient?.patient_id ?? app.state.user?.id ?? null;
    },

    // ==================================================
    // LOAD DOCTOR
    // ==================================================

    loadDoctor: function (app) {
      let doctor = app.state.selectedDoctor;
      if (!doctor) {
        doctor = this.readJSON(sessionStorage, "monmedecin-selected-doctor", null);
      }
      if (!doctor) {
        const doctorId = sessionStorage.getItem("monmedecin-selected-doctor-id");
        if (doctorId) {
          let doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
          if (!Array.isArray(doctors)) {
            doctors = [];
          }
          doctor = doctors.find(function (item) {
            return String(item.id ?? item.doctor_id) === String(doctorId);
          }) || null;
        }
      }
      this.doctor = doctor;
      return doctor;
    },

    // ==================================================
    // LOAD BENEFICIARY (FOR OTHER PERSON BOOKING)
    // ==================================================

    loadBeneficiary: function () {
      const beneficiary = this.readJSON(sessionStorage, "monmedecin-booking-beneficiary", null);
      if (beneficiary && beneficiary.isOtherPerson === true) {
        return beneficiary;
      }
      return null;
    },

    isOtherPersonBooking: function () {
      return this.loadBeneficiary() !== null;
    },

    // ==================================================
    // LOAD SERVICES
    // ==================================================

    loadServices: function () {
      const doctorId = this.getDoctorId(this.doctor);
      if (!doctorId) {
        this.services = [];
        return [];
      }

      let allServices = [];

      // SOURCE 1: monmedecin-doctor-services
      let services = this.readJSON(localStorage, "monmedecin-doctor-services", []);
      if (Array.isArray(services)) {
        allServices = allServices.concat(services);
      }

      // SOURCE 2: monmedecin-doctor-professional-{id}
      const professional = this.readJSON(
        localStorage,
        `monmedecin-doctor-professional-${doctorId}`,
        null
      );
      if (professional && Array.isArray(professional.services)) {
        professional.services.forEach(function (service) {
          const exists = allServices.some(function (s) {
            return String(s.id) === String(service.id);
          });
          if (!exists) {
            allServices.push({
              ...service,
              doctor_id: doctorId,
              doctorId: doctorId
            });
          }
        });
      }

      // SOURCE 3: doctor.professional.services
      if (this.doctor && this.doctor.professional && Array.isArray(this.doctor.professional.services)) {
        this.doctor.professional.services.forEach(function (service) {
          const exists = allServices.some(function (s) {
            return String(s.id) === String(service.id);
          });
          if (!exists) {
            allServices.push({
              ...service,
              doctor_id: doctorId,
              doctorId: doctorId
            });
          }
        });
      }

      // FILTER: Only active services for this doctor
      this.services = allServices.filter(function (service) {
        const sameDoctor = String(service.doctor_id ?? service.doctorId) === String(doctorId);
        const isActive = service.active !== false;
        return sameDoctor && isActive;
      });

      // If no services, create default
      if (this.services.length === 0) {
        console.warn("MON MÉDECIN BOOKING:", "No services found for doctor", doctorId, "- Creating default service");
        const defaultService = {
          id: "SERVICE-DEFAULT-" + Date.now(),
          doctor_id: doctorId,
          doctorId: doctorId,
          name: "استشارة طبية",
          description: "استشارة طبية عامة",
          price: 1500,
          duration: 30,
          durationMinutes: 30,
          active: true,
          createdAt: new Date().toISOString()
        };
        this.services = [defaultService];
        let existingServices = this.readJSON(localStorage, "monmedecin-doctor-services", []);
        if (!Array.isArray(existingServices)) {
          existingServices = [];
        }
        existingServices = existingServices.filter(function (s) {
          return String(s.doctor_id || s.doctorId) !== String(doctorId);
        });
        existingServices.push(defaultService);
        this.writeJSON(localStorage, "monmedecin-doctor-services", existingServices);
      }

      // Auto-select first service
      if (!this.selectedServiceId && this.services.length > 0) {
        this.selectedServiceId = this.services[0].id;
      }

      return this.services;
    },

    getSelectedService: function () {
      if (!this.selectedServiceId) {
        return null;
      }
      return this.services.find(function (service) {
        return String(service.id ?? service.service_id) === String(this.selectedServiceId);
      }, this) || null;
    },

    getServiceDuration: function () {
      const service = this.getSelectedService();
      if (!service) {
        return null;
      }
      return Math.max(5, Number(service.duration ?? service.durationMinutes) || 30);
    },

    // ==================================================
    // LOAD SCHEDULE
    // ==================================================

    loadSchedule: function (app) {
      const doctorId = this.getDoctorId(this.doctor);
      if (!doctorId) {
        this.schedule = null;
        return null;
      }

      if (typeof app.getDoctorSchedule === "function") {
        this.schedule = app.getDoctorSchedule(doctorId);
        if (this.schedule) {
          return this.schedule;
        }
      }

      let schedules = this.readJSON(localStorage, "monmedecin-doctor-schedules", []);
      if (!Array.isArray(schedules)) {
        schedules = [];
      }
      this.schedule = schedules.find(function (schedule) {
        return String(schedule.doctor_id ?? schedule.doctorId) === String(doctorId);
      }) || null;

      if (!this.schedule) {
        const defaultDays = {
          saturday: { enabled: true, start: "08:00", end: "17:00" },
          sunday: { enabled: true, start: "08:00", end: "17:00" },
          monday: { enabled: true, start: "08:00", end: "17:00" },
          tuesday: { enabled: true, start: "08:00", end: "17:00" },
          wednesday: { enabled: true, start: "08:00", end: "17:00" },
          thursday: { enabled: true, start: "08:00", end: "17:00" },
          friday: { enabled: false, start: "08:00", end: "17:00" }
        };
        this.schedule = {
          id: "SCHEDULE-" + doctorId,
          doctor_id: doctorId,
          doctorId: doctorId,
          slotDuration: 30,
          days: defaultDays,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        schedules.push(this.schedule);
        this.writeJSON(localStorage, "monmedecin-doctor-schedules", schedules);
      }

      return this.schedule;
    },

    // ==================================================
    // DAY HELPERS
    // ==================================================

    getDayKey: function (dateValue) {
      if (!dateValue) {
        return null;
      }
      const date = new Date(dateValue + "T12:00:00");
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      return days[date.getDay()];
    },

    getDayConfig: function (dateValue) {
      const key = this.getDayKey(dateValue);
      if (!key) {
        return null;
      }
      if (!this.schedule) {
        return {
          enabled: true,
          start: "08:00",
          end: "17:00",
          slotDuration: 30
        };
      }
      const days = this.schedule.days || this.schedule.week || this.schedule.weeklySchedule || {};
      const day = days[key];
      return {
        enabled: day ? day.enabled !== false : true,
        start: day?.start || day?.startTime || this.schedule.startTime || "08:00",
        end: day?.end || day?.endTime || this.schedule.endTime || "17:00",
        slotDuration: Math.max(5, Number(day?.slotDuration ?? this.schedule.slotDuration) || 30)
      };
    },

    // ==================================================
    // TIME HELPERS
    // ==================================================

    timeToMinutes: function (value) {
      const parts = String(value || "").split(":").map(Number);
      if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
        return null;
      }
      return parts[0] * 60 + parts[1];
    },

    minutesToTime: function (minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
    },

    // ==================================================
    // INTERVAL OVERLAP
    // ==================================================

    intervalsOverlap: function (startA, endA, startB, endB) {
      return startA < endB && startB < endA;
    },

    // ==================================================
    // EXISTING DOCTOR APPOINTMENTS
    // ==================================================

    getDoctorAppointments: function (app) {
      const doctorId = this.getDoctorId(this.doctor);
      if (!doctorId) {
        return [];
      }
      const appointments = this.getAppointmentsSafely(app);
      return appointments.filter(function (appointment) {
        return String(appointment.doctor_id ?? appointment.doctorId) === String(doctorId);
      });
    },

    // ==================================================
    // APPOINTMENT INTERVAL
    // ==================================================

    getAppointmentInterval: function (appointment) {
      const start = this.timeToMinutes(appointment.time);
      if (start === null) {
        return null;
      }
      const duration = Math.max(5, Number(appointment.duration) || 30);
      return {
        start: start,
        end: start + duration
      };
    },

    // ==================================================
    // 🔑 IS INTERVAL AVAILABLE - مع التأكد من أن البيانات مصفوفة
    // ==================================================

    isIntervalAvailable: function (dateValue, startMinutes, duration, app) {
      var doctorId = this.getDoctorId(this.doctor);
      if (!doctorId) return false;

      var time = this.minutesToTime(startMinutes);
      
      var result = app.checkAppointmentConflict(doctorId, dateValue, time, duration);
      
      if (!result || typeof result !== 'object') {
        return true;
      }
      
      return !result.hasConflict;
    },

    // ==================================================
    // PATIENT OVERLAP
    // ==================================================

    patientAlreadyBooked: function (date, startTime, duration, app) {
      const patientId = this.getPatientId(app);
      const doctorId = this.getDoctorId(this.doctor);
      if (!patientId || !doctorId) {
        return false;
      }
      const start = this.timeToMinutes(startTime);
      if (start === null) {
        return false;
      }
      const end = start + duration;
      const appointments = this.getAppointmentsSafely(app);
      return appointments.some(function (appointment) {
        if (String(appointment.patient_id ?? appointment.patientId) !== String(patientId)) {
          return false;
        }
        if (appointment.date !== date) {
          return false;
        }
        if (["cancelled", "rejected"].includes(appointment.status)) {
          return false;
        }
        const interval = this.getAppointmentInterval(appointment);
        if (!interval) {
          return false;
        }
        return this.intervalsOverlap(start, end, interval.start, interval.end);
      }, this);
    },

    // ==================================================
    // 🔑 GET AVAILABLE TIMES - مع التأكد من أن البيانات مصفوفة
    // ==================================================

    getAvailableTimes: function (dateValue, app) {
      if (!dateValue) {
        return [];
      }
      var serviceDuration = this.getServiceDuration();
      if (!serviceDuration) {
        return [];
      }
      var config = this.getDayConfig(dateValue);
      if (!config || config.enabled === false) {
        return [];
      }
      var start = this.timeToMinutes(config.start);
      var end = this.timeToMinutes(config.end);
      if (start === null || end === null || end <= start) {
        return [];
      }
      var slotDuration = Math.max(5, Number(config.slotDuration) || 30);
      var available = [];
      var now = new Date();
      var today = this.getToday();
      var nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (var current = start; current + serviceDuration <= end; current += slotDuration) {
        if (dateValue === today && current < nowMinutes) {
          continue;
        }
        var isAvailable = this.isIntervalAvailable(dateValue, current, serviceDuration, app);
        if (isAvailable) {
          available.push(this.minutesToTime(current));
        }
      }
      return available;
    },

    // ==================================================
    // DATE HELPERS
    // ==================================================

    getMaxBookingDate: function () {
      const date = new Date();
      date.setDate(date.getDate() + 90);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    },

    // ==================================================
    // 🔑 CREATE APPOINTMENT - مع التأكد من أن البيانات مصفوفة
    // ==================================================

    createAppointment: function (app) {
      try {
        console.log("MON MÉDECIN: Starting createAppointment");

        const patient = app.state.patient || app.state.user;
        const doctor = this.doctor;
        const service = this.getSelectedService();
        const beneficiary = this.loadBeneficiary();

        if (!patient || !doctor) {
          return { success: false, message: "تعذر تحديد المريض أو الطبيب." };
        }
        if (!service) {
          return { success: false, message: "اختر الخدمة الطبية." };
        }
        if (!this.selectedDate) {
          return { success: false, message: "اختر تاريخ الموعد." };
        }
        if (!this.selectedTime) {
          return { success: false, message: "اختر وقت الموعد." };
        }

        const serviceDuration = this.getServiceDuration();
        if (!serviceDuration) {
          return { success: false, message: "مدة الخدمة غير صحيحة." };
        }

        const available = this.getAvailableTimes(this.selectedDate, app);
        if (!available.includes(this.selectedTime)) {
          return { success: false, message: "هذا الوقت لم يعد متاحًا. اختر موعدًا آخر." };
        }

        if (this.patientAlreadyBooked(this.selectedDate, this.selectedTime, serviceDuration, app)) {
          return { success: false, message: "لديك موعد آخر يتداخل مع هذا الوقت." };
        }

        const doctorId = this.getDoctorId(doctor);
        const patientId = this.getPatientId(app);
        const serviceId = service.id ?? service.service_id;
        const startMinutes = this.timeToMinutes(this.selectedTime);
        const endMinutes = startMinutes + serviceDuration;
        const now = new Date().toISOString();
        const appointmentId = this.createAppointmentId();

        // Generate booking number
        const bookingNumber = this.generateBookingNumber();

        const isProxy = beneficiary && beneficiary.isOtherPerson === true;

        let patientName = "";
        let patientPhone = "";

        if (isProxy) {
          patientName = beneficiary.fullName ||
            (beneficiary.firstName + " " + beneficiary.lastName) ||
            "مستفيد";
          patientPhone = beneficiary.phone || "";
        } else {
          patientName = patient.fullName || patient.name || "مريض";
          patientPhone = patient.phone || "";
        }

        const appointment = {
          id: appointmentId,
          appointment_id: appointmentId,
          bookingNumber: bookingNumber,
          doctor_id: doctorId,
          doctorId: doctorId,
          patient_id: isProxy ? null : patientId,
          patientId: isProxy ? null : patientId,
          service_id: serviceId,
          serviceId: serviceId,
          doctorName: doctor.fullName || doctor.name || "طبيب",
          doctorSpecialty: doctor.specialty || doctor.professional?.specialty || "",
          patientName: patientName,
          patient_phone: patientPhone,
          patientPhone: patientPhone,
          serviceName: service.name || service.title || service.label || "استشارة",
          price: Number(service.price) || 0,
          duration: serviceDuration,
          date: this.selectedDate,
          time: this.selectedTime,
          startMinutes: startMinutes,
          endMinutes: endMinutes,
          endTime: this.minutesToTime(endMinutes),
          status: "pending",
          source: isProxy ? "proxy" : "patient",
          is_proxy_booking: isProxy,
          created_by: patient.id,
          created_by_name: patient.fullName || patient.name || "المريض",
          notes: "",
          createdAt: now,
          updatedAt: now,
          history: []
        };

        if (isProxy) {
          appointment.beneficiary = {
            firstName: beneficiary.firstName,
            lastName: beneficiary.lastName,
            fullName: beneficiary.fullName,
            birthDate: beneficiary.birthDate,
            nationalId: beneficiary.nationalId,
            phone: beneficiary.phone || "",
            verifiedAt: beneficiary.verifiedAt || now
          };
        }

        // 🔑 التحقق من التداخل مع التأكد من أن البيانات مصفوفة
        var conflict = app.checkAppointmentConflict(doctorId, this.selectedDate, this.selectedTime, serviceDuration);
        if (conflict && conflict.hasConflict) {
          return { success: false, message: conflict.message || "هذا الوقت محجوز بالفعل." };
        }

        var allAppointments = this.getAppointmentsSafely(app);
        // 🔑 التأكد من أن allAppointments مصفوفة
        if (!Array.isArray(allAppointments)) {
          allAppointments = [];
        }
        
        allAppointments.push(appointment);
        var saved = this.saveAppointmentsToAllStores(allAppointments, app);

        if (!saved) {
          return { success: false, message: "تعذر حفظ الموعد في جميع السجلات." };
        }

        app.state.selectedAppointment = appointment;
        this.writeJSON(sessionStorage, "monmedecin-selected-appointment", appointment);
        sessionStorage.setItem("monmedecin-last-booking-number", bookingNumber);
        sessionStorage.setItem("monmedecin-last-booking", JSON.stringify(appointment));
        sessionStorage.removeItem("monmedecin-booking-beneficiary");

        return { success: true, appointment: appointment };
      } catch (error) {
        console.error("MON MÉDECIN: Error in createAppointment:", error);
        return { success: false, message: "حدث خطأ أثناء إنشاء الموعد: " + (error.message || "خطأ غير معروف") };
      }
    },

    // ==================================================
    // MESSAGE
    // ==================================================

    showMessage: function (message, type) {
      const element = document.getElementById("patientBookingMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }
      element.hidden = false;
      element.textContent = message;
      element.className = "patient-booking-message";
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");
      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 5000);
    },

    // ==================================================
    // SERVICES HTML
    // ==================================================

    renderServices: function () {
      if (this.services.length === 0) {
        return `
          <div class="patient-booking-empty">
            <span>!</span>
            <strong>لا توجد خدمات متاحة</strong>
            <small>لم يضف الطبيب خدمات متاحة للحجز بعد.</small>
          </div>
        `;
      }
      return this.services.map(function (service) {
        const id = service.id ?? service.service_id;
        const selected = String(id) === String(this.selectedServiceId);
        const duration = Math.max(5, Number(service.duration ?? service.durationMinutes) || 30);
        return `
          <button class="patient-booking-service ${selected ? "is-selected" : ""}" data-booking-service="${this.escapeHTML(id)}" type="button">
            <div>
              <strong>${this.escapeHTML(service.name || service.title || service.label || "استشارة")}</strong>
              <span>مدة الخدمة: ${duration} دقيقة</span>
            </div>
            <b>${Number(service.price) || 0} دج</b>
          </button>
        `;
      }, this).join("");
    },

    // ==================================================
    // TIMES HTML
    // ==================================================

    renderTimes: function (app) {
      if (!this.selectedServiceId) {
        return `<div class="patient-booking-time-placeholder">اختر الخدمة أولًا لمعرفة الأوقات المناسبة لمدة الخدمة.</div>`;
      }
      if (!this.selectedDate) {
        return `<div class="patient-booking-time-placeholder">اختر التاريخ أولًا.</div>`;
      }
      const times = this.getAvailableTimes(this.selectedDate, app);
      if (times.length === 0) {
        return `<div class="patient-booking-time-placeholder">لا توجد أوقات كافية ومتاحة لهذه الخدمة في هذا اليوم.</div>`;
      }
      const duration = this.getServiceDuration();
      return times.map(function (time) {
        const start = this.timeToMinutes(time);
        const end = start + duration;
        return `
          <button class="patient-booking-time ${this.selectedTime === time ? "is-selected" : ""}" data-booking-time="${time}" type="button" title="${time} - ${this.minutesToTime(end)}">
            <strong>${time}</strong>
            <small>إلى ${this.minutesToTime(end)}</small>
          </button>
        `;
      }, this).join("");
    },

    // ==================================================
    // SUMMARY HTML
    // ==================================================

    renderSummary: function () {
      const service = this.getSelectedService();
      const duration = service ? this.getServiceDuration() : null;
      let endTime = "—";
      if (this.selectedTime && duration) {
        const start = this.timeToMinutes(this.selectedTime);
        if (start !== null) {
          endTime = this.minutesToTime(start + duration);
        }
      }

      const isProxy = this.isOtherPersonBooking();
      const beneficiary = this.loadBeneficiary();

      let summaryHTML = `
        <div class="patient-booking-summary__row">
          <span>الطبيب</span>
          <strong>${this.escapeHTML(this.doctor?.fullName || this.doctor?.name || "—")}</strong>
        </div>
      `;

      if (isProxy && beneficiary) {
        summaryHTML += `
          <div class="patient-booking-summary__row" style="background:rgba(66,116,217,0.08);border-radius:10px;padding:10px 12px;margin:6px 0;border-right:3px solid #4274d9;">
            <span>👤 المستفيد</span>
            <strong>${this.escapeHTML(beneficiary.fullName || (beneficiary.firstName + " " + beneficiary.lastName))}</strong>
            <small style="display:block;font-size:7px;color:#8492a3;margin-top:2px;">رقم التعريف: ${this.escapeHTML(beneficiary.nationalId)}</small>
          </div>
        `;
      }

      summaryHTML += `
        <div class="patient-booking-summary__row">
          <span>الخدمة</span>
          <strong>${service ? this.escapeHTML(service.name || service.title || service.label || "استشارة") : "—"}</strong>
        </div>
        <div class="patient-booking-summary__row">
          <span>مدة الخدمة</span>
          <strong>${duration ? duration + " دقيقة" : "—"}</strong>
        </div>
        <div class="patient-booking-summary__row">
          <span>التاريخ</span>
          <strong dir="ltr">${this.selectedDate || "—"}</strong>
        </div>
        <div class="patient-booking-summary__row">
          <span>بداية الموعد</span>
          <strong dir="ltr">${this.selectedTime || "—"}</strong>
        </div>
        <div class="patient-booking-summary__row">
          <span>نهاية الموعد</span>
          <strong dir="ltr">${endTime}</strong>
        </div>
        <div class="patient-booking-summary__row">
          <span>السعر</span>
          <strong>${service ? Number(service.price) || 0 : 0} دج</strong>
        </div>
      `;

      return summaryHTML;
    },

    // ==================================================
    // REFRESH FUNCTIONS
    // ==================================================

    refreshServices: function (app) {
      const container = document.getElementById("patientBookingServices");
      if (container) {
        container.innerHTML = this.renderServices();
      }
      if (this.selectedTime && this.selectedDate) {
        const validTimes = this.getAvailableTimes(this.selectedDate, app);
        if (!validTimes.includes(this.selectedTime)) {
          this.selectedTime = null;
        }
      }
      this.refreshTimes(app);
      this.refreshSummary();
    },

    refreshTimes: function (app) {
      const container = document.getElementById("patientBookingTimes");
      if (container) {
        container.innerHTML = this.renderTimes(app);
      }
      this.refreshSummary();
    },

    refreshSummary: function () {
      const container = document.getElementById("patientBookingSummary");
      if (container) {
        container.innerHTML = this.renderSummary();
      }
    },

    // ==================================================
    // RENDER
    // ==================================================

    render: function (state, app) {
      this.loadDoctor(app);
      if (!this.doctor) {
        return `
          <main class="patient-booking ${state.deviceMode === 'mobile' ? 'mobile-app-page has-bottom-nav' : 'website-page'}">
            <section class="patient-booking-missing glass">
              <span>!</span>
              <h1>لم يتم اختيار طبيب</h1>
              <p>اختر طبيبًا أولًا قبل إنشاء الموعد.</p>
              <button id="patientBookingMissingDoctor" type="button">البحث عن طبيب</button>
            </section>
          </main>
        `;
      }

      this.loadServices();
      this.loadSchedule(app);

      const isMobile = state.deviceMode === 'mobile';
      const doctorName = this.doctor.fullName || this.doctor.name || "طبيب";
      const specialty = this.doctor.specialty || this.doctor.professional?.specialty || "طب عام";

      const isProxy = this.isOtherPersonBooking();
      const beneficiary = this.loadBeneficiary();

      return `
        <main class="patient-booking ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">

          <div class="patient-booking__orb patient-booking__orb--blue"></div>
          <div class="patient-booking__orb patient-booking__orb--cyan"></div>

          <header class="patient-booking__header">
            <button id="patientBookingBack" class="patient-booking__back" type="button">→</button>
            <div class="patient-booking__header-copy">
              <strong>حجز موعد</strong>
              <span>${this.escapeHTML(doctorName)}</span>
            </div>
            <button id="patientBookingTheme" class="patient-booking__theme" type="button">◐</button>
          </header>

          <section class="patient-booking__container">

            <section class="patient-booking-doctor glass">
              <div class="patient-booking-doctor__avatar">${this.escapeHTML(String(doctorName).charAt(0))}</div>
              <div class="patient-booking-doctor__info">
                <span>الطبيب المختار</span>
                <h1>${this.escapeHTML(doctorName)}</h1>
                <small>${this.escapeHTML(specialty)}</small>
              </div>
            </section>

            ${isProxy && beneficiary ? `
              <section class="patient-booking-beneficiary glass" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;margin-bottom:13px;background:rgba(66,116,217,0.06);border:1px solid rgba(66,116,217,0.1);">
                <span style="font-size:20px;">👤</span>
                <div style="min-width:0;">
                  <span style="display:block;font-size:7px;color:#4274d9;font-weight:900;">حجز نيابي</span>
                  <strong style="display:block;font-size:11px;color:#172b47;">${this.escapeHTML(beneficiary.fullName || (beneficiary.firstName + " " + beneficiary.lastName))}</strong>
                  <small style="display:block;font-size:7px;color:#8492a3;">رقم التعريف: ${this.escapeHTML(beneficiary.nationalId)}</small>
                </div>
                <button id="patientBookingChangeBeneficiary" type="button" style="min-height:30px;padding:0 10px;border:1px solid rgba(66,116,217,0.12);border-radius:9px;background:transparent;color:#4274d9;font-size:7px;font-weight:900;cursor:pointer;">تغيير</button>
              </section>
            ` : ""}

            <div id="patientBookingMessage" class="patient-booking-message" hidden></div>

            <section class="patient-booking-card glass">
              <div class="patient-booking-card__head">
                <div>
                  <span>1</span>
                  <h2>اختر الخدمة</h2>
                </div>
              </div>
              <div id="patientBookingServices" class="patient-booking-services">${this.renderServices()}</div>
            </section>

            <section class="patient-booking-card glass">
              <div class="patient-booking-card__head">
                <div>
                  <span>2</span>
                  <h2>اختر اليوم</h2>
                </div>
              </div>
              <label class="patient-booking-date">
                <span>تاريخ الموعد</span>
                <input id="patientBookingDate" type="date" min="${this.getToday()}" max="${this.getMaxBookingDate()}" value="${this.selectedDate || ""}">
              </label>
            </section>

            <section class="patient-booking-card glass">
              <div class="patient-booking-card__head">
                <div>
                  <span>3</span>
                  <h2>اختر الوقت</h2>
                </div>
              </div>
              <div id="patientBookingTimes" class="patient-booking-times">${this.renderTimes(app)}</div>
            </section>

            <section class="patient-booking-summary glass">
              <div class="patient-booking-summary__head">
                <span>4</span>
                <h2>ملخص الحجز</h2>
              </div>
              <div id="patientBookingSummary">${this.renderSummary()}</div>
              <div class="patient-booking-status-note">
                <span>⏳</span>
                <p>يتم حجز كامل مدة الخدمة، وليس وقت البداية فقط، لمنع تداخل مواعيد المرضى.</p>
              </div>
              <button id="patientBookingConfirm" class="patient-booking-confirm" type="button">تأكيد طلب الحجز</button>
            </section>

            <section class="patient-booking-other-entry" style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(36,67,105,0.08);">
              <button
                id="patientBookingBookOther"
                class="patient-booking-book-other"
                type="button"
                style="width:100%;min-height:48px;border:1px solid ${isProxy ? 'rgba(37,158,106,0.2)' : 'rgba(66,116,217,0.15)'};border-radius:14px;background: ${isProxy ? 'rgba(37,158,106,0.08)' : 'rgba(66,116,217,0.06)'};color: ${isProxy ? '#25815b' : '#3f70bd'};font-family:inherit;font-size:10px;font-weight:950;cursor:pointer;transition:transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;display:flex;align-items:center;justify-content:center;gap:10px;"
              >
                <span style="font-size:18px;">${isProxy ? '✅' : '👤'}</span>
                <span>${isProxy ? '✅ حجز نيابي (مفعل) - تغيير المستفيد' : '👤 حجز موعد لشخص آخر'}</span>
              </button>
              <p style="margin-top:6px;color:#8492a3;font-size:7px;text-align:center;line-height:1.5;">
                ${isProxy ? 'سيتم حجز الموعد باسم المستفيد المحدد.' : 'يمكنك حجز موعد نيابة عن فرد آخر من العائلة أو صديق.'}
              </p>
            </section>

          </section>

          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="home" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="search" type="button">
                <span class="mobile-bottom-nav__icon">⌕</span>
                <span>البحث</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="booking" type="button">
                <span class="mobile-bottom-nav__icon">📅</span>
                <span>حجز</span>
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

    // ==================================================
    // INIT
    // ==================================================

    init: function (app) {
      console.log("MON MÉDECIN: PatientBookingScreen init");

      document.getElementById("patientBookingMissingDoctor")?.addEventListener("click", function () {
        app.navigate("/patient/search");
      });

      if (!this.doctor) {
        console.warn("MON MÉDECIN: No doctor found in PatientBookingScreen");
        return;
      }

      document.getElementById("patientBookingBack")?.addEventListener("click", function () {
        app.navigate("/patient/doctor");
      });

      document.getElementById("patientBookingTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      document.getElementById("patientBookingServices")?.addEventListener("click", function (event) {
        const button = event.target.closest("[data-booking-service]");
        if (!button) return;
        PatientBookingScreen.selectedServiceId = button.dataset.bookingService;
        PatientBookingScreen.selectedTime = null;
        PatientBookingScreen.refreshServices(app);
      });

      document.getElementById("patientBookingDate")?.addEventListener("change", function (event) {
        PatientBookingScreen.selectedDate = event.target.value;
        PatientBookingScreen.selectedTime = null;
        PatientBookingScreen.refreshTimes(app);
      });

      document.getElementById("patientBookingTimes")?.addEventListener("click", function (event) {
        const button = event.target.closest("[data-booking-time]");
        if (!button) return;
        PatientBookingScreen.selectedTime = button.dataset.bookingTime;
        PatientBookingScreen.refreshTimes(app);
      });

      document.getElementById("patientBookingBookOther")?.addEventListener("click", function () {
        app.navigate("/patient/booking-other");
      });

      document.getElementById("patientBookingChangeBeneficiary")?.addEventListener("click", function () {
        if (confirm("هل تريد تغيير بيانات المستفيد الحالي؟ سيتم مسح البيانات الحالية.")) {
          sessionStorage.removeItem("monmedecin-booking-beneficiary");
          app.render();
        }
      });

      document.getElementById("patientBookingConfirm")?.addEventListener("click", function () {
        if (PatientBookingScreen.loading) {
          console.log("MON MÉDECIN: Already loading, ignoring click");
          return;
        }

        const confirmButton = this;
        PatientBookingScreen.loading = true;
        confirmButton.disabled = true;
        confirmButton.textContent = "⏳ جاري إنشاء الحجز...";

        setTimeout(function () {
          const result = PatientBookingScreen.createAppointment(app);

          if (!result.success) {
            PatientBookingScreen.loading = false;
            confirmButton.disabled = false;
            confirmButton.textContent = "تأكيد طلب الحجز";
            PatientBookingScreen.showMessage(result.message, "error");
            return;
          }

          PatientBookingScreen.selectedServiceId = null;
          PatientBookingScreen.selectedDate = null;
          PatientBookingScreen.selectedTime = null;
          PatientBookingScreen.loading = false;
          confirmButton.disabled = false;
          confirmButton.textContent = "✅ تم الحجز";

          PatientBookingScreen.showMessage("تم إنشاء الحجز بنجاح ✓", "success");

          setTimeout(function () {
            app.navigate("/patient/booking/success");
          }, 1000);
        }, 100);
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
      document.querySelectorAll("[data-nav='booking']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/booking");
        });
      });
      document.querySelectorAll("[data-nav='profile']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/patient/profile");
        });
      });
    }
  };

  window.PatientBookingScreen = PatientBookingScreen;

})();