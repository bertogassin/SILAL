import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getSql } from "@/lib/db";

const MAX_SIGNALS_PER_POLL = 200;
const MAX_RATE_ENTRIES = 2048;
const PEER_TTL_SECONDS = 35;
const SIGNAL_TTL_MINUTES = 10;
const CLEANUP_INTERVAL_MS = 30_000;

const globalRtcRef = globalThis as typeof globalThis & {
  __rtcRateLimit__?: Map<string, { count: number; resetAt: number }>;
  __rtcCleanupAt__?: number;
};

const RoomSchema = z.string().trim().min(1).max(96).regex(/^[a-zA-Z0-9:_./-]+$/);
const PeerSchema = z.string().trim().min(1).max(96).regex(/^[a-zA-Z0-9:_-]+$/);

const JoinQuerySchema = z.object({
  room: RoomSchema,
  peer: PeerSchema,
  name: z.string().trim().max(80).default(""),
  token: z.string().trim().min(16).max(256).optional(),
  since: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
});

const SignalBodySchema = z.object({
  op: z.literal("signal"),
  room: RoomSchema,
  from: PeerSchema,
  to: PeerSchema,
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.unknown(),
});

const LeaveBodySchema = z.object({
  op: z.literal("leave"),
  room: RoomSchema,
  peer: PeerSchema,
  token: z.string().trim().min(16).max(256),
});

const AuthenticatedSignalBodySchema = SignalBodySchema.extend({
  token: z.string().trim().min(16).max(256),
});

const PostBodySchema = z.union([AuthenticatedSignalBodySchema, LeaveBodySchema]);

