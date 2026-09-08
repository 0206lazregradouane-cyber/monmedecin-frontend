/* =====================================================
   MON MÉDECIN
   DOCTOR QUEUE - FIXED
   ===================================================== */

(function() {
  'use strict';

  const DoctorQueueScreen = {
    queue: [],
    doctorId: null,
    messageTimer: null,
    autoRefreshInterval: null,

    // ==================================================
    // STORAGE HELPERS
    // ==================================================

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

    // ==================================================
    // ESCAPE HTML
    // ==================================================

    escapeHTML: function(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    // ==================================================
    // DOCTOR
    // ==================================================

    getDoctor: function(app) {
      return app.state.doctor || app.state.user || null;
    },

    getDoctorId: function(app) {
      const doctor = this.getDoctor(app);
      return doctor?.id || doctor?.doctor_id || null;
    },

    // ==================================================
    // LOAD QUEUE - FIXED
    // ==================================================

    loadQueue: function(app) {
      this.doctorId = this.getDoctorId(app);
      
      if (!this.doctorId || !window.MonMedecinQueueService) {
        this.queue = [];
        return;
      }

      try {
        // Get active queue only (waiting + in_progress)
        this.queue = window.MonMedecinQueueService.getActiveQueue(this.doctorId);
        // Sort by queue number
        this.queue.sort(function(a, b) {
          return (a.queueNumber || 0) - (b.queueNumber || 0);
        });
        console.log('MON MÉDECIN: Queue loaded', this.queue.length, 'patients');
      } catch (error) {
        console.warn("MON MÉDECIN: Error loading queue", error);
        this.queue = [];
      }
    },

    // ==================================================
    // STATS
    // ==================================================

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

    // ==================================================
    // UPDATE STATUS - FIXED
    // ==================================================

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

    // ==================================================
    // REMOVE FROM QUEUE - FIXED
    // ==================================================

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

    // ==================================================
    // MESSAGE
    // ==================================================

    showMessage: function(message, type) {
      const element = document.getElementById("doctorQueueMessage");
      if (!element) {
        if (type === 'error') alert('❌ ' + message);
        else if (type === 'success') alert('✅ ' + message);
        else alert('ℹ️ ' + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.className = 'doctor-queue-message';
      element.classList.add(type === 'success' ? 'is-success' : type === 'info' ? 'is-info' : 'is-error');

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function() {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3500);
    },

    // ==================================================
    // RENDER QUEUE ITEM
    // ==================================================

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
        <article class="doctor-queue-item glass ${statusClass}">
          <div class="doctor-queue-item__number">
            <strong>#${item.queueNumber || index + 1}</strong>
          </div>
          <div class="doctor-queue-item__patient">
            <div class="doctor-queue-item__avatar">
              ${this.escapeHTML(String(item.patientName || 'م').charAt(0))}
            </div>
            <div>
              <strong>${this.escapeHTML(item.patientName || 'مريض')}</strong>
              <small dir="ltr">${this.escapeHTML(item.patientPhone || '')}</small>
              ${item.serviceName ? `<small>${this.escapeHTML(item.serviceName)}</small>` : ''}
            </div>
          </div>
          <div class="doctor-queue-item__status">
            <span class="queue-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="doctor-queue-item__actions">
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

    // ==================================================
    // RENDER QUEUE
    // ==================================================

    renderQueue: function() {
      if (this.queue.length === 0) {
        return `
          <section class="doctor-queue-empty glass">
            <span>⏳</span>
            <h3>قائمة الانتظار فارغة</h3>
            <p>لا يوجد مرضى في قائمة الانتظار حالياً.</p>
          </section>
        `;
      }

      return this.queue.map(function(item, index) {
        return DoctorQueueScreen.renderQueueItem(item, index);
      }).join('');
    },

    // ==================================================
    // START AUTO REFRESH
    // ==================================================

    startAutoRefresh: function(app) {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
      }

      this.autoRefreshInterval = setInterval(function() {
        const list = document.getElementById('doctorQueueList');
        if (list && document.body.contains(list)) {
          DoctorQueueScreen.loadQueue(app);
          DoctorQueueScreen.refresh();
        } else {
          clearInterval(DoctorQueueScreen.autoRefreshInterval);
          DoctorQueueScreen.autoRefreshInterval = null;
        }
      }, 30000);
    },

    // ==================================================
    // RENDER
    // ==================================================

    render: function(state, app) {
      this.loadQueue(app);
      const stats = this.getStats();
      const doctor = this.getDoctor(app);
      const isMobile = state.deviceMode === 'mobile';

      const doctorName = doctor?.fullName || doctor?.name || 'الطبيب';

      return `
        <main class="doctor-queue ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="doctor-queue__orb doctor-queue__orb--blue"></div>
          <div class="doctor-queue__orb doctor-queue__orb--cyan"></div>

          <header class="doctor-queue__header">
            <button id="doctorQueueBack" class="doctor-queue__back" type="button">→</button>
            <div class="doctor-queue__header-copy">
              <strong>قائمة الانتظار</strong>
              <span>${this.escapeHTML(doctorName)}</span>
            </div>
            <button id="doctorQueueTheme" class="doctor-queue__theme" type="button">${state.theme === 'dark' ? '☀' : '◐'}</button>
          </header>

          <section class="doctor-queue__container">

            <section class="doctor-queue__hero">
              <span>⏳ QUEUE</span>
              <h1>قائمة انتظار العيادة</h1>
              <p>إدارة ترتيب مرضى العيادة ومتابعة حالتهم.</p>
            </section>

            <section class="doctor-queue-stats">
              <article class="doctor-queue-stat glass">
                <span>الكل</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="doctor-queue-stat glass is-waiting">
                <span>في الانتظار</span>
                <strong>${stats.waiting}</strong>
              </article>
              <article class="doctor-queue-stat glass is-progress">
                <span>جاري الفحص</span>
                <strong>${stats.inProgress}</strong>
              </article>
              <article class="doctor-queue-stat glass is-done">
                <span>مكتمل</span>
                <strong>${stats.done}</strong>
              </article>
            </section>

            <div id="doctorQueueMessage" class="doctor-queue-message" hidden></div>

            <section class="doctor-queue-info glass">
              <span>ℹ</span>
              <p>يتم إضافة المرضى إلى قائمة الانتظار عند تسجيل وصولهم بواسطة السكرتارية. يمكنك بدء وإنهاء الفحص من هنا.</p>
            </section>

            <section id="doctorQueueList" class="doctor-queue-list">
              ${this.renderQueue()}
            </section>

            <section class="doctor-queue-logout-section" style="margin-top: 20px;">
              <button id="doctorQueueLogout" class="doctor-queue-logout" type="button">
                تسجيل الخروج من حساب الطبيب
              </button>
            </section>

          </section>

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
              <button class="mobile-bottom-nav__item" data-nav="account" type="button">
                <span class="mobile-bottom-nav__icon">⚙</span>
                <span>حسابي</span>
              </button>
            </nav>
          ` : ''}

        </main>
      `;
    },

    // ==================================================
    // REFRESH
    // ==================================================

    refresh: function() {
      const list = document.getElementById('doctorQueueList');
      if (list) {
        list.innerHTML = this.renderQueue();
      }

      const stats = this.getStats();
      const total = document.querySelector('.doctor-queue-stat.is-total strong');
      const waiting = document.querySelector('.doctor-queue-stat.is-waiting strong');
      const progress = document.querySelector('.doctor-queue-stat.is-progress strong');
      const done = document.querySelector('.doctor-queue-stat.is-done strong');

      if (total) total.textContent = stats.total;
      if (waiting) waiting.textContent = stats.waiting;
      if (progress) progress.textContent = stats.inProgress;
      if (done) done.textContent = stats.done;
    },

    // ==================================================
    // INIT - FIXED
    // ==================================================

    init: function(app) {
      console.log('MON MÉDECIN: DoctorQueueScreen init');

      // BACK
      document.getElementById('doctorQueueBack')?.addEventListener('click', function() {
        app.navigate('/doctor/dashboard');
      });

      // THEME
      document.getElementById('doctorQueueTheme')?.addEventListener('click', function() {
        app.toggleTheme();
        app.render();
      });

      // QUEUE ACTIONS
      document.getElementById('doctorQueueList')?.addEventListener('click', function(event) {
        const button = event.target.closest('[data-queue-action]');
        if (!button) return;

        const patientId = button.dataset.queuePatient;
        const action = button.dataset.queueAction;

        if (action === 'start') {
          const confirmed = window.confirm('هل تريد بدء فحص هذا المريض؟');
          if (!confirmed) return;
          
          button.disabled = true;
          button.textContent = '⏳ جاري...';
          
          const updated = DoctorQueueScreen.updateStatus(patientId, 'in_progress', app);
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
          
          const updated = DoctorQueueScreen.updateStatus(patientId, 'done', app);
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
          DoctorQueueScreen.removeFromQueue(patientId, app);
          return;
        }
      });

      // LOGOUT
      document.getElementById('doctorQueueLogout')?.addEventListener('click', function() {
        if (confirm("هل تريد تسجيل الخروج من حساب الطبيب؟")) {
          try {
            sessionStorage.removeItem("monmedecin-doctor-session");
            localStorage.removeItem("monmedecin-doctor");
          } catch (error) {
            console.warn("Error clearing doctor session:", error);
          }
          app.logout();
        }
      });

      // START AUTO REFRESH
      this.startAutoRefresh(app);

      // BOTTOM NAV
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/doctor/dashboard');
        });
      });
      document.querySelectorAll("[data-nav='appointments']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/doctor/appointments');
        });
      });
      document.querySelectorAll("[data-nav='queue']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/doctor/queue');
        });
      });
      document.querySelectorAll("[data-nav='account']")?.forEach(function(btn) {
        btn.addEventListener('click', function() {
          app.navigate('/doctor/account');
        });
      });
    }
  };

  window.DoctorQueueScreen = DoctorQueueScreen;

})();