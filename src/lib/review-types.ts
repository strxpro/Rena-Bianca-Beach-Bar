export type PublicReview = {
  name: string;
  role: string;
  date: string;
  text: string;
  rating: number;
  photo: string;
  photos?: string[];
  isLocal?: boolean;
  countryCode?: string;
  countryName?: string;
};

export type ReviewSource = "google" | "local";
export type ReviewStatus = "visible" | "hidden" | "flagged";
export type ReplyState = "pending" | "replied";

export type AdminReviewRecord = {
  id: string;
  author: string;
  email: string;
  country: string;
  countryCode?: string;
  rating: number;
  source: ReviewSource;
  status: ReviewStatus;
  sheetStatus: string;
  replyState: ReplyState;
  date: string;
  comment: string;
  tags: string[];
  avatar?: string;
  photos: string[];
};
