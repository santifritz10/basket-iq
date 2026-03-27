import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyAppPage() {
  redirect("/legacy/index.html");
}
