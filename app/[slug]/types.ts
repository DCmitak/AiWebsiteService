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
  section?: "hero" | "work" | "venue" | (string & {}) | null;
};

export type SiteSettings = {
  client_id: string;

  theme_preset?: "luxe" | "minimal" | string | null;
  primary_color?: string | null;

  logo_url?: string | null;
  hero_image_url?: string | null;

  booking_url?: string | null;
  phone?: string | null;
  address?: string | null;
  working_hours?: string | null;

  about_text?: string | null;

  google_maps_url?: string | null;

  brands?: unknown;

  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;

  category_label?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;

  hero_image_alt?: string;

  pricing_layout?: "v1" | "v2" | null;


  reviews?: Array<{
    id?: string;
    author: string;
    rating: number;
    text: string;
  }>;

  hero_features?: Array<{
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
