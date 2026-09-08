/* =====================================================
   MON MÉDECIN
   MEDICAL SPECIALTIES DATA - COMPLETE
   ===================================================== */

(function () {
  "use strict";

  /* ===================================================
     SPECIALTIES LIST (BASE DATA)
     =================================================== */

  const specialties = [
    /* ===============================================
       GENERAL MEDICINE
       =============================================== */
    {
      id: "general-medicine",
      nameAr: "الطب العام",
      nameFr: "Médecine générale",
      nameEn: "General Medicine",
      category: "general",
      icon: "🩺",
      keywords: ["طب عام", "طبيب عام", "عام", "médecin généraliste", "médecine générale", "general practitioner", "general medicine"]
    },
    {
      id: "family-medicine",
      nameAr: "طب الأسرة",
      nameFr: "Médecine familiale",
      nameEn: "Family Medicine",
      category: "general",
      icon: "👨‍👩‍👧‍👦",
      keywords: ["طب الأسرة", "طبيب الأسرة", "médecine familiale", "family medicine"]
    },
    {
      id: "internal-medicine",
      nameAr: "الطب الباطني",
      nameFr: "Médecine interne",
      nameEn: "Internal Medicine",
      category: "medicine",
      icon: "🩺",
      keywords: ["باطني", "طب باطني", "الطب الداخلي", "médecine interne", "internal medicine"]
    },

    /* ===============================================
       CARDIOLOGY
       =============================================== */
    {
      id: "cardiology",
      nameAr: "أمراض القلب",
      nameFr: "Cardiologie",
      nameEn: "Cardiology",
      category: "medicine",
      icon: "❤️",
      keywords: ["قلب", "القلب", "طبيب القلب", "أمراض القلب", "cardiologue", "cardiologie", "cardiologist", "cardiology"]
    },
    {
      id: "cardiovascular-diseases",
      nameAr: "أمراض القلب والأوعية الدموية",
      nameFr: "Maladies cardiovasculaires",
      nameEn: "Cardiovascular Medicine",
      category: "medicine",
      icon: "❤️",
      keywords: ["القلب والأوعية", "أوعية دموية", "cardiovasculaire", "cardiovascular"]
    },
    {
      id: "vascular-medicine",
      nameAr: "طب الأوعية الدموية",
      nameFr: "Médecine vasculaire",
      nameEn: "Vascular Medicine",
      category: "medicine",
      icon: "🩸",
      keywords: ["أوعية", "أوعية دموية", "طب الأوعية", "médecine vasculaire", "vascular medicine"]
    },

    /* ===============================================
       RESPIRATORY
       =============================================== */
    {
      id: "pulmonology",
      nameAr: "أمراض الصدر والجهاز التنفسي",
      nameFr: "Pneumologie",
      nameEn: "Pulmonology",
      category: "medicine",
      icon: "🫁",
      keywords: ["صدر", "الرئة", "الرئتين", "تنفس", "الجهاز التنفسي", "pneumologue", "pneumologie", "pulmonology", "lung"]
    },

    /* ===============================================
       DIGESTIVE SYSTEM
       =============================================== */
    {
      id: "gastroenterology",
      nameAr: "أمراض الجهاز الهضمي",
      nameFr: "Gastro-entérologie",
      nameEn: "Gastroenterology",
      category: "medicine",
      icon: "🫃",
      keywords: ["الجهاز الهضمي", "معدة", "أمعاء", "قولون", "هضمي", "gastro", "gastro-entérologie", "gastroenterology"]
    },
    {
      id: "hepatology",
      nameAr: "أمراض الكبد",
      nameFr: "Hépatologie",
      nameEn: "Hepatology",
      category: "medicine",
      icon: "🩺",
      keywords: ["كبد", "الكبد", "hépatologie", "hepatology"]
    },

    /* ===============================================
       ENDOCRINOLOGY
       =============================================== */
    {
      id: "endocrinology",
      nameAr: "أمراض الغدد الصماء",
      nameFr: "Endocrinologie",
      nameEn: "Endocrinology",
      category: "medicine",
      icon: "🧬",
      keywords: ["غدد", "الغدد", "الغدد الصماء", "هرمونات", "endocrinologue", "endocrinologie", "endocrinology"]
    },
    {
      id: "diabetology",
      nameAr: "السكري وأمراض الاستقلاب",
      nameFr: "Diabétologie",
      nameEn: "Diabetology",
      category: "medicine",
      icon: "🩸",
      keywords: ["سكري", "السكري", "سكر", "استقلاب", "diabète", "diabétologue", "diabétologie", "diabetes"]
    },

    /* ===============================================
       NEPHROLOGY
       =============================================== */
    {
      id: "nephrology",
      nameAr: "أمراض الكلى",
      nameFr: "Néphrologie",
      nameEn: "Nephrology",
      category: "medicine",
      icon: "🫘",
      keywords: ["كلى", "الكلى", "كلية", "néphrologue", "néphrologie", "nephrology", "kidney"]
    },

    /* ===============================================
       RHEUMATOLOGY
       =============================================== */
    {
      id: "rheumatology",
      nameAr: "أمراض الروماتيزم",
      nameFr: "Rhumatologie",
      nameEn: "Rheumatology",
      category: "medicine",
      icon: "🦴",
      keywords: ["روماتيزم", "مفاصل", "الروماتيزم", "rhumatologue", "rhumatologie", "rheumatology"]
    },

    /* ===============================================
       HEMATOLOGY
       =============================================== */
    {
      id: "hematology",
      nameAr: "أمراض الدم",
      nameFr: "Hématologie",
      nameEn: "Hematology",
      category: "medicine",
      icon: "🩸",
      keywords: ["دم", "أمراض الدم", "hématologie", "hematology"]
    },

    /* ===============================================
       INFECTIOUS DISEASES
       =============================================== */
    {
      id: "infectious-diseases",
      nameAr: "الأمراض المعدية",
      nameFr: "Maladies infectieuses",
      nameEn: "Infectious Diseases",
      category: "medicine",
      icon: "🦠",
      keywords: ["معدية", "عدوى", "الأمراض المعدية", "infectiologie", "maladies infectieuses", "infectious diseases"]
    },

    /* ===============================================
       ALLERGY / IMMUNOLOGY
       =============================================== */
    {
      id: "allergology",
      nameAr: "أمراض الحساسية",
      nameFr: "Allergologie",
      nameEn: "Allergology",
      category: "medicine",
      icon: "🌿",
      keywords: ["حساسية", "الحساسية", "allergologue", "allergologie", "allergy"]
    },
    {
      id: "immunology",
      nameAr: "المناعة",
      nameFr: "Immunologie",
      nameEn: "Immunology",
      category: "medicine",
      icon: "🛡️",
      keywords: ["مناعة", "المناعة", "immunologie", "immunology"]
    },

    /* ===============================================
       PEDIATRICS
       =============================================== */
    {
      id: "pediatrics",
      nameAr: "طب الأطفال",
      nameFr: "Pédiatrie",
      nameEn: "Pediatrics",
      category: "children",
      icon: "👶",
      keywords: ["أطفال", "طفل", "طب الأطفال", "طبيب أطفال", "pédiatre", "pédiatrie", "pediatrician", "pediatrics"]
    },
    {
      id: "neonatology",
      nameAr: "طب حديثي الولادة",
      nameFr: "Néonatologie",
      nameEn: "Neonatology",
      category: "children",
      icon: "👶",
      keywords: ["حديثي الولادة", "مولود", "رضيع", "néonatologie", "neonatology"]
    },

    /* ===============================================
       GYNECOLOGY
       =============================================== */
    {
      id: "gynecology-obstetrics",
      nameAr: "أمراض النساء والتوليد",
      nameFr: "Gynécologie-obstétrique",
      nameEn: "Obstetrics and Gynecology",
      category: "women",
      icon: "🤰",
      keywords: ["نساء", "توليد", "حمل", "ولادة", "أمراض النساء", "طبيب نساء", "gynécologue", "gynécologie", "obstétrique", "gynecology", "obstetrics"]
    },

    /* ===============================================
       NEUROLOGY
       =============================================== */
    {
      id: "neurology",
      nameAr: "طب الأعصاب",
      nameFr: "Neurologie",
      nameEn: "Neurology",
      category: "medicine",
      icon: "🧠",
      keywords: ["أعصاب", "الأعصاب", "طبيب أعصاب", "neurologue", "neurologie", "neurologist", "neurology"]
    },
    {
      id: "neurosurgery",
      nameAr: "جراحة الأعصاب",
      nameFr: "Neurochirurgie",
      nameEn: "Neurosurgery",
      category: "surgery",
      icon: "🧠",
      keywords: ["جراحة الأعصاب", "جراح أعصاب", "neurochirurgien", "neurochirurgie", "neurosurgery"]
    },

    /* ===============================================
       PSYCHIATRY
       =============================================== */
    {
      id: "psychiatry",
      nameAr: "الطب النفسي",
      nameFr: "Psychiatrie",
      nameEn: "Psychiatry",
      category: "mental",
      icon: "🧠",
      keywords: ["نفسي", "طب نفسي", "طبيب نفسي", "psychiatre", "psychiatrie", "psychiatrist", "psychiatry"]
    },
    {
      id: "child-psychiatry",
      nameAr: "الطب النفسي للأطفال والمراهقين",
      nameFr: "Pédopsychiatrie",
      nameEn: "Child and Adolescent Psychiatry",
      category: "mental",
      icon: "🧠",
      keywords: ["طب نفسي أطفال", "نفسي أطفال", "مراهقين", "pédopsychiatrie", "child psychiatry"]
    },

    /* ===============================================
       DERMATOLOGY
       =============================================== */
    {
      id: "dermatology",
      nameAr: "الأمراض الجلدية",
      nameFr: "Dermatologie",
      nameEn: "Dermatology",
      category: "medicine",
      icon: "🧴",
      keywords: ["جلد", "جلدية", "الأمراض الجلدية", "طبيب جلد", "dermatologue", "dermatologie", "dermatologist", "dermatology"]
    },
    {
      id: "dermatology-venereology",
      nameAr: "الأمراض الجلدية والتناسلية",
      nameFr: "Dermatologie et vénéréologie",
      nameEn: "Dermatology and Venereology",
      category: "medicine",
      icon: "🧴",
      keywords: ["جلدية وتناسلية", "تناسلية", "vénéréologie", "dermatologie"]
    },

    /* ===============================================
       OPHTHALMOLOGY
       =============================================== */
    {
      id: "ophthalmology",
      nameAr: "طب وجراحة العيون",
      nameFr: "Ophtalmologie",
      nameEn: "Ophthalmology",
      category: "surgery",
      icon: "👁️",
      keywords: ["عيون", "عين", "بصر", "نظر", "طبيب عيون", "ophtalmologue", "ophtalmologie", "ophthalmologist", "ophthalmology"]
    },

    /* ===============================================
       ENT
       =============================================== */
    {
      id: "ent",
      nameAr: "الأنف والأذن والحنجرة",
      nameFr: "Oto-rhino-laryngologie",
      nameEn: "Otolaryngology - ENT",
      category: "surgery",
      icon: "👂",
      keywords: ["أنف", "أذن", "حنجرة", "أنف أذن حنجرة", "orl", "oto-rhino-laryngologie", "ent", "otolaryngology"]
    },

    /* ===============================================
       UROLOGY
       =============================================== */
    {
      id: "urology",
      nameAr: "جراحة المسالك البولية",
      nameFr: "Urologie",
      nameEn: "Urology",
      category: "surgery",
      icon: "🩺",
      keywords: ["مسالك", "المسالك البولية", "بولية", "urologue", "urologie", "urologist", "urology"]
    },

    /* ===============================================
       GENERAL SURGERY
       =============================================== */
    {
      id: "general-surgery",
      nameAr: "الجراحة العامة",
      nameFr: "Chirurgie générale",
      nameEn: "General Surgery",
      category: "surgery",
      icon: "🏥",
      keywords: ["جراحة", "جراح", "جراحة عامة", "chirurgien", "chirurgie générale", "general surgery"]
    },

    /* ===============================================
       ORTHOPEDICS
       =============================================== */
    {
      id: "orthopedic-surgery",
      nameAr: "جراحة العظام والرضوض",
      nameFr: "Chirurgie orthopédique et traumatologie",
      nameEn: "Orthopedic Surgery and Traumatology",
      category: "surgery",
      icon: "🦴",
      keywords: ["عظام", "رضوض", "كسور", "جراحة العظام", "orthopédie", "traumatologie", "orthopedic"]
    },

    /* ===============================================
       CARDIAC SURGERY
       =============================================== */
    {
      id: "cardiac-surgery",
      nameAr: "جراحة القلب",
      nameFr: "Chirurgie cardiaque",
      nameEn: "Cardiac Surgery",
      category: "surgery",
      icon: "❤️",
      keywords: ["جراحة القلب", "جراح قلب", "chirurgie cardiaque", "cardiac surgery"]
    },
    {
      id: "cardiovascular-surgery",
      nameAr: "جراحة القلب والأوعية الدموية",
      nameFr: "Chirurgie cardiovasculaire",
      nameEn: "Cardiovascular Surgery",
      category: "surgery",
      icon: "❤️",
      keywords: ["جراحة القلب والأوعية", "chirurgie cardiovasculaire", "cardiovascular surgery"]
    },

    /* ===============================================
       THORACIC SURGERY
       =============================================== */
    {
      id: "thoracic-surgery",
      nameAr: "جراحة الصدر",
      nameFr: "Chirurgie thoracique",
      nameEn: "Thoracic Surgery",
      category: "surgery",
      icon: "🫁",
      keywords: ["جراحة الصدر", "chirurgie thoracique", "thoracic surgery"]
    },

    /* ===============================================
       VASCULAR SURGERY
       =============================================== */
    {
      id: "vascular-surgery",
      nameAr: "جراحة الأوعية الدموية",
      nameFr: "Chirurgie vasculaire",
      nameEn: "Vascular Surgery",
      category: "surgery",
      icon: "🩸",
      keywords: ["جراحة الأوعية", "أوعية دموية", "chirurgie vasculaire", "vascular surgery"]
    },

    /* ===============================================
       PEDIATRIC SURGERY
       =============================================== */
    {
      id: "pediatric-surgery",
      nameAr: "جراحة الأطفال",
      nameFr: "Chirurgie pédiatrique",
      nameEn: "Pediatric Surgery",
      category: "surgery",
      icon: "👶",
      keywords: ["جراحة الأطفال", "جراح أطفال", "chirurgie pédiatrique", "pediatric surgery"]
    },

    /* ===============================================
       PLASTIC SURGERY
       =============================================== */
    {
      id: "plastic-surgery",
      nameAr: "جراحة التجميل والترميم",
      nameFr: "Chirurgie plastique et reconstructrice",
      nameEn: "Plastic and Reconstructive Surgery",
      category: "surgery",
      icon: "✨",
      keywords: ["تجميل", "ترميم", "جراحة تجميل", "chirurgie plastique", "plastic surgery"]
    },

    /* ===============================================
       MAXILLOFACIAL
       =============================================== */
    {
      id: "maxillofacial-surgery",
      nameAr: "جراحة الوجه والفكين",
      nameFr: "Chirurgie maxillo-faciale",
      nameEn: "Maxillofacial Surgery",
      category: "surgery",
      icon: "🦷",
      keywords: ["وجه", "فكين", "جراحة الوجه", "جراحة الفكين", "maxillo-faciale", "maxillofacial"]
    },

    /* ===============================================
       ANESTHESIA
       =============================================== */
    {
      id: "anesthesiology",
      nameAr: "التخدير والإنعاش",
      nameFr: "Anesthésie-réanimation",
      nameEn: "Anesthesiology and Intensive Care",
      category: "hospital",
      icon: "💉",
      keywords: ["تخدير", "إنعاش", "anesthésie", "réanimation", "anesthesiology"]
    },

    /* ===============================================
       EMERGENCY
       =============================================== */
    {
      id: "emergency-medicine",
      nameAr: "طب الاستعجالات",
      nameFr: "Médecine d'urgence",
      nameEn: "Emergency Medicine",
      category: "hospital",
      icon: "🚑",
      keywords: ["استعجالات", "طوارئ", "urgence", "médecine d'urgence", "emergency medicine"]
    },

    /* ===============================================
       ONCOLOGY
       =============================================== */
    {
      id: "medical-oncology",
      nameAr: "طب الأورام",
      nameFr: "Oncologie médicale",
      nameEn: "Medical Oncology",
      category: "medicine",
      icon: "🎗️",
      keywords: ["أورام", "سرطان", "oncologue", "oncologie", "cancer", "oncology"]
    },
    {
      id: "radiation-oncology",
      nameAr: "العلاج الإشعاعي للأورام",
      nameFr: "Radiothérapie oncologique",
      nameEn: "Radiation Oncology",
      category: "medicine",
      icon: "☢️",
      keywords: ["علاج إشعاعي", "أشعة أورام", "radiothérapie", "radiation oncology"]
    },

    /* ===============================================
       RADIOLOGY
       =============================================== */
    {
      id: "radiology",
      nameAr: "الأشعة والتصوير الطبي",
      nameFr: "Radiologie et imagerie médicale",
      nameEn: "Radiology and Medical Imaging",
      category: "diagnostic",
      icon: "🩻",
      keywords: ["أشعة", "تصوير طبي", "راديو", "radiologue", "radiologie", "imagerie médicale", "radiology"]
    },

    /* ===============================================
       NUCLEAR MEDICINE
       =============================================== */
    {
      id: "nuclear-medicine",
      nameAr: "الطب النووي",
      nameFr: "Médecine nucléaire",
      nameEn: "Nuclear Medicine",
      category: "diagnostic",
      icon: "☢️",
      keywords: ["طب نووي", "médecine nucléaire", "nuclear medicine"]
    },

    /* ===============================================
       PATHOLOGY
       =============================================== */
    {
      id: "pathology",
      nameAr: "التشريح وعلم الخلايا المرضية",
      nameFr: "Anatomie et cytologie pathologiques",
      nameEn: "Anatomic Pathology",
      category: "laboratory",
      icon: "🔬",
      keywords: ["تشريح مرضي", "خلايا مرضية", "anatomopathologie", "pathology"]
    },

    /* ===============================================
       MEDICAL BIOLOGY
       =============================================== */
    {
      id: "medical-biology",
      nameAr: "البيولوجيا الطبية",
      nameFr: "Biologie médicale",
      nameEn: "Medical Biology",
      category: "laboratory",
      icon: "🔬",
      keywords: ["بيولوجيا", "تحاليل", "مخبر", "biologie médicale", "medical biology"]
    },

    /* ===============================================
       PHYSICAL MEDICINE
       =============================================== */
    {
      id: "physical-medicine",
      nameAr: "الطب الفيزيائي وإعادة التأهيل",
      nameFr: "Médecine physique et de réadaptation",
      nameEn: "Physical Medicine and Rehabilitation",
      category: "rehabilitation",
      icon: "♿",
      keywords: ["إعادة التأهيل", "تأهيل", "طب فيزيائي", "réadaptation", "médecine physique", "rehabilitation"]
    },

    /* ===============================================
       OCCUPATIONAL MEDICINE
       =============================================== */
    {
      id: "occupational-medicine",
      nameAr: "طب العمل",
      nameFr: "Médecine du travail",
      nameEn: "Occupational Medicine",
      category: "general",
      icon: "💼",
      keywords: ["طب العمل", "médecine du travail", "occupational medicine"]
    },

    /* ===============================================
       FORENSIC MEDICINE
       =============================================== */
    {
      id: "forensic-medicine",
      nameAr: "الطب الشرعي",
      nameFr: "Médecine légale",
      nameEn: "Forensic Medicine",
      category: "medicine",
      icon: "⚖️",
      keywords: ["طب شرعي", "الطب الشرعي", "médecine légale", "forensic medicine"]
    },

    /* ===============================================
       EPIDEMIOLOGY
       =============================================== */
    {
      id: "epidemiology",
      nameAr: "علم الأوبئة والطب الوقائي",
      nameFr: "Épidémiologie et médecine préventive",
      nameEn: "Epidemiology and Preventive Medicine",
      category: "public-health",
      icon: "🛡️",
      keywords: ["أوبئة", "وقاية", "طب وقائي", "épidémiologie", "médecine préventive", "epidemiology"]
    },

    /* ===============================================
       GERIATRICS
       =============================================== */
    {
      id: "geriatrics",
      nameAr: "طب الشيخوخة",
      nameFr: "Gériatrie",
      nameEn: "Geriatrics",
      category: "medicine",
      icon: "👴",
      keywords: ["شيخوخة", "كبار السن", "مسنين", "gériatrie", "geriatrics"]
    },

    /* ===============================================
       SPORTS MEDICINE
       =============================================== */
    {
      id: "sports-medicine",
      nameAr: "الطب الرياضي",
      nameFr: "Médecine du sport",
      nameEn: "Sports Medicine",
      category: "medicine",
      icon: "🏃",
      keywords: ["رياضة", "طب رياضي", "إصابات رياضية", "médecine du sport", "sports medicine"]
    },

    /* ===============================================
       NUTRITION
       =============================================== */
    {
      id: "medical-nutrition",
      nameAr: "التغذية الطبية",
      nameFr: "Nutrition médicale",
      nameEn: "Medical Nutrition",
      category: "medicine",
      icon: "🥗",
      keywords: ["تغذية", "حمية", "سمنة", "nutrition", "nutrition médicale"]
    },

    /* ===============================================
       DENTISTRY
       =============================================== */
    {
      id: "dentistry",
      nameAr: "طب وجراحة الأسنان",
      nameFr: "Médecine dentaire",
      nameEn: "Dentistry",
      category: "dentistry",
      icon: "🦷",
      keywords: ["أسنان", "طبيب أسنان", "جراحة الأسنان", "dentiste", "dentaire", "dentistry"]
    },
    {
      id: "orthodontics",
      nameAr: "تقويم الأسنان",
      nameFr: "Orthodontie",
      nameEn: "Orthodontics",
      category: "dentistry",
      icon: "🦷",
      keywords: ["تقويم", "تقويم الأسنان", "orthodontiste", "orthodontie", "orthodontics"]
    },
    {
      id: "periodontology",
      nameAr: "أمراض وجراحة اللثة",
      nameFr: "Parodontologie",
      nameEn: "Periodontology",
      category: "dentistry",
      icon: "🦷",
      keywords: ["لثة", "اللثة", "parodontologie", "periodontology"]
    },
    {
      id: "oral-surgery",
      nameAr: "جراحة الفم",
      nameFr: "Chirurgie orale",
      nameEn: "Oral Surgery",
      category: "dentistry",
      icon: "🦷",
      keywords: ["جراحة الفم", "chirurgie orale", "oral surgery"]
    },
    {
      id: "prosthodontics",
      nameAr: "تركيبات الأسنان",
      nameFr: "Prothèse dentaire",
      nameEn: "Prosthodontics",
      category: "dentistry",
      icon: "🦷",
      keywords: ["تركيبات الأسنان", "تركيبات", "prothèse dentaire", "prosthodontics"]
    },
    {
      id: "restorative-dentistry",
      nameAr: "علاج وترميم الأسنان",
      nameFr: "Dentisterie restauratrice",
      nameEn: "Restorative Dentistry",
      category: "dentistry",
      icon: "🦷",
      keywords: ["ترميم الأسنان", "علاج الأسنان", "dentisterie restauratrice", "restorative dentistry"]
    },
    {
      id: "pediatric-dentistry",
      nameAr: "طب أسنان الأطفال",
      nameFr: "Odontologie pédiatrique",
      nameEn: "Pediatric Dentistry",
      category: "dentistry",
      icon: "🦷",
      keywords: ["أسنان أطفال", "طبيب أسنان أطفال", "odontologie pédiatrique", "pediatric dentistry"]
    }
  ];

  /* ===================================================
     NORMALIZE TEXT
     =================================================== */

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /* ===================================================
     GET ALL
     =================================================== */

  function getAll() {
    return specialties.slice();
  }

  /* ===================================================
     GET BY ID
     =================================================== */

  function getById(id) {
    return specialties.find(function (specialty) {
      return String(specialty.id) === String(id);
    }) || null;
  }

  /* ===================================================
     GET NAME
     =================================================== */

  function getName(specialty, language) {
    if (!specialty) return "";
    switch (language) {
      case "fr": return specialty.nameFr || specialty.nameAr || "";
      case "en": return specialty.nameEn || specialty.nameAr || "";
      default: return specialty.nameAr || specialty.nameFr || specialty.nameEn || "";
    }
  }

  /* ===================================================
     GET BY CATEGORY
     =================================================== */

  function getByCategory(category) {
    if (!category) return getAll();
    return specialties.filter(function (specialty) {
      return specialty.category === category;
    });
  }

  /* ===================================================
     SEARCH
     =================================================== */

  function search(query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return getAll();

    return specialties.filter(function (specialty) {
      const values = [
        specialty.nameAr,
        specialty.nameFr,
        specialty.nameEn,
        specialty.category,
        ...(specialty.keywords || [])
      ];
      return values.some(function (value) {
        return normalizeText(value).includes(normalizedQuery);
      });
    });
  }

  /* ===================================================
     FIND BEST MATCH
     =================================================== */

  function findBestMatch(query) {
    const results = search(query);
    if (results.length === 0) return null;

    const normalizedQuery = normalizeText(query);
    const exact = results.find(function (specialty) {
      const values = [
        specialty.nameAr,
        specialty.nameFr,
        specialty.nameEn,
        ...(specialty.keywords || [])
      ];
      return values.some(function (value) {
        return normalizeText(value) === normalizedQuery;
      });
    });

    return exact || results[0];
  }

  /* ===================================================
     GET OPTIONS
     =================================================== */

  function getOptions(language) {
    const lang = language || document.documentElement.lang || "ar";
    return specialties.map(function (specialty) {
      return {
        value: specialty.id,
        label: getName(specialty, lang),
        icon: specialty.icon,
        category: specialty.category
      };
    });
  }

  /* ===================================================
     RENDER OPTIONS
     =================================================== */

  function renderOptions(selectedId, language) {
    const lang = language || document.documentElement.lang || "ar";
    return specialties.map(function (specialty) {
      const selected = String(specialty.id) === String(selectedId || "");
      return `
        <option value="${specialty.id}" ${selected ? "selected" : ""}>
          ${specialty.icon} ${getName(specialty, lang)}
        </option>
      `;
    }).join("");
  }

  /* ===================================================
     CATEGORIES
     =================================================== */

  const categories = [
    { id: "general", nameAr: "الطب العام", nameFr: "Médecine générale", nameEn: "General Medicine" },
    { id: "medicine", nameAr: "التخصصات الطبية", nameFr: "Spécialités médicales", nameEn: "Medical Specialties" },
    { id: "surgery", nameAr: "التخصصات الجراحية", nameFr: "Spécialités chirurgicales", nameEn: "Surgical Specialties" },
    { id: "children", nameAr: "طب الأطفال", nameFr: "Pédiatrie", nameEn: "Pediatrics" },
    { id: "women", nameAr: "صحة المرأة", nameFr: "Santé de la femme", nameEn: "Women's Health" },
    { id: "mental", nameAr: "الصحة النفسية", nameFr: "Santé mentale", nameEn: "Mental Health" },
    { id: "diagnostic", nameAr: "التشخيص والتصوير", nameFr: "Diagnostic et imagerie", nameEn: "Diagnostics and Imaging" },
    { id: "laboratory", nameAr: "التحاليل والمخابر", nameFr: "Laboratoire", nameEn: "Laboratory" },
    { id: "rehabilitation", nameAr: "إعادة التأهيل", nameFr: "Réadaptation", nameEn: "Rehabilitation" },
    { id: "dentistry", nameAr: "طب الأسنان", nameFr: "Médecine dentaire", nameEn: "Dentistry" },
    { id: "hospital", nameAr: "التخصصات الاستشفائية", nameFr: "Spécialités hospitalières", nameEn: "Hospital Specialties" },
    { id: "public-health", nameAr: "الصحة العمومية", nameFr: "Santé publique", nameEn: "Public Health" }
  ];

  /* ===================================================
     GET CATEGORY
     =================================================== */

  function getCategory(categoryId) {
    return categories.find(function (category) {
      return category.id === categoryId;
    }) || null;
  }

  /* ===================================================
     GET CATEGORY NAME
     =================================================== */

  function getCategoryName(categoryId, language) {
    const category = getCategory(categoryId);
    if (!category) return "";
    switch (language) {
      case "fr": return category.nameFr;
      case "en": return category.nameEn;
      default: return category.nameAr;
    }
  }

  /* ===================================================
     EXISTS
     =================================================== */

  function exists(specialtyId) {
    return specialties.some(function (specialty) {
      return String(specialty.id) === String(specialtyId);
    });
  }

  /* ===================================================
     RESOLVE
     =================================================== */

  function resolve(value) {
    if (!value) return null;

    const byId = getById(value);
    if (byId) return byId;

    const normalized = normalizeText(value);
    return specialties.find(function (specialty) {
      const values = [
        specialty.nameAr,
        specialty.nameFr,
        specialty.nameEn,
        ...(specialty.keywords || [])
      ];
      return values.some(function (item) {
        return normalizeText(item) === normalized;
      });
    }) || null;
  }

  /* ===================================================
     PUBLIC API
     =================================================== */

  window.MedicalSpecialties = {
    version: "1.0.0",
    specialties: specialties,
    categories: categories,
    normalizeText: normalizeText,
    getAll: getAll,
    getById: getById,
    getName: getName,
    getByCategory: getByCategory,
    getCategory: getCategory,
    getCategoryName: getCategoryName,
    search: search,
    findBestMatch: findBestMatch,
    getOptions: getOptions,
    renderOptions: renderOptions,
    exists: exists,
    resolve: resolve
  };

  console.log("MON MÉDECIN: Medical specialties loaded:", specialties.length);

})();