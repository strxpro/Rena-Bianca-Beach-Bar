import "server-only";

import { cache } from "react";
import Papa from "papaparse";
import type { AdminReviewRecord, PublicReview, ReplyState, ReviewSource, ReviewStatus } from "@/lib/review-types";

const GOOGLE_REVIEWS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTiVy_c89F9A3WH0hRzSqwDHUMgSuT5-N-bS39K_KvQnpEiwStiVrUoz47YWqp9yjRXLJUPcJyRUHnt/pub?output=csv";

const NAME_FIELDS = ["Nome", "Name", "Guest", "GuestName", "Author", "AuthorName", "Reviewer", "ReviewerName"];
const COMMENT_FIELDS = ["Commento", "Comment", "Review", "Text", "Message", "Opinia"];
const RATING_FIELDS = ["Voto", "Rating", "Stars", "Score"];
const STATUS_FIELDS = ["Stato", "Status", "ReviewStatus", "ModerationStatus", "ApprovalStatus"];
const DATE_FIELDS = ["Data", "Date", "CreatedAt", "Timestamp", "SubmittedAt", "Created At"];
const EMAIL_FIELDS = ["Email", "E-mail", "Mail", "GuestEmail", "CustomerEmail", "AuthorEmail", "ReviewerEmail"];
const TAG_FIELDS = ["Tags", "Tag", "Labels", "Label", "Categories", "Category", "Etykiety"];
const REPLY_FIELDS = ["Reply", "Response", "Risposta", "OwnerReply", "Owner Response", "AdminReply", "ReplyText"];
const REPLY_STATE_FIELDS = ["ReplyState", "Reply Status", "ResponseStatus", "OwnerResponseStatus", "RispostaStatus"];
const COUNTRY_CODE_FIELDS = ["CountryCode", "PaeseCode", "KrajCode", "Country ISO", "ISO", "FlagCode"];
const COUNTRY_NAME_FIELDS = ["Country", "Paese", "Kraj", "Nazione", "Nazionalità", "Origin", "Pochodzenie"];
const AVATAR_FIELDS = [
  "Avatar",
  "AvatarUrl",
  "Avatar URL",
  "Avatar 1",
  "Avatar1",
  "AvatarURL",
  "Avatar Url",
  "ProfilePhoto",
  "Profile Photo",
  "ProfilePhotoUrl",
  "Profile Photo URL",
  "ProfilePicture",
  "Profile Picture",
  "ProfilePictureUrl",
  "Profile Picture URL",
  "ProfileImage",
  "Profile Image",
  "ProfileImageUrl",
  "Profile Image URL",
  "ProfilePic",
  "Profile Pic",
  "ProfilePicUrl",
  "Profile Pic URL",
  "ReviewerAvatar",
  "Reviewer Avatar",
  "ReviewerPhoto",
  "Reviewer Photo",
  "ReviewerPhotoUrl",
  "Reviewer Photo URL",
  "ReviewerProfilePhoto",
  "Reviewer Profile Photo",
  "ReviewerProfilePhotoUrl",
  "Reviewer Profile Photo URL",
  "ReviewerImage",
  "Reviewer Image",
  "AuthorAvatar",
  "Author Avatar",
  "AuthorPhoto",
  "Author Photo",
  "AuthorPhotoUrl",
  "Author Photo URL",
  "AuthorImage",
  "Author Image",
  "UserPhoto",
  "User Photo",
  "UserPhotoUrl",
  "User Photo URL",
  "UserImage",
  "User Image",
  "UserImageUrl",
  "User Image URL",
  "GoogleAvatar",
  "GoogleAvatarUrl",
  "Google Avatar URL",
  "GoogleProfilePhoto",
  "Google Profile Photo",
  "GoogleProfilePhotoUrl",
  "Google Profile Photo URL",
  "Google Photo",
  "GooglePhotoUrl",
  "Google Photo URL",
  "PhotoUrl",
  "Photo URL",
  "FotoProfilowe",
  "ZdjecieProfilowe",
  "ZdjęcieProfilowe",
  "ZdjecieGoogle",
  "ZdjęcieGoogle",
];
const REVIEW_PHOTO_FIELDS = ["Foto1", "Foto", "Photo1", "Photo", "ReviewPhoto", "Review Photo", "ReviewImage", "Foto2", "Foto3", "Photo2", "Photo3"];

type CsvRow = Record<string, string>;
type LoadedReviewRow = {
  source: ReviewSource;
  row: CsvRow;
  index: number;
};

function normalizeFieldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function buildAliasSet(fields: string[]) {
  return new Set(fields.map(normalizeFieldName));
}

