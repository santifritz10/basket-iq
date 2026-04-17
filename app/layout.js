import "./globals.css";
import "../css/styles.css";

export const metadata = {
  title: "Basket Lab",
  description: "Basket Lab",
  icons: {
    icon: "/assets/images/logo-basketlab.svg",
    shortcut: "/assets/images/logo-basketlab.svg",
    apple: "/assets/images/logo-basketlab.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="app-body">{children}</body>
    </html>
  );
}
