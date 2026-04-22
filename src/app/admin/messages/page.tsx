"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Mail, MapPin, Phone, RefreshCw, Search, SendHorizonal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { mockMessageThreads, type MessageThread } from "@/lib/admin-mock-data";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("it", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const STATUS_LABELS: Record<string, string> = {
  new: "Nuovo",
  open: "Aperto",
  replied: "Risposto",
};

const CHANNEL_LABELS: Record<string, string> = {
  contact_form: "Modulo contatto",
  instagram_dm: "Instagram DM",
  reservation: "Prenotazione",
};

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sent" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);

  const loadThreads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/messages");
      const real = res.ok ? ((await res.json()) as MessageThread[]) : [];
      const merged = [...real, ...mockMessageThreads.filter((m) => !real.find((r) => r.id === m.id))];
      setThreads(merged);
      if (!selectedId && merged[0]) setSelectedId(merged[0].id);
    } catch {
      setThreads(mockMessageThreads);
      if (!selectedId && mockMessageThreads[0]) setSelectedId(mockMessageThreads[0].id);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredThreads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (!needle) return true;
      return [t.name, t.email, t.subject, t.location].join(" ").toLowerCase().includes(needle);
    });
  }, [query, threads]);

  const selectedThread = useMemo(
    () => filteredThreads.find((t) => t.id === selectedId) ?? threads.find((t) => t.id === selectedId) ?? filteredThreads[0] ?? null,
    [filteredThreads, selectedId, threads],
  );

  const unreadCount = useMemo(() => threads.reduce((s, t) => s + t.unreadCount, 0), [threads]);

  const handleSend = async () => {
    if (!selectedThread || !reply.trim()) return;
    setIsSending(true);
    setSendState("idle");
    try {
      const res = await fetch("/api/admin/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selectedThread.id, message: reply.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { id: string; sentAt: string };
      setThreads((cur) =>
        cur.map((t) => {
          if (t.id !== selectedThread.id) return t;
          return {
            ...t,
            status: "replied",
            unreadCount: 0,
            updatedAt: data.sentAt,
            messages: [
              ...t.messages,
              { id: data.id, sender: "admin", content: reply.trim(), timestamp: data.sentAt },
            ],
          };
        }),
      );
      setReply("");
      setSendState("sent");
    } catch {
      setSendState("error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      {/* Thread list */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-3">In arrivo</Badge>
              <CardTitle className="text-2xl">Messaggi</CardTitle>
              <p className="mt-1 font-body text-sm text-sand/45">Conversazioni dal modulo di contatto</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-2xl border border-ocean/20 bg-ocean/10 px-4 py-3 text-right">
                <p className="font-heading text-3xl text-sand">{unreadCount}</p>
                <p className="font-body text-[11px] uppercase tracking-[0.18em] text-sand/40">non letti</p>
              </div>
              <button
                type="button"
                onClick={loadThreads}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-body text-xs text-sand/50 hover:text-sand transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                Aggiorna
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sand/35" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-11" placeholder="Cerca per nome, email, oggetto…" />
          </div>

          <ScrollArea className="max-h-[700px] rounded-[20px] border border-white/8">
            {isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <p className="py-8 text-center font-body text-sm text-sand/40">Nessun messaggio trovato.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Numero</TableHead>
                    <TableHead>Messaggio</TableHead>
                    <TableHead>Paese</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredThreads.map((thread) => {
                    const active = selectedThread?.id === thread.id;
                    return (
                      <TableRow key={thread.id} className={active ? "bg-ocean/10" : "cursor-pointer"} onClick={() => { setSelectedId(thread.id); setSendState("idle"); }}>
                        <TableCell>{thread.name}</TableCell>
                        <TableCell>{thread.email || "—"}</TableCell>
                        <TableCell>{(thread as MessageThread & { phone?: string }).phone || "—"}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="line-clamp-2 text-xs text-sand/70">{thread.messages[0]?.content || thread.subject}</p>
                        </TableCell>
                        <TableCell>{thread.location || "—"}</TableCell>
                        <TableCell>{formatTime(thread.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-xs text-sand/70">{(thread as MessageThread & { sourceLabel?: string }).sourceLabel || "Modulo contatto"}</p>
                            <Badge variant={thread.status === "new" ? "warning" : thread.status === "replied" ? "success" : "secondary"}>
                              {STATUS_LABELS[thread.status] || thread.status}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Conversation view */}
      <Card className="min-h-[760px] overflow-hidden">
        {selectedThread ? (
          <>
            <CardHeader className="border-b border-white/8 bg-white/4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{CHANNEL_LABELS[selectedThread.channel] || selectedThread.channel}</Badge>
                    <Badge variant={selectedThread.status === "new" ? "warning" : selectedThread.status === "replied" ? "success" : "secondary"}>
                      {STATUS_LABELS[selectedThread.status] || selectedThread.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-2xl">{selectedThread.subject}</CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-4 font-body text-sm text-sand/50">
                    <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />{selectedThread.email}</span>
                    {selectedThread.location && (
                      <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{selectedThread.location}</span>
                    )}
                    {(selectedThread as MessageThread & { phone?: string }).phone && (
                      <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />{(selectedThread as MessageThread & { phone?: string }).phone}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 p-0 lg:grid-rows-[minmax(0,1fr)_auto]">
              <ScrollArea className="max-h-[520px] px-6 py-6 lg:max-h-none">
                <div className="space-y-4">
                  {selectedThread.messages.map((msg) => {
                    const isAdmin = msg.sender === "admin";
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-[28px] border px-5 py-4 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.95)] ${isAdmin ? "border-ocean/20 bg-ocean/12 text-sand" : "border-white/8 bg-white/4 text-sand/78"}`}>
                          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-sand/35">
                            <span>{isAdmin ? "Admin" : selectedThread.name}</span>
                            <span className="h-1 w-1 rounded-full bg-white/20" />
                            <span>{formatTime(msg.timestamp)}</span>
                          </div>
                          <p className="font-body text-sm leading-7">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="border-t border-white/8 bg-white/4 px-6 py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm font-medium text-sand">Rispondi</p>
                    <p className="text-sm text-sand/45">La risposta sarà inoltrata via email.</p>
                  </div>
                  {sendState === "sent" && <Badge variant="success">Risposta inviata</Badge>}
                  {sendState === "error" && <Badge variant="destructive">Invio fallito</Badge>}
                </div>
                <div className="grid gap-4">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Scrivi la tua risposta all'ospite…"
                  />
                  <div className="flex justify-end">
                    <Button variant="glow" className="rounded-2xl px-6" onClick={handleSend} disabled={isSending || !reply.trim()}>
                      <SendHorizonal className="h-4 w-4" />
                      {isSending ? "Invio…" : "Invia risposta"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex min-h-[520px] items-center justify-center p-8 text-center text-sand/50">
            Nessuna conversazione selezionata.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
