import DataTypeModule from "@/components/data/DataTypeModule";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";

export default async function TrainingsPage() {
  const user = await getAuthenticatedUserFromCookies();
  const items = user?.id ? (await getUserDataByType(user.id, "trainings")) || [] : [];
  return (
    <DataTypeModule
      title="Entrenamientos"
      description="Gestión segura de entrenamientos de equipo desde backend interno."
      endpoint="/api/trainings"
      initialItems={Array.isArray(items) ? items : []}
      createItem={() => ({
        id: Date.now(),
        nombre: "Entrenamiento nuevo",
        categoria: "U15",
        fecha: new Date().toISOString().slice(0, 10),
        bloques: []
      })}
    />
  );
}
