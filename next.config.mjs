/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/": ["./index.html", "./css/**/*", "./js/**/*", "./images/**/*", "./favicon.svg"],
    "/assets/[...path]": ["./css/**/*", "./js/**/*", "./images/**/*", "./favicon.svg"],
    "/legacy/[...path]": ["./index.html", "./css/**/*", "./js/**/*", "./images/**/*", "./favicon.svg"]
  },
  async headers() {
    return [
      {
        // Fotos de la academia: WebP ya optimizados con sufijo de contenido en el nombre.
        source: "/images/academy/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