type RtcJoinQuery = z.infer<typeof JoinQuerySchema>;
type RtcPostBody = z.infer<typeof PostBodySchema>;

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const map = (globalRtcRef.__rtcRateLimit__ ??= new Map());
  if (map.size > MAX_RATE_ENTRIES) {
    for (const [entryKey, entry] of map) {
      if (entry.resetAt <= now) map.delete(entryKey);
    }
  }
  const entry = map.get(key);
  if (!entry || entry.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

async function cleanup(sql: Awaited<ReturnType<typeof getSql>>): Promise<void> {
  await sql.query(
    `delete from rtc_peers where last_seen_at < now() - interval '${PEER_TTL_SECONDS} seconds'`,
  );
  await sql.query(
    `delete from rtc_signals where created_at < now() - interval '${SIGNAL_TTL_MINUTES} minutes'`,
  );
}

async function maybeCleanup(sql: Awaited<ReturnType<typeof getSql>>): Promise<void> {
  const now = Date.now();
  if (globalRtcRef.__rtcCleanupAt__ && now - globalRtcRef.__rtcCleanupAt__ < CLEANUP_INTERVAL_MS) {
    return;
  }
  globalRtcRef.__rtcCleanupAt__ = now;
  await cleanup(sql);
}

function issuePeerToken(): string {
  return randomBytes(24).toString("base64url");
}

type PeerClaim = {
  session_token: string;
  stale: boolean;
};

async function claimPeerSession(
  sql: Awaited<ReturnType<typeof getSql>>,
  query: RtcJoinQuery,
): Promise<PeerClaim | null> {
  const existing = await sql.query<{ session_token: string; stale: boolean }>(
    `select session_token,
           last_seen_at < now() - interval '${PEER_TTL_SECONDS} seconds' as stale
     from rtc_peers
     where room = $1 and peer_id = $2
     limit 1`,
    [query.room, query.peer],
  );
  const token = query.token?.trim() || issuePeerToken();
  const row = existing[0];
  if (!row) {
    await sql.query(
     `insert into rtc_peers (room, peer_id, name, session_token, last_seen_at)
      values ($1, $2, $3, $4, now())`,
     [query.room, query.peer, query.name, token],
    );
    return { session_token: token, stale: false };
  }
  if (query.token && query.token === row.session_token) {
    await sql.query(
     `update rtc_peers
      set name = $3, last_seen_at = now()
      where room = $1 and peer_id = $2 and session_token = $4`,
     [query.room, query.peer, query.name, query.token],
    );
    return { session_token: row.session_token, stale: false };
  }
  if (!row.stale) return null;
  await sql.query(
    `update rtc_peers
     set name = $3, session_token = $4, last_seen_at = now()
     where room = $1 and peer_id = $2`,
    [query.room, query.peer, query.name, token],
  );
  await sql.query(
    `delete from rtc_signals
     where room = $1 and (sender_peer_id = $2 or recipient_peer_id = $2)`,
    [query.room, query.peer],
  );
  return { session_token: token, stale: true };
}

async function handlePoll(request: Request, query: RtcJoinQuery): Promise<Response> {
  if (!rateLimit(`poll:${clientIp(request)}:${query.room}`, 180, 60_000)) {
    return json({ error: "rate_limited" }, { status: 429 });
  }
  const sql = await getSql();
  await maybeCleanup(sql);
  const claim = await claimPeerSession(sql, query);
  if (!claim) return json({ error: "peer_conflict" }, { status: 409 });
  const peers = await sql.query<{ id: string; name: string }>(
    `select peer_id as id, name
     from rtc_peers
     where room = $1
       and last_seen_at >= now() - interval '${PEER_TTL_SECONDS} seconds'
     order by peer_id asc`,
    [query.room],
  );
  const signals = await sql.query<{
    id: number;
    from: string;
    kind: "offer" | "answer" | "ice";
    payload: unknown;
  }>(
    `select id, sender_peer_id as "from", kind, payload
     from rtc_signals
     where room = $1
       and recipient_peer_id = $2
       and id > $3
     order by id asc
     limit ${MAX_SIGNALS_PER_POLL}`,
    [query.room, query.peer, query.since],
  );
  return json({ peers, signals, token: claim.session_token });
}

async function handleMutation(request: Request, body: RtcPostBody): Promise<Response> {
  const peerId = body.op === "signal" ? body.from : body.peer;
  if (!rateLimit(`mutate:${clientIp(request)}:${body.room}:${peerId}`, 240, 60_000)) {
    return json({ error: "rate_limited" }, { status: 429 });
  }
  const sql = await getSql();
  await maybeCleanup(sql);
  if (body.op === "leave") {
    const removed = await sql.query<{ peer_id: string }>(
     `delete from rtc_peers
      where room = $1 and peer_id = $2 and session_token = $3
      returning peer_id`,
     [body.room, body.peer, body.token],
    );
    if (removed.length === 0) return json({ error: "forbidden" }, { status: 403 });
    await sql.query(
     `delete from rtc_signals
      where room = $1 and (sender_peer_id = $2 or recipient_peer_id = $2)`,
     [body.room, body.peer],
    );
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  const sender = await sql.query<{ peer_id: string }>(
    `update rtc_peers
     set last_seen_at = now()
     where room = $1 and peer_id = $2 and session_token = $3
     returning peer_id`,
    [body.room, body.from, body.token],
  );
  if (sender.length === 0) return json({ error: "forbidden" }, { status: 403 });
  await sql.query(
    `insert into rtc_signals (room, sender_peer_id, recipient_peer_id, kind, payload)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [body.room, body.from, body.to, body.kind, JSON.stringify(body.payload ?? null)],
  );
  return new Response(null, { status: 202, headers: { "cache-control": "no-store" } });
}

export async function handleRtcRequest(request: Request): Promise<Response> {
  try {
    const method = request.method.toUpperCase();
    if (method === "GET") {
      const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
      const query = JoinQuerySchema.safeParse(raw);
      if (!query.success) return json({ error: "invalid_query" }, { status: 400 });
      return await handlePoll(request, query.data);
    }
    if (method === "POST") {
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return json({ error: "invalid_json" }, { status: 400 });
      }
      const body = PostBodySchema.safeParse(rawBody);
      if (!body.success) return json({ error: "invalid_body" }, { status: 400 });
      return await handleMutation(request, body.data);
    }
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, POST", "cache-control": "no-store" },
    });
  } catch {
    return json({ error: "rtc_unavailable" }, { status: 503 });
  }
}
