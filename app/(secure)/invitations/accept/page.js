import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Enlace de invitación. La pantalla de aceptar vive en Jugadores (/players), donde además se listan
 * todas las invitaciones pendientes para el email con el que entraste.
 */
export default async function AcceptInvitationPage({ searchParams }) {
  const sp = await searchParams;
  const token = String(sp?.token || "").trim();
  redirect(token ? `/players?invite=${encodeURIComponent(token)}` : "/players");
}
