import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native addon — keep it out of the server bundle.
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      // Old auto-generated blog slugs -> keyword slugs (SEO).
      {
        source: "/blog/untitled-post",
        destination: "/blog/framer-to-html-converter",
        permanent: true,
      },
      {
        source: "/blog/untitled-post-2",
        destination: "/blog/framer-vs-wordpress",
        permanent: true,
      },
      // Keyword URL variants → primary "Framer to HTML converter" money page.
      {
        source: "/framer-to-html-converter",
        destination: "/framer-to-html",
        permanent: true,
      },
      {
        source: "/export-framer-to-html",
        destination: "/framer-to-html",
        permanent: true,
      },
      {
        source: "/convert-framer-to-html",
        destination: "/framer-to-html",
        permanent: true,
      },
      {
        source: "/free-framer-to-html",
        destination: "/framer-to-html",
        permanent: true,
      },
      {
        source: "/framer-html-export",
        destination: "/framer-to-html",
        permanent: true,
      },
      {
        source: "/framer-html-converter",
        destination: "/framer-to-html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
