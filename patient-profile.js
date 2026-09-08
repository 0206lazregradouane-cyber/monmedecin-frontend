/* =====================================================
   MON MÉDECIN
   PATIENT PROFILE - 100% COMPLETE
   ===================================================== */

(function() {
  'use strict';

  const PatientProfileScreen = {
    user: null,
    activeTab: 'profile',
    messageTimer: null,
    passwordVisible: false,
    newPasswordVisible: false,
    confirmPasswordVisible: false,
    editing: false,

    readJSON: function(storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN: Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function(storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN: Cannot write", key, error);
        return false;
      }
    },

    escapeHTML: function(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    getUser: function(state) {
      return state.patient || state.user || null;
    },

    getGenderLabel: function(gender) {
      const labels = {
        male: 'ذكر',
        female: 'أنثى',
        '': 'غير محدد'
      };
      return labels[gender] || 'غير محدد';
    },

    validateProfile: function(data) {
      const errors = {};
      if (!data.fullName || data.fullName.length < 3) {
        errors.fullName = 'أدخل الاسم الكامل (3 أحرف على الأقل).';
      }
      if (data.phone && !/^(05|06|07)[0-9]{8}$/.test(data.phone)) {
        errors.phone = 'رقم الهاتف غير صحيح.';
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'البريد الإلكتروني غير صحيح.';
      }
      return {
        valid: Object.keys(errors).length === 0,
        errors: errors
      };
    },

    saveUser: function(data, app) {
      const user = this.getUser(app.state);
      if (!user) return false;

      const updated = {
        ...user,
        fullName: data.fullName || user.fullName,
        name: data.fullName || user.name || user.fullName,
        phone: data.phone || user.phone,
        email: data.email || user.email,
        gender: data.gender || user.gender,
        birthDate: data.birthDate || user.birthDate,
        wilaya: data.wilaya || user.wilaya,
        commune: data.commune || user.commune,
        address: data.address || user.address,
        notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : user.notificationsEnabled,
        language: data.language || user.language || 'ar',
        updatedAt: new Date().toISOString()
      };

      app.state.patient = updated;
      app.state.user = updated;

      try {
        let patients = JSON.parse(localStorage.getItem('monmedecin-patients') || '[]');
        if (!Array.isArray(patients)) patients = [];
        const index = patients.findIndex(p => String(p.id) === String(updated.id));
        if (index >= 0) {
          patients[index] = updated;
        } else {
          patients.push(updated);
        }
        localStorage.setItem('monmedecin-patients', JSON.stringify(patients));

        const currentUser = JSON.parse(localStorage.getItem('monmedecin-current-user') || '{}');
        if (currentUser) {
          currentUser.account = updated;
          localStorage.setItem('monmedecin-current-user', JSON.stringify(currentUser));
        }

        localStorage.setItem('monmedecin-user', JSON.stringify(updated));

        return true;
      } catch (error) {
        console.warn('MON MÉDECIN: Cannot save user', error);
        return false;
      }
    },

    changePassword: function(currentPassword, newPassword, confirmPassword, app) {
      const user = this.getUser(app.state);
      if (!user) {
        this.showMessage('تعذر العثور على الحساب.', 'error');
        return false;
      }

      if (String(user.password || '') !== String(currentPassword || '')) {
        this.showMessage('كلمة المرور الحالية غير صحيحة.', 'error');
        return false;
      }

      if (String(newPassword || '').length < 8) {
        this.showMessage('كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل.', 'error');
        return false;
      }

      if (newPassword !== confirmPassword) {
        this.showMessage('كلمتا المرور غير متطابقتين.', 'error');
        return false;
      }

      if (newPassword === currentPassword) {
        this.showMessage('اختر كلمة مرور جديدة مختلفة عن الحالية.', 'error');
        return false;
      }

      const updated = {
        ...user,
        password: newPassword,
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let patients = JSON.parse(localStorage.getItem('monmedecin-patients') || '[]');
      if (!Array.isArray(patients)) patients = [];
      const index = patients.findIndex(p => String(p.id) === String(updated.id));
      if (index >= 0) {
        patients[index] = updated;
      } else {
        patients.push(updated);
      }
      localStorage.setItem('monmedecin-patients', JSON.stringify(patients));

      const currentUser = JSON.parse(localStorage.getItem('monmedecin-current-user') || '{}');
      if (currentUser) {
        currentUser.account = updated;
        localStorage.setItem('monmedecin-current-user', JSON.stringify(currentUser));
      }

      app.state.patient = updated;
      app.state.user = updated;

      this.showMessage('تم تغيير كلمة المرور بنجاح.', 'success');
      return true;
    },

    updatePreferences: function(data, app) {
      const user = this.getUser(app.state);
      if (!user) return false;

      const updated = {
        ...user,
        notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : user.notificationsEnabled,
        language: data.language || user.language || 'ar',
        updatedAt: new Date().toISOString()
      };

      let patients = JSON.parse(localStorage.getItem('monmedecin-patients') || '[]');
      if (!Array.isArray(patients)) patients = [];
      const index = patients.findIndex(p => String(p.id) === String(updated.id));
      if (index >= 0) {
        patients[index] = updated;
      } else {
        patients.push(updated);
      }
      localStorage.setItem('monmedecin-patients', JSON.stringify(patients));

      app.state.patient = updated;
      app.state.user = updated;

      if (data.language) {
        app.setLanguage(data.language);
      }

      this.showMessage('تم تحديث التفضيلات.', 'success');
      return true;
    },

    showMessage: function(message, type) {
      const element = document.getElementById('patientProfileMessage');
      if (!element) {
        if (type === 'error') alert('❌ ' + message);
        else if (type === 'success') alert('✅ ' + message);
        else alert('ℹ️ ' + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = 'patient-profile-message';
      element.classList.add(type === 'success' ? 'is-success' : type === 'info' ? 'is-info' : 'is-error');

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function() {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3500);
    },

    togglePassword: function(inputId, button) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.textContent = isPassword ? '🙈' : '👁';
    },

    render: function(state, app) {
      const user = this.getUser(state);
      this.user = user;

      const isMobile = state.deviceMode === 'mobile';
      const isDark = state.theme === 'dark';

      if (!user) {
        return this.renderNotLoggedIn(isMobile);
      }

      const fullName = user.fullName || user.name || 'مريض';
      const phone = user.phone || '';

      return `
        <main class="patient-profile ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="patient-profile__orb patient-profile__orb--blue"></div>
          <div class="patient-profile__orb patient-profile__orb--purple"></div>

          <header class="patient-profile__header">
            <button class="patient-profile__back" id="patientProfileBack" type="button" aria-label="رجوع">
              ←
            </button>
            <div class="patient-profile__header-copy">
              <strong>الملف الشخصي</strong>
              <span>حسابي</span>
            </div>
            <div class="patient-profile__header-actions">
              <button id="patientProfileNotifications" class="patient-profile__notification" type="button" aria-label="الإشعارات">
                🔔
              </button>
              <button id="patientProfileTheme" class="patient-profile__theme" type="button" aria-label="تغيير المظهر">
                ${isDark ? '☀' : '◐'}
              </button>
            </div>
          </header>

          <section class="patient-profile__container">

            <section class="patient-profile-hero glass">
              <div class="patient-profile-hero__avatar">
                ${this.escapeHTML(String(fullName).charAt(0))}
              </div>
              <div class="patient-profile-hero__identity">
                <span>حساب المريض</span>
                <h1>${this.escapeHTML(fullName)}</h1>
                <p dir="ltr">${this.escapeHTML(phone)}</p>
              </div>
            </section>

            <div class="patient-profile-tabs">
              <button class="patient-profile-tab ${this.activeTab === 'profile' ? 'is-active' : ''}" data-tab="profile" type="button">
                👤 الملف الشخصي
              </button>
              <button class="patient-profile-tab ${this.activeTab === 'security' ? 'is-active' : ''}" data-tab="security" type="button">
                🔒 الأمان
              </button>
              <button class="patient-profile-tab ${this.activeTab === 'preferences' ? 'is-active' : ''}" data-tab="preferences" type="button">
                ⚙ التفضيلات
              </button>
            </div>

            <div id="patientProfileMessage" class="patient-profile-message" hidden></div>

            <div class="patient-profile-tabs-content glass">
              <!-- Profile Tab -->
              <div class="patient-profile-tab-content ${this.activeTab === 'profile' ? 'is-active' : ''}" data-tab="profile">
                <div id="patientProfileView" ${this.editing ? 'hidden' : ''}>
                  <div class="patient-profile-row">
                    <span>الاسم الكامل</span>
                    <strong>${this.escapeHTML(user.fullName || user.name || '—')}</strong>
                  </div>
                  <div class="patient-profile-row">
                    <span>رقم الهاتف</span>
                    <strong dir="ltr">${this.escapeHTML(user.phone || '—')}</strong>
                  </div>
                  <div class="patient-profile-row">
                    <span>البريد الإلكتروني</span>
                    <strong dir="ltr">${this.escapeHTML(user.email || '—')}</strong>
                  </div>
                  <div class="patient-profile-row">
                    <span>الجنس</span>
                    <strong>${this.getGenderLabel(user.gender)}</strong>
                  </div>
                  <div class="patient-profile-row">
                    <span>تاريخ الميلاد</span>
                    <strong>${this.escapeHTML(user.birthDate || 'غير محدد')}</strong>
                  </div>
                  ${user.wilaya ? `<div class="patient-profile-row"><span>الولاية</span><strong>${this.escapeHTML(user.wilaya)}</strong></div>` : ''}
                  ${user.commune ? `<div class="patient-profile-row"><span>البلدية</span><strong>${this.escapeHTML(user.commune)}</strong></div>` : ''}
                  ${user.address ? `<div class="patient-profile-row"><span>العنوان</span><strong>${this.escapeHTML(user.address)}</strong></div>` : ''}
                  <div class="patient-profile-row">
                    <span>حالة الحساب</span>
                    <strong style="color: ${user.active !== false ? 'var(--color-success)' : 'var(--color-error)'}">${user.active !== false ? 'نشط' : 'متوقف'}</strong>
                  </div>
                  <button class="btn btn-secondary" id="patientProfileEdit" type="button">✏️ تعديل البيانات</button>
                </div>

                <form class="patient-profile-form" id="patientProfileForm" ${this.editing ? '' : 'hidden'}>
                  <label class="patient-profile-field">
                    <span>الاسم الكامل</span>
                    <input id="profileFullName" type="text" value="${this.escapeHTML(user.fullName || user.name || '')}" maxlength="100">
                  </label>
                  <label class="patient-profile-field">
                    <span>رقم الهاتف</span>
                    <input id="profilePhone" type="tel" maxlength="10" value="${this.escapeHTML(user.phone || '')}" dir="ltr">
                  </label>
                  <label class="patient-profile-field">
                    <span>البريد الإلكتروني</span>
                    <input id="profileEmail" type="email" value="${this.escapeHTML(user.email || '')}" dir="ltr">
                  </label>
                  <label class="patient-profile-field">
                    <span>الجنس</span>
                    <select id="profileGender">
                      <option value="">غير محدد</option>
                      <option value="male" ${user.gender === 'male' ? 'selected' : ''}>ذكر</option>
                      <option value="female" ${user.gender === 'female' ? 'selected' : ''}>أنثى</option>
                    </select>
                  </label>
                  <label class="patient-profile-field">
                    <span>تاريخ الميلاد</span>
                    <input id="profileBirthDate" type="date" value="${this.escapeHTML(user.birthDate || '')}">
                  </label>
                  <label class="patient-profile-field">
                    <span>الولاية</span>
                    <input id="profileWilaya" type="text" value="${this.escapeHTML(user.wilaya || '')}">
                  </label>
                  <label class="patient-profile-field">
                    <span>البلدية</span>
                    <input id="profileCommune" type="text" value="${this.escapeHTML(user.commune || '')}">
                  </label>
                  <label class="patient-profile-field">
                    <span>العنوان</span>
                    <input id="profileAddress" type="text" value="${this.escapeHTML(user.address || '')}">
                  </label>
                  <div class="patient-profile-error" id="profileError"></div>
                  <div class="patient-profile-form__actions">
                    <button class="btn btn-primary" type="submit">حفظ التغييرات</button>
                    <button class="btn btn-secondary" id="profileCancel" type="button">إلغاء</button>
                  </div>
                </form>
              </div>

              <!-- Security Tab -->
              <div class="patient-profile-tab-content ${this.activeTab === 'security' ? 'is-active' : ''}" data-tab="security">
                <div class="patient-profile-security">
                  <div class="patient-profile-security__header">
                    <span>🔒 الأمان</span>
                    <h3>تغيير كلمة المرور</h3>
                    <p>قم بتحديث كلمة المرور الخاصة بحسابك بانتظام للحفاظ على الأمان.</p>
                  </div>

                  <form id="patientProfileSecurityForm" class="patient-profile-form" novalidate>
                    <label class="patient-profile-field">
                      <span>كلمة المرور الحالية</span>
                      <div class="patient-profile-password-input">
                        <input id="profileCurrentPassword" type="password" autocomplete="current-password" placeholder="كلمة المرور الحالية" dir="ltr">
                        <button id="profileCurrentToggle" type="button">👁</button>
                      </div>
                    </label>
                    <label class="patient-profile-field">
                      <span>كلمة المرور الجديدة</span>
                      <div class="patient-profile-password-input">
                        <input id="profileNewPassword" type="password" autocomplete="new-password" placeholder="8 أحرف على الأقل" dir="ltr">
                        <button id="profileNewToggle" type="button">👁</button>
                      </div>
                    </label>
                    <label class="patient-profile-field">
                      <span>تأكيد كلمة المرور الجديدة</span>
                      <div class="patient-profile-password-input">
                        <input id="profileConfirmPassword" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور" dir="ltr">
                        <button id="profileConfirmToggle" type="button">👁</button>
                      </div>
                    </label>
                    <div class="patient-profile-error" id="profileSecurityError"></div>
                    <button class="btn btn-primary" type="submit">تغيير كلمة المرور</button>
                  </form>

                  <div class="patient-profile-security__info">
                    <span>💡</span>
                    <p>استخدم كلمة مرور قوية تحتوي على 8 أحرف على الأقل، وتشمل حروفاً كبيرة وصغيرة وأرقاماً ورموزاً خاصة.</p>
                  </div>
                </div>
              </div>

              <!-- Preferences Tab -->
              <div class="patient-profile-tab-content ${this.activeTab === 'preferences' ? 'is-active' : ''}" data-tab="preferences">
                <div class="patient-profile-preferences">
                  <div class="patient-profile-preferences__header">
                    <span>⚙ التفضيلات</span>
                    <h3>إعدادات التطبيق</h3>
                    <p>خصّص تجربتك في Mon Médecin حسب تفضيلاتك.</p>
                  </div>

                  <div class="patient-profile-preference-item">
                    <div>
                      <strong>المظهر</strong>
                      <small>${state.theme === 'dark' ? 'الوضع الداكن' : 'الوضع الفاتح'}</small>
                    </div>
                    <button id="profileThemeToggle" type="button">
                      <span>${state.theme === 'dark' ? '☀' : '◐'}</span>
                      <span>${state.theme === 'dark' ? 'فاتح' : 'داكن'}</span>
                    </button>
                  </div>

                  <div class="patient-profile-preference-item">
                    <div>
                      <strong>اللغة</strong>
                      <small>لغة واجهة التطبيق</small>
                    </div>
                    <select id="profileLanguage">
                      <option value="ar" ${state.language === 'ar' ? 'selected' : ''}>العربية</option>
                      <option value="fr" ${state.language === 'fr' ? 'selected' : ''}>Français</option>
                      <option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option>
                    </select>
                  </div>

                  <div class="patient-profile-preference-item">
                    <div>
                      <strong>الإشعارات</strong>
                      <small>تنبيهات المواعيد والتذكيرات</small>
                    </div>
                    <label class="patient-profile-toggle">
                      <input id="profileNotifications" type="checkbox" ${user.notificationsEnabled !== false ? 'checked' : ''}>
                      <span class="patient-profile-toggle__slider"></span>
                    </label>
                  </div>

                  <button id="profilePreferencesSave" class="btn btn-primary" type="button">حفظ التفضيلات</button>
                </div>
              </div>
            </div>

            <button class="patient-profile-logout" id="patientProfileLogout" type="button">تسجيل الخروج</button>

            <p class="patient-profile-version">Mon Médecin • v1.0.0</p>

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
              <button class="mobile-bottom-nav__item" data-nav="appointments" type="button">
                <span class="mobile-bottom-nav__icon">◷</span>
                <span>مواعيدي</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="profile" type="button">
                <span class="mobile-bottom-nav__icon">👤</span>
                <span>ملفي الشخصي</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    renderNotLoggedIn: function(isMobile) {
      return `
        <main class="patient-profile ${isMobile ? 'mobile-app-page' : 'website-page'}">
          <header class="patient-profile__header">
            <div></div>
            <div class="patient-profile__header-copy">
              <strong>الملف الشخصي</strong>
              <span>Mon Médecin</span>
            </div>
            <div></div>
          </header>
          <section class="patient-profile-empty glass">
            <span>🔒</span>
            <h1>يجب تسجيل الدخول أولاً</h1>
            <p>للعرض ملفك الشخصي، يرجى تسجيل الدخول إلى حسابك.</p>
            <button id="patientProfileGoLogin" type="button">تسجيل الدخول</button>
          </section>
        </main>
      `;
    },

    init: function(app) {
      const user = this.getUser(app.state);

      // BACK BUTTON
      document.getElementById('patientProfileBack')?.addEventListener('click', function() {
        app.navigate('/patient/home');
      });

      // THEME TOGGLE
      document.getElementById('patientProfileTheme')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      // NOTIFICATIONS
      document.getElementById('patientProfileNotifications')?.addEventListener('click', function() {
        app.navigate('/patient/notifications');
      });

      // GO LOGIN
      document.getElementById('patientProfileGoLogin')?.addEventListener('click', function() {
        app.navigate('/login');
      });

      // EDIT TOGGLE
      document.getElementById('patientProfileEdit')?.addEventListener('click', function() {
        document.getElementById('patientProfileView').hidden = true;
        document.getElementById('patientProfileForm').hidden = false;
        this.hidden = true;
        PatientProfileScreen.editing = true;
      });

      document.getElementById('profileCancel')?.addEventListener('click', function() {
        document.getElementById('patientProfileView').hidden = false;
        document.getElementById('patientProfileForm').hidden = true;
        document.getElementById('patientProfileEdit').hidden = false;
        document.getElementById('profileError').style.display = 'none';
        PatientProfileScreen.editing = false;
      });

      // PHONE INPUT
      document.getElementById('profilePhone')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
      });

      // PROFILE FORM
      document.getElementById('patientProfileForm')?.addEventListener('submit', function(event) {
        event.preventDefault();

        const fullName = document.getElementById('profileFullName')?.value?.trim() || '';
        const phone = document.getElementById('profilePhone')?.value?.trim() || '';
        const email = document.getElementById('profileEmail')?.value?.trim() || '';

        if (fullName.length < 3) {
          PatientProfileScreen.showMessage('أدخل الاسم الكامل (3 أحرف على الأقل).', 'error');
          return;
        }
        if (phone && !/^(05|06|07)[0-9]{8}$/.test(phone)) {
          PatientProfileScreen.showMessage('أدخل رقم هاتف جزائري صحيح.', 'error');
          return;
        }

        const data = {
          fullName: fullName,
          phone: phone,
          email: email,
          gender: document.getElementById('profileGender')?.value || '',
          birthDate: document.getElementById('profileBirthDate')?.value || '',
          wilaya: document.getElementById('profileWilaya')?.value?.trim() || '',
          commune: document.getElementById('profileCommune')?.value?.trim() || '',
          address: document.getElementById('profileAddress')?.value?.trim() || ''
        };

        const saved = PatientProfileScreen.saveUser(data, app);
        if (saved) {
          PatientProfileScreen.showMessage('تم حفظ البيانات بنجاح.', 'success');
          PatientProfileScreen.editing = false;
          setTimeout(function() {
            app.render();
          }, 500);
        } else {
          PatientProfileScreen.showMessage('حدث خطأ أثناء حفظ البيانات.', 'error');
        }
      });

      // SECURITY FORM
      document.getElementById('patientProfileSecurityForm')?.addEventListener('submit', function(event) {
        event.preventDefault();

        const currentPassword = document.getElementById('profileCurrentPassword')?.value || '';
        const newPassword = document.getElementById('profileNewPassword')?.value || '';
        const confirmPassword = document.getElementById('profileConfirmPassword')?.value || '';

        const changed = PatientProfileScreen.changePassword(currentPassword, newPassword, confirmPassword, app);
        if (changed) {
          document.getElementById('patientProfileSecurityForm')?.reset();
        }
      });

      // PASSWORD TOGGLES
      const toggles = [
        { button: 'profileCurrentToggle', input: 'profileCurrentPassword' },
        { button: 'profileNewToggle', input: 'profileNewPassword' },
        { button: 'profileConfirmToggle', input: 'profileConfirmPassword' }
      ];

      toggles.forEach(function(item) {
        document.getElementById(item.button)?.addEventListener('click', function() {
          PatientProfileScreen.togglePassword(item.input, this);
        });
      });

      // THEME TOGGLE (في قسم التفضيلات)
      document.getElementById('profileThemeToggle')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      // LANGUAGE
      document.getElementById('profileLanguage')?.addEventListener('change', function() {
        app.setLanguage(this.value);
        app.render();
      });

      // NOTIFICATIONS
      document.getElementById('profileNotifications')?.addEventListener('change', function() {
        const updated = PatientProfileScreen.updatePreferences({
          notificationsEnabled: this.checked
        }, app);
        if (updated) {
          PatientProfileScreen.showMessage('تم تحديث إعدادات الإشعارات.', 'success');
        }
      });

      // PREFERENCES SAVE
      document.getElementById('profilePreferencesSave')?.addEventListener('click', function() {
        const language = document.getElementById('profileLanguage')?.value || 'ar';
        const notificationsEnabled = document.getElementById('profileNotifications')?.checked !== false;

        const updated = PatientProfileScreen.updatePreferences({
          language: language,
          notificationsEnabled: notificationsEnabled
        }, app);

        if (updated) {
          setTimeout(function() {
            app.render();
          }, 300);
        }
      });

      // LOGOUT - 100% COMPLETE
      document.getElementById('patientProfileLogout')?.addEventListener('click', function() {
        if (confirm('هل تريد تسجيل الخروج؟')) {
          app.logout();
        }
      });

      // TABS
      document.querySelectorAll('.patient-profile-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          const tabName = this.dataset.tab;
          PatientProfileScreen.activeTab = tabName;

          document.querySelectorAll('.patient-profile-tab').forEach(function(t) {
            t.classList.toggle('is-active', t === tab);
          });

          document.querySelectorAll('.patient-profile-tab-content').forEach(function(content) {
            content.classList.toggle('is-active', content.dataset.tab === tabName);
          });
        });
      });

      // BOTTOM NAV
      document.querySelectorAll("[data-nav='home']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/home');
        });
      });
      document.querySelectorAll("[data-nav='search']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/search');
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/appointments');
        });
      });
      document.querySelectorAll("[data-nav='profile']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/patient/profile');
        });
      });
    }
  };

  window.PatientProfileScreen = PatientProfileScreen;

})();