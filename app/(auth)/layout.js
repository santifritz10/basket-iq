import AuthShell from "@/components/auth/AuthShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getPublicAuthConfig } from "@/lib/server/auth-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Basket Lab · By Coach Fritz",
  robots: { index: false, follow: false }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b10"
};

export default function AuthLayout({ children }) {
  const config = getPublicAuthConfig();
  return (
    <AuthProvider config={config}>
      <AuthShell>{children}</AuthShell>
    </AuthProvider>
  );
}
