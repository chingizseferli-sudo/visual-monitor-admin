import { supabase } from "@/lib/supabase";

export type NewsCategory =
  | "Təhsil"
  | "Elm"
  | "Xarici xəbərlər"
  | "Texnologiya"
  | "Dünya"
  | "Ümumi";

export interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content?: string | null;
  category: NewsCategory | string;
  imageUrl: string;
  publishedAt: string;
  author?: string;
  views?: number;
  isFeatured?: boolean;
}

type SupabaseNewsRow = {
  id: number;
  slug: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
  views?: number | null;
  featured?: boolean | null;
};

export function mapNewsRow(row: SupabaseNewsRow): NewsArticle {
  return {
    id: row.id,
    slug: row.slug || String(row.id),
    title: row.title,
    summary: row.summary,
    content: row.content,
    category: row.category || "Ümumi",
    imageUrl:
      row.image_url ||
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
    publishedAt: row.published_at || row.created_at,
    author: "EduNews",
    views: row.views || 0,
    isFeatured: Boolean(row.featured),
  };
}

export async function getPublishedNews(limit = 10): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("status", "published")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getPublishedNews error:", error);
    return [];
  }

  return (data || []).map(mapNewsRow);
}

export async function getFeaturedNews(limit = 5): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getFeaturedNews error:", error);
    return [];
  }

  return (data || []).map(mapNewsRow);
}

export async function getPopularNews(): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("status", "published")
    .not("slug", "is", null)
    .order("views", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("getPopularNews error:", error);

    return getPublishedNews(5);
  }

  return (data || []).map(mapNewsRow);
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    console.error("getNewsBySlug error:", error);
    return null;
  }

  return mapNewsRow(data);
}

export async function getNewsByCategory(
  category: string,
  limit = 20
): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("status", "published")
    .not("slug", "is", null)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getNewsByCategory error:", error);
    return [];
  }

  return (data || []).map(mapNewsRow);
}