// =========================================================
// MON MÉDECIN - AUTH SERVICE (VERSION API READY)
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

  if (!window.MonMedecinDataService) {
    console.error('❌ MonMedecinDataService not loaded!');
    return;
  }

  const Helpers = window.MonMedecinHelpers;
  const Constants = window.MonMedecinConstants;
  const DataService = window.MonMedecinDataService;

  const {
    readJSON,
    writeJSON,
    removeStorage,
    isAccountActive,
    normalizeEmail,
    normalizePhone,
    getRoleHome,
    getRoleLabel,
  } = Helpers;

  const {
    STORAGE_KEYS,
    SESSION_KEYS,
    ROLES,
    SECRETARY_PERMISSIONS,
  } = Constants;

  class AuthService {
    constructor() {
      this.currentUser = null;
      this.session = null;
      this.useApi = DataService.useApi || false;
      this.listeners = [];
      this._initialized = false;
      this._tokenRefreshInProgress = false;

      // محاولة استعادة الجلسة فوراً
      this.restoreSession();

      console.log('✅ AuthService initialized (API Ready: ' + (this.useApi ? 'ON' : 'OFF') + ')');
    }

    // =========================================================
    // المصادقة (Authentication)
    // =========================================================

    async login(identifier, password, remember) {
      if (!identifier || !password) {
        return {
          success: false,
          message: 'أدخل رقم الهاتف أو البريد الإلكتروني وكلمة المرور.',
        };
      }

      try {
        if (this.useApi) {
          const result = await DataService.login({
            identifier: identifier,
            password: password,
            remember: remember || false
          });

          if (result.success) {
            const user = result.user;
            const session = this.createSession(user, remember);
            this.saveSession(session, user);
            this.currentUser = user;
            this.session = session;
            
            this.notifyListeners('login', { user, session });
            
            return {
              success: true,
              role: user.role,
              user: user,
              session: session,
              route: getRoleHome(user.role),
            };
          }
          
          if (result.message && result.message.includes('خطأ')) {
            console.warn('API login failed, falling back to local:', result.message);
          }
        }

        return this._localLogin(identifier, password, remember);

      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          message: error.message || 'حدث خطأ أثناء تسجيل الدخول',
        };
      }
    }

    _localLogin(identifier, password, remember) {
      const user = DataService.findUserByIdentifier(identifier);
      
      if (!user) {
        return {
          success: false,
          message: 'لم يتم العثور على حساب بهذه المعلومات.',
        };
      }

      if (String(user.password || '') !== String(password || '')) {
        return {
          success: false,
          message: 'كلمة المرور غير صحيحة.',
        };
      }

      if (!isAccountActive(user)) {
        return {
          success: false,
          message: 'هذا الحساب متوقف حاليًا. يرجى التواصل مع الإدارة.',
        };
      }

      if (user.role === ROLES.DOCTOR) {
        const doctorCheck = this.checkDoctorAccount(user);
        if (!doctorCheck.valid) {
          return {
            success: false,
            message: doctorCheck.message,
          };
        }
      }

      if (user.role === ROLES.SECRETARY) {
        const secretaryCheck = this.checkSecretaryAccount(user);
        if (!secretaryCheck.valid) {
          return {
            success: false,
            message: secretaryCheck.message,
          };
        }
      }

      const session = this.createSession(user, remember);
      this.saveSession(session, user);
      this.currentUser = user;
      this.session = session;

      this.notifyListeners('login', { user, session });

      return {
        success: true,
        role: user.role,
        user: user,
        session: session,
        route: getRoleHome(user.role),
      };
    }

    checkDoctorAccount(doctor) {
      const doctorId = doctor.id;

      const services = DataService.getDoctorServices(doctorId);
      const hasServices = services.some(s => s.active !== false);

      if (!hasServices) {
        return {
          valid: false,
          message: 'حساب الطبيب لا يحتوي على خدمات نشطة. يرجى إضافة خدمات من لوحة الإدارة.',
        };
      }

      const schedule = DataService.getDoctorSchedule(doctorId);
      if (!schedule) {
        return {
          valid: false,
          message: 'حساب الطبيب لا يحتوي على جدول عمل. يرجى إعداد الجدول من لوحة التحكم.',
        };
      }

      const days = schedule.days || {};
      const hasActiveDays = Object.values(days).some(day => day && day.enabled !== false);
      if (!hasActiveDays) {
        return {
          valid: false,
          message: 'لا توجد أيام عمل مفعلة في جدول الطبيب. يرجى تفعيل أيام العمل.',
        };
      }

      return { valid: true };
    }

    checkSecretaryAccount(secretary) {
      const doctorId = secretary.doctor_id || secretary.doctorId;

      if (!doctorId) {
        return {
          valid: false,
          message: 'حساب السكرتير غير مرتبط بطبيب. يرجى التواصل مع الإدارة.',
        };
      }

      const doctor = DataService.findDoctor(doctorId);
      if (!doctor) {
        return {
          valid: false,
          message: 'الطبيب المرتبط بهذا الحساب غير موجود. يرجى التواصل مع الإدارة.',
        };
      }

      if (!isAccountActive(doctor)) {
        return {
          valid: false,
          message: 'حساب الطبيب المرتبط متوقف. يرجى التواصل مع الإدارة.',
        };
      }

      return { valid: true };
    }

    createSession(user, remember) {
      const now = new Date().toISOString();
      return {
        authenticated: true,
        role: user.role,
        userId: user.id,
        remember: remember === true,
        loginAt: now,
        expiresAt: remember
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    saveSession(session, user) {
      writeJSON(localStorage, STORAGE_KEYS.SESSION, session);
      writeJSON(localStorage, STORAGE_KEYS.CURRENT_USER, {
        role: user.role,
        account: user,
      });
      writeJSON(sessionStorage, STORAGE_KEYS.SESSION, session);

      this.session = session;
      this.currentUser = user;
    }

    restoreSession() {
      let session = readJSON(localStorage, STORAGE_KEYS.SESSION, null);
      if (!session) {
        session = readJSON(sessionStorage, STORAGE_KEYS.SESSION, null);
      }

      if (!session || !session.authenticated) {
        this.clearSession();
        return null;
      }

      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        this.clearSession();
        return null;
      }

      let userData = readJSON(localStorage, STORAGE_KEYS.CURRENT_USER, null);
      let user = null;

      if (userData && userData.account) {
        user = userData.account;
      } else if (session.userId) {
        user = DataService.findUser(session.userId);
      }

      if (!user || !isAccountActive(user)) {
        this.clearSession();
        return null;
      }

      this.session = session;
      this.currentUser = user;

      return {
        role: user.role,
        user: user,
        session: session,
      };
    }

    async logout() {
      const user = this.currentUser;

      if (this.useApi) {
        try {
          await DataService.logout();
        } catch (error) {
          console.warn('API logout failed:', error.message);
        }
      }

      this.clearSession();
      this.notifyListeners('logout', { user });
    }

    clearSession() {
      this.session = null;
      this.currentUser = null;

      removeStorage(localStorage, STORAGE_KEYS.SESSION);
      removeStorage(localStorage, STORAGE_KEYS.CURRENT_USER);
      removeStorage(sessionStorage, STORAGE_KEYS.SESSION);
      removeStorage(localStorage, STORAGE_KEYS.TOKEN);
      removeStorage(localStorage, STORAGE_KEYS.REFRESH_TOKEN);
    }

    refreshSession(user) {
      if (!this.session || !this.currentUser) return false;

      const updatedUser = user || this.currentUser;
      this.currentUser = updatedUser;

      writeJSON(localStorage, STORAGE_KEYS.CURRENT_USER, {
        role: updatedUser.role,
        account: updatedUser,
      });

      this.session.updatedAt = new Date().toISOString();
      writeJSON(localStorage, STORAGE_KEYS.SESSION, this.session);
      writeJSON(sessionStorage, STORAGE_KEYS.SESSION, this.session);

      this.notifyListeners('refresh', { user: updatedUser });

      return true;
    }

    async refreshToken() {
      if (this._tokenRefreshInProgress) return false;
      this._tokenRefreshInProgress = true;

      try {
        const result = await DataService.refreshToken();
        return result.success;
      } catch (error) {
        console.warn('Token refresh failed:', error.message);
        return false;
      } finally {
        this._tokenRefreshInProgress = false;
      }
    }

    // =========================================================
    // التسجيل (Registration)
    // =========================================================

    async register(data, role, extraData) {
      const roleValid = Object.values(ROLES).includes(role);
      if (!roleValid) {
        return {
          success: false,
          message: 'دور غير صالح.',
        };
      }

      try {
        if (this.useApi) {
          const result = await DataService.register({
            ...data,
            role: role,
            ...extraData,
          });

          if (result.success) {
            const user = result.user;
            
            const loginResult = await this.login(
              user.phone || user.email,
              user.password,
              true
            );

            return {
              success: true,
              user: user,
              login: loginResult,
              message: 'تم إنشاء الحساب بنجاح.',
            };
          }
          
          if (result.message) {
            return result;
          }
        }

        return this._localRegister(data, role, extraData);

      } catch (error) {
        console.error('Register error:', error);
        return {
          success: false,
          message: error.message || 'حدث خطأ أثناء إنشاء الحساب',
        };
      }
    }

    _localRegister(data, role, extraData) {
      const existing = DataService.findUserByIdentifier(data.phone || data.email);
      if (existing) {
        return {
          success: false,
          message: 'يوجد حساب مسجل مسبقاً بنفس رقم الهاتف أو البريد الإلكتروني.',
        };
      }

      const userData = {
        ...data,
        role: role,
        ...extraData,
      };

      const user = DataService.createUser(userData);
      if (!user) {
        return {
          success: false,
          message: 'تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.',
        };
      }

      // حفظ أيضاً في monmedecin-users
      let users = readJSON(localStorage, STORAGE_KEYS.USERS, []);
      if (!Array.isArray(users)) users = [];
      
      users = users.filter(function(u) {
        return String(u.id) !== String(user.id);
      });
      
      users.push({
        ...user,
        role: role,
        _source: role
      });
      
      writeJSON(localStorage, STORAGE_KEYS.USERS, users);

      const loginResult = this._localLogin(
        user.phone || user.email,
        user.password,
        true
      );

      return {
        success: true,
        user: user,
        login: loginResult,
        message: 'تم إنشاء الحساب بنجاح.',
      };
    }

    registerPatient(data) {
      return this.register(data, ROLES.PATIENT, {
        birthDate: data.birthDate || '',
        gender: data.gender || '',
        wilaya: data.wilaya || '',
        commune: data.commune || '',
        address: data.address || '',
      });
    }

    registerDoctor(data) {
      return this.register(data, ROLES.DOCTOR, {
        specialty: data.specialty || '',
        specialtyId: data.specialtyId || '',
        registrationNumber: data.registrationNumber || '',
        experienceYears: data.experienceYears || 0,
        clinic: data.clinic || '',
        approved: data.approved || false,
        wilaya: data.wilaya || '',
        commune: data.commune || '',
        address: data.address || '',
      });
    }

    registerSecretary(data, doctorId) {
      if (!doctorId) {
        return {
          success: false,
          message: 'يجب تحديد الطبيب المرتبط بالسكرتير.',
        };
      }

      const doctor = DataService.findDoctor(doctorId);
      if (!doctor) {
        return {
          success: false,
          message: 'الطبيب المحدد غير موجود.',
        };
      }

      return this.register(data, ROLES.SECRETARY, {
        doctor_id: doctorId,
        doctorId: doctorId,
        permissions: data.permissions || {},
        gender: data.gender || '',
      });
    }

    // =========================================================
    // تغيير كلمة المرور
    // =========================================================

    async changePassword(userId, currentPassword, newPassword, confirmPassword) {
      if (!userId || !currentPassword || !newPassword) {
        return {
          success: false,
          message: 'جميع الحقول مطلوبة.',
        };
      }

      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'كلمة المرور الجديدة يجب أن تحتوي على 6 أحرف على الأقل.',
        };
      }

      if (newPassword !== confirmPassword) {
        return {
          success: false,
          message: 'تأكيد كلمة المرور غير مطابق.',
        };
      }

      if (currentPassword === newPassword) {
        return {
          success: false,
          message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.',
        };
      }

      try {
        if (this.useApi) {
          const result = await DataService.request(
            Constants.getEndpoint('CHANGE_PASSWORD'),
            {
              method: 'POST',
              body: {
                userId: userId,
                currentPassword: currentPassword,
                newPassword: newPassword,
              }
            }
          );

          if (result.success) {
            if (this.currentUser && String(this.currentUser.id) === String(userId)) {
              this.currentUser.password = newPassword;
              this.refreshSession(this.currentUser);
            }
            return {
              success: true,
              message: 'تم تغيير كلمة المرور بنجاح.',
            };
          }
          return result;
        }

        return this._localChangePassword(userId, currentPassword, newPassword);

      } catch (error) {
        console.error('Change password error:', error);
        return {
          success: false,
          message: error.message || 'حدث خطأ أثناء تغيير كلمة المرور',
        };
      }
    }

    _localChangePassword(userId, currentPassword, newPassword) {
      const user = DataService.findUser(userId);
      if (!user) {
        return {
          success: false,
          message: 'تعذر العثور على المستخدم.',
        };
      }

      if (String(user.password || '') !== String(currentPassword || '')) {
        return {
          success: false,
          message: 'كلمة المرور الحالية غير صحيحة.',
        };
      }

      const updated = DataService.updateUser(userId, {
        password: newPassword,
        passwordChangedAt: new Date().toISOString(),
      });

      if (!updated) {
        return {
          success: false,
          message: 'تعذر تحديث كلمة المرور.',
        };
      }

      // تحديث في monmedecin-users
      let users = readJSON(localStorage, STORAGE_KEYS.USERS, []);
      if (Array.isArray(users)) {
        const index = users.findIndex(function(u) {
          return String(u.id) === String(userId);
        });
        if (index >= 0) {
          users[index].password = newPassword;
          users[index].passwordChangedAt = new Date().toISOString();
          writeJSON(localStorage, STORAGE_KEYS.USERS, users);
        }
      }

      if (this.currentUser && String(this.currentUser.id) === String(userId)) {
        this.refreshSession(updated);
      }

      return {
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح.',
      };
    }

    // =========================================================
    // إعادة تعيين كلمة المرور
    // =========================================================

    async requestPasswordReset(identifier) {
      if (!identifier) {
        return {
          success: false,
          message: 'أدخل رقم الهاتف أو البريد الإلكتروني.',
        };
      }

      try {
        if (this.useApi) {
          const result = await DataService.request(
            Constants.getEndpoint('FORGOT_PASSWORD'),
            {
              method: 'POST',
              body: { identifier: identifier }
            }
          );
          return result;
        }

        return this._localRequestPasswordReset(identifier);

      } catch (error) {
        console.error('Password reset request error:', error);
        return {
          success: false,
          message: error.message || 'حدث خطأ أثناء طلب إعادة التعيين',
        };
      }
    }

    _localRequestPasswordReset(identifier) {
      const user = DataService.findUserByIdentifier(identifier);
      if (!user) {
        return {
          success: false,
          message: 'لم يتم العثور على حساب بهذه المعلومات.',
        };
      }

      const token = this.generateResetToken(user.id);
      const resetRequests = readJSON(sessionStorage, SESSION_KEYS.RESET_REQUESTS, []);

      const filtered = resetRequests.filter(req => req.userId !== user.id);
      filtered.push({
        userId: user.id,
        role: user.role,
        token: token,
        identifier: user.phone || user.email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + Constants.RESET_TOKEN_EXPIRY || 3600000).toISOString(),
        used: false,
      });

      writeJSON(sessionStorage, SESSION_KEYS.RESET_REQUESTS, filtered);

      console.log('🔐 Reset token:', token);
      console.log('📧 Simulated email to:', user.email || user.phone);

      return {
        success: true,
        token: token,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى ' + (user.email || user.phone) + '.',
      };
    }

    validateResetToken(token) {
      if (!token) {
        return { valid: false, reason: 'الرمز غير موجود' };
      }

      const requests = readJSON(sessionStorage, SESSION_KEYS.RESET_REQUESTS, []);
      const found = requests.find(req => req.token === token && req.used === false);

      if (!found) {
        return { valid: false, reason: 'الرمز غير صالح أو تم استخدامه' };
      }

      if (new Date(found.expiresAt) < new Date()) {
        return { valid: false, reason: 'انتهت صلاحية الرمز' };
      }

      return {
        valid: true,
        data: found,
      };
    }

    async resetPassword(token, newPassword, confirmPassword) {
      if (!token || !newPassword || !confirmPassword) {
        return {
          success: false,
          message: 'جميع الحقول مطلوبة.',
        };
      }

      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل.',
        };
      }

      if (newPassword !== confirmPassword) {
        return {
          success: false,
          message: 'تأكيد كلمة المرور غير مطابق.',
        };
      }

      try {
        if (this.useApi) {
          const result = await DataService.request(
            Constants.getEndpoint('RESET_PASSWORD'),
            {
              method: 'POST',
              body: {
                token: token,
                newPassword: newPassword,
              }
            }
          );
          return result;
        }

        return this._localResetPassword(token, newPassword);

      } catch (error) {
        console.error('Password reset error:', error);
        return {
          success: false,
          message: error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور',
        };
      }
    }

    _localResetPassword(token, newPassword) {
      const validation = this.validateResetToken(token);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.reason || 'الرمز غير صالح.',
        };
      }

      const tokenData = validation.data;
      const user = DataService.findUser(tokenData.userId);
      if (!user) {
        return {
          success: false,
          message: 'تعذر العثور على المستخدم.',
        };
      }

      const updated = DataService.updateUser(user.id, {
        password: newPassword,
        passwordResetAt: new Date().toISOString(),
      });

      if (!updated) {
        return {
          success: false,
          message: 'تعذر تحديث كلمة المرور.',
        };
      }

      const requests = readJSON(sessionStorage, SESSION_KEYS.RESET_REQUESTS, []);
      const index = requests.findIndex(req => req.token === token);
      if (index !== -1) {
        requests[index].used = true;
        requests[index].usedAt = new Date().toISOString();
        writeJSON(sessionStorage, SESSION_KEYS.RESET_REQUESTS, requests);
      }

      return {
        success: true,
        message: 'تم إعادة تعيين كلمة المرور بنجاح.',
      };
    }

    generateResetToken(userId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).slice(2, 10);
      const userIdPart = String(userId).slice(-6);
      return 'RESET-' + timestamp + '-' + random + '-' + userIdPart;
    }

    // =========================================================
    // صلاحيات السكرتير
    // =========================================================

    secretaryCan(permission, secretary) {
      const user = secretary || this.currentUser;
      if (!user || user.role !== ROLES.SECRETARY) return false;

      const permissions = user.permissions || {};
      return permissions[permission] === true;
    }

    getSecretaryDoctorId(secretary) {
      const user = secretary || this.currentUser;
      if (!user || user.role !== ROLES.SECRETARY) return null;
      return user.doctor_id || user.doctorId || null;
    }

    getSecretaryDoctor(secretary) {
      const doctorId = this.getSecretaryDoctorId(secretary);
      if (!doctorId) return null;
      return DataService.findDoctor(doctorId);
    }

    getSecretaryPermissions(secretary) {
      const user = secretary || this.currentUser;
      if (!user || user.role !== ROLES.SECRETARY) return {};
      return user.permissions || {};
    }

    updateSecretaryPermissions(secretaryId, permissions) {
      const secretary = DataService.findUser(secretaryId);
      if (!secretary || secretary.role !== ROLES.SECRETARY) return null;

      const updated = DataService.updateUser(secretaryId, {
        permissions: permissions,
      });

      if (this.currentUser && String(this.currentUser.id) === String(secretaryId)) {
        this.refreshSession(updated);
      }

      return updated;
    }

    // =========================================================
    // معلومات المستخدم الحالي
    // =========================================================

    getCurrentUser() {
      return this.currentUser;
    }

    getCurrentRole() {
      return this.session?.role || null;
    }

    isAuthenticated() {
      return this.session !== null && this.session.authenticated === true;
    }

    hasRole(role) {
      return this.getCurrentRole() === role;
    }

    getUserName() {
      if (!this.currentUser) return '';
      return this.currentUser.fullName || this.currentUser.name || 'مستخدم';
    }

    getUserEmail() {
      if (!this.currentUser) return '';
      return this.currentUser.email || '';
    }

    getUserPhone() {
      if (!this.currentUser) return '';
      return this.currentUser.phone || '';
    }

    // =========================================================
    // المستمعون (Listeners)
    // =========================================================

    addListener(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    removeListener(callback) {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    }

    notifyListeners(event, data) {
      this.listeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          console.warn('MON MÉDECIN: Auth listener error', error);
        }
      });
    }
  }

  // ===== إنشاء الخدمة =====
  const authService = new AuthService();

  // ===== تصدير للاستخدام =====
  window.MonMedecinAuthService = authService;
  window.AuthService = authService;

  console.log('✅ MonMedecinAuthService loaded (API Ready)');

})();