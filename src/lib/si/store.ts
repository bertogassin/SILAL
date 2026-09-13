import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "./i18n";
import { isLocale } from "./i18n";
import {
  FAMILY_AIRDROP_TOKENS,
  tokensToUnits,
} from "./tokenomics";
import {
  generateMnemonic12,
  mnemonicIsValid,
  newWalletFromMnemonic,
  sealVault,
  unsealVault,
  isSiAddress,
  txIdFor,
  protocolAddress,
  sha256Hex,
  signUtf8Hex,
  type SealedVault,
  type VaultPlain,
  type CryptoProvider,
} from "./crypto";
import {
  genesisLedger,
  applyTransfer,
  fundAddress,
  getBalance,
  type Ledger,
  type LedgerTx,
} from "./ledger";
import {
  type Person,
  type KinEdge,
  type EdgeType,
  canAddEdge,
  fromGedcom,
  toGedcom,
  kinshipCheck,
  LEGACY_IMPORT_PERSON_IDS,
  type KinshipResult,
} from "./silsila";
import { applyReferralPayout, codeFromAddress, parseInvite, type ReferralState } from "./referral";
import { pinFor, type UserEvent } from "./events-data";
import { playSound, setSoundsEnabled } from "./sounds";
import { isSealedVault, vaultFingerprint } from "./pairing";
import type { AidPost, FamilyPot, GrantDraft, Household, Incident, InsuranceClaim, QardNote, StudyNote, Workshop } from "./house";
import { EMPTY_HOUSEHOLD } from "./house";
import { potAddress } from "./foundation";

export type Theme = "dark" | "light";
export type DocKind = "nikkah" | "diploma" | "proxy" | "medical" | "other";

export interface ArchiveDoc {
  id: string;
  title: string;
  kind: DocKind;
  sha256: string;
  blake3?: string;
  bytes: number;
  addedAt: number;
  note?: string;
}

export interface CircleMember {
  id: string;
  name: string;
  role: "member" | "elder";
  joinedAt: number;
}

export type CredKind = "diploma" | "guarantee" | "membership";

export interface SiCred {
  id: string;
  kind: CredKind;
  subjectName: string;
  claim: string;
  issuedAt: number;
  issuerAddress: string;
  issuerPublicKeyHex?: string;
  payload: string;
  signatureHex: string;
  revealed: boolean;
  revoked: boolean;
}

export interface MekhkParty {
  name: string;
  consented: boolean;
}

export interface MekhkCase {
  id: string;
  title: string;
  parties: MekhkParty[];
  protocol: string;
  status: "open" | "agreed" | "withdrawn";
  hash?: string;
  createdAt: number;
}

export interface FamilyDoc {
  id: string;
  title: string;
  body: string;
  required: number;
  signatures: { personId: string; name: string; at: number }[];
  hash?: string;
  createdAt: number;
}

export interface SiProfile {
  name: string;
  taip?: string;
  country?: string;
  hiddenProfile: boolean;
  familyContact?: string;
  birthYear?: number;
}

export interface JournalItem {
  id: string;
  at: number;
  kind: "tx" | "rsvp" | "cred" | "mekhk" | "tree" | "ref" | "airdrop" | "invite";
  label?: string;
}

export interface SiPublicState {
  locale: Locale;
  theme: Theme;
  sounds: boolean;
  onboardingComplete: boolean;
  profile: SiProfile | null;
  address: string | null;
  referral: ReferralState | null;
  ledger: Ledger;
  people: Person[];
  edges: KinEdge[];
  documents: ArchiveDoc[];
  rsvps: string[];
  circle: CircleMember[];
  circleCode: string;
  blocked: string[];
  familyAirdropPaid: boolean;
  events: UserEvent[];
  creds: SiCred[];
  cases: MekhkCase[];
  familyDocs: FamilyDoc[];
  cryptoProvider: CryptoProvider;
  networkEndpoint: string;
  journal: JournalItem[];
  guestCircles: string[];
  lastBackupAt: number | null;
  idleMinutes: number;
  grants: GrantDraft[];
  workshops: Workshop[];
  aid: AidPost[];
  incidents: Incident[];
  studyNotes: StudyNote[];
  household: Household;
  pots: FamilyPot[];
  qards: QardNote[];
  claims: InsuranceClaim[];
  deskNotes: Record<string, string>;
  reminders: string[];
}

interface Session {
  unlocked: boolean;
  mnemonic: string | null;
  secretKeyHex: string | null;
  publicKeyHex: string | null;
}

