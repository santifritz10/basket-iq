import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/app/LogoutButton";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players", label: "Jugadores" },
  { href: "/trainings", label: "Entrenamientos" },
  { href: "/annual-plans", label: "Planificación anual" },
  { href: "/plays", label: "Jugadas" },
  { href: "/shooting", label: "Tiro" },
  { href: "/legacy-app", label: "Legacy (solo referencia)" }
];

export default async function SecureLayout({ children }) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user?.id) redirect("/login");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <aside style={{ borderRight: "1px solid rgba(255,255,255,.08)", padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Basket IQ</h2>
        <nav style={{ display: "grid", gap: 8 }}>
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="player-tab-btn" style={{ textDecoration: "none", textAlign: "left" }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 16 }}>
          <LogoutButton />
        </div>
      </aside>
      <main style={{ padding: 18 }}>{children}</main>
    </div>
  );
}
