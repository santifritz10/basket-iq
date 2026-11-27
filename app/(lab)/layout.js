import { requireUserOrRedirect } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** Pantallas a pantalla completa con su propio encabezado (Shooting Lab). */
export default async function LabLayout({ children }) {
  await requireUserOrRedirect();
  return <div id="lab-scroll" style={{ height: "100dvh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}
