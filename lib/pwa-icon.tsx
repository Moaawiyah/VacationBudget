import { ImageResponse } from "next/og";

// Lucide's "Plane" path (same icon used for Flights and the splash screen),
// reused directly rather than depending on emoji font-fetching at build time.
const PLANE_PATH =
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";

/** Renders the app icon at the given square size — the plane mark on a solid
 * primary-blue field, so it also works as a maskable icon (no transparent
 * corners, mark stays well inside the safe zone). */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2563eb",
      }}
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={PLANE_PATH} />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
