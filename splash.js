/* =====================================================
   MON MÉDECIN
   SPLASH SCREEN
   ===================================================== */

(function() {
  'use strict';

  var SplashScreen = {
    timer: null,

    render: function(state) {
      var isDesktop = state.deviceMode === 'desktop';

      return `
        <main class="splash-screen ${isDesktop ? 'splash-screen--website' : 'splash-screen--app'}">
          <div class="splash-orb splash-orb--blue"></div>
          <div class="splash-orb splash-orb--purple"></div>
          <div class="splash-grid"></div>

          <section class="splash-content">
            <div class="splash-logo-wrapper">
              <div class="splash-logo">
                <span class="splash-logo__m">M</span>
                <div class="splash-heartbeat">
                  <span class="splash-heartbeat__line"></span>
                </div>
              </div>
            </div>

            <div class="splash-copy">
              <span class="splash-copy__welcome">مرحبًا بك في</span>
              <h1>Mon Médecin</h1>
              <p>موعدك مع طبيبك أصبح أسهل</p>
            </div>

            <div class="splash-loading" aria-label="جاري التحميل">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </section>

          <footer class="splash-footer">
            <span class="splash-footer__status">
              <span></span>
              متصل
            </span>
            <span>منصة حجز مواعيد الأطباء</span>
          </footer>
        </main>
      `;
    },

    init: function(app) {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(function() {
        app.navigate('/onboarding');
      }, 2200);
    }
  };

  window.SplashScreen = SplashScreen;
})();