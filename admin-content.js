/* =====================================================
   MON MÉDECIN
   ADMIN CONTENT - FIXED
   ===================================================== */

(function () {
  "use strict";

  const AdminContentScreen = {
    content: {},
    selectedTab: "home",
    messageTimer: null,

    defaultContent: {
      home: {
        heroTitle: "صحتك أقرب إليك",
        heroSubtitle: "منصة صحية حديثة تساعدك على الوصول إلى طبيبك وتنظيم مواعيدك ومتابعة رحلتك الصحية بسهولة.",
        heroButton: "حجز موعد الآن",
        features: ["حجز سهل وسريع", "أطباء معتمدون", "تذكير بالمواعيد", "متابعة مستمرة"],
        stats: { doctors: 150, patients: 5000, appointments: 12000, satisfaction: 98 }
      },
      about: {
        title: "عن Mon Médecin",
        description: "منصة Mon Médecin هي خدمة طبية مبتكرة تهدف إلى تسهيل عملية حجز المواعيد الطبية وربط المرضى بالأطباء بطريقة سلسة ومريحة.",
        mission: "توفير رعاية صحية سهلة الوصول للجميع",
        vision: "ريادة التحول الرقمي في القطاع الصحي",
        values: ["الجودة في الخدمة", "الثقة والشفافية", "الابتكار المستمر", "الاحترام والتقدير"]
      },
      contact: {
        address: "الجزائر العاصمة، الجزائر",
        phone: "+213 55 00 00 00",
        email: "info@monmedecin.dz",
        workingHours: "الأحد - الخميس: 08:00 - 17:00",
        social: { facebook: "", instagram: "", twitter: "", linkedin: "" }
      },
      faq: [
        { question: "كيف يمكنني حجز موعد؟", answer: "يمكنك حجز موعد من خلال البحث عن طبيب واختيار الخدمة والتاريخ المناسبين." },
        { question: "هل الخدمة مجانية؟", answer: "الخدمة مجانية للمستخدمين، وتشمل رسوم الخدمات الطبية حسب كل طبيب." },
        { question: "كيف يمكنني إلغاء موعد؟", answer: "يمكنك إلغاء الموعد من خلال صفحة المواعيد الخاصة بك قبل 24 ساعة على الأقل." },
        { question: "هل بياناتي آمنة؟", answer: "نعم، نستخدم أحدث تقنيات التشفير لحماية بياناتك الشخصية والطبية." }
      ],
      footer: {
        copyright: "© 2026 Mon Médecin. جميع الحقوق محفوظة.",
        links: [
          { title: "سياسة الخصوصية", url: "/privacy" },
          { title: "شروط الاستخدام", url: "/terms" },
          { title: "الدعم الفني", url: "/support" }
        ]
      }
    },

    readJSON: function (storage, key, fallback) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        console.warn("MON MÉDECIN: Cannot read", key, error);
        return fallback;
      }
    },

    writeJSON: function (storage, key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("MON MÉDECIN: Cannot write", key, error);
        return false;
      }
    },

    escapeHTML: function (value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    loadContent: function () {
      const saved = this.readJSON(localStorage, "monmedecin-content", null);
      if (saved && typeof saved === "object") {
        this.content = this.mergeDeep(this.defaultContent, saved);
      } else {
        this.content = JSON.parse(JSON.stringify(this.defaultContent));
        this.saveContent();
      }
      return this.content;
    },

    saveContent: function () {
      return this.writeJSON(localStorage, "monmedecin-content", this.content);
    },

    mergeDeep: function (target, source) {
      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
          result[key] = this.mergeDeep(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    },

    getSection: function (section) {
      return this.content[section] || {};
    },

    updateSection: function (section, data) {
      this.content[section] = { ...this.content[section], ...data };
      this.saveContent();
    },

    resetSection: function (section) {
      this.content[section] = JSON.parse(JSON.stringify(this.defaultContent[section] || {}));
      this.saveContent();
      this.showMessage("تم إعادة تعيين المحتوى إلى الإعدادات الافتراضية.", "success");
    },

    showMessage: function (message, type) {
      const element = document.getElementById("adminContentMessage");
      if (!element) {
        if (type === "error") alert("❌ " + message);
        else if (type === "success") alert("✅ " + message);
        else alert("ℹ️ " + message);
        return;
      }
      element.hidden = false;
      element.textContent = message;
      element.classList.remove("is-success", "is-error", "is-info");
      element.classList.add(type === "success" ? "is-success" : type === "info" ? "is-info" : "is-error");
      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) element.hidden = true;
      }, 3000);
    },

    /* ==================================================
       RENDER SECTIONS
       ================================================== */

    renderHomeSection: function () {
      const home = this.getSection("home");
      const features = Array.isArray(home.features) ? home.features : [];

      return `
        <div class="admin-content-section is-active" data-section="home">
          <div class="admin-content-card glass">
            <div class="admin-content-card__head">
              <div>
                <span>محتوى الصفحة الرئيسية</span>
                <h2>الرئيسية</h2>
              </div>
              <span class="admin-content-card__icon">🏠</span>
            </div>
            <form id="adminContentHomeForm" class="admin-content-form">
              <label class="admin-content-field">
                <span>العنوان الرئيسي</span>
                <input id="homeHeroTitle" type="text" value="${this.escapeHTML(home.heroTitle || "")}" maxlength="100" />
              </label>
              <label class="admin-content-field">
                <span>النص الفرعي</span>
                <textarea id="homeHeroSubtitle" rows="3" maxlength="500">${this.escapeHTML(home.heroSubtitle || "")}</textarea>
              </label>
              <label class="admin-content-field">
                <span>نص الزر</span>
                <input id="homeHeroButton" type="text" value="${this.escapeHTML(home.heroButton || "")}" maxlength="50" />
              </label>
              <label class="admin-content-field">
                <span>المميزات (سطر واحد لكل ميزة)</span>
                <textarea id="homeFeatures" rows="4" placeholder="أدخل كل ميزة في سطر منفصل">${this.escapeHTML(features.join("\n"))}</textarea>
                <span class="helper">أدخل كل ميزة في سطر منفصل</span>
              </label>
              <label class="admin-content-field">
                <span>الإحصائيات (عدد الأطباء)</span>
                <input id="homeStatsDoctors" type="number" value="${home.stats?.doctors || 0}" min="0" />
              </label>
              <label class="admin-content-field">
                <span>الإحصائيات (عدد المرضى)</span>
                <input id="homeStatsPatients" type="number" value="${home.stats?.patients || 0}" min="0" />
              </label>
              <label class="admin-content-field">
                <span>الإحصائيات (عدد المواعيد)</span>
                <input id="homeStatsAppointments" type="number" value="${home.stats?.appointments || 0}" min="0" />
              </label>
              <label class="admin-content-field">
                <span>الإحصائيات (نسبة الرضا)</span>
                <input id="homeStatsSatisfaction" type="number" value="${home.stats?.satisfaction || 0}" min="0" max="100" />
                <span class="helper">نسبة مئوية بين 0 و 100</span>
              </label>
              <button class="admin-content-submit" type="submit">حفظ التغييرات</button>
              <button class="admin-content-reset" type="button" data-reset-section="home">إعادة تعيين إلى الافتراضي</button>
            </form>
          </div>
        </div>
      `;
    },

    renderAboutSection: function () {
      const about = this.getSection("about");
      const values = Array.isArray(about.values) ? about.values : [];

      return `
        <div class="admin-content-section" data-section="about">
          <div class="admin-content-card glass">
            <div class="admin-content-card__head">
              <div>
                <span>محتوى صفحة عن المنصة</span>
                <h2>عن Mon Médecin</h2>
              </div>
              <span class="admin-content-card__icon">ℹ️</span>
            </div>
            <form id="adminContentAboutForm" class="admin-content-form">
              <label class="admin-content-field">
                <span>العنوان</span>
                <input id="aboutTitle" type="text" value="${this.escapeHTML(about.title || "")}" maxlength="100" />
              </label>
              <label class="admin-content-field">
                <span>الوصف</span>
                <textarea id="aboutDescription" rows="4" maxlength="1000">${this.escapeHTML(about.description || "")}</textarea>
              </label>
              <label class="admin-content-field">
                <span>الرسالة</span>
                <input id="aboutMission" type="text" value="${this.escapeHTML(about.mission || "")}" maxlength="200" />
              </label>
              <label class="admin-content-field">
                <span>الرؤية</span>
                <input id="aboutVision" type="text" value="${this.escapeHTML(about.vision || "")}" maxlength="200" />
              </label>
              <label class="admin-content-field">
                <span>القيم (سطر واحد لكل قيمة)</span>
                <textarea id="aboutValues" rows="4" placeholder="أدخل كل قيمة في سطر منفصل">${this.escapeHTML(values.join("\n"))}</textarea>
                <span class="helper">أدخل كل قيمة في سطر منفصل</span>
              </label>
              <button class="admin-content-submit" type="submit">حفظ التغييرات</button>
              <button class="admin-content-reset" type="button" data-reset-section="about">إعادة تعيين إلى الافتراضي</button>
            </form>
          </div>
        </div>
      `;
    },

    renderContactSection: function () {
      const contact = this.getSection("contact");
      const social = contact.social || {};

      return `
        <div class="admin-content-section" data-section="contact">
          <div class="admin-content-card glass">
            <div class="admin-content-card__head">
              <div>
                <span>معلومات الاتصال</span>
                <h2>التواصل</h2>
              </div>
              <span class="admin-content-card__icon">📞</span>
            </div>
            <form id="adminContentContactForm" class="admin-content-form">
              <label class="admin-content-field">
                <span>العنوان</span>
                <input id="contactAddress" type="text" value="${this.escapeHTML(contact.address || "")}" maxlength="200" />
              </label>
              <label class="admin-content-field">
                <span>رقم الهاتف</span>
                <input id="contactPhone" type="text" value="${this.escapeHTML(contact.phone || "")}" maxlength="20" dir="ltr" />
              </label>
              <label class="admin-content-field">
                <span>البريد الإلكتروني</span>
                <input id="contactEmail" type="email" value="${this.escapeHTML(contact.email || "")}" maxlength="100" dir="ltr" />
              </label>
              <label class="admin-content-field">
                <span>ساعات العمل</span>
                <input id="contactWorkingHours" type="text" value="${this.escapeHTML(contact.workingHours || "")}" maxlength="100" />
              </label>
              <label class="admin-content-field">
                <span>فيسبوك</span>
                <input id="contactSocialFacebook" type="url" value="${this.escapeHTML(social.facebook || "")}" maxlength="200" dir="ltr" placeholder="https://facebook.com/..." />
              </label>
              <label class="admin-content-field">
                <span>إنستغرام</span>
                <input id="contactSocialInstagram" type="url" value="${this.escapeHTML(social.instagram || "")}" maxlength="200" dir="ltr" placeholder="https://instagram.com/..." />
              </label>
              <label class="admin-content-field">
                <span>تويتر</span>
                <input id="contactSocialTwitter" type="url" value="${this.escapeHTML(social.twitter || "")}" maxlength="200" dir="ltr" placeholder="https://twitter.com/..." />
              </label>
              <label class="admin-content-field">
                <span>لينكد إن</span>
                <input id="contactSocialLinkedin" type="url" value="${this.escapeHTML(social.linkedin || "")}" maxlength="200" dir="ltr" placeholder="https://linkedin.com/..." />
              </label>
              <button class="admin-content-submit" type="submit">حفظ التغييرات</button>
              <button class="admin-content-reset" type="button" data-reset-section="contact">إعادة تعيين إلى الافتراضي</button>
            </form>
          </div>
        </div>
      `;
    },

    renderFaqSection: function () {
      const faq = this.getSection("faq");
      const items = Array.isArray(faq) ? faq : [];

      return `
        <div class="admin-content-section" data-section="faq">
          <div class="admin-content-card glass">
            <div class="admin-content-card__head">
              <div>
                <span>الأسئلة الشائعة</span>
                <h2>FAQ</h2>
              </div>
              <span class="admin-content-card__icon">❓</span>
            </div>
            <form id="adminContentFaqForm" class="admin-content-form">
              <label class="admin-content-field">
                <span>الأسئلة والأجوبة (سؤال:جواب)</span>
                <textarea id="faqItems" rows="10" placeholder="أدخل كل سؤال وجواب في سطر منفصل، مفصولاً بنقطتين (:)">${items.map(function(item) { return item.question + ":" + item.answer; }).join("\n")}</textarea>
                <span class="helper">التنسيق: السؤال:الجواب (كل زوج في سطر منفصل)</span>
              </label>
              <button class="admin-content-submit" type="submit">حفظ التغييرات</button>
              <button class="admin-content-reset" type="button" data-reset-section="faq">إعادة تعيين إلى الافتراضي</button>
            </form>
          </div>
        </div>
      `;
    },

    renderFooterSection: function () {
      const footer = this.getSection("footer");
      const links = Array.isArray(footer.links) ? footer.links : [];

      return `
        <div class="admin-content-section" data-section="footer">
          <div class="admin-content-card glass">
            <div class="admin-content-card__head">
              <div>
                <span>محتوى التذييل</span>
                <h2>التذييل</h2>
              </div>
              <span class="admin-content-card__icon">📌</span>
            </div>
            <form id="adminContentFooterForm" class="admin-content-form">
              <label class="admin-content-field">
                <span>حقوق النشر</span>
                <input id="footerCopyright" type="text" value="${this.escapeHTML(footer.copyright || "")}" maxlength="200" />
              </label>
              <label class="admin-content-field">
                <span>روابط التذييل (العنوان|الرابط)</span>
                <textarea id="footerLinks" rows="4" placeholder="أدخل كل رابط في سطر منفصل، مفصولاً بـ |">${links.map(function(link) { return link.title + "|" + link.url; }).join("\n")}</textarea>
                <span class="helper">التنسيق: العنوان|الرابط (كل رابط في سطر منفصل)</span>
              </label>
              <button class="admin-content-submit" type="submit">حفظ التغييرات</button>
              <button class="admin-content-reset" type="button" data-reset-section="footer">إعادة تعيين إلى الافتراضي</button>
            </form>
          </div>
        </div>
      `;
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadContent();
      const isMobile = state.deviceMode === "mobile";

      return `
        <main class="admin-content ${isMobile ? "mobile-app-page has-bottom-nav" : "website-page"}">
          <div class="admin-content__orb admin-content__orb--blue"></div>
          <div class="admin-content__orb admin-content__orb--cyan"></div>

          <header class="admin-content__header">
            <button id="adminContentBack" class="admin-content__back" type="button">→</button>
            <div class="admin-content__header-copy">
              <strong>إدارة المحتوى</strong>
              <span>تحرير محتوى المنصة</span>
            </div>
            <button id="adminContentTheme" class="admin-content__theme" type="button">${state.theme === "dark" ? "☀" : "◐"}</button>
          </header>

          <section class="admin-content__container">
            <section class="admin-content__hero">
              <span>📝</span>
              <h1>المحتوى</h1>
              <p>إدارة وتحرير محتوى صفحات المنصة بسهولة.</p>
            </section>

            <div class="admin-content-tabs">
              <button class="admin-content-tab ${this.selectedTab === "home" ? "is-active" : ""}" data-tab="home" type="button">🏠 الرئيسية</button>
              <button class="admin-content-tab ${this.selectedTab === "about" ? "is-active" : ""}" data-tab="about" type="button">ℹ️ عن المنصة</button>
              <button class="admin-content-tab ${this.selectedTab === "contact" ? "is-active" : ""}" data-tab="contact" type="button">📞 التواصل</button>
              <button class="admin-content-tab ${this.selectedTab === "faq" ? "is-active" : ""}" data-tab="faq" type="button">❓ الأسئلة الشائعة</button>
              <button class="admin-content-tab ${this.selectedTab === "footer" ? "is-active" : ""}" data-tab="footer" type="button">📌 التذييل</button>
            </div>

            <div id="adminContentMessage" class="admin-content-message" hidden></div>

            <div id="adminContentSections">
              ${this.renderHomeSection()}
              ${this.renderAboutSection()}
              ${this.renderContactSection()}
              ${this.renderFaqSection()}
              ${this.renderFooterSection()}
            </div>
          </section>

          ${isMobile ? `
            <nav class="mobile-bottom-nav">
              <button class="mobile-bottom-nav__item" data-nav="dashboard" type="button">
                <span class="mobile-bottom-nav__icon">⌂</span>
                <span>الرئيسية</span>
              </button>
              <button class="mobile-bottom-nav__item" data-nav="doctors" type="button">
                <span class="mobile-bottom-nav__icon">✚</span>
                <span>الأطباء</span>
              </button>
              <button class="mobile-bottom-nav__item is-active" data-nav="content" type="button">
                <span class="mobile-bottom-nav__icon">📝</span>
                <span>المحتوى</span>
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
       INIT - FIXED
       ================================================== */

    init: function (app) {
      this.loadContent();

      // ================================================
      // BACK BUTTON - FIXED
      // ================================================
      document.getElementById("adminContentBack")?.addEventListener("click", function () {
        app.navigate("/admin/dashboard");
      });

      // ================================================
      // THEME BUTTON - FIXED
      // ================================================
      document.getElementById("adminContentTheme")?.addEventListener("click", function () {
        app.toggleTheme();
        app.render();
      });

      // ================================================
      // TABS - FIXED
      // ================================================
      document.querySelectorAll(".admin-content-tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          const tabName = this.dataset.tab;
          AdminContentScreen.selectedTab = tabName;

          document.querySelectorAll(".admin-content-tab").forEach(function (t) {
            t.classList.toggle("is-active", t === tab);
          });

          document.querySelectorAll(".admin-content-section").forEach(function (section) {
            section.classList.toggle("is-active", section.dataset.section === tabName);
          });
        });
      });

      // ================================================
      // HOME FORM - FIXED
      // ================================================
      document.getElementById("adminContentHomeForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const features = document.getElementById("homeFeatures")?.value || "";
        const featuresArray = features.split("\n").filter(function (f) { return f.trim(); });

        const data = {
          heroTitle: document.getElementById("homeHeroTitle")?.value || "",
          heroSubtitle: document.getElementById("homeHeroSubtitle")?.value || "",
          heroButton: document.getElementById("homeHeroButton")?.value || "",
          features: featuresArray,
          stats: {
            doctors: Number(document.getElementById("homeStatsDoctors")?.value) || 0,
            patients: Number(document.getElementById("homeStatsPatients")?.value) || 0,
            appointments: Number(document.getElementById("homeStatsAppointments")?.value) || 0,
            satisfaction: Number(document.getElementById("homeStatsSatisfaction")?.value) || 0,
          },
        };

        AdminContentScreen.updateSection("home", data);
        AdminContentScreen.showMessage("تم حفظ محتوى الصفحة الرئيسية.", "success");
      });

      // ================================================
      // ABOUT FORM - FIXED
      // ================================================
      document.getElementById("adminContentAboutForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const values = document.getElementById("aboutValues")?.value || "";
        const valuesArray = values.split("\n").filter(function (v) { return v.trim(); });

        const data = {
          title: document.getElementById("aboutTitle")?.value || "",
          description: document.getElementById("aboutDescription")?.value || "",
          mission: document.getElementById("aboutMission")?.value || "",
          vision: document.getElementById("aboutVision")?.value || "",
          values: valuesArray,
        };

        AdminContentScreen.updateSection("about", data);
        AdminContentScreen.showMessage("تم حفظ محتوى صفحة عن المنصة.", "success");
      });

      // ================================================
      // CONTACT FORM - FIXED
      // ================================================
      document.getElementById("adminContentContactForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const data = {
          address: document.getElementById("contactAddress")?.value || "",
          phone: document.getElementById("contactPhone")?.value || "",
          email: document.getElementById("contactEmail")?.value || "",
          workingHours: document.getElementById("contactWorkingHours")?.value || "",
          social: {
            facebook: document.getElementById("contactSocialFacebook")?.value || "",
            instagram: document.getElementById("contactSocialInstagram")?.value || "",
            twitter: document.getElementById("contactSocialTwitter")?.value || "",
            linkedin: document.getElementById("contactSocialLinkedin")?.value || "",
          },
        };

        AdminContentScreen.updateSection("contact", data);
        AdminContentScreen.showMessage("تم حفظ معلومات الاتصال.", "success");
      });

      // ================================================
      // FAQ FORM - FIXED
      // ================================================
      document.getElementById("adminContentFaqForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const items = document.getElementById("faqItems")?.value || "";
        const faqArray = items.split("\n").filter(function (line) { return line.trim(); }).map(function (line) {
          const parts = line.split(":").map(function (s) { return s.trim(); });
          return {
            question: parts[0] || "",
            answer: parts.slice(1).join(":") || "",
          };
        }).filter(function (item) {
          return item.question && item.answer;
        });

        AdminContentScreen.updateSection("faq", faqArray);
        AdminContentScreen.showMessage("تم حفظ الأسئلة الشائعة.", "success");
      });

      // ================================================
      // FOOTER FORM - FIXED
      // ================================================
      document.getElementById("adminContentFooterForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const links = document.getElementById("footerLinks")?.value || "";
        const linksArray = links.split("\n").filter(function (line) { return line.trim(); }).map(function (line) {
          const parts = line.split("|").map(function (s) { return s.trim(); });
          return {
            title: parts[0] || "",
            url: parts.slice(1).join("|") || "",
          };
        }).filter(function (item) {
          return item.title && item.url;
        });

        const data = {
          copyright: document.getElementById("footerCopyright")?.value || "",
          links: linksArray,
        };

        AdminContentScreen.updateSection("footer", data);
        AdminContentScreen.showMessage("تم حفظ محتوى التذييل.", "success");
      });

      // ================================================
      // RESET BUTTONS - FIXED
      // ================================================
      document.querySelectorAll("[data-reset-section]").forEach(function (button) {
        button.addEventListener("click", function (event) {
          event.preventDefault();
          const section = this.dataset.resetSection;
          const confirmed = window.confirm("هل تريد إعادة تعيين محتوى هذا القسم إلى الإعدادات الافتراضية؟");
          if (confirmed) {
            AdminContentScreen.resetSection(section);
            app.render();
          }
        });
      });

      // ================================================
      // BOTTOM NAV - FIXED
      // ================================================
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/dashboard");
        });
      });

      document.querySelectorAll("[data-nav='doctors']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/doctors");
        });
      });

      document.querySelectorAll("[data-nav='content']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/content");
        });
      });

      document.querySelectorAll("[data-nav='settings']")?.forEach(function (btn) {
        btn.addEventListener("click", function () {
          app.navigate("/admin/settings");
        });
      });
    }
  };

  window.AdminContentScreen = AdminContentScreen;

})();