import Link from "next/link";
import { ArrowRight, Bell, ShieldAlert, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAdminMessages } from "@/lib/admin-messages-data";
import { loadAdminReviews } from "@/lib/reviews-data";

export default async function AdminOverviewPage() {
  const [reviews, messages] = await Promise.all([loadAdminReviews(), loadAdminMessages()]);
  const reviewNeedsAttention = reviews.filter((review) => review.status !== "visible").length;
  const cards = [
    {
      title: "Messaggi",
      description: "Workflow centralizzato per richieste da modulo contatti e prenotazioni.",
      href: "/admin/messages",
      icon: Bell,
      value: messages.reduce((sum, thread) => sum + thread.unreadCount, 0),
      label: "non letti",
    },
    {
      title: "Recensioni",
      description: "Righe Google + locali caricate in tempo reale dai fogli pubblicati.",
      href: "/admin/reviews",
      icon: Star,
      value: reviews.length,
      label: "righe live",
    },
    {
      title: "Da verificare",
      description: "Righe ancora in revisione o non visibili sul sito.",
      href: "/admin/reviews",
      icon: ShieldAlert,
      value: reviewNeedsAttention,
      label: "attenzione",
    },
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={`${card.href}-${card.title}`} className="overflow-hidden">
              <CardHeader className="relative">
                <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-ocean/12 blur-3xl" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline">Percorso admin</Badge>
                    <CardTitle className="mt-4 text-2xl">{card.title}</CardTitle>
                    <CardDescription className="mt-2 max-w-xs">{card.description}</CardDescription>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ocean-light">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-heading text-5xl text-sand">{card.value}</p>
                  <p className="font-body text-xs uppercase tracking-[0.2em] text-sand/40">{card.label}</p>
                </div>
                <Link href={card.href}>
                  <Button variant="secondary" className="rounded-2xl">
                    Apri
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <Badge variant="default">Dati live pronti</Badge>
            <CardTitle className="text-2xl">Pannello operativo</CardTitle>
            <CardDescription>
              Navigazione ottimizzata sulle route attive, con recensioni e messaggi letti direttamente dalle sorgenti dati pubblicate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-sand/65">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              In `/admin/reviews` vedi le righe reali da Google/local con origine, stato, paese, tag e foto allegate quando presenti.
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              In `/admin/messages` hai tabella contatti con colonne Nome, Email, Numero, Messaggio, Paese, Data, Fonte e flusso risposta integrato.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
