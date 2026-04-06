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
