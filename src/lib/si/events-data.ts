export interface UserEvent {
  id: string;
  title: string;
  place: string;
  at: string;
  inviteOnly: boolean;
  host: string;
  note: string;
  x: number;
  y: number;
  boosted?: boolean;
}

export function pinFor(id: string): { x: number; y: number } {
  let h = 0;
  for (const c of id) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return { x: 15 + (h % 70), y: 18 + ((h >> 8) % 60) };
}
