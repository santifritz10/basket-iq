/*
 * Basket Lab · Laboratorio táctico — catálogo de fotos
 *
 * window.BasketTacticalMedia: una sola fuente para las fotos de Tactical Lab.
 * - Seis fotos: la portada y una por área educativa. Las fotos presentan las categorías;
 *   las pizarras explican la táctica. No hay fotos por sistema.
 * - Son imágenes ilustrativas que entregó la titular de Basket Lab (generadas con IA).
 *   No son fuentes ni demostraciones técnicas: la interfaz lo aclara.
 * - Archivos WebP optimizados en public/images/academy/tactical/ con sufijo de contenido
 *   (caché permanente). Los genera scripts/optimize-tactical-images.py, que reescribe el
 *   bloque <manifest>. Si falta una foto, la pantalla usa una composición tipográfica.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketTacticalMedia = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    var BASE = "/images/academy/tactical/";

    // <manifest>
    var MANIFEST = {
     "tactical-lab-hero": {
      "w": 1774,
      "h": 887,
      "orig": 2120463,
      "files": {
       "480": [
        "tactical-lab-hero-480.ec7b0905.webp",
        17972
       ],
       "800": [
        "tactical-lab-hero-800.e16df612.webp",
        38744
       ],
       "960": [
        "tactical-lab-hero-960.c1b4a4a5.webp",
        47048
       ],
       "1440": [
        "tactical-lab-hero-1440.1181401d.webp",
        58298
       ]
      }
     },
     "game-principles": {
      "w": 1672,
      "h": 941,
      "orig": 1996681,
      "files": {
       "480": [
        "game-principles-480.3ea1d947.webp",
        19454
       ],
       "800": [
        "game-principles-800.ca3cb2ea.webp",
        39808
       ],
       "960": [
        "game-principles-960.d64777b3.webp",
        49358
       ]
      }
     },
     "team-offense": {
      "w": 1672,
      "h": 941,
      "orig": 2092229,
      "files": {
       "480": [
        "team-offense-480.507d4cb9.webp",
        22158
       ],
       "800": [
        "team-offense-800.e8a9b675.webp",
        47182
       ],
       "960": [
        "team-offense-960.4b8c5ccd.webp",
        58066
       ]
      }
     },
     "team-defense": {
      "w": 1672,
      "h": 941,
      "orig": 2088060,
      "files": {
       "480": [
        "team-defense-480.88b31a13.webp",
        18876
       ],
       "800": [
        "team-defense-800.928512db.webp",
        37704
       ],
       "960": [
        "team-defense-960.afe57037.webp",
        46662
       ]
      }
     },
     "transition": {
      "w": 1672,
      "h": 941,
      "orig": 2119732,
      "files": {
       "480": [
        "transition-480.e7a09d0d.webp",
        26902
       ],
       "800": [
        "transition-800.3d26e918.webp",
        55414
       ],
       "960": [
        "transition-960.ce43bdf4.webp",
        68534
       ]
      }
     },
     "special-situations": {
      "w": 1672,
      "h": 941,
      "orig": 2014701,
      "files": {
       "480": [
        "special-situations-480.00ac6774.webp",
        20740
       ],
       "800": [
        "special-situations-800.3be5d9cd.webp",
        42160
       ],
       "960": [
        "special-situations-960.3e0f1445.webp",
        52012
       ]
      }
     }
    };
    // </manifest>

    /** Encuadre (object-position) y texto alternativo de cada foto. */
    var PHOTOS = {
        "tactical-lab-hero": { focus: [40, 45], alt: "Un entrenador sentado al costado de la cancha, con una planilla táctica en la mano, observa una práctica de cinco contra cinco." },
        "game-principles": { focus: [60, 45], alt: "Un entrenador agachado explica una jugada sobre una pizarra de mano a sus jugadores, reunidos a su alrededor." },
        "team-offense": { focus: [45, 50], alt: "Un jugador ataca en dribbling mientras un compañero prepara un bloqueo sobre su defensor." },
        "team-defense": { focus: [50, 45], alt: "Defensores en posición baja, con los brazos abiertos, señalan y se comunican frente al atacante con balón." },
        transition: { focus: [35, 50], alt: "Un jugador avanza con el balón en velocidad, acompañado por compañeros que corren a los costados." },
        "special-situations": { focus: [45, 45], alt: "Un entrenador da indicaciones con una pizarra de mano durante un tiempo muerto, rodeado por sus jugadores." }
    };

    var AREA_PHOTO = {
        principios: "game-principles",
        ataque: "team-offense",
        defensa: "team-defense",
        transicion: "transition",
        especiales: "special-situations"
    };

    var AI_NOTE = "Imagen ilustrativa generada con IA. No es una demostración táctica.";

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function has(key) { return !!(key && MANIFEST[key] && Object.keys(MANIFEST[key].files || {}).length); }

    var VARIANTS = {
        card: { list: ["480", "800"], w: 800, h: 450 },
        cover: { list: ["480", "800", "960"], w: 960, h: 540 },
        hero: { list: ["800", "1440"], w: 1440, h: 600 }
    };
    var WIDTHS = { "480": 480, "800": 800, "960": 960, "1440": 1440 };

    /** <img> responsive con dimensiones explícitas y carga diferida salvo la imagen principal. */
    function img(key, opts) {
        opts = opts || {};
        if (!has(key)) return "";
        var v = VARIANTS[opts.variant || "card"];
        var files = MANIFEST[key].files;
        var list = v.list.filter(function (s) { return files[s]; });
        if (!list.length) return "";
        var srcset = list.map(function (s) { return BASE + files[s][0] + " " + WIDTHS[s] + "w"; }).join(", ");
        var p = PHOTOS[key] || { focus: [50, 50], alt: "" };
        var alt = opts.alt != null ? opts.alt : p.alt;
        return '<img class="' + esc(opts.cls || "fm-img") + '" src="' + esc(BASE + files[list[list.length - 1]][0]) + '" srcset="' + esc(srcset) + '"' +
            ' sizes="' + esc(opts.sizes || "100vw") + '" width="' + v.w + '" height="' + v.h + '"' +
            ' alt="' + esc(alt) + '"' + (alt ? "" : ' aria-hidden="true"') +
            ' style="object-position:' + p.focus[0] + "% " + p.focus[1] + '%"' +
            (opts.priority ? ' fetchpriority="high" loading="eager"' : ' loading="lazy"') + ' decoding="async">';
    }

    function areaPhoto(areaId) { var k = AREA_PHOTO[areaId]; return has(k) ? k : null; }

    function totalBytes() {
        var t = 0;
        Object.keys(MANIFEST).forEach(function (k) {
            Object.keys(MANIFEST[k].files).forEach(function (s) { t += MANIFEST[k].files[s][1]; });
        });
        return t;
    }

    return { BASE: BASE, MANIFEST: MANIFEST, PHOTOS: PHOTOS, AREA_PHOTO: AREA_PHOTO, AI_NOTE: AI_NOTE, has: has, img: img, areaPhoto: areaPhoto, totalBytes: totalBytes };
});
