import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vacation Budget",
    short_name: "Vacation Budget",
    description: "Plan and track your vacation spending across cities and currencies.",
    start_url: "/",
    display: "standalone",
    // Match the light --background token so the splash and title bar blend
    // into the app instead of flashing a different color on launch.
    background_color: "#f2f5f9",
    theme_color: "#f2f5f9",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
