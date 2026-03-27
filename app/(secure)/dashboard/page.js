import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";

export default async function DashboardPage() {
  const user = await getAuthenticatedUserFromCookies();
  return (
    <section className="manual-section players-view">
      <h1 style={{ marginTop: 0 }}>Panel seguro</h1>
      <p>Sesión activa como <strong>{user?.email || "usuario"}</strong>.</p>
      <p>La app ya corre bajo Next.js App Router con autenticación vía cookies httpOnly y backend interno `/api`.</p>
    </section>
  );
}
