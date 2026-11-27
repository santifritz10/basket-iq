/**
 * Logo oficial de Basket Lab (el mismo archivo del menú lateral).
 * El SVG ya incluye "BASKET LAB" y "BY COACH FRITZ", por eso no se repite
 * el texto al lado: el nombre queda como texto alternativo.
 */
export const BRAND_LOGO_SRC = "/assets/images/logo-basketlab.svg";

export function BrandLogo({ size = 96, className, priority = false }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt="Basket Lab · By Coach Fritz"
      width={size}
      height={size}
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
    />
  );
}
