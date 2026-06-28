import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type NewsArticle } from "@/lib/data";

interface HeroSectionProps {
  featuredNews: NewsArticle[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  return date.toLocaleDateString("az-AZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HeroSection({ featuredNews }: HeroSectionProps) {
  const mainFeatured = featuredNews[0];
  const sideFeatured = featuredNews.slice(1, 5);

  if (!mainFeatured) return null;

  return (
    <section className="py-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="group relative overflow-hidden rounded-xl bg-card shadow-sm">
          <Link
            to="/news/$slug"
            params={{ slug: mainFeatured.slug }}
            className="block h-full"
          >
            <div className="relative aspect-[16/10] h-full overflow-hidden">
              <img
                src={mainFeatured.imageUrl}
                alt={mainFeatured.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <Badge className="mb-3 bg-primary text-primary-foreground">
                  {mainFeatured.category}
                </Badge>

                <h2 className="mb-2 font-serif text-2xl font-bold leading-tight text-white md:text-3xl">
                  {mainFeatured.title}
                </h2>

                <p className="mb-3 line-clamp-2 text-sm text-white/80 md:text-base">
                  {mainFeatured.summary}
                </p>

                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Calendar className="h-4 w-4" />

                  <time dateTime={mainFeatured.publishedAt}>
                    {formatDate(mainFeatured.publishedAt)}
                  </time>
                </div>
              </div>
            </div>
          </Link>
        </article>

        <div className="grid gap-4 sm:grid-cols-2">
          {sideFeatured.map((item) => (
            <article
              key={item.id}
              className="group relative overflow-hidden rounded-xl bg-card shadow-sm"
            >
              <Link
                to="/news/$slug"
                params={{ slug: item.slug }}
                className="block h-full"
              >
                <div className="relative min-h-[180px] overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full min-h-[180px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <Badge className="mb-2 bg-accent text-accent-foreground">
                      {item.category}
                    </Badge>

                    <h3 className="line-clamp-2 font-serif text-base font-bold leading-tight text-white">
                      {item.title}
                    </h3>

                    <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                      <Calendar className="h-3.5 w-3.5" />

                      <time dateTime={item.publishedAt}>
                        {formatDate(item.publishedAt)}
                      </time>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

