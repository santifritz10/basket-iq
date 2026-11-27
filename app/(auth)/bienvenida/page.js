import { Suspense } from "react";
import WelcomeScreen from "@/components/auth/screens/WelcomeScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Bienvenida · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <WelcomeScreen />
    </Suspense>
  );
}
