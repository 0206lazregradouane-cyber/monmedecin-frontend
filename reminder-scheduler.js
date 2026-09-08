/* =====================================================
   MON MÉDECIN
   REMINDER SCHEDULER - FIXED (With DataService)
   ===================================================== */

(function() {
  'use strict';

  var ReminderScheduler = function() {
    this.intervalId = null;
    this.reminders = [];
    this.processedIds = new Set();
    this.isRunning = false;
    
    // Reference to DataService
    this._dataService = window.MonMedecinDataService || null;
  };

  /* ==================================================
     STORAGE HELPERS - Using DataService
     ================================================== */

  ReminderScheduler.prototype._getAppointments = function() {
    // Try using DataService first
    if (this._dataService && typeof this._dataService.getAppointments === 'function') {
      var result = this._dataService.getAppointments();
      // 🔑 التأكد من أن النتيجة مصفوفة
      return Array.isArray(result) ? result : [];
    }

    // Try using app
    if (window.App && typeof window.App.getAppointments === 'function') {
      var result = window.App.getAppointments();
      return Array.isArray(result) ? result : [];
    }

    // Fallback to localStorage
    try {
      var data = localStorage.getItem('monmedecin-appointments');
      if (data) {
        var parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('MON MÉDECIN: Cannot load appointments', error);
    }

    return [];
  };

  ReminderScheduler.prototype._getSecretaries = function() {
    // Try using DataService first
    if (this._dataService && typeof this._dataService.getSecretaries === 'function') {
      return this._dataService.getSecretaries();
    }

    try {
      var data = localStorage.getItem('monmedecin-secretaries');
      if (data) {
        var parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('MON MÉDECIN: Cannot load secretaries', error);
    }
    return [];
  };

  /* ==================================================
     START
     ================================================== */

  ReminderScheduler.prototype.start = function() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(function() {
      this.checkReminders();
    }.bind(this), 60 * 1000);

    setTimeout(function() {
      this.checkReminders();
    }.bind(this), 1000);

    console.log('MON MÉDECIN: Reminder scheduler started (with DataService support)');
  };

  ReminderScheduler.prototype.stop = function() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('MON MÉDECIN: Reminder scheduler stopped');
  };

  /* ==================================================
     CHECK REMINDERS
     ================================================== */

  ReminderScheduler.prototype.checkReminders = function() {
    try {
      // 🔑 التأكد من أن appointments مصفوفة
      var appointments = this._getAppointments();
      if (!Array.isArray(appointments)) {
        console.warn('MON MÉDECIN: Appointments is not an array, skipping reminders');
        return;
      }
      
      var now = Date.now();

      appointments.forEach(function(appointment) {
        this.checkAppointmentReminders(appointment, now);
      }.bind(this));

      if (this.processedIds.size > 1000) {
        var ids = Array.from(this.processedIds);
        this.processedIds = new Set(ids.slice(-500));
      }

    } catch (error) {
      console.warn('MON MÉDECIN: Reminder check error', error);
    }
  };

  /* ==================================================
     APPOINTMENT REMINDERS
     ================================================== */

  ReminderScheduler.prototype.checkAppointmentReminders = function(appointment, now) {
    if (!appointment || !appointment.date || !appointment.time) return;
    if (['cancelled', 'rejected', 'completed'].includes(appointment.status)) return;

    var appointmentTime = new Date(appointment.date + 'T' + appointment.time + ':00').getTime();
    if (appointmentTime < now) return;

    var diff = appointmentTime - now;
    var reminderTimes = [
      { hours: 24, key: 'reminder_24h' },
      { hours: 3, key: 'reminder_3h' },
      { hours: 1, key: 'reminder_1h' },
      { hours: 0.25, key: 'reminder_15min' }
    ];

    reminderTimes.forEach(function(reminder) {
      var threshold = reminder.hours * 60 * 60 * 1000;
      if (diff <= threshold && diff > threshold - (5 * 60 * 1000)) {
        var id = appointment.id + '_' + reminder.key;
        if (!this.processedIds.has(id)) {
          this.sendReminder(appointment, reminder.hours);
          this.processedIds.add(id);
        }
      }
    }.bind(this));
  };

  /* ==================================================
     SEND REMINDER
     ================================================== */

  ReminderScheduler.prototype.sendReminder = function(appointment, hours) {
    if (!window.MonMedecinNotificationService) return;

    var patientId = appointment.patient_id || appointment.patientId;
    var doctorId = appointment.doctor_id || appointment.doctorId;
    var patientName = appointment.patientName || 'مريض';
    var doctorName = appointment.doctorName || 'الطبيب';

    var timeText;
    if (hours === 24) timeText = 'غداً';
    else if (hours === 3) timeText = 'اليوم بعد 3 ساعات';
    else if (hours === 1) timeText = 'اليوم بعد ساعة';
    else timeText = 'اليوم بعد 15 دقيقة';

    if (patientId) {
      window.MonMedecinNotificationService.createNotification({
        userId: patientId,
        userRole: 'patient',
        title: 'تذكير بالموعد - ' + timeText,
        message: timeText + ' موعدك مع د. ' + doctorName + ' الساعة ' + appointment.time,
        relatedId: appointment.id,
        relatedType: 'appointment',
        action: {
          label: 'عرض الموعد',
          route: '/patient/appointments'
        },
        priority: 'high'
      });
    }

    if (hours === 24 && doctorId) {
      window.MonMedecinNotificationService.createNotification({
        userId: doctorId,
        userRole: 'doctor',
        title: 'تذكير بموعد غد',
        message: 'لديك موعد غد مع ' + patientName + ' الساعة ' + appointment.time,
        relatedId: appointment.id,
        relatedType: 'appointment',
        action: {
          label: 'عرض المواعيد',
          route: '/doctor/appointments'
        }
      });
    }

    if (hours === 24) {
      var secretaryId = this.getSecretaryIdForDoctor(doctorId);
      if (secretaryId) {
        window.MonMedecinNotificationService.createNotification({
          userId: secretaryId,
          userRole: 'secretary',
          title: 'تذكير بموعد غد',
          message: 'موعد غد للطبيب ' + doctorName + ' مع ' + patientName,
          relatedId: appointment.id,
          relatedType: 'appointment',
          action: {
            label: 'عرض المواعيد',
            route: '/secretary/appointments'
          }
        });
      }
    }
  };

  /* ==================================================
     GET SECRETARY ID - Using DataService
     ================================================== */

  ReminderScheduler.prototype.getSecretaryIdForDoctor = function(doctorId) {
    if (!doctorId) return null;

    var secretaries = this._getSecretaries();
    
    var secretary = secretaries.find(function(s) {
      return String(s.doctor_id || s.doctorId) === String(doctorId) && s.active !== false;
    });
    
    return secretary?.id || secretary?.secretary_id || null;
  };

  /* ==================================================
     CREATE INSTANCE
     ================================================== */

  var reminderScheduler = new ReminderScheduler();
  window.MonMedecinReminderScheduler = reminderScheduler;

})();