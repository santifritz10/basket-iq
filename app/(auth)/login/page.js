import { redirect } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import { getAuthenticatedUserFromCookies } from "@/lib/server/auth";

export default async function LoginPage() {
  const user = await getAuthenticatedUserFromCookies();
  if (user?.id) redirect("/dashboard");
  return <AuthCard />;
}
