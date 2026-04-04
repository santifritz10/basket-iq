import "./globals.css";
import "../css/styles.css";

export const metadata = {
  title: "Basket Lab",
  description: "Basket Lab"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="app-body">{children}</body>
    </html>
  );
}
