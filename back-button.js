/* =====================================================
   MON MÉDECIN
   BACK BUTTON MANAGER - زر الرجوع الموحد
   ===================================================== */

(function() {
  'use strict';

  const BackButtonManager = {
    /* ==================================================
       STATE
       ================================================== */

    app: null,
    defaultFallback: '/patient/home',

    /* ==================================================
       INIT
       ================================================== */

    init: function(app) {
      this.app = app;
      
      if (app && app.state && app.state.role) {
        const roleMap = {
          admin: '/admin/dashboard',
          doctor: '/doctor/dashboard',
          secretary: '/secretary/dashboard',
          patient: '/patient/home'
        };
        this.defaultFallback = roleMap[app.state.role] || '/patient/home';
      }

      this.bindAllBackButtons();
      this.setupMutationObserver();
      
      console.log('✅ BackButtonManager initialized');
    },

    /* ==================================================
       BIND ALL BACK BUTTONS
       ================================================== */

    bindAllBackButtons: function() {
      const selectors = [
        '[data-back]',
        '.back-button',
        '[id$="Back"]',
        '[data-action="back"]'
      ];

      selectors.forEach(function(selector) {
        document.querySelectorAll(selector).forEach(function(btn) {
          this.bindBackButton(btn);
        }, this);
      }, this);
    },

    /* ==================================================
       BIND SINGLE BACK BUTTON
       ================================================== */

    bindBackButton: function(button) {
      if (!button) return;
      if (button._backBound) return;
      button._backBound = true;

      // Get behavior from data attribute
      const behavior = button.dataset.back || button.getAttribute('data-back') || null;

      button.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();

        // 1. Custom behavior from data attribute
        if (behavior) {
          if (behavior === 'history') {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              this.navigateToFallback();
            }
            return;
          }
          
          if (behavior === 'close' || behavior === 'dismiss') {
            // For modals / overlays
            const modal = button.closest('.modal, .overlay, [data-modal]');
            if (modal) {
              modal.style.display = 'none';
              modal.classList.remove('is-open');
              return;
            }
            this.navigateToFallback();
            return;
          }

          if (behavior.startsWith('/')) {
            this.navigate(behavior);
            return;
          }
        }

        // 2. Try to navigate using app
        if (this.app && typeof this.app.back === 'function') {
          this.app.back(this.defaultFallback);
          return;
        }

        // 3. Use history
        if (window.history.length > 1) {
          window.history.back();
          return;
        }

        // 4. Fallback
        this.navigateToFallback();

      }.bind(this));
    },

    /* ==================================================
       NAVIGATE TO FALLBACK
       ================================================== */

    navigateToFallback: function() {
      if (this.app && typeof this.app.navigate === 'function') {
        this.app.navigate(this.defaultFallback);
      } else {
        window.location.href = '/';
      }
    },

    /* ==================================================
       NAVIGATE
       ================================================== */

    navigate: function(route) {
      if (this.app && typeof this.app.navigate === 'function') {
        this.app.navigate(route);
      } else {
        window.location.hash = route;
      }
    },

    /* ==================================================
       MUTATION OBSERVER
       ================================================== */

    setupMutationObserver: function() {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            
            // Check if the node itself is a back button
            if (this.isBackButton(node)) {
              this.bindBackButton(node);
            }
            
            // Check for back buttons inside the added node
            if (node.querySelectorAll) {
              const selectors = [
                '[data-back]',
                '.back-button',
                '[id$="Back"]',
                '[data-action="back"]'
              ];
              selectors.forEach(function(selector) {
                node.querySelectorAll(selector).forEach(function(btn) {
                  this.bindBackButton(btn);
                }, this);
              }, this);
            }
          }, this);
        }, this);
      }.bind(this));

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    /* ==================================================
       IS BACK BUTTON
       ================================================== */

    isBackButton: function(element) {
      if (!element || !element.matches) return false;
      return element.matches('[data-back], .back-button, [id$="Back"], [data-action="back"]');
    },

    /* ==================================================
       CREATE BACK BUTTON
       ================================================== */

    createBackButton: function(container, options) {
      const opts = options || {};
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'back-button' + (opts.className ? ' ' + opts.className : '');
      button.setAttribute('data-back', opts.behavior || '');
      button.setAttribute('aria-label', opts.label || 'رجوع');
      button.innerHTML = opts.icon || '←';
      
      this.bindBackButton(button);

      if (container) {
        container.appendChild(button);
      }

      return button;
    },

    /* ==================================================
       UPDATE FALLBACK
       ================================================== */

    updateFallback: function(route) {
      if (route) {
        this.defaultFallback = route;
      }
    }
  };

  // ====================================================
  // EXPOSE
  // ====================================================

  window.MonMedecinBackButton = BackButtonManager;

})();