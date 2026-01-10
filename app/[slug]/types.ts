// app/[slug]/types.ts

export type Service = {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  duration_min: number | null;
  price_from: number | null;
  sort_order: number | null;
  is_featured?: boolean | null;
  featured_image_url?: string | null;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  text: string;
};

export type GalleryImage = {
  id: string;
  image_url: string;
  sort_order: number | null;
  section?: "hero" | "about" | "pricing" | "work" | "venue" | "brands" | (string & {}) | null;
};

export type SiteSettings = {
  client_id: string;

  theme_preset?: "luxe" | "minimal" | string | null;
  primary_color?: string | null;

  // Branding
  logo_url?: string | null;

  /**
   * Brand header mode:
   * - "logo": show only logo image
   * - "text": show avatar circle + brand text
   */
  brand_mode?: "logo" | "text" | null;
  brand_text?: string | null; // e.g. "Beauty Center Elita" (optional override)
  brand_subtext?: string | null; // optional small line under brand (optional)

  // Contacts
  phone?: string | null;
  address?: string | null;
  working_hours?: string | null;

  // About
  about_text?: string | null;

  // Maps + Social
  google_maps_url?: string | null;

  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;

  // Layout
  pricing_layout?: "v1" | "v2" | null;

  // Hero copy
  category_label?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;

  // Section texts (Minimal template)
  services_eyebrow?: string | null;
  services_title?: string | null;
  services_subtitle?: string | null;

  about_eyebrow?: string | null;
  about_title?: string | null;
  about_cta_label?: string | null;

  brands_eyebrow?: string | null;
  brands_title?: string | null;
  brands_subtitle?: string | null;

  pricing_eyebrow?: string | null;
  pricing_title?: string | null;
  pricing_subtitle?: string | null;
  pricing_badge?: string | null;

  gallery_eyebrow?: string | null;
  gallery_title?: string | null;
  gallery_subtitle?: string | null;
  gallery_work_title?: string | null;
  gallery_venue_title?: string | null;

  venue_gallery_eyebrow?: string | null;
  venue_gallery_subtitle?: string | null;

  reviews_eyebrow?: string | null;
  reviews_title?: string | null;
  reviews_subtitle?: string | null;

  contact_eyebrow?: string | null;
  contact_title?: string | null;
  contact_subtitle?: string | null;

  // Hero feature cards (we still store as array in DB, but admin edits via normal fields)
  hero_features?: Array<{
    icon?: string; // emoji like "✨", "🧼", "📅" etc.
    title: string;
    text: string;
  }>;
};

export type PublicClient = {
  id: string;
  slug: string;
  business_name: string;
  city: string;
  is_active: boolean;
};

export type PublicPayload = {
  client: PublicClient;
  settings: SiteSettings | null;
  services: Service[];
  gallery: GalleryImage[];
  reviews: Review[];
};
