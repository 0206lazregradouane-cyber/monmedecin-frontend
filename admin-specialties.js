/* =====================================================
   MON MÉDECIN
   ADMIN SPECIALTIES - COMPLETE CONTROL
   ===================================================== */

(function () {
  "use strict";

  const AdminSpecialtiesScreen = {
    /* ==================================================
       STATE
       ================================================== */

    specialties: [],
    filteredSpecialties: [],
    searchQuery: "",
    selectedSpecialtyId: null,
    modalOpen: false,
    modalMode: 'add', // 'add' | 'edit'
    messageTimer: null,
    currentPage: 1,
    pageSize: 12,

    /* ==================================================
       DEFAULT SPECIALTIES (BASE DATA)
       ================================================== */

    defaultSpecialties: [
      { id: "general-medicine", name: "الطب العام", nameFr: "Médecine générale", nameEn: "General Medicine", category: "general", icon: "🩺", active: true, description: "تشخيص وعلاج الأمراض العامة" },
      { id: "family-medicine", name: "طب الأسرة", nameFr: "Médecine familiale", nameEn: "Family Medicine", category: "general", icon: "👨‍👩‍👧‍👦", active: true, description: "رعاية صحية شاملة للأسرة" },
      { id: "internal-medicine", name: "الطب الباطني", nameFr: "Médecine interne", nameEn: "Internal Medicine", category: "medicine", icon: "🩺", active: true, description: "تشخيص وعلاج الأمراض الداخلية" },
      { id: "cardiology", name: "أمراض القلب", nameFr: "Cardiologie", nameEn: "Cardiology", category: "medicine", icon: "❤️", active: true, description: "تشخيص وعلاج أمراض القلب والأوعية" },
      { id: "cardiovascular-diseases", name: "أمراض القلب والأوعية الدموية", nameFr: "Maladies cardiovasculaires", nameEn: "Cardiovascular Medicine", category: "medicine", icon: "❤️", active: true, description: "علاج أمراض القلب والشرايين" },
      { id: "pulmonology", name: "أمراض الصدر والجهاز التنفسي", nameFr: "Pneumologie", nameEn: "Pulmonology", category: "medicine", icon: "🫁", active: true, description: "تشخيص وعلاج أمراض الرئة والتنفس" },
      { id: "gastroenterology", name: "أمراض الجهاز الهضمي", nameFr: "Gastro-entérologie", nameEn: "Gastroenterology", category: "medicine", icon: "🫃", active: true, description: "علاج أمراض المعدة والأمعاء والكبد" },
      { id: "endocrinology", name: "أمراض الغدد الصماء", nameFr: "Endocrinologie", nameEn: "Endocrinology", category: "medicine", icon: "🧬", active: true, description: "علاج اضطرابات الهرمونات والغدد" },
      { id: "diabetology", name: "السكري وأمراض الاستقلاب", nameFr: "Diabétologie", nameEn: "Diabetology", category: "medicine", icon: "🩸", active: true, description: "علاج السكري واضطرابات التمثيل الغذائي" },
      { id: "nephrology", name: "أمراض الكلى", nameFr: "Néphrologie", nameEn: "Nephrology", category: "medicine", icon: "🫘", active: true, description: "تشخيص وعلاج أمراض الكلى" },
      { id: "rheumatology", name: "أمراض الروماتيزم", nameFr: "Rhumatologie", nameEn: "Rheumatology", category: "medicine", icon: "🦴", active: true, description: "علاج أمراض المفاصل والعظام" },
      { id: "hematology", name: "أمراض الدم", nameFr: "Hématologie", nameEn: "Hematology", category: "medicine", icon: "🩸", active: true, description: "تشخيص وعلاج أمراض الدم" },
      { id: "infectious-diseases", name: "الأمراض المعدية", nameFr: "Maladies infectieuses", nameEn: "Infectious Diseases", category: "medicine", icon: "🦠", active: true, description: "علاج الأمراض المعدية والفيروسية" },
      { id: "allergology", name: "أمراض الحساسية", nameFr: "Allergologie", nameEn: "Allergology", category: "medicine", icon: "🌿", active: true, description: "تشخيص وعلاج الحساسية" },
      { id: "immunology", name: "المناعة", nameFr: "Immunologie", nameEn: "Immunology", category: "medicine", icon: "🛡️", active: true, description: "علاج أمراض الجهاز المناعي" },
      { id: "pediatrics", name: "طب الأطفال", nameFr: "Pédiatrie", nameEn: "Pediatrics", category: "children", icon: "👶", active: true, description: "رعاية صحية للأطفال من الولادة حتى المراهقة" },
      { id: "neonatology", name: "طب حديثي الولادة", nameFr: "Néonatologie", nameEn: "Neonatology", category: "children", icon: "👶", active: true, description: "رعاية الأطفال حديثي الولادة" },
      { id: "gynecology-obstetrics", name: "أمراض النساء والتوليد", nameFr: "Gynécologie-obstétrique", nameEn: "Obstetrics and Gynecology", category: "women", icon: "🤰", active: true, description: "رعاية صحة المرأة والحمل والولادة" },
      { id: "neurology", name: "طب الأعصاب", nameFr: "Neurologie", nameEn: "Neurology", category: "medicine", icon: "🧠", active: true, description: "تشخيص وعلاج أمراض الجهاز العصبي" },
      { id: "neurosurgery", name: "جراحة الأعصاب", nameFr: "Neurochirurgie", nameEn: "Neurosurgery", category: "surgery", icon: "🧠", active: true, description: "الجراحة العصبية" },
      { id: "psychiatry", name: "الطب النفسي", nameFr: "Psychiatrie", nameEn: "Psychiatry", category: "mental", icon: "🧠", active: true, description: "تشخيص وعلاج الاضطرابات النفسية" },
      { id: "child-psychiatry", name: "الطب النفسي للأطفال والمراهقين", nameFr: "Pédopsychiatrie", nameEn: "Child and Adolescent Psychiatry", category: "mental", icon: "🧠", active: true, description: "الطب النفسي للأطفال والمراهقين" },
      { id: "dermatology", name: "الأمراض الجلدية", nameFr: "Dermatologie", nameEn: "Dermatology", category: "medicine", icon: "🧴", active: true, description: "تشخيص وعلاج الأمراض الجلدية" },
      { id: "ophthalmology", name: "طب وجراحة العيون", nameFr: "Ophtalmologie", nameEn: "Ophthalmology", category: "surgery", icon: "👁️", active: true, description: "علاج أمراض العيون وجراحتها" },
      { id: "ent", name: "الأنف والأذن والحنجرة", nameFr: "Oto-rhino-laryngologie", nameEn: "Otolaryngology - ENT", category: "surgery", icon: "👂", active: true, description: "علاج أمراض الأنف والأذن والحنجرة" },
      { id: "urology", name: "جراحة المسالك البولية", nameFr: "Urologie", nameEn: "Urology", category: "surgery", icon: "🩺", active: true, description: "جراحة المسالك البولية والجهاز التناسلي الذكري" },
      { id: "general-surgery", name: "الجراحة العامة", nameFr: "Chirurgie générale", nameEn: "General Surgery", category: "surgery", icon: "🏥", active: true, description: "الجراحة العامة" },
      { id: "orthopedic-surgery", name: "جراحة العظام والرضوض", nameFr: "Chirurgie orthopédique et traumatologie", nameEn: "Orthopedic Surgery and Traumatology", category: "surgery", icon: "🦴", active: true, description: "جراحة العظام والمفاصل والإصابات" },
      { id: "cardiac-surgery", name: "جراحة القلب", nameFr: "Chirurgie cardiaque", nameEn: "Cardiac Surgery", category: "surgery", icon: "❤️", active: true, description: "جراحة القلب" },
      { id: "pediatric-surgery", name: "جراحة الأطفال", nameFr: "Chirurgie pédiatrique", nameEn: "Pediatric Surgery", category: "surgery", icon: "👶", active: true, description: "جراحة الأطفال" },
      { id: "plastic-surgery", name: "جراحة التجميل والترميم", nameFr: "Chirurgie plastique et reconstructrice", nameEn: "Plastic and Reconstructive Surgery", category: "surgery", icon: "✨", active: true, description: "جراحة التجميل والترميم" },
      { id: "maxillofacial-surgery", name: "جراحة الوجه والفكين", nameFr: "Chirurgie maxillo-faciale", nameEn: "Maxillofacial Surgery", category: "surgery", icon: "🦷", active: true, description: "جراحة الوجه والفكين" },
      { id: "anesthesiology", name: "التخدير والإنعاش", nameFr: "Anesthésie-réanimation", nameEn: "Anesthesiology and Intensive Care", category: "hospital", icon: "💉", active: true, description: "التخدير والعناية المركزة" },
      { id: "emergency-medicine", name: "طب الاستعجالات", nameFr: "Médecine d'urgence", nameEn: "Emergency Medicine", category: "hospital", icon: "🚑", active: true, description: "طب الطوارئ والإسعافات" },
      { id: "medical-oncology", name: "طب الأورام", nameFr: "Oncologie médicale", nameEn: "Medical Oncology", category: "medicine", icon: "🎗️", active: true, description: "علاج الأورام السرطانية" },
      { id: "radiation-oncology", name: "العلاج الإشعاعي للأورام", nameFr: "Radiothérapie oncologique", nameEn: "Radiation Oncology", category: "medicine", icon: "☢️", active: true, description: "العلاج الإشعاعي للأورام" },
      { id: "radiology", name: "الأشعة والتصوير الطبي", nameFr: "Radiologie et imagerie médicale", nameEn: "Radiology and Medical Imaging", category: "diagnostic", icon: "🩻", active: true, description: "التشخيص بالأشعة والتصوير" },
      { id: "nuclear-medicine", name: "الطب النووي", nameFr: "Médecine nucléaire", nameEn: "Nuclear Medicine", category: "diagnostic", icon: "☢️", active: true, description: "التشخيص والعلاج بالطب النووي" },
      { id: "pathology", name: "التشريح وعلم الخلايا المرضية", nameFr: "Anatomie et cytologie pathologiques", nameEn: "Anatomic Pathology", category: "laboratory", icon: "🔬", active: true, description: "التشخيص المرضي والخلايا" },
      { id: "medical-biology", name: "البيولوجيا الطبية", nameFr: "Biologie médicale", nameEn: "Medical Biology", category: "laboratory", icon: "🔬", active: true, description: "التحاليل الطبية والمخبرية" },
      { id: "physical-medicine", name: "الطب الفيزيائي وإعادة التأهيل", nameFr: "Médecine physique et de réadaptation", nameEn: "Physical Medicine and Rehabilitation", category: "rehabilitation", icon: "♿", active: true, description: "إعادة التأهيل والعلاج الطبيعي" },
      { id: "occupational-medicine", name: "طب العمل", nameFr: "Médecine du travail", nameEn: "Occupational Medicine", category: "general", icon: "💼", active: true, description: "صحة العمال والطب المهني" },
      { id: "forensic-medicine", name: "الطب الشرعي", nameFr: "Médecine légale", nameEn: "Forensic Medicine", category: "medicine", icon: "⚖️", active: true, description: "الطب الشرعي والتقارير القانونية" },
      { id: "epidemiology", name: "علم الأوبئة والطب الوقائي", nameFr: "Épidémiologie et médecine préventive", nameEn: "Epidemiology and Preventive Medicine", category: "public-health", icon: "🛡️", active: true, description: "الوقاية من الأمراض والأوبئة" },
      { id: "geriatrics", name: "طب الشيخوخة", nameFr: "Gériatrie", nameEn: "Geriatrics", category: "medicine", icon: "👴", active: true, description: "رعاية كبار السن" },
      { id: "sports-medicine", name: "الطب الرياضي", nameFr: "Médecine du sport", nameEn: "Sports Medicine", category: "medicine", icon: "🏃", active: true, description: "علاج الإصابات الرياضية" },
      { id: "medical-nutrition", name: "التغذية الطبية", nameFr: "Nutrition médicale", nameEn: "Medical Nutrition", category: "medicine", icon: "🥗", active: true, description: "العلاج بالتغذية" },
      { id: "dentistry", name: "طب وجراحة الأسنان", nameFr: "Médecine dentaire", nameEn: "Dentistry", category: "dentistry", icon: "🦷", active: true, description: "طب وجراحة الأسنان" },
      { id: "orthodontics", name: "تقويم الأسنان", nameFr: "Orthodontie", nameEn: "Orthodontics", category: "dentistry", icon: "🦷", active: true, description: "تقويم الأسنان" },
      { id: "periodontology", name: "أمراض وجراحة اللثة", nameFr: "Parodontologie", nameEn: "Periodontology", category: "dentistry", icon: "🦷", active: true, description: "علاج أمراض اللثة" },
      { id: "oral-surgery", name: "جراحة الفم", nameFr: "Chirurgie orale", nameEn: "Oral Surgery", category: "dentistry", icon: "🦷", active: true, description: "جراحة الفم" },
      { id: "prosthodontics", name: "تركيبات الأسنان", nameFr: "Prothèse dentaire", nameEn: "Prosthodontics", category: "dentistry", icon: "🦷", active: true, description: "تركيبات الأسنان والجسور" },
      { id: "restorative-dentistry", name: "علاج وترميم الأسنان", nameFr: "Dentisterie restauratrice", nameEn: "Restorative Dentistry", category: "dentistry", icon: "🦷", active: true, description: "ترميم الأسنان" },
      { id: "pediatric-dentistry", name: "طب أسنان الأطفال", nameFr: "Odontologie pédiatrique", nameEn: "Pediatric Dentistry", category: "dentistry", icon: "🦷", active: true, description: "طب أسنان الأطفال" }
    ],

    categories: [
      { id: "general", label: "الطب العام" },
      { id: "medicine", label: "التخصصات الطبية" },
      { id: "surgery", label: "التخصصات الجراحية" },
      { id: "children", label: "طب الأطفال" },
      { id: "women", label: "صحة المرأة" },
      { id: "mental", label: "الصحة النفسية" },
      { id: "diagnostic", label: "التشخيص والتصوير" },
      { id: "laboratory", label: "التحاليل والمخابر" },
      { id: "rehabilitation", label: "إعادة التأهيل" },
      { id: "dentistry", label: "طب الأسنان" },
      { id: "hospital", label: "التخصصات الاستشفائية" },
      { id: "public-health", label: "الصحة العمومية" }
    ],

    /* ==================================================
       STORAGE HELPERS
       ================================================== */

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

    /* ==================================================
       ESCAPE HTML
       ================================================== */

    escapeHTML: function (value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /* ==================================================
       NORMALIZE TEXT
       ================================================== */

    normalizeText: function (value) {
      return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه');
    },

    /* ==================================================
       LOAD SPECIALTIES
       ================================================== */

    loadSpecialties: function () {
      let stored = this.readJSON(localStorage, "monmedecin-specialties", null);

      if (stored && Array.isArray(stored) && stored.length > 0) {
        this.specialties = stored;
      } else {
        // استخدام التخصصات الافتراضية مع إضافة createdAt
        this.specialties = JSON.parse(JSON.stringify(this.defaultSpecialties)).map(function(s) {
          s.createdAt = new Date().toISOString();
          s.updatedAt = new Date().toISOString();
          return s;
        });
        this.saveSpecialties();
      }

      this.applyFilters();
      this.currentPage = 1;
      return this.specialties;
    },

    /* ==================================================
       SAVE SPECIALTIES
       ================================================== */

    saveSpecialties: function () {
      return this.writeJSON(localStorage, "monmedecin-specialties", this.specialties);
    },

    /* ==================================================
       APPLY FILTERS
       ================================================== */

    applyFilters: function () {
      const query = this.normalizeText(this.searchQuery);

      this.filteredSpecialties = this.specialties.filter(function (specialty) {
        if (query) {
          const searchable = [
            specialty.name,
            specialty.nameFr,
            specialty.nameEn,
            specialty.id,
            specialty.category,
            specialty.description || ''
          ].join(' ');

          return this.normalizeText(searchable).includes(query);
        }
        return true;
      }, this);

      // ترتيب حسب تاريخ الإضافة (الأحدث أولاً)
      this.filteredSpecialties.sort(function(a, b) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      return this.filteredSpecialties;
    },

    /* ==================================================
       GET CATEGORY LABEL
       ================================================== */

    getCategoryLabel: function (categoryId) {
      const found = this.categories.find(function (c) {
        return c.id === categoryId;
      });
      return found ? found.label : categoryId || 'عام';
    },

    /* ==================================================
       GET PAGINATED SPECIALTIES
       ================================================== */

    getPaginatedSpecialties: function () {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredSpecialties.slice(start, end);
    },

    getTotalPages: function () {
      return Math.ceil(this.filteredSpecialties.length / this.pageSize);
    },

    /* ==================================================
       STATS
       ================================================== */

    getStats: function () {
      const total = this.specialties.length;
      const active = this.specialties.filter(function (s) {
        return s.active !== false;
      }).length;
      const inactive = total - active;

      return {
        total: total,
        active: active,
        inactive: inactive,
      };
    },

    /* ==================================================
       CREATE SPECIALTY
       ================================================== */

    createSpecialty: function (data) {
      // التحقق من التكرار
      const exists = this.specialties.some(function (s) {
        return this.normalizeText(s.name) === this.normalizeText(data.name);
      }, this);

      if (exists) {
        this.showMessage("هذا التخصص موجود بالفعل.", "error");
        return false;
      }

      const now = new Date().toISOString();
      const specialty = {
        id: "SP-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
        name: data.name.trim(),
        nameFr: data.nameFr || "",
        nameEn: data.nameEn || "",
        category: data.category || "general",
        icon: data.icon || "🩺",
        description: data.description || "",
        active: data.active !== false,
        createdAt: now,
        updatedAt: now
      };

      this.specialties.push(specialty);
      this.saveSpecialties();
      this.applyFilters();
      this.refresh();

      this.showMessage("تم إضافة التخصص بنجاح.", "success");
      this.modalOpen = false;

      return true;
    },

    /* ==================================================
       UPDATE SPECIALTY
       ================================================== */

    updateSpecialty: function (id, data) {
      const index = this.specialties.findIndex(function (s) {
        return String(s.id) === String(id);
      });

      if (index === -1) {
        this.showMessage("تعذر العثور على التخصص.", "error");
        return false;
      }

      // التحقق من التكرار (تجاهل التخصص الحالي)
      const duplicate = this.specialties.some(function (s, i) {
        if (i === index) return false;
        return this.normalizeText(s.name) === this.normalizeText(data.name);
      }, this);

      if (duplicate) {
        this.showMessage("يوجد تخصص آخر بنفس الاسم.", "error");
        return false;
      }

      this.specialties[index] = {
        ...this.specialties[index],
        name: data.name.trim(),
        nameFr: data.nameFr || "",
        nameEn: data.nameEn || "",
        category: data.category || "general",
        icon: data.icon || "🩺",
        description: data.description || "",
        active: data.active !== false,
        updatedAt: new Date().toISOString()
      };

      this.saveSpecialties();
      this.applyFilters();
      this.refresh();

      this.showMessage("تم تحديث التخصص بنجاح.", "success");
      this.modalOpen = false;
      this.selectedSpecialtyId = null;

      return true;
    },

    /* ==================================================
       TOGGLE ACTIVE
       ================================================== */

    toggleActive: function (id) {
      const index = this.specialties.findIndex(function (s) {
        return String(s.id) === String(id);
      });

      if (index === -1) {
        this.showMessage("تعذر العثور على التخصص.", "error");
        return false;
      }

      this.specialties[index].active = this.specialties[index].active === false;
      this.specialties[index].updatedAt = new Date().toISOString();

      this.saveSpecialties();
      this.applyFilters();
      this.refresh();

      const status = this.specialties[index].active ? "تفعيل" : "تعطيل";
      this.showMessage("تم " + status + " التخصص.", "success");

      return true;
    },

    /* ==================================================
       DELETE SPECIALTY
       ================================================== */

    deleteSpecialty: function (id) {
      // التحقق من وجود التخصص
      const specialty = this.specialties.find(function (s) {
        return String(s.id) === String(id);
      });

      if (!specialty) {
        this.showMessage("تعذر العثور على التخصص.", "error");
        return false;
      }

      // التحقق من استخدام التخصص من قبل أطباء
      const doctors = this.readJSON(localStorage, "monmedecin-doctors", []);
      const isUsed = doctors.some(function (doctor) {
        return doctor.specialty === specialty.name || 
               doctor.specialtyId === specialty.id ||
               (doctor.professional && doctor.professional.specialty === specialty.name);
      });

      if (isUsed) {
        // إذا كان مستخدماً، نقوم بتعطيله بدلاً من حذفه
        const confirmed = window.confirm(
          "⚠️ هذا التخصص مستخدم من قبل أحد الأطباء.\n" +
          "هل تريد تعطيل التخصص بدلاً من حذفه؟\n" +
          "(سيتم إخفاؤه من البحث لكن بيانات الأطباء ستبقى سليمة)"
        );
        
        if (confirmed) {
          this.toggleActive(id);
        }
        return false;
      }

      const confirmed = window.confirm("هل تريد حذف هذا التخصص نهائياً؟");
      if (!confirmed) return false;

      this.specialties = this.specialties.filter(function (s) {
        return String(s.id) !== String(id);
      });

      this.saveSpecialties();
      this.applyFilters();
      this.refresh();

      this.showMessage("تم حذف التخصص.", "success");
      return true;
    },

    /* ==================================================
       GET SPECIALTY
       ================================================== */

    getSpecialty: function (id) {
      return this.specialties.find(function (s) {
        return String(s.id) === String(id);
      }) || null;
    },

    /* ==================================================
       EXPORT SPECIALTIES
       ================================================== */

    exportSpecialties: function () {
      try {
        const data = JSON.stringify(this.specialties, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'specialties-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showMessage("تم تصدير التخصصات بنجاح.", "success");
      } catch (error) {
        this.showMessage("حدث خطأ أثناء التصدير.", "error");
      }
    },

    /* ==================================================
       IMPORT SPECIALTIES
       ================================================== */

    importSpecialties: function (file) {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) {
            this.showMessage("الملف غير صالح: يجب أن يكون مصفوفة.", "error");
            return;
          }

          const confirmed = window.confirm(
            "سيتم استيراد " + data.length + " تخصص.\n" +
            "هل تريد استبدال التخصصات الحالية أم دمجها؟\n" +
            "(OK = استبدال، Cancel = دمج)"
          );

          if (confirmed) {
            // استبدال كامل
            this.specialties = data.map(function(s) {
              if (!s.createdAt) s.createdAt = new Date().toISOString();
              if (!s.updatedAt) s.updatedAt = new Date().toISOString();
              return s;
            });
          } else {
            // دمج (إضافة التخصصات الجديدة فقط)
            const existingIds = new Set(this.specialties.map(function(s) { return s.id; }));
            data.forEach(function(s) {
              if (!existingIds.has(s.id)) {
                if (!s.createdAt) s.createdAt = new Date().toISOString();
                if (!s.updatedAt) s.updatedAt = new Date().toISOString();
                this.specialties.push(s);
              }
            }, this);
          }

          this.saveSpecialties();
          this.applyFilters();
          this.refresh();
          this.showMessage("تم استيراد التخصصات بنجاح.", "success");

        } catch (error) {
          this.showMessage("الملف غير صالح: " + error.message, "error");
        }
      }.bind(this);

      reader.onerror = function () {
        this.showMessage("حدث خطأ أثناء قراءة الملف.", "error");
      }.bind(this);

      reader.readAsText(file);
    },

    /* ==================================================
       MESSAGE
       ================================================== */

    showMessage: function (message, type) {
      const element = document.getElementById("adminSpecialtiesMessage");
      if (!element) {
        if (type === 'error') alert('❌ ' + message);
        else if (type === 'success') alert('✅ ' + message);
        else alert('ℹ️ ' + message);
        return;
      }

      element.hidden = false;
      element.textContent = message;

      element.classList.remove("is-success", "is-error", "is-info");
      element.classList.add(
        type === 'success' ? 'is-success' : type === 'info' ? 'is-info' : 'is-error'
      );

      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(function () {
        if (document.body.contains(element)) {
          element.hidden = true;
        }
      }, 3500);
    },

    /* ==================================================
       FORMAT DATE
       ================================================== */

    formatDate: function (value) {
      if (!value) return '—';
      try {
        return new Intl.DateTimeFormat('ar-DZ', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }).format(new Date(value));
      } catch (error) {
        return value;
      }
    },

    /* ==================================================
       RENDER SPECIALTY CARD
       ================================================== */

    renderSpecialty: function (specialty) {
      const isActive = specialty.active !== false;
      const categoryLabel = this.getCategoryLabel(specialty.category);

      return `
        <article class="admin-specialty-card glass ${isActive ? '' : 'is-inactive'}">
          <div class="admin-specialty-card__top">
            <div class="admin-specialty-card__identity">
              <div class="admin-specialty-card__icon">
                ${specialty.icon || "🩺"}
              </div>
              <div>
                <span class="category-badge">${this.escapeHTML(categoryLabel)}</span>
                <h3>${this.escapeHTML(specialty.name)}</h3>
                <small dir="ltr">${this.escapeHTML(specialty.id)}</small>
              </div>
            </div>
            <span class="admin-specialty-status ${isActive ? 'is-active' : 'is-inactive'}">
              ${isActive ? 'نشط' : 'متوقف'}
            </span>
          </div>

          ${specialty.description ? `
            <div class="admin-specialty-card__description">
              ${this.escapeHTML(specialty.description)}
            </div>
          ` : ''}

          <div class="admin-specialty-card__meta">
            <div>
              <span>الاسم بالفرنسية</span>
              <strong dir="ltr">${this.escapeHTML(specialty.nameFr || '—')}</strong>
            </div>
            <div>
              <span>الاسم بالإنجليزية</span>
              <strong dir="ltr">${this.escapeHTML(specialty.nameEn || '—')}</strong>
            </div>
            <div>
              <span>تاريخ الإضافة</span>
              <strong>${this.formatDate(specialty.createdAt)}</strong>
            </div>
          </div>

          <div class="admin-specialty-card__actions">
            <button class="is-edit" data-specialty-edit="${this.escapeHTML(specialty.id)}" type="button">
              ✏️ تعديل
            </button>
            <button class="is-toggle" data-specialty-toggle="${this.escapeHTML(specialty.id)}" type="button">
              ${isActive ? '🔴 تعطيل' : '🟢 تفعيل'}
            </button>
            <button class="is-delete" data-specialty-delete="${this.escapeHTML(specialty.id)}" type="button">
              🗑️ حذف
            </button>
          </div>
        </article>
      `;
    },

    /* ==================================================
       RENDER SPECIALTIES LIST
       ================================================== */

    renderSpecialties: function () {
      const paginated = this.getPaginatedSpecialties();

      if (paginated.length === 0) {
        return `
          <section class="admin-specialties-empty glass">
            <span>🩺</span>
            <h3>${this.specialties.length === 0
              ? 'لا توجد تخصصات'
              : 'لا توجد نتائج مطابقة'
            }</h3>
            <p>${this.specialties.length === 0
              ? 'لم يتم إضافة أي تخصصات طبية بعد.'
              : 'لم نجد تخصصات مطابقة للبحث الحالي.'
            }</p>
            ${this.specialties.length === 0 ? `
              <button id="adminSpecialtiesEmptyAdd" type="button">+ إضافة تخصص</button>
            ` : ''}
          </section>
        `;
      }

      return paginated.map(function (specialty) {
        return AdminSpecialtiesScreen.renderSpecialty(specialty);
      }).join('');
    },

    /* ==================================================
       RENDER PAGINATION
       ================================================== */

    renderPagination: function () {
      const totalPages = this.getTotalPages();
      if (totalPages <= 1) return '';

      let html = '<div class="admin-specialties-pagination">';
      
      // Previous
      html += `<button class="page-prev" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''}>‹</button>`;
      
      // Pages
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-number ${i === this.currentPage ? 'is-active' : ''}" data-page="${i}">${i}</button>`;
      }
      
      // Next
      html += `<button class="page-next" data-page="next" ${this.currentPage === totalPages ? 'disabled' : ''}>›</button>`;
      
      html += '</div>';
      return html;
    },

    /* ==================================================
       RENDER MODAL
       ================================================== */

    renderModal: function () {
      if (!this.modalOpen) return '';

      const isEditing = this.modalMode === 'edit';
      const specialty = isEditing ? this.getSpecialty(this.selectedSpecialtyId) : null;

      return `
        <div class="admin-specialty-modal-overlay">
          <section class="admin-specialty-modal glass">
            <header class="admin-specialty-modal__header">
              <div>
                <span>${isEditing ? 'تعديل' : 'إضافة'}</span>
                <h2>${isEditing ? 'تعديل التخصص' : 'تخصص جديد'}</h2>
              </div>
              <button id="adminSpecialtyModalClose" type="button">×</button>
            </header>

            <form id="adminSpecialtyForm" class="admin-specialty-form" novalidate>
              <div class="admin-specialty-form__grid">
                <label class="admin-specialty-field">
                  <span>الاسم (بالعربية) *</span>
                  <input id="specialtyName" type="text" value="${this.escapeHTML(specialty?.name || '')}" maxlength="100" placeholder="مثال: طب القلب" required>
                </label>

                <label class="admin-specialty-field">
                  <span>الاسم (بالفرنسية)</span>
                  <input id="specialtyNameFr" type="text" value="${this.escapeHTML(specialty?.nameFr || '')}" maxlength="100" placeholder="Exemple: Cardiologie" dir="ltr">
                </label>

                <label class="admin-specialty-field">
                  <span>الاسم (بالإنجليزية)</span>
                  <input id="specialtyNameEn" type="text" value="${this.escapeHTML(specialty?.nameEn || '')}" maxlength="100" placeholder="Example: Cardiology" dir="ltr">
                </label>

                <label class="admin-specialty-field">
                  <span>التصنيف</span>
                  <select id="specialtyCategory">
                    ${this.categories.map(function(cat) {
                      const selected = cat.id === (specialty?.category || 'general');
                      return `
                        <option value="${cat.id}" ${selected ? 'selected' : ''}>
                          ${cat.label}
                        </option>
                      `;
                    }).join('')}
                  </select>
                </label>

                <label class="admin-specialty-field">
                  <span>الأيقونة</span>
                  <input id="specialtyIcon" type="text" value="${this.escapeHTML(specialty?.icon || '🩺')}" maxlength="10" placeholder="🩺">
                  <span class="helper">استخدم Emoji مثل 🩺 ❤️ 🧠</span>
                </label>

                <label class="admin-specialty-field admin-specialty-field--full">
                  <span>الوصف</span>
                  <textarea id="specialtyDescription" rows="3" maxlength="300" placeholder="وصف مختصر للتخصص...">${this.escapeHTML(specialty?.description || '')}</textarea>
                </label>
              </div>

              <label class="admin-specialty-active">
                <div>
                  <strong>التخصص نشط</strong>
                  <span>عندما يكون نشطاً يظهر للمرضى والأطباء.</span>
                </div>
                <input id="specialtyActive" type="checkbox" ${(specialty?.active !== false) ? 'checked' : ''}>
              </label>

              <button class="admin-specialty-submit" type="submit">
                ${isEditing ? 'حفظ التغييرات' : 'إضافة التخصص'}
              </button>
            </form>
          </section>
        </div>
      `;
    },

    /* ==================================================
       RENDER
       ================================================== */

    render: function (state, app) {
      this.loadSpecialties();

      const stats = this.getStats();
      const isMobile = state.deviceMode === 'mobile';
      const totalPages = this.getTotalPages();

      return `
        <main class="admin-specialties ${isMobile ? 'mobile-app-page has-bottom-nav' : 'website-page'}">

          <div class="admin-specialties__orb admin-specialties__orb--blue"></div>
          <div class="admin-specialties__orb admin-specialties__orb--cyan"></div>

          <header class="admin-specialties__header">
            <button id="adminSpecialtiesBack" class="admin-specialties__back" type="button">→</button>
            <div class="admin-specialties__header-copy">
              <strong>إدارة التخصصات</strong>
              <span>التحكم الكامل في التخصصات الطبية</span>
            </div>
            <button id="adminSpecialtiesTheme" class="admin-specialties__theme" type="button">${state.theme === 'dark' ? '☀' : '◐'}</button>
          </header>

          <section class="admin-specialties__container">

            <section class="admin-specialties__hero">
              <span>🩺</span>
              <h1>التخصصات الطبية</h1>
              <p>إدارة التخصصات الطبية المتاحة للأطباء والمرضى. يمكنك إضافة، تعديل، حذف، وتفعيل/تعطيل التخصصات.</p>
            </section>

            <section class="admin-specialties-stats">
              <article class="admin-specialties-stat glass is-total">
                <span>جميع التخصصات</span>
                <strong>${stats.total}</strong>
              </article>
              <article class="admin-specialties-stat glass is-active">
                <span>نشطة</span>
                <strong>${stats.active}</strong>
              </article>
              <article class="admin-specialties-stat glass is-inactive">
                <span>متوقفة</span>
                <strong>${stats.inactive}</strong>
              </article>
            </section>

            <section class="admin-specialties-toolbar glass">
              <div class="admin-specialties-search">
                <span>⌕</span>
                <input id="adminSpecialtiesSearch" type="search" value="${this.escapeHTML(this.searchQuery)}" placeholder="ابحث باسم التخصص..." autocomplete="off">
              </div>
              <div class="admin-specialties-actions">
                <button id="adminSpecialtiesExport" type="button" title="تصدير التخصصات">📤 تصدير</button>
                <button id="adminSpecialtiesImport" type="button" title="استيراد التخصصات">📥 استيراد</button>
                <input type="file" id="adminSpecialtiesFileInput" accept=".json" style="display:none;">
                <button id="adminSpecialtiesCreate" type="button" class="is-create">+ إضافة تخصص</button>
              </div>
            </section>

            <div id="adminSpecialtiesMessage" class="admin-specialties-message" hidden></div>

            <div class="admin-specialties-count">
              <span>عرض ${this.filteredSpecialties.length} تخصص</span>
              ${this.filteredSpecialties.length > this.pageSize ? `<span>الصفحة ${this.currentPage} من ${totalPages}</span>` : ''}
            </div>

            <section id="adminSpecialtiesResults" class="admin-specialties-list">
              ${this.renderSpecialties()}
            </section>

            <div id="adminSpecialtiesPagination">
              ${this.renderPagination()}
            </div>

          </section>

          <div id="adminSpecialtiesModalRoot">
            ${this.renderModal()}
          </div>

          <!-- BOTTOM NAV -->
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
              <button class="mobile-bottom-nav__item is-active" data-nav="specialties" type="button">
                <span class="mobile-bottom-nav__icon">🩺</span>
                <span>التخصصات</span>
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

    refresh: function () {
      const results = document.getElementById('adminSpecialtiesResults');
      const pagination = document.getElementById('adminSpecialtiesPagination');
      const count = document.querySelector('.admin-specialties-count span:first-child');
      const totalPages = this.getTotalPages();

      if (results) {
        results.innerHTML = this.renderSpecialties();
      }

      if (pagination) {
        pagination.innerHTML = this.renderPagination();
      }

      if (count) {
        count.textContent = 'عرض ' + this.filteredSpecialties.length + ' تخصص';
      }

      // تحديث الإحصائيات
      const stats = this.getStats();
      const total = document.querySelector('.admin-specialties-stat.is-total strong');
      const active = document.querySelector('.admin-specialties-stat.is-active strong');
      const inactive = document.querySelector('.admin-specialties-stat.is-inactive strong');

      if (total) total.textContent = stats.total;
      if (active) active.textContent = stats.active;
      if (inactive) inactive.textContent = stats.inactive;
    },

    /* ==================================================
       INIT
       ================================================== */

    init: function (app) {
      this.loadSpecialties();

      // ==============================================
      // BACK
      // ==============================================
      document.getElementById('adminSpecialtiesBack')?.addEventListener('click', function () {
        app.navigate('/admin/dashboard');
      });

      // ==============================================
      // THEME
      // ==============================================
      document.getElementById('adminSpecialtiesTheme')?.addEventListener('click', function () {
        app.toggleTheme();
        app.render();
      });

      // ==============================================
      // SEARCH
      // ==============================================
      document.getElementById('adminSpecialtiesSearch')?.addEventListener('input', function (event) {
        AdminSpecialtiesScreen.searchQuery = event.target.value;
        AdminSpecialtiesScreen.applyFilters();
        AdminSpecialtiesScreen.currentPage = 1;
        AdminSpecialtiesScreen.refresh();
      });

      // ==============================================
      // CREATE
      // ==============================================
      document.getElementById('adminSpecialtiesCreate')?.addEventListener('click', function () {
        AdminSpecialtiesScreen.selectedSpecialtyId = null;
        AdminSpecialtiesScreen.modalMode = 'add';
        AdminSpecialtiesScreen.modalOpen = true;
        app.render();
      });

      document.getElementById('adminSpecialtiesEmptyAdd')?.addEventListener('click', function () {
        AdminSpecialtiesScreen.selectedSpecialtyId = null;
        AdminSpecialtiesScreen.modalMode = 'add';
        AdminSpecialtiesScreen.modalOpen = true;
        app.render();
      });

      // ==============================================
      // EXPORT
      // ==============================================
      document.getElementById('adminSpecialtiesExport')?.addEventListener('click', function () {
        AdminSpecialtiesScreen.exportSpecialties();
      });

      // ==============================================
      // IMPORT
      // ==============================================
      document.getElementById('adminSpecialtiesImport')?.addEventListener('click', function () {
        document.getElementById('adminSpecialtiesFileInput')?.click();
      });

      document.getElementById('adminSpecialtiesFileInput')?.addEventListener('change', function (event) {
        if (event.target.files && event.target.files.length > 0) {
          AdminSpecialtiesScreen.importSpecialties(event.target.files[0]);
          event.target.value = '';
        }
      });

      // ==============================================
      // RESULTS ACTIONS
      // ==============================================
      document.getElementById('adminSpecialtiesResults')?.addEventListener('click', function (event) {
        const edit = event.target.closest('[data-specialty-edit]');
        if (edit) {
          AdminSpecialtiesScreen.selectedSpecialtyId = edit.dataset.specialtyEdit;
          AdminSpecialtiesScreen.modalMode = 'edit';
          AdminSpecialtiesScreen.modalOpen = true;
          app.render();
          return;
        }

        const toggle = event.target.closest('[data-specialty-toggle]');
        if (toggle) {
          AdminSpecialtiesScreen.toggleActive(toggle.dataset.specialtyToggle);
          return;
        }

        const remove = event.target.closest('[data-specialty-delete]');
        if (remove) {
          AdminSpecialtiesScreen.deleteSpecialty(remove.dataset.specialtyDelete);
          return;
        }
      });

      // ==============================================
      // PAGINATION
      // ==============================================
      document.getElementById('adminSpecialtiesPagination')?.addEventListener('click', function (event) {
        const button = event.target.closest('[data-page]');
        if (!button) return;

        const page = button.dataset.page;
        const totalPages = AdminSpecialtiesScreen.getTotalPages();

        if (page === 'prev' && AdminSpecialtiesScreen.currentPage > 1) {
          AdminSpecialtiesScreen.currentPage--;
        } else if (page === 'next' && AdminSpecialtiesScreen.currentPage < totalPages) {
          AdminSpecialtiesScreen.currentPage++;
        } else if (page !== 'prev' && page !== 'next') {
          AdminSpecialtiesScreen.currentPage = parseInt(page);
        }

        AdminSpecialtiesScreen.refresh();
      });

      // ==============================================
      // MODAL
      // ==============================================
      document.getElementById('adminSpecialtiesModalRoot')?.addEventListener('click', function (event) {
        if (event.target.closest('#adminSpecialtyModalClose')) {
          AdminSpecialtiesScreen.modalOpen = false;
          AdminSpecialtiesScreen.selectedSpecialtyId = null;
          app.render();
          return;
        }

        if (event.target.closest('.admin-specialty-modal-overlay') === event.target) {
          AdminSpecialtiesScreen.modalOpen = false;
          AdminSpecialtiesScreen.selectedSpecialtyId = null;
          app.render();
        }
      });

      // ==============================================
      // FORM
      // ==============================================
      document.getElementById('adminSpecialtyForm')?.addEventListener('submit', function (event) {
        event.preventDefault();

        const data = {
          name: document.getElementById('specialtyName')?.value || '',
          nameFr: document.getElementById('specialtyNameFr')?.value || '',
          nameEn: document.getElementById('specialtyNameEn')?.value || '',
          category: document.getElementById('specialtyCategory')?.value || 'general',
          icon: document.getElementById('specialtyIcon')?.value || '🩺',
          description: document.getElementById('specialtyDescription')?.value || '',
          active: document.getElementById('specialtyActive')?.checked !== false,
        };

        if (AdminSpecialtiesScreen.modalMode === 'edit') {
          AdminSpecialtiesScreen.updateSpecialty(AdminSpecialtiesScreen.selectedSpecialtyId, data);
        } else {
          AdminSpecialtiesScreen.createSpecialty(data);
        }

        app.render();
      });

      // ==============================================
      // BOTTOM NAV
      // ==============================================
      document.querySelectorAll("[data-nav='dashboard']")?.forEach(function (btn) {
        btn.addEventListener('click', function () {
          app.navigate('/admin/dashboard');
        });
      });
      document.querySelectorAll("[data-nav='doctors']")?.forEach(function (btn) {
        btn.addEventListener('click', function () {
          app.navigate('/admin/doctors');
        });
      });
      document.querySelectorAll("[data-nav='specialties']")?.forEach(function (btn) {
        btn.addEventListener('click', function () {
          app.navigate('/admin/specialties');
        });
      });
      document.querySelectorAll("[data-nav='settings']")?.forEach(function (btn) {
        btn.addEventListener('click', function () {
          app.navigate('/admin/settings');
        });
      });
    }
  };

  window.AdminSpecialtiesScreen = AdminSpecialtiesScreen;

})();