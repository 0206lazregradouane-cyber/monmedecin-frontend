/* =====================================================
   MON MÉDECIN
   ADMIN PATIENTS

   FILE:// COMPATIBLE VERSION

   FEATURES:
   - Patients list
   - Search by name / phone
   - Active / inactive filters
   - Appointment counters
   - Last appointment
   - Enable / disable patient account
   - Patient details
   - Shared localStorage data
   ===================================================== */

(function () {

  "use strict";


  const AdminPatientsScreen = {


    /* ==================================================
       STATE
       ================================================== */

    patients: [],

    appointments: [],

    filteredPatients: [],

    selectedPatientId: null,

    filters: {

      query: "",

      status: ""

    },

    messageTimer: null,


    /* ==================================================
       STORAGE
       ================================================== */

    readJSON:
      function (
        storage,
        key,
        fallback
      ) {

        try {

          const value =
            storage.getItem(
              key
            );


          if (!value) {

            return fallback;

          }


          return JSON.parse(
            value
          );

        } catch (
          error
        ) {

          console.warn(
            "MON MÉDECIN:",
            "Cannot read",
            key
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
            "MON MÉDECIN:",
            "Cannot save",
            key
          );


          return false;

        }

      },


    /* ==================================================
       ESCAPE
       ================================================== */

    escapeHTML:
      function (
        value
      ) {

        return String(
          value ?? ""
        )
          .replace(
            /&/g,
            "&amp;"
          )
          .replace(
            /</g,
            "&lt;"
          )
          .replace(
            />/g,
            "&gt;"
          )
          .replace(
            /"/g,
            "&quot;"
          )
          .replace(
            /'/g,
            "&#039;"
          );

      },


    /* ==================================================
       NORMALIZE TEXT
       ================================================== */

    normalizeText:
      function (
        value
      ) {

        return String(
          value || ""
        )
          .toLowerCase()
          .trim()
          .replace(
            /[\u064B-\u065F\u0670]/g,
            ""
          )
          .replace(
            /[أإآ]/g,
            "ا"
          )
          .replace(
            /ى/g,
            "ي"
          )
          .replace(
            /ؤ/g,
            "و"
          )
          .replace(
            /ئ/g,
            "ي"
          )
          .replace(
            /ة/g,
            "ه"
          );

      },


    /* ==================================================
       NORMALIZE PATIENT
       ================================================== */

    normalizePatient:
      function (
        patient,
        index
      ) {

        if (
          !patient ||
          typeof patient !==
            "object"
        ) {

          return null;

        }


        const fullName =

          patient.fullName ||

          patient.name ||

          [

            patient.firstName,

            patient.lastName

          ]
            .filter(
              Boolean
            )
            .join(" ")

          ||

          "مريض";


        return {

          ...patient,

          id:
            patient.id ??
            patient.patient_id ??
            patient.phone ??
            `PATIENT-${index + 1}`,

          fullName:
            fullName,

          phone:
            patient.phone ??
            "",

          email:
            patient.email ??
            "",

          wilaya:
            patient.wilaya ??
            "",

          commune:
            patient.commune ??
            "",

          gender:
            patient.gender ??
            "",

          birthDate:
            patient.birthDate ??
            patient.birth_date ??
            "",

          active:
            patient.active !==
              false,

          createdAt:
            patient.createdAt ??
            patient.created_at ??
            "",

          updatedAt:
            patient.updatedAt ??
            patient.updated_at ??
            ""

        };

      },


    /* ==================================================
       NORMALIZE APPOINTMENT
       ================================================== */

    normalizeAppointment:
      function (
        appointment
      ) {

        if (
          !appointment ||
          typeof appointment !==
            "object"
        ) {

          return null;

        }


        return {

          ...appointment,

          id:
            appointment.id ??
            "APT-UNKNOWN",

          patient_id:
            appointment.patient_id ??
            appointment.patientId ??
            null,

          patient_name:
            appointment.patient_name ??
            appointment.patientName ??
            "",

          doctor_id:
            appointment.doctor_id ??
            appointment.doctorId ??
            null,

          doctor_name:
            appointment.doctor_name ??
            appointment.doctorName ??
            "طبيب",

          service_name:
            appointment.service_name ??
            appointment.serviceName ??
            "خدمة طبية",

          date:
            appointment.date ??
            appointment.appointment_date ??
            "",

          time:
            appointment.time ??
            appointment.appointment_time ??
            "",

          status:
            String(
              appointment.status ||
              "pending"
            )
              .trim()
              .toLowerCase()

        };

      },


    /* ==================================================
       LOAD PATIENTS
       ================================================== */

    loadPatients:
      function () {

        let patients =
          this.readJSON(

            localStorage,

            "monmedecin-patients",

            []

          );


        if (
          !Array.isArray(
            patients
          )
        ) {

          patients =
            [];

        }


        this.patients =
          patients
            .map(
              function (
                patient,
                index
              ) {

                return AdminPatientsScreen
                  .normalizePatient(
                    patient,
                    index
                  );

              }
            )
            .filter(
              Boolean
            );


        const selectedId =
          sessionStorage.getItem(
            "monmedecin-admin-selected-patient-id"
          );


        if (
          selectedId &&
          this.patients.some(
            function (
              patient
            ) {

              return (

                String(
                  patient.id
                ) ===
                String(
                  selectedId
                )

              );

            }
          )
        ) {

          this.selectedPatientId =
            selectedId;

        }


        this.applyFilters();


        return this.patients;

      },


    /* ==================================================
       LOAD APPOINTMENTS
       ================================================== */

    loadAppointments:
      function () {

        const sources = [

          this.readJSON(

            localStorage,

            "monmedecin-appointments",

            []

          ),

          this.readJSON(

            localStorage,

            "monmedecin-patient-appointments",

            []

          ),

          this.readJSON(

            localStorage,

            "monmedecin-doctor-appointments",

            []

          )

        ];


        const map =
          new Map();


        sources.forEach(
          function (
            source
          ) {

            if (
              !Array.isArray(
                source
              )
            ) {

              return;

            }


            source.forEach(
              function (
                raw
              ) {

                const appointment =
                  AdminPatientsScreen
                    .normalizeAppointment(
                      raw
                    );


                if (!appointment) {

                  return;

                }


                map.set(

                  String(
                    appointment.id
                  ),

                  appointment

                );

              }
            );

          }
        );


        this.appointments =
          Array.from(
            map.values()
          );


        return this.appointments;

      },


    /* ==================================================
       LOAD DATA
       ================================================== */

    loadData:
      function () {

        this.loadPatients();

        this.loadAppointments();

      },


    /* ==================================================
       SAVE PATIENTS
       ================================================== */

    savePatients:
      function () {

        return this.writeJSON(

          localStorage,

          "monmedecin-patients",

          this.patients

        );

      },


    /* ==================================================
       PATIENT APPOINTMENTS
       ================================================== */

    getPatientAppointments:
      function (
        patientId
      ) {

        return this.appointments
          .filter(
            function (
              appointment
            ) {

              return (

                String(
                  appointment.patient_id
                ) ===
                String(
                  patientId
                )

              );

            }
          )
          .sort(
            function (
              a,
              b
            ) {

              const dateA =
                new Date(
                  `${a.date}T${a.time || "00:00"}`
                );


              const dateB =
                new Date(
                  `${b.date}T${b.time || "00:00"}`
                );


              return (

                dateB.getTime() -
                dateA.getTime()

              );

            }
          );

      },


    getAppointmentCount:
      function (
        patientId
      ) {

        return this
          .getPatientAppointments(
            patientId
          )
          .length;

      },


    getCompletedCount:
      function (
        patientId
      ) {

        return this
          .getPatientAppointments(
            patientId
          )
          .filter(
            function (
              appointment
            ) {

              return (

                appointment.status ===
                "completed"

              );

            }
          )
          .length;

      },


    getCancelledCount:
      function (
        patientId
      ) {

        return this
          .getPatientAppointments(
            patientId
          )
          .filter(
            function (
              appointment
            ) {

              return [

                "cancelled",

                "canceled",

                "rejected"

              ].includes(
                appointment.status
              );

            }
          )
          .length;

      },


    getLastAppointment:
      function (
        patientId
      ) {

        const appointments =
          this.getPatientAppointments(
            patientId
          );


        return (

          appointments[0] ||
          null

        );

      },


    /* ==================================================
       FILTER
       ================================================== */

    matchesQuery:
      function (
        patient
      ) {

        if (
          !this.filters.query
        ) {

          return true;

        }


        const query =
          this.normalizeText(
            this.filters.query
          );


        return [

          patient.fullName,

          patient.phone,

          patient.email,

          patient.wilaya,

          patient.commune,

          patient.id

        ]
          .some(
            function (
              value
            ) {

              return AdminPatientsScreen
                .normalizeText(
                  value
                )
                .includes(
                  query
                );

            }
          );

      },


    matchesStatus:
      function (
        patient
      ) {

        if (
          !this.filters.status
        ) {

          return true;

        }


        if (
          this.filters.status ===
          "active"
        ) {

          return (
            patient.active ===
            true
          );

        }


        if (
          this.filters.status ===
          "inactive"
        ) {

          return (
            patient.active ===
            false
          );

        }


        return true;

      },


    applyFilters:
      function () {

        this.filteredPatients =
          this.patients
            .filter(
              function (
                patient
              ) {

                return (

                  AdminPatientsScreen
                    .matchesQuery(
                      patient
                    )

                  &&

                  AdminPatientsScreen
                    .matchesStatus(
                      patient
                    )

                );

              }
            )
            .sort(
              function (
                a,
                b
              ) {

                if (
                  a.active !==
                  b.active
                ) {

                  return (
                    a.active
                      ? -1
                      : 1
                  );

                }


                return String(
                  a.fullName
                ).localeCompare(
                  String(
                    b.fullName
                  ),
                  "ar"
                );

              }
            );


        return this.filteredPatients;

      },


    /* ==================================================
       COUNTS
       ================================================== */

    countActive:
      function () {

        return this.patients
          .filter(
            function (
              patient
            ) {

              return (
                patient.active ===
                true
              );

            }
          )
          .length;

      },


    countInactive:
      function () {

        return this.patients
          .filter(
            function (
              patient
            ) {

              return (
                patient.active ===
                false
              );

            }
          )
          .length;

      },


    /* ==================================================
       FIND PATIENT
       ================================================== */

    findPatient:
      function (
        patientId
      ) {

        return this.patients
          .find(
            function (
              patient
            ) {

              return (

                String(
                  patient.id
                ) ===
                String(
                  patientId
                )

              );

            }
          ) || null;

      },


    /* ==================================================
       TOGGLE ACTIVE
       ================================================== */

    toggleActive:
      function (
        patientId
      ) {

        const patient =
          this.findPatient(
            patientId
          );


        if (!patient) {

          return false;

        }


        patient.active =
          !patient.active;


        patient.updatedAt =
          new Date()
            .toISOString();


        this.savePatients();


        this.applyFilters();


        this.refresh();


        this.showMessage(

          patient.active
            ? "تم تفعيل حساب المريض."
            : "تم تعطيل حساب المريض.",

          "success"

        );


        return true;

      },


    /* ==================================================
       SELECT PATIENT
       ================================================== */

    selectPatient:
      function (
        patientId
      ) {

        const patient =
          this.findPatient(
            patientId
          );


        if (!patient) {

          return;

        }


        this.selectedPatientId =
          patient.id;


        sessionStorage.setItem(

          "monmedecin-admin-selected-patient-id",

          String(
            patient.id
          )

        );


        this.refreshDetails();

      },


    closeDetails:
      function () {

        this.selectedPatientId =
          null;


        sessionStorage.removeItem(
          "monmedecin-admin-selected-patient-id"
        );


        this.refreshDetails();

      },


    /* ==================================================
       FORMAT DATE
       ================================================== */

    formatDate:
      function (
        value
      ) {

        if (!value) {

          return "—";

        }


        try {

          return new Intl.DateTimeFormat(
            "ar-DZ",
            {

              day:
                "numeric",

              month:
                "short",

              year:
                "numeric"

            }
          ).format(
            new Date(
              `${value}T12:00:00`
            )
          );

        } catch (
          error
        ) {

          return value;

        }

      },


    getGenderLabel:
      function (
        value
      ) {

        const gender =
          String(
            value ||
            ""
          )
            .toLowerCase();


        if (
          gender === "male" ||
          gender === "m" ||
          gender === "homme"
        ) {

          return "ذكر";

        }


        if (
          gender === "female" ||
          gender === "f" ||
          gender === "femme"
        ) {

          return "أنثى";

        }


        return "غير محدد";

      },


    /* ==================================================
       STATUS LABEL
       ================================================== */

    getAppointmentStatusLabel:
      function (
        status
      ) {

        switch (
          status
        ) {

          case "pending":

            return "قيد الانتظار";


          case "confirmed":

            return "مؤكد";


          case "completed":

            return "مكتمل";


          case "cancelled":
          case "canceled":

            return "ملغى";


          case "no_show":
          case "no-show":

            return "عدم حضور";


          case "in_progress":
          case "in-progress":

            return "جاري";


          default:

            return status || "—";

        }

      },


    /* ==================================================
       RENDER PATIENT
       ================================================== */

    renderPatient:
      function (
        patient
      ) {

        const appointmentCount =
          this.getAppointmentCount(
            patient.id
          );


        const lastAppointment =
          this.getLastAppointment(
            patient.id
          );


        return `

          <article
            class="
              admin-patient-card
              glass
              ${
                patient.active
                  ? "is-active"
                  : "is-inactive"
              }
            "
          >


            <div
              class="admin-patient-card__top"
            >


              <div
                class="admin-patient-card__identity"
              >


                <div
                  class="admin-patient-card__avatar"
                >

                  ${
                    this.escapeHTML(
                      String(
                        patient.fullName ||
                        "م"
                      ).charAt(0)
                    )
                  }

                </div>


                <div>

                  <span>
                    مريض
                  </span>

                  <h3>

                    ${
                      this.escapeHTML(
                        patient.fullName
                      )
                    }

                  </h3>

                  <small dir="ltr">

                    ${
                      this.escapeHTML(
                        patient.phone ||
                        "بدون هاتف"
                      )
                    }

                  </small>

                </div>


              </div>


              <span
                class="
                  admin-patient-active
                  ${
                    patient.active
                      ? "is-on"
                      : "is-off"
                  }
                "
              >

                ${
                  patient.active
                    ? "نشط"
                    : "متوقف"
                }

              </span>


            </div>


            <div
              class="admin-patient-card__meta"
            >


              <div>

                <span>
                  الحجوزات
                </span>

                <strong>
                  ${appointmentCount}
                </strong>

              </div>


              <div>

                <span>
                  مكتملة
                </span>

                <strong>

                  ${
                    this.getCompletedCount(
                      patient.id
                    )
                  }

                </strong>

              </div>


              <div>

                <span>
                  ملغاة
                </span>

                <strong>

                  ${
                    this.getCancelledCount(
                      patient.id
                    )
                  }

                </strong>

              </div>


            </div>


            <div
              class="admin-patient-card__last"
            >

              <span>
                آخر موعد
              </span>

              <strong>

                ${
                  lastAppointment
                    ? this.formatDate(
                        lastAppointment.date
                      )
                    : "لا يوجد"
                }

              </strong>

              ${
                lastAppointment
                  ? `

                    <small>

                      مع

                      ${
                        this.escapeHTML(
                          lastAppointment
                            .doctor_name
                        )
                      }

                    </small>

                  `
                  : ""
              }

            </div>


            <div
              class="admin-patient-card__actions"
            >


              <button
                class="is-view"
                data-admin-patient-view="${this.escapeHTML(patient.id)}"
                type="button"
              >
                التفاصيل
              </button>


              <button
                class="
                  ${
                    patient.active
                      ? "is-disable"
                      : "is-enable"
                  }
                "
                data-admin-patient-active="${this.escapeHTML(patient.id)}"
                type="button"
              >

                ${
                  patient.active
                    ? "تعطيل الحساب"
                    : "تفعيل الحساب"
                }

              </button>


            </div>


          </article>

        `;

      },


    /* ==================================================
       RENDER PATIENTS
       ================================================== */

    renderPatients:
      function () {

        if (
          this.filteredPatients
            .length ===
          0
        ) {

          return `

            <section
              class="
                admin-patients-empty
                glass
              "
            >

              <span>
                👤
              </span>

              <h3>
                لا توجد نتائج
              </h3>

              <p>
                لم نجد مرضى مطابقين للبحث أو الفلاتر الحالية.
              </p>

              <button
                id="adminPatientsResetEmpty"
                type="button"
              >
                مسح الفلاتر
              </button>

            </section>

          `;

        }


        return this.filteredPatients
          .map(
            function (
              patient
            ) {

              return AdminPatientsScreen
                .renderPatient(
                  patient
                );

            }
          )
          .join("");

      },


    /* ==================================================
       RENDER APPOINTMENT ROW
       ================================================== */

    renderAppointmentRow:
      function (
        appointment
      ) {

        return `

          <article
            class="admin-patient-detail-appointment"
          >


            <div>

              <span>
                الطبيب
              </span>

              <strong>

                ${
                  this.escapeHTML(
                    appointment.doctor_name
                  )
                }

              </strong>

              <small>

                ${
                  this.escapeHTML(
                    appointment.service_name
                  )
                }

              </small>

            </div>


            <div>

              <span>
                التاريخ
              </span>

              <strong>

                ${
                  this.formatDate(
                    appointment.date
                  )
                }

              </strong>

              <small dir="ltr">

                ${
                  this.escapeHTML(
                    appointment.time
                  )
                }

              </small>

            </div>


            <span
              class="
                admin-patient-appointment-status
                is-${this.escapeHTML(appointment.status)}
              "
            >

              ${
                this.getAppointmentStatusLabel(
                  appointment.status
                )
              }

            </span>


          </article>

        `;

      },


    /* ==================================================
       DETAILS
       ================================================== */

    renderDetails:
      function () {

        if (
          !this.selectedPatientId
        ) {

          return "";

        }


        const patient =
          this.findPatient(
            this.selectedPatientId
          );


        if (!patient) {

          return "";

        }


        const appointments =
          this.getPatientAppointments(
            patient.id
          );


        return `

          <div
            class="admin-patient-detail-overlay"
          >


            <section
              class="
                admin-patient-detail
                glass
              "
            >


              <header
                class="admin-patient-detail__header"
              >


                <div>

                  <span>
                    بيانات المريض
                  </span>

                  <h2>

                    ${
                      this.escapeHTML(
                        patient.fullName
                      )
                    }

                  </h2>

                </div>


                <button
                  id="adminPatientDetailClose"
                  type="button"
                >
                  ×
                </button>


              </header>


              <div
                class="admin-patient-detail__identity"
              >


                <div
                  class="admin-patient-detail__avatar"
                >

                  ${
                    this.escapeHTML(
                      String(
                        patient.fullName ||
                        "م"
                      ).charAt(0)
                    )
                  }

                </div>


                <div>

                  <strong>

                    ${
                      this.escapeHTML(
                        patient.fullName
                      )
                    }

                  </strong>

                  <span>

                    ${
                      patient.active
                        ? "حساب نشط"
                        : "حساب متوقف"
                    }

                  </span>

                  <small>

                    ID:

                    ${
                      this.escapeHTML(
                        patient.id
                      )
                    }

                  </small>

                </div>


              </div>


              <div
                class="admin-patient-detail__grid"
              >


                <div>

                  <span>
                    الهاتف
                  </span>

                  <strong dir="ltr">

                    ${
                      this.escapeHTML(
                        patient.phone ||
                        "—"
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    البريد
                  </span>

                  <strong dir="ltr">

                    ${
                      this.escapeHTML(
                        patient.email ||
                        "—"
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    الجنس
                  </span>

                  <strong>

                    ${
                      this.getGenderLabel(
                        patient.gender
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    تاريخ الميلاد
                  </span>

                  <strong>

                    ${
                      patient.birthDate
                        ? this.formatDate(
                            patient.birthDate
                          )
                        : "—"
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    الولاية
                  </span>

                  <strong>

                    ${
                      this.escapeHTML(
                        patient.wilaya ||
                        "—"
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    البلدية
                  </span>

                  <strong>

                    ${
                      this.escapeHTML(
                        patient.commune ||
                        "—"
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    الحجوزات
                  </span>

                  <strong>

                    ${
                      appointments.length
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    المكتملة
                  </span>

                  <strong>

                    ${
                      this.getCompletedCount(
                        patient.id
                      )
                    }

                  </strong>

                </div>


              </div>


              <section
                class="admin-patient-detail__appointments"
              >


                <div
                  class="admin-patient-detail__section-head"
                >

                  <span>
                    النشاط
                  </span>

                  <h3>
                    آخر الحجوزات
                  </h3>

                </div>


                <div
                  class="admin-patient-detail__appointment-list"
                >

                  ${
                    appointments.length
                      ? appointments
                          .slice(
                            0,
                            5
                          )
                          .map(
                            function (
                              appointment
                            ) {

                              return AdminPatientsScreen
                                .renderAppointmentRow(
                                  appointment
                                );

                            }
                          )
                          .join("")
                      : `

                        <div
                          class="admin-patient-detail__empty"
                        >
                          لا توجد حجوزات لهذا المريض.
                        </div>

                      `
                  }

                </div>


              </section>


              <div
                class="admin-patient-detail__actions"
              >

                <button
                  class="
                    ${
                      patient.active
                        ? "is-disable"
                        : "is-enable"
                    }
                  "
                  data-admin-patient-active="${this.escapeHTML(patient.id)}"
                  type="button"
                >

                  ${
                    patient.active
                      ? "تعطيل الحساب"
                      : "تفعيل الحساب"
                  }

                </button>

              </div>


            </section>


          </div>

        `;

      },


    /* ==================================================
       REFRESH
       ================================================== */

    refresh:
      function () {

        const results =
          document.getElementById(
            "adminPatientsResults"
          );


        const count =
          document.getElementById(
            "adminPatientsResultsCount"
          );


        const active =
          document.getElementById(
            "adminPatientsActiveCount"
          );


        const inactive =
          document.getElementById(
            "adminPatientsInactiveCount"
          );


        if (results) {

          results.innerHTML =
            this.renderPatients();

        }


        if (count) {

          count.textContent =
            String(
              this.filteredPatients
                .length
            );

        }


        if (active) {

          active.textContent =
            String(
              this.countActive()
            );

        }


        if (inactive) {

          inactive.textContent =
            String(
              this.countInactive()
            );

        }


        this.refreshDetails();

      },


    refreshDetails:
      function () {

        const container =
          document.getElementById(
            "adminPatientsDetailRoot"
          );


        if (container) {

          container.innerHTML =
            this.renderDetails();

        }

      },


    /* ==================================================
       RESET
       ================================================== */

    resetFilters:
      function () {

        this.filters = {

          query: "",

          status: ""

        };

      },


    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage:
      function (
        message,
        type
      ) {

        const element =
          document.getElementById(
            "adminPatientsMessage"
          );


        if (!element) {

          return;

        }


        element.hidden =
          false;


        element.textContent =
          message;


        element.classList
          .remove(
            "is-success",
            "is-error"
          );


        element.classList
          .add(

            type ===
              "success"
              ? "is-success"
              : "is-error"

          );


        clearTimeout(
          this.messageTimer
        );


        this.messageTimer =
          setTimeout(
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
            3200
          );

      },


    /* ==================================================
       RENDER
       ================================================== */

    render:
      function (
        state
      ) {

        this.loadData();


        const isMobile =
          state.deviceMode ===
          "mobile";


        return `

          <main
            class="
              admin-patients
              ${
                isMobile
                  ? "mobile-app-page has-bottom-nav"
                  : "website-page"
              }
            "
          >


            <div
              class="
                admin-patients__orb
                admin-patients__orb--blue
              "
            ></div>


            <div
              class="
                admin-patients__orb
                admin-patients__orb--cyan
              "
            ></div>


            <!-- HEADER -->

            <header
              class="admin-patients__header"
            >


              <button
                id="adminPatientsBack"
                class="admin-patients__back"
                type="button"
              >
                →
              </button>


              <div
                class="admin-patients__header-copy"
              >

                <strong>
                  إدارة المرضى
                </strong>

                <span>
                  الحسابات والنشاط
                </span>

              </div>


              <button
                id="adminPatientsTheme"
                class="admin-patients__theme"
                type="button"
              >
                ◐
              </button>


            </header>


            <!-- CONTENT -->

            <section
              class="admin-patients__container"
            >


              <!-- HERO -->

              <section
                class="admin-patients__hero"
              >

                <span>
                  المرضى
                </span>

                <h1>
                  إدارة حسابات المرضى
                </h1>

                <p>
                  ابحث عن الحسابات، راجع نشاط الحجز، وقم بتفعيل أو تعطيل الحساب عند الحاجة.
                </p>

              </section>


              <!-- STATS -->

              <section
                class="admin-patients-stats"
              >


                <article
                  class="
                    admin-patients-stat
                    glass
                  "
                >

                  <span>
                    إجمالي المرضى
                  </span>

                  <strong>
                    ${this.patients.length}
                  </strong>

                </article>


                <article
                  class="
                    admin-patients-stat
                    glass
                    is-success
                  "
                >

                  <span>
                    الحسابات النشطة
                  </span>

                  <strong
                    id="adminPatientsActiveCount"
                  >
                    ${this.countActive()}
                  </strong>

                </article>


                <article
                  class="
                    admin-patients-stat
                    glass
                    is-danger
                  "
                >

                  <span>
                    الحسابات المتوقفة
                  </span>

                  <strong
                    id="adminPatientsInactiveCount"
                  >
                    ${this.countInactive()}
                  </strong>

                </article>


                <article
                  class="
                    admin-patients-stat
                    glass
                  "
                >

                  <span>
                    إجمالي الحجوزات
                  </span>

                  <strong>
                    ${this.appointments.length}
                  </strong>

                </article>


              </section>


              <!-- SEARCH -->

              <section
                class="
                  admin-patients-search
                  glass
                "
              >


                <div
                  class="admin-patients-search__main"
                >

                  <span>
                    ⌕
                  </span>

                  <input
                    id="adminPatientsQuery"
                    type="search"
                    value="${this.escapeHTML(this.filters.query)}"
                    placeholder="اسم المريض، الهاتف، البريد..."
                    autocomplete="off"
                  >

                </div>


                <div
                  class="admin-patients-search__filters"
                >


                  <label>

                    <span>
                      حالة الحساب
                    </span>

                    <select
                      id="adminPatientsStatus"
                    >

                      <option value="">
                        كل الحسابات
                      </option>


                      <option
                        value="active"
                        ${
                          this.filters.status ===
                          "active"
                            ? "selected"
                            : ""
                        }
                      >
                        النشطة
                      </option>


                      <option
                        value="inactive"
                        ${
                          this.filters.status ===
                          "inactive"
                            ? "selected"
                            : ""
                        }
                      >
                        المتوقفة
                      </option>

                    </select>

                  </label>


                  <button
                    id="adminPatientsReset"
                    type="button"
                  >
                    مسح الفلاتر
                  </button>


                </div>


              </section>


              <!-- MESSAGE -->

              <div
                id="adminPatientsMessage"
                class="admin-patients-message"
                hidden
              ></div>


              <!-- RESULTS HEAD -->

              <section
                class="admin-patients-results__head"
              >


                <div>

                  <span>
                    نتائج الإدارة
                  </span>

                  <h2>
                    حسابات المرضى
                  </h2>

                </div>


                <strong
                  id="adminPatientsResultsCount"
                >
                  ${this.filteredPatients.length}
                </strong>


              </section>


              <!-- RESULTS -->

              <section
                id="adminPatientsResults"
                class="admin-patients-results"
              >

                ${this.renderPatients()}

              </section>


            </section>


            <!-- DETAILS ROOT -->

            <div
              id="adminPatientsDetailRoot"
            >
              ${this.renderDetails()}
            </div>


            <!-- MOBILE NAV -->

            ${
              isMobile
                ? `

                  <nav
                    class="mobile-bottom-nav"
                  >


                    <button
                      id="adminPatientsNavDashboard"
                      class="mobile-bottom-nav__item"
                      type="button"
                    >

                      <span
                        class="mobile-bottom-nav__icon"
                      >
                        ⌂
                      </span>

                      <span>
                        الرئيسية
                      </span>

                    </button>


                    <button
                      id="adminPatientsNavDoctors"
                      class="mobile-bottom-nav__item"
                      type="button"
                    >

                      <span
                        class="mobile-bottom-nav__icon"
                      >
                        ✚
                      </span>

                      <span>
                        الأطباء
                      </span>

                    </button>


                    <button
                      id="adminPatientsNavAppointments"
                      class="mobile-bottom-nav__item"
                      type="button"
                    >

                      <span
                        class="mobile-bottom-nav__icon"
                      >
                        ◷
                      </span>

                      <span>
                        الحجوزات
                      </span>

                    </button>


                    <button
                      class="
                        mobile-bottom-nav__item
                        is-active
                      "
                      type="button"
                    >

                      <span
                        class="mobile-bottom-nav__icon"
                      >
                        👤
                      </span>

                      <span>
                        المرضى
                      </span>

                    </button>


                  </nav>

                `
                : ""
            }


          </main>

        `;

      },


    /* ==================================================
       INIT
       ================================================== */

    init:
      function (
        app
      ) {

        /* BACK */

        document
          .getElementById(
            "adminPatientsBack"
          )
          ?.addEventListener(
            "click",
            function () {

              app.navigate(
                "/admin/dashboard"
              );

            }
          );


        /* THEME */

        document
          .getElementById(
            "adminPatientsTheme"
          )
          ?.addEventListener(
            "click",
            function () {

              app.toggleTheme();

            }
          );


        /* QUERY */

        document
          .getElementById(
            "adminPatientsQuery"
          )
          ?.addEventListener(
            "input",
            function (
              event
            ) {

              AdminPatientsScreen
                .filters
                .query =
                event.target.value;


              AdminPatientsScreen
                .applyFilters();


              AdminPatientsScreen
                .refresh();

            }
          );


        /* STATUS */

        document
          .getElementById(
            "adminPatientsStatus"
          )
          ?.addEventListener(
            "change",
            function (
              event
            ) {

              AdminPatientsScreen
                .filters
                .status =
                event.target.value;


              AdminPatientsScreen
                .applyFilters();


              AdminPatientsScreen
                .refresh();

            }
          );


        /* RESET */

        document
          .getElementById(
            "adminPatientsReset"
          )
          ?.addEventListener(
            "click",
            function () {

              AdminPatientsScreen
                .resetFilters();


              app.render();

            }
          );


        /* RESULTS */

        document
          .getElementById(
            "adminPatientsResults"
          )
          ?.addEventListener(
            "click",
            function (
              event
            ) {

              const view =
                event.target.closest(
                  "[data-admin-patient-view]"
                );


              if (view) {

                AdminPatientsScreen
                  .selectPatient(

                    view.dataset
                      .adminPatientView

                  );


                return;

              }


              const active =
                event.target.closest(
                  "[data-admin-patient-active]"
                );


              if (active) {

                const confirmed =
                  window.confirm(
                    "هل تريد تغيير حالة هذا الحساب؟"
                  );


                if (!confirmed) {

                  return;

                }


                AdminPatientsScreen
                  .toggleActive(

                    active.dataset
                      .adminPatientActive

                  );


                return;

              }


              const reset =
                event.target.closest(
                  "#adminPatientsResetEmpty"
                );


              if (reset) {

                AdminPatientsScreen
                  .resetFilters();


                app.render();

              }

            }
          );


        /* DETAILS */

        document
          .getElementById(
            "adminPatientsDetailRoot"
          )
          ?.addEventListener(
            "click",
            function (
              event
            ) {

              const close =
                event.target.closest(
                  "#adminPatientDetailClose"
                );


              if (close) {

                AdminPatientsScreen
                  .closeDetails();


                return;

              }


              const overlay =
                event.target.closest(
                  ".admin-patient-detail-overlay"
                );


              if (
                overlay &&
                event.target ===
                overlay
              ) {

                AdminPatientsScreen
                  .closeDetails();


                return;

              }


              const active =
                event.target.closest(
                  "[data-admin-patient-active]"
                );


              if (active) {

                const confirmed =
                  window.confirm(
                    "هل تريد تغيير حالة هذا الحساب؟"
                  );


                if (!confirmed) {

                  return;

                }


                AdminPatientsScreen
                  .toggleActive(

                    active.dataset
                      .adminPatientActive

                  );

              }

            }
          );


        /* NAV */

        document
          .getElementById(
            "adminPatientsNavDashboard"
          )
          ?.addEventListener(
            "click",
            function () {

              app.navigate(
                "/admin/dashboard"
              );

            }
          );


        document
          .getElementById(
            "adminPatientsNavDoctors"
          )
          ?.addEventListener(
            "click",
            function () {

              app.navigate(
                "/admin/doctors"
              );

            }
          );


        document
          .getElementById(
            "adminPatientsNavAppointments"
          )
          ?.addEventListener(
            "click",
            function () {

              app.navigate(
                "/admin/appointments"
              );

            }
          );

      }

  };


  /* ====================================================
     EXPOSE
     ==================================================== */

  window.AdminPatientsScreen =
    AdminPatientsScreen;


})();