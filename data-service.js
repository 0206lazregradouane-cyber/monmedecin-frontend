// =========================================================
// MON MÉDECIN - DATA SERVICE (VERSION COMPLETE WITH COMMISSIONS)
// =========================================================

(function() {
  'use strict';

  // التحقق من وجود المساعدات
  if (!window.MonMedecinHelpers) {
    console.error('❌ MonMedecinHelpers not loaded!');
    return;
  }

  if (!window.MonMedecinConstants) {
    console.error('❌ MonMedecinConstants not loaded!');
    return;
  }

  const Helpers = window.MonMedecinHelpers;
  const Constants = window.MonMedecinConstants;
  const STORAGE_KEYS = Constants.STORAGE_KEYS || {};
  const ROLES = Constants.ROLES || {};

  const {
    readJSON,
    writeJSON,
    ensureArray,
    generateId,
    getToday,
    normalizeText,
    normalizePhone,
    normalizeEmail,
    isAccountActive,
    getRecordId,
    getDoctorId,
    getPatientId,
    timeToMinutes,
  } = Helpers;

  class DataService {
    constructor() {
      // ===== تكوين API =====
      this.useApi = Constants.API?.USE_API || false;
      this.apiBase = Constants.API?.BASE_URL || '';
      this.apiTimeout = Constants.API?.TIMEOUT || 30000;
      this.apiEndpoints = Constants.API?.ENDPOINTS || {};

      // ===== الكاش =====
      this.cache = {};
      this.cacheTimeout = 30000;

      // ===== المستمعون =====
      this.listeners = [];

      // ===== حالة الاتصال =====
      this.isOnline = navigator.onLine;
      
      // ===== مراقبة الاتصال =====
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      console.log('✅ DataService initialized (API Ready: ' + (this.useApi ? 'ON' : 'OFF') + ')');
    }

    // =========================================================
    // حالة الاتصال
    // =========================================================

    handleOnline() {
      this.isOnline = true;
      console.log('📶 DataService: Online');
    }

    handleOffline() {
      this.isOnline = false;
      console.log('📶 DataService: Offline');
    }

    // =========================================================
    // CACHE HELPERS
    // =========================================================

    getCached(key) {
      if (this.cache[key] && (Date.now() - this.cache[key].timestamp) < this.cacheTimeout) {
        return this.cache[key].data;
      }
      return null;
    }

    setCached(key, data) {
      this.cache[key] = {
        data: data,
        timestamp: Date.now()
      };
    }

    clearCache(key) {
      if (key) {
        delete this.cache[key];
      } else {
        this.cache = {};
      }
    }

    // =========================================================
    // API REQUEST - الدالة الأساسية
    // =========================================================

    async request(endpoint, options = {}) {
      // إذا كان API معطلاً، استخدم localStorage
      if (!this.useApi) {
        return this.localRequest(endpoint, options);
      }

      // إذا كان الجهاز غير متصل، استخدم localStorage مؤقتاً
      if (!this.isOnline) {
        console.warn('📶 Device is offline, using local storage');
        return this.localRequest(endpoint, options);
      }

      const url = this.apiBase + endpoint;
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      };

      // إضافة التوكن إذا كان موجوداً
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // معالجة الاستجابة
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          throw this.createError(response.status, data);
        }

        return data;

      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw this.createError(408, { message: 'انتهت مهلة الطلب' });
        }
        
        throw this.createError(0, { message: error.message || 'حدث خطأ في الطلب' });
      }
    }

    // =========================================================
    // إنشاء كائن الخطأ
    // =========================================================

    createError(status, data) {
      const error = new Error(data?.message || 'حدث خطأ');
      error.status = status;
      error.code = data?.code || 'UNKNOWN_ERROR';
      error.data = data;
      return error;
    }

    // =========================================================
    // طلب محلي (localStorage) كـ Fallback
    // =========================================================

    localRequest(endpoint, options) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve({ 
            success: true, 
            data: null,
            source: 'local',
            message: 'تمت المعالجة محلياً'
          });
        }, 100);
      });
    }

    // =========================================================
    // إدارة التوكن
    // =========================================================

    getToken() {
      try {
        return localStorage.getItem(STORAGE_KEYS.TOKEN || 'monmedecin-token') || null;
      } catch (error) {
        return null;
      }
    }

    setToken(token) {
      try {
        if (token) {
          localStorage.setItem(STORAGE_KEYS.TOKEN || 'monmedecin-token', token);
        } else {
          localStorage.removeItem(STORAGE_KEYS.TOKEN || 'monmedecin-token');
        }
        return true;
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot set token', error);
        return false;
      }
    }

    getRefreshToken() {
      try {
        return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN || 'monmedecin-refresh-token') || null;
      } catch (error) {
        return null;
      }
    }

    setRefreshToken(token) {
      try {
        if (token) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN || 'monmedecin-refresh-token', token);
        } else {
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN || 'monmedecin-refresh-token');
        }
        return true;
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot set refresh token', error);
        return false;
      }
    }

    // =========================================================
    // دوال المساعدة للـ API
    // =========================================================

    getEndpoint(endpoint, params) {
      if (typeof Constants.getEndpoint === 'function') {
        return Constants.getEndpoint(endpoint, params);
      }
      
      let url = this.apiEndpoints[endpoint] || endpoint;
      if (params) {
        Object.keys(params).forEach(function(key) {
          url = url.replace(':' + key, params[key]);
        });
      }
      return url;
    }

    // =========================================================
    // ===== المصادقة (Auth) =====
    // =========================================================

    async login(credentials) {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('LOGIN');
          const result = await this.request(endpoint, {
            method: 'POST',
            body: credentials
          });
          
          if (result.token) {
            this.setToken(result.token);
          }
          if (result.refreshToken) {
            this.setRefreshToken(result.refreshToken);
          }
          
          return result;
        } catch (error) {
          console.warn('API login failed, falling back to local:', error.message);
          return this.localLogin(credentials);
        }
      }
      return this.localLogin(credentials);
    }

    localLogin(credentials) {
      const user = this.findUserByIdentifier(credentials.identifier);
      if (!user) {
        return { success: false, message: 'المستخدم غير موجود' };
      }
      if (user.password !== credentials.password) {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
      }
      return { success: true, user: user };
    }

    async register(data) {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('REGISTER');
          const result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          return result;
        } catch (error) {
          console.warn('API register failed, falling back to local:', error.message);
          return this.localRegister(data);
        }
      }
      return this.localRegister(data);
    }

    localRegister(data) {
      const user = this.createUser(data);
      if (!user) {
        return { success: false, message: 'فشل إنشاء الحساب' };
      }
      return { success: true, user: user };
    }

    async logout() {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('LOGOUT');
          await this.request(endpoint, { method: 'POST' });
        } catch (error) {
          console.warn('API logout failed:', error.message);
        }
      }
      
      this.setToken(null);
      this.setRefreshToken(null);
      this.clearCache();
      
      return { success: true };
    }

    async refreshToken() {
      if (!this.useApi || !this.isOnline) {
        return { success: false };
      }

      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          return { success: false };
        }

        const endpoint = this.getEndpoint('REFRESH');
        const result = await this.request(endpoint, {
          method: 'POST',
          body: { refreshToken: refreshToken }
        });

        if (result.token) {
          this.setToken(result.token);
          return { success: true, token: result.token };
        }
        return { success: false };
      } catch (error) {
        console.warn('Token refresh failed:', error.message);
        return { success: false };
      }
    }

    // =========================================================
    // ===== المستخدمون (Users) =====
    // =========================================================

    async getUsers() {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('USERS');
          const result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getUsers failed:', error.message);
        }
      }
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.USERS, []));
    }

    async getUser(id) {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('USER', { id: id });
          const result = await this.request(endpoint);
          return result.data || null;
        } catch (error) {
          console.warn('API getUser failed:', error.message);
        }
      }
      return this.findUser(id);
    }

    async createUser(data) {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('USERS');
          const result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createUser failed:', error.message);
        }
      }
      return this._createUserLocal(data);
    }

    _createUserLocal(data) {
      var users = this._getUsersLocal();
      var now = new Date().toISOString();
      var user = {
        id: generateId('USR'),
        role: data.role || ROLES.PATIENT,
        fullName: data.fullName || data.name || '',
        phone: normalizePhone(data.phone || ''),
        email: normalizeEmail(data.email || ''),
        password: data.password || '',
        gender: data.gender || '',
        birthDate: data.birthDate || '',
        wilaya: data.wilaya || '',
        commune: data.commune || '',
        address: data.address || '',
        active: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        ...(data.role === ROLES.DOCTOR ? {
          specialty: data.specialty || '',
          specialtyId: data.specialtyId || '',
          approved: data.approved || false,
          registrationNumber: data.registrationNumber || '',
          experienceYears: data.experienceYears || 0,
          clinic: data.clinic || '',
        } : {}),
        ...(data.role === ROLES.SECRETARY ? {
          doctor_id: data.doctor_id || data.doctorId || null,
          permissions: data.permissions || {},
        } : {}),
        ...(data.role === ROLES.ADMIN ? {
          canChangePassword: data.canChangePassword !== false,
        } : {}),
      };

      users.push(user);
      writeJSON(localStorage, STORAGE_KEYS.USERS, users);
      this.clearCache('users');
      this.saveToRoleStorage(user);

      return user;
    }

    async updateUser(id, data) {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('USER', { id: id });
          const result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API updateUser failed:', error.message);
        }
      }
      return this._updateUserLocal(id, data);
    }

    _updateUserLocal(id, data) {
      var users = this._getUsersLocal();
      var index = users.findIndex(function(u) { return String(u.id) === String(id); });
      if (index === -1) return null;

      var updated = {
        ...users[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      users[index] = updated;
      writeJSON(localStorage, STORAGE_KEYS.USERS, users);
      this.clearCache('users');
      
      return updated;
    }

    async deleteUser(id) {
      if (this.useApi && this.isOnline) {
        try {
          const endpoint = this.getEndpoint('USER', { id: id });
          const result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API deleteUser failed:', error.message);
        }
      }
      return this._deleteUserLocal(id);
    }

    _deleteUserLocal(id) {
      var users = this._getUsersLocal();
      var filtered = users.filter(function(u) { return String(u.id) !== String(id); });
      if (filtered.length === users.length) return false;

      writeJSON(localStorage, STORAGE_KEYS.USERS, filtered);
      this.clearCache('users');
      this.removeFromRoleStorage(id);
      return true;
    }

    _getUsersLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.USERS, []));
    }

    // =========================================================
    // 🔑 البحث عن المستخدمين في جميع المجموعات (الإصلاح)
    // =========================================================

    _getAdminsLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.ADMINS || 'monmedecin-admins', []));
    }

    _getDoctorsLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.DOCTORS || 'monmedecin-doctors', []));
    }

    _getSecretariesLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.SECRETARIES || 'monmedecin-secretaries', []));
    }

    _getPatientsLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.PATIENTS || 'monmedecin-patients', []));
    }

    /**
     * 🔑 البحث عن مستخدم بواسطة المعرف (ID) في جميع المجموعات
     */
    findUser(id) {
      if (!id) return null;
      
      var users = this._getUsersLocal();
      var found = users.find(function(u) {
        return String(u.id) === String(id);
      });
      if (found) return found;
      
      var doctors = this._getDoctorsLocal();
      var foundDoctor = doctors.find(function(d) {
        return String(d.id) === String(id);
      });
      if (foundDoctor) return foundDoctor;
      
      var admins = this._getAdminsLocal();
      var foundAdmin = admins.find(function(a) {
        return String(a.id) === String(id);
      });
      if (foundAdmin) return foundAdmin;
      
      var secretaries = this._getSecretariesLocal();
      var foundSecretary = secretaries.find(function(s) {
        return String(s.id) === String(id);
      });
      if (foundSecretary) return foundSecretary;
      
      var patients = this._getPatientsLocal();
      var foundPatient = patients.find(function(p) {
        return String(p.id) === String(id);
      });
      return foundPatient || null;
    }

    /**
     * 🔑 البحث عن مستخدم بواسطة المعرف (ID) أو الهاتف أو البريد في جميع المجموعات
     */
    findUserByIdentifier(identifier) {
      if (!identifier) return null;
      
      var normalized = this.normalizeIdentifier(identifier);
      
      var users = this._getUsersLocal();
      var found = users.find(function(u) {
        var phone = normalizePhone(u.phone);
        var email = normalizeEmail(u.email);
        return phone === normalized || email === normalized;
      });
      if (found) return found;
      
      var doctors = this._getDoctorsLocal();
      var foundDoctor = doctors.find(function(d) {
        var phone = normalizePhone(d.phone);
        var email = normalizeEmail(d.email);
        return phone === normalized || email === normalized;
      });
      if (foundDoctor) return foundDoctor;
      
      var admins = this._getAdminsLocal();
      var foundAdmin = admins.find(function(a) {
        var phone = normalizePhone(a.phone);
        var email = normalizeEmail(a.email);
        return phone === normalized || email === normalized;
      });
      if (foundAdmin) return foundAdmin;
      
      var secretaries = this._getSecretariesLocal();
      var foundSecretary = secretaries.find(function(s) {
        var phone = normalizePhone(s.phone);
        var email = normalizeEmail(s.email);
        return phone === normalized || email === normalized;
      });
      if (foundSecretary) return foundSecretary;
      
      var patients = this._getPatientsLocal();
      var foundPatient = patients.find(function(p) {
        var phone = normalizePhone(p.phone);
        var email = normalizeEmail(p.email);
        return phone === normalized || email === normalized;
      });
      return foundPatient || null;
    }

    /**
     * 🔑 الحصول على جميع المستخدمين من جميع المجموعات
     */
    getAllUsers() {
      var users = this._getUsersLocal();
      var doctors = this._getDoctorsLocal();
      var admins = this._getAdminsLocal();
      var secretaries = this._getSecretariesLocal();
      var patients = this._getPatientsLocal();
      
      var all = users.slice();
      
      doctors.forEach(function(d) {
        var exists = all.some(function(u) {
          return String(u.id) === String(d.id);
        });
        if (!exists) {
          all.push({
            ...d,
            role: 'doctor',
            _source: 'doctor'
          });
        }
      });
      
      admins.forEach(function(a) {
        var exists = all.some(function(u) {
          return String(u.id) === String(a.id);
        });
        if (!exists) {
          all.push({
            ...a,
            role: 'admin',
            _source: 'admin'
          });
        }
      });
      
      secretaries.forEach(function(s) {
        var exists = all.some(function(u) {
          return String(u.id) === String(s.id);
        });
        if (!exists) {
          all.push({
            ...s,
            role: 'secretary',
            _source: 'secretary'
          });
        }
      });
      
      patients.forEach(function(p) {
        var exists = all.some(function(u) {
          return String(u.id) === String(p.id);
        });
        if (!exists) {
          all.push({
            ...p,
            role: 'patient',
            _source: 'patient'
          });
        }
      });
      
      return all;
    }

    // =========================================================
    // نهاية الإصلاحات 🔑
    // =========================================================

    normalizeIdentifier(value) {
      var str = String(value || '').trim();
      if (str.includes('@')) {
        return normalizeEmail(str);
      }
      return normalizePhone(str);
    }

    saveToRoleStorage(user) {
      var role = user.role;
      var key = this.getRoleStorageKey(role);
      if (!key) return;

      var data = ensureArray(readJSON(localStorage, key, []));
      var index = data.findIndex(function(item) { return String(item.id) === String(user.id); });

      if (index >= 0) {
        data[index] = user;
      } else {
        data.push(user);
      }

      writeJSON(localStorage, key, data);
    }

    getRoleStorageKey(role) {
      var keys = {};
      keys[ROLES.ADMIN] = STORAGE_KEYS.ADMINS || 'monmedecin-admins';
      keys[ROLES.DOCTOR] = STORAGE_KEYS.DOCTORS || 'monmedecin-doctors';
      keys[ROLES.SECRETARY] = STORAGE_KEYS.SECRETARIES || 'monmedecin-secretaries';
      keys[ROLES.PATIENT] = STORAGE_KEYS.PATIENTS || 'monmedecin-patients';
      return keys[role] || null;
    }

    removeFromRoleStorage(id) {
      var roles = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.SECRETARY, ROLES.PATIENT];
      roles.forEach(function(role) {
        var key = this.getRoleStorageKey(role);
        if (!key) return;

        var data = ensureArray(readJSON(localStorage, key, []));
        data = data.filter(function(item) { return String(item.id) !== String(id); });
        writeJSON(localStorage, key, data);
      }, this);
    }

    // =========================================================
    // ===== الأطباء (Doctors) =====
    // =========================================================

    async getDoctors(filters) {
      if (this.useApi && this.isOnline) {
        try {
          var query = '';
          if (filters) {
            var params = [];
            if (filters.specialty) params.push('specialty=' + encodeURIComponent(filters.specialty));
            if (filters.wilaya) params.push('wilaya=' + encodeURIComponent(filters.wilaya));
            if (filters.active) params.push('active=' + filters.active);
            if (params.length) query = '?' + params.join('&');
          }
          var endpoint = this.getEndpoint('DOCTORS') + query;
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getDoctors failed:', error.message);
        }
      }
      return this._getDoctorsLocal();
    }

    _getDoctorsLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.DOCTORS || 'monmedecin-doctors', []));
    }

    async getDoctor(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('DOCTOR', { id: id });
          var result = await this.request(endpoint);
          return result.data || null;
        } catch (error) {
          console.warn('API getDoctor failed:', error.message);
        }
      }
      return this.findDoctor(id);
    }

    findDoctor(id) {
      return this._getDoctorsLocal().find(function(d) { return String(d.id) === String(id); }) || null;
    }

    getActiveDoctors() {
      return this._getDoctorsLocal().filter(function(d) { return isAccountActive(d) && d.approved !== false; });
    }

    getDoctorsBySpecialty(specialty) {
      if (!specialty) return this.getActiveDoctors();
      return this.getActiveDoctors().filter(function(d) {
        return String(d.specialty || d.specialtyId || '') === String(specialty);
      });
    }

    async createDoctor(data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('DOCTORS');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: { ...data, role: ROLES.DOCTOR }
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createDoctor failed:', error.message);
        }
      }
      return this.createUser({ ...data, role: ROLES.DOCTOR });
    }

    async updateDoctor(id, data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('DOCTOR', { id: id });
          var result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API updateDoctor failed:', error.message);
        }
      }
      return this._updateUserLocal(id, data);
    }

    async deleteDoctor(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('DOCTOR', { id: id });
          var result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API deleteDoctor failed:', error.message);
        }
      }
      return this.deleteUser(id);
    }

    async getDoctorStats(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('DOCTOR_STATS', { id: id });
          var result = await this.request(endpoint);
          return result.data || {};
        } catch (error) {
          console.warn('API getDoctorStats failed:', error.message);
        }
      }
      return this._getDoctorStatsLocal(id);
    }

    _getDoctorStatsLocal(id) {
      var appointments = this._getAppointmentsLocal();
      var doctorAppointments = appointments.filter(function(a) {
        return String(a.doctor_id || a.doctorId) === String(id);
      });
      
      var today = getToday();
      var todayAppointments = doctorAppointments.filter(function(a) {
        return a.date === today;
      });
      
      var pending = doctorAppointments.filter(function(a) {
        return a.status === 'pending';
      });
      
      var confirmed = doctorAppointments.filter(function(a) {
        return a.status === 'confirmed';
      });
      
      var completed = doctorAppointments.filter(function(a) {
        return a.status === 'completed';
      });
      
      var cancelled = doctorAppointments.filter(function(a) {
        return ['cancelled', 'rejected'].includes(a.status);
      });
      
      var totalRevenue = completed.reduce(function(sum, a) {
        return sum + (Number(a.price) || 0);
      }, 0);
      
      var uniquePatients = new Set();
      doctorAppointments.forEach(function(a) {
        var pid = a.patient_id || a.patientId;
        if (pid) uniquePatients.add(String(pid));
      });
      
      return {
        total: doctorAppointments.length,
        today: todayAppointments.length,
        pending: pending.length,
        confirmed: confirmed.length,
        completed: completed.length,
        cancelled: cancelled.length,
        revenue: totalRevenue,
        patients: uniquePatients.size
      };
    }

    // =========================================================
    // ===== المرضى (Patients) =====
    // =========================================================

    async getPatients() {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('PATIENTS');
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getPatients failed:', error.message);
        }
      }
      return this._getPatientsLocal();
    }

    _getPatientsLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.PATIENTS || 'monmedecin-patients', []));
    }

    findPatient(id) {
      return this._getPatientsLocal().find(function(p) { return String(p.id) === String(id); }) || null;
    }

    async createPatient(data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('PATIENTS');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: { ...data, role: ROLES.PATIENT }
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createPatient failed:', error.message);
        }
      }
      return this.createUser({ ...data, role: ROLES.PATIENT });
    }

    async updatePatient(id, data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('PATIENT', { id: id });
          var result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API updatePatient failed:', error.message);
        }
      }
      return this._updateUserLocal(id, data);
    }

    async deletePatient(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('PATIENT', { id: id });
          var result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API deletePatient failed:', error.message);
        }
      }
      return this.deleteUser(id);
    }

    // =========================================================
    // ===== السكرتارية (Secretaries) =====
    // =========================================================

    async getSecretaries() {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SECRETARIES');
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getSecretaries failed:', error.message);
        }
      }
      return this._getSecretariesLocal();
    }

    _getSecretariesLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.SECRETARIES || 'monmedecin-secretaries', []));
    }

    getDoctorSecretaries(doctorId) {
      return this._getSecretariesLocal().filter(function(s) {
        return String(s.doctor_id || s.doctorId) === String(doctorId);
      });
    }

    getActiveSecretaries(doctorId) {
      return this.getDoctorSecretaries(doctorId).filter(function(s) { return isAccountActive(s); });
    }

    async createSecretary(data, doctorId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SECRETARIES');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: { ...data, role: ROLES.SECRETARY, doctor_id: doctorId }
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createSecretary failed:', error.message);
        }
      }
      return this.createUser({
        ...data,
        role: ROLES.SECRETARY,
        doctor_id: doctorId,
        doctorId: doctorId,
        permissions: data.permissions || {},
      });
    }

    async updateSecretary(id, data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SECRETARY', { id: id });
          var result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API updateSecretary failed:', error.message);
        }
      }
      return this._updateUserLocal(id, data);
    }

    async deleteSecretary(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SECRETARY', { id: id });
          var result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API deleteSecretary failed:', error.message);
        }
      }
      return this.deleteUser(id);
    }

    // =========================================================
    // ===== المواعيد (Appointments) =====
    // =========================================================

    async getAppointments(filters) {
      if (this.useApi && this.isOnline) {
        try {
          var query = '';
          if (filters) {
            var params = [];
            if (filters.doctorId) params.push('doctorId=' + encodeURIComponent(filters.doctorId));
            if (filters.patientId) params.push('patientId=' + encodeURIComponent(filters.patientId));
            if (filters.status) params.push('status=' + encodeURIComponent(filters.status));
            if (filters.dateFrom) params.push('dateFrom=' + encodeURIComponent(filters.dateFrom));
            if (filters.dateTo) params.push('dateTo=' + encodeURIComponent(filters.dateTo));
            if (params.length) query = '?' + params.join('&');
          }
          var endpoint = this.getEndpoint('APPOINTMENTS') + query;
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getAppointments failed:', error.message);
        }
      }
      return this._getAppointmentsLocal();
    }

    // 🔑 _getAppointmentsLocal مع التأكد من أن القيمة مصفوفة
    _getAppointmentsLocal() {
      var data = readJSON(localStorage, STORAGE_KEYS.APPOINTMENTS, []);
      return ensureArray(data);
    }

    async getAppointment(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('APPOINTMENT', { id: id });
          var result = await this.request(endpoint);
          return result.data || null;
        } catch (error) {
          console.warn('API getAppointment failed:', error.message);
        }
      }
      return this.findAppointment(id);
    }

    // 🔑 findAppointment مع التأكد من أن البيانات مصفوفة
    findAppointment(id) {
      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        return null;
      }
      return appointments.find(function(a) { return String(a.id) === String(id); }) || null;
    }

    // 🔑 getDoctorAppointments مع التأكد من أن البيانات مصفوفة
    getDoctorAppointments(doctorId) {
      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        return [];
      }
      return appointments.filter(function(a) {
        return String(a.doctor_id || a.doctorId) === String(doctorId);
      });
    }

    // 🔑 getPatientAppointments مع التأكد من أن البيانات مصفوفة
    getPatientAppointments(patientId) {
      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        return [];
      }
      return appointments.filter(function(a) {
        return String(a.patient_id || a.patientId) === String(patientId);
      });
    }

    // 🔑 getAppointmentsByDate مع التأكد من أن البيانات مصفوفة
    getAppointmentsByDate(date) {
      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        return [];
      }
      return appointments.filter(function(a) { return a.date === date; });
    }

    // 🔑 getAppointmentsByStatus مع التأكد من أن البيانات مصفوفة
    getAppointmentsByStatus(status) {
      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        return [];
      }
      return appointments.filter(function(a) { return a.status === status; });
    }

    // 🔑 createAppointment مع التأكد من أن البيانات مصفوفة
    async createAppointment(data) {
      var conflict = this.checkAppointmentConflict(
        data.doctor_id || data.doctorId,
        data.date,
        data.time,
        data.duration || 30
      );

      if (conflict.hasConflict) {
        return null;
      }

      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('APPOINTMENTS');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          this.notifyListeners('appointmentCreated', result.data);
          return result.data || null;
        } catch (error) {
          console.warn('API createAppointment failed:', error.message);
        }
      }

      var appointment = this._createAppointmentLocal(data);
      this.notifyListeners('appointmentCreated', appointment);
      return appointment;
    }

    // 🔑 _createAppointmentLocal مع التأكد من أن البيانات مصفوفة
    _createAppointmentLocal(data) {
      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        appointments = [];
      }
      
      var now = new Date().toISOString();
      var appointment = {
        id: generateId('APT'),
        bookingNumber: this.generateBookingNumber(),
        doctor_id: data.doctor_id || data.doctorId || null,
        patient_id: data.patient_id || data.patientId || null,
        service_id: data.service_id || data.serviceId || null,
        doctorName: data.doctorName || '',
        patientName: data.patientName || '',
        patientPhone: data.patientPhone || '',
        serviceName: data.serviceName || '',
        date: data.date || '',
        time: data.time || '',
        duration: Number(data.duration) || 30,
        price: Number(data.price) || 0,
        status: data.status || 'pending',
        reason: data.reason || '',
        notes: data.notes || '',
        source: data.source || 'patient',
        isProxyBooking: data.isProxyBooking || false,
        createdAt: now,
        updatedAt: now,
        history: [],
      };

      appointments.push(appointment);
      writeJSON(localStorage, STORAGE_KEYS.APPOINTMENTS, appointments);
      this.clearCache('appointments');
      
      return appointment;
    }

    async updateAppointment(id, data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('APPOINTMENT', { id: id });
          var result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          this.notifyListeners('appointmentUpdated', result.data);
          return result.data || null;
        } catch (error) {
          console.warn('API updateAppointment failed:', error.message);
        }
      }
      return this._updateAppointmentLocal(id, data);
    }

    // 🔑 _updateAppointmentLocal مع التأكد من أن البيانات مصفوفة
    _updateAppointmentLocal(id, data) {
      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        console.warn('MON MÉDECIN: Appointments is not an array in _updateAppointmentLocal');
        return null;
      }
      
      var index = appointments.findIndex(function(a) { return String(a.id) === String(id); });
      if (index === -1) return null;

      var now = new Date().toISOString();
      var updated = {
        ...appointments[index],
        ...data,
        updatedAt: now,
      };

      if (data.status && data.status !== appointments[index].status) {
        updated.history = [
          ...(updated.history || []),
          {
            from: appointments[index].status,
            to: data.status,
            changedAt: now,
            changedBy: data.changedBy || 'system',
            changedByRole: data.changedByRole || 'system',
          },
        ];
      }

      appointments[index] = updated;
      writeJSON(localStorage, STORAGE_KEYS.APPOINTMENTS, appointments);
      this.clearCache('appointments');
      this.notifyListeners('appointmentUpdated', updated);

      return updated;
    }

    async changeAppointmentStatus(id, status, changedBy, changedByRole) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('APPOINTMENT_STATUS', { id: id });
          var result = await this.request(endpoint, {
            method: 'PATCH',
            body: { status, changedBy, changedByRole }
          });
          
          if (status === 'completed' && result.data) {
            var commission = this.calculateCommission(result.data);
            result.data.commission = commission;
          }
          
          return result.data || null;
        } catch (error) {
          console.warn('API changeAppointmentStatus failed:', error.message);
        }
      }
      return this._changeAppointmentStatusLocal(id, status, changedBy, changedByRole);
    }

    _changeAppointmentStatusLocal(id, status, changedBy, changedByRole) {
      var appointment = this.findAppointment(id);
      if (!appointment) return null;

      var updated = this._updateAppointmentLocal(id, {
        status: status,
        changedBy: changedBy || 'system',
        changedByRole: changedByRole || 'system',
        ...(status === 'confirmed' ? { confirmedAt: new Date().toISOString() } : {}),
        ...(status === 'arrived' ? { arrivedAt: new Date().toISOString() } : {}),
        ...(status === 'in_progress' ? { startedAt: new Date().toISOString() } : {}),
        ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
        ...(status === 'cancelled' ? { cancelledAt: new Date().toISOString() } : {}),
        ...(status === 'rejected' ? { rejectedAt: new Date().toISOString() } : {}),
        ...(status === 'no_show' ? { noShowAt: new Date().toISOString() } : {}),
      });

      if (status === 'completed' && updated) {
        updated.commission = this.calculateCommission(updated);
      }

      return updated;
    }

    async cancelAppointment(id, reason) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('APPOINTMENT_CANCEL', { id: id });
          var result = await this.request(endpoint, {
            method: 'POST',
            body: { reason: reason || 'تم الإلغاء بواسطة المريض' }
          });
          this.notifyListeners('appointmentUpdated', result.data);
          return result.data || null;
        } catch (error) {
          console.warn('API cancelAppointment failed:', error.message);
        }
      }
      return this._changeAppointmentStatusLocal(id, 'cancelled', 'patient', 'patient');
    }

    async confirmAppointment(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('APPOINTMENT_CONFIRM', { id: id });
          var result = await this.request(endpoint, {
            method: 'POST'
          });
          this.notifyListeners('appointmentUpdated', result.data);
          return result.data || null;
        } catch (error) {
          console.warn('API confirmAppointment failed:', error.message);
        }
      }
      return this._changeAppointmentStatusLocal(id, 'confirmed', 'system', 'system');
    }

    async arriveAppointment(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('APPOINTMENT_ARRIVE', { id: id });
          var result = await this.request(endpoint, {
            method: 'POST'
          });
          this.notifyListeners('appointmentUpdated', result.data);
          return result.data || null;
        } catch (error) {
          console.warn('API arriveAppointment failed:', error.message);
        }
      }
      return this._changeAppointmentStatusLocal(id, 'arrived', 'system', 'system');
    }

    // 🔑 checkAppointmentConflict مع التأكد من أن البيانات مصفوفة
    checkAppointmentConflict(doctorId, date, time, duration, excludeId) {
      if (!doctorId || !date || !time) {
        return { hasConflict: false };
      }

      var appointments = this._getAppointmentsLocal();
      if (!Array.isArray(appointments)) {
        console.warn('MON MÉDECIN: Appointments is not an array in checkAppointmentConflict');
        return { hasConflict: false };
      }

      var start = timeToMinutes(time);
      if (start === null) {
        return { hasConflict: false };
      }

      var end = start + (duration || 30);

      var conflict = appointments.some(function(appointment) {
        if (excludeId && String(appointment.id) === String(excludeId)) return false;
        if (String(appointment.doctor_id || appointment.doctorId) !== String(doctorId)) return false;
        if (appointment.date !== date) return false;
        if (['cancelled', 'rejected'].includes(appointment.status)) return false;

        var aptStart = timeToMinutes(appointment.time);
        if (aptStart === null) return false;
        var aptEnd = aptStart + (appointment.duration || 30);

        return start < aptEnd && aptStart < end;
      });

      return {
        hasConflict: conflict,
        message: conflict ? 'هذا الوقت محجوز بالفعل' : null,
      };
    }

    generateBookingNumber() {
      var today = getToday();
      var appointments = this.getAppointmentsByDate(today);
      var count = appointments.length + 1;
      return 'BK-' + today.replace(/-/g, '') + '-' + String(count).padStart(4, '0');
    }

    // 🔑 saveAppointments مع التأكد من أن البيانات مصفوفة
    saveAppointments(appointments) {
      if (!Array.isArray(appointments)) {
        console.warn('MON MÉDECIN: saveAppointments called with non-array:', appointments);
        return false;
      }
      this.clearCache('appointments');
      return writeJSON(localStorage, STORAGE_KEYS.APPOINTMENTS, appointments);
    }

    // =========================================================
    // ===== العمولات (COMMISSIONS) =====
    // =========================================================

    calculateCommission(appointment) {
      if (!appointment || appointment.status !== 'completed') {
        return 0;
      }
      
      var price = Number(appointment.price) || 0;
      var settings = this.getCommissionSettings();
      
      if (settings.perAppointment > 0) {
        return settings.perAppointment;
      }
      
      return (price * settings.rate) / 100;
    }

    getCommissionSettings() {
      var settings = readJSON(localStorage, "monmedecin-commission-settings", null);
      if (settings) {
        return {
          rate: settings.rate || 10,
          perAppointment: settings.perAppointment || 0
        };
      }
      return { rate: 10, perAppointment: 0 };
    }

    saveCommissionSettings(rate, perAppointment) {
      var settings = {
        rate: Number(rate) || 10,
        perAppointment: Number(perAppointment) || 0,
        updatedAt: new Date().toISOString()
      };
      writeJSON(localStorage, "monmedecin-commission-settings", settings);
      return settings;
    }

    async getCommissionStats(doctorId, dateFrom, dateTo) {
      if (this.useApi && this.isOnline) {
        try {
          var params = {};
          if (doctorId) params.doctorId = doctorId;
          if (dateFrom) params.dateFrom = dateFrom;
          if (dateTo) params.dateTo = dateTo;
          var query = '?' + Object.keys(params).map(function(k) {
            return k + '=' + encodeURIComponent(params[k]);
          }).join('&');
          var endpoint = this.getEndpoint('COMMISSION_STATS') + query;
          var result = await this.request(endpoint);
          return result.data || {};
        } catch (error) {
          console.warn('API getCommissionStats failed:', error.message);
        }
      }
      return this._getCommissionStatsLocal(doctorId, dateFrom, dateTo);
    }

    _getCommissionStatsLocal(doctorId, dateFrom, dateTo) {
      var appointments = this._getAppointmentsLocal();
      
      if (doctorId) {
        appointments = appointments.filter(function(a) {
          return String(a.doctor_id || a.doctorId) === String(doctorId);
        });
      }
      
      if (dateFrom) {
        appointments = appointments.filter(function(a) {
          return (a.date || '') >= dateFrom;
        });
      }
      if (dateTo) {
        appointments = appointments.filter(function(a) {
          return (a.date || '') <= dateTo;
        });
      }
      
      var completed = appointments.filter(function(a) {
        return a.status === 'completed';
      });
      
      var total = 0;
      var byDoctor = {};
      
      completed.forEach(function(a) {
        var commission = this.calculateCommission(a);
        total += commission;
        
        var docId = a.doctor_id || a.doctorId;
        if (docId) {
          if (!byDoctor[docId]) {
            byDoctor[docId] = { total: 0, count: 0 };
          }
          byDoctor[docId].total += commission;
          byDoctor[docId].count += 1;
        }
      }, this);
      
      return {
        total: total,
        count: completed.length,
        average: completed.length > 0 ? total / completed.length : 0,
        byDoctor: byDoctor
      };
    }

    // =========================================================
    // ===== الخدمات (Services) =====
    // =========================================================

    async getServices(doctorId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = doctorId 
            ? this.getEndpoint('DOCTOR_SERVICES', { id: doctorId })
            : this.getEndpoint('SERVICES');
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getServices failed:', error.message);
        }
      }
      return this._getServicesLocal(doctorId);
    }

    _getServicesLocal(doctorId) {
      var services = ensureArray(readJSON(localStorage, STORAGE_KEYS.SERVICES, []));
      if (doctorId) {
        services = services.filter(function(s) {
          return String(s.doctor_id || s.doctorId) === String(doctorId);
        });
      }
      return services;
    }

    getDoctorServices(doctorId) {
      return this._getServicesLocal(doctorId);
    }

    getActiveDoctorServices(doctorId) {
      return this.getDoctorServices(doctorId).filter(function(s) { return s.active !== false; });
    }

    async createService(data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SERVICES');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createService failed:', error.message);
        }
      }
      return this._createServiceLocal(data);
    }

    _createServiceLocal(data) {
      var services = this._getServicesLocal();
      var now = new Date().toISOString();
      var service = {
        id: generateId('SVC'),
        doctor_id: data.doctor_id || data.doctorId || null,
        doctorId: data.doctor_id || data.doctorId || null,
        name: data.name || '',
        description: data.description || '',
        price: Number(data.price) || 0,
        duration: Number(data.duration) || 30,
        active: data.active !== false,
        createdAt: now,
        updatedAt: now,
      };

      services.push(service);
      writeJSON(localStorage, STORAGE_KEYS.SERVICES, services);
      return service;
    }

    async updateService(id, data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SERVICE', { id: id });
          var result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API updateService failed:', error.message);
        }
      }
      return this._updateServiceLocal(id, data);
    }

    _updateServiceLocal(id, data) {
      var services = this._getServicesLocal();
      var index = services.findIndex(function(s) { return String(s.id) === String(id); });
      if (index === -1) return null;

      var updated = {
        ...services[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      services[index] = updated;
      writeJSON(localStorage, STORAGE_KEYS.SERVICES, services);
      return updated;
    }

    async deleteService(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SERVICE', { id: id });
          var result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API deleteService failed:', error.message);
        }
      }
      return this._deleteServiceLocal(id);
    }

    _deleteServiceLocal(id) {
      var services = this._getServicesLocal();
      var filtered = services.filter(function(s) { return String(s.id) !== String(id); });
      if (filtered.length === services.length) return false;
      writeJSON(localStorage, STORAGE_KEYS.SERVICES, filtered);
      return true;
    }

    // =========================================================
    // ===== الجداول (Schedules) =====
    // =========================================================

    async getSchedules(doctorId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = doctorId 
            ? this.getEndpoint('DOCTOR_SCHEDULE', { id: doctorId })
            : this.getEndpoint('SCHEDULES');
          var result = await this.request(endpoint);
          return result.data || null;
        } catch (error) {
          console.warn('API getSchedules failed:', error.message);
        }
      }
      return this._getSchedulesLocal(doctorId);
    }

    _getSchedulesLocal(doctorId) {
      var schedules = ensureArray(readJSON(localStorage, STORAGE_KEYS.SCHEDULES, []));
      if (doctorId) {
        return schedules.find(function(s) {
          return String(s.doctor_id || s.doctorId) === String(doctorId);
        }) || null;
      }
      return schedules;
    }

    getDoctorSchedule(doctorId) {
      return this._getSchedulesLocal(doctorId);
    }

    async createSchedule(data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SCHEDULES');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createSchedule failed:', error.message);
        }
      }
      return this._createScheduleLocal(data);
    }

    _createScheduleLocal(data) {
      var schedules = this._getSchedulesLocal();
      var now = new Date().toISOString();
      var schedule = {
        id: generateId('SCH'),
        doctor_id: data.doctor_id || data.doctorId || null,
        doctorId: data.doctor_id || data.doctorId || null,
        slotDuration: Number(data.slotDuration) || 30,
        days: data.days || this.getDefaultDays(),
        createdAt: now,
        updatedAt: now,
      };

      schedules.push(schedule);
      writeJSON(localStorage, STORAGE_KEYS.SCHEDULES, schedules);
      return schedule;
    }

    async updateSchedule(id, data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SCHEDULE', { id: id });
          var result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API updateSchedule failed:', error.message);
        }
      }
      return this._updateScheduleLocal(id, data);
    }

    _updateScheduleLocal(id, data) {
      var schedules = this._getSchedulesLocal();
      var index = schedules.findIndex(function(s) { return String(s.id) === String(id); });
      if (index === -1) return null;

      var updated = {
        ...schedules[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      schedules[index] = updated;
      writeJSON(localStorage, STORAGE_KEYS.SCHEDULES, schedules);
      return updated;
    }

    getDefaultDays() {
      var days = Constants.DAYS || [];
      var result = {};
      days.forEach(function(day) {
        result[day.key] = {
          enabled: day.key !== 'friday',
          start: '08:00',
          end: '17:00',
        };
      });
      return result;
    }

    // =========================================================
    // ===== التخصصات (Specialties) =====
    // =========================================================

    async getSpecialties() {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SPECIALTIES');
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getSpecialties failed:', error.message);
        }
      }
      return this._getSpecialtiesLocal();
    }

    _getSpecialtiesLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.SPECIALTIES, []));
    }

    findSpecialty(id) {
      return this._getSpecialtiesLocal().find(function(s) { return String(s.id) === String(id); }) || null;
    }

    findSpecialtyByName(name) {
      var normalized = normalizeText(name);
      return this._getSpecialtiesLocal().find(function(s) {
        return normalizeText(s.name || s.nameAr || '') === normalized;
      }) || null;
    }

    async createSpecialty(data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('SPECIALTIES');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createSpecialty failed:', error.message);
        }
      }
      return this._createSpecialtyLocal(data);
    }

    _createSpecialtyLocal(data) {
      var specialties = this._getSpecialtiesLocal();
      var now = new Date().toISOString();
      var specialty = {
        id: generateId('SP'),
        name: data.name || '',
        nameAr: data.name || '',
        nameFr: data.nameFr || '',
        nameEn: data.nameEn || '',
        category: data.category || 'general',
        icon: data.icon || '🩺',
        description: data.description || '',
        active: data.active !== false,
        createdAt: now,
        updatedAt: now,
      };

      specialties.push(specialty);
      writeJSON(localStorage, STORAGE_KEYS.SPECIALTIES, specialties);
      return specialty;
    }

    // =========================================================
    // ===== الإشعارات (Notifications) =====
    // =========================================================

    async getNotifications(userId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = userId 
            ? this.getEndpoint('NOTIFICATIONS') + '?userId=' + encodeURIComponent(userId)
            : this.getEndpoint('NOTIFICATIONS');
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getNotifications failed:', error.message);
        }
      }
      return this._getNotificationsLocal(userId);
    }

    _getNotificationsLocal(userId) {
      var notifications = ensureArray(readJSON(localStorage, STORAGE_KEYS.NOTIFICATIONS, []));
      if (userId) {
        notifications = notifications.filter(function(n) {
          return n.userId === userId || n.userId === 'all' || n.userId === null;
        });
      }
      return notifications;
    }

    async createNotification(data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('NOTIFICATIONS');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createNotification failed:', error.message);
        }
      }
      return this._createNotificationLocal(data);
    }

    _createNotificationLocal(data) {
      var notifications = this._getNotificationsLocal(null);
      var now = new Date().toISOString();
      var notification = {
        id: generateId('NOTIF'),
        title: data.title || '',
        message: data.message || '',
        type: data.type || 'system',
        userId: data.userId || 'all',
        userRole: data.userRole || 'all',
        read: false,
        icon: data.icon || this.getNotificationIcon(data.type),
        color: data.color || this.getNotificationColor(data.type),
        action: data.action || null,
        relatedId: data.relatedId || null,
        relatedType: data.relatedType || null,
        createdAt: now,
        updatedAt: now,
      };

      notifications.unshift(notification);
      if (notifications.length > (Constants.MAX_NOTIFICATIONS || 500)) {
        notifications = notifications.slice(0, Constants.MAX_NOTIFICATIONS || 500);
      }
      writeJSON(localStorage, STORAGE_KEYS.NOTIFICATIONS, notifications);
      return notification;
    }

    async markNotificationRead(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('NOTIFICATION_READ', { id: id });
          var result = await this.request(endpoint, {
            method: 'PATCH'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API markNotificationRead failed:', error.message);
        }
      }
      return this._markNotificationReadLocal(id);
    }

    _markNotificationReadLocal(id) {
      var notifications = this._getNotificationsLocal(null);
      var index = notifications.findIndex(function(n) { return String(n.id) === String(id); });
      if (index === -1) return false;

      notifications[index].read = true;
      notifications[index].updatedAt = new Date().toISOString();
      writeJSON(localStorage, STORAGE_KEYS.NOTIFICATIONS, notifications);
      return true;
    }

    async markAllNotificationsRead(userId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('NOTIFICATIONS_READ');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: { userId: userId }
          });
          return result.success || false;
        } catch (error) {
          console.warn('API markAllNotificationsRead failed:', error.message);
        }
      }
      return this._markAllNotificationsReadLocal(userId);
    }

    _markAllNotificationsReadLocal(userId) {
      var notifications = this._getNotificationsLocal(null);
      var changed = false;
      
      notifications.forEach(function(n) {
        if (n.read === false && (n.userId === userId || n.userId === 'all' || n.userId === null)) {
          n.read = true;
          n.updatedAt = new Date().toISOString();
          changed = true;
        }
      });
      
      if (changed) {
        writeJSON(localStorage, STORAGE_KEYS.NOTIFICATIONS, notifications);
      }
      return changed;
    }

    async deleteNotification(id) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('NOTIFICATION', { id: id });
          var result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API deleteNotification failed:', error.message);
        }
      }
      return this._deleteNotificationLocal(id);
    }

    _deleteNotificationLocal(id) {
      var notifications = this._getNotificationsLocal(null);
      var filtered = notifications.filter(function(n) { return String(n.id) !== String(id); });
      if (filtered.length === notifications.length) return false;
      writeJSON(localStorage, STORAGE_KEYS.NOTIFICATIONS, filtered);
      return true;
    }

    async clearAllNotifications(userId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('NOTIFICATIONS') + '?userId=' + encodeURIComponent(userId);
          var result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API clearAllNotifications failed:', error.message);
        }
      }
      return this._clearAllNotificationsLocal(userId);
    }

    _clearAllNotificationsLocal(userId) {
      var notifications = this._getNotificationsLocal(null);
      if (userId) {
        notifications = notifications.filter(function(n) {
          return n.userId !== userId && n.userId !== 'all' && n.userId !== null;
        });
      } else {
        notifications = [];
      }
      writeJSON(localStorage, STORAGE_KEYS.NOTIFICATIONS, notifications);
      return true;
    }

    getNotificationIcon(type) {
      var icons = {
        appointment: '📅',
        reminder: '⏰',
        system: '🔔',
        complaint: '⚠️',
        user: '👤'
      };
      return icons[type] || '🔔';
    }

    getNotificationColor(type) {
      var colors = {
        appointment: '#4274d9',
        reminder: '#e9b341',
        system: '#6c7480',
        complaint: '#b34d4d',
        user: '#25815b'
      };
      return colors[type] || '#4274d9';
    }

    // =========================================================
    // ===== الشكاوى (Complaints) =====
    // =========================================================

    async getComplaints(filters) {
      if (this.useApi && this.isOnline) {
        try {
          var query = '';
          if (filters) {
            var params = [];
            if (filters.status) params.push('status=' + encodeURIComponent(filters.status));
            if (filters.senderId) params.push('senderId=' + encodeURIComponent(filters.senderId));
            if (params.length) query = '?' + params.join('&');
          }
          var endpoint = this.getEndpoint('COMPLAINTS') + query;
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getComplaints failed:', error.message);
        }
      }
      return this._getComplaintsLocal();
    }

    _getComplaintsLocal() {
      return ensureArray(readJSON(localStorage, STORAGE_KEYS.COMPLAINTS, []));
    }

    async createComplaint(data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('COMPLAINTS');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: data
          });
          return result.data || null;
        } catch (error) {
          console.warn('API createComplaint failed:', error.message);
        }
      }
      return this._createComplaintLocal(data);
    }

    _createComplaintLocal(data) {
      var complaints = this._getComplaintsLocal();
      var now = new Date().toISOString();
      var complaint = {
        id: generateId('CMP'),
        senderId: data.senderId || null,
        senderName: data.senderName || '',
        senderRole: data.senderRole || 'patient',
        senderEmail: data.senderEmail || '',
        senderPhone: data.senderPhone || '',
        subject: data.subject || '',
        message: data.message || '',
        status: 'pending',
        relatedId: data.relatedId || null,
        relatedType: data.relatedType || null,
        createdAt: now,
        updatedAt: now,
      };

      complaints.push(complaint);
      writeJSON(localStorage, STORAGE_KEYS.COMPLAINTS, complaints);
      return complaint;
    }

    async updateComplaintStatus(id, status) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = status === 'resolved' 
            ? this.getEndpoint('COMPLAINT_RESOLVE', { id: id })
            : this.getEndpoint('COMPLAINT_REJECT', { id: id });
          var result = await this.request(endpoint, {
            method: 'POST'
          });
          return result.data || null;
        } catch (error) {
          console.warn('API updateComplaintStatus failed:', error.message);
        }
      }
      return this._updateComplaintStatusLocal(id, status);
    }

    _updateComplaintStatusLocal(id, status) {
      var complaints = this._getComplaintsLocal();
      var index = complaints.findIndex(function(c) { return String(c.id) === String(id); });
      if (index === -1) return null;

      var now = new Date().toISOString();
      complaints[index] = {
        ...complaints[index],
        status: status,
        updatedAt: now,
        ...(status === 'resolved' ? { resolvedAt: now } : {}),
        ...(status === 'rejected' ? { rejectedAt: now } : {}),
      };

      writeJSON(localStorage, STORAGE_KEYS.COMPLAINTS, complaints);
      return complaints[index];
    }

    // =========================================================
    // ===== الإحصائيات (Stats) =====
    // =========================================================

    async getStats() {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('STATS');
          var result = await this.request(endpoint);
          return result.data || {};
        } catch (error) {
          console.warn('API getStats failed:', error.message);
        }
      }
      return this._getStatsLocal();
    }

    async getDashboardStats() {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('DASHBOARD_STATS');
          var result = await this.request(endpoint);
          return result.data || {};
        } catch (error) {
          console.warn('API getDashboardStats failed:', error.message);
        }
      }
      return this._getStatsLocal();
    }

    _getStatsLocal() {
      var doctors = this._getDoctorsLocal();
      var patients = this._getPatientsLocal();
      var appointments = this._getAppointmentsLocal();
      var services = this._getServicesLocal();
      var schedules = this._getSchedulesLocal();
      var today = getToday();

      var commissionSettings = this.getCommissionSettings();
      var totalCommission = 0;
      var completedCount = 0;

      appointments.forEach(function(a) {
        if (a.status === 'completed') {
          completedCount++;
          var price = Number(a.price) || 0;
          if (commissionSettings.perAppointment > 0) {
            totalCommission += commissionSettings.perAppointment;
          } else {
            totalCommission += (price * commissionSettings.rate) / 100;
          }
        }
      });

      return {
        doctors: {
          total: doctors.length,
          active: doctors.filter(function(d) { return isAccountActive(d); }).length,
          approved: doctors.filter(function(d) { return d.approved !== false; }).length,
          pending: doctors.filter(function(d) { return d.approved !== true; }).length,
        },
        patients: {
          total: patients.length,
          active: patients.filter(function(p) { return isAccountActive(p); }).length,
        },
        appointments: {
          total: appointments.length,
          pending: appointments.filter(function(a) { return a.status === 'pending'; }).length,
          confirmed: appointments.filter(function(a) { return a.status === 'confirmed'; }).length,
          completed: appointments.filter(function(a) { return a.status === 'completed'; }).length,
          cancelled: appointments.filter(function(a) { return ['cancelled', 'rejected'].includes(a.status); }).length,
          today: appointments.filter(function(a) { return a.date === today; }).length,
        },
        services: {
          total: services.length,
          active: services.filter(function(s) { return s.active !== false; }).length,
        },
        schedules: {
          total: schedules.length,
        },
        commissions: {
          total: totalCommission,
          rate: commissionSettings.rate,
          perAppointment: commissionSettings.perAppointment,
          completedCount: completedCount,
          average: completedCount > 0 ? totalCommission / completedCount : 0,
        }
      };
    }

    // =========================================================
    // ===== المفضلة (Favorites) =====
    // =========================================================

    async getFavorites(userId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('FAVORITES') + '?userId=' + encodeURIComponent(userId);
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getFavorites failed:', error.message);
        }
      }
      return this._getFavoritesLocal(userId);
    }

    _getFavoritesLocal(userId) {
      var key = STORAGE_KEYS.FAVORITES_PREFIX + userId;
      return ensureArray(readJSON(localStorage, key, []));
    }

    async addFavorite(userId, doctorId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('FAVORITES');
          var result = await this.request(endpoint, {
            method: 'POST',
            body: { userId: userId, doctorId: doctorId }
          });
          return result.data || null;
        } catch (error) {
          console.warn('API addFavorite failed:', error.message);
        }
      }
      return this._addFavoriteLocal(userId, doctorId);
    }

    _addFavoriteLocal(userId, doctorId) {
      var key = STORAGE_KEYS.FAVORITES_PREFIX + userId;
      var favorites = ensureArray(readJSON(localStorage, key, []));
      
      var exists = favorites.some(function(f) {
        return String(f.id) === String(doctorId);
      });
      
      if (exists) return null;
      
      var doctor = this.findDoctor(doctorId);
      if (!doctor) return null;
      
      var favorite = {
        id: doctorId,
        fullName: doctor.fullName || '',
        specialty: doctor.specialty || '',
        wilaya: doctor.wilaya || '',
        commune: doctor.commune || '',
        rating: doctor.rating || 0,
        addedAt: new Date().toISOString()
      };
      
      favorites.push(favorite);
      writeJSON(localStorage, key, favorites);
      return favorite;
    }

    async removeFavorite(userId, doctorId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('FAVORITE', { id: doctorId }) + '?userId=' + encodeURIComponent(userId);
          var result = await this.request(endpoint, {
            method: 'DELETE'
          });
          return result.success || false;
        } catch (error) {
          console.warn('API removeFavorite failed:', error.message);
        }
      }
      return this._removeFavoriteLocal(userId, doctorId);
    }

    _removeFavoriteLocal(userId, doctorId) {
      var key = STORAGE_KEYS.FAVORITES_PREFIX + userId;
      var favorites = ensureArray(readJSON(localStorage, key, []));
      
      var filtered = favorites.filter(function(f) {
        return String(f.id) !== String(doctorId);
      });
      
      if (filtered.length === favorites.length) return false;
      writeJSON(localStorage, key, filtered);
      return true;
    }

    // =========================================================
    // ===== قائمة الانتظار (Queue) =====
    // =========================================================

    async getQueue(doctorId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('QUEUE_DOCTOR', { doctorId: doctorId });
          var result = await this.request(endpoint);
          return ensureArray(result.data || []);
        } catch (error) {
          console.warn('API getQueue failed:', error.message);
        }
      }
      return this._getQueueLocal(doctorId);
    }

    _getQueueLocal(doctorId) {
      var key = 'monmedecin-queue-' + doctorId;
      return ensureArray(readJSON(localStorage, key, []));
    }

    async updateQueueStatus(doctorId, patientId, status) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('QUEUE_STATUS', { patientId: patientId });
          var result = await this.request(endpoint, {
            method: 'PATCH',
            body: { doctorId: doctorId, status: status }
          });
          return result.success || false;
        } catch (error) {
          console.warn('API updateQueueStatus failed:', error.message);
        }
      }
      return this._updateQueueStatusLocal(doctorId, patientId, status);
    }

    _updateQueueStatusLocal(doctorId, patientId, status) {
      var queue = this._getQueueLocal(doctorId);
      var index = queue.findIndex(function(item) {
        return String(item.patientId) === String(patientId);
      });
      
      if (index === -1) return false;
      
      queue[index].status = status;
      queue[index].updatedAt = new Date().toISOString();
      
      if (status === 'in_progress') {
        queue[index].startedAt = new Date().toISOString();
      } else if (status === 'done') {
        queue[index].completedAt = new Date().toISOString();
      } else if (status === 'removed') {
        queue[index].removedAt = new Date().toISOString();
      }
      
      var key = 'monmedecin-queue-' + doctorId;
      writeJSON(localStorage, key, queue);
      return true;
    }

    async removeFromQueue(doctorId, patientId) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('QUEUE_STATUS', { patientId: patientId });
          var result = await this.request(endpoint, {
            method: 'DELETE',
            body: { doctorId: doctorId }
          });
          return result.success || false;
        } catch (error) {
          console.warn('API removeFromQueue failed:', error.message);
        }
      }
      return this._removeFromQueueLocal(doctorId, patientId);
    }

    _removeFromQueueLocal(doctorId, patientId) {
      var queue = this._getQueueLocal(doctorId);
      var filtered = queue.filter(function(item) {
        return String(item.patientId) !== String(patientId);
      });
      
      if (filtered.length === queue.length) return false;
      
      var key = 'monmedecin-queue-' + doctorId;
      writeJSON(localStorage, key, filtered);
      return true;
    }

    // =========================================================
    // ===== المحتوى (Content) =====
    // =========================================================

    async getContent(section) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = section 
            ? this.getEndpoint('CONTENT_SECTION', { section: section })
            : this.getEndpoint('CONTENT');
          var result = await this.request(endpoint);
          return result.data || {};
        } catch (error) {
          console.warn('API getContent failed:', error.message);
        }
      }
      return this._getContentLocal(section);
    }

    _getContentLocal(section) {
      var content = readJSON(localStorage, STORAGE_KEYS.CONTENT, {});
      if (section) {
        return content[section] || {};
      }
      return content;
    }

    async updateContent(section, data) {
      if (this.useApi && this.isOnline) {
        try {
          var endpoint = this.getEndpoint('CONTENT_SECTION', { section: section });
          var result = await this.request(endpoint, {
            method: 'PUT',
            body: data
          });
          return result.data || {};
        } catch (error) {
          console.warn('API updateContent failed:', error.message);
        }
      }
      return this._updateContentLocal(section, data);
    }

    _updateContentLocal(section, data) {
      var content = readJSON(localStorage, STORAGE_KEYS.CONTENT, {});
      content[section] = { ...(content[section] || {}), ...data };
      writeJSON(localStorage, STORAGE_KEYS.CONTENT, content);
      return content[section];
    }

    // =========================================================
    // ===== المستمعون (Listeners) =====
    // =========================================================

    addListener(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    removeListener(callback) {
      var index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    }

    notifyListeners(event, data) {
      this.listeners.forEach(function(listener) {
        try {
          listener(event, data);
        } catch (error) {
          console.warn('MON MÉDECIN: Listener error', error);
        }
      });
    }

    // =========================================================
    // ===== المزامنة (Sync) =====
    // =========================================================

    async syncAll() {
      if (!this.useApi || !this.isOnline) {
        return { success: false, message: 'API غير مفعل أو الجهاز غير متصل' };
      }

      try {
        var results = {
          doctors: await this.syncDoctors(),
          patients: await this.syncPatients(),
          appointments: await this.syncAppointments(),
          services: await this.syncServices(),
          schedules: await this.syncSchedules(),
        };

        var allSuccess = Object.values(results).every(function(r) { return r !== false; });
        return {
          success: allSuccess,
          results: results,
          message: allSuccess ? 'تمت المزامنة بنجاح' : 'حدثت بعض الأخطاء أثناء المزامنة'
        };
      } catch (error) {
        console.error('Sync error:', error);
        return { success: false, message: error.message };
      }
    }

    async syncDoctors() {
      try {
        var localData = this._getDoctorsLocal();
        var endpoint = this.getEndpoint('DOCTORS');
        await this.request(endpoint, {
          method: 'POST',
          body: { sync: true, data: localData }
        });
        return true;
      } catch (error) {
        console.warn('Sync doctors failed:', error.message);
        return false;
      }
    }

    async syncPatients() {
      try {
        var localData = this._getPatientsLocal();
        var endpoint = this.getEndpoint('PATIENTS');
        await this.request(endpoint, {
          method: 'POST',
          body: { sync: true, data: localData }
        });
        return true;
      } catch (error) {
        console.warn('Sync patients failed:', error.message);
        return false;
      }
    }

    async syncAppointments() {
      try {
        var localData = this._getAppointmentsLocal();
        var endpoint = this.getEndpoint('APPOINTMENTS');
        await this.request(endpoint, {
          method: 'POST',
          body: { sync: true, data: localData }
        });
        return true;
      } catch (error) {
        console.warn('Sync appointments failed:', error.message);
        return false;
      }
    }

    async syncServices() {
      try {
        var localData = this._getServicesLocal();
        var endpoint = this.getEndpoint('SERVICES');
        await this.request(endpoint, {
          method: 'POST',
          body: { sync: true, data: localData }
        });
        return true;
      } catch (error) {
        console.warn('Sync services failed:', error.message);
        return false;
      }
    }

    async syncSchedules() {
      try {
        var localData = this._getSchedulesLocal();
        var endpoint = this.getEndpoint('SCHEDULES');
        await this.request(endpoint, {
          method: 'POST',
          body: { sync: true, data: localData }
        });
        return true;
      } catch (error) {
        console.warn('Sync schedules failed:', error.message);
        return false;
      }
    }

    // =========================================================
    // ===== تنظيف البيانات (Cleanup) =====
    // =========================================================

    cleanupOldData(period) {
      var threshold = this.getDateThreshold(period);
      if (!threshold) return { deleted: 0, remaining: 0 };

      var appointments = this._getAppointmentsLocal();
      var before = appointments.length;

      var filtered = appointments.filter(function(a) {
        var date = a.date || a.createdAt?.split('T')[0];
        if (!date) return true;
        return date >= threshold;
      });

      var deleted = before - filtered.length;
      if (deleted > 0) {
        this.saveAppointments(filtered);
      }

      return {
        deleted: deleted,
        remaining: filtered.length,
        original: before,
      };
    }

    getDateThreshold(period) {
      var now = new Date();
      switch (period) {
        case 'day':
          now.setDate(now.getDate() - 1);
          break;
        case 'week':
          now.setDate(now.getDate() - 7);
          break;
        case 'month':
          now.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          now.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          now.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() - 1);
          break;
        default:
          return null;
      }
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, '0');
      var day = String(now.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }
  }

  // ===== إنشاء الخدمة =====
  var dataService = new DataService();

  // ===== تصدير للاستخدام =====
  window.MonMedecinDataService = dataService;
  window.DataService = dataService;

  console.log('✅ MonMedecinDataService loaded (with Commissions)');

})();