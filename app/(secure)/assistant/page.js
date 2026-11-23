import AssistantChat from "@/components/assistant/AssistantChat";

export const metadata = {
  title: "Asistente IA · Basket Lab"
};

const MODES = [
  { id: "tecnico", label: "Asistente técnico", description: "Respuestas prácticas para el día a día." },
  { id: "debate", label: "Debate técnico", description: "Ventajas, riesgos y alternativas de una decisión." },
  { id: "planificador", label: "Planificador", description: "Sesiones con objetivos, tiempos y ejercicios." }
];

export default function AssistantPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  return <AssistantChat modes={MODES} supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />;
}
