export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@supabase/supabase-js";
import LuxeTheme from "./themes/Luxe";
import MinimalTheme from "./themes/Minimal";

import type { Service, Review, GalleryImage, SiteSettings, PublicClient, PublicPayload } from "./types";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default async function PublicClientPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const { data: client, error: clientError } = await sb
    .from("clients")
    .select("id, slug, business_name, city, is_active")
    .eq("slug", slug)
    .maybeSingle<PublicClient>();

  if (clientError) return <div className="p-8">DB error: {clientError.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;
  if (!client.is_active) return <div className="p-8">Not available</div>;

  const [{ data: settings }, { data: services }, { data: gallery }, { data: reviews }] = await Promise.all([
    sb.from("site_settings").select("*").eq("client_id", client.id).maybeSingle<SiteSettings>(),
    sb
      .from("services")
      .select("id,category,name,description,duration_min,price_from,sort_order,is_featured,featured_image_url")
      .eq("client_id", client.id)
      .order("sort_order")
      .returns<Service[]>(),
    sb
      .from("gallery_images")
      .select("id,image_url,sort_order,section")
      .eq("client_id", client.id)
      .order("sort_order")
      .returns<GalleryImage[]>(),
    sb
      .from("reviews")
      .select("id,author,rating,text,created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(12)
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
