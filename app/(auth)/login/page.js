import { Suspense } from "react";
import LoginScreen from "@/components/auth/screens/LoginScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Iniciar sesión · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LoginScreen />
    </Suspense>
  );
}
