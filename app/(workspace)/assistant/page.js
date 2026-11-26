import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";

export const metadata = {
  title: "Asistente IA · Basket Lab"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

const MODES = [
  { id: "tecnico", label: "Asistente técnico", short: "Técnico", description: "Respuestas prácticas para el día a día." },
  { id: "debate", label: "Debate técnico", short: "Debate", description: "Ventajas, riesgos y alternativas de una decisión." },
  { id: "planificador", label: "Planificador", short: "Planificador", description: "Sesiones con objetivos, tiempos y ejercicios." }
];

export default function AssistantPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  return <AssistantWorkspace modes={MODES} supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />;
}