interface SiStore extends SiPublicState {
  vault: SealedVault | null;
  session: Session;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  setLocale: (l: Locale) => void;
  setTheme: (t: Theme) => void;
  setSounds: (v: boolean) => void;
  createWallet: (password: string, profile: SiProfile) => Promise<VaultPlain>;
  importWallet: (mnemonic: string, password: string, profile: SiProfile) => Promise<VaultPlain>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  panic: () => void;
  updateProfile: (p: Partial<SiProfile>) => void;
  transfer: (to: string, amount: bigint, memo: string) => { ok: boolean; error?: string };
  addPerson: (p: Omit<Person, "id" | "createdAt">) => string;
  updatePerson: (id: string, p: Partial<Person>) => void;
  removePerson: (id: string) => void;
  link: (type: EdgeType, from: string, to: string) => { ok: boolean; errorKey?: string };
  kinship: (a: string, b: string) => KinshipResult | null;
  importGedcom: (text: string) => { people: number; edges: number };
  addDocument: (doc: Omit<ArchiveDoc, "id" | "addedAt">) => void;
  removeDocument: (id: string) => void;
  addEvent: (e: Omit<UserEvent, "id" | "x" | "y">) => void;
  removeEvent: (id: string) => void;
  rsvp: (eventId: string) => void;
  unrsvp: (eventId: string) => void;
  changePassword: (oldPw: string, newPw: string) => Promise<{ ok: boolean }>;
  setIdleMinutes: (n: number) => void;
  issueCred: (kind: CredKind, subjectName: string, claim: string) => { ok: boolean; error?: string };
  revealCred: (id: string, revealed: boolean) => void;
  revokeCred: (id: string) => void;
  addCase: (title: string, parties: string[]) => void;
  consentCase: (id: string, partyIndex: number) => void;
  writeProtocol: (id: string, protocol: string) => void;
  agreeCase: (id: string) => { ok: boolean };
  withdrawCase: (id: string) => void;
  addFamilyDoc: (title: string, body: string, required: number) => void;
  signFamilyDoc: (id: string, personId: string) => { ok: boolean };
  setCryptoProvider: (p: CryptoProvider) => void;
  applyRef: (raw: string) => { ok: boolean; error?: string };
  applyInvite: (raw: string) => { ok: boolean; error?: string; kind?: string };
  markBackup: () => void;
  addGrant: (title: string, body: string, ask: string) => void;
  addWorkshop: (title: string, place: string, contact: string) => void;
  removeWorkshop: (id: string) => void;
  addAid: (side: AidPost["side"], title: string, body: string) => void;
  removeAid: (id: string) => void;
  addIncident: (title: string, body: string) => void;
  addStudy: (title: string, body: string) => void;
  removeStudy: (id: string) => void;
  setHousehold: (p: Partial<Household>) => void;
  boostEvent: (eventId: string) => { ok: boolean; error?: string };
  addPot: (title: string, family?: boolean) => void;
  depositPot: (id: string, amount: bigint) => { ok: boolean; error?: string };
  withdrawPot: (id: string, amount: bigint) => { ok: boolean; error?: string };
  addQard: (to: string, amount: bigint, note: string) => { ok: boolean; error?: string };
  repayQard: (id: string) => { ok: boolean; error?: string };
  fileClaim: (title: string, body: string) => void;
  setRemind: (eventId: string, on: boolean) => void;
  setDeskNote: (id: string, note: string) => void;
  addCircleMember: (name: string, role: "member" | "elder") => void;
  setCircleRole: (id: string, role: "member" | "elder") => void;
  removeCircleMember: (id: string) => void;
  blockContact: (label: string) => void;
  unblockContact: (label: string) => void;
  exportGedcom: () => string;
  exportAll: () => string;
  restorePublic: (raw: string) => { ok: boolean };
  restoreVault: (raw: string, password: string) => Promise<{ ok: boolean; error?: string; fingerprint?: string }>;
  setNetworkEndpoint: (v: string) => void;
  tryConnectNetwork: () => { ok: boolean };
  completeOnboarding: () => void;
  wipe: () => void;
  maybeQualify: () => void;
}

const emptySession = (): Session => ({
  unlocked: false,
  mnemonic: null,
  secretKeyHex: null,
  publicKeyHex: null,
});

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function pushJournal(s: { journal: JournalItem[] }, kind: JournalItem["kind"], label?: string): JournalItem[] {
  return [{ id: uid("j"), at: Date.now(), kind, label }, ...s.journal].slice(0, 40);
}

