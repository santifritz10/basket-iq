"use client";

import { CATEGORY_OPTIONS, SPORT_ROLES } from "@/lib/auth/profile";
import { Field, TextInput, authStyles as s } from "@/components/auth/ui";

export default function ProfileFields({ values, onChange, errors = {} }) {
  const set = (field, value) => onChange({ ...values, [field]: value });
  const toggleCategory = (cat) => {
    const list = values.categories || [];
    set("categories", list.includes(cat) ? list.filter((c) => c !== cat) : [...list, cat]);
  };
  return (
    <>
      <Field label="Nombre visible" id="pf-name" error={errors.full_name} hint="Así te vamos a mostrar dentro de Basket Lab.">
        <TextInput
          id="pf-name"
          autoComplete="name"
          maxLength={80}
          value={values.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          error={errors.full_name}
          required
        />
      </Field>

      <div className={s.field} role="group" aria-labelledby="pf-role-label">
        <span id="pf-role-label" className={s.label}>
          Rol deportivo <span className={s.optional}>(opcional)</span>
        </span>
        <div className={s.roleGrid}>
          {SPORT_ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              className={s.roleOption}
              aria-pressed={values.sport_role === role.id}
              onClick={() => set("sport_role", values.sport_role === role.id ? null : role.id)}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Club o institución" optional id="pf-club">
        <TextInput
          id="pf-club"
          autoComplete="organization"
          maxLength={120}
          placeholder="Ej.: Club Atlético…"
          value={values.club || ""}
          onChange={(e) => set("club", e.target.value)}
        />
      </Field>

      <div className={s.field} role="group" aria-labelledby="pf-cat-label">
        <span id="pf-cat-label" className={s.label}>
          Categorías con las que trabajás <span className={s.optional}>(opcional)</span>
        </span>
        <div className={s.chips}>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              className={s.chip}
              aria-pressed={(values.categories || []).includes(cat)}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
