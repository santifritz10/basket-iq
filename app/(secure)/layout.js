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
    <div className="secure-layout">
      <aside className="secure-sidebar">
        <h2 className="secure-brand">Basket IQ</h2>
        <p className="secure-user">{user.email}</p>
        <nav className="secure-nav">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="secure-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="secure-logout-wrap">
          <LogoutButton />
        </div>
      </aside>
      <main className="secure-main">{children}</main>
    </div>
  );
}
