/**
 * Liveness probe for the CI deploy gate and the uptime monitor.
 *
 * Deliberately touches nothing external. "Is this process serving HTTP?" is a different
 * question from "is Supabase reachable?", and conflating them means a Supabase blip fails
 * deploys and pages someone for an outage they cannot fix from the box.
 */
export const dynamic = "force-dynamic";

export function GET() {
    return Response.json({ status: "ok", uptime: Math.round(process.uptime()) });
}
