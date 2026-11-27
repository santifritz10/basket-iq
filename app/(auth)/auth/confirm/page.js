import { Suspense } from "react";
import ConfirmScreen from "@/components/auth/screens/ConfirmScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Validando enlace · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ConfirmScreen />
    </Suspense>
  );
}
