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

const sidebarUiEnhancerScript = `
(function setupSidebarUiEnhancements() {
  function decorateSidebar() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    var iconMap = {
      fundamentos: 'dribbble',
      ataques: 'swords',
      'defensas-zona': 'shield',
      presion: 'zap',
      planilla: 'clipboard-list',
      'planificacion-menu': 'calendar-range',
      'player-tracking-menu': 'users',
      jugadas: 'library'
    };

    var toggles = sidebar.querySelectorAll('.sidebar-toggle[data-group]');
    toggles.forEach(function (toggle) {
      if (toggle.querySelector('.sidebar-label-wrap')) return;
      var group = toggle.getAttribute('data-group');
      var iconName = iconMap[group] || 'circle';

      var iconEl = document.createElement('i');
      iconEl.setAttribute('data-lucide', iconName);
      iconEl.className = 'sidebar-lucide';

      var arrow = toggle.querySelector('.sidebar-toggle-icon');
      var textNode = null;
      for (var i = 0; i < toggle.childNodes.length; i++) {
        var n = toggle.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim()) {
          textNode = n;
          break;
        }
      }
      var textSpan = textNode ? null : toggle.querySelector('span:not(.sidebar-toggle-icon)');
      var labelText = textNode ? textNode.textContent.trim() : (textSpan ? textSpan.textContent.trim() : '');
      if (textSpan) textSpan.remove();
      if (textNode) textNode.remove();

      var labelWrap = document.createElement('span');
      labelWrap.className = 'sidebar-label-wrap';
      labelWrap.textContent = labelText;

      if (arrow) toggle.insertBefore(iconEl, arrow.nextSibling);
      else toggle.insertBefore(iconEl, toggle.firstChild);
      toggle.appendChild(labelWrap);
    });

    var nav = sidebar.querySelector('.sidebar-nav');
    if (nav && nav.dataset.flatNavApplied !== '1') {
      nav.dataset.flatNavApplied = '1';
      nav.innerHTML = [
        '<p class="sidebar-section-title">Fundamentos</p>',
        '<div class="sidebar-group">' +
        '  <div class="sidebar-toggle sidebar-toggle-flat sidebar-toggle-collapsible" data-group="fundamentos-flat" onclick="toggleSidebarGroup(this)"><span class="sidebar-toggle-icon">▶</span><span>Fundamentos</span></div>' +
        '  <ul class="sidebar-submenu" id="fundamentos-flat">' +
        '    <li onclick="loadContent(\\'fund_cat_dribbling\\')">Dribbling</li>' +
        '    <li onclick="loadContent(\\'fund_cat_pase\\')">Pase</li>' +
        '    <li onclick="loadContent(\\'fund_cat_tiro\\')">Tiro</li>' +
        '    <li onclick="loadContent(\\'fund_cat_finalizaciones\\')">Finalizaciones</li>' +
        '    <li onclick="loadContent(\\'fund_cat_juego_pies\\')">Juego de pies</li>' +
        '    <li onclick="loadContent(\\'fund_cat_posteo\\')">Posteo</li>' +
        '    <li onclick="loadContent(\\'fund_cat_defensa\\')">Defensa individual</li>' +
        '    <li onclick="loadContent(\\'fund_cat_rebote\\')">Rebote</li>' +
        '  </ul>' +
        '</div>',
        '<p class="sidebar-section-title">Táctica</p>',
        '<div class="sidebar-group"><div class="sidebar-toggle sidebar-toggle-flat" data-group="ataques" onclick="loadContent(\\'ataques_hub\\')"><span class="sidebar-toggle-icon">▶</span><span>Ataques</span></div></div>',
        '<div class="sidebar-group"><div class="sidebar-toggle sidebar-toggle-flat" data-group="defensas-zona" onclick="loadContent(\\'defensas_zona_hub\\')"><span class="sidebar-toggle-icon">▶</span><span>Defensas en Zona</span></div></div>',
        '<div class="sidebar-group"><div class="sidebar-toggle sidebar-toggle-flat" data-group="presion" onclick="loadContent(\\'presion_hub\\')"><span class="sidebar-toggle-icon">▶</span><span>Presión</span></div></div>',
        '<p class="sidebar-section-title">Herramientas del coach</p>',
        '<div class="sidebar-group"><div class="sidebar-toggle sidebar-toggle-flat" data-group="planilla" onclick="loadContent(\\'planilla_hub\\')"><span class="sidebar-toggle-icon">▶</span><span>Planilla</span></div></div>',
        '<div class="sidebar-group"><div class="sidebar-toggle sidebar-toggle-flat" data-group="planificacion-menu" onclick="loadContent(\\'planificacion_hub\\')"><span class="sidebar-toggle-icon">▶</span><span>Planificación</span></div></div>',
        '<div class="sidebar-group"><div class="sidebar-toggle sidebar-toggle-flat" data-group="player-tracking-menu" onclick="loadContent(\\'player_tracking_hub\\')"><span class="sidebar-toggle-icon">▶</span><span>Seguimiento de Jugadores</span></div></div>',
        '<div class="sidebar-group"><div class="sidebar-toggle sidebar-toggle-flat" data-group="jugadas" onclick="loadContent(\\'jugadas_hub\\')"><span class="sidebar-toggle-icon">▶</span><span>Jugadas Guardadas</span></div></div>'
      ].join('');
    }

    if (nav && nav.dataset.flatNavApplied !== '1' && !nav.querySelector('.sidebar-section-title')) {
      var topGroups = Array.prototype.slice.call(nav.querySelectorAll(':scope > .sidebar-group'));
      var lastSectionTitle = null;
      topGroups.forEach(function (group) {
        var t = group.querySelector(':scope > .sidebar-toggle[data-group]');
        if (!t) return;
        var g = t.getAttribute('data-group');
        var title = null;
        if (g === 'fundamentos' || g === 'ataques' || g === 'defensas-zona' || g === 'presion') title = 'Fundamentos y juego';
        if (g === 'planilla' || g === 'planificacion-menu' || g === 'player-tracking-menu' || g === 'jugadas') title = 'Herramientas del coach';
        if (!title) return;
        if (lastSectionTitle === title) return;
        var heading = document.createElement('p');
        heading.className = 'sidebar-section-title';
        heading.textContent = title;
        nav.insertBefore(heading, group);
        lastSectionTitle = title;
      });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ attrs: { width: '15', height: '15', stroke: '1.9' } });
    }
  }

  function bindActiveHighlight() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.dataset.activeBound === '1') return;
    sidebar.dataset.activeBound = '1';

    sidebar.addEventListener('click', function (ev) {
      var item = ev.target.closest('.sidebar-submenu li[onclick]');
      if (item) {
        sidebar.querySelectorAll('.sidebar-submenu li.is-active').forEach(function (el) {
          el.classList.remove('is-active');
        });
        item.classList.add('is-active');
        return;
      }
      var flatToggle = ev.target.closest('.sidebar-toggle-flat');
      if (flatToggle) {
        sidebar.querySelectorAll('.sidebar-toggle-flat.is-active').forEach(function (el) {
          el.classList.remove('is-active');
        });
        flatToggle.classList.add('is-active');
      }
    });
  }

  function boot() {
    decorateSidebar();
    bindActiveHighlight();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
`;

export default async function HomePage() {
  const legacyBodyMarkup = await getLegacyBodyMarkup();

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: legacyBodyMarkup }} />
      <Script src="https://unpkg.com/lucide@latest" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" strategy="beforeInteractive" />
      <Script src="/assets/js/fundamentos-data.js" strategy="afterInteractive" />
      <Script src="/assets/js/shooting-zones-heatmap.js" strategy="afterInteractive" />
      <Script src="/assets/js/supabase-config.js" strategy="afterInteractive" />
      <Script src="/assets/js/main.js" strategy="afterInteractive" />
      <Script id="legacy-toggle-sidebar" strategy="afterInteractive">
        {toggleSidebarScript}
      </Script>
      <Script id="sidebar-ui-enhancer" strategy="afterInteractive">
        {sidebarUiEnhancerScript}
      </Script>
    </>
  );
}
