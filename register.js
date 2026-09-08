/* =========================================================
   MON MÉDECIN
   PATIENT REGISTER - FIXED
   ---------------------------------------------------------
   FIXED:
   - Check email/phone against all user types (doctors, secretaries)
   - Better validation
   - Auto-login after registration
   ========================================================= */

(function () {

  "use strict";


  const RegisterScreen = {


    /* =====================================================
       STATE
       ===================================================== */

    loading:
      false,

    messageTimer:
      null,

    passwordVisible:
      false,

    confirmPasswordVisible:
      false,


    /* =====================================================
       STORAGE - FIXED: Uses helpers
       ===================================================== */

    readJSON:
      function (
        storage,
        key,
        fallback
      ) {

        try {

          const raw =
            storage.getItem(
              key
            );


          if (!raw) {

            return fallback;

          }


          return JSON.parse(
            raw
          );

        } catch (
          error
        ) {

          console.warn(
            "MON MÉDECIN REGISTER:",
            key,
            error
          );


          return fallback;

        }

      },


    writeJSON:
      function (
        storage,
        key,
        value
      ) {

        try {

          storage.setItem(
            key,
            JSON.stringify(
              value
            )
          );


          return true;

        } catch (
          error
        ) {

          console.warn(
            "MON MÉDECIN REGISTER WRITE:",
            key,
            error
          );


          return false;

        }

      },


    getPatients:
      function () {

        const value =
          this.readJSON(
            localStorage,
            "monmedecin-patients",
            []
          );


        return Array.isArray(
          value
        )
          ? value
          : [];

      },


    savePatients:
      function (
        patients
      ) {

        return this.writeJSON(
          localStorage,
          "monmedecin-patients",
          patients
        );

      },


    /* =====================================================
       GET ALL USERS - FIXED: Check all user types
       ===================================================== */

    getAllUsers:
      function () {

        const patients =
          this.getPatients();


        const doctors =
          this.readJSON(
            localStorage,
            "monmedecin-doctors",
            []
          );


        const secretaries =
          this.readJSON(
            localStorage,
            "monmedecin-secretaries",
            []
          );


        const admins =
          this.readJSON(
            localStorage,
            "monmedecin-admins",
            []
          );


        return {

          patients:
            Array.isArray(patients)
              ? patients
              : [],

          doctors:
            Array.isArray(doctors)
              ? doctors
              : [],

          secretaries:
            Array.isArray(secretaries)
              ? secretaries
              : [],

          admins:
            Array.isArray(admins)
              ? admins
              : []

        };

      },


    /* =====================================================
       NORMALIZATION
       ===================================================== */

    normalizePhone:
      function (
        value
      ) {

        return String(
          value || ""
        )
          .trim()
          .replace(
            /\s+/g,
            ""
          )
          .replace(
            /-/g,
            ""
          );

      },


    normalizeEmail:
      function (
        value
      ) {

        return String(
          value || ""
        )
          .trim()
          .toLowerCase();

      },


    normalizeName:
      function (
        value
      ) {

        return String(
          value || ""
        )
          .trim()
          .replace(
            /\s+/g,
            " "
          );

      },


    /* =====================================================
       ID
       ===================================================== */

    createPatientId:
      function () {

        return (

          "PAT-" +

          Date.now()
            .toString(36)
            .toUpperCase()

          +

          "-" +

          Math.random()
            .toString(36)
            .slice(2, 7)
            .toUpperCase()

        );

      },


    /* =====================================================
       VALIDATION
       ===================================================== */

    validatePhone:
      function (
        phone
      ) {

        const value =
          this.normalizePhone(
            phone
          );


        return (
          /^0[5-7][0-9]{8}$/
        ).test(
          value
        );

      },


    validateEmail:
      function (
        email
      ) {

        if (
          !email
        ) {

          return true;

        }


        return (
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        ).test(
          email
        );

      },


    validateForm:
      function (
        data
      ) {

        if (
          data.fullName.length <
          3
        ) {

          return {
            valid:
              false,

            message:
              "أدخل الاسم واللقب بشكل صحيح."
          };

        }


        if (
          !this.validatePhone(
            data.phone
          )
        ) {

          return {
            valid:
              false,

            message:
              "أدخل رقم هاتف جزائري صحيح."
          };

        }


        if (
          !this.validateEmail(
            data.email
          )
        ) {

          return {
            valid:
              false,

            message:
              "البريد الإلكتروني غير صحيح."
          };

        }


        if (
          ![
            "male",
            "female"
          ].includes(
            data.gender
          )
        ) {

          return {
            valid:
              false,

            message:
              "اختر الجنس."
          };

        }


        if (
          data.password.length <
          6
        ) {

          return {
            valid:
              false,

            message:
              "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل."
          };

        }


        if (
          data.password !==
          data.confirmPassword
        ) {

          return {
            valid:
              false,

            message:
              "تأكيد كلمة المرور غير مطابق."
          };

        }


        if (
          !data.acceptTerms
        ) {

          return {
            valid:
              false,

            message:
              "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية."
          };

        }


        return {
          valid:
            true
        };

      },


    /* =====================================================
       CHECK DUPLICATE - FIXED: Check all user types
       ===================================================== */

    findDuplicate:
      function (
        data
      ) {

        const users =
          this.getAllUsers();


        const phone =
          this.normalizePhone(
            data.phone
          );


        const email =
          this.normalizeEmail(
            data.email
          );


        // Check patients
        const patientDuplicate =
          users.patients.find(
            function (
              patient
            ) {

              const samePhone =
                RegisterScreen
                  .normalizePhone(
                    patient.phone
                  ) ===
                phone;


              const sameEmail =
                email &&
                RegisterScreen
                  .normalizeEmail(
                    patient.email
                  ) ===
                email;


              return (
                samePhone ||
                sameEmail
              );

            }
          );


        if (patientDuplicate) {

          return {
            exists: true,
            role: "patient",
            account: patientDuplicate
          };

        }


        // Check doctors
        const doctorDuplicate =
          users.doctors.find(
            function (
              doctor
            ) {

              const samePhone =
                RegisterScreen
                  .normalizePhone(
                    doctor.phone
                  ) ===
                phone;


              const sameEmail =
                email &&
                RegisterScreen
                  .normalizeEmail(
                    doctor.email
                  ) ===
                email;


              return (
                samePhone ||
                sameEmail
              );

            }
          );


        if (doctorDuplicate) {

          return {
            exists: true,
            role: "doctor",
            account: doctorDuplicate
          };

        }


        // Check secretaries
        const secretaryDuplicate =
          users.secretaries.find(
            function (
              secretary
            ) {

              const samePhone =
                RegisterScreen
                  .normalizePhone(
                    secretary.phone
                  ) ===
                phone;


              const sameEmail =
                email &&
                RegisterScreen
                  .normalizeEmail(
                    secretary.email
                  ) ===
                email;


              return (
                samePhone ||
                sameEmail
              );

            }
          );


        if (secretaryDuplicate) {

          return {
            exists: true,
            role: "secretary",
            account: secretaryDuplicate
          };

        }


        // Check admins
        const adminDuplicate =
          users.admins.find(
            function (
              admin
            ) {

              const samePhone =
                RegisterScreen
                  .normalizePhone(
                    admin.phone
                  ) ===
                phone;


              const sameEmail =
                email &&
                RegisterScreen
                  .normalizeEmail(
                    admin.email
                  ) ===
                email;


              return (
                samePhone ||
                sameEmail
              );

            }
          );


        if (adminDuplicate) {

          return {
            exists: true,
            role: "admin",
            account: adminDuplicate
          };

        }


        return {
          exists: false
        };

      },


    /* =====================================================
       CREATE ACCOUNT - FIXED: Auto-login
       ===================================================== */

    createAccount:
      function (
        data
      ) {

        const duplicate =
          this.findDuplicate(
            data
          );


        if (
          duplicate.exists
        ) {

          const roleMap = {
            patient: "مريض",
            doctor: "طبيب",
            secretary: "سكرتير",
            admin: "مدير"
          };


          return {
            success:
              false,

            message:
              "يوجد حساب مسجل مسبقاً بنفس رقم الهاتف أو البريد الإلكتروني (حساب " +
              (roleMap[duplicate.role] || duplicate.role) +
              ")."
          };

        }


        const now =
          new Date()
            .toISOString();


        const id =
          this.createPatientId();


        const patient = {

          id:
            id,

          patient_id:
            id,

          role:
            "patient",

          accountType:
            "patient",

          fullName:
            data.fullName,

          name:
            data.fullName,

          firstName:
            "",

          lastName:
            "",

          phone:
            data.phone,

          email:
            data.email,

          gender:
            data.gender,

          birthDate:
            data.birthDate,

          dateOfBirth:
            data.birthDate,

          wilaya:
            data.wilaya,

          password:
            data.password,

          active:
            true,

          status:
            "active",

          profileCompleted:
            false,

          createdAt:
            now,

          updatedAt:
            now

        };


        const patients =
          this.getPatients();


        patients.push(
          patient
        );


        const saved =
          this.savePatients(
            patients
          );


        if (
          !saved
        ) {

          return {
            success:
              false,

            message:
              "تعذر حفظ الحساب."
          };

        }


        return {
          success:
            true,

          patient:
            patient
        };

      },


    /* =====================================================
       AUTO LOGIN - FIXED: Login after registration
       ===================================================== */

    autoLogin:
      function (
        patient,
        app
      ) {

        if (
          !app ||
          typeof app.login !==
            "function"
        ) {

          // Manual login required
          return false;

        }


        // Create session
        const session = {
          authenticated: true,
          role: "patient",
          userId: patient.id,
          loginAt: new Date().toISOString()
        };


        // Save session
        try {

          localStorage.setItem(
            "monmedecin-session",
            JSON.stringify(session)
          );


          localStorage.setItem(
            "monmedecin-current-user",
            JSON.stringify({
              role: "patient",
              account: patient
            })
          );

        } catch (error) {

          console.warn(
            "Auto-login failed:",
            error
          );


          return false;

        }


        // Update app state
        app.state.authenticated =
          true;


        app.state.role =
          "patient";


        app.state.user =
          patient;


        app.state.patient =
          patient;


        return true;

      },


    /* =====================================================
       MESSAGE
       ===================================================== */

    showMessage:
      function (
        message,
        type
      ) {

        const element =
          document.getElementById(
            "registerMessage"
          );


        if (
          !element
        ) {

          return;

        }


        element.hidden =
          false;


        element.textContent =
          message;


        element.className =
          "register-message " +
          (
            type ===
            "success"
              ? "is-success"
              : "is-error"
          );


        window.clearTimeout(
          this.messageTimer
        );


        this.messageTimer =
          window.setTimeout(
            function () {

              if (
                document.body.contains(
                  element
                )
              ) {

                element.hidden =
                  true;

              }

            },
            4000
          );

      },


    /* =====================================================
       LOADING
       ===================================================== */

    setLoading:
      function (
        value
      ) {

        this.loading =
          Boolean(
            value
          );


        const button =
          document.getElementById(
            "registerSubmit"
          );


        if (
          !button
        ) {

          return;

        }


        button.disabled =
          this.loading;


        button.innerHTML =
          this.loading
            ? `

              <span
                class="register-spinner"
              ></span>

              <span>
                جاري إنشاء الحساب...
              </span>

            `
            : `

              <span>
                إنشاء الحساب
              </span>

              <b>
                ←
              </b>

            `;

      },


    /* =====================================================
       GET FORM
       ===================================================== */

    getFormData:
      function () {

        return {

          fullName:
            this.normalizeName(
              document
                .getElementById(
                  "registerFullName"
                )
                ?.value
            ),

          phone:
            this.normalizePhone(
              document
                .getElementById(
                  "registerPhone"
                )
                ?.value
            ),

          email:
            this.normalizeEmail(
              document
                .getElementById(
                  "registerEmail"
                )
                ?.value
            ),

          gender:
            document
              .getElementById(
                "registerGender"
              )
              ?.value || "",

          birthDate:
            document
              .getElementById(
                "registerBirthDate"
              )
              ?.value || "",

          wilaya:
            document
              .getElementById(
                "registerWilaya"
              )
              ?.value || "",

          password:
            String(
              document
                .getElementById(
                  "registerPassword"
                )
                ?.value || ""
            ),

          confirmPassword:
            String(
              document
                .getElementById(
                  "registerConfirmPassword"
                )
                ?.value || ""
            ),

          acceptTerms:
            Boolean(
              document
                .getElementById(
                  "registerTerms"
                )
                ?.checked
            )

        };

      },


    /* =====================================================
       WILAYAS
       ===================================================== */

    getWilayas:
      function () {

        return [

          "Adrar",
          "Chlef",
          "Laghouat",
          "Oum El Bouaghi",
          "Batna",
          "Béjaïa",
          "Biskra",
          "Béchar",
          "Blida",
          "Bouira",
          "Tamanrasset",
          "Tébessa",
          "Tlemcen",
          "Tiaret",
          "Tizi Ouzou",
          "Alger",
          "Djelfa",
          "Jijel",
          "Sétif",
          "Saïda",
          "Skikda",
          "Sidi Bel Abbès",
          "Annaba",
          "Guelma",
          "Constantine",
          "Médéa",
          "Mostaganem",
          "M'Sila",
          "Mascara",
          "Ouargla",
          "Oran",
          "El Bayadh",
          "Illizi",
          "Bordj Bou Arréridj",
          "Boumerdès",
          "El Tarf",
          "Tindouf",
          "Tissemsilt",
          "El Oued",
          "Khenchela",
          "Souk Ahras",
          "Tipaza",
          "Mila",
          "Aïn Defla",
          "Naâma",
          "Aïn Témouchent",
          "Ghardaïa",
          "Relizane",
          "Timimoun",
          "Bordj Badji Mokhtar",
          "Ouled Djellal",
          "Béni Abbès",
          "In Salah",
          "In Guezzam",
          "Touggourt",
          "Djanet",
          "El M'Ghair",
          "El Meniaa"

        ];

      },


    renderWilayas:
      function () {

        return this
          .getWilayas()
          .map(
            function (
              wilaya
            ) {

              return `

                <option
                  value="${wilaya}"
                >
                  ${wilaya}
                </option>

              `;

            }
          )
          .join("");

      },


    /* =====================================================
       RENDER
       ===================================================== */

    render:
      function (
        state,
        app
      ) {

        return `

          <main
            class="register-page"
          >


            <!-- DECORATION -->

            <div
              class="
                register-orb
                register-orb--one
              "
            ></div>


            <div
              class="
                register-orb
                register-orb--two
              "
            ></div>


            <!-- WEBSITE HEADER -->

            <header
              class="register-site-header"
            >


              <button
                id="registerSiteBrand"
                class="register-site-brand"
                type="button"
              >

                <span
                  class="register-site-brand__logo"
                >
                  +
                </span>


                <span>

                  <strong>
                    Mon Médecin
                  </strong>

                  <small>
                    Votre santé, plus proche.
                  </small>

                </span>

              </button>


              <nav
                class="register-site-nav"
              >

                <button
                  id="registerHome"
                  type="button"
                >
                  الرئيسية
                </button>


                <button
                  id="registerLoginDesktop"
                  type="button"
                >
                  تسجيل الدخول
                </button>


                <button
                  id="registerTheme"
                  class="register-theme"
                  type="button"
                  aria-label="تغيير المظهر"
                >
                  ${
                    state.theme ===
                    "dark"
                      ? "☀"
                      : "◐"
                  }
                </button>

              </nav>


            </header>


            <!-- LAYOUT -->

            <section
              class="register-layout"
            >


              <!-- =======================================
                   VISUAL
                   ======================================= -->

              <section
                class="register-visual"
              >


                <div
                  class="register-visual__content"
                >


                  <span
                    class="register-visual__badge"
                  >
                    PATIENT ACCOUNT
                  </span>


                  <h1>
                    حسابك الصحي
                    <span>
                      يبدأ من هنا.
                    </span>
                  </h1>


                  <p>
                    أنشئ حسابًا واحدًا للبحث عن الأطباء، حجز المواعيد ومتابعة حالة كل زيارة طبية.
                  </p>


                  <!-- VISUAL CARD -->

                  <div
                    class="register-medical-card"
                  >


                    <div
                      class="register-medical-card__top"
                    >

                      <span
                        class="register-medical-logo"
                      >
                        +
                      </span>


                      <div>

                        <small>
                          MON MÉDECIN
                        </small>

                        <strong>
                          Patient Profile
                        </strong>

                      </div>

                    </div>


                    <div
                      class="register-profile-preview"
                    >


                      <div
                        class="register-profile-preview__avatar"
                      >
                        👤
                      </div>


                      <div>

                        <span>
                          Mon compte
                        </span>

                        <strong>
                          Votre espace santé
                        </strong>

                        <small>
                          Rendez-vous • Médecins • Suivi
                        </small>

                      </div>


                    </div>


                    <div
                      class="register-mini-grid"
                    >


                      <div>

                        <span>
                          📅
                        </span>

                        <strong>
                          Rendez-vous
                        </strong>

                      </div>


                      <div>

                        <span>
                          🩺
                        </span>

                        <strong>
                          Médecins
                        </strong>

                      </div>


                      <div>

                        <span>
                          🔔
                        </span>

                        <strong>
                          Suivi
                        </strong>

                      </div>


                    </div>


                  </div>


                  <!-- BENEFITS -->

                  <div
                    class="register-benefits"
                  >


                    <div>

                      <span>
                        ✓
                      </span>

                      <p>
                        التسجيل مخصص للمريض
                      </p>

                    </div>


                    <div>

                      <span>
                        ✓
                      </span>

                      <p>
                        لا حاجة لتأكيد الحساب في هذه النسخة
                      </p>

                    </div>


                    <div>

                      <span>
                        ✓
                      </span>

                      <p>
                        تستطيع تسجيل الدخول مباشرة بعد الإنشاء
                      </p>

                    </div>


                  </div>


                </div>


              </section>


              <!-- =======================================
                   FORM PANEL
                   ======================================= -->

              <section
                class="register-panel"
              >


                <!-- MOBILE TOP -->

                <div
                  class="register-mobile-top"
                >


                  <button
                    id="registerBack"
                    class="register-mobile-icon"
                    type="button"
                    aria-label="العودة"
                  >
                    →
                  </button>


                  <div
                    class="register-mobile-brand"
                  >

                    <span>
                      +
                    </span>

                    <strong>
                      Mon Médecin
                    </strong>

                  </div>


                  <button
                    id="registerMobileTheme"
                    class="register-mobile-icon"
                    type="button"
                    aria-label="تغيير المظهر"
                  >
                    ${
                      state.theme ===
                      "dark"
                        ? "☀"
                        : "◐"
                    }
                  </button>


                </div>


                <!-- FORM CARD -->

                <div
                  class="register-box"
                >


                  <div
                    class="register-box__icon"
                  >
                    <span>
                      +
                    </span>
                  </div>


                  <header
                    class="register-box__header"
                  >


                    <span>
                      NEW PATIENT
                    </span>


                    <h2>
                      إنشاء حساب
                    </h2>


                    <p>
                      أدخل معلوماتك الأساسية لإنشاء حساب مريض.
                    </p>


                  </header>


                  <!-- MESSAGE -->

                  <div
                    id="registerMessage"
                    class="register-message"
                    hidden
                  ></div>


                  <!-- FORM -->

                  <form
                    id="registerForm"
                    class="register-form"
                    novalidate
                  >


                    <!-- FULL NAME -->

                    <label
                      class="
                        register-field
                        register-field--full
                      "
                    >

                      <span
                        class="register-field__label"
                      >
                        الاسم واللقب
                      </span>


                      <div
                        class="register-input"
                      >

                        <span
                          class="register-input__icon"
                        >
                          👤
                        </span>


                        <input
                          id="registerFullName"
                          type="text"
                          autocomplete="name"
                          placeholder="مثال: محمد بن علي"
                        >

                      </div>

                    </label>


                    <!-- PHONE -->

                    <label
                      class="register-field"
                    >

                      <span
                        class="register-field__label"
                      >
                        رقم الهاتف
                      </span>


                      <div
                        class="register-input"
                      >

                        <span
                          class="register-input__icon"
                        >
                          📱
                        </span>


                        <input
                          id="registerPhone"
                          type="tel"
                          autocomplete="tel"
                          inputmode="tel"
                          placeholder="0550 00 00 00"
                        >

                      </div>

                    </label>


                    <!-- EMAIL -->

                    <label
                      class="register-field"
                    >

                      <span
                        class="register-field__label"
                      >
                        البريد الإلكتروني

                        <small>
                          اختياري
                        </small>
                      </span>


                      <div
                        class="register-input"
                      >

                        <span
                          class="register-input__icon"
                        >
                          ✉
                        </span>


                        <input
                          id="registerEmail"
                          type="email"
                          autocomplete="email"
                          placeholder="example@email.com"
                        >

                      </div>

                    </label>


                    <!-- GENDER -->

                    <label
                      class="register-field"
                    >

                      <span
                        class="register-field__label"
                      >
                        الجنس
                      </span>


                      <div
                        class="register-select"
                      >

                        <select
                          id="registerGender"
                        >

                          <option value="">
                            اختر الجنس
                          </option>

                          <option value="male">
                            ذكر
                          </option>

                          <option value="female">
                            أنثى
                          </option>

                        </select>

                      </div>

                    </label>


                    <!-- BIRTH -->

                    <label
                      class="register-field"
                    >

                      <span
                        class="register-field__label"
                      >
                        تاريخ الميلاد
                      </span>


                      <div
                        class="register-input"
                      >

                        <span
                          class="register-input__icon"
                        >
                          📅
                        </span>


                        <input
                          id="registerBirthDate"
                          type="date"
                        >

                      </div>

                    </label>


                    <!-- WILAYA -->

                    <label
                      class="
                        register-field
                        register-field--full
                      "
                    >

                      <span
                        class="register-field__label"
                      >
                        الولاية
                      </span>


                      <div
                        class="register-select"
                      >

                        <select
                          id="registerWilaya"
                        >

                          <option value="">
                            اختر الولاية
                          </option>

                          ${this.renderWilayas()}

                        </select>

                      </div>

                    </label>


                    <!-- PASSWORD -->

                    <label
                      class="register-field"
                    >

                      <span
                        class="register-field__label"
                      >
                        كلمة المرور
                      </span>


                      <div
                        class="register-input"
                      >

                        <span
                          class="register-input__icon"
                        >
                          🔒
                        </span>


                        <input
                          id="registerPassword"
                          type="password"
                          autocomplete="new-password"
                          placeholder="6 أحرف على الأقل"
                        >


                        <button
                          id="registerPasswordToggle"
                          class="register-password-toggle"
                          type="button"
                          aria-label="إظهار كلمة المرور"
                        >
                          👁
                        </button>

                      </div>

                    </label>


                    <!-- CONFIRM PASSWORD -->

                    <label
                      class="register-field"
                    >

                      <span
                        class="register-field__label"
                      >
                        تأكيد كلمة المرور
                      </span>


                      <div
                        class="register-input"
                      >

                        <span
                          class="register-input__icon"
                        >
                          ✓
                        </span>


                        <input
                          id="registerConfirmPassword"
                          type="password"
                          autocomplete="new-password"
                          placeholder="أعد كتابة كلمة المرور"
                        >


                        <button
                          id="registerConfirmPasswordToggle"
                          class="register-password-toggle"
                          type="button"
                          aria-label="إظهار تأكيد كلمة المرور"
                        >
                          👁
                        </button>

                      </div>

                    </label>


                    <!-- TERMS -->

                    <label
                      class="
                        register-terms
                        register-field--full
                      "
                    >

                      <input
                        id="registerTerms"
                        type="checkbox"
                      >


                      <span>
                        أوافق على شروط الاستخدام وسياسة الخصوصية وحماية البيانات.
                      </span>

                    </label>


                    <!-- SUBMIT -->

                    <button
                      id="registerSubmit"
                      class="
                        register-submit
                        register-field--full
                      "
                      type="submit"
                    >

                      <span>
                        إنشاء الحساب
                      </span>

                      <b>
                        ←
                      </b>

                    </button>


                  </form>


                  <!-- LOGIN -->

                  <div
                    class="register-login"
                  >

                    <span>
                      لديك حساب بالفعل؟
                    </span>


                    <button
                      id="registerLogin"
                      type="button"
                    >
                      تسجيل الدخول
                    </button>

                  </div>


                  <!-- STAFF -->

                  <div
                    class="register-staff-note"
                  >

                    <span>
                      ⚕
                    </span>


                    <p>
                      حساب الطبيب يُنشأ من الإدارة، وحساب السكرتير أو السكرتيرة يُنشئه الطبيب.
                    </p>

                  </div>


                </div>


              </section>


            </section>


          </main>

        `;

      },


    /* =====================================================
       INIT - FIXED
       ===================================================== */

    init:
      function (
        app
      ) {


        /* ==============================================
           HOME
           ============================================== */

        [
          "registerSiteBrand",
          "registerHome"
        ]
          .forEach(
            function (
              id
            ) {

              document
                .getElementById(
                  id
                )
                ?.addEventListener(
                  "click",
                  function () {

                    app.navigate(
                      "/splash"
                    );

                  }
                );

            }
          );


        /* ==============================================
           BACK / LOGIN
           ============================================== */

        [
          "registerBack",
          "registerLogin",
          "registerLoginDesktop"
        ]
          .forEach(
            function (
              id
            ) {

              document
                .getElementById(
                  id
                )
                ?.addEventListener(
                  "click",
                  function () {

                    app.navigate(
                      "/login"
                    );

                  }
                );

            }
          );


        /* ==============================================
           THEME
           ============================================== */

        [
          "registerTheme",
          "registerMobileTheme"
        ]
          .forEach(
            function (
              id
            ) {

              document
                .getElementById(
                  id
                )
                ?.addEventListener(
                  "click",
                  function () {

                    app.toggleTheme();

                    app.render();

                  }
                );

            }
          );


        /* ==============================================
           PASSWORD
           ============================================== */

        document
          .getElementById(
            "registerPasswordToggle"
          )
          ?.addEventListener(
            "click",
            function () {

              const input =
                document
                  .getElementById(
                    "registerPassword"
                  );


              if (!input) {

                return;

              }


              RegisterScreen
                .passwordVisible =
                !RegisterScreen
                  .passwordVisible;


              input.type =
                RegisterScreen
                  .passwordVisible
                    ? "text"
                    : "password";


              this.textContent =
                RegisterScreen
                  .passwordVisible
                    ? "🙈"
                    : "👁";

            }
          );


        /* ==============================================
           CONFIRM PASSWORD
           ============================================== */

        document
          .getElementById(
            "registerConfirmPasswordToggle"
          )
          ?.addEventListener(
            "click",
            function () {

              const input =
                document
                  .getElementById(
                    "registerConfirmPassword"
                  );


              if (!input) {

                return;

              }


              RegisterScreen
                .confirmPasswordVisible =
                !RegisterScreen
                  .confirmPasswordVisible;


              input.type =
                RegisterScreen
                  .confirmPasswordVisible
                    ? "text"
                    : "password";


              this.textContent =
                RegisterScreen
                  .confirmPasswordVisible
                    ? "🙈"
                    : "👁";

            }
          );


        /* ==============================================
           SUBMIT - FIXED: Auto-login after registration
           ============================================== */

        document
          .getElementById(
            "registerForm"
          )
          ?.addEventListener(
            "submit",
            function (
              event
            ) {

              event.preventDefault();


              if (
                RegisterScreen.loading
              ) {

                return;

              }


              const data =
                RegisterScreen
                  .getFormData();


              const validation =
                RegisterScreen
                  .validateForm(
                    data
                  );


              if (
                !validation.valid
              ) {

                RegisterScreen
                  .showMessage(
                    validation.message,
                    "error"
                  );


                return;

              }


              RegisterScreen
                .setLoading(
                  true
                );


              const result =
                RegisterScreen
                  .createAccount(
                    data
                  );


              RegisterScreen
                .setLoading(
                  false
                );


              if (
                !result.success
              ) {

                RegisterScreen
                  .showMessage(
                    result.message,
                    "error"
                  );


                return;

              }


              RegisterScreen
                .showMessage(
                  "تم إنشاء حسابك بنجاح. جاري تسجيل الدخول...",
                  "success"
                );


              // Auto-login
              const loggedIn =
                RegisterScreen
                  .autoLogin(
                    result.patient,
                    app
                  );


              if (loggedIn) {

                window.setTimeout(
                  function () {

                    app.navigate(
                      "/patient/home"
                    );

                  },
                  650
                );

              } else {

                window.setTimeout(
                  function () {

                    app.navigate(
                      "/login"
                    );

                  },
                  650
                );

              }

            }
          );

      }

  };


  /* =====================================================
     EXPOSE
     ===================================================== */

  window.RegisterScreen =
    RegisterScreen;

  window.PatientRegisterScreen =
    RegisterScreen;


})();