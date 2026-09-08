/* =====================================================
   MON MÉDECIN
   SECRETARY QUEUE - COMPLETE
   ===================================================== */

(function() {
  'use strict';

  const SecretaryQueueScreen = {
    /* ==================================================
       STATE
       ================================================== */

    queue: [],
    doctorId: null,
    doctor: null,
    secretary: null,
    messageTimer: null,
    autoRefreshInterval: null,

    /* ==================================================
       STORAGE HELPERS
       ================================================== */

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

    /* ==================================================
       ESCAPE HTML
       ================================================== */

    escapeHTML: function(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /* ==================================================
       SECRETARY
       ================================================== */

    getSecretary: function(app) {
      return app.state.secretary || app.state.user || null;
    },

    getDoctor: function(app) {
      if (typeof app.getSecretaryDoctor === 'function') {
        return app.getSecretaryDoctor() || null;
      }
      const secretary = this.getSecretary(app);
      const doctorId = secretary?.doctor_id || secretary?.doctorId;
      if (!doctorId) return null;

      const doctors = app.getDoctors ? app.getDoctors() : [];
      return doctors.find(function(d) {
        return String(d.id || d.doctor_id) === String(doctorId);
      }) || null;
    },

    getDoctorId: function(app) {
      if (typeof app.getSecretaryDoctorId === 'function') {
        return app.getSecretaryDoctorId() || null;
      }
      const secretary = this.getSecretary(app);
      return secretary?.doctor_id || secretary?.doctorId || null;
    },

    /* ==================================================
       PERMISSION
       ================================================== */

    hasPermission: function(app) {
      if (typeof app.secretaryCan === 'function') {
        return app.secretaryCan('appointments');
      }
      return this.getSecretary(app)?.permissions?.appointments === true;
    },

    /* ==================================================
       LOAD QUEUE
       ================================================== */

    loadQueue: function(app) {
      this.secretary = this.getSecretary(app);
      this.doctor = this.getDoctor(app);
      this.doctorId = this.getDoctorId(app);
      
      if (!this.doctorId || !window.MonMedecinQueueService) {
        this.queue = [];
        return;
      }

      try {
        this.queue = window.MonMedecinQueueService.getActiveQueue(this.doctorId);
        // ترتيب حسب رقم الانتظار
        this.queue.sort(function(a, b) {
          return (a.queueNumber || 0) - (b.queueNumber || 0);
        });
      } catch (error) {
        console.warn("MON MÉDECIN: Error loading queue", error);
        this.queue = [];
      }
    },

    /* ==================================================
       STATS
       ================================================== */

    getStats: function() {
      const waiting = this.queue.filter(function(item) {
        return item.status === 'waiting';
      }).length;

      const inProgress = this.queue.filter(function(item) {
        return item.status === 'in_progress';
      }).length;

      const done = this.queue.filter(function(item) {
        return item.status === 'done';
      }).length;

      return {
        total: this.queue.length,
        waiting: waiting,
        inProgress: inProgress,
        done: done
      };
    },

    /* ==================================================
       UPDATE STATUS
       ================================================== */

    updateStatus: function(patientId, status, app) {
      if (!this.doctorId || !window.MonMedecinQueueService) {
        this.showMessage("خدمة قائمة الانتظار غير متوفرة.", "error");
        return false;
      }

      try {
        const updated = window.MonMedecinQueueService.updateQueueStatus(
          this.doctorId,
          patientId,
          status
        );

        if (!updated) {
          this.showMessage("تعذر تحديث حالة المريض.", "error");
          return false;
        }

        this.loadQueue(app);
        this.refresh();
        this.showMessage("تم تحديث حالة المريض.", "success");
        return true;

      } catch (error) {
        console.warn("MON MÉDECIN: Error updating queue status", error);
        this.showMessage("حدث خطأ أثناء تحديث الحالة.", "error");
        return false;
      }
    },

    /* ==================================================
       REMOVE FROM QUEUE
       ================================================== */

    removeFromQueue: function(patientId, app) {
      if (!this.doctorId || !window.MonMedecinQueueService) {
        this.showMessage("خدمة قائمة الانتظار غير متوفرة.", "error");
        return false;
      }

      const confirmed = window.confirm("هل تريد إزالة هذا المريض من قائمة الانتظار؟");
      if (!confirmed) return false;

      try {
        const removed = window.MonMedecinQueueService.removeFromQueue(
          this.doctorId,
          patientId
        );

        if (!removed) {
          this.showMessage("تعذر إزالة المريض.", "error");
          return false;
        }

        this.loadQueue(app);
        this.refresh();
        this.showMessage("تم إزالة المريض من قائمة الانتظار.", "success");
        return true;

      } catch (error) {
        console.warn("MON MÉDECIN: Error removing from queue", error);
        this.showMessage("حدث خطأ أثناء إزالة المريض.", "error");
        return false;
      }
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function(message, type) {
      const element = document.getElementById("secretaryQueueMessage");
      if (!element) {
        if (type === 'error') alert('❌ ' + message);
        else if (type === 'success') alert('✅ ' + message);
        else alert('ℹ️ ' + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = 'secretary-queue-message';
      element.classList.add(type === 'success' ? 'is-success' : type === 'info' ? 'is-info' : 'is-error');

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function() {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3500);
    },

    /* ==================================================
       RENDER QUEUE ITEM
       ================================================== */

    renderQueueItem: function(item, index) {
      const statusLabels = {
        waiting: 'في الانتظار',
        in_progress: 'جاري الفحص',
        done: 'تم الفحص'
      };

      const statusClasses = {
        waiting: 'is-waiting',
        in_progress: 'is-progress',
        done: 'is-done'
      };

      const statusLabel = statusLabels[item.status] || item.status;
      const statusClass = statusClasses[item.status] || 'is-waiting';

      return `
        <article class="secretary-queue-item glass ${statusClass}">
          <div class="secretary-queue-item__number">
            <strong>#${item.queueNumber || index + 1}</strong>
          </div>
          <div class="secretary-queue-item__patient">
            <div class="secretary-queue-item__avatar">
              ${this.escapeHTML(String(item.patientName || 'م').charAt(0))}
            </div>
            <div>
              <strong>${this.escapeHTML(item.patientName || 'مريض')}</strong>
              <small dir="ltr">${this.escapeHTML(item.patientPhone || '')}</small>
              ${item.serviceName ? `<small>${this.escapeHTML(item.serviceName)}</small>` : ''}
              ${item.arrivedAt ? `<small>⏱ ${this.escapeHTML(item.arrivedAt)}</small>` : ''}
            </div>
          </div>
          <div class="secretary-queue-item__status">
            <span class="queue-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="secretary-queue-item__actions">
            ${item.status === 'waiting' ? `
              <button class="is-start" data-queue-patient="${item.patientId}" data-queue-action="start" type="button">
                بدء الفحص
              </button>
            ` : ''}
            ${item.status === 'in_progress' ? `
              <button class="is-done" data-queue-patient="${item.patientId}" data-queue-action="done" type="button">
                إنهاء الفحص
              </button>
            ` : ''}
            ${item.status === 'done' ? `
              <span class="queue-done">✓ مكتمل</span>
            ` : ''}
            <button class="is-remove" data-queue-patient="${item.patientId}" data-queue-action="remove" type="button">
              ✕
            </button>
          </div>
        </article>
      `;
    },

    /* ==================================================
       RENDER QUEUE
       ================================================== */

    renderQueue: function() {
      if (this.queue.length === 0) {
        return `
          <section class="secretary-queue-empty glass">
            <span>⏳</span>
            <h3>قائمة الانتظار فارغة</h3>
            <p>لا يوجد مرضى في قائمة الانتظار حالياً.</p>
          </section>
        `;
      }

      return this.queue.map(function(item, index) {
        return SecretaryQueueScreen.renderQueueItem(item, index);
      }).join('');
    },

    /* ==================================================
       START AUTO REFRESH
       ================================================== */

    startAutoRefresh: function(app) {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
      }

      this.autoRefreshInterval = setInterval(function() {
        const list = document.getElementById('secretaryQueueList');
        if (list && document.body.contains(list)) {
          SecretaryQueueScreen.loadQueue(app);
          SecretaryQueueScreen.refresh();
        } else {
          clearInterval(SecretaryQueueScreen.autoRefreshInterval);
          SecretaryQueueScreen.autoRefreshInterval = null;
        }
      }, 30000); // كل 30 ثانية
    },

    /* ==================================================
       RENDER BLOCKED
       ================================================== */

    renderBlocked: function(state) {
      return `
        <main class="secretary-queue ${state.deviceMode === 'mobile' ? 'mobile-app-page' : 'website-page'}">
          <section class="secretary-queue-blocked glass">
            <span>🔒</span>
            <h1>لا توجد صلاحية</h1>
            <p>الطبيب لم يمنح حسابك صلاحية إدارة قائمة الانتظار.</p>
            <button id="secretaryQueueBlockedBack" type="button">العودة للرئيسية</button>
          </section>
        </main>
      `;
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function(state, app) {
      if (!this.hasPermission(app)) {
        return this.renderBlocked(state);
      }

      this.loadQueue(app);
      const stats = this.getStats();
      const doctor = this.getDoctor(app);
      const secretary = this.getSecretary(app);
      const isMobile = state.deviceMode === 'mobile';

      const doctorName = doctor?.fullName || doctor?.name || doctor?.professional?.title || 'الطبيب';
      const secretaryName = secretary?.fullName || secretary?.name || 'السكرتير';

      return `
        <main class="secretary-queue ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="secretary-queue__orb secretary-queue__orb--blue"></div>
          <div class="secretary-queue__orb secretary-queue__orb--cyan"></div>

          <header class="secretary-queue__header">
            <button id="secretaryQueueBack" class="secretary-queue__back" type="button">→</button>
            <div class="secretary-queue__header-copy">
              <strong>قائمة الانتظار</strong>
              <span>${this.escapeHTML(doctorName)}</span>
            </div>
            <button id="secretaryQueueTheme" class="secretary-queue__theme" type="button">${state.theme === 'dark' ? '☀' : '◐'}</button>
          </header>

          <section class="secretary-queue__container">

            <section class="secretary-queue__hero">
              <span>⏳ QUEUE</span>
              <h1>قائمة انتظار العيادة</h1>
              <p>مراقبة وإدارة ترتيب مرضى العيادة.</p>
            </section>

            <section class="secretary-queue-info glass">
              <span>ℹ</span>
              <p>يتم إضافة المرضى إلى قائمة الانتظار تلقائياً عند تسجيل وصولهم. يمكنك متابعة الحالات وبدء الفحص من هنا.</p>
            </section>

            <section class="secretary-queue-stats">
              <article class="secretary-queue-stat glass">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="secretary-queue-stat glass is-waiting">
                <span>في الانتظار</span>
                <strong>${stats.waiting}</strong>
              </article>
              <article class="secretary-queue-stat glass is-progress">
                <span>جاري الفحص</span>
                <strong>${stats.inProgress}</strong>
              </article>
              <article class="secretary-queue-stat glass is-done">
                <span>مكتمل</span>
                <strong>${stats.done}</strong>
              </article>
            </section>

            <div id="secretaryQueueMessage" class="secretary-queue-message" hidden></div>

            <section id="secretaryQueueList" class="secretary-queue-list">
              ${this.renderQueue()}
            </section>

            <!-- ============================================= -->
            <!-- LOGOUT BUTTON - FIXED -->
            <!-- ============================================= -->
            <section class="secretary-queue-logout-section" style="margin-top: 20px;">
              <button id="secretaryQueueLogout" class="secretary-queue-logout" type="button">
                تسجيل الخروج من حساب السكرتير
              </button>
            </section>

          </section>

          <!-- BOTTOM NAV -->
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
              <button class="mobile-bottom-nav__item is-active" data-nav="queue" type="button">
                <span class="mobile-bottom-nav__icon">⏳</span>
                <span>قائمة الانتظار</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="settings" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>الإعدادات</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    /* ==================================================
       REFRESH
       ================================================== */

    refresh: function() {
      const list = document.getElementById('secretaryQueueList');
      if (list) {
        list.innerHTML = this.renderQueue();
      }

      // تحديث الإحصائيات
      const stats = this.getStats();
      const total = document.querySelector('.secretary-queue-stat.is-total strong');
      const waiting = document.querySelector('.secretary-queue-stat.is-waiting strong');
      const progress = document.querySelector('.secretary-queue-stat.is-progress strong');
      const done = document.querySelector('.secretary-queue-stat.is-done strong');

      if (total) total.textContent = stats.total;
      if (waiting) waiting.textContent = stats.waiting;
      if (progress) progress.textContent = stats.inProgress;
      if (done) done.textContent = stats.done;
    },

    /* ==================================================
       INIT - FIXED
       ================================================== */

    init: function(app) {
      console.log('MON MÉDECIN: SecretaryQueueScreen init');

      // ==============================================
      // BLOCKED BACK
      // ==============================================
      document.getElementById('secretaryQueueBlockedBack')?.addEventListener('click', function() {
        app.navigate('/secretary/dashboard');
      });

      if (!this.hasPermission(app)) return;

      // ==============================================
      // BACK BUTTON - FIXED
      // ==============================================
      document.getElementById('secretaryQueueBack')?.addEventListener('click', function() {
        app.navigate('/secretary/dashboard');
      });

      // ==============================================
      // THEME BUTTON - FIXED
      // ==============================================
      document.getElementById('secretaryQueueTheme')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      // ==============================================
      // QUEUE ACTIONS
      // ==============================================
      document.getElementById('secretaryQueueList')?.addEventListener('click', function(event) {
        const button = event.target.closest('[data-queue-action]');
        if (!button) return;

        const patientId = button.dataset.queuePatient;
        const action = button.dataset.queueAction;

        if (action === 'start') {
          const confirmed = window.confirm('هل تريد بدء فحص هذا المريض؟');
          if (!confirmed) return;
          
          button.disabled = true;
          button.textContent = '⏳ جاري...';
          
          const updated = SecretaryQueueScreen.updateStatus(patientId, 'in_progress', app);
          if (updated) {
            setTimeout(function() {
              app.render();
            }, 300);
          } else {
            button.disabled = false;
            button.textContent = 'بدء الفحص';
          }
          return;
        }

        if (action === 'done') {
          const confirmed = window.confirm('هل تريد إنهاء فحص هذا المريض؟');
          if (!confirmed) return;
          
          button.disabled = true;
          button.textContent = '⏳ جاري...';
          
          const updated = SecretaryQueueScreen.updateStatus(patientId, 'done', app);
          if (updated) {
            setTimeout(function() {
              app.render();
            }, 300);
          } else {
            button.disabled = false;
            button.textContent = 'إنهاء الفحص';
          }
          return;
        }

        if (action === 'remove') {
          SecretaryQueueScreen.removeFromQueue(patientId, app);
          return;
        }
      });

      // ==============================================
      // LOGOUT BUTTON - FIXED
      // ==============================================
      document.getElementById('secretaryQueueLogout')?.addEventListener('click', function() {
        if (confirm("هل تريد تسجيل الخروج من حساب السكرتير؟")) {
          try {
            sessionStorage.removeItem("monmedecin-secretary-session");
          } catch (error) {
            console.warn("Error clearing secretary session:", error);
          }
          app.logout();
        }
      });

      // ==============================================
      // START AUTO REFRESH
      // ==============================================
      this.startAutoRefresh(app);

      // ==============================================
      // BOTTOM NAV
      // ==============================================
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/dashboard');
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/appointments');
        });
      });
      document.querySelectorAll("[data-nav='queue']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/queue');
        });
      });
      document.querySelectorAll("[data-nav='settings']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/secretary/settings');
        });
      });
    }
  };

  window.SecretaryQueueScreen = SecretaryQueueScreen;

})();