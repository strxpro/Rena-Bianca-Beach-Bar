import Papa from "papaparse";
import TestimonialsClient, { Review } from "./TestimonialsClient";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTiVy_c89F9A3WH0hRzSqwDHUMgSuT5-N-bS39K_KvQnpEiwStiVrUoz47YWqp9yjRXLJUPcJyRUHnt/pub?output=csv";

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

export default async function Testimonials() {
  let reviews: Review[] = [];

  try {
    const LOCAL_CSV_URL = process.env.NEXT_PUBLIC_LOCAL_CSV || "";

    const fetchOps = [fetch(CSV_URL, { next: { revalidate: 3600 } }).catch(e => null)];
    if (LOCAL_CSV_URL) {
      fetchOps.push(fetch(LOCAL_CSV_URL, { next: { revalidate: 3600 } }).catch(e => null));
    }

    const responses = await Promise.all(fetchOps);
    
    const [googleRes, localRes] = responses;

    let combinedValidRows: any[] = [];

    if (googleRes && googleRes.ok) {
      const csvContent = await googleRes.text();
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      const validRows = parsed.data
        .filter((row: any) => (row["Stato"] || "").trim().toLowerCase() === "accettato")
        .map((row: any) => ({
          name: row["Nome"] || "Gość",
          role: "Gość",
          date: row["Data"] || new Date().toISOString().split("T")[0],
          text: row["Commento"] || "",
          rating: getRatingValue(row["Voto"]),
          photo: row["Foto"] || row["Avatar"] || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80",
          isLocal: false
        }));
      combinedValidRows = combinedValidRows.concat(validRows);
    }

    if (localRes && localRes.ok) {
      const localCsvContent = await localRes.text();
      const parsed = Papa.parse(localCsvContent, { header: true, skipEmptyLines: true });
      const localValidRows = parsed.data
        .filter((row: any) => (row["Stato"] || "").trim().toLowerCase() === "accettato")
        .map((row: any) => ({
          name: row["Nome"] || "Gość",
          role: "Gość",
          date: row["Data"] || new Date().toISOString().split("T")[0],
          text: row["Commento"] || "",
          rating: getRatingValue(row["Voto"]),
          photo: row["Foto"] || row["Avatar"] || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80",
          isLocal: true
        }));
      combinedValidRows = combinedValidRows.concat(localValidRows);
    }

    // Sort the combined array perfectly by date descending (newest first)
    combinedValidRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Tier 1 (Top): The most recent reviews (latest 4 based on date)
    const tier1 = combinedValidRows.slice(0, 4);
    
    // Remaining reviews to be processed for Tier 2 and Tier 3
    const remaining = combinedValidRows.slice(4);

    // Tier 2 (Middle): Reviews with a 5-star rating (excluding those already in Tier 1)
    const tier2 = remaining.filter((r) => r.rating === 5);

    // Tier 3 (Bottom): Remaining reviews sorted by date (oldest at the very bottom)
    const tier3 = remaining.filter((r) => r.rating < 5); 

    reviews = [...tier1, ...tier2, ...tier3];

  } catch (error) {
    console.error("Error fetching dynamic testimonials:", error);
    reviews = [];
  }

  return <TestimonialsClient initialReviews={reviews} />;
}
