import DataTypeModule from "@/components/data/DataTypeModule";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";

export default async function AnnualPlansPage() {
  const user = await getAuthenticatedUserFromCookies();
  const items = user?.id ? (await getUserDataByType(user.id, "annual_plans")) || [] : [];
  return (
    <DataTypeModule
      title="Planificación anual"
      description="Gestión segura de ciclos y planificación anual."
      endpoint="/api/annual-plans"
      initialItems={Array.isArray(items) ? items : []}
      createItem={() => ({
        id: Date.now(),
        nombre: "Plan anual",
        categoria: "U15",
        temporada: new Date().getFullYear(),
        ciclos: []
      })}
    />
  );
}
