import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { log } from "@/lib/log";

export async function GET() {
  try {
    await queryOne("select 1 as ok");
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    log.error("health check failed", { err: String(err) });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
