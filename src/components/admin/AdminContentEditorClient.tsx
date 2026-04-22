"use client";

import Link from "next/link";
import { ExternalLink, ImageIcon, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { translations } from "@/i18n/translations";

type EditorField = {
  key: string;
  label: string;
  kind?: "text" | "textarea" | "image";
  placeholder?: string;
  rows?: number;
  fallback?: string;
};

type EditorBlock = {
  title: string;
  description: string;
  fields: EditorField[];
};

const contentBlocks: EditorBlock[] = [
  {
    title: "Hero",
    description: "Testi principali visibili sopra il video e nella prima schermata della pagina.",
    fields: [
      { key: "hero.subtitle", label: "Sottotitolo hero", kind: "textarea", rows: 3 },
      { key: "hero.reservation", label: "Pulsante prenotazione" },
      { key: "hero.menu", label: "Pulsante menu" },
      { key: "hero.scroll", label: "Testo scroll" },
    ],
  },
  {
    title: "Chi siamo — intro",
    description: "Titoli e descrizioni della sezione introduttiva e delle card sotto hero.",
    fields: [
      { key: "about.title", label: "Titolo sezione" },
      { key: "about.description", label: "Descrizione principale", kind: "textarea", rows: 4 },
      { key: "about.descriptionSecondary", label: "Descrizione secondaria", kind: "textarea", rows: 4 },
      { key: "about.quote", label: "Citazione" },
    ],
  },
  {
    title: "Card 01",
    description: "Prima card premium della sezione Chi siamo.",
    fields: [
      { key: "about.card1.badge", label: "Badge" },
      { key: "about.card1.title", label: "Titolo" },
      { key: "about.card1.text", label: "Testo", kind: "textarea", rows: 4 },
      { key: "about.card1.note", label: "Nota aggiuntiva", kind: "textarea", rows: 3 },
      { key: "about.card1.image", label: "URL immagine", kind: "image", fallback: "/about/about-1.jpg" },
    ],
  },
  {
    title: "Card 02",
    description: "Seconda card della sezione Chi siamo.",
    fields: [
      { key: "about.card2.badge", label: "Badge" },
      { key: "about.card2.title", label: "Titolo" },
      { key: "about.card2.text", label: "Testo", kind: "textarea", rows: 4 },
      { key: "about.card2.image", label: "URL immagine", kind: "image", fallback: "/about/about-2.jpg" },
    ],
  },
  {
    title: "Card 03",
    description: "Terza card della sezione Chi siamo.",
    fields: [
      { key: "about.card3.badge", label: "Badge" },
      { key: "about.card3.title", label: "Titolo" },
      { key: "about.card3.text", label: "Testo", kind: "textarea", rows: 4 },
      { key: "about.card3.image", label: "URL immagine", kind: "image", fallback: "/about/about-3.jpg" },
    ],
  },
  {
    title: "Card 04",
    description: "Quarta card della sezione Chi siamo.",
    fields: [
      { key: "about.card4.badge", label: "Badge" },
      { key: "about.card4.title", label: "Titolo" },
      { key: "about.card4.text", label: "Testo", kind: "textarea", rows: 4 },
      { key: "about.card4.image", label: "URL immagine", kind: "image", fallback: "/about/about-4.jpg" },
    ],
  },
  {
    title: "Menu & Panorama",
    description: "Titoli principali delle sezioni home, esclusi recensioni e galleria Instagram.",
    fields: [
      { key: "menu.heading", label: "Titolo menu" },
      { key: "menu.subheading", label: "Sottotitolo menu", kind: "textarea", rows: 3 },
      { key: "panorama.label", label: "Etichetta panorama" },
      { key: "panorama.heading", label: "Titolo panorama" },
    ],
  },
  {
    title: "Posizione & Contatti",
    description: "Titoli, indirizzo, orari e formulario contatti.",
    fields: [
      { key: "location.heading", label: "Titolo posizione" },
      { key: "location.navigate", label: "CTA navigazione" },
      { key: "location.address.line1", label: "Indirizzo — riga 1", fallback: "Spiaggia di Rena Bianca" },
      { key: "location.address.line2", label: "Indirizzo — riga 2", fallback: "07028 Santa Teresa Gallura" },
      { key: "location.hours.times", label: "Orari", fallback: "10:00 – 01:00" },
      { key: "location.phone.value", label: "Telefono", fallback: "+39 0789 123 456" },
      { key: "location.email", label: "Email", fallback: "info@renabiancabeachbar.com" },
      { key: "contact.heading", label: "Titolo contatti" },
      { key: "contact.description", label: "Descrizione contatti", kind: "textarea", rows: 4 },
      { key: "contact.namePlaceholder", label: "Placeholder nome" },
      { key: "contact.emailPlaceholder", label: "Placeholder email" },
      { key: "contact.messagePlaceholder", label: "Placeholder messaggio", kind: "textarea", rows: 3 },
      { key: "contact.submit", label: "Pulsante invio" },
    ],
  },
];

const italianTranslations = translations.it as Record<string, string>;

export default function AdminContentEditorClient() {
  const { overrides, setOverride, saveOverrides, isSaving, hasUnsaved } = useI18n();

  const resolveValue = (field: EditorField) => overrides[field.key] ?? field.fallback ?? italianTranslations[field.key] ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline">CMS pagina principale</Badge>
            <CardTitle className="mt-3 text-2xl">Editor contenuti</CardTitle>
            <CardDescription>
              Qui puoi modificare testi, titoli e immagini principali della home. Le sezioni <strong>Recensioni/Commenti</strong> e <strong>Instagram Gallery</strong> sono escluse intenzionalmente.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/?edit=1" target="_blank" className="inline-flex">
              <Button variant="secondary" className="rounded-2xl px-5">
                <ExternalLink className="h-4 w-4" />
                Apri anteprima live
              </Button>
            </Link>
            <Button variant="glow" className="rounded-2xl px-5" onClick={() => void saveOverrides()} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? "Salvataggio…" : "Salva modifiche"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 pt-0">
          <Badge variant={hasUnsaved ? "warning" : "success"}>{hasUnsaved ? "Modifiche non salvate" : "Tutto salvato"}</Badge>
          <span className="font-body text-sm text-sand/45">Le modifiche salvate aggiornano il sito e la modalità `?edit=1`.</span>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {contentBlocks.map((block) => (
          <Card key={block.title} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl">{block.title}</CardTitle>
              <CardDescription>{block.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {block.fields.map((field) => {
                const value = resolveValue(field);
                const isImage = field.kind === "image";
                const isTextarea = field.kind === "textarea";

                return (
                  <div key={field.key} className="space-y-2 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-sand/55">
                      {isImage && <ImageIcon className="h-4 w-4 text-ocean-light" />}
                      <label className="font-body text-[11px] uppercase tracking-[0.18em]">{field.label}</label>
                    </div>

                    {isTextarea ? (
                      <Textarea
                        value={value}
                        onChange={(event) => setOverride(field.key, event.target.value)}
                        rows={field.rows ?? 4}
                        className="min-h-[120px]"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <Input
                        value={value}
                        onChange={(event) => setOverride(field.key, event.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}

                    <p className="font-body text-xs text-sand/35">Chiave: {field.key}</p>

                    {isImage && value && (
                      <div className="overflow-hidden rounded-[20px] border border-white/8 bg-white/5">
                        <img src={value} alt={field.label} className="aspect-[16/10] w-full object-cover" loading="lazy" />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
