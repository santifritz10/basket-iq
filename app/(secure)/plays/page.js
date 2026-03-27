import DataTypeModule from "@/components/data/DataTypeModule";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";

export default async function PlaysPage() {
  const user = await getAuthenticatedUserFromCookies();
  const items = user?.id ? (await getUserDataByType(user.id, "plays")) || [] : [];
  return (
    <DataTypeModule
      title="Jugadas"
      description="Biblioteca de jugadas con persistencia segura."
      endpoint="/api/plays"
      initialItems={Array.isArray(items) ? items : []}
      createItem={() => ({
        id: Date.now(),
        name: "Jugada nueva",
        description: "",
        steps: []
      })}
    />
  );
}
