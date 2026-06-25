import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type NewsArticle = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  imageUrl: string;
  category: string;
  publishedAt: string;
};

interface NewsCardProps {
  article: NewsArticle;
}

function formatBakuDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "2-digit",
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

function getCategoryColor(category: string): string {
  switch (category) {
    case "Təhsil":
      return "bg-primary text-primary-foreground";
    case "Elm":
      return "bg-accent text-accent-foreground";
    case "Xarici xəbərlər":
      return "bg-secondary text-secondary-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/news/$slug"
        params={{ slug: article.slug }}
        className="relative aspect-[16/10] overflow-hidden"
      >
        <img
          src={article.imageUrl}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <Badge
          className={`absolute left-3 top-3 ${getCategoryColor(
            article.category
          )}`}
        >
          {article.category}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />

          <time dateTime={article.publishedAt}>
            {formatBakuDate(article.publishedAt)}
          </time>
        </div>

        <h3 className="mt-2 line-clamp-2 font-serif text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
          <Link to="/news/$slug" params={{ slug: article.slug }}>
            {article.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {article.summary}
        </p>

        <Button
          variant="link"
          className="mt-3 h-auto justify-start p-0 text-primary"
          asChild
        >
          <Link to="/news/$slug" params={{ slug: article.slug }}>
            Ətraflı oxu
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

interface NewsGridProps {
  articles: NewsArticle[];
  title?: string;
}

export function NewsGrid({
  articles,
  title = "Son Xəbərlər",
}: NewsGridProps) {
  return (
    <section className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold text-foreground">
          {title}
        </h2>

        <Button
          variant="ghost"
          className="text-primary hover:text-primary/80"
          asChild
        >
          <Link to="/news">
            Hamısına bax
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}