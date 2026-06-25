import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { NewsGrid } from "@/components/news-card";
import { Sidebar } from "@/components/sidebar";

import {
  getFeaturedNews,
  getPopularNews,
  getPublishedNews,
  type NewsArticle,
} from "@/lib/data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [featuredNews, setFeaturedNews] = useState<NewsArticle[]>([]);
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [popularNews, setPopularNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);

      const [featured, latest, popular] = await Promise.all([
        getFeaturedNews(),
        getPublishedNews(7),
        getPopularNews(),
      ]);

      setFeaturedNews(featured);
      setLatestNews(latest);
      setPopularNews(popular);
      setLoading(false);
    }

    loadHomeData();
  }, []);

  const gridArticles = latestNews.slice(0, 7);

  if (loading) {
    return <div className="p-10">Yüklənir...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <HeroSection featuredNews={featuredNews} />

          <div className="grid gap-8 py-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NewsGrid articles={gridArticles} title="Son Xəbərlər" />
            </div>

            <div className="lg:col-span-1">
              <Sidebar latestNews={latestNews} popularNews={popularNews} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}