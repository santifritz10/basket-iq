import { Suspense } from "react";
import RegisterScreen from "@/components/auth/screens/RegisterScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Crear cuenta · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <RegisterScreen />
    </Suspense>
  );
}
