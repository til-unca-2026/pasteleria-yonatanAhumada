import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const diagnostics = {
    hasUrl: Boolean(url),
    urlHost: url ? (() => { try { return new URL(url.trim()).host; } catch { return "INVALID_URL"; } })() : null,
    urlHasWhitespace: url ? url !== url.trim() : false,
    hasKey: Boolean(key),
    keyLength: key ? key.length : 0,
    keyHasWhitespace: key ? key !== key.trim() : false,
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tortas")
      .select("id, nombre")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, diagnostics, supabaseError: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      diagnostics,
      sampleCount: data?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        diagnostics,
        exception: err instanceof Error ? { message: err.message, name: err.name } : String(err),
      },
      { status: 500 }
    );
  }
}

