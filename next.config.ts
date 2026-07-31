import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native addon — keep it out of the server bundle.
  serverExternalPackages: ["sharp"],
  // Pin the workspace root explicitly. An unrelated package.json in the
  // user's home directory (separate Remotion tooling) otherwise gets picked
  // up by Turbopack's lockfile-based root inference, breaking module
  // resolution for this project entirely.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // The pricing page is gone — the product is free and has no billing, so
      // a page about price was only ever restating that. Redirected rather
      // than 404'd so the URL's existing links and ranking signal fold into
      // the homepage, which already carries the "free" message.
      {
        source: "/pricing",
        destination: "/",
        permanent: true,
      },
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
