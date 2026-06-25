import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsGrid } from "@/components/news-card";
import { Sidebar } from "@/components/sidebar";

import {
  getPopularNews,
  getPublishedNews,
  type NewsArticle,
} from "@/lib/data";

export const Route = createFileRoute("/news/")({
  component: NewsPage,
});

function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [popularNews, setPopularNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      const [allNews, popular] = await Promise.all([
        getPublishedNews(50),
        getPopularNews(),
      ]);

      setNews(allNews);
      setPopularNews(popular);
      setLoading(false);
    }

    loadNews();
  }, []);

  if (loading) {
    return <div className="p-10">Yüklənir...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold text-foreground">
              Son xəbərlər
            </h1>

            <p className="mt-3 text-muted-foreground">
              Təhsil, elm və texnologiya üzrə ən son xəbərlər
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NewsGrid articles={news} title="Bütün xəbərlər" />
            </div>

            <div className="lg:col-span-1">
              <Sidebar latestNews={news.slice(0, 5)} popularNews={popularNews} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}