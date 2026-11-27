import { Suspense } from "react";
import LogoutScreen from "@/components/auth/screens/LogoutScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Cerrando sesión · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LogoutScreen />
    </Suspense>
  );
}
