/* =====================================================
   MON MÉDECIN
   ONBOARDING SCREEN
   ===================================================== */

(function() {
  'use strict';

  var OnboardingScreen = {
    currentSlide: 0,

    slides: [
      {
        icon: '⌕',
        badge: 'بحث أسرع',
        title: 'ابحث عن طبيبك بسهولة',
        text: 'اختر الولاية والبلدية والتخصص، ثم اعثر على الطبيب أو العيادة المناسبة لك.'
      },
      {
        icon: '◷',
        badge: 'موعدك في دقائق',
        title: 'اختر الموعد المناسب',
        text: 'شاهد أقرب المواعيد المتاحة واحجز الوقت الذي يناسبك دون الحاجة للاتصال بالعيادة.'
      },
      {
        icon: '✓',
        badge: 'دور رقمي',
        title: 'تابع دورك من هاتفك',
        text: 'بعد وصولك للعيادة يمكنك معرفة عدد المرضى قبلك والحصول على إشعار عند اقتراب دورك.'
      }
    ],

    render: function(state) {
      var isDesktop = state.deviceMode === 'desktop';

      return `
        <main class="onboarding-screen ${isDesktop ? 'onboarding-screen--website' : 'onboarding-screen--app'}">
          <div class="onboarding-orb onboarding-orb--blue"></div>
          <div class="onboarding-orb onboarding-orb--purple"></div>

          <header class="onboarding-header">
            <div class="onboarding-brand">
              <div class="onboarding-brand__logo">M</div>
              <div class="onboarding-brand__copy">
                <strong>Mon Médecin</strong>
                <span>موعدك بسهولة</span>
              </div>
            </div>
            <button class="onboarding-skip" id="onboardingSkip" type="button">تخطي</button>
          </header>

          <section class="onboarding-layout">
            <div class="onboarding-visual-column">
              <div class="onboarding-visual glass">
                <div class="onboarding-visual__halo"></div>
                <div class="onboarding-icon" id="onboardingIcon">⌕</div>
                <div class="onboarding-mini-card onboarding-mini-card--top">
                  <span class="onboarding-mini-card__dot"></span>
                  <div>
                    <small>موعد متاح</small>
                    <strong>اليوم 15:30</strong>
                  </div>
                </div>
                <div class="onboarding-mini-card onboarding-mini-card--bottom">
                  <span class="onboarding-mini-card__number">02</span>
                  <div>
                    <small>أمامك</small>
                    <strong>مريضان</strong>
                  </div>
                </div>
              </div>
            </div>

            <div class="onboarding-copy-column">
              <div class="onboarding-copy">
                <span class="onboarding-badge" id="onboardingBadge">بحث أسرع</span>
                <h1 id="onboardingTitle">ابحث عن طبيبك بسهولة</h1>
                <p id="onboardingText">اختر الولاية والبلدية والتخصص، ثم اعثر على الطبيب أو العيادة المناسبة لك.</p>
              </div>

              <div class="onboarding-dots" id="onboardingDots">
                <button class="onboarding-dot is-active" data-slide="0" type="button"></button>
                <button class="onboarding-dot" data-slide="1" type="button"></button>
                <button class="onboarding-dot" data-slide="2" type="button"></button>
              </div>

              <button class="onboarding-next btn btn-primary" id="onboardingNext" type="button">
                <span id="onboardingNextText">التالي</span>
                <span class="onboarding-next__arrow">←</span>
              </button>
            </div>
          </section>
        </main>
      `;
    },

    init: function(app) {
      this.currentSlide = 0;

      var nextButton = document.getElementById('onboardingNext');
      var skipButton = document.getElementById('onboardingSkip');
      var dots = document.querySelectorAll('.onboarding-dot');

      if (nextButton) {
        nextButton.addEventListener('click', function() {
          if (OnboardingScreen.currentSlide < OnboardingScreen.slides.length - 1) {
            OnboardingScreen.currentSlide += 1;
            OnboardingScreen.updateSlide();
            return;
          }
          app.navigate('/login');
        });
      }

      if (skipButton) {
        skipButton.addEventListener('click', function() {
          app.navigate('/login');
        });
      }

      dots.forEach(function(dot) {
        dot.addEventListener('click', function() {
          var index = Number(dot.dataset.slide);
          if (Number.isNaN(index)) return;
          OnboardingScreen.currentSlide = index;
          OnboardingScreen.updateSlide();
        });
      });
    },

    updateSlide: function() {
      var slide = this.slides[this.currentSlide];

      var icon = document.getElementById('onboardingIcon');
      var badge = document.getElementById('onboardingBadge');
      var title = document.getElementById('onboardingTitle');
      var text = document.getElementById('onboardingText');
      var nextText = document.getElementById('onboardingNextText');
      var dots = document.querySelectorAll('.onboarding-dot');

      if (icon) {
        icon.classList.remove('is-changing');
        void icon.offsetWidth;
        icon.classList.add('is-changing');
        icon.textContent = slide.icon;
      }

      if (badge) badge.textContent = slide.badge;
      if (title) title.textContent = slide.title;
      if (text) text.textContent = slide.text;

      dots.forEach(function(dot, index) {
        dot.classList.toggle('is-active', index === OnboardingScreen.currentSlide);
      });

      if (nextText) {
        nextText.textContent = this.currentSlide === this.slides.length - 1 ? 'ابدأ الآن' : 'التالي';
      }
    }
  };

  window.OnboardingScreen = OnboardingScreen;
})();