import Papa from "papaparse";
import TestimonialsClient, { Review } from "./TestimonialsClient";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTiVy_c89F9A3WH0hRzSqwDHUMgSuT5-N-bS39K_KvQnpEiwStiVrUoz47YWqp9yjRXLJUPcJyRUHnt/pub?output=csv";
const COUNTRY_CODE_FIELDS = ["CountryCode", "PaeseCode", "KrajCode", "Country ISO", "ISO", "FlagCode"];
const COUNTRY_NAME_FIELDS = ["Country", "Paese", "Kraj", "Nazione", "Nazionalità", "Origin", "Pochodzenie"];

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

function getReviewPhoto(row: Record<string, string>) {
  return row["Foto"]
    || row["Foto1"]
    || row["Avatar"]
    || "";
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
          return {
            name: row["Nome"] || "Gość",
            role: "Gość",
            date: row["Data"] || new Date().toISOString().split("T")[0],
            text: row["Commento"] || "",
            rating: getRatingValue(row["Voto"]),
            photo: getReviewPhoto(row),
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
          return {
            name: row["Nome"] || "Gość",
            role: "Gość",
            date: row["Data"] || new Date().toISOString().split("T")[0],
            text: row["Commento"] || "",
            rating: getRatingValue(row["Voto"]),
            photo: getReviewPhoto(row),
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
