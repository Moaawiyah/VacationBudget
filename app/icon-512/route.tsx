import { renderAppIcon } from "@/lib/pwa-icon";

export async function GET() {
  return renderAppIcon(512);
}
