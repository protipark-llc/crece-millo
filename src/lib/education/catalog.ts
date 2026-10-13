/**
 * Catálogo de contenido educativo.
 *
 * Áreas de crecimiento, cursos, módulos y lecciones. El contenido es de carácter
 * educativo y general: no constituye asesoría financiera, tributaria ni legal personalizada.
 */
import type { Course, CourseModule, LearningArea, Lesson } from "./types";

export const LEARNING_AREAS: LearningArea[] = [
  {
    slug: "finanzas",
    name: "Finanzas personales y libertad financiera",
    description:
      "Aprende a entender, organizar y planificar tu dinero paso a paso, desde el diagnóstico hasta la toma de decisiones.",
    status: "available",
    icon: "Wallet",
    courseSlugs: ["finanzas-personales"],
  },
  {
    slug: "desarrollo-personal",
    name: "Desarrollo personal y mentalidad",
    description:
      "Herramientas para conocerte mejor, fortalecer tu autoconfianza y cultivar una mentalidad de crecimiento.",
    status: "coming_soon",
    icon: "Sparkles",
    courseSlugs: [],
  },
  {
    slug: "salud-bienestar",
    name: "Salud, bienestar y hábitos",
    description:
      "Construye hábitos sostenibles de descanso, movimiento y bienestar que acompañen tus metas.",
    status: "coming_soon",
    icon: "HeartPulse",
    courseSlugs: [],
  },
  {
    slug: "aprendizaje",
    name: "Educación y aprendizaje continuo",
    description:
      "Estrategias para aprender de forma autónoma y mantenerte en crecimiento a lo largo de la vida.",
    status: "coming_soon",
    icon: "GraduationCap",
    courseSlugs: [],
  },
  {
    slug: "productividad",
    name: "Productividad y gestión del tiempo",
    description:
      "Organiza tus prioridades y tu tiempo para avanzar en lo importante sin perder el equilibrio.",
    status: "coming_soon",
    icon: "Timer",
    courseSlugs: [],
  },
  {
    slug: "relaciones",
    name: "Relaciones personales y familiares",
    description:
      "Fortalece la comunicación y los acuerdos con las personas que te importan, incluidas las conversaciones sobre dinero.",
    status: "coming_soon",
    icon: "Users",
    courseSlugs: [],
  },
  {
    slug: "proposito",
    name: "Propósito, valores y desarrollo espiritual",
    description:
      "Reflexiona sobre lo que valoras y alinea tus decisiones con el sentido que quieres darle a tu vida.",
    status: "coming_soon",
    icon: "Compass",
    courseSlugs: [],
  },
  {
    slug: "emprendimiento",
    name: "Emprendimiento, negocios y generación de ingresos",
    description:
      "Explora cómo validar ideas, organizar un negocio y crear nuevas fuentes de ingreso de forma responsable.",
    status: "coming_soon",
    icon: "Rocket",
    courseSlugs: [],
  },
];

/* -------------------------------------------------------------------------- */
/* Nivel 1 · Diagnóstico y conciencia financiera                              */
/* -------------------------------------------------------------------------- */

