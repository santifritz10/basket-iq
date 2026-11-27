import { Suspense } from "react";
import NewPasswordScreen from "@/components/auth/screens/NewPasswordScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Nueva contraseña · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <NewPasswordScreen />
    </Suspense>
  );
}
