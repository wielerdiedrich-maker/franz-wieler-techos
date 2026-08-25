// Canonical editable fields and first-run values for the Faro Estructuras public site.
export const DEFAULT_SITE_CONTENT = {
  heroBadge: "CONSTRUCCIÓN Y MONTAJE · BOLIVIA",
  heroTitle: "Techos que",
  heroHighlight: "responden.",
  heroDescription:
    "Soluciones duraderas en techado, estructuras metálicas y tinglados para proyectos residenciales, agrícolas y comerciales.",
  aboutEyebrow: "SOBRE EL TRABAJO",
  aboutTitle: "Hecho para durar. Hecho de frente.",
  aboutBody:
    "Cada cubierta y cada estructura se resuelven con atención al uso real del espacio, el clima de Santa Cruz y el ritmo de tu proyecto. Sin intermediarios: hablás directamente con Franz.",
  experienceText:
    "Construyendo techos y estructuras metálicas con trabajo directo en Pailón y Santa Cruz.",
  coverageTitle: "Desde Pailón, para Santa Cruz.",
  coverageBody:
    "Atención en Pailón, San José y zonas cercanas de Santa Cruz. Consultá por el alcance de tu proyecto.",
  contactTitle: "Contanos lo que querés construir.",
  contactBody:
    "Mandanos los datos básicos de tu proyecto. Al enviar, se abre WhatsApp con tu consulta lista para Franz.",
  phoneNumber: "+591 635 44951",
  whatsappNumber: "59163544951",
  location: "Pailón, Santa Cruz, Bolivia",
  footerDescription:
    "Techos, tinglados y estructuras metálicas resueltas con trabajo directo desde Pailón.",
} as const;

export type SiteContentKey = keyof typeof DEFAULT_SITE_CONTENT;
export type SiteContentMap = Record<SiteContentKey, string>;

export const DEFAULT_PROJECTS = [
  {
    category: "Estructura en montaje",
    title: "Armazón de gran luz en montaje",
    description: "Columnas reticuladas, cerchas de gran luz y cubierta metálica en proceso de montaje.",
    altText: "Estructura metálica de gran luz en proceso de montaje",
    imageUrl: "/manus-storage/faro-project-frame_d0ca8186.png",
    imageKey: null,
    sortOrder: 0,
    visible: true,
  },
  {
    category: "Galpón agrícola",
    title: "Cubierta para maquinaria",
    description: "Pórticos reticulados, laterales de calamina y altura libre para proteger equipos agrícolas.",
    altText: "Galpón agrícola terminado para proteger maquinaria",
    imageUrl: "/manus-storage/faro-project-shed_e9262caa.png",
    imageKey: null,
    sortOrder: 1,
    visible: true,
  },
  {
    category: "Montaje nocturno",
    title: "Montaje nocturno de cubierta",
    description: "Techo de doble pendiente, vigas reticuladas y apoyos metálicos instalados directamente en obra.",
    altText: "Tinglado metálico de gran luz durante un montaje nocturno",
    imageUrl: "/manus-storage/faro-project-hero_8f711cbb.png",
    imageKey: null,
    sortOrder: 2,
    visible: true,
  },
] as const;
