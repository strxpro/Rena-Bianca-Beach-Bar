import type { ReactNode } from "react";
import { AdminLayout } from "@/components/ui/AdminLayout";
import { loadAdminMessages } from "@/lib/admin-messages-data";
import { loadAdminReviewsFresh } from "@/lib/reviews-data";

export default async function AdminRouteLayout({ children }: { children: ReactNode }) {
  const [reviews, messages] = await Promise.all([loadAdminReviewsFresh(), loadAdminMessages()]);
  const reviewNeedsAttentionCount = reviews.filter((review) => review.status !== "visible").length;
  const unreadMessagesCount = messages.reduce((sum, thread) => sum + thread.unreadCount, 0);

  return (
    <AdminLayout reviewNeedsAttentionCount={reviewNeedsAttentionCount} unreadMessagesCount={unreadMessagesCount}>
      {children}
    </AdminLayout>
  );
}
