import "server-only";

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { unstable_noStore as noStore } from "next/cache";
import { mockMessageThreads, type ChatMessage, type MessageThread } from "@/lib/admin-mock-data";

const MESSAGES_STORAGE_PATH = path.join(process.cwd(), "src", "data", "messages.json");
const MESSAGE_SOURCE_URL =
  process.env.ADMIN_MESSAGES_ENDPOINT_URL ||
  process.env.GOOGLE_SHEETS_CONTACT_URL ||
  process.env.GOOGLE_SHEETS_MESSAGES_URL ||
  process.env.CONTACT_SHEET_URL ||
  "";

const NAME_FIELDS = ["Nome", "Name", "Full Name", "Guest", "GuestName"];
const EMAIL_FIELDS = ["Email", "E-mail", "Mail"];
const PHONE_FIELDS = ["Numero", "Numero di telefono", "Telefono", "Phone", "PhoneNumber", "Phone Number"];
const MESSAGE_FIELDS = ["Messaggio", "Message", "Commento", "Comment", "Body", "Content"];
const COUNTRY_FIELDS = ["Paese", "Country", "Location", "Città", "City"];
const DATE_FIELDS = ["Data", "Date", "CreatedAt", "Timestamp", "SubmittedAt"];
const SOURCE_FIELDS = ["Fonte", "Source", "Canale", "Channel", "Origin"];

type SheetRow = Record<string, unknown>;

type JsonEnvelope = {
  data?: unknown;
  rows?: unknown;
  items?: unknown;
  values?: unknown;
  results?: unknown;
};

function normalizeFieldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function pickField(row: SheetRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const aliases = new Set(fields.map(normalizeFieldName));
  for (const [field, value] of Object.entries(row)) {
    if (!aliases.has(normalizeFieldName(field))) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function parseJsonRows(payload: unknown): SheetRow[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry): entry is SheetRow => !!entry && typeof entry === "object");
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const envelope = payload as JsonEnvelope;
  return (
    parseJsonRows(envelope.data) ||
    parseJsonRows(envelope.rows) ||
    parseJsonRows(envelope.items) ||
    parseJsonRows(envelope.values) ||
    parseJsonRows(envelope.results)
  );
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return new Date().toISOString();

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const europeanMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (europeanMatch) {
    const [, day, month, year, hour = "12", minute = "00"] = europeanMatch;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    const parsed = new Date(`${normalizedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function deriveChannel(sourceLabel: string): MessageThread["channel"] {
  const normalized = normalizeFieldName(sourceLabel);
  if (normalized.includes("instagram") || normalized.includes("dm")) return "instagram_dm";
  if (normalized.includes("prenot") || normalized.includes("reservation") || normalized.includes("booking")) return "reservation";
  return "contact_form";
}

function deriveSubject(message: string, sourceLabel: string) {
  const compactMessage = compactText(message);
  if (compactMessage.length > 0) {
    return compactMessage.length > 68 ? `${compactMessage.slice(0, 68)}…` : compactMessage;
  }

  const normalizedSource = normalizeFieldName(sourceLabel);
  if (normalizedSource.includes("prenot") || normalizedSource.includes("reservation")) {
    return "Richiesta di prenotazione";
  }

  if (normalizedSource.includes("instagram") || normalizedSource.includes("dm")) {
    return "Messaggio da Instagram";
  }

  return "Messaggio dal modulo contatto";
}

function createThreadId(row: SheetRow) {
  const payload = [
    pickField(row, NAME_FIELDS),
    pickField(row, EMAIL_FIELDS),
    pickField(row, PHONE_FIELDS),
    pickField(row, DATE_FIELDS),
    pickField(row, MESSAGE_FIELDS),
    pickField(row, SOURCE_FIELDS),
  ].join("|");

  return `contact-${createHash("sha1").update(payload).digest("hex").slice(0, 14)}`;
}

function createClientMessage(threadId: string, message: string, timestamp: string): ChatMessage {
  return {
    id: `${threadId}-client`,
    sender: "client",
    content: message || "—",
    timestamp,
  };
}

function mapRowToThread(row: SheetRow): MessageThread | null {
  const name = pickField(row, NAME_FIELDS) || "Ospite";
  const email = pickField(row, EMAIL_FIELDS);
  const phone = pickField(row, PHONE_FIELDS);
  const message = pickField(row, MESSAGE_FIELDS);
  const country = pickField(row, COUNTRY_FIELDS);
  const sourceLabel = pickField(row, SOURCE_FIELDS) || "Modulo contatto";
  const updatedAt = parseDateInput(pickField(row, DATE_FIELDS));

  if (!name && !email && !message) {
    return null;
  }

  const id = createThreadId(row);

  return {
    id,
    name,
    email,
    phone,
    subject: deriveSubject(message, sourceLabel),
    channel: deriveChannel(sourceLabel),
    status: "new",
    unreadCount: 1,
    updatedAt,
    location: country,
    sourceLabel,
    messages: [createClientMessage(id, message, updatedAt)],
  };
}

function sortThreads(threads: MessageThread[]) {
  return [...threads].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function readStoredAdminMessages() {
  try {
    const raw = fs.readFileSync(MESSAGES_STORAGE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MessageThread[]) : [];
  } catch {
    return [] as MessageThread[];
  }
}

function writeStoredAdminMessages(threads: MessageThread[]) {
  fs.mkdirSync(path.dirname(MESSAGES_STORAGE_PATH), { recursive: true });
  fs.writeFileSync(MESSAGES_STORAGE_PATH, JSON.stringify(sortThreads(threads), null, 2), "utf-8");
}

function mergeMessages(baseMessages: ChatMessage[], storedMessages: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  [...baseMessages, ...storedMessages].forEach((message) => {
    map.set(message.id, message);
  });

  return [...map.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function mergeThreads(baseThreads: MessageThread[], storedThreads: MessageThread[]) {
  const storedMap = new Map(storedThreads.map((thread) => [thread.id, thread]));

  const merged = baseThreads.map((thread) => {
    const stored = storedMap.get(thread.id);
    if (!stored) return thread;

    const updatedAt =
      Date.parse(stored.updatedAt || thread.updatedAt) > Date.parse(thread.updatedAt)
        ? stored.updatedAt
        : thread.updatedAt;

    return {
      ...thread,
      phone: stored.phone || thread.phone,
      sourceLabel: stored.sourceLabel || thread.sourceLabel,
      status: stored.status || thread.status,
      unreadCount: stored.unreadCount ?? thread.unreadCount,
      updatedAt,
      messages: mergeMessages(thread.messages, stored.messages ?? []),
    } satisfies MessageThread;
  });

  const baseIds = new Set(baseThreads.map((thread) => thread.id));
  const localOnly = storedThreads.filter((thread) => !baseIds.has(thread.id));

  return sortThreads([...merged, ...localOnly]);
}

async function fetchRemoteMessageRows() {
  if (!MESSAGE_SOURCE_URL) return [] as SheetRow[];

  const response = await fetch(MESSAGE_SOURCE_URL, {
    cache: "no-store",
    headers: { Accept: "application/json,text/csv,*/*" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load admin messages: ${response.status}`);
  }

  const raw = await response.text();
  if (!raw.trim()) return [] as SheetRow[];

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json") || raw.trim().startsWith("[") || raw.trim().startsWith("{")) {
    return parseJsonRows(JSON.parse(raw));
  }

  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (value) => value.trim(),
  });

  return parsed.data as SheetRow[];
}

export async function loadAdminMessages() {
  noStore();

  const storedThreads = readStoredAdminMessages();

  try {
    const rows = await fetchRemoteMessageRows();
    const remoteThreads = rows
      .map((row) => mapRowToThread(row))
      .filter((thread): thread is MessageThread => thread !== null);

    if (remoteThreads.length > 0) {
      return mergeThreads(remoteThreads, storedThreads);
    }
  } catch {
    // fallback below
  }

  if (storedThreads.length > 0) {
    return sortThreads(storedThreads);
  }

  return sortThreads(mockMessageThreads);
}

export function upsertStoredAdminMessage(thread: MessageThread) {
  const current = readStoredAdminMessages();
  const index = current.findIndex((entry) => entry.id === thread.id);

  if (index === -1) {
    current.push(thread);
  } else {
    current[index] = thread;
  }

  writeStoredAdminMessages(current);
}

export function readAdminMessageStorage() {
  return readStoredAdminMessages();
}
