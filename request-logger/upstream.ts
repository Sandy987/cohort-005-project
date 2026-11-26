import type http from "node:http";
import type { CustomTarget, ResolvedTarget } from "./agents";

/**
 * A resolved target the proxy can actually route to and render: a catalogue
 * ResolvedTarget or a student-typed CustomTarget. The two are used
 * interchangeably everywhere in the proxy except upstreamConnection, which is the
 * one place their upstream host is found differently.
 */
export type ProxyTarget = ResolvedTarget | CustomTarget;

/**
 * Where a target's traffic actually goes: a scheme, a host and a port.
 *
 * A catalogue ResolvedTarget is always HTTPS on 443 — every provider in the
 * catalogue is a public HTTPS API, so this has never needed to vary, and
 * still does not: it is read straight off upstreamHost, unchanged. A
 * CustomTarget can be anything the student typed, including plain HTTP on an
 * arbitrary port (a local Ollama server, say), so its scheme and port are
 * parsed from the base URL instead of assumed.
 */
export function upstreamConnection(target: ProxyTarget): {
  hostname: string;
  port: number;
  useHttps: boolean;
} {
  if (target.kind === "target") {
    return { hostname: target.upstreamHost, port: 443, useHttps: true };
  }
  const url = new URL(target.upstreamBaseUrl);
  const useHttps = url.protocol === "https:";
  return {
    hostname: url.hostname,
    port: url.port ? Number(url.port) : useHttps ? 443 : 80,
    useHttps,
  };
}

/**
 * The path prefix a CustomTarget's base URL carries, if any — e.g.
 * "/zen/go" for https://opencode.ai/zen/go. Empty for a bare origin, and
 * always empty for a catalogue ResolvedTarget, which never carries one (see
 * upstreamHost). handle() prepends this to each request's own path so a
 * student-typed base URL with a path segment is not silently dropped —
 * without it, https://opencode.ai/zen/go would forward to
 * https://opencode.ai/v1/chat/completions instead of
 * https://opencode.ai/zen/go/v1/chat/completions, a 404.
 *
 * agents.ts already strips a trailing slash and collapses a bare "/" to ""
 * before this is stored, so plain concatenation against a leading-slash
 * request path never produces a doubled or missing slash — but the
 * stripping is repeated here too, since nothing stops a test or a future
 * caller from constructing a CustomTarget by hand with a trailing slash.
 */
export function upstreamPathPrefix(target: ProxyTarget): string {
  if (target.kind === "target") return "";
  const { pathname } = new URL(target.upstreamBaseUrl);
  return pathname === "/" ? "" : pathname.replace(/\/+$/, "");
}

/**
 * Headers forwarded upstream. We strip hop-by-hop headers, and we ask for an
 * uncompressed response so the capture is readable, then recompute the length
 * against the buffered body.
 *
 * We deliberately keep `content-encoding`. Some agents compress the request
 * body, and the upstream must receive those bytes exactly as the agent produced
 * them. Only the copy we write to disk is decoded.
 *
 * Auth headers pass through untouched so the real request still authenticates.
 */
export function forwardHeaders(
  headers: http.IncomingHttpHeaders,
  body: Buffer
): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = { ...headers };
  delete out["host"];
  delete out["connection"];
  delete out["accept-encoding"]; // force identity so we can read the stream
  delete out["transfer-encoding"];
  delete out["content-length"];
  if (body.length > 0) out["content-length"] = String(body.length);
  return out;
}
