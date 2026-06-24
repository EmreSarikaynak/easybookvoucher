import { NextResponse } from "next/server";
import { fetchFooterHelpLinks } from "@/lib/help/help-pages-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const links = await fetchFooterHelpLinks();
  return NextResponse.json(links);
}
