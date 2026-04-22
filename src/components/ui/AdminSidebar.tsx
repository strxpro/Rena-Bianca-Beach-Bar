"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PencilLine,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SidebarUser = {
  name: string;
  email: string;
  role: string;
};

const DESKTOP_EXPANDED = 252;
const DESKTOP_COLLAPSED = 72;

export function AdminSidebar({
  user = { name: "Bianca Admin", email: "info@renabiancabeachbar.com", role: "Gestione" },
  reviewNeedsAttentionCount = 0,
  unreadMessagesCount = 0,
  onLogout,
}: {
  user?: SidebarUser;
  reviewNeedsAttentionCount?: number;
  unreadMessagesCount?: number;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadMessages = unreadMessagesCount;
  const isExpanded = isPinned || isHovered;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    if (onLogout) return onLogout();
    if (typeof window !== "undefined") window.location.assign("/");
  };

  const items = [
    { key: "reviews", title: "Recensioni", href: "/admin/reviews", icon: MessageSquare, badge: reviewNeedsAttentionCount },
    { key: "messages", title: "Messaggi", href: "/admin/messages", icon: Mail, badge: unreadMessages },
    { key: "content", title: "Contenuti", href: "/admin/content", icon: PencilLine, badge: 0 },
    { key: "edit", title: "Anteprima live", href: "/?edit=1", icon: PencilLine, badge: 0 },
  ];

  const renderNav = (expanded: boolean) => (
    <nav className="flex-1 space-y-2 py-2">
      {items.map((item) => {
        const active = item.key !== "edit" && pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "relative flex items-center gap-3 rounded-[18px] border px-3 py-3 font-body text-sm transition-all duration-300",
              active
                ? "border-ocean/25 bg-ocean/12 text-sand shadow-[0_14px_36px_-18px_rgba(59,130,196,0.85)]"
                : "border-white/8 bg-white/[0.03] text-sand/65 hover:border-white/12 hover:bg-white/[0.05] hover:text-sand",
            )}
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-navy-light/70 text-ocean-light">
              <Icon className="h-[18px] w-[18px]" />
              {!expanded && item.badge > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ocean shadow-[0_0_10px_rgba(125,211,252,0.8)]" />
              )}
            </span>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <span className="truncate font-medium">{item.title}</span>
                  {item.badge > 0 && (
                    <Badge variant="default" className="ml-auto min-w-6 justify-center px-1.5 py-0.5 text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        );
      })}
    </nav>
  );

  const renderProfile = (expanded: boolean) => (
    <div className="relative">
      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 bottom-[calc(100%+10px)] z-50 rounded-[22px] border border-white/10 bg-[#0b1f39]/98 p-3 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/10 bg-ocean/15">
                  <AvatarFallback className="bg-ocean/15 text-sand text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-semibold text-sand">{user.name}</p>
                  <p className="truncate text-xs text-sand/45">{user.email}</p>
                </div>
              </div>
            </div>
            <Button variant="destructive" className="w-full justify-start rounded-2xl" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setProfileOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.06]"
      >
        <Avatar className="h-10 w-10 border border-white/10 bg-ocean/15 shrink-0">
          <AvatarFallback className="bg-ocean/15 text-sand text-xs">{initials}</AvatarFallback>
        </Avatar>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-semibold text-sand">{user.name}</p>
                <p className="truncate text-xs text-sand/45">{user.role}</p>
              </div>
              <motion.span animate={{ rotate: profileOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 text-sand/40" />
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        {!expanded && <User className="ml-auto h-4 w-4 text-sand/40" />}
      </button>
    </div>
  );

  const sidebarContent = (expanded: boolean) => (
    <div className="flex h-full flex-col gap-4 px-4 py-5">
      {/* Brand */}
      <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.05] p-3.5 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_65%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(125,211,252,0.3)] shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="min-w-0 flex-1"
              >
                <p className="font-heading text-xl text-sand">Pannello di amministrazione</p>
                <p className="font-body text-[10px] uppercase tracking-[0.2em] text-sand/40">Rena Bianca</p>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 shrink-0 rounded-xl border border-white/8 bg-white/[0.03] text-sand/60 hover:text-sand"
            onClick={() => setIsPinned((v) => !v)}
          >
            {isExpanded ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <Separator className="bg-white/8" />

      {renderNav(expanded)}

      {renderProfile(expanded)}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? DESKTOP_EXPANDED : DESKTOP_COLLAPSED }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative hidden min-h-screen shrink-0 overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_top,#17365d_0%,#0b1f39_24%,#09162b_100%)] md:block"
      >
        <div className="sticky top-0 h-screen">
          {sidebarContent(isExpanded)}
        </div>
      </motion.aside>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <motion.button
          type="button"
          className="fixed left-4 top-4 z-[120] flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-navy/80 text-sand shadow-[0_20px_50px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl"
          onClick={() => setIsMobileOpen(true)}
          whileTap={{ scale: 0.96 }}
          aria-label="Apri menu"
        >
          <Menu className="h-5 w-5" />
        </motion.button>

        <AnimatePresence>
          {isMobileOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Chiudi"
                className="fixed inset-0 z-[121] bg-navy/75 backdrop-blur-md"
                onClick={() => setIsMobileOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.aside
                initial={{ x: -36, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-y-0 left-0 z-[122] w-[min(88vw,280px)] border-r border-white/10 bg-[radial-gradient(circle_at_top,#17365d_0%,#0b1f39_26%,#09162b_100%)] shadow-[0_40px_120px_-36px_rgba(0,0,0,0.98)]"
              >
                {sidebarContent(true)}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
