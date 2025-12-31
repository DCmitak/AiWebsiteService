// app/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@supabase/supabase-js";
import LuxeTheme from "./themes/Luxe";
import MinimalTheme from "./themes/Minimal";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Service = {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  duration_min: number | null;
  price_from: number | null;
  sort_order: number | null;
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
};

export type SiteSettings = {
  client_id: string;
  theme_preset?: "luxe" | "minimal" | string | null;
  primary_color?: string | null;
  hero_image_url?: string | null;
  booking_url?: string | null;
  phone?: string | null;
  address?: string | null;
  working_hours?: string | null;
  tagline?: string | null;
  about_text?: string | null;
  google_maps_url?: string | null;
  brands?: unknown;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
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

export default async function PublicClientPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const { data: client, error: clientError } = await sb
    .from("clients")
    .select("id, slug, business_name, city, is_active")
    .eq("slug", slug)
    .maybeSingle<PublicClient>();

  if (clientError) return <div className="p-8">DB error: {clientError.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;
  if (!client.is_active) return <div className="p-8">Not available</div>;

  const [{ data: settings }, { data: services }, { data: gallery }, { data: reviews }] =
    await Promise.all([
      sb.from("site_settings").select("*").eq("client_id", client.id).maybeSingle<SiteSettings>(),
      sb
        .from("services")
        .select("id,category,name,description,duration_min,price_from,sort_order")
        .eq("client_id", client.id)
        .order("sort_order")
        .returns<Service[]>(),
      sb
        .from("gallery_images")
        .select("id,image_url,sort_order")
        .eq("client_id", client.id)
        .order("sort_order")
        .returns<GalleryImage[]>(),
      sb
        .from("reviews")
        .select("id,author,rating,text,created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<Review[]>(),
    ]);

  const payload: PublicPayload = {
    client,
    settings: settings ?? null,
    services: services ?? [],
    gallery: gallery ?? [],
    reviews: reviews ?? [],
  };

  const theme = (payload.settings?.theme_preset || "luxe").toString().toLowerCase();

  if (theme === "minimal") return <MinimalTheme {...payload} />;
  return <LuxeTheme {...payload} />;
}
