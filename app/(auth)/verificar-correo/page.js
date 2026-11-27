import { Suspense } from "react";
import VerifyEmailScreen from "@/components/auth/screens/VerifyEmailScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Confirmá tu correo · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <VerifyEmailScreen />
    </Suspense>
  );
}
