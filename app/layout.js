import "./globals.css";

export const metadata = {
  title: "Basket IQ",
  description: "Basket Lab migrated to secure Next.js architecture"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
