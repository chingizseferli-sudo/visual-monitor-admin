import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Eye } from "lucide-react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Sidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

import {
  getNewsBySlug,
  getPopularNews,
  getPublishedNews,
  type NewsArticle,
} from "@/lib/data";

export const Route = createFileRoute("/news/$slug")({
  component: NewsDetailPage,
});

function formatBakuDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value || "";
  const month = Number(parts.find((part) => part.type === "month")?.value || 1);
  const year = parts.find((part) => part.type === "year")?.value || "";

  const months = [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avqust",
    "sentyabr",
    "oktyabr",
    "noyabr",
    "dekabr",
  ];

  return `${day} ${months[month - 1]} ${year}`;
}

function NewsDetailPage() {
  const { slug } = Route.useParams();

  const [news, setNews] = useState<NewsArticle | null>(null);
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [popularNews, setPopularNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      setLoading(true);

      const [currentNews, latest, popular] = await Promise.all([
        getNewsBySlug(slug),
        getPublishedNews(5),
        getPopularNews(),
      ]);

      if (currentNews) {
        await supabase
          .from("news")
          .update({
            views: (currentNews.views || 0) + 1,
          })
          .eq("id", currentNews.id);

        setNews({
          ...currentNews,
          views: (currentNews.views || 0) + 1,
        });
      } else {
        setNews(null);
      }

      setLatestNews(latest);
      setPopularNews(popular);
      setLoading(false);
    }

    loadNews();
  }, [slug]);

  if (loading) {
    return <div className="p-10">Yüklənir...</div>;
  }

  if (!news) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto max-w-4xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Xəbər tapılmadı</h1>

          <Link
            to="/news"
            className="mt-6 inline-flex items-center text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Xəbərlərə qayıt
          </Link>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          <article className="lg:col-span-2">
            <Link
              to="/news"
              className="mb-6 inline-flex items-center text-sm font-medium text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Xəbərlərə qayıt
            </Link>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                {news.category || "Ümumi"}
              </span>

              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatBakuDate(news.publishedAt)}
              </span>

              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {news.views || 0} oxunma
              </span>
            </div>

            <h1 className="font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl">
              {news.title}
            </h1>

            {news.summary && (
              <p className="mt-5 text-xl leading-8 text-muted-foreground">
                {news.summary}
              </p>
            )}

            {news.imageUrl && (
              <div className="mt-8 overflow-hidden rounded-2xl border">
                <img
                  src={news.imageUrl}
                  alt={news.title}
                  className="max-h-[520px] w-full object-cover"
                />
              </div>
            )}

            <div
              className="prose prose-lg mt-10 max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: news.content || "",
              }}
            />
          </article>

          <aside className="lg:col-span-1">
            <Sidebar latestNews={latestNews} popularNews={popularNews} />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}