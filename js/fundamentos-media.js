/*
 * Basket Lab · Fundamentos — catálogo de recursos gráficos
 *
 * window.BasketFundMedia: una sola fuente para las fotos de la academia.
 * - Las fotos son imágenes ilustrativas generadas con IA para Basket Lab. No son fuentes
 *   ni demostraciones técnicas verificadas: la ficha lo aclara.
 * - Los archivos son WebP ya optimizados en public/images/academy/fundamentals/, con un
 *   sufijo de contenido para poder cachearlos de forma permanente. Los genera
 *   scripts/optimize-fund-images.py, que también reescribe el bloque <manifest>.
 * - Nada se carga al iniciar la app: cada pantalla pide solo sus imágenes
 *   (loading="lazy" salvo la imagen principal de la pantalla).
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketFundMedia = api;
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    var BASE = "/images/academy/fundamentals/";

    // <manifest>
    var MANIFEST = {
     "dribbling": {
      "w": 1672,
      "h": 941,
      "orig": 1833484,
      "files": {
       "480": [
        "dribbling-480.366036b9.webp",
        14456
       ],
       "800": [
        "dribbling-800.1096b7ca.webp",
        30758
       ],
       "960": [
        "dribbling-960.afc78f26.webp",
        38002
       ]
      }
     },
     "pase": {
      "w": 1672,
      "h": 941,
      "orig": 1742501,
      "files": {
       "480": [
        "pase-480.08d9dd5f.webp",
        11452
       ],
       "800": [
        "pase-800.cc2d86d6.webp",
        22886
       ],
       "960": [
        "pase-960.6ae35fac.webp",
        28004
       ]
      }
     },
     "lanzamiento": {
      "w": 1672,
      "h": 941,
      "orig": 1807432,
      "files": {
       "480": [
        "lanzamiento-480.87e4e8b0.webp",
        14580
       ],
       "800": [
        "lanzamiento-800.4e8138be.webp",
        30974
       ],
       "960": [
        "lanzamiento-960.338e600c.webp",
        38574
       ]
      }
     },
     "finalizacion": {
      "w": 1672,
      "h": 941,
      "orig": 1982459,
      "files": {
       "480": [
        "finalizacion-480.ee2606e5.webp",
        16292
       ],
       "800": [
        "finalizacion-800.ee523188.webp",
        34452
       ],
       "960": [
        "finalizacion-960.291536aa.webp",
        43234
       ]
      }
     },
     "juego-pies": {
      "w": 1672,
      "h": 941,
      "orig": 1896153,
      "files": {
       "480": [
        "juego-pies-480.83bfb8ff.webp",
        12952
       ],
       "800": [
        "juego-pies-800.ec8cdce3.webp",
        26716
       ],
       "960": [
        "juego-pies-960.c10dfe55.webp",
        33748
       ]
      }
     },
     "poste": {
      "w": 1672,
      "h": 941,
      "orig": 1968025,
      "files": {
       "480": [
        "poste-480.404c1c0f.webp",
        17908
       ],
       "800": [
        "poste-800.1bc3597a.webp",
        39584
       ],
       "960": [
        "poste-960.c678cb9e.webp",
        50002
       ]
      }
     },
     "defensa": {
      "w": 1672,
      "h": 941,
      "orig": 1903176,
      "files": {
       "480": [
        "defensa-480.b490771b.webp",
        14714
       ],
       "800": [
        "defensa-800.bc93ab4b.webp",
        31836
       ],
       "960": [
        "defensa-960.e9d2e7eb.webp",
        40032
       ]
      }
     },
     "rebote": {
      "w": 1672,
      "h": 941,
      "orig": 1892504,
      "files": {
       "480": [
        "rebote-480.01f43e2f.webp",
        16418
       ],
       "800": [
        "rebote-800.c56711d9.webp",
        34076
       ],
       "960": [
        "rebote-960.9180e6eb.webp",
        42456
       ]
      }
     },
     "portada": {
      "w": 1920,
      "h": 819,
      "orig": 1799196,
      "files": {
       "1440": [
        "portada-1440.36a539db.webp",
        47982
       ],
       "800": [
        "portada-800.abc885b9.webp",
        37082
       ]
      }
     }
    };
    // </manifest>

    /** Qué muestra cada foto, hacia dónde recortar (x, y en %) y su texto alternativo. */
    var PHOTOS = {
        dribbling: { focus: [62, 55], alt: "Jugador en posición baja dribblando el balón con la mano derecha en una cancha cubierta." },
        pase: { focus: [50, 45], alt: "Dos jugadores en una cancha cubierta: uno acaba de soltar un pase de pecho y el otro se prepara para recibir." },
        lanzamiento: { focus: [47, 40], alt: "Jugador suspendido en el aire en el momento de lanzar un tiro en suspensión." },
        finalizacion: { focus: [55, 40], alt: "Jugador finalizando cerca del aro con una mano mientras un defensor intenta taponar." },
        "juego-pies": { focus: [50, 60], alt: "Primer plano de las piernas de un jugador en posición baja, con un cono naranja al costado." },
        poste: { focus: [55, 50], alt: "Jugador de espaldas al aro protegiendo el balón contra un defensor en el poste bajo." },
        defensa: { focus: [55, 50], alt: "Defensor en posición baja frente a un atacante que dribbla el balón." },
        rebote: { focus: [40, 35], alt: "Dos jugadores saltan con los brazos extendidos para disputar un rebote junto al aro." },
        portada: { focus: [72, 50], alt: "Jugador en posición baja dribblando entre conos durante un entrenamiento, con otros jugadores practicando al fondo." }
    };

    var AREA_PHOTO = {
        "dominio-balon": "dribbling",
        pase: "pase",
        lanzamiento: "lanzamiento",
        finalizaciones: "finalizacion",
        "juego-pies": "juego-pies",
        poste: "poste",
        defensa: "defensa",
        rebote: "rebote"
    };

    var AI_NOTE = "Imagen ilustrativa generada con IA. No es una demostración técnica.";

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function has(key) { return !!(key && MANIFEST[key] && Object.keys(MANIFEST[key].files || {}).length); }

    function src(key, size) {
        var f = has(key) && MANIFEST[key].files[size];
        return f ? BASE + f[0] : "";
    }

    /** Variantes por uso: tarjeta (480/800), portada de área o ficha (800/960), portada general. */
    var VARIANTS = {
        card: { list: ["480", "800"], w: 800, h: 450 },
        cover: { list: ["480", "800", "960"], w: 960, h: 540 },
        hero: { list: ["800", "1440"], w: 1440, h: 600 }
    };

    /**
     * <img> responsive con dimensiones explícitas (sin saltos de diseño), recorte por
     * object-position y carga diferida salvo que se pida prioridad.
     */
    function img(key, opts) {
        opts = opts || {};
        if (!has(key)) return "";
        var v = VARIANTS[opts.variant || "card"];
        var files = MANIFEST[key].files;
        var list = v.list.filter(function (s) { return files[s]; });
        if (!list.length) return "";
        var widths = { "480": 480, "800": 800, "960": 960, "1440": 1440 };
        var srcset = list.map(function (s) { return BASE + files[s][0] + " " + widths[s] + "w"; }).join(", ");
        var p = PHOTOS[key] || { focus: [50, 50], alt: "" };
        var alt = opts.alt != null ? opts.alt : p.alt;
        return '<img class="' + esc(opts.cls || "fm-img") + '" src="' + esc(BASE + files[list[list.length - 1]][0]) + '" srcset="' + esc(srcset) + '"' +
            ' sizes="' + esc(opts.sizes || "100vw") + '" width="' + v.w + '" height="' + v.h + '"' +
            ' alt="' + esc(alt) + '"' + (alt ? "" : ' aria-hidden="true"') +
            ' style="object-position:' + p.focus[0] + "% " + p.focus[1] + '%"' +
            (opts.priority ? ' fetchpriority="high" loading="eager"' : ' loading="lazy"') + ' decoding="async">';
    }

    function areaPhoto(areaId) { var k = AREA_PHOTO[areaId]; return has(k) ? k : null; }

    /** Las fichas usan la foto de su área principal (no hay fotos propias por fundamento). */
    function conceptPhoto(concept) { return concept ? areaPhoto(concept.area) : null; }

    function totalBytes() {
        var t = 0;
        Object.keys(MANIFEST).forEach(function (k) {
            Object.keys(MANIFEST[k].files).forEach(function (s) { t += MANIFEST[k].files[s][1]; });
        });
        return t;
    }

    return {
        BASE: BASE,
        MANIFEST: MANIFEST,
        PHOTOS: PHOTOS,
        AREA_PHOTO: AREA_PHOTO,
        AI_NOTE: AI_NOTE,
        has: has,
        src: src,
        img: img,
        areaPhoto: areaPhoto,
        conceptPhoto: conceptPhoto,
        totalBytes: totalBytes
    };
});
