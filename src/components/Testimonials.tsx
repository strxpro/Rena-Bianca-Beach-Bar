import Papa from "papaparse";
import TestimonialsClient, { Review } from "./TestimonialsClient";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTiVy_c89F9A3WH0hRzSqwDHUMgSuT5-N-bS39K_KvQnpEiwStiVrUoz47YWqp9yjRXLJUPcJyRUHnt/pub?output=csv";
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

function normalizeFieldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

const AVATAR_FIELD_ALIASES = new Set(AVATAR_FIELDS.map(normalizeFieldName));
const REVIEW_PHOTO_FIELD_ALIASES = new Set(REVIEW_PHOTO_FIELDS.map(normalizeFieldName));

function extractImageUrl(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^data:image\//i.test(trimmed)) return trimmed;

    const decoded = trimmed
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;|&#39;/gi, "'")
      .replace(/^['\"]+|['\"]+$/g, "")
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

    if (
      (decoded.startsWith("{") && decoded.endsWith("}")) ||
      (decoded.startsWith("[") && decoded.endsWith("]"))
    ) {
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

function normalizeImageValue(value: string) {
  return extractImageUrl(value);
}

function getRatingValue(voto: string): number {
  const v = (voto || "").toUpperCase().trim();
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[v] || 5;
}

function pickField(row: Record<string, string>, fields: string[]) {
  for (const field of fields) {
    const value = (row[field] || "").trim();
    if (value) return value;
  }
  return "";
}

function pickImageField(row: Record<string, string>, fields: string[], aliases: Set<string>) {
  for (const field of fields) {
    const value = normalizeImageValue(row[field] || "");
    if (value) return value;
  }

  for (const [field, rawValue] of Object.entries(row)) {
    if (!aliases.has(normalizeFieldName(field))) continue;
    const value = normalizeImageValue(rawValue || "");
    if (value) return value;
  }

  return "";
}

function normalizeCountryCode(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function getCountryData(row: Record<string, string>) {
  const countryCode = normalizeCountryCode(pickField(row, COUNTRY_CODE_FIELDS));
  const countryName = pickField(row, COUNTRY_NAME_FIELDS);

  return {
    countryCode: countryCode || undefined,
    countryName: countryName || undefined,
  };
}

function getReviewAvatar(row: Record<string, string>) {
  return pickImageField(row, AVATAR_FIELDS, AVATAR_FIELD_ALIASES);
}

function pickImageFields(row: Record<string, string>, fields: string[], aliases: Set<string>) {
  const values = new Set<string>();
  for (const field of fields) {
    const value = normalizeImageValue(row[field] || "");
    if (value) values.add(value);
  }
  for (const [field, rawValue] of Object.entries(row)) {
    if (!aliases.has(normalizeFieldName(field))) continue;
    const value = normalizeImageValue(rawValue || "");
    if (value) values.add(value);
  }
  return Array.from(values);
}

function getReviewPhotos(row: Record<string, string>) {
  return pickImageFields(row, REVIEW_PHOTO_FIELDS, REVIEW_PHOTO_FIELD_ALIASES);
}

function getLocalReviewPhoto(row: Record<string, string>) {
  return pickImageField(row, REVIEW_PHOTO_FIELDS, REVIEW_PHOTO_FIELD_ALIASES);
}

export default async function Testimonials() {
  let reviews: Review[] = [];

  try {
    const LOCAL_CSV_URL = process.env.NEXT_PUBLIC_LOCAL_CSV || "";

    const fetchOps = [fetch(CSV_URL, { next: { revalidate: 3600 } }).catch(() => null)];
    if (LOCAL_CSV_URL) {
      fetchOps.push(fetch(LOCAL_CSV_URL, { next: { revalidate: 3600 } }).catch(() => null));
    }

    const responses = await Promise.all(fetchOps);
    
    const [googleRes, localRes] = responses;

    type CsvRow = Record<string, string>;
    let combinedValidRows: Review[] = [];

    if (googleRes && googleRes.ok) {
      const csvContent = await googleRes.text();
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      const validRows = (parsed.data as CsvRow[])
        .filter((row) => (row["Stato"] || "").trim().toLowerCase() === "accettato")
        .map((row) => {
          const country = getCountryData(row);
          const avatar = getReviewAvatar(row);
          const photos = getReviewPhotos(row);
          return {
            name: row["Nome"] || "Gość",
            role: "Gość",
            date: row["Data"] || new Date().toISOString().split("T")[0],
            text: row["Commento"] || "",
            rating: getRatingValue(row["Voto"]),
            photo: avatar || "",
            photos: photos.length > 0 ? photos : undefined,
            isLocal: false,
            countryCode: country.countryCode,
            countryName: country.countryName,
          };
        });
      combinedValidRows = combinedValidRows.concat(validRows);
    }

    if (localRes && localRes.ok) {
      const localCsvContent = await localRes.text();
      const parsed = Papa.parse(localCsvContent, { header: true, skipEmptyLines: true });
      const localValidRows = (parsed.data as CsvRow[])
        .filter((row) => (row["Stato"] || "").trim().toLowerCase() === "accettato")
        .map((row) => {
          const country = getCountryData(row);
          const avatar = getReviewAvatar(row);
          const photos = getReviewPhotos(row);
          return {
            name: row["Nome"] || "Gość",
            role: "Gość",
            date: row["Data"] || new Date().toISOString().split("T")[0],
            text: row["Commento"] || "",
            rating: getRatingValue(row["Voto"]),
            photo: avatar || getLocalReviewPhoto(row) || "",
            photos: photos.length > 0 ? photos : undefined,
            isLocal: true,
            countryCode: country.countryCode,
            countryName: country.countryName,
          };
        });
      combinedValidRows = combinedValidRows.concat(localValidRows);
    }

    combinedValidRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    reviews = combinedValidRows;

  } catch (error) {
    console.error("Error fetching dynamic testimonials:", error);
    reviews = [];
  }

  return <TestimonialsClient initialReviews={reviews} />;
}