const NAME_FIELD_ALIASES = buildAliasSet(NAME_FIELDS);
const COMMENT_FIELD_ALIASES = buildAliasSet(COMMENT_FIELDS);
const RATING_FIELD_ALIASES = buildAliasSet(RATING_FIELDS);
const STATUS_FIELD_ALIASES = buildAliasSet(STATUS_FIELDS);
const DATE_FIELD_ALIASES = buildAliasSet(DATE_FIELDS);
const EMAIL_FIELD_ALIASES = buildAliasSet(EMAIL_FIELDS);
const TAG_FIELD_ALIASES = buildAliasSet(TAG_FIELDS);
const REPLY_FIELD_ALIASES = buildAliasSet(REPLY_FIELDS);
const REPLY_STATE_FIELD_ALIASES = buildAliasSet(REPLY_STATE_FIELDS);
const COUNTRY_CODE_FIELD_ALIASES = buildAliasSet(COUNTRY_CODE_FIELDS);
const COUNTRY_NAME_FIELD_ALIASES = buildAliasSet(COUNTRY_NAME_FIELDS);
const AVATAR_FIELD_ALIASES = buildAliasSet(AVATAR_FIELDS);
const REVIEW_PHOTO_FIELD_ALIASES = buildAliasSet(REVIEW_PHOTO_FIELDS);

function getExactFieldValue(row: CsvRow, fields: string[]) {
  for (const field of fields) {
    const value = (row[field] || "").trim();
    if (value) return value;
  }
  return "";
}

function getAliasedFieldValue(row: CsvRow, aliases: Set<string>) {
  for (const [field, rawValue] of Object.entries(row)) {
    if (!aliases.has(normalizeFieldName(field))) continue;
    const value = (rawValue || "").trim();
    if (value) return value;
  }
  return "";
}

function pickField(row: CsvRow, fields: string[], aliases: Set<string>) {
  return getExactFieldValue(row, fields) || getAliasedFieldValue(row, aliases);
}

