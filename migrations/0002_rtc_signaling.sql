create table if not exists rtc_peers (
  room text not null,
  peer_id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room, peer_id)
);

create table if not exists rtc_signals (
  id bigserial primary key,
  room text not null,
  sender_peer_id text not null,
  recipient_peer_id text not null,
  kind text not null check (kind in ('offer', 'answer', 'ice')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists rtc_peers_room_last_seen_idx on rtc_peers (room, last_seen_at desc);
create index if not exists rtc_signals_room_recipient_id_idx on rtc_signals (room, recipient_peer_id, id);
create index if not exists rtc_signals_created_at_idx on rtc_signals (created_at);
