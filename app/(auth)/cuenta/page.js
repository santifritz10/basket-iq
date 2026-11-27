import { Suspense } from "react";
import AccountScreen from "@/components/auth/screens/AccountScreen";
import { AuthLoading } from "@/components/auth/ui";

export const metadata = { title: "Mi cuenta · Basket Lab" };

export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AccountScreen />
    </Suspense>
  );
}
