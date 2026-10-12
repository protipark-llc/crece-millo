/**
 * Modelo de contenido educativo.
 *
 * El contenido vive en código (versionado con el repositorio y verificado por TypeScript);
 * la inscripción y el progreso de cada persona viven en la base de datos
 * (course_enrollments, lesson_progress) referenciando slugs estables.
 * Cuando exista un CMS, basta con que devuelva estas mismas estructuras.
 */

/** Dimensión de crecimiento de la plataforma (finanzas es la primera disponible). */
export interface LearningArea {
  slug: string;
  name: string;
  description: string;
  status: "available" | "coming_soon";
  /** Nombre del ícono de lucide-react. */
  icon: string;
  courseSlugs: string[];
}

export type LessonBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  /** Ejemplo numérico concreto, con cifras realistas en COP. */
  | { type: "example"; title: string; lines: string[] }
  | { type: "callout"; tone: "tip" | "warning" | "info"; text: string }
  /** Fórmula con su explicación en lenguaje sencillo. */
  | { type: "formula"; formula: string; explanation: string };

export interface ExerciseQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Índice de la opción correcta. */
  answer: number;
  explanation: string;
}

export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  blocks: LessonBlock[];
  /** Ejercicio de autocomprobación (opcional). */
  quiz?: ExerciseQuestion[];
  /** Reto práctico que conecta la lección con una herramienta del módulo. */
  practice?: { text: string; href: string; cta: string };
}

export interface CourseModule {
  slug: string;
  level: number;
  title: string;
  goal: string;
  lessons: Lesson[];
}

export interface Course {
  slug: string;
  areaSlug: string;
  title: string;
  description: string;
  modules: CourseModule[];
}
