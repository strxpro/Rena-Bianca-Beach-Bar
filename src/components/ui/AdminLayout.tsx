"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { AdminSidebar } from "@/components/ui/AdminSidebar";
import { Badge } from "@/components/ui/badge";

type AdminLayoutProps = {
  children: ReactNode;
  reviewNeedsAttentionCount: number;
  unreadMessagesCount: number;
};

const routeMeta: Record<string, { title: string; description: string; badge: string }> = {
  "/admin": {
    title: "Panoramica",
    description: "Gestisci messaggi, recensioni e contenuti del sito da un unico pannello.",
    badge: "Dashboard",
  },
  "/admin/messages": {
    title: "Messaggi",
    description: "Consulta i contatti in arrivo e rispondi rapidamente agli ospiti.",
    badge: "Inbox",
  },
  "/admin/reviews": {
    title: "Recensioni",
    description: "Controlla le recensioni provenienti da Google Sheets e verifica cosa richiede attenzione.",
    badge: "Recensioni",
  },
  "/admin/content": {
    title: "Contenuti",
    description: "Modifica testi, CTA e immagini principali della home senza toccare recensioni e gallery Instagram.",
    badge: "CMS",
  },
};

export function AdminLayout({ children, reviewNeedsAttentionCount, unreadMessagesCount }: AdminLayoutProps) {
  const pathname = usePathname();
  const meta = routeMeta[pathname] ?? routeMeta["/admin"];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,196,0.18),transparent_28%),linear-gradient(180deg,#0a192f_0%,#071323_100%)] text-sand">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-[360px] w-[360px] rounded-full bg-ocean/12 blur-[120px]" />
        <div className="absolute bottom-[-8%] right-[-12%] h-[420px] w-[420px] rounded-full bg-cyan-300/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-size-[40px_40px] opacity-[0.16]" />
      </div>

      <div className="relative flex min-h-screen">
        <AdminSidebar reviewNeedsAttentionCount={reviewNeedsAttentionCount} unreadMessagesCount={unreadMessagesCount} />

        <div className="flex min-w-0 flex-1 flex-col md:pl-0">
          {/* Header */}
          <header className="sticky top-0 z-[110] border-b border-white/8 bg-navy/55 px-5 pb-5 pt-16 backdrop-blur-2xl md:px-8 md:pt-6">
            <div className="mx-auto flex w-full max-w-[1600px] items-end justify-between gap-4">
              <div className="min-w-0">
                <Badge variant="outline" className="mb-3 border-cyan-300/15 bg-cyan-300/8 text-cyan-100">
                  {meta.badge}
                </Badge>
                <h1 className="font-heading text-3xl text-sand md:text-4xl">{meta.title}</h1>
                <p className="mt-1.5 max-w-xl font-body text-sm text-sand/50">{meta.description}</p>
              </div>
              <Link
                href="/"
                className="mb-1 flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-body text-sm text-sand/60 hover:text-sand transition-colors"
              >
                Apri sito
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          {/* Content */}
          <main className="relative flex-1 px-5 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-[1600px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
