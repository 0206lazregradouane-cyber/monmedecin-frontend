// =========================================================
// MON MÉDECIN - VALIDATORS (VERSION UNIFIÉE)
// =========================================================

(function() {
  'use strict';

  // الحصول على المساعدات
  const Helpers = window.MonMedecinHelpers || {};
  const normalizePhone = Helpers.normalizePhone || function(v) { return String(v || '').replace(/\s+/g, '').replace(/-/g, '').trim(); };
  const normalizeEmail = Helpers.normalizeEmail || function(v) { return String(v || '').trim().toLowerCase(); };

  const Validators = {
    // =========================================================
    // التحقق الأساسي
    // =========================================================

    /**
     * التحقق من أن القيمة موجودة وغير فارغة
     * @param {*} value - القيمة المراد التحقق منها
     * @returns {boolean} صحة القيمة
     */
    required: function(value) {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    },

    /**
     * التحقق من الحد الأدنى للطول
     * @param {string} value - النص
     * @param {number} min - الحد الأدنى
     * @returns {boolean} صحة النص
     */
    minLength: function(value, min) {
      return String(value || '').length >= min;
    },

    /**
     * التحقق من الحد الأقصى للطول
     * @param {string} value - النص
     * @param {number} max - الحد الأقصى
     * @returns {boolean} صحة النص
     */
    maxLength: function(value, max) {
      return String(value || '').length <= max;
    },

    /**
     * التحقق من أن القيمة بين رقمين
     * @param {number} value - القيمة
     * @param {number} min - الحد الأدنى
     * @param {number} max - الحد الأقصى
     * @returns {boolean} صحة القيمة
     */
    between: function(value, min, max) {
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },

    // =========================================================
    // التحقق من النصوص
    // =========================================================

    /**
     * التحقق من أن النص يحتوي على أحرف عربية فقط
     * @param {string} value - النص
     * @returns {boolean} صحة النص
     */
    isArabic: function(value) {
      if (!value) return true;
      return /^[\u0600-\u06FF\s]+$/.test(value.trim());
    },

    /**
     * التحقق من أن النص يحتوي على أحرف إنجليزية فقط
     * @param {string} value - النص
     * @returns {boolean} صحة النص
     */
    isEnglish: function(value) {
      if (!value) return true;
      return /^[a-zA-Z\s]+$/.test(value.trim());
    },

    /**
     * التحقق من أن النص يحتوي على أحرف وأرقام فقط
     * @param {string} value - النص
     * @returns {boolean} صحة النص
     */
    isAlphanumeric: function(value) {
      if (!value) return true;
      return /^[a-zA-Z0-9\s]+$/.test(value.trim());
    },

    /**
     * التحقق من اسم كامل (عربي أو إنجليزي)
     * @param {string} value - الاسم
     * @returns {boolean} صحة الاسم
     */
    fullName: function(value) {
      if (!value) return false;
      const trimmed = value.trim();
      if (trimmed.length < 3) return false;
      // يسمح بالعربي والإنجليزي والمسافات
      return /^[\u0600-\u06FFa-zA-Z\s]+$/.test(trimmed);
    },

    // =========================================================
    // التحقق من الأرقام
    // =========================================================

    /**
     * التحقق من أن القيمة رقم صحيح
     * @param {*} value - القيمة
     * @returns {boolean} صحة القيمة
     */
    isInteger: function(value) {
      return Number.isInteger(Number(value)) && !isNaN(value);
    },

    /**
     * التحقق من أن القيمة رقم موجب
     * @param {*} value - القيمة
     * @returns {boolean} صحة القيمة
     */
    isPositive: function(value) {
      const num = Number(value);
      return !isNaN(num) && num > 0;
    },

    /**
     * التحقق من أن القيمة رقم غير سالب
     * @param {*} value - القيمة
     * @returns {boolean} صحة القيمة
     */
    isNonNegative: function(value) {
      const num = Number(value);
      return !isNaN(num) && num >= 0;
    },

    // =========================================================
    // التحقق من الهواتف والبريد الإلكتروني
    // =========================================================

    /**
     * التحقق من رقم الهاتف الجزائري
     * @param {string} phone - رقم الهاتف
     * @returns {boolean} صحة رقم الهاتف
     */
    phone: function(phone) {
      if (!phone) return false;
      const normalized = normalizePhone(phone);
      return /^(05|06|07)[0-9]{8}$/.test(normalized);
    },

    /**
     * التحقق من رقم الهاتف (اختياري)
     * @param {string} phone - رقم الهاتف
     * @returns {boolean} صحة رقم الهاتف أو فارغ
     */
    phoneOptional: function(phone) {
      if (!phone) return true;
      return this.phone(phone);
    },

    /**
     * التحقق من البريد الإلكتروني
     * @param {string} email - البريد الإلكتروني
     * @returns {boolean} صحة البريد الإلكتروني
     */
    email: function(email) {
      if (!email) return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * التحقق من البريد الإلكتروني (اختياري)
     * @param {string} email - البريد الإلكتروني
     * @returns {boolean} صحة البريد الإلكتروني أو فارغ
     */
    emailOptional: function(email) {
      if (!email) return true;
      return this.email(email);
    },

    // =========================================================
    // التحقق من كلمة المرور
    // =========================================================

    /**
     * التحقق من كلمة المرور (6 أحرف على الأقل)
     * @param {string} password - كلمة المرور
     * @returns {boolean} صحة كلمة المرور
     */
    password: function(password) {
      return String(password || '').length >= 6;
    },

    /**
     * التحقق من كلمة المرور القوية (8 أحرف، حروف كبيرة وصغيرة، أرقام، رموز)
     * @param {string} password - كلمة المرور
     * @returns {boolean} صحة كلمة المرور
     */
    strongPassword: function(password) {
      const pwd = String(password || '');
      return pwd.length >= 8 &&
             /[A-Z]/.test(pwd) &&
             /[a-z]/.test(pwd) &&
             /[0-9]/.test(pwd) &&
             /[!@#$%^&*]/.test(pwd);
    },

    /**
     * الحصول على متطلبات كلمة المرور
     * @param {string} password - كلمة المرور
     * @returns {Object} حالة كل متطلب
     */
    getPasswordRequirements: function(password) {
      const pwd = String(password || '');
      return {
        length: pwd.length >= 8,
        uppercase: /[A-Z]/.test(pwd),
        lowercase: /[a-z]/.test(pwd),
        number: /[0-9]/.test(pwd),
        special: /[!@#$%^&*]/.test(pwd),
        all: pwd.length >= 8 &&
             /[A-Z]/.test(pwd) &&
             /[a-z]/.test(pwd) &&
             /[0-9]/.test(pwd) &&
             /[!@#$%^&*]/.test(pwd),
      };
    },

    // =========================================================
    // التحقق من التواريخ والأوقات
    // =========================================================

    /**
     * التحقق من التاريخ بصيغة YYYY-MM-DD
     * @param {string} date - التاريخ
     * @returns {boolean} صحة التاريخ
     */
    date: function(date) {
      if (!date) return false;
      const parts = String(date).split('-').map(Number);
      if (parts.length !== 3) return false;
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return !isNaN(d.getTime()) &&
             d.getFullYear() === parts[0] &&
             d.getMonth() === parts[1] - 1 &&
             d.getDate() === parts[2];
    },

    /**
     * التحقق من التاريخ (اختياري)
     * @param {string} date - التاريخ
     * @returns {boolean} صحة التاريخ أو فارغ
     */
    dateOptional: function(date) {
      if (!date) return true;
      return this.date(date);
    },

    /**
     * التحقق من أن التاريخ ليس في الماضي
     * @param {string} date - التاريخ بصيغة YYYY-MM-DD
     * @returns {boolean} التاريخ في المستقبل أو اليوم
     */
    isFutureOrToday: function(date) {
      if (!this.date(date)) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(date + 'T00:00:00');
      return d >= today;
    },

    /**
     * التحقق من الوقت بصيغة HH:MM
     * @param {string} time - الوقت
     * @returns {boolean} صحة الوقت
     */
    time: function(time) {
      if (!time) return false;
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
    },

    /**
     * التحقق من الوقت (اختياري)
     * @param {string} time - الوقت
     * @returns {boolean} صحة الوقت أو فارغ
     */
    timeOptional: function(time) {
      if (!time) return true;
      return this.time(time);
    },

    /**
     * التحقق من أن الوقت ضمن ساعات العمل
     * @param {string} time - الوقت بصيغة HH:MM
     * @param {string} start - وقت البداية
     * @param {string} end - وقت النهاية
     * @returns {boolean} الوقت ضمن النطاق
     */
    isWithinWorkingHours: function(time, start, end) {
      if (!this.time(time) || !this.time(start) || !this.time(end)) return false;
      const t = this.timeToMinutes(time);
      const s = this.timeToMinutes(start);
      const e = this.timeToMinutes(end);
      return t !== null && s !== null && e !== null && t >= s && t <= e;
    },

    /**
     * تحويل الوقت إلى دقائق (مساعد)
     * @param {string} value - الوقت بصيغة HH:MM
     * @returns {number|null} عدد الدقائق
     */
    timeToMinutes: function(value) {
      const parts = String(value || '').split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      return parts[0] * 60 + parts[1];
    },

    // =========================================================
    // التحقق من العمر
    // =========================================================

    /**
     * التحقق من العمر بناءً على تاريخ الميلاد
     * @param {string} birthDate - تاريخ الميلاد بصيغة YYYY-MM-DD
     * @param {number} minAge - الحد الأدنى للعمر
     * @param {number} maxAge - الحد الأقصى للعمر
     * @returns {boolean} صحة العمر
     */
    age: function(birthDate, minAge, maxAge) {
      if (!this.date(birthDate)) return false;
      const today = new Date();
      const birth = new Date(birthDate + 'T00:00:00');
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (minAge !== undefined && age < minAge) return false;
      if (maxAge !== undefined && age > maxAge) return false;
      return true;
    },

    /**
     * التحقق من أن العمر بين 18 و 120 سنة
     * @param {string} birthDate - تاريخ الميلاد
     * @returns {boolean} صحة العمر
     */
    adultAge: function(birthDate) {
      return this.age(birthDate, 18, 120);
    },

    // =========================================================
    // التحقق من المعرفات الوطنية
    // =========================================================

    /**
     * التحقق من رقم التعريف الوطني (12 رقم مع خوارزمية Luhn)
     * @param {string} value - رقم التعريف الوطني
     * @returns {Object} { valid: boolean, message: string }
     */
    validateNationalId: function(value) {
      if (!value || value.trim().length === 0) {
        return { valid: true, message: 'اختياري' };
      }

      const clean = String(value).replace(/\s/g, '');
      
      // يجب أن يتكون من 12 رقم
      if (!/^\d{12}$/.test(clean)) {
        return { valid: false, message: 'رقم التعريف الوطني يجب أن يتكون من 12 رقم.' };
      }

      // يجب أن يبدأ بـ 1 أو 2
      const firstDigit = clean.charAt(0);
      if (!['1', '2'].includes(firstDigit)) {
        return { valid: false, message: 'رقم التعريف الوطني غير صحيح.' };
      }

      // التحقق باستخدام خوارزمية Luhn
      if (!this.luhnCheck(clean)) {
        return { valid: false, message: 'رقم التعريف الوطني غير صالح.' };
      }

      return { valid: true };
    },

    /**
     * خوارزمية Luhn للتحقق من صحة الأرقام
     * @param {string} value - الرقم المراد التحقق منه
     * @returns {boolean} صحة الرقم
     */
    luhnCheck: function(value) {
      let sum = 0;
      let alternate = false;

      for (let i = value.length - 1; i >= 0; i--) {
        let n = parseInt(value.charAt(i), 10);
        if (alternate) {
          n *= 2;
          if (n > 9) {
            n = (n % 10) + 1;
          }
        }
        sum += n;
        alternate = !alternate;
      }

      return (sum % 10) === 0;
    },

    // =========================================================
    // التحقق من الأسعار والمبالغ
    // =========================================================

    /**
     * التحقق من السعر (رقم غير سالب)
     * @param {*} value - السعر
     * @returns {boolean} صحة السعر
     */
    price: function(value) {
      const num = Number(value);
      return !isNaN(num) && num >= 0;
    },

    /**
     * التحقق من المدة (بين 5 و 480 دقيقة)
     * @param {*} value - المدة
     * @returns {boolean} صحة المدة
     */
    duration: function(value) {
      const num = Number(value);
      return !isNaN(num) && num >= 5 && num <= 480;
    },

    // =========================================================
    // التحقق من الكائنات
    // =========================================================

    /**
     * التحقق من كائن حسب المخطط
     * @param {Object} data - البيانات المراد التحقق منها
     * @param {Object} schema - مخطط التحقق
     * @returns {Object} { valid: boolean, errors: Object }
     */
    validate: function(data, schema) {
      const errors = {};
      
      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        
        // التحقق من المطلوب
        if (rules.required && !this.required(value)) {
          errors[field] = rules.message || 'هذا الحقل مطلوب';
          continue;
        }
        
        // إذا كانت القيمة فارغة وليس مطلوباً، تخطي التحقق
        if (!rules.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // التحقق حسب النوع
        if (rules.type) {
          const result = this.validateType(value, rules.type);
          if (!result.valid) {
            errors[field] = result.message || rules.message || 'قيمة غير صحيحة';
          }
        }

        // التحقق من الحد الأدنى
        if (rules.min !== undefined && Number(value) < rules.min) {
          errors[field] = rules.message || 'القيمة يجب أن تكون ' + rules.min + ' على الأقل';
        }

        // التحقق من الحد الأقصى
        if (rules.max !== undefined && Number(value) > rules.max) {
          errors[field] = rules.message || 'القيمة يجب أن تكون ' + rules.max + ' كحد أقصى';
        }

        // التحقق من النمط
        if (rules.pattern && !rules.pattern.test(value)) {
          errors[field] = rules.message || rules.patternMessage || 'القيمة غير صحيحة';
        }

        // التحقق من المدة
        if (rules.type === 'duration' && !this.duration(value)) {
          errors[field] = rules.message || 'المدة يجب أن تكون بين 5 و 480 دقيقة';
        }

        // التحقق من السعر
        if (rules.type === 'price' && !this.price(value)) {
          errors[field] = rules.message || 'السعر غير صحيح';
        }
      }
      
      return {
        valid: Object.keys(errors).length === 0,
        errors: errors
      };
    },

    /**
     * التحقق من نوع القيمة
     * @param {*} value - القيمة
     * @param {string} type - النوع
     * @returns {Object} { valid: boolean, message: string }
     */
    validateType: function(value, type) {
      switch (type) {
        case 'phone':
          return { valid: this.phone(value), message: 'رقم الهاتف غير صحيح' };
        case 'phoneOptional':
          return { valid: this.phoneOptional(value), message: 'رقم الهاتف غير صحيح' };
        case 'email':
          return { valid: this.email(value), message: 'البريد الإلكتروني غير صحيح' };
        case 'emailOptional':
          return { valid: this.emailOptional(value), message: 'البريد الإلكتروني غير صحيح' };
        case 'password':
          return { valid: this.password(value), message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
        case 'strongPassword':
          return { valid: this.strongPassword(value), message: 'كلمة المرور ضعيفة' };
        case 'fullName':
          return { valid: this.fullName(value), message: 'الاسم يجب أن يكون 3 أحرف على الأقل' };
        case 'date':
          return { valid: this.date(value), message: 'التاريخ غير صحيح' };
        case 'dateOptional':
          return { valid: this.dateOptional(value), message: 'التاريخ غير صحيح' };
        case 'time':
          return { valid: this.time(value), message: 'الوقت غير صحيح' };
        case 'timeOptional':
          return { valid: this.timeOptional(value), message: 'الوقت غير صحيح' };
        case 'integer':
          return { valid: this.isInteger(value), message: 'يجب أن يكون رقم صحيح' };
        case 'positive':
          return { valid: this.isPositive(value), message: 'يجب أن يكون رقم موجب' };
        case 'nonNegative':
          return { valid: this.isNonNegative(value), message: 'يجب أن يكون رقم غير سالب' };
        case 'duration':
          return { valid: this.duration(value), message: 'المدة بين 5 و 480 دقيقة' };
        case 'price':
          return { valid: this.price(value), message: 'السعر غير صحيح' };
        case 'arabic':
          return { valid: this.isArabic(value), message: 'يجب أن يحتوي على أحرف عربية فقط' };
        case 'english':
          return { valid: this.isEnglish(value), message: 'يجب أن يحتوي على أحرف إنجليزية فقط' };
        case 'alphanumeric':
          return { valid: this.isAlphanumeric(value), message: 'يجب أن يحتوي على أحرف وأرقام فقط' };
        default:
          return { valid: true };
      }
    },

    // =========================================================
    // مخططات التحقق المدمجة
    // =========================================================

    schemas: {
      // طبيب
      doctor: {
        fullName: { required: true, type: 'fullName' },
        phone: { required: true, type: 'phone' },
        email: { type: 'emailOptional' },
        password: { required: true, type: 'password' },
        specialty: { required: true },
        wilaya: { required: true },
      },
      
      // مريض
      patient: {
        fullName: { required: true, type: 'fullName' },
        phone: { required: true, type: 'phone' },
        email: { type: 'emailOptional' },
        password: { required: true, type: 'password' },
        birthDate: { type: 'dateOptional' },
        gender: { required: true },
      },
      
      // سكرتير
      secretary: {
        fullName: { required: true, type: 'fullName' },
        phone: { required: true, type: 'phone' },
        email: { type: 'emailOptional' },
        password: { required: true, type: 'password' },
      },
      
      // موعد
      appointment: {
        doctor_id: { required: true },
        patient_id: { required: true },
        service_id: { required: true },
        date: { required: true, type: 'date' },
        time: { required: true, type: 'time' },
      },
      
      // خدمة طبية
      service: {
        name: { required: true },
        price: { required: true, type: 'price' },
        duration: { required: true, type: 'duration' },
      },

      // تسجيل الدخول
      login: {
        identifier: { required: true },
        password: { required: true },
      },

      // تغيير كلمة المرور
      changePassword: {
        currentPassword: { required: true },
        newPassword: { required: true, type: 'password' },
        confirmPassword: { required: true },
      },

      // حجز لشخص آخر
      proxyBooking: {
        firstName: { required: true, type: 'fullName' },
        lastName: { required: true, type: 'fullName' },
        birthDate: { required: true, type: 'date' },
        nationalId: { type: 'alphanumeric' },
      },
    },

    /**
     * التحقق من بيانات تسجيل الدخول
     * @param {Object} data - بيانات تسجيل الدخول
     * @returns {Object} نتيجة التحقق
     */
    validateLogin: function(data) {
      return this.validate(data, this.schemas.login);
    },

    /**
     * التحقق من بيانات تسجيل مريض
     * @param {Object} data - بيانات المريض
     * @returns {Object} نتيجة التحقق
     */
    validatePatient: function(data) {
      return this.validate(data, this.schemas.patient);
    },

    /**
     * التحقق من بيانات طبيب
     * @param {Object} data - بيانات الطبيب
     * @returns {Object} نتيجة التحقق
     */
    validateDoctor: function(data) {
      return this.validate(data, this.schemas.doctor);
    },

    /**
     * التحقق من بيانات سكرتير
     * @param {Object} data - بيانات السكرتير
     * @returns {Object} نتيجة التحقق
     */
    validateSecretary: function(data) {
      return this.validate(data, this.schemas.secretary);
    },

    /**
     * التحقق من بيانات موعد
     * @param {Object} data - بيانات الموعد
     * @returns {Object} نتيجة التحقق
     */
    validateAppointment: function(data) {
      return this.validate(data, this.schemas.appointment);
    },

    /**
     * التحقق من بيانات خدمة
     * @param {Object} data - بيانات الخدمة
     * @returns {Object} نتيجة التحقق
     */
    validateService: function(data) {
      return this.validate(data, this.schemas.service);
    },

    /**
     * التحقق من بيانات حجز لشخص آخر
     * @param {Object} data - بيانات الحجز
     * @returns {Object} نتيجة التحقق
     */
    validateProxyBooking: function(data) {
      return this.validate(data, this.schemas.proxyBooking);
    },
  };

  // ===== تصدير للاستخدام =====
  window.MonMedecinValidators = Validators;

  // ===== توافق مع الإصدارات القديمة =====
  window.Validators = Validators;

  console.log('✅ MonMedecinValidators loaded');

})();