const diagnostico: CourseModule = {
  slug: "diagnostico",
  level: 1,
  title: "Diagnóstico y conciencia financiera",
  goal: "Conocer con claridad y sin juicios cómo está hoy tu dinero: cuánto entra, cuánto sale y dónde está.",
  lessons: [
    {
      slug: "foto-financiera-actual",
      title: "Tu foto financiera de hoy",
      summary:
        "Un diagnóstico honesto de ingresos, gastos, deudas y ahorros es el punto de partida para cualquier plan.",
      minutes: 6,
      blocks: [
        {
          type: "paragraph",
          text: "Antes de hacer un plan necesitas saber dónde estás. Un diagnóstico financiero es como una foto: muestra tu situación en un momento dado. No es una calificación ni un juicio sobre ti; es información para tomar mejores decisiones.",
        },
        { type: "heading", text: "Las cuatro preguntas del diagnóstico" },
        {
          type: "list",
          ordered: true,
          items: [
            "¿Cuánto dinero entra cada mes y con qué regularidad?",
            "¿Cuánto sale y en qué se va?",
            "¿Cuánto debes, a quién y en qué condiciones?",
            "¿Cuánto tienes ahorrado y dónde está?",
          ],
        },
        { type: "heading", text: "Previsto vs. realizado" },
        {
          type: "paragraph",
          text: "Un movimiento previsto es el que esperas que ocurra (por ejemplo, el pago de un cliente el día 30). Uno realizado es el que ya pasó y se refleja en tu cuenta. Separar ambos evita contar con dinero que todavía no ha llegado.",
        },
        {
          type: "formula",
          formula: "Tasa de ahorro = (ingresos − gastos) ÷ ingresos",
          explanation:
            "Indica qué parte de lo que recibes logras conservar. Es un indicador para seguir tu evolución mes a mes, no una nota.",
        },
        {
          type: "example",
          title: "El diagnóstico de Laura",
          lines: [
            "Ingreso neto mensual: COP 3.200.000",
            "Gastos del mes: COP 2.900.000",
            "Diferencia: COP 3.200.000 − COP 2.900.000 = COP 300.000",
            "Tasa de ahorro: COP 300.000 ÷ COP 3.200.000 ≈ 9,4 %",
            "Deudas: tarjeta de crédito con saldo de COP 1.500.000",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "Si algunos números no te gustan, está bien. El diagnóstico no se trata de culpas: se trata de tener un punto de partida claro para medir tu avance.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Tus ingresos del mes fueron COP 4.000.000 y tus gastos COP 3.400.000. ¿Cuál es tu tasa de ahorro?",
          options: ["10 %", "15 %", "17,6 %", "85 %"],
          answer: 1,
          explanation:
            "(COP 4.000.000 − COP 3.400.000) ÷ COP 4.000.000 = COP 600.000 ÷ COP 4.000.000 = 15 %.",
        },
        {
          id: "q2",
          prompt:
            "Esperas recibir COP 500.000 por un trabajo independiente el día 30, pero aún no han llegado. ¿Cómo conviene tratarlos?",
          options: [
            "Como dinero realizado, porque ya está acordado",
            "Como dinero previsto, hasta que efectivamente llegue a tu cuenta",
            "No registrarlos en ningún lado",
          ],
          answer: 1,
          explanation:
            "Mientras no lo recibas es dinero previsto. Pasa a realizado cuando entra a tu cuenta.",
        },
      ],
      practice: {
        text: "Completa tu diagnóstico inicial con tus ingresos, gastos, deudas y ahorros aproximados. No necesitas cifras perfectas para empezar.",
        href: "/universidad/finanzas/diagnostico",
        cta: "Hacer mi diagnóstico",
      },
    },
    {
      slug: "cuentas-y-saldos",
      title: "Tus cuentas y sus saldos",
      summary:
        "Registrar dónde está tu dinero y distinguir entre saldo registrado, conciliado y proyectado te da una visión real de lo que tienes.",
      minutes: 6,
      blocks: [
        {
          type: "paragraph",
          text: "Tu dinero suele estar repartido: una cuenta de ahorros, una billetera digital, algo de efectivo. Ver todo junto te ayuda a saber cuánto tienes en realidad.",
        },
        { type: "heading", text: "Tres formas de mirar un saldo" },
        {
          type: "list",
          items: [
            "Saldo registrado: el que resulta de los movimientos que has anotado.",
            "Saldo conciliado: el registrado, después de compararlo con el extracto o la app del banco y confirmar que coinciden.",
            "Saldo proyectado: el registrado más los ingresos previstos y menos los pagos previstos hasta una fecha.",
          ],
        },
        {
          type: "example",
          title: "Saldo proyectado a fin de mes",
          lines: [
            "Saldo registrado hoy: COP 1.800.000",
            "Pago previsto de arriendo: − COP 1.100.000",
            "Ingreso previsto de la quincena: + COP 1.600.000",
            "Saldo proyectado: COP 1.800.000 − COP 1.100.000 + COP 1.600.000 = COP 2.300.000",
          ],
        },
        { type: "heading", text: "Las transferencias entre tus cuentas" },
        {
          type: "paragraph",
          text: "Si pasas COP 300.000 de tu cuenta de ahorros a tu billetera digital, no ganaste ni gastaste nada: solo moviste dinero de lugar. Por eso una transferencia entre tus propias cuentas no es ingreso ni gasto, y tu total sigue igual.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "Conciliar una vez a la semana o cada quincena toma pocos minutos y evita sorpresas por cobros que olvidaste anotar.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Transfieres COP 400.000 de tu cuenta de ahorros a tu billetera digital. ¿Cómo afecta eso tus ingresos y gastos?",
          options: [
            "Es un gasto de COP 400.000",
            "Es un ingreso de COP 400.000",
            "No es ingreso ni gasto; solo cambia dónde está el dinero",
          ],
          answer: 2,
          explanation:
            "Es una transferencia entre tus cuentas: el total de tu dinero no cambia.",
        },
        {
          id: "q2",
          prompt:
            "Tu saldo registrado es COP 900.000. Tienes un ingreso previsto de COP 1.500.000 y un pago previsto de COP 700.000. ¿Cuál es tu saldo proyectado?",
          options: ["COP 900.000", "COP 1.700.000", "COP 2.400.000", "COP 3.100.000"],
          answer: 1,
          explanation: "COP 900.000 + COP 1.500.000 − COP 700.000 = COP 1.700.000.",
        },
        {
          id: "q3",
          prompt: "¿Qué significa que un saldo esté conciliado?",
          options: [
            "Que lo comparaste con el extracto o la app del banco y coincide",
            "Que incluye los ingresos que esperas recibir",
            "Que ya pagaste todas tus deudas",
          ],
          answer: 0,
          explanation:
            "Conciliar es verificar tu registro contra la información de la entidad financiera.",
        },
      ],
      practice: {
        text: "Registra cada una de tus cuentas (bancos, billeteras digitales y efectivo) con su saldo actual.",
        href: "/universidad/finanzas/cuentas",
        cta: "Registrar mis cuentas",
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Nivel 2 · Organización de ingresos y gastos                                */
/* -------------------------------------------------------------------------- */

const ingresosGastos: CourseModule = {
  slug: "ingresos-gastos",
  level: 2,
  title: "Organización de ingresos y gastos",
  goal: "Clasificar tus ingresos y gastos de forma que puedas entender su ritmo y planificar con ellos.",
  lessons: [
    {
      slug: "tipos-de-ingresos",
      title: "Ingresos fijos, variables y ocasionales",
      summary:
        "Reconocer el tipo y el calendario de cada ingreso te permite planificar con cifras realistas.",
      minutes: 6,
      blocks: [
        {
          type: "paragraph",
          text: "No todos los ingresos se comportan igual. Algunos llegan en la misma fecha y por el mismo valor; otros cambian cada mes, y otros aparecen solo algunas veces al año.",
        },
        {
          type: "list",
          items: [
            "Fijos: un salario que se paga por quincena, por ejemplo el 15 y el último día del mes.",
            "Variables: honorarios, comisiones, ventas o trabajos independientes.",
            "Ocasionales: la prima de servicios, las cesantías, un bono o un reembolso.",
          ],
        },
        {
          type: "example",
          title: "Un salario por quincenas",
          lines: [
            "Salario neto mensual: COP 2.800.000",
            "Pago del 15: COP 1.400.000",
            "Pago del último día del mes: COP 1.400.000",
          ],
        },
        { type: "heading", text: "Cómo planificar con ingresos variables" },
        {
          type: "formula",
          formula: "Ingreso promedio = suma de los ingresos de varios meses ÷ número de meses",
          explanation:
            "Usa al menos tres meses. Si tus ingresos cambian mucho, puede ser más prudente planificar con un valor cercano a tus meses más bajos.",
        },
        {
          type: "example",
          title: "Ingresos independientes de Andrés",
          lines: [
            "Enero: COP 600.000 · Febrero: COP 200.000 · Marzo: COP 1.000.000",
            "Suma: COP 1.800.000",
            "Promedio: COP 1.800.000 ÷ 3 = COP 600.000",
          ],
        },
        {
          type: "callout",
          tone: "info",
          text: "Las cesantías suelen consignarse en un fondo y su retiro tiene condiciones específicas. Para temas laborales o tributarios, valida tu caso con un profesional o con tu fondo.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Tus ingresos independientes fueron COP 900.000, COP 1.500.000 y COP 600.000 en tres meses. ¿Cuál es el promedio?",
          options: ["COP 900.000", "COP 1.000.000", "COP 1.500.000", "COP 3.000.000"],
          answer: 1,
          explanation: "(COP 900.000 + COP 1.500.000 + COP 600.000) ÷ 3 = COP 3.000.000 ÷ 3 = COP 1.000.000.",
        },
        {
          id: "q2",
          prompt: "¿Cómo se clasifica mejor la prima de servicios?",
          options: [
            "Como ingreso fijo mensual",
            "Como ingreso ocasional, al que conviene asignar un destino antes de recibirlo",
            "Como una transferencia entre cuentas",
          ],
          answer: 1,
          explanation:
            "Llega solo en algunos momentos del año, así que es un ingreso ocasional.",
        },
        {
          id: "q3",
          prompt:
            "Tu salario neto mensual es COP 3.000.000 y te lo pagan en dos quincenas iguales. ¿Cuánto recibes el 15?",
          options: ["COP 1.000.000", "COP 1.500.000", "COP 3.000.000"],
          answer: 1,
          explanation: "COP 3.000.000 ÷ 2 = COP 1.500.000 en cada quincena.",
        },
      ],
      practice: {
        text: "Registra tus ingresos indicando si son fijos, variables u ocasionales y en qué fechas los esperas.",
        href: "/universidad/finanzas/ingresos",
        cta: "Registrar mis ingresos",
      },
    },
    {
      slug: "clasificar-gastos",
      title: "Clasificar gastos: esenciales, discrecionales, fijos y variables",
      summary:
        "Mirar cada gasto desde dos ángulos te muestra qué es prioritario y qué tienes margen para ajustar.",
      minutes: 7,
      blocks: [
        {
          type: "paragraph",
          text: "Clasificar gastos no es dividirlos en buenos y malos. Es entender qué necesitas para vivir y qué decides darte, y cuáles se repiten por el mismo valor y cuáles cambian.",
        },
        { type: "heading", text: "Dos ejes de clasificación" },
        {
          type: "list",
          items: [
            "Esenciales: los que necesitas para vivir y trabajar (vivienda, alimentación, servicios, transporte, salud).",
            "Discrecionales: los que eliges por gusto o comodidad (salidas, domicilios, suscripciones).",
            "Fijos: mismo valor cada periodo (arriendo, una suscripción).",
            "Variables: su valor cambia (mercado, servicios públicos, transporte).",
          ],
        },
        {
          type: "example",
          title: "Los gastos de un mes",
          lines: [
            "Arriendo: COP 1.100.000 (esencial, fijo)",
            "Mercado: COP 650.000 (esencial, variable)",
            "Servicios públicos: COP 220.000 (esencial, variable)",
            "Plan de celular: COP 60.000 (esencial, fijo)",
            "Domicilios: COP 180.000 (discrecional, variable)",
            "Suscripción de video: COP 45.000 (discrecional, fijo)",
            "Esenciales: COP 2.030.000 · Discrecionales: COP 225.000 · Total: COP 2.255.000",
          ],
        },
        {
          type: "paragraph",
          text: "El total de gastos esenciales es una cifra clave: la usarás más adelante para dimensionar tu fondo de emergencia.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "La clasificación depende de tu contexto. Para alguien que trabaja desde casa, el internet puede ser esencial; para otra persona, no tanto. Lo importante es que la clasificación te sirva a ti.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt: "¿Cómo se clasifica normalmente el mercado del mes?",
          options: ["Esencial y fijo", "Esencial y variable", "Discrecional y fijo", "Discrecional y variable"],
          answer: 1,
          explanation:
            "Es necesario para vivir (esencial) y su valor cambia de un mes a otro (variable).",
        },
        {
          id: "q2",
          prompt:
            "Una suscripción a una plataforma de video que cuesta COP 40.000 todos los meses se clasifica como:",
          options: ["Esencial y fijo", "Esencial y variable", "Discrecional y fijo", "Discrecional y variable"],
          answer: 2,
          explanation: "Es una elección de entretenimiento (discrecional) con valor constante (fijo).",
        },
        {
          id: "q3",
          prompt:
            "Arriendo COP 900.000, mercado COP 500.000, servicios COP 150.000 y salidas COP 200.000. ¿Cuánto suman los gastos esenciales?",
          options: ["COP 1.400.000", "COP 1.550.000", "COP 1.750.000", "COP 1.050.000"],
          answer: 1,
          explanation:
            "Arriendo, mercado y servicios son esenciales: COP 900.000 + COP 500.000 + COP 150.000 = COP 1.550.000.",
        },
      ],
      practice: {
        text: "Registra tus gastos del último mes y marca cada uno como esencial o discrecional, fijo o variable.",
        href: "/universidad/finanzas/gastos",
        cta: "Clasificar mis gastos",
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Nivel 3 · Presupuesto y flujo de caja                                      */
/* -------------------------------------------------------------------------- */

const presupuestoFlujo: CourseModule = {
  slug: "presupuesto-flujo",
  level: 3,
  title: "Presupuesto y flujo de caja",
  goal: "Convertir tus ingresos y gastos en un plan mensual y ver cómo se mueve tu dinero día a día.",
  lessons: [
    {
      slug: "armar-presupuesto",
      title: "Arma un presupuesto que se adapte a ti",
      summary:
        "Un presupuesto es un plan para tu dinero: asigna cada peso a un propósito e incluye los gastos anuales repartidos mes a mes.",
      minutes: 7,
      blocks: [
        {
          type: "paragraph",
          text: "Un presupuesto es una decisión anticipada sobre cómo quieres usar tu dinero. No es una camisa de fuerza: puedes ajustarlo cuando la realidad cambie.",
        },
        {
          type: "callout",
          tone: "warning",
          text: "Presupuesto no es lo mismo que dinero disponible. Tener COP 300.000 presupuestados para ropa no significa que estén en tu cuenta; lo disponible depende del saldo real.",
        },
        { type: "heading", text: "Una referencia para empezar: 50/30/20" },
        {
          type: "paragraph",
          text: "La regla 50/30/20 sugiere destinar cerca del 50 % a necesidades, 30 % a gustos y 20 % a ahorro o pago de deudas. Es un punto de partida, no una ley: según tu ciudad, tus ingresos y tus responsabilidades, tus porcentajes pueden ser otros.",
        },
        {
          type: "example",
          title: "50/30/20 con un ingreso neto de COP 4.000.000",
          lines: [
            "Necesidades (50 %): COP 2.000.000",
            "Gustos (30 %): COP 1.200.000",
            "Ahorro o deudas (20 %): COP 800.000",
          ],
        },
        { type: "heading", text: "Los gastos anuales también son mensuales" },
        {
          type: "formula",
          formula: "Reserva mensual = gasto anual ÷ 12",
          explanation:
            "Separa cada mes una doceava parte de los gastos que pagas una vez al año, para que no te tomen por sorpresa.",
        },
        {
          type: "example",
          title: "Impuesto predial y SOAT",
          lines: [
            "Impuesto predial anual: COP 1.200.000 ÷ 12 = COP 100.000 al mes",
            "SOAT anual: COP 960.000 ÷ 12 = COP 80.000 al mes",
            "Reserva mensual total: COP 180.000",
          ],
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Tu impuesto predial anual es COP 1.800.000. ¿Cuánto deberías reservar cada mes para cubrirlo?",
          options: ["COP 100.000", "COP 150.000", "COP 180.000", "COP 1.500.000"],
          answer: 1,
          explanation: "COP 1.800.000 ÷ 12 = COP 150.000 al mes.",
        },
        {
          id: "q2",
          prompt:
            "Si tomas como referencia la regla 50/30/20 con un ingreso neto de COP 3.500.000, ¿cuánto correspondería al 20 %?",
          options: ["COP 350.000", "COP 700.000", "COP 1.050.000", "COP 1.750.000"],
          answer: 1,
          explanation: "20 % de COP 3.500.000 = COP 700.000.",
        },
        {
          id: "q3",
          prompt:
            "Presupuestaste COP 400.000 para transporte este mes. ¿Significa que tienes ese dinero disponible?",
          options: [
            "Sí, el presupuesto garantiza el dinero",
            "No; el presupuesto es un plan y lo disponible depende del saldo real de tus cuentas",
            "Solo si es un gasto esencial",
          ],
          answer: 1,
          explanation:
            "El presupuesto indica la intención; el saldo de tus cuentas indica lo que realmente tienes.",
        },
      ],
      practice: {
        text: "Crea tu presupuesto del mes e incluye una línea para tus gastos anuales divididos entre 12.",
        href: "/universidad/finanzas/presupuesto",
        cta: "Crear mi presupuesto",
      },
    },
    {
      slug: "flujo-de-caja-mensual",
      title: "Flujo de caja: tu dinero en el calendario",
      summary:
        "El flujo de caja muestra cuándo entra y cuándo sale el dinero, para anticipar los días en que podría faltar.",
      minutes: 7,
      blocks: [
        {
          type: "paragraph",
          text: "El presupuesto responde «¿en qué voy a usar el dinero?». El flujo de caja responde «¿cuándo?». Un mes puede cuadrar en total y aun así tener días en los que el saldo no alcanza.",
        },
        {
          type: "formula",
          formula: "Saldo final = saldo inicial + entradas − salidas",
          explanation: "Se calcula para un periodo (un día, una quincena o un mes).",
        },
        { type: "heading", text: "Págate primero" },
        {
          type: "paragraph",
          text: "Una idea práctica, propuesta en el libro «Un inmueble al año no hace daño», es poner los ahorros como la primera línea de tu flujo de caja mensual: apartar el ahorro apenas recibes el ingreso, antes de cubrir lo demás.",
        },
        {
          type: "example",
          title: "Cuando el mes cuadra pero un día no",
          lines: [
            "Ingresos: COP 1.500.000 el 15 y COP 1.500.000 el último día del mes",
            "Saldo el día 1: COP 1.300.000",
            "Día 5, arriendo: − COP 1.000.000 → saldo COP 300.000",
            "Días 6 a 14, mercado y transporte: − COP 450.000 → saldo − COP 150.000",
            "Día 15, quincena: + COP 1.500.000 → saldo COP 1.350.000",
          ],
        },
        {
          type: "paragraph",
          text: "En el ejemplo, el faltante aparece antes del 15. Algunas opciones: mover compras grandes después de la quincena, acordar otra fecha de pago o dejar un colchón del pago anterior.",
        },
        {
          type: "callout",
          tone: "info",
          text: "Combina lo realizado con lo previsto: así ves cómo terminará el mes si todo sale según lo planeado, y ajustas a tiempo si algo cambia.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Empiezas el mes con COP 500.000, entran COP 3.000.000 y salen COP 2.800.000. ¿Cuál es tu saldo final?",
          options: ["COP 200.000", "COP 700.000", "COP 3.300.000", "COP 6.300.000"],
          answer: 1,
          explanation: "COP 500.000 + COP 3.000.000 − COP 2.800.000 = COP 700.000.",
        },
        {
          id: "q2",
          prompt: "¿Por qué poner «Ahorros» como primera línea del flujo de caja?",
          options: [
            "Para apartar el ahorro al recibir el ingreso, antes de que se diluya en otros gastos",
            "Porque el ahorro es un gasto obligatorio por ley",
            "Para que el presupuesto se vea más grande",
          ],
          answer: 0,
          explanation:
            "Ahorrar al inicio, y no con lo que sobre, facilita que el ahorro realmente ocurra.",
        },
        {
          id: "q3",
          prompt:
            "Te pagan el 15 y el último día del mes, y tu arriendo vence el 5. ¿Qué te muestra el flujo de caja que el presupuesto no muestra?",
          options: [
            "Cuánto gastas en total al mes",
            "En qué días podría faltar dinero aunque el mes, en total, cuadre",
            "Tu patrimonio neto",
          ],
          answer: 1,
          explanation: "El flujo de caja ordena entradas y salidas en el tiempo.",
        },
      ],
      practice: {
        text: "Revisa tu flujo de caja del mes, ubica tus fechas de pago e identifica si algún día el saldo proyectado queda en rojo.",
        href: "/universidad/finanzas/flujo-de-caja",
        cta: "Ver mi flujo de caja",
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Nivel 4 · Deudas y obligaciones                                            */
/* -------------------------------------------------------------------------- */

const deudas: CourseModule = {
  slug: "deudas",
  level: 4,
  title: "Deudas y obligaciones",
  goal: "Entender cuánto te cuestan tus deudas y elegir una estrategia sostenible para pagarlas.",
  lessons: [
    {
      slug: "entender-tasas-de-interes",
      title: "Entender las tasas: E.A., N.A.M.V. y mensual",
      summary:
        "Convertir las tasas a una misma base te permite comparar créditos y saber cuánto te cuesta cada deuda.",
      minutes: 8,
      blocks: [
        {
          type: "paragraph",
          text: "Una misma deuda puede anunciarse con tasas expresadas de formas distintas. Para comparar, conviene llevarlas todas a la misma base, normalmente la efectiva anual (E.A.).",
        },
        {
          type: "list",
          items: [
            "Tasa mensual: el interés que se cobra cada mes sobre el saldo.",
            "N.A.M.V. (nominal anual mes vencido): la tasa mensual multiplicada por 12. No incluye el efecto de cobrar intereses sobre intereses.",
            "E.A. (efectiva anual): el costo real en un año, incluyendo ese efecto compuesto.",
          ],
        },
        {
          type: "formula",
          formula: "Tasa mensual = N.A.M.V. ÷ 12    ·    E.A. = (1 + tasa mensual)^12 − 1",
          explanation:
            "Para ir de E.A. a mensual: tasa mensual = (1 + E.A.)^(1/12) − 1.",
        },
        {
          type: "example",
          title: "Convertir 24 % N.A.M.V.",
          lines: [
            "Tasa mensual: 24 % ÷ 12 = 2 %",
            "E.A.: (1,02)^12 − 1 ≈ 26,82 %",
            "De E.A. a mensual: 30 % E.A. equivale a cerca de 2,21 % mensual",
          ],
        },
        {
          type: "example",
          title: "Interés de un mes",
          lines: [
            "Saldo de la deuda: COP 5.000.000",
            "Tasa: 2 % mensual",
            "Interés del mes: COP 5.000.000 × 2 % = COP 100.000",
          ],
        },
        {
          type: "paragraph",
          text: "Los créditos educativos, como los del ICETEX, pueden tener condiciones distintas según la línea y la etapa del crédito. Revisa en tu contrato cómo está expresada la tasa y conviértela a E.A. para compararla con otras opciones.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "Además de la tasa, revisa seguros, cuotas de manejo y otros cargos. Lo que más te importa es el costo total del crédito.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt: "Un crédito tiene una tasa de 36 % N.A.M.V. ¿Cuál es su tasa mensual?",
          options: ["3 %", "36 %", "2,6 %", "4 %"],
          answer: 0,
          explanation: "36 % ÷ 12 = 3 % mensual.",
        },
        {
          id: "q2",
          prompt: "¿Cuál crédito es más costoso: A, al 2 % mensual, o B, al 25 % E.A.?",
          options: [
            "El B, porque 25 es mayor que 2",
            "El A, porque 2 % mensual equivale a cerca de 26,82 % E.A.",
            "Cuestan lo mismo",
            "No se pueden comparar",
          ],
          answer: 1,
          explanation: "(1,02)^12 − 1 ≈ 26,82 % E.A., que es mayor que 25 % E.A.",
        },
        {
          id: "q3",
          prompt:
            "Debes COP 3.000.000 a una tasa de 1,5 % mensual. ¿Cuánto interés se genera en un mes?",
          options: ["COP 4.500", "COP 45.000", "COP 450.000", "COP 30.000"],
          answer: 1,
          explanation: "COP 3.000.000 × 1,5 % = COP 45.000.",
        },
      ],
      practice: {
        text: "Registra tus deudas con su saldo, cuota mínima y tasa, indicando si la tasa es E.A., N.A.M.V. o mensual.",
        href: "/universidad/finanzas/deudas",
        cta: "Registrar mis deudas",
      },
    },
    {
      slug: "estrategias-para-pagar-deudas",
      title: "Ordenar y pagar deudas: avalancha y bola de nieve",
      summary:
        "Medir el peso de tus cuotas y elegir un orden de pago te ayuda a salir de las deudas de forma sostenible.",
      minutes: 7,
      blocks: [
        {
          type: "formula",
          formula: "Relación cuota/ingreso = cuotas mínimas mensuales ÷ ingreso neto mensual",
          explanation:
            "Indica qué parte de tu ingreso ya está comprometida con deudas. Mientras más alta, menos margen tienes para imprevistos.",
        },
        {
          type: "example",
          title: "Las deudas de Camila (ingreso neto COP 4.200.000)",
          lines: [
            "Tarjeta de crédito: saldo COP 3.500.000 · 2,3 % mensual · cuota mínima COP 200.000",
            "Compra a cuotas en almacén: saldo COP 900.000 · 1,8 % mensual · cuota COP 150.000",
            "Crédito de libre inversión: saldo COP 8.000.000 · 1,6 % mensual · cuota COP 420.000",
            "Total de cuotas: COP 770.000",
            "Relación cuota/ingreso: COP 770.000 ÷ COP 4.200.000 ≈ 18,3 %",
          ],
        },
        { type: "heading", text: "Dos métodos para el dinero extra" },
        {
          type: "list",
          items: [
            "Avalancha: pagas el mínimo en todas y el dinero extra va a la deuda con la tasa más alta (en el ejemplo, la tarjeta). Suele reducir el total de intereses pagados.",
            "Bola de nieve: pagas el mínimo en todas y el extra va a la deuda de menor saldo (en el ejemplo, el almacén). Ver deudas cerradas pronto puede ayudarte a mantener la motivación.",
          ],
        },
        {
          type: "paragraph",
          text: "Cuando terminas de pagar una deuda, la cuota que liberas se suma al pago de la siguiente. No hay un método único correcto: el mejor es el que puedes sostener.",
        },
        {
          type: "callout",
          tone: "info",
          text: "Pagar a tiempo cuida tu historial en las centrales de riesgo. Si prevés que no podrás pagar una cuota, conversa con la entidad antes del vencimiento para conocer las alternativas.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Tus cuotas mínimas suman COP 900.000 y tu ingreso neto mensual es COP 3.600.000. ¿Cuál es tu relación cuota/ingreso?",
          options: ["20 %", "25 %", "30 %", "40 %"],
          answer: 1,
          explanation: "COP 900.000 ÷ COP 3.600.000 = 25 %.",
        },
        {
          id: "q2",
          prompt: "Con el método avalancha, ¿qué deuda recibe primero el dinero extra?",
          options: [
            "La de menor saldo",
            "La de mayor tasa de interés",
            "La más antigua",
            "La de mayor cuota",
          ],
          answer: 1,
          explanation: "La avalancha prioriza la tasa más alta para reducir intereses.",
        },
        {
          id: "q3",
          prompt: "Con el método bola de nieve, ¿qué deuda recibe primero el dinero extra?",
          options: [
            "La de menor saldo",
            "La de mayor tasa de interés",
            "La de mayor saldo",
          ],
          answer: 0,
          explanation: "La bola de nieve empieza por el saldo más pequeño para cerrar deudas pronto.",
        },
      ],
      practice: {
        text: "Revisa tu relación cuota/ingreso y elige el orden en que quieres pagar tus deudas.",
        href: "/universidad/finanzas/deudas",
        cta: "Ordenar mis deudas",
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Nivel 5 · Ahorro y fondo de emergencia                                     */
/* -------------------------------------------------------------------------- */

const ahorroEmergencia: CourseModule = {
  slug: "ahorro-emergencia",
  level: 5,
  title: "Ahorro y fondo de emergencia",
  goal: "Construir un colchón para imprevistos y un hábito de ahorro que se mantenga en el tiempo.",
  lessons: [
    {
      slug: "fondo-de-emergencia",
      title: "Tu fondo de emergencia",
      summary:
        "Un fondo de emergencia, medido en meses de gastos esenciales, te da margen ante imprevistos sin recurrir a deudas.",
      minutes: 6,
      blocks: [
        {
          type: "paragraph",
          text: "Un fondo de emergencia es dinero reservado para imprevistos: una pérdida de ingresos, una reparación urgente o un gasto médico. Su objetivo es protegerte, no generar rentabilidad.",
        },
        {
          type: "formula",
          formula: "Meses de cobertura = fondo de emergencia ÷ gastos esenciales mensuales",
          explanation:
            "Se mide con los gastos esenciales porque, en una emergencia, son los que necesitas sostener.",
        },
        { type: "heading", text: "¿Cuántos meses?" },
        {
          type: "paragraph",
          text: "Una referencia frecuente es entre 3 y 6 meses de gastos esenciales. Tu meta puede ser distinta según tu situación:",
        },
        {
          type: "list",
          items: [
            "Estabilidad de tus ingresos: si son variables, un fondo más amplio da más tranquilidad.",
            "Personas a cargo: más responsabilidades suelen pedir más cobertura.",
            "Un solo ingreso en el hogar: si ese ingreso falla, no hay otro que lo compense.",
          ],
        },
        {
          type: "example",
          title: "El fondo de Julián",
          lines: [
            "Gastos esenciales mensuales: COP 2.000.000",
            "Fondo actual: COP 3.000.000 → COP 3.000.000 ÷ COP 2.000.000 = 1,5 meses",
            "Meta de 4 meses: COP 8.000.000 · Faltan: COP 5.000.000",
            "Aportando COP 400.000 al mes: COP 5.000.000 ÷ COP 400.000 = 12,5 → unos 13 meses",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "Mantén el fondo separado de tu cuenta del día a día y en un lugar donde puedas disponer de él rápidamente. Empezar con una meta de un mes también es avanzar.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Tienes COP 4.500.000 ahorrados y tus gastos esenciales son COP 1.500.000 al mes. ¿Cuántos meses de cobertura tienes?",
          options: ["1,5 meses", "3 meses", "4,5 meses", "6 meses"],
          answer: 1,
          explanation: "COP 4.500.000 ÷ COP 1.500.000 = 3 meses.",
        },
        {
          id: "q2",
          prompt: "¿Qué situación suele justificar un fondo de emergencia más amplio?",
          options: [
            "Tener ingresos variables, personas a cargo o un solo ingreso en el hogar",
            "Tener muchos gastos discrecionales",
            "Tener un salario fijo y sin dependientes",
          ],
          answer: 0,
          explanation:
            "Esas situaciones aumentan el impacto de un imprevisto, así que más cobertura da más margen.",
        },
        {
          id: "q3",
          prompt:
            "Tu meta es COP 6.000.000, ya tienes COP 1.200.000 y aportas COP 400.000 al mes. ¿Cuántos meses te faltan?",
          options: ["10", "12", "15", "18"],
          answer: 1,
          explanation: "(COP 6.000.000 − COP 1.200.000) ÷ COP 400.000 = COP 4.800.000 ÷ COP 400.000 = 12 meses.",
        },
      ],
      practice: {
        text: "Crea un objetivo de fondo de emergencia con la cantidad de meses que tenga sentido para tu situación.",
        href: "/universidad/finanzas/objetivos",
        cta: "Crear mi fondo de emergencia",
      },
    },
    {
      slug: "habito-de-ahorro",
      title: "Construir el hábito de ahorrar",
      summary:
        "Ahorrar al recibir el ingreso y darle destino a los ingresos ocasionales convierte el ahorro en una rutina.",
      minutes: 5,
      blocks: [
        {
          type: "paragraph",
          text: "El ahorro funciona mejor como hábito que como esfuerzo ocasional. La clave es que ocurra de forma casi automática, en el momento en que recibes dinero.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Define un monto o porcentaje, aunque sea pequeño.",
            "Apártalo el mismo día en que te pagan: si recibes por quincena, el 15 y el último día del mes.",
            "Llévalo a una cuenta separada para no confundirlo con el dinero del día a día.",
            "Revisa el monto cada pocos meses y súbelo cuando puedas.",
          ],
        },
        {
          type: "example",
          title: "Ahorro por quincenas",
          lines: [
            "Ingreso neto mensual: COP 3.400.000",
            "Meta de ahorro: 10 % = COP 340.000 al mes",
            "COP 170.000 el 15 y COP 170.000 el último día del mes",
          ],
        },
        { type: "heading", text: "Los ingresos ocasionales" },
        {
          type: "example",
          title: "Un plan para la prima de servicios",
          lines: [
            "Prima recibida: COP 1.400.000",
            "50 % al fondo de emergencia: COP 700.000",
            "30 % a un objetivo: COP 420.000",
            "20 % para darte un gusto: COP 280.000",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "Decidir el destino de un ingreso ocasional antes de recibirlo ayuda a que no se diluya en gastos del momento. Incluir algo para disfrutar también hace el plan más sostenible.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Tus ingresos del mes fueron COP 5.000.000 y tus gastos COP 4.250.000. ¿Cuál fue tu tasa de ahorro?",
          options: ["12 %", "15 %", "17,6 %", "85 %"],
          answer: 1,
          explanation: "(COP 5.000.000 − COP 4.250.000) ÷ COP 5.000.000 = COP 750.000 ÷ COP 5.000.000 = 15 %.",
        },
        {
          id: "q2",
          prompt: "¿Qué significa «págate primero»?",
          options: [
            "Ahorrar lo que sobre al final del mes",
            "Apartar el ahorro apenas recibes el ingreso, antes de otros gastos",
            "Pagar primero tus gustos",
          ],
          answer: 1,
          explanation: "El ahorro se trata como la primera línea del mes, no como un residuo.",
        },
        {
          id: "q3",
          prompt:
            "Recibes una prima de COP 1.200.000 y decides llevar el 40 % a tu fondo de emergencia. ¿Cuánto es?",
          options: ["COP 400.000", "COP 480.000", "COP 720.000", "COP 120.000"],
          answer: 1,
          explanation: "40 % de COP 1.200.000 = COP 480.000.",
        },
      ],
      practice: {
        text: "Agrega una línea de ahorro al inicio de tu flujo de caja, programada para tus fechas de pago.",
        href: "/universidad/finanzas/flujo-de-caja",
        cta: "Programar mi ahorro",
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Nivel 6 · Patrimonio y planificación de objetivos                          */
/* -------------------------------------------------------------------------- */

const patrimonioObjetivos: CourseModule = {
  slug: "patrimonio-objetivos",
  level: 6,
  title: "Patrimonio y planificación de objetivos",
  goal: "Medir lo que tienes y lo que debes, y traducir tus metas en montos, fechas y aportes concretos.",
  lessons: [
    {
      slug: "patrimonio-neto",
      title: "Tu patrimonio neto: valor, deuda y activo",
      summary:
        "El balance personal muestra cuánto vale lo que tienes, cuánto debes sobre ello y cuánto es realmente tuyo.",
      minutes: 7,
      blocks: [
        {
          type: "formula",
          formula: "Patrimonio neto = activos − pasivos",
          explanation:
            "Lo que tienes menos lo que debes. Se puede revisar cada cierto tiempo para ver tu evolución.",
        },
        {
          type: "paragraph",
          text: "Una forma clara de construir el balance, propuesta en el libro «Un inmueble al año no hace daño», es anotar para cada bien tres columnas: Valor (cuánto vale), Deuda (cuánto debes sobre él) y Activo, es decir, el valor neto (valor − deuda).",
        },
        {
          type: "example",
          title: "Balance de Mariana",
          lines: [
            "Apartamento: valor COP 250.000.000 · deuda COP 160.000.000 · activo COP 90.000.000",
            "Carro: valor COP 38.000.000 · deuda COP 42.000.000 · activo − COP 4.000.000",
            "Cuentas y efectivo: valor COP 3.500.000 · deuda COP 0 · activo COP 3.500.000",
            "Tarjeta de crédito: valor COP 0 · deuda COP 2.500.000 · activo − COP 2.500.000",
            "Totales: valor COP 291.500.000 · deuda COP 204.500.000 · patrimonio neto COP 87.000.000",
          ],
        },
        {
          type: "paragraph",
          text: "Fíjate en el carro: vale menos de lo que se debe por él, así que su valor neto es negativo. Es una situación común con bienes que se deprecian y están financiados.",
        },
        { type: "heading", text: "Patrimonio no es liquidez" },
        {
          type: "callout",
          tone: "warning",
          text: "Un inmueble o un carro no son dinero disponible. Venderlos toma tiempo y tiene costos. En el ejemplo, de COP 87.000.000 de patrimonio, solo COP 3.500.000 están en efectivo y cuentas.",
        },
        {
          type: "paragraph",
          text: "Los valores de bienes como un inmueble o un carro son estimaciones. Usa cifras prudentes y actualízalas de vez en cuando.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Tus activos suman COP 120.000.000 y tus pasivos COP 75.000.000. ¿Cuál es tu patrimonio neto?",
          options: ["COP 45.000.000", "COP 75.000.000", "COP 195.000.000", "COP 120.000.000"],
          answer: 0,
          explanation: "COP 120.000.000 − COP 75.000.000 = COP 45.000.000.",
        },
        {
          id: "q2",
          prompt:
            "Tu carro vale COP 30.000.000 y debes COP 34.000.000 por él. ¿Cuál es su valor neto en tu balance?",
          options: ["COP 4.000.000", "− COP 4.000.000", "COP 30.000.000", "COP 64.000.000"],
          answer: 1,
          explanation: "COP 30.000.000 − COP 34.000.000 = − COP 4.000.000 (valor neto negativo).",
        },
        {
          id: "q3",
          prompt:
            "Tu patrimonio neto es COP 80.000.000, casi todo en tu apartamento. ¿Puedes usarlo para una emergencia mañana?",
          options: [
            "Sí, el patrimonio neto es dinero disponible",
            "No necesariamente: el inmueble no es liquidez, y venderlo o refinanciarlo toma tiempo y tiene costos",
            "Sí, siempre que no tengas deudas",
          ],
          answer: 1,
          explanation:
            "El patrimonio incluye bienes ilíquidos. Para emergencias necesitas dinero disponible, como tu fondo de emergencia.",
        },
      ],
      practice: {
        text: "Construye tu balance con las columnas Valor, Deuda y Activo para cada bien y cada obligación.",
        href: "/universidad/finanzas/patrimonio",
        cta: "Construir mi balance",
      },
    },
    {
      slug: "objetivos-financieros",
      title: "Planificar objetivos con monto y fecha",
      summary:
        "Un objetivo con monto, fecha y aporte mensual se convierte en un paso concreto dentro de tu presupuesto.",
      minutes: 6,
      blocks: [
        {
          type: "paragraph",
          text: "«Quiero ahorrar para un viaje» es un deseo. «Quiero COP 6.000.000 para un viaje en 15 meses» es un objetivo que puedes planificar.",
        },
        {
          type: "list",
          items: [
            "Monto: cuánto necesitas.",
            "Fecha: para cuándo lo necesitas.",
            "Prioridad: qué objetivo va primero si no alcanzas para todos.",
            "Aporte mensual: cuánto vas a separar cada mes.",
          ],
        },
        {
          type: "formula",
          formula: "Aporte mensual = (meta − lo ya ahorrado) ÷ meses disponibles",
          explanation:
            "Es un cálculo sencillo que no considera rendimientos ni cambios de precio; sirve como punto de partida.",
        },
        {
          type: "example",
          title: "Dos objetivos",
          lines: [
            "Viaje familiar: meta COP 6.000.000 · ahorrado COP 1.500.000 · 15 meses → COP 4.500.000 ÷ 15 = COP 300.000 al mes",
            "Cuota inicial de vivienda: meta COP 40.000.000 · ahorrado COP 4.000.000 · 48 meses → COP 36.000.000 ÷ 48 = COP 750.000 al mes",
          ],
        },
        {
          type: "paragraph",
          text: "Si la suma de aportes no cabe en tu presupuesto, puedes ampliar plazos, ajustar montos o priorizar. Muchas personas empiezan por el fondo de emergencia, pero el orden depende de tu situación.",
        },
        {
          type: "callout",
          tone: "info",
          text: "Dónde guardar o invertir el dinero de cada objetivo depende del plazo y de tu perfil. Este contenido es educativo; si necesitas una recomendación personalizada, busca asesoría profesional.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Quieres reunir COP 9.000.000 en 18 meses y empiezas desde cero. ¿Cuánto debes aportar al mes?",
          options: ["COP 450.000", "COP 500.000", "COP 900.000", "COP 1.800.000"],
          answer: 1,
          explanation: "COP 9.000.000 ÷ 18 = COP 500.000 al mes.",
        },
        {
          id: "q2",
          prompt:
            "Tu meta es COP 12.000.000, ya tienes COP 3.000.000 y te quedan 12 meses. ¿Cuál es el aporte mensual?",
          options: ["COP 1.000.000", "COP 750.000", "COP 250.000", "COP 1.250.000"],
          answer: 1,
          explanation: "(COP 12.000.000 − COP 3.000.000) ÷ 12 = COP 9.000.000 ÷ 12 = COP 750.000.",
        },
        {
          id: "q3",
          prompt: "¿Qué hace que un objetivo financiero sea más fácil de seguir?",
          options: [
            "Tener monto, fecha y un aporte mensual definido",
            "Mantenerlo general para no presionarte",
            "Ahorrar solo cuando sobre dinero",
          ],
          answer: 0,
          explanation: "Con monto, fecha y aporte puedes medir tu avance y ajustar a tiempo.",
        },
      ],
      practice: {
        text: "Define uno o dos objetivos con monto, fecha y aporte mensual, y revisa que el aporte quepa en tu presupuesto.",
        href: "/universidad/finanzas/objetivos",
        cta: "Definir mis objetivos",
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Nivel 7 · Proyecciones y toma de decisiones                                */
/* -------------------------------------------------------------------------- */

const proyeccionesDecisiones: CourseModule = {
  slug: "proyecciones-decisiones",
  level: 7,
  title: "Proyecciones y toma de decisiones",
  goal: "Anticipar distintos escenarios y evaluar decisiones importantes con números antes de tomarlas.",
  lessons: [
    {
      slug: "escenarios-y-proyecciones",
      title: "Proyectar con escenarios",
      summary:
        "Comparar un escenario base, uno favorable y uno desfavorable te prepara para lo que pueda pasar.",
      minutes: 6,
      blocks: [
        {
          type: "paragraph",
          text: "Nadie sabe con certeza cómo serán los próximos meses. En lugar de una sola proyección, conviene pensar en varios escenarios y tener un plan para cada uno.",
        },
        {
          type: "list",
          items: [
            "Base: lo que esperas si todo sigue como hasta ahora.",
            "Favorable: si los ingresos suben o algunos gastos bajan.",
            "Desfavorable: si los ingresos bajan o aparecen gastos adicionales.",
          ],
        },
        {
          type: "formula",
          formula: "Ahorro proyectado = (ingresos mensuales − gastos mensuales) × número de meses",
          explanation: "Una proyección simple para comparar escenarios en un mismo horizonte.",
        },
        {
          type: "example",
          title: "Tres escenarios a 12 meses",
          lines: [
            "Base: COP 4.000.000 − COP 3.400.000 = COP 600.000 al mes → COP 7.200.000",
            "Favorable: COP 4.300.000 − COP 3.400.000 = COP 900.000 al mes → COP 10.800.000",
            "Desfavorable: COP 3.600.000 − COP 3.500.000 = COP 100.000 al mes → COP 1.200.000",
          ],
        },
        {
          type: "paragraph",
          text: "El escenario desfavorable no es pesimismo: es preparación. Te permite decidir de antemano qué gastos ajustarías y cuánto tiempo te cubriría tu fondo de emergencia.",
        },
        {
          type: "callout",
          tone: "info",
          text: "Las simulaciones nunca cambian tus datos reales. Puedes probar escenarios con tranquilidad; tus cuentas, movimientos y presupuesto siguen intactos.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt:
            "Ingresos de COP 3.800.000 y gastos de COP 3.300.000 al mes. ¿Cuánto ahorrarías en 6 meses en el escenario base?",
          options: ["COP 500.000", "COP 3.000.000", "COP 3.300.000", "COP 6.000.000"],
          answer: 1,
          explanation: "(COP 3.800.000 − COP 3.300.000) × 6 = COP 500.000 × 6 = COP 3.000.000.",
        },
        {
          id: "q2",
          prompt: "¿Qué pasa con tus datos reales cuando haces una simulación?",
          options: [
            "Se reemplazan por los de la simulación",
            "No cambian; la simulación es un ejercicio aparte",
            "Se borran los movimientos previstos",
          ],
          answer: 1,
          explanation: "Las simulaciones son independientes y no modifican tu información real.",
        },
        {
          id: "q3",
          prompt: "¿Para qué sirve el escenario desfavorable?",
          options: [
            "Para preocuparte por lo que podría salir mal",
            "Para preparar un plan si los ingresos bajan o los gastos suben",
            "Para reemplazar el presupuesto",
          ],
          answer: 1,
          explanation: "Te permite anticipar ajustes en lugar de improvisarlos.",
        },
      ],
      practice: {
        text: "Crea en el simulador un escenario base, uno favorable y uno desfavorable para los próximos 12 meses.",
        href: "/universidad/finanzas/simulador",
        cta: "Abrir el simulador",
      },
    },
    {
      slug: "tomar-decisiones-financieras",
      title: "Tomar decisiones con números",
      summary:
        "Antes de una decisión importante, revisa su efecto en tu flujo de caja, tus deudas, tu fondo de emergencia y tu patrimonio.",
      minutes: 7,
      blocks: [
        {
          type: "paragraph",
          text: "Comprar un vehículo, cambiar de trabajo o asumir un crédito son decisiones que afectan varios frentes a la vez. Mirarlas con números no reemplaza tus prioridades, pero te ayuda a elegir con más claridad.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "¿Cómo cambia mi flujo de caja mensual?",
            "¿Cómo cambia mi relación cuota/ingreso?",
            "¿Afecta mi fondo de emergencia o mis objetivos?",
            "¿Cuál es el costo total, no solo la cuota?",
            "¿Cómo se ve en un escenario desfavorable?",
          ],
        },
        {
          type: "example",
          title: "¿Comprar una moto a crédito?",
          lines: [
            "Precio: COP 9.000.000 · cuota COP 420.000 durante 36 meses",
            "Total pagado en cuotas: COP 420.000 × 36 = COP 15.120.000",
            "Intereses y cargos: COP 15.120.000 − COP 9.000.000 = COP 6.120.000",
            "Cuota/ingreso: antes COP 350.000 ÷ COP 3.500.000 = 10 %; después COP 770.000 ÷ COP 3.500.000 = 22 %",
          ],
        },
        {
          type: "example",
          title: "Costo mensual de usarla",
          lines: [
            "Gasolina COP 120.000 + mantenimiento COP 60.000 + SOAT (COP 600.000 ÷ 12) COP 50.000 = COP 230.000",
            "Con la cuota: COP 230.000 + COP 420.000 = COP 650.000 al mes",
            "Transporte actual: COP 250.000 al mes → diferencia de COP 400.000 al mes",
          ],
        },
        {
          type: "paragraph",
          text: "Con estos números, la decisión puede seguir siendo un sí: quizás ganas tiempo o acceso a mejores oportunidades. La diferencia es que decides sabiendo cuánto cuesta.",
        },
        {
          type: "callout",
          tone: "warning",
          text: "Las decisiones con implicaciones tributarias o legales (impuestos, contratos, herencias, compraventa de inmuebles) requieren validación con un profesional local.",
        },
      ],
      quiz: [
        {
          id: "q1",
          prompt: "Un crédito tiene 24 cuotas de COP 300.000. ¿Cuánto pagarás en total en cuotas?",
          options: ["COP 6.000.000", "COP 7.200.000", "COP 7.500.000", "COP 3.000.000"],
          answer: 1,
          explanation: "COP 300.000 × 24 = COP 7.200.000.",
        },
        {
          id: "q2",
          prompt:
            "Hoy pagas COP 400.000 en cuotas y estás evaluando un crédito con cuota de COP 500.000. Tu ingreso neto es COP 4.500.000. ¿Cuál sería tu nueva relación cuota/ingreso?",
          options: ["11,1 %", "20 %", "25 %", "9 %"],
          answer: 1,
          explanation: "(COP 400.000 + COP 500.000) ÷ COP 4.500.000 = COP 900.000 ÷ COP 4.500.000 = 20 %.",
        },
        {
          id: "q3",
          prompt: "¿Qué conviene hacer antes de una decisión con implicaciones tributarias o legales?",
          options: [
            "Seguir la recomendación de un conocido",
            "Validarla con un profesional local",
            "Decidir solo con base en la cuota mensual",
          ],
          answer: 1,
          explanation: "Las normas cambian y dependen de cada caso; un profesional puede revisar tu situación.",
        },
      ],
      practice: {
        text: "Revisa tus informes para ver cómo han evolucionado tus ingresos, gastos, deudas y patrimonio antes de tu próxima decisión importante.",
        href: "/universidad/finanzas/informes",
        cta: "Revisar mis informes",
      },
    },
  ],
};

export const COURSES: Course[] = [
  {
    slug: "finanzas-personales",
    areaSlug: "finanzas",
    title: "Ruta de finanzas personales",
    description:
      "Siete niveles para pasar de conocer tu situación financiera a planificar y tomar decisiones con claridad, a tu ritmo y sin juicios.",
    modules: [
      diagnostico,
      ingresosGastos,
      presupuestoFlujo,
      deudas,
      ahorroEmergencia,
      patrimonioObjetivos,
      proyeccionesDecisiones,
    ],
  },
];

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((course) => course.slug === slug);
}

export function allLessons(course: Course): { module: CourseModule; lesson: Lesson }[] {
  return [...course.modules]
    .sort((a, b) => a.level - b.level)
    .flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })));
}

export function findLesson(
  courseSlug: string,
  lessonSlug: string,
):
  | {
      course: Course;
      module: CourseModule;
      lesson: Lesson;
      prev: Lesson | null;
      next: Lesson | null;
    }
  | undefined {
  const course = getCourse(courseSlug);
  if (!course) return undefined;
  const lessons = allLessons(course);
  const index = lessons.findIndex((entry) => entry.lesson.slug === lessonSlug);
  const current = lessons[index];
  if (index === -1 || !current) return undefined;
  return {
    course,
    module: current.module,
    lesson: current.lesson,
    prev: lessons[index - 1]?.lesson ?? null,
    next: lessons[index + 1]?.lesson ?? null,
  };
}
