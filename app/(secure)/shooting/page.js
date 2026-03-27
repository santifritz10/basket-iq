import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";
import { getUserDataByType } from "@/services/server/user-data-service";
import ShootingPayloadEditor from "@/components/data/ShootingPayloadEditor";

export default async function ShootingPage() {
  const user = await getAuthenticatedUserFromCookies();
  const payload = user?.id ? (await getUserDataByType(user.id, "shooting_heatmap")) || {} : {};
  return <ShootingPayloadEditor initialPayload={payload} />;
}
