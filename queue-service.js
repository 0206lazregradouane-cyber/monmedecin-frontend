/* =====================================================
   MON MÉDECIN
   QUEUE SERVICE - FIXED (With DataService)
   ===================================================== */

(function() {
  'use strict';

  var QueueService = function() {
    this.queues = {};
    this.autoRefreshInterval = null;
    this.refreshInterval = 15000;
    this.listeners = [];
    this._initialized = false;
    
    // Reference to DataService
    this._dataService = window.MonMedecinDataService || null;
  };

  /* ==================================================
     STORAGE HELPERS - Using DataService when available
     ================================================== */

  QueueService.prototype._readJSON = function(key, fallback) {
    if (this._dataService && typeof this._dataService.readJSON === 'function') {
      return this._dataService.readJSON(localStorage, key, fallback);
    }
    
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('MON MÉDECIN: Cannot read queue', key, error);
      return fallback;
    }
  };

  QueueService.prototype._writeJSON = function(key, value) {
    if (this._dataService && typeof this._dataService.writeJSON === 'function') {
      return this._dataService.writeJSON(localStorage, key, value);
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('MON MÉDECIN: Cannot write queue', key, error);
      return false;
    }
  };

  /* ==================================================
     GET SECRETARIES - Using DataService
     ================================================== */

  QueueService.prototype._getSecretaries = function() {
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

  QueueService.prototype._getDoctors = function() {
    if (this._dataService && typeof this._dataService.getDoctors === 'function') {
      return this._dataService.getDoctors();
    }
    
    try {
      var data = localStorage.getItem('monmedecin-doctors');
      if (data) {
        var parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('MON MÉDECIN: Cannot load doctors', error);
    }
    return [];
  };

  QueueService.prototype._getAppointments = function() {
    if (this._dataService && typeof this._dataService.getAppointments === 'function') {
      return this._dataService.getAppointments();
    }
    
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

  /* ==================================================
     INIT
     ================================================== */

  QueueService.prototype.init = function() {
    if (this._initialized) return;
    this._initialized = true;
    
    this.migrateAllData();
    
    console.log('✅ Queue Service initialized (with DataService support)');
  };

  /* ==================================================
     GET QUEUE
     ================================================== */

  QueueService.prototype.getQueue = function(doctorId) {
    if (!doctorId) return [];
    var key = 'monmedecin-queue-' + doctorId;
    var queue = this._readJSON(key, []);
    return Array.isArray(queue) ? queue : [];
  };

  QueueService.prototype.saveQueue = function(doctorId, queue) {
    if (!doctorId) return false;
    var key = 'monmedecin-queue-' + doctorId;
    var validQueue = Array.isArray(queue) ? queue : [];
    return this._writeJSON(key, validQueue);
  };

  /* ==================================================
     GET ACTIVE QUEUE
     ================================================== */

  QueueService.prototype.getActiveQueue = function(doctorId) {
    var queue = this.getQueue(doctorId);
    return queue.filter(function(item) {
      return item.status === 'waiting' || item.status === 'in_progress';
    });
  };

  QueueService.prototype.getFullQueue = function(doctorId) {
    return this.getQueue(doctorId);
  };

  /* ==================================================
     ADD PATIENT TO QUEUE
     ================================================== */

  QueueService.prototype.addFromAppointment = function(doctorId, appointment) {
    if (!doctorId || !appointment) return null;

    var queue = this.getQueue(doctorId);
    var patientId = appointment.patient_id || appointment.patientId;

    if (!patientId) return null;

    var exists = queue.some(function(item) {
      return String(item.patientId) === String(patientId) && 
             (item.status === 'waiting' || item.status === 'in_progress');
    });

    if (exists) {
      var existing = queue.find(function(item) {
        return String(item.patientId) === String(patientId);
      });
      return existing || null;
    }

    var maxNumber = queue.reduce(function(max, item) {
      var num = item.queueNumber || 0;
      return Math.max(max, num);
    }, 0);

    var newItem = {
      patientId: patientId,
      patientName: appointment.patientName || appointment.patient_name || 'مريض',
      patientPhone: appointment.patientPhone || appointment.patient_phone || '',
      serviceName: appointment.serviceName || appointment.service_name || 'استشارة',
      queueNumber: maxNumber + 1,
      status: 'waiting',
      arrivedAt: appointment.arrivedAt || new Date().toISOString(),
      appointmentId: appointment.id || appointment.appointment_id,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    queue.push(newItem);
    this.saveQueue(doctorId, queue);
    this.notifyListeners(queue, 'add');

    return newItem;
  };

  /* ==================================================
     UPDATE STATUS
     ================================================== */

  QueueService.prototype.updateQueueStatus = function(doctorId, patientId, status) {
    if (!doctorId || !patientId) return false;

    var queue = this.getQueue(doctorId);
    var index = queue.findIndex(function(item) {
      return String(item.patientId) === String(patientId);
    });

    if (index === -1) return false;

    var previousStatus = queue[index].status;
    var validStatuses = ['waiting', 'in_progress', 'done', 'removed'];
    
    if (!validStatuses.includes(status)) {
      console.warn('MON MÉDECIN: Invalid queue status:', status);
      return false;
    }

    queue[index].status = status;
    queue[index].updatedAt = new Date().toISOString();
    
    if (status === 'in_progress') {
      queue[index].startedAt = new Date().toISOString();
    } else if (status === 'done') {
      queue[index].completedAt = new Date().toISOString();
    } else if (status === 'removed') {
      queue[index].removedAt = new Date().toISOString();
    }

    this.saveQueue(doctorId, queue);
    this.notifyListeners(queue, 'update');

    this.createStatusNotification(doctorId, queue[index], previousStatus, status);

    return true;
  };

  /* ==================================================
     REMOVE FROM QUEUE
     ================================================== */

  QueueService.prototype.removeFromQueue = function(doctorId, patientId) {
    if (!doctorId || !patientId) return false;

    var queue = this.getQueue(doctorId);
    var index = queue.findIndex(function(item) {
      return String(item.patientId) === String(patientId);
    });

    if (index === -1) return false;

    queue[index].status = 'removed';
    queue[index].removedAt = new Date().toISOString();
    queue[index].updatedAt = new Date().toISOString();

    this.saveQueue(doctorId, queue);
    this.notifyListeners(queue, 'remove');

    return true;
  };

  /* ==================================================
     NOTIFICATIONS FOR QUEUE STATUS CHANGE
     ================================================== */

  QueueService.prototype.createStatusNotification = function(doctorId, patient, fromStatus, toStatus) {
    if (!window.MonMedecinNotificationService) return;

    var statusLabels = {
      waiting: 'في الانتظار',
      in_progress: 'جاري الفحص',
      done: 'تم الفحص',
      removed: 'تم الإزالة'
    };

    var fromLabel = statusLabels[fromStatus] || fromStatus;
    var toLabel = statusLabels[toStatus] || toStatus;

    if (doctorId) {
      window.MonMedecinNotificationService.createNotification({
        userId: doctorId,
        userRole: 'doctor',
        title: 'تحديث حالة المريض في قائمة الانتظار',
        message: 'تم تغيير حالة المريض ' + (patient.patientName || 'مريض') + ' من ' + fromLabel + ' إلى ' + toLabel,
        type: 'system',
        priority: 'medium',
        relatedId: patient.appointmentId || patient.patientId,
        relatedType: 'queue',
        icon: '⏳',
        color: '#6c7480'
      });
    }

    var secretaryId = this.getSecretaryIdForDoctor(doctorId);
    if (secretaryId) {
      window.MonMedecinNotificationService.createNotification({
        userId: secretaryId,
        userRole: 'secretary',
        title: 'تحديث حالة المريض',
        message: 'تم تغيير حالة المريض ' + (patient.patientName || 'مريض') + ' من ' + fromLabel + ' إلى ' + toLabel,
        type: 'system',
        priority: 'medium',
        icon: '⏳',
        color: '#6c7480'
      });
    }
  };

  /* ==================================================
     GET SECRETARY ID FOR DOCTOR - Using DataService
     ================================================== */

  QueueService.prototype.getSecretaryIdForDoctor = function(doctorId) {
    if (!doctorId) return null;

    var secretaries = this._getSecretaries();
    
    var secretary = secretaries.find(function(s) {
      return String(s.doctor_id || s.doctorId) === String(doctorId) && s.active !== false;
    });
    
    return secretary?.id || secretary?.secretary_id || null;
  };

  /* ==================================================
     CLEAR QUEUE
     ================================================== */

  QueueService.prototype.clearQueue = function(doctorId) {
    if (!doctorId) return false;
    var key = 'monmedecin-queue-' + doctorId;
    var result = this._writeJSON(key, []);
    this.notifyListeners([], 'clear');
    return result;
  };

  /* ==================================================
     RESET QUEUE NUMBERS
     ================================================== */

  QueueService.prototype.resetQueueNumbers = function(doctorId) {
    var queue = this.getQueue(doctorId);
    var active = queue.filter(function(item) {
      return item.status === 'waiting' || item.status === 'in_progress';
    });

    active.forEach(function(item, index) {
      item.queueNumber = index + 1;
      item.updatedAt = new Date().toISOString();
    });

    this.saveQueue(doctorId, active);
    this.notifyListeners(active, 'reset');
    return active;
  };

  /* ==================================================
     GET NEXT PATIENT
     ================================================== */

  QueueService.prototype.getNextPatient = function(doctorId) {
    var queue = this.getActiveQueue(doctorId);
    var waiting = queue.filter(function(item) {
      return item.status === 'waiting';
    });

    if (waiting.length === 0) return null;

    waiting.sort(function(a, b) {
      return (a.queueNumber || 0) - (b.queueNumber || 0);
    });

    return waiting[0] || null;
  };

  /* ==================================================
     GET QUEUE STATS
     ================================================== */

  QueueService.prototype.getQueueStats = function(doctorId) {
    var queue = this.getQueue(doctorId);
    
    var waiting = queue.filter(function(item) {
      return item.status === 'waiting';
    });

    var inProgress = queue.filter(function(item) {
      return item.status === 'in_progress';
    });

    var done = queue.filter(function(item) {
      return item.status === 'done';
    });

    var removed = queue.filter(function(item) {
      return item.status === 'removed';
    });

    return {
      total: queue.length,
      active: waiting.length + inProgress.length,
      waiting: waiting.length,
      inProgress: inProgress.length,
      done: done.length,
      removed: removed.length
    };
  };

  /* ==================================================
     MIGRATE ALL DATA - Using DataService
     ================================================== */

  QueueService.prototype.migrateAllData = function() {
    try {
      var doctors = this._getDoctors();
      if (!Array.isArray(doctors)) return;

      doctors.forEach(function(doctor) {
        var doctorId = doctor.id || doctor.doctor_id;
        if (doctorId) {
          this.migrateOldData(doctorId);
        }
      }.bind(this));
    } catch (error) {
      console.warn('MON MÉDECIN: Queue migration error', error);
    }
  };

  QueueService.prototype.migrateOldData = function(doctorId) {
    if (!doctorId) return false;

    try {
      var appointments = this._getAppointments();
      if (!Array.isArray(appointments)) return false;

      var doctorAppointments = appointments.filter(function(a) {
        return String(a.doctor_id || a.doctorId) === String(doctorId) &&
               a.status === 'arrived' &&
               !['cancelled', 'rejected', 'completed'].includes(a.status);
      });

      if (doctorAppointments.length === 0) return false;

      var queue = this.getQueue(doctorId);
      var existingPatientIds = queue.map(function(item) {
        return String(item.patientId);
      });

      doctorAppointments.forEach(function(appointment) {
        var patientId = appointment.patient_id || appointment.patientId;
        if (!patientId) return;
        if (existingPatientIds.indexOf(String(patientId)) !== -1) return;

        var maxNumber = queue.reduce(function(max, item) {
          return Math.max(max, item.queueNumber || 0);
        }, 0);

        queue.push({
          patientId: patientId,
          patientName: appointment.patientName || 'مريض',
          patientPhone: appointment.patientPhone || appointment.patient_phone || '',
          serviceName: appointment.serviceName || 'استشارة',
          queueNumber: maxNumber + 1,
          status: 'waiting',
          arrivedAt: appointment.arrivedAt || new Date().toISOString(),
          appointmentId: appointment.id || appointment.appointment_id,
          migrated: true,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      this.saveQueue(doctorId, queue);
      this.notifyListeners(queue, 'migrate');
      return true;

    } catch (error) {
      console.warn('MON MÉDECIN: Queue migration error for doctor', doctorId, error);
      return false;
    }
  };

  /* ==================================================
     LISTENERS
     ================================================== */

  QueueService.prototype.addListener = function(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  };

  QueueService.prototype.removeListener = function(callback) {
    var index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  };

  QueueService.prototype.notifyListeners = function(queue, action) {
    this.listeners.forEach(function(listener) {
      try {
        listener(queue, action);
      } catch (error) {
        console.warn('MON MÉDECIN: Queue listener error', error);
      }
    });
  };

  /* ==================================================
     CREATE INSTANCE
     ================================================== */

  var queueService = new QueueService();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      queueService.init();
    });
  } else {
    queueService.init();
  }
  
  window.MonMedecinQueueService = queueService;

})();