function extractImageUrl(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^data:image\//i.test(trimmed)) return trimmed;

    const decoded = trimmed
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;|&#39;/gi, "'")
      .replace(/^["']+|["']+$/g, "")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .trim();

    const imageFormulaMatch = decoded.match(/=image\(\s*["']([^"']+)["']/i);
    if (imageFormulaMatch?.[1]) {
      return imageFormulaMatch[1].trim();
    }

    const hyperlinkMatch = decoded.match(/=hyperlink\(\s*["']([^"']+)["']/i);
    if (hyperlinkMatch?.[1]) {
      return hyperlinkMatch[1].trim();
    }

    const urlMatch = decoded.match(/https?:\/\/[^\s"'()<>]+/i);
    if (urlMatch?.[0]) {
      return urlMatch[0];
    }

    if (decoded.startsWith("//")) {
      return `https:${decoded}`;
    }

    if (/^(?:www\.)?[\w.-]+\.[a-z]{2,}(?:\/[^\s"'()<>]*)?$/i.test(decoded)) {
      return `https://${decoded.replace(/^https?:\/\//i, "")}`;
    }

    if (decoded.startsWith("/") || decoded.startsWith("./") || decoded.startsWith("../")) {
      return decoded;
    }

    if ((decoded.startsWith("{") && decoded.endsWith("}")) || (decoded.startsWith("[") && decoded.endsWith("]"))) {
      try {
        return extractImageUrl(JSON.parse(decoded));
      } catch {
        return "";
      }
    }

    return "";
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = extractImageUrl(entry);
      if (nested) return nested;
    }
    return "";
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const nested = extractImageUrl(entry);
      if (nested) return nested;
    }
  }

  return "";
}

function pickImageField(row: CsvRow, fields: string[], aliases: Set<string>) {
  for (const field of fields) {
    const value = extractImageUrl(row[field] || "");
    if (value) return value;
  }

  for (const [field, rawValue] of Object.entries(row)) {
    if (!aliases.has(normalizeFieldName(field))) continue;
    const value = extractImageUrl(rawValue || "");
    if (value) return value;
  }

  return "";
}

function pickImageFields(row: CsvRow, fields: string[], aliases: Set<string>) {
  const values = new Set<string>();

  for (const field of fields) {
    const value = extractImageUrl(row[field] || "");
    if (value) values.add(value);
  }

  for (const [field, rawValue] of Object.entries(row)) {
    if (!aliases.has(normalizeFieldName(field))) continue;
    const value = extractImageUrl(rawValue || "");
    if (value) values.add(value);
  }

  return Array.from(values);
}

function getRatingValue(value: string) {
  const normalized = (value || "").toUpperCase().trim();
  if (!normalized) return 5;

  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };

  if (map[normalized]) {
    return map[normalized];
  }

  const parsed = Number.parseFloat(normalized.replace(",", "."));
  if (Number.isFinite(parsed)) {
    return Math.max(1, Math.min(5, parsed));
  }

  return 5;
}

function normalizeCountryCode(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function getCountryNameFromCode(countryCode: string) {
  if (!countryCode) return "";
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

function getCountryData(row: CsvRow) {
  const countryCode = normalizeCountryCode(pickField(row, COUNTRY_CODE_FIELDS, COUNTRY_CODE_FIELD_ALIASES));
  const countryName = pickField(row, COUNTRY_NAME_FIELDS, COUNTRY_NAME_FIELD_ALIASES) || getCountryNameFromCode(countryCode);

  return {
    countryCode: countryCode || undefined,
    countryName: countryName || undefined,
  };
}

function getReviewAuthor(row: CsvRow) {
  return pickField(row, NAME_FIELDS, NAME_FIELD_ALIASES) || "Gość";
}

function getReviewComment(row: CsvRow) {
  return pickField(row, COMMENT_FIELDS, COMMENT_FIELD_ALIASES);
}

function getReviewDate(row: CsvRow) {
  return pickField(row, DATE_FIELDS, DATE_FIELD_ALIASES) || new Date().toISOString().split("T")[0];
}

function getReviewAvatar(row: CsvRow) {
  return pickImageField(row, AVATAR_FIELDS, AVATAR_FIELD_ALIASES);
}

function getReviewPhotos(row: CsvRow) {
  return pickImageFields(row, REVIEW_PHOTO_FIELDS, REVIEW_PHOTO_FIELD_ALIASES);
}

function getReviewEmail(row: CsvRow) {
  return pickField(row, EMAIL_FIELDS, EMAIL_FIELD_ALIASES);
}

function getReviewTags(row: CsvRow) {
  const raw = pickField(row, TAG_FIELDS, TAG_FIELD_ALIASES);
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/[\n,;|]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function getSheetStatus(row: CsvRow) {
  return pickField(row, STATUS_FIELDS, STATUS_FIELD_ALIASES);
}

function mapReviewStatus(rawStatus: string, source: ReviewSource): ReviewStatus {
  const normalized = normalizeToken(rawStatus);
  if (!normalized) {
    return source === "google" ? "visible" : "flagged";
  }

  if (
    normalized.includes("accepted") ||
    normalized.includes("accettato") ||
    normalized.includes("approved") ||
    normalized.includes("published") ||
    normalized.includes("visible") ||
    normalized.includes("live")
  ) {
    return "visible";
  }

  if (
    normalized.includes("hidden") ||
    normalized.includes("nascosto") ||
    normalized.includes("rejected") ||
    normalized.includes("reject") ||
    normalized.includes("spam") ||
    normalized.includes("blocked") ||
    normalized.includes("archived")
  ) {
    return "hidden";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("pendente") ||
    normalized.includes("review") ||
    normalized.includes("moderation") ||
    normalized.includes("draft") ||
    normalized.includes("flagged")
  ) {
    return "flagged";
  }

  return source === "google" ? "visible" : "flagged";
}

function getReplyState(row: CsvRow, source: ReviewSource): ReplyState {
  const explicitState = normalizeToken(pickField(row, REPLY_STATE_FIELDS, REPLY_STATE_FIELD_ALIASES));
  if (explicitState) {
    if (
      explicitState.includes("replied") ||
      explicitState.includes("sent") ||
      explicitState.includes("done") ||
      explicitState.includes("answered") ||
      explicitState.includes("risposto")
    ) {
      return "replied";
    }

    return "pending";
  }

  const replyText = pickField(row, REPLY_FIELDS, REPLY_FIELD_ALIASES);
  if (replyText) {
    return "replied";
  }

  return source === "google" ? "replied" : "pending";
}

function hasReviewContent(row: CsvRow) {
  return Boolean(getReviewAuthor(row) || getReviewComment(row));
}

function isVisibleOnSite(row: CsvRow, source: ReviewSource) {
  const rawStatus = getSheetStatus(row);
  if (!rawStatus) {
    return source === "google";
  }
  return mapReviewStatus(rawStatus, source) === "visible";
}

function getDateTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function createReviewId(source: ReviewSource, index: number, author: string, date: string, comment: string) {
  const compact = (value: string) =>
    normalizeToken(value)
      .replace(/\s+/g, "-")
      .slice(0, 48);

  return [source, index, compact(author), compact(date), compact(comment)].filter(Boolean).join("__");
}

const loadReviewRows = cache(async (): Promise<LoadedReviewRow[]> => {
  const localCsvUrl = process.env.NEXT_PUBLIC_LOCAL_CSV || "";
  const sources: Array<{ source: ReviewSource; url: string }> = [{ source: "google", url: GOOGLE_REVIEWS_CSV_URL }];

  if (localCsvUrl) {
    sources.push({ source: "local", url: localCsvUrl });
  }

  const datasets = await Promise.all(
    sources.map(async ({ source, url }) => {
      try {
        const response = await fetch(url, { next: { revalidate: 3600 } });
        if (!response.ok) {
          return [] as LoadedReviewRow[];
        }

        const csvContent = await response.text();
        const parsed = Papa.parse<CsvRow>(csvContent, { header: true, skipEmptyLines: true });
        return (parsed.data as CsvRow[])
          .filter((row) => row && typeof row === "object" && hasReviewContent(row))
          .map((row, index) => ({ source, row, index }));
      } catch {
        return [] as LoadedReviewRow[];
      }
    }),
  );

  return datasets.flat();
});

async function loadReviewRowsFresh(): Promise<LoadedReviewRow[]> {
  const localCsvUrl = process.env.NEXT_PUBLIC_LOCAL_CSV || "";
  const sources: Array<{ source: ReviewSource; url: string }> = [{ source: "google", url: GOOGLE_REVIEWS_CSV_URL }];

  if (localCsvUrl) {
    sources.push({ source: "local", url: localCsvUrl });
  }

  const datasets = await Promise.all(
    sources.map(async ({ source, url }) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          return [] as LoadedReviewRow[];
        }

        const csvContent = await response.text();
        const parsed = Papa.parse<CsvRow>(csvContent, { header: true, skipEmptyLines: true });
        return (parsed.data as CsvRow[])
          .filter((row) => row && typeof row === "object" && hasReviewContent(row))
          .map((row, index) => ({ source, row, index }));
      } catch {
        return [] as LoadedReviewRow[];
      }
    }),
  );

  return datasets.flat();
}

export async function loadPublicReviews(): Promise<PublicReview[]> {
  const rows = await loadReviewRows();

  return rows
    .filter(({ row, source }) => isVisibleOnSite(row, source))
    .map(({ row, source }) => {
      const country = getCountryData(row);
      const avatar = getReviewAvatar(row);
      const photos = getReviewPhotos(row);

      return {
        name: getReviewAuthor(row),
        role: "Gość",
        date: getReviewDate(row),
        text: getReviewComment(row),
        rating: getRatingValue(pickField(row, RATING_FIELDS, RATING_FIELD_ALIASES)),
        photo: source === "local" ? avatar || photos[0] || "" : avatar || "",
        isLocal: source === "local",
        countryCode: country.countryCode,
        countryName: country.countryName,
      } satisfies PublicReview;
    })
    .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date));
}

export async function loadAdminReviews(): Promise<AdminReviewRecord[]> {
  const rows = await loadReviewRows();

  return rows
    .map(({ row, source, index }) => {
      const author = getReviewAuthor(row);
      const comment = getReviewComment(row);
      const date = getReviewDate(row);
      const country = getCountryData(row);
      const rawStatus = getSheetStatus(row);
      const photos = getReviewPhotos(row);
      const avatar = getReviewAvatar(row);

      return {
        id: createReviewId(source, index, author, date, comment),
        author,
        email: getReviewEmail(row),
        country: country.countryName || "",
        countryCode: country.countryCode,
        rating: getRatingValue(pickField(row, RATING_FIELDS, RATING_FIELD_ALIASES)),
        source,
        status: mapReviewStatus(rawStatus, source),
        sheetStatus: rawStatus || (source === "google" ? "Accepted" : "Pending"),
        replyState: getReplyState(row, source),
        date,
        comment,
        tags: getReviewTags(row),
        avatar: avatar || undefined,
        photos,
      } satisfies AdminReviewRecord;
    })
    .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date));
}

export async function loadAdminReviewsFresh(): Promise<AdminReviewRecord[]> {
  const rows = await loadReviewRowsFresh();

  return rows
    .map(({ row, source, index }) => {
      const author = getReviewAuthor(row);
      const comment = getReviewComment(row);
      const date = getReviewDate(row);
      const country = getCountryData(row);
      const rawStatus = getSheetStatus(row);
      const photos = getReviewPhotos(row);
      const avatar = getReviewAvatar(row);

      return {
        id: createReviewId(source, index, author, date, comment),
        author,
        email: getReviewEmail(row),
        country: country.countryName || "",
        countryCode: country.countryCode,
        rating: getRatingValue(pickField(row, RATING_FIELDS, RATING_FIELD_ALIASES)),
        source,
        status: mapReviewStatus(rawStatus, source),
        sheetStatus: rawStatus || (source === "google" ? "Accepted" : "Pending"),
        replyState: getReplyState(row, source),
        date,
        comment,
        tags: getReviewTags(row),
        avatar: avatar || undefined,
        photos,
      } satisfies AdminReviewRecord;
    })
    .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date));
}
