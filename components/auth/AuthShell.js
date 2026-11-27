import { LuGraduationCap, LuCalendarRange, LuBot } from "react-icons/lu";
import { BrandLogo } from "@/components/auth/BrandLogo";
import s from "@/components/auth/auth.module.css";

/** Media cancha dibujada con líneas (recurso gráfico original). */
function CourtLines() {
  return (
    <svg className={s.court} viewBox="0 0 600 400" aria-hidden focusable="false">
      <rect x="10" y="10" width="580" height="380" rx="4" />
      <line x1="10" y1="390" x2="590" y2="390" />
      <rect x="220" y="10" width="160" height="190" />
      <circle cx="300" cy="200" r="60" />
      <path d="M50 10 V90 A250 250 0 0 0 550 90 V10" />
      <circle cx="300" cy="50" r="9" />
      <line x1="270" y1="34" x2="330" y2="34" />
      <path d="M260 390 A40 40 0 0 1 340 390" />
    </svg>
  );
}

export default function AuthShell({ children }) {
  return (
    <div className={s.shell}>
      <aside className={s.brand} aria-label="Basket Lab">
        <CourtLines />
        <div className={s.brandInner}>
          <BrandLogo size={200} className={s.brandLogo} priority />
          <p className={s.brandHeadline}>
            La plataforma para <em>entrenadores de básquet</em> que planifican con criterio.
          </p>
          <p className={s.brandLead}>
            Aprendé sistemas con guías y simuladores, armá tus entrenamientos y consultá a tu asistente técnico, todo en
            un mismo lugar.
          </p>
          <ul className={s.features}>
            <li>
              <span className={s.featureIcon} aria-hidden>
                <LuGraduationCap size={18} />
              </span>
              <div>
                Basket Lab Academy
                <span>Guías tácticas, simuladores y desafíos.</span>
              </div>
            </li>
            <li>
              <span className={s.featureIcon} aria-hidden>
                <LuCalendarRange size={18} />
              </span>
              <div>
                Planificación
                <span>Entrenamientos y temporada por categoría.</span>
              </div>
            </li>
            <li>
              <span className={s.featureIcon} aria-hidden>
                <LuBot size={18} />
              </span>
              <div>
                Asistente IA
                <span>Un ayudante técnico que conoce tu trabajo.</span>
              </div>
            </li>
          </ul>
        </div>
      </aside>
      <main className={s.main}>{children}</main>
    </div>
  );
}
