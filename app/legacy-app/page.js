export const dynamic = "force-dynamic";

export default function LegacyAppPage() {
  return (
    <iframe
      className="legacy-shell"
      src="/legacy/index.html"
      title="Basket IQ Legacy App"
    />
  );
}
