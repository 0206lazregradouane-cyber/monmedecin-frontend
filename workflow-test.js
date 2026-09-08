/* =========================================================
   MON MÉDECIN
   WORKFLOW TEST
   ---------------------------------------------------------
   Development / QA helper

   Checks:
   - Application core
   - Admin
   - Doctors
   - Patients
   - Secretaries
   - Secretary -> Doctor relation
   - Secretary permissions
   - Doctor services
   - Doctor schedules
   - Appointments
   - Appointment references
   - Appointment overlap
   - Screens availability
   - Routes availability

   IMPORTANT:
   This script does NOT modify application data.
   ========================================================= */

(function () {

  "use strict";


  const MonMedecinWorkflowTest = {


    /* =====================================================
       CONFIG
       ===================================================== */

    keys: {

      admins:
        "monmedecin-admins",

      doctors:
        "monmedecin-doctors",

      secretaries:
        "monmedecin-secretaries",

      patients:
        "monmedecin-patients",

      services:
        "monmedecin-doctor-services",

      schedules:
        "monmedecin-doctor-schedules",

      appointments:
        "monmedecin-appointments",

      session:
        "monmedecin-session"

    },


    errors: [],

    warnings: [],

    passed: [],


    /* =====================================================
       RESET
       ===================================================== */

    reset:
      function () {

        this.errors = [];

        this.warnings = [];

        this.passed = [];

      },


    /* =====================================================
       STORAGE
       ===================================================== */

    read:
      function (
        key,
        fallback
      ) {

        try {

          const raw =
            localStorage.getItem(
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

          this.error(
            `Storage "${key}" يحتوي JSON غير صالح.`
          );


          return fallback;

        }

      },


    array:
      function (
        key
      ) {

        const value =
          this.read(
            key,
            []
          );


        if (
          !Array.isArray(
            value
          )
        ) {

          this.error(
            `"${key}" يجب أن يكون Array.`
          );


          return [];

        }


        return value;

      },


    /* =====================================================
       REPORT HELPERS
       ===================================================== */

    success:
      function (
        message
      ) {

        this.passed.push(
          message
        );

      },


    warning:
      function (
        message
      ) {

        this.warnings.push(
          message
        );

      },


    error:
      function (
        message
      ) {

        this.errors.push(
          message
        );

      },


    /* =====================================================
       IDS
       ===================================================== */

    getId:
      function (
        record
      ) {

        return (

          record?.id ??

          record?.admin_id ??

          record?.doctor_id ??

          record?.secretary_id ??

          record?.patient_id ??

          record?.appointment_id ??

          record?.service_id ??

          null

        );

      },


    getDoctorId:
      function (
        record
      ) {

        return (

          record?.doctor_id ??

          record?.doctorId ??

          null

        );

      },


    getPatientId:
      function (
        record
      ) {

        return (

          record?.patient_id ??

          record?.patientId ??

          null

        );

      },


    getServiceId:
      function (
        record
      ) {

        return (

          record?.service_id ??

          record?.serviceId ??

          null

        );

      },


    /* =====================================================
       TIME
       ===================================================== */

    timeToMinutes:
      function (
        value
      ) {

        const parts =
          String(
            value || ""
          )
            .split(":")
            .map(
              Number
            );


        if (
          parts.length < 2 ||
          Number.isNaN(
            parts[0]
          ) ||
          Number.isNaN(
            parts[1]
          )
        ) {

          return null;

        }


        return (
          parts[0] * 60 +
          parts[1]
        );

      },


    overlap:
      function (
        aStart,
        aEnd,
        bStart,
        bEnd
      ) {

        return (

          aStart < bEnd &&
          bStart < aEnd

        );

      },


    /* =====================================================
       APP CORE
       ===================================================== */

    testApp:
      function () {

        if (
          !window.App
        ) {

          this.error(
            "window.App غير موجود. تحقق من تحميل app.js."
          );


          return;

        }


        this.success(
          "App core loaded."
        );


        if (
          typeof window.App.navigate !==
          "function"
        ) {

          this.error(
            "App.navigate() غير موجود."
          );

        } else {

          this.success(
            "Router navigate() available."
          );

        }


        if (
          typeof window.App.getAppointments !==
          "function"
        ) {

          this.error(
            "App.getAppointments() غير موجود."
          );

        } else {

          this.success(
            "Shared appointments helper available."
          );

        }


        if (
          typeof window.App.getDoctorSchedule !==
          "function"
        ) {

          this.error(
            "App.getDoctorSchedule() غير موجود."
          );

        } else {

          this.success(
            "Doctor schedule helper available."
          );

        }


        if (
          typeof window.App.getDoctorServices !==
          "function"
        ) {

          this.error(
            "App.getDoctorServices() غير موجود."
          );

        } else {

          this.success(
            "Doctor services helper available."
          );

        }


        if (
          typeof window.App.secretaryCan !==
          "function"
        ) {

          this.error(
            "App.secretaryCan() غير موجود."
          );

        } else {

          this.success(
            "Secretary permission helper available."
          );

        }

      },


    /* =====================================================
       REQUIRED SCREENS
       ===================================================== */

    testScreens:
      function () {

        const screens = [

          "LoginScreen",

          "AdminDashboardScreen",

          "DoctorDashboardScreen",

          "DoctorAppointmentsScreen",

          "DoctorScheduleScreen",

          "DoctorServicesScreen",

          "DoctorSecretaryScreen",

          "SecretaryDashboardScreen",

          "SecretaryAppointmentsScreen",

          "SecretaryScheduleScreen",

          "PatientHomeScreen",

          "PatientBookingScreen",

          "PatientAppointmentsScreen"

        ];


        screens.forEach(
          (
            name
          ) => {

            if (
              window[
                name
              ]
            ) {

              this.success(
                `${name} loaded.`
              );

            } else {

              this.warning(
                `${name} غير محمل في index.html أو اسم الملف مختلف.`
              );

            }

          }
        );

      },


    /* =====================================================
       ROUTES
       ===================================================== */

    testRoutes:
      function () {

        if (
          !window.App?.routes
        ) {

          return;

        }


        const requiredRoutes = [

          "/login",

          "/admin/dashboard",

          "/doctor/dashboard",

          "/doctor/appointments",

          "/doctor/schedule",

          "/doctor/services",

          "/doctor/secretary",

          "/secretary/dashboard",

          "/secretary/appointments",

          "/secretary/schedule",

          "/patient/home",

          "/patient/booking",

          "/patient/appointments"

        ];


        requiredRoutes.forEach(
          (
            route
          ) => {

            if (
              window.App.routes[
                route
              ]
            ) {

              this.success(
                `Route ${route} موجود.`
              );

            } else {

              this.error(
                `Route ${route} غير موجود في app.js.`
              );

            }

          }
        );

      },


    /* =====================================================
       ADMIN
       ===================================================== */

    testAdmins:
      function () {

        const admins =
          this.array(
            this.keys.admins
          );


        if (
          admins.length ===
          0
        ) {

          this.warning(
            "لا يوجد Admin محفوظ بعد. فتح LoginScreen يجب أن ينشئ الحساب الأساسي."
          );


          return;

        }


        admins.forEach(
          (
            admin,
            index
          ) => {

            if (
              !this.getId(
                admin
              )
            ) {

              this.error(
                `Admin #${index + 1} لا يحتوي ID.`
              );

            }


            if (
              !admin.email
            ) {

              this.error(
                `Admin #${index + 1} لا يحتوي Email.`
              );

            }


            if (
              !admin.password
            ) {

              this.error(
                `Admin ${admin.email || index + 1} لا يحتوي Password.`
              );

            }

          }
        );


        this.success(
          `${admins.length} admin account(s) checked.`
        );

      },


    /* =====================================================
       DOCTORS
       ===================================================== */

    testDoctors:
      function () {

        const doctors =
          this.array(
            this.keys.doctors
          );


        if (
          doctors.length ===
          0
        ) {

          this.warning(
            "لا يوجد طبيب بعد. أنشئ طبيبًا من Admin لاختبار بقية Workflow."
          );


          return;

        }


        doctors.forEach(
          (
            doctor,
            index
          ) => {

            const id =
              this.getId(
                doctor
              );


            if (!id) {

              this.error(
                `Doctor #${index + 1} لا يحتوي ID.`
              );

            }


            if (
              !doctor.phone &&
              !doctor.email
            ) {

              this.error(
                `Doctor ${id || index + 1} لا يحتوي Phone أو Email للدخول.`
              );

            }


            if (
              !doctor.password
            ) {

              this.error(
                `Doctor ${id || index + 1} لا يحتوي Password.`
              );

            }

          }
        );


        this.success(
          `${doctors.length} doctor account(s) checked.`
        );

      },


    /* =====================================================
       PATIENTS
       ===================================================== */

    testPatients:
      function () {

        const patients =
          this.array(
            this.keys.patients
          );


        if (
          patients.length ===
          0
        ) {

          this.warning(
            "لا يوجد مريض بعد. أنشئ حساب Patient لاختبار الحجز."
          );


          return;

        }


        patients.forEach(
          (
            patient,
            index
          ) => {

            const id =
              this.getId(
                patient
              );


            if (!id) {

              this.error(
                `Patient #${index + 1} لا يحتوي ID.`
              );

            }


            if (
              !patient.phone &&
              !patient.email
            ) {

              this.error(
                `Patient ${id || index + 1} لا يحتوي بيانات Login.`
              );

            }

          }
        );


        this.success(
          `${patients.length} patient account(s) checked.`
        );

      },


    /* =====================================================
       SECRETARIES
       ===================================================== */

    testSecretaries:
      function () {

        const secretaries =
          this.array(
            this.keys.secretaries
          );


        const doctors =
          this.array(
            this.keys.doctors
          );


        if (
          secretaries.length ===
          0
        ) {

          this.warning(
            "لا يوجد Secretary حتى الآن."
          );


          return;

        }


        secretaries.forEach(
          (
            secretary,
            index
          ) => {

            const id =
              this.getId(
                secretary
              );


            const doctorId =
              this.getDoctorId(
                secretary
              );


            if (!id) {

              this.error(
                `Secretary #${index + 1} لا يحتوي ID.`
              );

            }


            if (!doctorId) {

              this.error(
                `Secretary ${id || index + 1} غير مرتبط بـ doctor_id.`
              );


              return;

            }


            const doctorExists =
              doctors.some(
                (
                  doctor
                ) => {

                  return (

                    String(
                      this.getId(
                        doctor
                      )
                    )

                    ===

                    String(
                      doctorId
                    )

                  );

                }
              );


            if (!doctorExists) {

              this.error(
                `Secretary ${id} مرتبط بطبيب غير موجود: ${doctorId}`
              );

            }


            if (
              !secretary.permissions ||
              typeof secretary.permissions !==
              "object"
            ) {

              this.error(
                `Secretary ${id} لا يحتوي permissions.`
              );

            } else {

              [

                "appointments",

                "patients",

                "schedule"

              ].forEach(
                (
                  permission
                ) => {

                  if (
                    typeof secretary
                      .permissions[
                        permission
                      ] !==
                    "boolean"
                  ) {

                    this.warning(
                      `Secretary ${id}: permission "${permission}" ليست Boolean.`
                    );

                  }

                }
              );

            }


            if (
              secretary.permissions?.services ===
              true
            ) {

              this.error(
                `Secretary ${id} لديه services=true رغم أنها صلاحية خاصة بالطبيب.`
              );

            }


            if (
              secretary.permissions?.financial ===
              true
            ) {

              this.error(
                `Secretary ${id} لديه financial=true رغم أنها صلاحية خاصة بالطبيب.`
              );

            }

          }
        );


        this.success(
          `${secretaries.length} secretary account(s) checked.`
        );

      },


    /* =====================================================
       SERVICES
       ===================================================== */

    testServices:
      function () {

        const services =
          this.array(
            this.keys.services
          );


        const doctors =
          this.array(
            this.keys.doctors
          );


        services.forEach(
          (
            service
          ) => {

            const id =
              this.getId(
                service
              );


            const doctorId =
              this.getDoctorId(
                service
              );


            if (!id) {

              this.error(
                "وجدت خدمة بدون ID."
              );

            }


            if (!doctorId) {

              this.error(
                `Service ${id || "unknown"} بدون doctor_id.`
              );


              return;

            }


            const doctorExists =
              doctors.some(
                (
                  doctor
                ) => {

                  return (

                    String(
                      this.getId(
                        doctor
                      )
                    )

                    ===

                    String(
                      doctorId
                    )

                  );

                }
              );


            if (!doctorExists) {

              this.error(
                `Service ${id} مرتبطة بطبيب غير موجود.`
              );

            }


            const duration =
              Number(
                service.duration ??
                service.durationMinutes
              );


            if (
              !Number.isFinite(
                duration
              ) ||
              duration < 5
            ) {

              this.error(
                `Service ${id} لديها مدة غير صحيحة.`
              );

            }


            if (
              !Number.isFinite(
                Number(
                  service.price
                )
              )
            ) {

              this.error(
                `Service ${id} لديها سعر غير صحيح.`
              );

            }

          }
        );


        if (
          services.length
        ) {

          this.success(
            `${services.length} service(s) checked.`
          );

        } else {

          this.warning(
            "لا توجد Doctor Services حتى الآن."
          );

        }

      },


    /* =====================================================
       SCHEDULES
       ===================================================== */

    testSchedules:
      function () {

        const schedules =
          this.array(
            this.keys.schedules
          );


        const doctors =
          this.array(
            this.keys.doctors
          );


        schedules.forEach(
          (
            schedule
          ) => {

            const doctorId =
              this.getDoctorId(
                schedule
              );


            if (!doctorId) {

              this.error(
                "وجد Doctor Schedule بدون doctor_id."
              );


              return;

            }


            const doctorExists =
              doctors.some(
                (
                  doctor
                ) => {

                  return (

                    String(
                      this.getId(
                        doctor
                      )
                    )

                    ===

                    String(
                      doctorId
                    )

                  );

                }
              );


            if (!doctorExists) {

              this.error(
                `Schedule مرتبط بطبيب غير موجود: ${doctorId}`
              );

            }


            const slotDuration =
              Number(
                schedule.slotDuration
              );


            if (
              ![
                15,
                20,
                30,
                45,
                60
              ].includes(
                slotDuration
              )
            ) {

              this.warning(
                `Doctor ${doctorId}: slotDuration=${slotDuration} غير قياسي.`
              );

            }


            const days =
              schedule.days;


            if (
              !days ||
              typeof days !==
              "object"
            ) {

              this.error(
                `Doctor ${doctorId}: schedule.days غير موجود.`
              );


              return;

            }


            Object.entries(
              days
            )
              .forEach(
                (
                  [
                    key,
                    day
                  ]
                ) => {

                  if (
                    day.enabled ===
                    false
                  ) {

                    return;

                  }


                  const start =
                    this.timeToMinutes(
                      day.start
                    );


                  const end =
                    this.timeToMinutes(
                      day.end
                    );


                  if (
                    start ===
                    null ||
                    end ===
                    null ||
                    end <=
                    start
                  ) {

                    this.error(
                      `Doctor ${doctorId}: أوقات يوم ${key} غير صحيحة.`
                    );

                  }

                }
              );

          }
        );


        if (
          schedules.length
        ) {

          this.success(
            `${schedules.length} doctor schedule(s) checked.`
          );

        } else {

          this.warning(
            "لا توجد Doctor Schedules حتى الآن."
          );

        }

      },


    /* =====================================================
       APPOINTMENTS
       ===================================================== */

    testAppointments:
      function () {

        const appointments =
          this.array(
            this.keys.appointments
          );


        const doctors =
          this.array(
            this.keys.doctors
          );


        const patients =
          this.array(
            this.keys.patients
          );


        const services =
          this.array(
            this.keys.services
          );


        appointments.forEach(
          (
            appointment
          ) => {

            const id =
              this.getId(
                appointment
              );


            const doctorId =
              this.getDoctorId(
                appointment
              );


            const patientId =
              this.getPatientId(
                appointment
              );


            const serviceId =
              this.getServiceId(
                appointment
              );


            if (!id) {

              this.error(
                "وجد Appointment بدون ID."
              );

            }


            if (!doctorId) {

              this.error(
                `Appointment ${id} بدون doctor_id.`
              );

            }


            if (!patientId) {

              this.error(
                `Appointment ${id} بدون patient_id.`
              );

            }


            const doctorExists =
              doctors.some(
                (
                  doctor
                ) => {

                  return (

                    String(
                      this.getId(
                        doctor
                      )
                    )

                    ===

                    String(
                      doctorId
                    )

                  );

                }
              );


            if (!doctorExists) {

              this.error(
                `Appointment ${id}: الطبيب غير موجود.`
              );

            }


            const patientExists =
              patients.some(
                (
                  patient
                ) => {

                  return (

                    String(
                      this.getId(
                        patient
                      )
                    )

                    ===

                    String(
                      patientId
                    )

                  );

                }
              );


            if (!patientExists) {

              this.error(
                `Appointment ${id}: المريض غير موجود.`
              );

            }


            /*
              Old appointments may not have service_id.
            */

            if (serviceId) {

              const serviceExists =
                services.some(
                  (
                    service
                  ) => {

                    return (

                      String(
                        this.getId(
                          service
                        )
                      )

                      ===

                      String(
                        serviceId
                      )

                    );

                  }
                );


              if (!serviceExists) {

                this.warning(
                  `Appointment ${id}: الخدمة الأصلية لم تعد موجودة أو تمت أرشفتها.`
                );

              }

            }


            if (
              !appointment.date
            ) {

              this.error(
                `Appointment ${id}: التاريخ غير موجود.`
              );

            }


            if (
              !appointment.time
            ) {

              this.error(
                `Appointment ${id}: وقت البداية غير موجود.`
              );

            }


            if (
              Number(
                appointment.duration
              ) <=
              0
            ) {

              this.error(
                `Appointment ${id}: duration غير صحيحة.`
              );

            }


            const allowedStatuses = [

              "pending",

              "confirmed",

              "arrived",

              "in_progress",

              "completed",

              "rejected",

              "cancelled",

              "no_show"

            ];


            if (
              !allowedStatuses.includes(
                appointment.status
              )
            ) {

              this.warning(
                `Appointment ${id}: status غير معروفة "${appointment.status}".`
              );

            }

          }
        );


        this.testAppointmentOverlaps(
          appointments
        );


        if (
          appointments.length
        ) {

          this.success(
            `${appointments.length} appointment(s) checked.`
          );

        } else {

          this.warning(
            "لا توجد Appointments حتى الآن."
          );

        }

      },


    /* =====================================================
       APPOINTMENT OVERLAPS
       ===================================================== */

    testAppointmentOverlaps:
      function (
        appointments
      ) {

        const active =
          appointments.filter(
            function (
              appointment
            ) {

              return ![

                "cancelled",

                "rejected"

              ].includes(
                appointment.status
              );

            }
          );


        for (
          let i = 0;
          i < active.length;
          i++
        ) {

          for (
            let j = i + 1;
            j < active.length;
            j++
          ) {

            const first =
              active[
                i
              ];


            const second =
              active[
                j
              ];


            if (
              String(
                this.getDoctorId(
                  first
                )
              )

              !==

              String(
                this.getDoctorId(
                  second
                )
              )
            ) {

              continue;

            }


            if (
              first.date !==
              second.date
            ) {

              continue;

            }


            const firstStart =
              this.timeToMinutes(
                first.time
              );


            const secondStart =
              this.timeToMinutes(
                second.time
              );


            if (
              firstStart ===
              null ||
              secondStart ===
              null
            ) {

              continue;

            }


            const firstEnd =
              firstStart +
              (
                Number(
                  first.duration
                ) ||
                30
              );


            const secondEnd =
              secondStart +
              (
                Number(
                  second.duration
                ) ||
                30
              );


            if (
              this.overlap(

                firstStart,

                firstEnd,

                secondStart,

                secondEnd

              )
            ) {

              this.error(

                `تداخل حجوزات للطبيب ${this.getDoctorId(first)} بتاريخ ${first.date}: ` +

                `${this.getId(first)} (${first.time}) مع ` +

                `${this.getId(second)} (${second.time}).`

              );

            }

          }

        }

      },


    /* =====================================================
       SESSION
       ===================================================== */

    testSession:
      function () {

        const session =
          this.read(
            this.keys.session,
            null
          );


        if (!session) {

          this.warning(
            "لا توجد جلسة Login نشطة حاليًا."
          );


          return;

        }


        if (
          session.authenticated !==
          true
        ) {

          this.warning(
            "Session موجودة لكن authenticated ليست true."
          );

        }


        if (
          ![
            "admin",
            "doctor",
            "secretary",
            "patient"
          ].includes(
            session.role
          )
        ) {

          this.error(
            `Session role غير معروفة: ${session.role}`
          );

        } else {

          this.success(
            `Current session role: ${session.role}`
          );

        }

      },


    /* =====================================================
       COUNTS
       ===================================================== */

    getCounts:
      function () {

        return {

          admins:
            this.array(
              this.keys.admins
            ).length,

          doctors:
            this.array(
              this.keys.doctors
            ).length,

          secretaries:
            this.array(
              this.keys.secretaries
            ).length,

          patients:
            this.array(
              this.keys.patients
            ).length,

          services:
            this.array(
              this.keys.services
            ).length,

          schedules:
            this.array(
              this.keys.schedules
            ).length,

          appointments:
            this.array(
              this.keys.appointments
            ).length

        };

      },


    /* =====================================================
       PRINT
       ===================================================== */

    print:
      function () {

        const counts =
          this.getCounts();


        console.group(
          "%c MON MÉDECIN — WORKFLOW TEST ",
          "background:#4274d9;color:white;padding:5px 10px;border-radius:5px;font-weight:bold;"
        );


        console.log(
          "Data:",
          counts
        );


        console.group(
          `✅ Passed (${this.passed.length})`
        );


        this.passed.forEach(
          function (
            item
          ) {

            console.log(
              "✅",
              item
            );

          }
        );


        console.groupEnd();


        console.group(
          `⚠️ Warnings (${this.warnings.length})`
        );


        this.warnings.forEach(
          function (
            item
          ) {

            console.warn(
              "⚠️",
              item
            );

          }
        );


        console.groupEnd();


        console.group(
          `❌ Errors (${this.errors.length})`
        );


        this.errors.forEach(
          function (
            item
          ) {

            console.error(
              "❌",
              item
            );

          }
        );


        console.groupEnd();


        if (
          this.errors.length ===
          0
        ) {

          console.log(
            "%c CORE WORKFLOW PASSED ✅",
            "color:#27815d;font-size:14px;font-weight:bold;"
          );

        } else {

          console.error(
            `WORKFLOW FAILED — ${this.errors.length} error(s).`
          );

        }


        console.groupEnd();


        return {

          success:
            this.errors.length ===
            0,

          passed:
            [...this.passed],

          warnings:
            [...this.warnings],

          errors:
            [...this.errors],

          counts:
            counts

        };

      },


    /* =====================================================
       RUN
       ===================================================== */

    run:
      function () {

        this.reset();


        this.testApp();

        this.testScreens();

        this.testRoutes();

        this.testAdmins();

        this.testDoctors();

        this.testPatients();

        this.testSecretaries();

        this.testServices();

        this.testSchedules();

        this.testAppointments();

        this.testSession();


        return this.print();

      }

  };


  /* =====================================================
     GLOBAL
     ===================================================== */

  window.MonMedecinWorkflowTest =
    MonMedecinWorkflowTest;


  console.log(
    "MON MÉDECIN QA loaded. Run:"
  );


  console.log(
    "MonMedecinWorkflowTest.run()"
  );


})();