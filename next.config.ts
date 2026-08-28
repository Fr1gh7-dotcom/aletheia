import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La home dell'utente è un repo git con un package-lock: senza questo Next
  // risalirebbe fino a /Users/apple cercando la root del workspace.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
