// =========================================================
// MON MÉDECIN - CONSTANTS (VERSION API READY)
// =========================================================

(function() {
  'use strict';

  var Constants = {
    // ===== الإصدار =====
    VERSION: '2.0.0',
    API_VERSION: 'v1',

    // ===== إعدادات API =====
    API: {
      // 🔑 رابط الـ Backend على Render
      BASE_URL: 'https://monmedecin-api.onrender.com/api',
      
      TIMEOUT: 30000,
      USE_API: true, // 🔑 مفعل للاتصال بـ Render
      
      ENDPOINTS: {
        // ===== المصادقة =====
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        VERIFY_TOKEN: '/auth/verify',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        CHANGE_PASSWORD: '/auth/change-password',

        // ===== المستخدمون =====
        USERS: '/users',
        USER: '/users/:id',
        PROFILE: '/users/profile',
        
        DOCTORS: '/doctors',
        DOCTOR: '/doctors/:id',
        DOCTOR_APPOINTMENTS: '/doctors/:id/appointments',
        DOCTOR_SERVICES: '/doctors/:id/services',
        DOCTOR_SCHEDULE: '/doctors/:id/schedule',
        DOCTOR_STATS: '/doctors/:id/stats',
        
        PATIENTS: '/patients',
        PATIENT: '/patients/:id',
        PATIENT_APPOINTMENTS: '/patients/:id/appointments',
        
        SECRETARIES: '/secretaries',
        SECRETARY: '/secretaries/:id',
        SECRETARY_DOCTOR: '/secretaries/:id/doctor',

        // ===== المواعيد =====
        APPOINTMENTS: '/appointments',
        APPOINTMENT: '/appointments/:id',
        APPOINTMENT_STATUS: '/appointments/:id/status',
        APPOINTMENT_CANCEL: '/appointments/:id/cancel',
        APPOINTMENT_CONFIRM: '/appointments/:id/confirm',
        APPOINTMENT_ARRIVE: '/appointments/:id/arrive',
        APPOINTMENT_BY_DATE: '/appointments/date/:date',
        CHECK_CONFLICT: '/appointments/check-conflict',
        APPOINTMENTS_TODAY: '/appointments/today',
        APPOINTMENTS_UPCOMING: '/appointments/upcoming',

        // ===== الخدمات =====
        SERVICES: '/services',
        SERVICE: '/services/:id',

        // ===== الجداول =====
        SCHEDULES: '/schedules',
        SCHEDULE: '/schedules/:id',

        // ===== التخصصات =====
        SPECIALTIES: '/specialties',
        SPECIALTY: '/specialties/:id',

        // ===== الإشعارات =====
        NOTIFICATIONS: '/notifications',
        NOTIFICATION: '/notifications/:id',
        NOTIFICATIONS_READ: '/notifications/read-all',
        NOTIFICATION_READ: '/notifications/:id/read',

        // ===== الشكاوى =====
        COMPLAINTS: '/complaints',
        COMPLAINT: '/complaints/:id',
        COMPLAINT_RESOLVE: '/complaints/:id/resolve',
        COMPLAINT_REJECT: '/complaints/:id/reject',

        // ===== التقارير والإحصائيات =====
        REPORTS: '/reports',
        STATS: '/stats',
        DASHBOARD_STATS: '/stats/dashboard',
        APPOINTMENTS_STATS: '/stats/appointments',
        DOCTORS_STATS: '/stats/doctors',
        PATIENTS_STATS: '/stats/patients',
        REVENUE_STATS: '/stats/revenue',

        // ===== المفضلة =====
        FAVORITES: '/favorites',
        FAVORITE: '/favorites/:id',

        // ===== قائمة الانتظار =====
        QUEUE: '/queue',
        QUEUE_DOCTOR: '/queue/doctor/:doctorId',
        QUEUE_PATIENT: '/queue/patient/:patientId',
        QUEUE_STATUS: '/queue/:patientId/status',

        // ===== المحتوى =====
        CONTENT: '/content',
        CONTENT_SECTION: '/content/:section',

        // ===== الملفات =====
        UPLOAD: '/upload',
        UPLOAD_AVATAR: '/upload/avatar',
        
        // ===== العمولات =====
        COMMISSIONS: '/commissions',
        COMMISSION_STATS: '/commissions/stats',
        COMMISSION_SETTINGS: '/commissions/settings',
      }
    },

    // ===== مفاتيح التخزين الموحدة =====
    STORAGE_KEYS: {
      SESSION: 'monmedecin-session',
      TOKEN: 'monmedecin-token',
      REFRESH_TOKEN: 'monmedecin-refresh-token',
      THEME: 'monmedecin-theme',
      THEME_USER_CHOSEN: 'monmedecin-theme-user-chosen',
      
      USERS: 'monmedecin-users',
      ADMINS: 'monmedecin-admins',
      DOCTORS: 'monmedecin-doctors',
      PATIENTS: 'monmedecin-patients',
      SECRETARIES: 'monmedecin-secretaries',
      CURRENT_USER: 'monmedecin-current-user',

      APPOINTMENTS: 'monmedecin-appointments',
      SERVICES: 'monmedecin-doctor-services',
      SCHEDULES: 'monmedecin-doctor-schedules',
      NOTIFICATIONS: 'monmedecin-notifications',
      COMPLAINTS: 'monmedecin-complaints',
      CONTENT: 'monmedecin-content',
      SPECIALTIES: 'monmedecin-specialties',
      PROXY_BOOKINGS: 'monmedecin-proxy-bookings',
      CLEANUP_LOGS: 'monmedecin-cleanup-logs',
      FAVORITES_PREFIX: 'monmedecin-favorites-',
      LAST_BOOKING: 'monmedecin-last-booking',
      LAST_BOOKING_NUMBER: 'monmedecin-last-booking-number',
    },

    // ===== مفاتيح الجلسة المؤقتة =====
    SESSION_KEYS: {
      SELECTED_DOCTOR: 'monmedecin-selected-doctor',
      SELECTED_DOCTOR_ID: 'monmedecin-selected-doctor-id',
      SELECTED_SERVICE: 'monmedecin-selected-service',
      SELECTED_APPOINTMENT: 'monmedecin-selected-appointment',
      BOOKING_DOCTOR: 'monmedecin-booking-doctor',
      BOOKING_DATE: 'monmedecin-booking-date',
      BOOKING_TIME: 'monmedecin-booking-time',
      BOOKING_REASON: 'monmedecin-booking-reason',
      BOOKING_NOTES: 'monmedecin-booking-notes',
      BOOKING_BENEFICIARY: 'monmedecin-booking-beneficiary',
      RESET_REQUESTS: 'monmedecin-reset-requests',
    },

    // ===== أدوار المستخدم =====
    ROLES: {
      ADMIN: 'admin',
      DOCTOR: 'doctor',
      SECRETARY: 'secretary',
      PATIENT: 'patient'
    },

    // ===== حالات المواعيد =====
    APPOINTMENT_STATUS: {
      PENDING: 'pending',
      CONFIRMED: 'confirmed',
      ARRIVED: 'arrived',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      REJECTED: 'rejected',
      CANCELLED: 'cancelled',
      NO_SHOW: 'no_show'
    },

    // ===== حالات الدفع =====
    PAYMENT_STATUS: {
      UNPAID: 'unpaid',
      PAID: 'paid',
      REFUNDED: 'refunded',
      PENDING: 'pending'
    },

    // ===== صلاحيات السكرتير =====
    SECRETARY_PERMISSIONS: {
      APPOINTMENTS: 'appointments',
      PATIENTS: 'patients',
      SCHEDULE: 'schedule',
      SERVICES: 'services',
      DOCTOR_PROFILE: 'doctorProfile',
      FINANCIAL: 'financial'
    },

    // ===== أنواع الإشعارات =====
    NOTIFICATION_TYPES: {
      APPOINTMENT: 'appointment',
      REMINDER: 'reminder',
      SYSTEM: 'system',
      COMPLAINT: 'complaint',
      USER: 'user'
    },

    // ===== المسارات العامة =====
    PUBLIC_ROUTES: [
      '/splash',
      '/onboarding',
      '/welcome',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password'
    ],

    // ===== المسارات حسب الدور =====
    ROLE_HOMES: {
      admin: '/admin/dashboard',
      doctor: '/doctor/dashboard',
      secretary: '/secretary/dashboard',
      patient: '/patient/home'
    },

    // ===== أيام الأسبوع =====
    DAYS: [
      { key: 'saturday', label: 'السبت', index: 6 },
      { key: 'sunday', label: 'الأحد', index: 0 },
      { key: 'monday', label: 'الاثنين', index: 1 },
      { key: 'tuesday', label: 'الثلاثاء', index: 2 },
      { key: 'wednesday', label: 'الأربعاء', index: 3 },
      { key: 'thursday', label: 'الخميس', index: 4 },
      { key: 'friday', label: 'الجمعة', index: 5 }
    ],

    // ===== المدد المسموحة للمواعيد =====
    ALLOWED_DURATIONS: [10, 15, 20, 30, 45, 60, 90, 120],
    MIN_DURATION: 5,
    MAX_DURATION: 480,

    // ===== حدود كلمة المرور =====
    MIN_PASSWORD_LENGTH: 6,

    // ===== مدة صلاحية رمز إعادة التعيين =====
    RESET_TOKEN_EXPIRY: 3600000,

    // ===== الحد الأقصى للإشعارات =====
    MAX_NOTIFICATIONS: 500,

    // ===== عدد العناصر في الصفحة =====
    PAGE_SIZE: 12,

    // ===== رسائل الخطأ =====
    ERROR_MESSAGES: {
      NETWORK: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
      UNAUTHORIZED: 'جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.',
      FORBIDDEN: 'لا تملك صلاحية للوصول إلى هذه البيانات.',
      NOT_FOUND: 'البيانات المطلوبة غير موجودة.',
      SERVER_ERROR: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.',
      VALIDATION: 'يرجى التحقق من البيانات المدخلة.',
      DUPLICATE: 'هذه البيانات موجودة مسبقاً.',
      CONFLICT: 'هناك تعارض في البيانات.'
    },

    // ===== رسائل النجاح =====
    SUCCESS_MESSAGES: {
      LOGIN: 'تم تسجيل الدخول بنجاح.',
      LOGOUT: 'تم تسجيل الخروج بنجاح.',
      REGISTER: 'تم إنشاء الحساب بنجاح.',
      UPDATE: 'تم تحديث البيانات بنجاح.',
      DELETE: 'تم الحذف بنجاح.',
      APPOINTMENT_CREATED: 'تم إنشاء الموعد بنجاح.',
      APPOINTMENT_UPDATED: 'تم تحديث الموعد بنجاح.',
      APPOINTMENT_CANCELLED: 'تم إلغاء الموعد بنجاح.'
    },

    // ===== دوال مساعدة لتوليد المسارات =====
    getEndpoint: function(endpoint, params) {
      var url = this.API.ENDPOINTS[endpoint] || endpoint;
      if (params) {
        Object.keys(params).forEach(function(key) {
          url = url.replace(':' + key, params[key]);
        });
      }
      return url;
    },

    getFullUrl: function(endpoint, params) {
      var path = this.getEndpoint(endpoint, params);
      return this.API.BASE_URL + path;
    }
  };

  // ===== تصدير للاستخدام =====
  window.MonMedecinConstants = Constants;
  window.Constants = Constants;

  console.log('✅ MonMedecinConstants loaded (v' + Constants.VERSION + ' - API Ready)');
  console.log('🔗 API URL:', Constants.API.BASE_URL);

})();