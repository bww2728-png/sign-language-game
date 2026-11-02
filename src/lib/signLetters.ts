export type SignLetter = {
  letter: string;
  nameAr: string;
  difficulty: "easy" | "medium" | "advanced";
  descriptionAr: string;
  exampleAr: string;
  asset: string;
};

export const signLetters: SignLetter[] = [
  {
    letter: "ا",
    nameAr: "الألف",
    difficulty: "easy",
    descriptionAr: "اطوِ الأصابع الأربعة في قبضة جانبية وارفع الإبهام وحده.",
    exampleAr: "أسد",
    asset: "/signs/sign-ar-alef.webp",
  },
  {
    letter: "ب",
    nameAr: "الباء",
    difficulty: "easy",
    descriptionAr: "ارفع السبابة وحدها وثبّت بقية الأصابع بالإبهام.",
    exampleAr: "باب",
    asset: "/signs/sign-ar-baa.webp",
  },
  {
    letter: "ت",
    nameAr: "التاء",
    difficulty: "easy",
    descriptionAr: "ارفع السبابة والوسطى متلاصقتين وثبّت الإصبعين الآخرين.",
    exampleAr: "تفاح",
    asset: "/signs/sign-ar-taa.webp",
  },
  {
    letter: "ث",
    nameAr: "الثاء",
    difficulty: "easy",
    descriptionAr: "ارفع ثلاثة أصابع متلاصقة وثبّت الخنصر بالإبهام.",
    exampleAr: "ثوب",
    asset: "/signs/sign-ar-thaa.webp",
  },
  {
    letter: "ج",
    nameAr: "الجيم",
    difficulty: "easy",
    descriptionAr:
      "اثنِ الأصابع إلى الداخل واعبر بالإبهام قطريًا نحو أعلى الكف.",
    exampleAr: "جمل",
    asset: "/signs/sign-ar-jeem.webp",
  },
  {
    letter: "ح",
    nameAr: "الحاء",
    difficulty: "easy",
    descriptionAr: "كوّن قبضة أمامية واجعل الإبهام أفقيًا تحت رؤوس الأصابع.",
    exampleAr: "حصان",
    asset: "/signs/sign-ar-haa.webp",
  },
  {
    letter: "خ",
    nameAr: "الخاء",
    difficulty: "medium",
    descriptionAr: "مدّ الأصابع الأربعة أفقيًا متلاصقة وارفع الإبهام عموديًا.",
    exampleAr: "خبز",
    asset: "/signs/sign-ar-khaa.webp",
  },
  {
    letter: "د",
    nameAr: "الدال",
    difficulty: "medium",
    descriptionAr: "شكّل فراغًا واسعًا بين السبابة والإبهام دون تلامس.",
    exampleAr: "دب",
    asset: "/signs/sign-ar-daal.webp",
  },
  {
    letter: "ذ",
    nameAr: "الذال",
    difficulty: "medium",
    descriptionAr:
      "اجعل السبابة والوسطى متوازيتين فوق إبهام منحني مع فراغ واضح.",
    exampleAr: "ذهب",
    asset: "/signs/sign-ar-dhaal.webp",
  },
  {
    letter: "س",
    nameAr: "السين",
    difficulty: "medium",
    descriptionAr:
      "افتح الكف واجعل الأصابع الأربعة متلاصقة مع الإبهام ظاهرًا على الحافة.",
    exampleAr: "سمك",
    asset: "/signs/sign-ar-seen.webp",
  },
  {
    letter: "ش",
    nameAr: "الشين",
    difficulty: "medium",
    descriptionAr:
      "افتح الكف مع انفراج خفيف بين الأصابع والإبهام بمحاذاة الحافة.",
    exampleAr: "شمس",
    asset: "/signs/sign-ar-sheen.webp",
  },
  {
    letter: "ص",
    nameAr: "الصاد",
    difficulty: "medium",
    descriptionAr: "كوّن قبضة أمامية واعبر بالإبهام أفقيًا تحت رؤوس الأصابع.",
    exampleAr: "صقر",
    asset: "/signs/sign-ar-saad.webp",
  },
  {
    letter: "ض",
    nameAr: "الضاد",
    difficulty: "medium",
    descriptionAr: "كوّن قبضة أمامية ومدّ الإبهام قطريًا بالكامل نحو الخارج.",
    exampleAr: "ضوء",
    asset: "/signs/sign-ar-daad.webp",
  },
  {
    letter: "ط",
    nameAr: "الطاء",
    difficulty: "medium",
    descriptionAr:
      "ارفع إصبعًا عموديًا وأغلق حلقة مسطحة بين إصبع أفقي والإبهام.",
    exampleAr: "طائر",
    asset: "/signs/sign-ar-taa-emphatic.webp",
  },
  {
    letter: "ع",
    nameAr: "العين",
    difficulty: "medium",
    descriptionAr:
      "اثنِ الأصابع الأربعة معًا في رزمة أفقية وأخفِ الإبهام تحتها.",
    exampleAr: "عين",
    asset: "/signs/sign-ar-ain.webp",
  },
  {
    letter: "غ",
    nameAr: "الغين",
    difficulty: "advanced",
    descriptionAr: "مدّ السبابة والوسطى أفقيًا متلاصقتين وارفع الإبهام خلفهما.",
    exampleAr: "غيمة",
    asset: "/signs/sign-ar-ghain.webp",
  },
  {
    letter: "ف",
    nameAr: "الفاء",
    difficulty: "advanced",
    descriptionAr: "المس طرف السبابة بطرف الإبهام لتكوين دائرة واضحة.",
    exampleAr: "فراشة",
    asset: "/signs/sign-ar-faa.webp",
  },
  {
    letter: "ق",
    nameAr: "القاف",
    difficulty: "advanced",
    descriptionAr:
      "كوّن حلقة صغيرة بين السبابة والإبهام فوق قبضة الأصابع الأخرى.",
    exampleAr: "قمر",
    asset: "/signs/sign-ar-qaaf.webp",
  },
  {
    letter: "ك",
    nameAr: "الكاف",
    difficulty: "advanced",
    descriptionAr:
      "ارفع الأصابع الأربعة متلاصقة واعبر بالإبهام قطريًا وسط الكف.",
    exampleAr: "كتاب",
    asset: "/signs/sign-ar-kaaf.webp",
  },
  {
    letter: "ل",
    nameAr: "اللام",
    difficulty: "advanced",
    descriptionAr: "ارفع السبابة ومدّ الإبهام جانبًا لتكوين شكل L.",
    exampleAr: "ليمون",
    asset: "/signs/sign-ar-laam.webp",
  },
  {
    letter: "م",
    nameAr: "الميم",
    difficulty: "advanced",
    descriptionAr:
      "ارفع الخنصر وحده واعبر بالإبهام فوق الأصابع الثلاثة المطوية.",
    exampleAr: "ماء",
    asset: "/signs/sign-ar-meem.webp",
  },
  {
    letter: "ن",
    nameAr: "النون",
    difficulty: "advanced",
    descriptionAr: "ارفع الإبهام والخنصر على جانبي الأصابع الثلاثة المطوية.",
    exampleAr: "نجم",
    asset: "/signs/sign-ar-noon.webp",
  },
  {
    letter: "هـ",
    nameAr: "الهاء",
    difficulty: "advanced",
    descriptionAr: "اجمع رؤوس الأصابع إلى الداخل عند نقطة مركزية أعلى الكف.",
    exampleAr: "هواء",
    asset: "/signs/sign-ar-heh.webp",
  },
  {
    letter: "و",
    nameAr: "الواو",
    difficulty: "advanced",
    descriptionAr: "كوّن قبضة جانبية ومدّ الإبهام أفقيًا نحو الخارج.",
    exampleAr: "وردة",
    asset: "/signs/sign-ar-waw.webp",
  },
  {
    letter: "ي",
    nameAr: "الياء",
    difficulty: "advanced",
    descriptionAr:
      "ارفع الخنصر عموديًا ومدّ الإبهام جانبًا مع طي الأصابع الوسطى.",
    exampleAr: "يد",
    asset: "/signs/sign-ar-yaa.webp",
  },
  {
    letter: "ء",
    nameAr: "الهمزة",
    difficulty: "advanced",
    descriptionAr:
      "ارفع السبابة والوسطى مع انفراج خفيف وثبّت الإصبعين الآخرين.",
    exampleAr: "سؤال",
    asset: "/signs/sign-ar-hamza.webp",
  },
];
