// =========================================================
// MON MÉDECIN - HELPERS (VERSION UNIFIÉE)
// =========================================================

(function() {
  'use strict';

  // الحصول على الثوابت
  const Constants = window.MonMedecinConstants || {};
  const STORAGE_KEYS = Constants.STORAGE_KEYS || {};

  const Helpers = {
    // =========================================================
    // التخزين (Storage)
    // =========================================================

    /**
     * قراءة JSON من التخزين
     * @param {Storage} storage - localStorage أو sessionStorage
     * @param {string} key - مفتاح التخزين
     * @param {*} fallback - قيمة افتراضية في حال عدم وجود البيانات
     * @returns {*} البيانات المحولة من JSON
     */
    readJSON: function(storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot read', key, error);
        return fallback;
      }
    },

    /**
     * كتابة JSON إلى التخزين
     * @param {Storage} storage - localStorage أو sessionStorage
     * @param {string} key - مفتاح التخزين
     * @param {*} value - القيمة المراد تخزينها
     * @returns {boolean} نجاح العملية
     */
    writeJSON: function(storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot write', key, error);
        return false;
      }
    },

    /**
     * حذف عنصر من التخزين
     * @param {Storage} storage - localStorage أو sessionStorage
     * @param {string} key - مفتاح التخزين
     * @returns {boolean} نجاح العملية
     */
    removeStorage: function(storage, key) {
      try {
        storage.removeItem(key);
        return true;
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot remove', key, error);
        return false;
      }
    },

    /**
     * مسح جميع مفاتيح التخزين التي تبدأ ببادئة معينة
     * @param {Storage} storage - localStorage أو sessionStorage
     * @param {string} prefix - البادئة
     */
    clearByPrefix: function(storage, prefix) {
      try {
        const keys = Object.keys(storage);
        keys.forEach(function(key) {
          if (key.startsWith(prefix)) {
            storage.removeItem(key);
          }
        });
        return true;
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot clear by prefix', prefix, error);
        return false;
      }
    },

    // =========================================================
    // النصوص (Strings)
    // =========================================================

    /**
     * تحويل النص إلى HTML آمن
     * @param {*} value - النص المراد تنظيفه
     * @returns {string} النص بعد تنظيفه من HTML
     */
    escapeHTML: function(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * تطبيع النص للبحث (إزالة التشكيل والهمزات)
     * @param {string} value - النص المراد تطبيعه
     * @returns {string} النص بعد التطبيع
     */
    normalizeText: function(value) {
      return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    },

    /**
     * اختصار النص إذا كان طويلاً
     * @param {string} text - النص المراد اختصاره
     * @param {number} maxLength - الحد الأقصى للطول
     * @param {string} suffix - النهاية المضافة للاختصار
     * @returns {string} النص المختصر
     */
    truncate: function(text, maxLength, suffix) {
      suffix = suffix || '...';
      text = String(text || '');
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - suffix.length) + suffix;
    },

    /**
     * تحويل النص إلى تنسيق URL صديق
     * @param {string} text - النص المراد تحويله
     * @returns {string} النص بصيغة URL
     */
    slugify: function(text) {
      return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[\s]+/g, '-')
        .replace(/[^\w\-]/g, '')
        .replace(/\-\-+/g, '-');
    },

    // =========================================================
    // الأرقام والتنسيق (Numbers & Formatting)
    // =========================================================

    /**
     * تنسيق السعر بالدينار الجزائري
     * @param {number} value - القيمة المراد تنسيقها
     * @returns {string} السعر المنسق
     */
    formatPrice: function(value) {
      try {
        return new Intl.NumberFormat('fr-DZ', {
          style: 'currency',
          currency: 'DZD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(value) || 0);
      } catch (error) {
        return String(Number(value) || 0) + ' دج';
      }
    },

    /**
     * تنسيق التاريخ
     * @param {string|Date} value - التاريخ المراد تنسيقه
     * @param {string} format - صيغة التنسيق (full, short, time)
     * @returns {string} التاريخ المنسق
     */
    formatDate: function(value, format) {
      if (!value) return '—';
      
      let date;
      if (typeof value === 'string') {
        // محاولة تحويل YYYY-MM-DD إلى Date
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = new Date(value + 'T12:00:00');
        } else {
          date = new Date(value);
        }
      } else if (value instanceof Date) {
        date = value;
      } else {
        return String(value);
      }

      if (isNaN(date.getTime())) return String(value);

      try {
        const options = {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        };

        if (format === 'short') {
          options.month = 'short';
        }

        if (format === 'time') {
          return new Intl.DateTimeFormat('ar-DZ', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(date);
        }

        if (format === 'full') {
          options.weekday = 'long';
        }

        return new Intl.DateTimeFormat('ar-DZ', options).format(date);
      } catch (error) {
        return String(value);
      }
    },

    /**
     * تنسيق الوقت
     * @param {string} value - الوقت بصيغة HH:MM
     * @returns {string} الوقت المنسق
     */
    formatTime: function(value) {
      if (!value) return '—';
      const parts = String(value).split(':');
      if (parts.length < 2) return value;
      return `${parts[0]}:${parts[1]}`;
    },

    /**
     * حساب الوقت المنقضي (منذ)
     * @param {string|Date} value - التاريخ
     * @returns {string} النص المعبر عن الوقت المنقضي
     */
    timeAgo: function(value) {
      if (!value) return '—';
      
      let date;
      if (typeof value === 'string') {
        date = new Date(value);
      } else if (value instanceof Date) {
        date = value;
      } else {
        return '—';
      }

      if (isNaN(date.getTime())) return '—';

      const now = new Date();
      const diff = Math.floor((now - date) / 1000);

      if (diff < 60) return 'الآن';
      if (diff < 3600) return Math.floor(diff / 60) + ' دقيقة';
      if (diff < 86400) return Math.floor(diff / 3600) + ' ساعة';
      if (diff < 604800) return Math.floor(diff / 86400) + ' يوم';
      if (diff < 2592000) return Math.floor(diff / 604800) + ' أسبوع';
      if (diff < 31536000) return Math.floor(diff / 2592000) + ' شهر';
      return Math.floor(diff / 31536000) + ' سنة';
    },

    /**
     * تنسيق رقم الهاتف الجزائري
     * @param {string} phone - رقم الهاتف
     * @returns {string} رقم الهاتف المنسق
     */
    formatPhone: function(phone) {
      const normalized = this.normalizePhone(phone);
      if (!normalized) return phone;
      if (normalized.length === 10) {
        return normalized.slice(0, 2) + ' ' + 
               normalized.slice(2, 4) + ' ' + 
               normalized.slice(4, 6) + ' ' + 
               normalized.slice(6, 8) + ' ' + 
               normalized.slice(8, 10);
      }
      return phone;
    },

    // =========================================================
    // المعرفات (IDs)
    // =========================================================

    /**
     * إنشاء معرف فريد
     * @param {string} prefix - بادئة المعرف
     * @returns {string} المعرف الفريد
     */
    generateId: function(prefix) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 7).toUpperCase();
      const id = prefix ? prefix + '-' : '';
      return id + timestamp + '-' + random;
    },

    /**
     * الحصول على معرف السجل بغض النظر عن الحقل المستخدم
     * @param {Object} record - السجل
     * @returns {string|null} المعرف
     */
    getRecordId: function(record) {
      if (!record || typeof record !== 'object') return null;
      return record.id ||
             record.user_id ||
             record.admin_id ||
             record.doctor_id ||
             record.secretary_id ||
             record.patient_id ||
             record.appointment_id ||
             record.service_id ||
             null;
    },

    /**
     * الحصول على معرف الطبيب من السجل
     * @param {Object} record - السجل
     * @returns {string|null} معرف الطبيب
     */
    getDoctorId: function(record) {
      if (!record || typeof record !== 'object') return null;
      return record.doctor_id || record.doctorId || null;
    },

    /**
     * الحصول على معرف المريض من السجل
     * @param {Object} record - السجل
     * @returns {string|null} معرف المريض
     */
    getPatientId: function(record) {
      if (!record || typeof record !== 'object') return null;
      return record.patient_id || record.patientId || null;
    },

    // =========================================================
    // المصفوفات (Arrays)
    // =========================================================

    /**
     * التأكد من أن القيمة هي مصفوفة
     * @param {*} value - القيمة المراد التحقق منها
     * @returns {Array} مصفوفة
     */
    ensureArray: function(value) {
      return Array.isArray(value) ? value : [];
    },

    /**
     * إزالة التكرار من المصفوفة حسب معرف
     * @param {Array} array - المصفوفة
     * @param {string} idField - حقل المعرف
     * @returns {Array} مصفوفة بدون تكرار
     */
    uniqueBy: function(array, idField) {
      const seen = new Set();
      return array.filter(function(item) {
        const id = item[idField] || item.id;
        if (seen.has(String(id))) return false;
        seen.add(String(id));
        return true;
      });
    },

    /**
     * تقسيم المصفوفة إلى مجموعات
     * @param {Array} array - المصفوفة
     * @param {number} size - حجم المجموعة
     * @returns {Array} مصفوفة من المجموعات
     */
    chunk: function(array, size) {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    },

    // =========================================================
    // الوقت والتاريخ (Time & Date)
    // =========================================================

    /**
     * تحويل الوقت من HH:MM إلى دقائق
     * @param {string} value - الوقت بصيغة HH:MM
     * @returns {number|null} عدد الدقائق
     */
    timeToMinutes: function(value) {
      const parts = String(value || '').split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      return parts[0] * 60 + parts[1];
    },

    /**
     * تحويل الدقائق إلى وقت HH:MM
     * @param {number} minutes - عدد الدقائق
     * @returns {string} الوقت بصيغة HH:MM
     */
    minutesToTime: function(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
    },

    /**
     * الحصول على تاريخ اليوم بصيغة YYYY-MM-DD
     * @returns {string} تاريخ اليوم
     */
    getToday: function() {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    },

    /**
     * الحصول على تاريخ الغد بصيغة YYYY-MM-DD
     * @returns {string} تاريخ الغد
     */
    getTomorrow: function() {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    },

    /**
     * التحقق من أن التاريخ صحيح
     * @param {string} value - التاريخ بصيغة YYYY-MM-DD
     * @returns {boolean} صحة التاريخ
     */
    isValidDate: function(value) {
      if (!value) return false;
      const parts = String(value).split('-').map(Number);
      if (parts.length !== 3) return false;
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return !isNaN(date.getTime()) &&
             date.getFullYear() === parts[0] &&
             date.getMonth() === parts[1] - 1 &&
             date.getDate() === parts[2];
    },

    /**
     * التحقق من أن الوقت صحيح
     * @param {string} value - الوقت بصيغة HH:MM
     * @returns {boolean} صحة الوقت
     */
    isValidTime: function(value) {
      if (!value) return false;
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
    },

    // =========================================================
    // الأرقام (Numbers)
    // =========================================================

    /**
     * تطبيع رقم الهاتف
     * @param {string} phone - رقم الهاتف
     * @returns {string} رقم الهاتف بعد التطبيع
     */
    normalizePhone: function(phone) {
      let value = String(phone || '')
        .replace(/\s+/g, '')
        .replace(/-/g, '')
        .trim();

      // تحويل من +213 إلى 0
      if (value.startsWith('+213')) {
        value = '0' + value.slice(4);
      } else if (value.startsWith('213') && value.length >= 12) {
        value = '0' + value.slice(3);
      }

      return value;
    },

    /**
     * تطبيع البريد الإلكتروني
     * @param {string} email - البريد الإلكتروني
     * @returns {string} البريد الإلكتروني بعد التطبيع
     */
    normalizeEmail: function(email) {
      return String(email || '').trim().toLowerCase();
    },

    /**
     * التحقق من صحة رقم الهاتف الجزائري
     * @param {string} phone - رقم الهاتف
     * @returns {boolean} صحة رقم الهاتف
     */
    isValidPhone: function(phone) {
      const normalized = this.normalizePhone(phone);
      return /^0[5-7][0-9]{8}$/.test(normalized);
    },

    /**
     * التحقق من صحة البريد الإلكتروني
     * @param {string} email - البريد الإلكتروني
     * @returns {boolean} صحة البريد الإلكتروني
     */
    isValidEmail: function(email) {
      if (!email) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // =========================================================
    // الحسابات (Accounts)
    // =========================================================

    /**
     * التحقق من أن الحساب نشط
     * @param {Object} account - الحساب
     * @returns {boolean} نشاط الحساب
     */
    isAccountActive: function(account) {
      if (!account) return false;
      if (account.active === false) return false;
      const status = String(account.status || '').trim().toLowerCase();
      return !['inactive', 'disabled', 'blocked', 'suspended', 'deleted'].includes(status);
    },

    /**
     * التحقق من أن الحساب معتمد (للأطباء)
     * @param {Object} account - الحساب
     * @returns {boolean} اعتماد الحساب
     */
    isAccountApproved: function(account) {
      if (!account) return false;
      if (account.approved === false) return false;
      const status = String(account.status || '').trim().toLowerCase();
      return !['rejected', 'pending'].includes(status);
    },

    // =========================================================
    // التقييم (Rating)
    // =========================================================

    /**
     * تحويل التقييم إلى نجوم
     * @param {number} rating - التقييم من 0 إلى 5
     * @returns {string} نجوم
     */
    getStars: function(rating) {
      const num = Math.max(0, Math.min(5, Number(rating) || 0));
      const full = Math.floor(num);
      const half = num - full >= 0.5;
      let stars = '';
      for (let i = 0; i < full; i++) stars += '★';
      if (half) stars += '½';
      while (stars.length < 5) stars += '☆';
      return stars;
    },

    /**
     * الحصول على نسبة التقييم
     * @param {number} rating - التقييم من 0 إلى 5
     * @returns {number} النسبة المئوية
     */
    getRatingPercent: function(rating) {
      return Math.round((Number(rating) || 0) / 5 * 100);
    },

    // =========================================================
    // الحالة (Status)
    // =========================================================

    /**
     * الحصول على تسمية الحالة
     * @param {string} status - الحالة
     * @returns {string} التسمية
     */
    getStatusLabel: function(status) {
      const labels = {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        arrived: 'وصل',
        in_progress: 'جاري الفحص',
        completed: 'مكتمل',
        rejected: 'مرفوض',
        cancelled: 'ملغى',
        no_show: 'لم يحضر',
        active: 'نشط',
        inactive: 'متوقف',
        approved: 'معتمد',
        unapproved: 'غير معتمد',
      };
      return labels[status] || status || 'غير معروف';
    },

    /**
     * الحصول على كلاس الحالة
     * @param {string} status - الحالة
     * @returns {string} الكلاس
     */
    getStatusClass: function(status) {
      const classes = {
        pending: 'is-pending',
        confirmed: 'is-confirmed',
        arrived: 'is-arrived',
        in_progress: 'is-progress',
        completed: 'is-completed',
        rejected: 'is-rejected',
        cancelled: 'is-cancelled',
        no_show: 'is-no-show',
        active: 'is-active',
        inactive: 'is-inactive',
        approved: 'is-approved',
        unapproved: 'is-unapproved',
      };
      return classes[status] || 'is-default';
    },

    // =========================================================
    // التنقل (Navigation)
    // =========================================================

    /**
     * الحصول على المسار الرئيسي حسب الدور
     * @param {string} role - الدور
     * @returns {string} المسار الرئيسي
     */
    getRoleHome: function(role) {
      const homes = {
        admin: '/admin/dashboard',
        doctor: '/doctor/dashboard',
        secretary: '/secretary/dashboard',
        patient: '/patient/home',
      };
      return homes[role] || '/login';
    },

    /**
     * الحصول على اسم الدور بالعربية
     * @param {string} role - الدور
     * @returns {string} اسم الدور
     */
    getRoleLabel: function(role) {
      const labels = {
        admin: 'مدير',
        doctor: 'طبيب',
        secretary: 'سكرتير',
        patient: 'مريض',
      };
      return labels[role] || role || 'مستخدم';
    },

    // =========================================================
    // النوافذ (Windows)
    // =========================================================

    /**
     * فتح نافذة منبثقة للتأكيد
     * @param {string} message - رسالة التأكيد
     * @param {string} title - عنوان النافذة
     * @returns {boolean} تأكيد المستخدم
     */
    confirm: function(message, title) {
      if (title) {
        message = title + '\n\n' + message;
      }
      return window.confirm(message);
    },

    /**
     * عرض رسالة للمستخدم
     * @param {string} message - الرسالة
     * @param {string} type - نوع الرسالة (info, success, error, warning)
     */
    alert: function(message, type) {
      const prefix = {
        info: 'ℹ️ ',
        success: '✅ ',
        error: '❌ ',
        warning: '⚠️ ',
      };
      window.alert((prefix[type] || '') + message);
    },
  };

  // ===== تصدير للاستخدام =====
  window.MonMedecinHelpers = Helpers;

  // ===== توافق مع الإصدارات القديمة =====
  window.Helpers = Helpers;

  console.log('✅ MonMedecinHelpers loaded');

})();