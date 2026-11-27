import { Suspense } from "react";
import RecoverScreen from "@/components/auth/screens/RecoverScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Recuperar contraseña · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <RecoverScreen />
    </Suspense>
  );
}
