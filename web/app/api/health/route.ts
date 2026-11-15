import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("tortas").select("id").limit(1);

    if (error) {
      return NextResponse.json({ ok: false, db: "error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, db: "connected" });
  } catch {
    return NextResponse.json({ ok: false, db: "error" }, { status: 500 });
  }
}
