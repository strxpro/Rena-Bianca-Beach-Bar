import AdminReviewsClient from "@/components/admin/AdminReviewsClient";
import { loadAdminReviews } from "@/lib/reviews-data";

export default async function AdminReviewsPage() {
  const reviews = await loadAdminReviews();

  return <AdminReviewsClient initialReviews={reviews} />;
}
