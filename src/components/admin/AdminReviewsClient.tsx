"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Globe2, Mail, Search, ShieldAlert, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminReviewRecord, ReviewSource, ReviewStatus } from "@/lib/review-types";

const statusOptions: Array<ReviewStatus | "all"> = ["all", "visible", "hidden", "flagged"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusBadge(status: ReviewStatus) {
  if (status === "visible") return "success" as const;
  if (status === "hidden") return "secondary" as const;
  return "warning" as const;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminReviewsClient({ initialReviews }: { initialReviews: AdminReviewRecord[] }) {
  const searchParams = useSearchParams();
  const source = (searchParams.get("source") as ReviewSource | null) ?? "all";
  const [reviews, setReviews] = useState(initialReviews);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");
  const [selectedId, setSelectedId] = useState(initialReviews[0]?.id ?? "");

  const filteredReviews = useMemo(() => {
    const searchNeedle = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const sourceMatch = source === "all" ? true : review.source === source;
      const statusMatch = statusFilter === "all" ? true : review.status === statusFilter;
      const searchMatch =
        searchNeedle.length === 0
          ? true
          : [review.author, review.email, review.comment, review.country, review.sheetStatus, review.tags.join(" ")]
              .join(" ")
              .toLowerCase()
              .includes(searchNeedle);

      return sourceMatch && statusMatch && searchMatch;
    });
  }, [reviews, search, source, statusFilter]);

  const selectedReview = useMemo(() => {
    if (filteredReviews.length === 0) {
      return null;
    }

    return filteredReviews.find((review) => review.id === selectedId) ?? filteredReviews[0];
  }, [filteredReviews, selectedId]);

  useEffect(() => {
    if (!selectedReview) {
      setSelectedId("");
      return;
    }

    setSelectedId(selectedReview.id);
  }, [selectedReview]);

  const summary = useMemo(() => {
    const visible = reviews.filter((review) => review.status === "visible").length;
    const flagged = reviews.filter((review) => review.status !== "visible").length;
    const local = reviews.filter((review) => review.source === "local").length;
    return { total: reviews.length, visible, flagged, local };
  }, [reviews]);

  const updateSelectedReview = (updater: (current: AdminReviewRecord) => AdminReviewRecord | null) => {
    setReviews((current) =>
      current.flatMap((row) => {
        if (row.id !== selectedId) return [row];
        const updated = updater(row);
        return updated ? [updated] : [];
      }),
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Tutte le recensioni", value: summary.total, icon: Star },
            { label: "Visibili sul sito", value: summary.visible, icon: Globe2 },
            { label: "Da moderare", value: summary.flagged, icon: ShieldAlert },
            { label: "Origine locale", value: summary.local, icon: Filter },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ocean-light">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-body text-[11px] uppercase tracking-[0.18em] text-sand/35">{item.label}</p>
                    <p className="mt-1 font-heading text-4xl text-sand">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge variant="outline">Feed live Google Sheets</Badge>
                <CardTitle className="mt-3 text-2xl">Tabella recensioni</CardTitle>
                <CardDescription>
                  Righe reali dai fogli pubblicati. Cerca gli ospiti, filtra per origine o stato moderazione e apri il dettaglio completo.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "google", "local"] as const).map((item) => (
                  <Badge
                    key={item}
                    variant={source === item ? "default" : "secondary"}
                    className="px-4 py-2 text-[10px] tracking-[0.16em]"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sand/35" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-11"
                  placeholder="Cerca per ospite, email, paese, stato o testo recensione..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-4 py-2 font-body text-xs uppercase tracking-[0.16em] transition ${statusFilter === status ? "border-ocean/30 bg-ocean/12 text-sand" : "border-white/10 bg-white/4 text-sand/55 hover:border-white/15 hover:text-sand"}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="max-h-[620px] rounded-[24px] border border-white/8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ospite</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Voto</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[320px]">Commento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                      <TableRow
                        key={review.id}
                        className={selectedReview?.id === review.id ? "bg-white/4" : "cursor-pointer"}
                        onClick={() => setSelectedId(review.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sand">{review.author}</p>
                            <p className="text-xs text-sand/45">{review.email || "Nessuna email nel foglio"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={review.source === "google" ? "default" : "secondary"}>{review.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-amber-200">
                            <Star className="h-4 w-4 fill-current" />
                            <span>{review.rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Badge variant={getStatusBadge(review.status)}>{review.status}</Badge>
                            <p className="text-xs text-sand/40">{review.sheetStatus}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{formatDate(review.date)}</p>
                            <p className="text-xs text-sand/45">{review.country || "Nessun paese"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-2 max-w-[320px] text-sm leading-6 text-sand/65">{review.comment || "Nessun testo commento"}</p>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="px-4 py-8 text-center text-sm text-sand/50">Nessuna recensione corrisponde ai filtri correnti.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-[180px]">
        <CardHeader>
          <Badge variant="secondary">Dettaglio recensione</Badge>
          <CardTitle className="mt-3 text-2xl">Recensione selezionata</CardTitle>
          <CardDescription>
            Gestisci rapidamente la recensione con azioni locali di moderazione: modifica testo, nascondi o elimina.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedReview ? (
            <>
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <div className="flex items-start gap-4">
                  {selectedReview.avatar ? (
                    <img
                      src={selectedReview.avatar}
                      alt={selectedReview.author}
                      className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-ocean/15 font-body text-sm font-semibold text-sand">
                      {getInitials(selectedReview.author)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-body text-lg font-semibold text-sand">{selectedReview.author}</p>
                      <Badge variant={selectedReview.source === "google" ? "default" : "secondary"}>{selectedReview.source}</Badge>
                      <Badge variant={getStatusBadge(selectedReview.status)}>{selectedReview.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-sand/45">{selectedReview.email || "Nessuna email disponibile"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-sand/35">Stato foglio: {selectedReview.sheetStatus}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => {
                    const next = window.prompt("Modifica commento", selectedReview.comment || "");
                    if (next === null) return;
                    updateSelectedReview((current) => ({ ...current, comment: next.trim() }));
                  }}
                >
                  Modifica
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => updateSelectedReview((current) => ({ ...current, status: current.status === "hidden" ? "visible" : "hidden" }))}
                >
                  {selectedReview.status === "hidden" ? "Mostra" : "Nascondi"}
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  onClick={() => {
                    if (!window.confirm("Eliminare questa recensione dalla lista admin?")) return;
                    updateSelectedReview(() => null);
                  }}
                >
                  Elimina
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sand/35">Voto</p>
                  <p className="mt-2 font-heading text-3xl text-sand">{selectedReview.rating.toFixed(1)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sand/35">Stato risposta</p>
                  <p className="mt-2 font-body text-base text-sand">{selectedReview.replyState}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sand/35">Paese</p>
                  <p className="mt-2 font-body text-base text-sand">{selectedReview.country || "Nessun paese"}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sand/35">Data</p>
                  <p className="mt-2 font-body text-base text-sand">{formatDate(selectedReview.date)}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <div className="flex items-center gap-2 text-sand/70">
                  <Mail className="h-4 w-4 text-ocean-light" />
                  <span className="font-body text-sm">{selectedReview.email || "Nessun campo email in questa riga"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-body text-[11px] uppercase tracking-[0.18em] text-sand/35">Commento</p>
                <div className="rounded-[24px] border border-white/8 bg-white/4 p-4 text-sm leading-7 text-sand/70">
                  {selectedReview.comment || "Nessun testo commento in questa riga."}
                </div>
              </div>

              {selectedReview.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="font-body text-[11px] uppercase tracking-[0.18em] text-sand/35">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReview.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedReview.photos.length > 0 && (
                <div className="space-y-2">
                  <p className="font-body text-[11px] uppercase tracking-[0.18em] text-sand/35">Foto allegate</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedReview.photos.map((photo, index) => (
                      <img
                        key={`${selectedReview.id}-photo-${index}`}
                        src={photo}
                        alt={`${selectedReview.author} photo ${index + 1}`}
                        className="aspect-square w-full rounded-2xl border border-white/10 object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 p-6 text-sm text-sand/50">
              Nessuna recensione corrisponde ai filtri correnti.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
