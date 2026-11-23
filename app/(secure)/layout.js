import Link from "next/link";

export default function SecureLayout({ children }) {
  return (
    <div className="app-container" style={{ display: "block", height: "100dvh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
      <header
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        <Link href="/" className="btn-back">
          ← Volver a Basket Lab
        </Link>
      </header>
      <main style={{ padding: "16px 20px 32px" }}>{children}</main>
    </div>
  );
}
