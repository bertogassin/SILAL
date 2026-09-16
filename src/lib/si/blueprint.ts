import type { MessageKey } from "./i18n";

/**
 * Load-bearing map of the house.
 * Live rooms are built. Sockets stay empty until a lawful module plugs in.
 * Nothing here replaces FOUNDATION.
 */
export type AppPath =
  | "/"
  | "/silsila"
  | "/wallet"
  | "/house"
  | "/events"
  | "/archive"
  | "/cred"
  | "/mekhk"
  | "/circle"
  | "/referrals"
  | "/token"
  | "/network"
  | "/custom"
  | "/settings"
  | "/chronicle";

export type RoomStatus = "live" | "socket";

export interface BlueprintRoom {
  id: string;
  href: AppPath;
  key: MessageKey;
  status: RoomStatus;
}

export const BLUEPRINT: BlueprintRoom[] = [
  { id: "home", href: "/", key: "nav.home", status: "live" },
  { id: "tree", href: "/silsila", key: "nav.tree", status: "live" },
  { id: "wallet", href: "/wallet", key: "nav.wallet", status: "live" },
  { id: "house", href: "/house", key: "nav.house", status: "live" },
  { id: "events", href: "/events", key: "nav.events", status: "live" },
  { id: "archive", href: "/archive", key: "nav.archive", status: "live" },
  { id: "cred", href: "/cred", key: "nav.cred", status: "live" },
  { id: "mekhk", href: "/mekhk", key: "nav.mekhk", status: "live" },
  { id: "circle", href: "/circle", key: "nav.circle", status: "live" },
  { id: "referrals", href: "/referrals", key: "nav.referrals", status: "live" },
  { id: "token", href: "/token", key: "nav.token", status: "live" },
  { id: "network", href: "/network", key: "nav.network", status: "live" },
  { id: "custom", href: "/custom", key: "nav.custom", status: "live" },
  { id: "chronicle", href: "/chronicle", key: "nav.chronicle", status: "live" },
  { id: "settings", href: "/settings", key: "nav.settings", status: "live" },
];

/** Reserved plates. A future licensed bank or insurer sits here. Not a rewrite. */
export const SOCKETS: { id: string; key: MessageKey }[] = [
  { id: "licensed-bank", key: "map.socketBank" },
  { id: "licensed-insure", key: "map.socketInsure" },
  { id: "hybrid-pq", key: "map.socketPq" },
];

export const LIVE_ROOMS = BLUEPRINT.filter((r) => r.status === "live");