function newCircleCode(): string {
  return `C-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const initialPublic = (): SiPublicState => ({
  locale: "ce",
  theme: "dark",
  sounds: true,
  onboardingComplete: false,
  profile: null,
  address: null,
  referral: null,
  ledger: genesisLedger(),
  people: [],
  edges: [],
  documents: [],
  rsvps: [],
  circle: [],
  circleCode: newCircleCode(),
  blocked: [],
  familyAirdropPaid: false,
  events: [],
  creds: [],
  cases: [],
  familyDocs: [],
  cryptoProvider: "classic",
  networkEndpoint: "",
  journal: [],
  guestCircles: [],
  lastBackupAt: null,
  idleMinutes: 12,
  grants: [],
  workshops: [],
  aid: [],
  incidents: [],
  studyNotes: [],
  household: { ...EMPTY_HOUSEHOLD },
  pots: [],
  qards: [],
  claims: [],
  deskNotes: {},
  reminders: [],
});

function persistable(s: SiStore) {
  return {
    locale: s.locale,
    theme: s.theme,
    sounds: s.sounds,
    onboardingComplete: s.onboardingComplete,
    profile: s.profile,
    address: s.address,
    referral: s.referral,
    ledger: s.ledger,
    people: s.people,
    edges: s.edges,
    documents: s.documents,
    rsvps: s.rsvps,
    circle: s.circle,
    circleCode: s.circleCode,
    blocked: s.blocked,
    familyAirdropPaid: s.familyAirdropPaid,
    events: s.events,
    creds: s.creds,
    cases: s.cases,
    familyDocs: s.familyDocs,
    cryptoProvider: s.cryptoProvider,
    networkEndpoint: s.networkEndpoint,
    journal: s.journal,
    guestCircles: s.guestCircles,
    lastBackupAt: s.lastBackupAt,
    idleMinutes: s.idleMinutes,
    grants: s.grants,
    workshops: s.workshops,
    aid: s.aid,
    incidents: s.incidents,
    studyNotes: s.studyNotes,
    household: s.household,
    pots: s.pots,
    qards: s.qards,
    claims: s.claims,
    deskNotes: s.deskNotes,
    reminders: s.reminders,
    vault: s.vault,
  };
}

export const useSi = create<SiStore>()(
  persist(
    (set, get) => ({
      ...initialPublic(),
      vault: null,
      session: emptySession(),
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      setLocale: (locale) => {
        if (!isLocale(locale)) return;
        set({ locale });
      },
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          document.documentElement.dataset.theme = theme;
        }
      },
      setSounds: (sounds) => {
        setSoundsEnabled(sounds);
        set({ sounds });
      },
      createWallet: async (password, profile) => {
        const mnemonic = generateMnemonic12();
        const plain = newWalletFromMnemonic(mnemonic);
        const vault = await sealVault(plain, password);
        const self: Person = {
          id: "self",
          name: profile.name,
          gender: "unknown",
          living: true,
          consentToPublish: true,
          isSelf: true,
          isMinor: isMinor(profile.birthYear),
          birthYear: profile.birthYear,
          taip: profile.taip,
          walletAddress: isMinor(profile.birthYear) ? undefined : plain.address,
          createdAt: Date.now(),
        };
        const referral: ReferralState = {
          code: codeFromAddress(plain.address),
          qualified: false,
          payoutTxIds: [],
        };
        set({
          vault,
          onboardingComplete: false,
          profile,
          address: plain.address,
          referral,
          people: [self],
          session: {
            unlocked: true,
            mnemonic: plain.mnemonic,
            secretKeyHex: plain.secretKeyHex,
            publicKeyHex: plain.publicKeyHex,
          },
        });
        return plain;
      },
      importWallet: async (mnemonic, password, profile) => {
        if (!mnemonicIsValid(mnemonic)) throw new Error("mnemonic");
        const plain = newWalletFromMnemonic(mnemonic);
        const vault = await sealVault(plain, password);
        const self: Person = {
          id: "self",
          name: profile.name,
          gender: "unknown",
          living: true,
          consentToPublish: true,
          isSelf: true,
          isMinor: isMinor(profile.birthYear),
          birthYear: profile.birthYear,
          taip: profile.taip,
          walletAddress: isMinor(profile.birthYear) ? undefined : plain.address,
          createdAt: Date.now(),
        };
        set({
          vault,
          onboardingComplete: false,
          profile,
          address: plain.address,
          referral: { code: codeFromAddress(plain.address), qualified: false, payoutTxIds: [] },
          people: [self],
          session: {
            unlocked: true,
            mnemonic: plain.mnemonic,
            secretKeyHex: plain.secretKeyHex,
            publicKeyHex: plain.publicKeyHex,
          },
        });
        return plain;
      },
      unlock: async (password) => {
        const { vault } = get();
        if (!vault) return false;
        try {
          const plain = await unsealVault(vault, password);
          set({
            session: {
              unlocked: true,
              mnemonic: plain.mnemonic,
              secretKeyHex: plain.secretKeyHex,
              publicKeyHex: plain.publicKeyHex,
            },
            address: plain.address,
          });
          return true;
        } catch {
          return false;
        }
      },
      lock: () => set({ session: emptySession() }),
      panic: () => {
        const s = get();
        if (s.profile) {
          set({
            profile: { ...s.profile, hiddenProfile: true },
            people: s.people.map((p) =>
              p.isSelf ? { ...p, hidden: true, consentToPublish: false } : p,
            ),
            session: emptySession(),
          });
        } else {
          set({ session: emptySession() });
        }
      },
      updateProfile: (p) => {
        const cur = get().profile;
        if (!cur) return;
        const next = { ...cur, ...p };
        set({
          profile: next,
          people: get().people.map((person) =>
            person.isSelf
              ? {
                  ...person,
                  name: next.name,
                  taip: next.taip,
                  hidden: next.hiddenProfile,
                  birthYear: next.birthYear,
                  isMinor: isMinor(next.birthYear),
                }
              : person,
          ),
        });
      },
      transfer: (to, amount, memo) => {
        const s = get();
        if (!s.address) return { ok: false, error: "wallet" };
        if (s.people.find((p) => p.isSelf)?.isMinor) return { ok: false, error: "minor" };
        if (!isSiAddress(to) && !to.startsWith("si1")) return { ok: false, error: "addr" };
        const r = applyTransfer(s.ledger, {
          from: s.address,
          to,
          amount,
          memo,
          kind: "transfer",
          txId: txIdFor(`${s.address}|${to}|${amount}|${memo}|${Date.now()}`),
        });
        if (!r.ok) return { ok: false, error: r.error };
        set({ ledger: r.ledger, journal: pushJournal(s, "tx", memo) });
        void playSound("tx_sent");
        return { ok: true };
      },
      addPerson: (p) => {
        const id = uid("p");
        const person: Person = { ...p, id, createdAt: Date.now() };
        set({ people: [...get().people, person], journal: pushJournal(get(), "tree", person.name) });
        get().maybeQualify();
        return id;
      },
      updatePerson: (id, p) => {
        if (id === "self" && p.isSelf === false) return;
        set({
          people: get().people.map((person) => (person.id === id ? { ...person, ...p, id: person.id, isSelf: person.isSelf } : person)),
        });
      },
      removePerson: (id) => {
        if (id === "self") return;
        const s = get();
        set({
          people: s.people.filter((p) => p.id !== id),
          edges: s.edges.filter((e) => e.from !== id && e.to !== id),
        });
      },
      link: (type, from, to) => {
        const s = get();
        const r = canAddEdge(s.people, s.edges, type, from, to);
        if (!r.ok) {
          void playSound("ui_warn");
          return { ok: false, errorKey: r.errorKey };
        }
        const edge: KinEdge = { ...r.edge, id: uid("e"), createdAt: Date.now() };
        set({ edges: [...s.edges, edge] });
        get().maybeQualify();
        void playSound("ui_success");
        return { ok: true };
      },
      kinship: (a, b) => {
        const s = get();
        if (!s.people.some((p) => p.id === a) || !s.people.some((p) => p.id === b)) return null;
        return kinshipCheck(s.people, s.edges, a, b);
      },
      importGedcom: (text) => {
        const parsed = fromGedcom(text);
        const existing = new Set(get().people.map((p) => p.id));
        const people = parsed.people.filter((p) => !existing.has(p.id));
        const known = new Set([...existing, ...people.map((p) => p.id)]);
        const edges = parsed.edges.filter((e) => known.has(e.from) && known.has(e.to));
        set({ people: [...get().people, ...people], edges: [...get().edges, ...edges] });
        get().maybeQualify();
        void playSound("ui_success");
        return { people: people.length, edges: edges.length };
      },
      addDocument: (doc) => {
        const item: ArchiveDoc = { ...doc, id: uid("d"), addedAt: Date.now() };
        set({ documents: [item, ...get().documents] });
        get().maybeQualify();
        void playSound("ui_success");
      },
      removeDocument: (id) => set({ documents: get().documents.filter((d) => d.id !== id) }),
      addEvent: (e) => {
        const id = uid("ev");
        const pin = pinFor(id);
        const item: UserEvent = { ...e, id, x: pin.x, y: pin.y };
        set({ events: [...get().events, item], journal: pushJournal(get(), "invite", item.title) });
        void playSound("ui_success");
      },
      removeEvent: (id) =>
        set({
          events: get().events.filter((e) => e.id !== id),
          rsvps: get().rsvps.filter((r) => r !== id),
        }),
      rsvp: (eventId) => {
        const s = get();
        if (s.rsvps.includes(eventId)) return;
        if (!s.events.some((e) => e.id === eventId)) return;
        set({ rsvps: [...s.rsvps, eventId], journal: pushJournal(s, "rsvp") });
        get().maybeQualify();
        void playSound("invite_accepted");
      },
      unrsvp: (eventId) => set({ rsvps: get().rsvps.filter((id) => id !== eventId) }),
      issueCred: (kind, subjectName, claim) => {
        const s = get();
        if (!s.address || !s.session.secretKeyHex) return { ok: false, error: "lock" };
        const issuedAt = Date.now();
        const payload = JSON.stringify({
          v: 1,
          kind,
          subjectName,
          claim,
          issuedAt,
          issuerAddress: s.address,
        });
        const signatureHex = signUtf8Hex(s.session.secretKeyHex, payload);
        const cred: SiCred = {
          id: uid("vc"),
          kind,
          subjectName,
          claim,
          issuedAt,
          issuerAddress: s.address,
          issuerPublicKeyHex: s.session.publicKeyHex ?? undefined,
          payload,
          signatureHex,
          revealed: false,
          revoked: false,
        };
        set({ creds: [cred, ...s.creds], journal: pushJournal(s, "cred", subjectName) });
        void playSound("ui_success");
        return { ok: true };
      },
      revealCred: (id, revealed) => {
        set({ creds: get().creds.map((c) => (c.id === id ? { ...c, revealed } : c)) });
      },
      revokeCred: (id) => {
        set({ creds: get().creds.map((c) => (c.id === id ? { ...c, revoked: true, revealed: false } : c)) });
      },
      addCase: (title, parties) => {
        const item: MekhkCase = {
          id: uid("mk"),
          title,
          parties: parties.filter(Boolean).map((name) => ({ name, consented: false })),
          protocol: "",
          status: "open",
          createdAt: Date.now(),
        };
        set({ cases: [item, ...get().cases] });
      },
      consentCase: (id, partyIndex) => {
        set({
          cases: get().cases.map((c) =>
            c.id === id
              ? {
                  ...c,
                  parties: c.parties.map((p, i) => (i === partyIndex ? { ...p, consented: true } : p)),
                }
              : c,
          ),
        });
      },
      writeProtocol: (id, protocol) => {
        set({ cases: get().cases.map((c) => (c.id === id ? { ...c, protocol } : c)) });
      },
      agreeCase: (id) => {
        const s = get();
        const c = s.cases.find((x) => x.id === id);
        if (!c) return { ok: false };
        if (c.parties.some((p) => !p.consented)) return { ok: false };
        if (!c.protocol.trim()) return { ok: false };
        const hash = sha256Hex(c.protocol);
        const doc: ArchiveDoc = {
          id: uid("d"),
          title: c.title,
          kind: "other",
          sha256: hash,
          bytes: new TextEncoder().encode(c.protocol).length,
          addedAt: Date.now(),
          note: "mekhk-khel",
        };
        set({
          cases: s.cases.map((x) => (x.id === id ? { ...x, status: "agreed" as const, hash } : x)),
          documents: [doc, ...s.documents],
        });
        void playSound("ui_success");
        return { ok: true };
      },
      withdrawCase: (id) => {
        set({ cases: get().cases.map((c) => (c.id === id ? { ...c, status: "withdrawn" as const } : c)) });
      },
      addFamilyDoc: (title, body, required) => {
        const item: FamilyDoc = {
          id: uid("fd"),
          title,
          body,
          required: Math.max(1, required),
          signatures: [],
          createdAt: Date.now(),
        };
        set({ familyDocs: [item, ...get().familyDocs] });
      },
      signFamilyDoc: (id, personId) => {
        const s = get();
        const doc = s.familyDocs.find((d) => d.id === id);
        const person = s.people.find((p) => p.id === personId);
        if (!doc || !person) return { ok: false };
        if (doc.signatures.some((x) => x.personId === personId)) return { ok: false };
        const signatures = [...doc.signatures, { personId, name: person.name, at: Date.now() }];
        let hash = doc.hash;
        let documents = s.documents;
        if (!hash && signatures.length >= doc.required) {
          hash = sha256Hex(`${doc.title}\n${doc.body}\n${signatures.map((x) => x.personId).join(",")}`);
          documents = [
            {
              id: uid("d"),
              title: doc.title,
              kind: "proxy",
              sha256: hash,
              bytes: new TextEncoder().encode(doc.body).length,
              addedAt: Date.now(),
              note: "family-multisig",
            },
            ...documents,
          ];
        }
        set({
          familyDocs: s.familyDocs.map((d) => (d.id === id ? { ...d, signatures, hash } : d)),
          documents,
        });
        void playSound("ui_success");
        return { ok: true };
      },
      setCryptoProvider: (cryptoProvider) => {
        if (cryptoProvider === "post-quantum") return;
        set({ cryptoProvider });
      },
      applyRef: (raw) => {
        const s = get();
        if (!s.referral || !s.address) return { ok: false, error: "wallet" };
        if (s.referral.referredBy) return { ok: false, error: "already" };
        const parsed = parseInvite(raw);
        if (!parsed || parsed.kind !== "ref") return { ok: false, error: "bad" };
        if (parsed.code === s.referral.code) return { ok: false, error: "self" };
        set({
          referral: {
            ...s.referral,
            referredBy: parsed.code,
            appliedAt: Date.now(),
          },
          journal: pushJournal(s, "ref", parsed.code),
        });
        get().maybeQualify();
        void playSound("ui_success");
        return { ok: true };
      },
      applyInvite: (raw) => {
        const parsed = parseInvite(raw);
        if (!parsed) return { ok: false, error: "bad" };
        if (parsed.kind === "ref") {
          const r = get().applyRef(raw);
          return r.ok ? { ok: true, kind: "ref" } : r;
        }
        if (parsed.kind === "event") {
          const ev = get().events.find((e) => e.id === parsed.code);
          if (!ev) return { ok: false, error: "bad" };
          get().rsvp(ev.id);
          return { ok: true, kind: "event" };
        }
        if (parsed.kind === "circle") {
          const s = get();
          if (parsed.code === s.circleCode || s.guestCircles.includes(parsed.code)) {
            return { ok: true, kind: "circle" };
          }
          set({
            guestCircles: [...s.guestCircles, parsed.code],
            journal: pushJournal(s, "invite", parsed.code),
          });
          void playSound("invite_accepted");
          return { ok: true, kind: "circle" };
        }
        if (parsed.kind === "pay") return { ok: true, kind: "pay" };
        return { ok: true, kind: "device" };
      },
      markBackup: () => set({ lastBackupAt: Date.now() }),
      setIdleMinutes: (n) => {
        if (n !== 5 && n !== 12 && n !== 30) return;
        set({ idleMinutes: n });
      },
      changePassword: async (oldPw, newPw) => {
        const s = get();
        if (!s.vault || newPw.length < 8) return { ok: false };
        try {
          const plain = await unsealVault(s.vault, oldPw);
          const vault = await sealVault(plain, newPw);
          set({ vault });
          return { ok: true };
        } catch {
          return { ok: false };
        }
      },
      addGrant: (title, body, ask) => {
        const createdAt = Date.now();
        const hash = sha256Hex(`${title}|${body}|${ask}|${createdAt}`);
        const item: GrantDraft = { id: uid("g"), title, body, ask, createdAt, hash };
        set({ grants: [item, ...get().grants] });
        void playSound("ui_success");
      },
      addWorkshop: (title, place, contact) => {
        set({
          workshops: [
            { id: uid("w"), title, place, contact, createdAt: Date.now() },
            ...get().workshops,
          ],
        });
        void playSound("ui_success");
      },
      removeWorkshop: (id) => set({ workshops: get().workshops.filter((w) => w.id !== id) }),
      addAid: (side, title, body) => {
        set({
          aid: [{ id: uid("a"), side, title, body, createdAt: Date.now() }, ...get().aid],
        });
        void playSound("invite_accepted");
      },
      removeAid: (id) => set({ aid: get().aid.filter((a) => a.id !== id) }),
      addIncident: (title, body) => {
        const createdAt = Date.now();
        const hash = sha256Hex(`incident|${title}|${body}|${createdAt}`);
        set({
          incidents: [{ id: uid("i"), title, body, createdAt, hash }, ...get().incidents],
        });
        void playSound("ui_success");
      },
      addStudy: (title, body) => {
        set({
          studyNotes: [{ id: uid("st"), title, body, createdAt: Date.now() }, ...get().studyNotes],
        });
        void playSound("ui_success");
      },
      removeStudy: (id) => set({ studyNotes: get().studyNotes.filter((n) => n.id !== id) }),
      setHousehold: (p) => set({ household: { ...get().household, ...p } }),
      boostEvent: (eventId) => {
        const s = get();
        if (!s.address) return { ok: false, error: "wallet" };
        if (s.people.find((p) => p.isSelf)?.isMinor) return { ok: false, error: "minor" };
        const ev = s.events.find((e) => e.id === eventId);
        if (!ev) return { ok: false, error: "event" };
        if (ev.boosted) return { ok: true };
        const r = applyTransfer(s.ledger, {
          from: s.address,
          to: fundAddress("ecosystem"),
          amount: tokensToUnits(1n),
          memo: `event-boost:${eventId}`,
          kind: "transfer",
          txId: txIdFor(`boost|${s.address}|${eventId}`),
        });
        if (!r.ok) return { ok: false, error: r.error };
        set({
          ledger: r.ledger,
          events: s.events.map((e) => (e.id === eventId ? { ...e, boosted: true } : e)),
          journal: pushJournal(s, "invite", ev.title),
        });
        void playSound("tx_sent");
        return { ok: true };
      },
      addPot: (title, family) => {
        const t = title.trim();
        if (!t) return;
        const id = uid("pot");
        const required = family ? 2 : 1;
        const pots = [{ id, title: t, createdAt: Date.now(), required }, ...get().pots];
        if (family) {
          const item: FamilyDoc = {
            id: uid("fd"),
            title: t,
            body: `pot:${id}`,
            required: 2,
            signatures: [],
            createdAt: Date.now(),
          };
          set({ pots, familyDocs: [item, ...get().familyDocs] });
        } else {
          set({ pots });
        }
        void playSound("ui_success");
      },
      depositPot: (id, amount) => {
        const s = get();
        if (!s.address) return { ok: false, error: "wallet" };
        if (s.people.find((p) => p.isSelf)?.isMinor) return { ok: false, error: "minor" };
        if (!s.pots.some((p) => p.id === id)) return { ok: false, error: "pot" };
        if (amount <= 0n) return { ok: false, error: "amount" };
        const r = applyTransfer(s.ledger, {
          from: s.address,
          to: potAddress(id),
          amount,
          memo: `pot:in:${id}`,
          kind: "transfer",
          txId: txIdFor(`pot|in|${id}|${s.address}|${amount.toString()}|${Date.now()}`),
        });
        if (!r.ok) return { ok: false, error: r.error };
        set({ ledger: r.ledger, journal: pushJournal(s, "tx") });
        void playSound("tx_sent");
        return { ok: true };
      },
      withdrawPot: (id, amount) => {
        const s = get();
        if (!s.address) return { ok: false, error: "wallet" };
        const pot = s.pots.find((p) => p.id === id);
        if (!pot) return { ok: false, error: "pot" };
        if ((pot.required ?? 1) > 1) {
          const sealed = s.familyDocs.some((d) => d.body === `pot:${id}` && d.hash);
          if (!sealed) return { ok: false, error: "seal" };
        }
        if (amount <= 0n) return { ok: false, error: "amount" };
        const r = applyTransfer(s.ledger, {
          from: potAddress(id),
          to: s.address,
          amount,
          memo: `pot:out:${id}`,
          kind: "transfer",
          txId: txIdFor(`pot|out|${id}|${s.address}|${amount.toString()}|${Date.now()}`),
        });
        if (!r.ok) return { ok: false, error: r.error };
        set({ ledger: r.ledger, journal: pushJournal(s, "tx") });
        void playSound("tx_sent");
        return { ok: true };
      },
      addQard: (to, amount, note) => {
        const s = get();
        if (!s.address) return { ok: false, error: "wallet" };
        if (s.people.find((p) => p.isSelf)?.isMinor) return { ok: false, error: "minor" };
        if (!isSiAddress(to)) return { ok: false, error: "addr" };
        if (amount <= 0n) return { ok: false, error: "amount" };
        const r = applyTransfer(s.ledger, {
          from: s.address,
          to,
          amount,
          memo: "qard-hasan",
          kind: "transfer",
          txId: txIdFor(`qard|${s.address}|${to}|${amount.toString()}|${Date.now()}`),
        });
        if (!r.ok) return { ok: false, error: r.error };
        const item: QardNote = {
          id: uid("qd"),
          to,
          amount: amount.toString(),
          note: note.trim(),
          createdAt: Date.now(),
        };
        set({ ledger: r.ledger, qards: [item, ...s.qards], journal: pushJournal(s, "tx") });
        void playSound("tx_sent");
        return { ok: true };
      },
      repayQard: (id) => {
        const s = get();
        const q = s.qards.find((x) => x.id === id);
        if (!q || q.repaidAt) return { ok: false, error: "qard" };
        set({
          qards: s.qards.map((x) => (x.id === id ? { ...x, repaidAt: Date.now() } : x)),
        });
        return { ok: true };
      },
      fileClaim: (title, body) => {
        const createdAt = Date.now();
        const hash = sha256Hex(`claim|${title}|${body}|${createdAt}`);
        const item: InsuranceClaim = {
          id: uid("cl"),
          title,
          body,
          createdAt,
          hash,
          status: "filed",
        };
        set({ claims: [item, ...get().claims] });
        void playSound("ui_success");
      },
      setRemind: (eventId, on) => {
        const cur = get().reminders;
        const next = on ? Array.from(new Set([...cur, eventId])) : cur.filter((x) => x !== eventId);
        set({ reminders: next });
      },
      setDeskNote: (id, note) => {
        set({ deskNotes: { ...get().deskNotes, [id]: note } });
      },
      addCircleMember: (name, role) => {
        const m: CircleMember = { id: uid("c"), name, role, joinedAt: Date.now() };
        set({ circle: [...get().circle, m] });
        void playSound("invite_accepted");
      },
      setCircleRole: (id, role) => {
        set({ circle: get().circle.map((m) => (m.id === id ? { ...m, role } : m)) });
      },
      removeCircleMember: (id) => set({ circle: get().circle.filter((m) => m.id !== id) }),
      blockContact: (label) => {
        const t = label.trim();
        if (!t) return;
        if (get().blocked.includes(t)) return;
        set({ blocked: [...get().blocked, t] });
      },
      unblockContact: (label) => set({ blocked: get().blocked.filter((b) => b !== label) }),
      exportGedcom: () => toGedcom(get().people, get().edges),
      exportAll: () =>
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            product: "si",
            ...persistable(get() as SiStore),
            vault: undefined,
            mnemonic: undefined,
          },
          null,
          2,
        ),
      restorePublic: (raw) => {
        try {
          const data = JSON.parse(raw) as Partial<SiPublicState> & { product?: string };
          if (data.product && data.product !== "si") return { ok: false };
          const legacyImported = new Set(LEGACY_IMPORT_PERSON_IDS);
          const people = (data.people ?? get().people).filter((p) => !legacyImported.has(p.id));
          set({
            people,
            edges: data.edges ?? get().edges,
            documents: data.documents ?? get().documents,
            events: data.events ?? get().events,
            creds: data.creds ?? get().creds,
            cases: data.cases ?? get().cases,
            familyDocs: data.familyDocs ?? get().familyDocs,
            circle: data.circle ?? get().circle,
            rsvps: data.rsvps ?? get().rsvps,
            grants: data.grants ?? get().grants,
            workshops: data.workshops ?? get().workshops,
            aid: data.aid ?? get().aid,
            incidents: data.incidents ?? get().incidents,
            studyNotes: data.studyNotes ?? get().studyNotes,
            household: data.household ?? get().household,
            pots: data.pots ?? get().pots,
            qards: data.qards ?? get().qards,
            claims: data.claims ?? get().claims,
            deskNotes: data.deskNotes ?? get().deskNotes,
            reminders: data.reminders ?? get().reminders,
          });
          return { ok: true };
        } catch {
          return { ok: false };
        }
      },
      restoreVault: async (raw, password) => {
        try {
          const data = JSON.parse(raw) as unknown;
          if (!isSealedVault(data)) return { ok: false, error: "bad" };
          const plain = await unsealVault(data, password);
          set({
            vault: data,
            address: plain.address,
            session: {
              unlocked: true,
              mnemonic: plain.mnemonic,
              secretKeyHex: plain.secretKeyHex,
              publicKeyHex: plain.publicKeyHex,
            },
          });
          return { ok: true, fingerprint: vaultFingerprint(data) };
        } catch {
          return { ok: false, error: "password" };
        }
      },
      setNetworkEndpoint: (networkEndpoint) => set({ networkEndpoint }),
      tryConnectNetwork: () => {
        const endpoint = get().networkEndpoint.trim();
        if (!endpoint) return { ok: true };
        if (/^si:\/\/net\/[a-z0-9][a-z0-9:/._-]*$/i.test(endpoint)) return { ok: true };
        try {
          const parsed = new URL(endpoint);
          return { ok: parsed.protocol === "https:" || parsed.protocol === "http:" };
        } catch {
          return { ok: false };
        }
      },
      completeOnboarding: () => set({ onboardingComplete: true }),
      wipe: () => {
        set({
          ...initialPublic(),
          vault: null,
          session: emptySession(),
          hydrated: true,
          locale: get().locale,
          theme: get().theme,
        });
      },
      maybeQualify: () => {
        const s = get();
        if (!s.address || !s.referral) return;
        let ledger = s.ledger;
        let referral = s.referral;
        let familyAirdropPaid = s.familyAirdropPaid;

        const parentCount = s.edges.filter(
          (e) => (e.type === "parent" || e.type === "adoptive") && e.to === "self",
        ).length;
        if (!familyAirdropPaid && parentCount >= 2 && !s.people.find((p) => p.isSelf)?.isMinor) {
          const r = applyTransfer(ledger, {
            from: fundAddress("genesisAirdrop"),
            to: s.address,
            amount: tokensToUnits(FAMILY_AIRDROP_TOKENS),
            memo: "verified-family-airdrop",
            kind: "airdrop",
            txId: `airdrop:family:${s.address}`,
          });
          if (r.ok) {
            ledger = r.ledger;
            familyAirdropPaid = true;
            referral = s.referral;
          }
        }

        const sevenDays = Date.now() - (s.people.find((p) => p.isSelf)?.createdAt ?? Date.now()) > 7 * 86400000;
        const qualifies = s.documents.length > 0 || s.rsvps.length > 0 || sevenDays;
        if (qualifies && referral.referredBy && !referral.qualified) {
          const referrer = protocolAddress(`refholder:${referral.referredBy}`);
          const r = applyReferralPayout(ledger, {
            referrer,
            referee: s.address,
          });
          if (r.ok) {
            ledger = r.ledger;
            referral = { ...referral, qualified: true, qualifiedAt: Date.now() };
          }
        }

        if (ledger !== s.ledger || referral !== s.referral || familyAirdropPaid !== s.familyAirdropPaid) {
          const journal =
            familyAirdropPaid && !s.familyAirdropPaid ? pushJournal(s, "airdrop") : s.journal;
          set({ ledger, referral, familyAirdropPaid, journal });
        }
      },
    }),
    {
      name: "si.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => persistable(s as SiStore),
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SiPublicState> & { sampleSeeded?: boolean };
        const locale = isLocale(p.locale) ? p.locale : current.locale;
        const legacyImported = new Set(LEGACY_IMPORT_PERSON_IDS);
        const people = (p.people ?? current.people).filter((x) => !legacyImported.has(x.id));
        const ids = new Set(people.map((x) => x.id));
        const edges = (p.edges ?? current.edges).filter((e) => ids.has(e.from) && ids.has(e.to));
        return {
          ...current,
          ...p,
          locale,
          people,
          edges,
          events: p.events ?? [],
          creds: p.creds ?? [],
          cases: p.cases ?? [],
          familyDocs: p.familyDocs ?? [],
          cryptoProvider: p.cryptoProvider === "hybrid" ? "hybrid" : "classic",
          networkEndpoint: p.networkEndpoint ?? "",
          journal: p.journal ?? [],
          guestCircles: p.guestCircles ?? [],
          lastBackupAt: p.lastBackupAt ?? null,
          idleMinutes: p.idleMinutes === 5 || p.idleMinutes === 30 ? p.idleMinutes : 12,
          grants: p.grants ?? [],
          workshops: p.workshops ?? [],
          aid: p.aid ?? [],
          incidents: p.incidents ?? [],
          studyNotes: p.studyNotes ?? [],
          household: {
            housing: p.household?.housing ?? "",
            travel: p.household?.travel ?? "",
            work: p.household?.work ?? "",
          },
          pots: (p.pots ?? []).map((x) => ({ ...x, required: x.required ?? 1 })),
          qards: p.qards ?? [],
          claims: p.claims ?? [],
          deskNotes: p.deskNotes ?? {},
          reminders: p.reminders ?? [],
        };
      },
    },
  ),
);

function isMinor(birthYear?: number): boolean {
  if (!birthYear) return false;
  return new Date().getFullYear() - birthYear < 18;
}

export function selfPerson(s: SiPublicState): Person | undefined {
  return s.people.find((p) => p.isSelf);
}

export function myBalance(s: SiPublicState): bigint {
  if (!s.address) return 0n;
  return getBalance(s.ledger, s.address);
}

export function myTxs(s: SiPublicState): LedgerTx[] {
  if (!s.address) return [];
  return s.ledger.txs.filter((t) => t.to === s.address || t.from === s.address);
}

export { getBalance, fundAddress };
