import Script from "next/script";
import { getLegacyBodyMarkup } from "@/lib/server/legacy-markup";

const toggleSidebarScript = `
function toggleSidebarGroup(elm) {
  var groupId = elm.getAttribute('data-group');
  var sub = document.getElementById(groupId);
  var icon = elm.querySelector('.sidebar-toggle-icon');
  if (!sub) return;
  var isOpen = sub.classList.contains('open');
  sub.classList.toggle('open', !isOpen);
  elm.classList.toggle('open', !isOpen);
  if (icon) icon.textContent = isOpen ? '▶' : '▼';
}
`;

export default async function HomePage() {
  const legacyBodyMarkup = await getLegacyBodyMarkup();

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: legacyBodyMarkup }} />
      <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" strategy="beforeInteractive" />
      <Script src="/assets/js/fundamentos-data.js" strategy="afterInteractive" />
      <Script src="/assets/js/shooting-zones-heatmap.js" strategy="afterInteractive" />
      <Script src="/assets/js/supabase-config.js" strategy="afterInteractive" />
      <Script src="/assets/js/main.js" strategy="afterInteractive" />
      <Script id="legacy-toggle-sidebar" strategy="afterInteractive">
        {toggleSidebarScript}
      </Script>
    </>
  );
}
