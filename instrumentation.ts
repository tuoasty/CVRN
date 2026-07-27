export async function register() {
    // Dynamic import keeps the Node-only env assert (and its process.exit) out of the
    // Edge bundle that proxy.ts compiles into.
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./instrumentation-node");
    }
}
