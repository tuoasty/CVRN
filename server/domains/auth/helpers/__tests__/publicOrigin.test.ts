import {describe, expect, it} from "vitest";
import {publicOrigin} from "../publicOrigin";

function headers(entries: Record<string, string>) {
    return new Headers(entries);
}

describe("publicOrigin", () => {
    it("uses the forwarded host and proto behind nginx", () => {
        expect(publicOrigin(headers({"x-forwarded-host": "cvrn.net", "x-forwarded-proto": "https"}), "http://localhost:3000"))
            .toBe("https://cvrn.net");
    });

    it("defaults the proto to https", () => {
        expect(publicOrigin(headers({"x-forwarded-host": "cvrn.net"}), "http://localhost:3000")).toBe("https://cvrn.net");
    });

    it("takes the first value of a forwarded list", () => {
        expect(publicOrigin(headers({"x-forwarded-host": "cvrn.net, 127.0.0.1:3000", "x-forwarded-proto": "https, http"}), "http://localhost:3000"))
            .toBe("https://cvrn.net");
    });

    it("keeps a port on the forwarded host", () => {
        expect(publicOrigin(headers({"x-forwarded-host": "localhost:3000", "x-forwarded-proto": "http"}), "http://0.0.0.0:3000"))
            .toBe("http://localhost:3000");
    });

    it("falls back to the request origin without forwarded headers", () => {
        expect(publicOrigin(headers({}), "http://localhost:3000")).toBe("http://localhost:3000");
    });

    it("ignores a malformed forwarded host", () => {
        expect(publicOrigin(headers({"x-forwarded-host": "evil.example/path"}), "http://localhost:3000")).toBe("http://localhost:3000");
        expect(publicOrigin(headers({"x-forwarded-host": "cvrn.net", "x-forwarded-proto": "javascript"}), "http://localhost:3000")).toBe("https://cvrn.net");
    });
});
