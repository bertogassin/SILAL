import { useState } from "react";
import { useSi, type DocKind } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { sha256Hex, blake3Hex, merkleRootHex } from "@/lib/si/crypto";
import { playSound } from "@/lib/si/sounds";
import { copyText } from "@/lib/si/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Empty } from "./empty";
import { PageHead } from "./page-head";

const kinds: DocKind[] = ["nikkah", "diploma", "proxy", "medical", "other"];

export function ArchiveScreen() {
  const t = useT();
  const docs = useSi((s) => s.documents);
  const addDocument = useSi((s) => s.addDocument);
  const removeDocument = useSi((s) => s.removeDocument);
  const familyDocs = useSi((s) => s.familyDocs);
  const addFamilyDoc = useSi((s) => s.addFamilyDoc);
  const signFamilyDoc = useSi((s) => s.signFamilyDoc);
  const people = useSi((s) => s.people);
  const [open, setOpen] = useState(false);
  const [famOpen, setFamOpen] = useState(false);
  const [famTitle, setFamTitle] = useState("");
  const [famBody, setFamBody] = useState("");
  const [famReq, setFamReq] = useState("2");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DocKind>("nikkah");
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<{ sha: string; blake: string; bytes: number } | null>(null);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const root = merkleRootHex(docs.map((d) => d.blake3 || d.sha256));

  async function onFile(f: File | undefined) {
    if (!f) return;
    const buf = new Uint8Array(await f.arrayBuffer());
    setHash({ sha: sha256Hex(buf), blake: blake3Hex(buf), bytes: buf.length });
    if (!title) setTitle(f.name);
  }

  function save() {
    if (!hash || !title.trim()) return;
    setBusy(true);
    addDocument({
      title: title.trim(),
      kind,
      sha256: hash.sha,
      blake3: hash.blake,
      bytes: hash.bytes,
      note: note.trim() || undefined,
    });
    setBusy(false);
    setOpen(false);
    setTitle("");
    setHash(null);
    setNote("");
  }

  const kindLabel: Record<DocKind, string> = {
    nikkah: t("archive.nikkah"),
    diploma: t("archive.diploma"),
    proxy: t("archive.proxy"),
    medical: t("archive.medical"),
    other: t("archive.other"),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between">
        <PageHead kicker={t("archive.title")} title={t("nav.archive")} />
        <Button size="sm" className="mb-1 shrink-0" onClick={() => setOpen(true)}>
          {t("archive.add")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("archive.stored")}</p>
      {docs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("archive.anchor")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("archive.anchorHint")}</p>
          <button
            type="button"
            className="mt-2 break-all text-left font-mono text-xs text-gold"
            onClick={() => {
              void copyText(root);
            }}
          >
            {root}
          </button>
        </div>
      )}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("archive.search")} />
      {docs.length === 0 ? (
        <Empty>{t("archive.empty")}</Empty>
      ) : (
        <ul className="space-y-3">
          {docs
            .filter((d) => !q.trim() || d.title.toLowerCase().includes(q.trim().toLowerCase()))
            .map((d) => (
            <li key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-lg">{d.title}</div>
                <Badge>{kindLabel[d.kind]}</Badge>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {t("archive.hash")} SHA-256 {d.sha256}
              </p>
              {d.blake3 && (
                <p className="break-all font-mono text-xs text-muted-foreground">BLAKE3 {d.blake3}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t("archive.size")} {(d.bytes / 1024).toFixed(1)} KB
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void copyText(d.sha256);
                    void playSound("ui_tap");
                  }}
                >
                  {t("archive.copyHash")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeDocument(d.id)}>
                  {t("common.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("archive.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("archive.titleField")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Label>{t("archive.kind")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "h-10 rounded-lg border text-sm",
                    kind === k ? "border-gold" : "border-border",
                  )}
                >
                  {kindLabel[k]}
                </button>
              ))}
            </div>
            <Label>{t("archive.file")}</Label>
            <input
              type="file"
              className="block w-full text-sm"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Label>{t("archive.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
            {hash && (
              <p className="break-all font-mono text-[11px] text-muted-foreground">
                SHA-256 {hash.sha}
              </p>
            )}
            <Button className="w-full" disabled={!hash || busy} onClick={save}>
              {t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="space-y-3 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">{t("family.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("family.hint")}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setFamOpen(true)}>
            {t("common.add")}
          </Button>
        </div>
        {familyDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("family.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {familyDocs.map((d) => (
              <li key={d.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-display text-lg">{d.title}</div>
                  <Badge tone={d.hash ? "wool" : "gold"}>
                    {d.hash ? t("family.done") : `${d.signatures.length}/${d.required}`}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-pretty">{d.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {d.signatures.map((s) => s.name).join(" · ") || t("family.empty")}
                </p>
                {!d.hash && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {people.map((p) => (
                      <Button
                        key={p.id}
                        size="sm"
                        variant="outline"
                        disabled={d.signatures.some((s) => s.personId === p.id)}
                        onClick={() => signFamilyDoc(d.id, p.id)}
                      >
                        {t("family.sign")} · {p.name}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={famOpen} onOpenChange={setFamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("family.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("archive.titleField")}</Label>
            <Input value={famTitle} onChange={(e) => setFamTitle(e.target.value)} />
            <Label>{t("family.body")}</Label>
            <Input value={famBody} onChange={(e) => setFamBody(e.target.value)} />
            <Label>{t("family.required")}</Label>
            <Input value={famReq} onChange={(e) => setFamReq(e.target.value)} inputMode="numeric" />
            <Button
              className="w-full"
              onClick={() => {
                if (!famTitle.trim() || !famBody.trim()) return;
                addFamilyDoc(famTitle.trim(), famBody.trim(), Number(famReq) || 2);
                setFamTitle("");
                setFamBody("");
                setFamOpen(false);
              }}
            >
              {t("common.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
