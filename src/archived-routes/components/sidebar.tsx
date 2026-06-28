import { Link } from "@tanstack/react-router";
import { Clock, Eye, TrendingUp } from "lucide-react";
import { type NewsArticle } from "@/lib/data";

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

interface SidebarListProps {
  articles: NewsArticle[];
  showViews?: boolean;
}

function SidebarList({ articles, showViews = false }: SidebarListProps) {
  return (
    <ul className="space-y-4">
      {articles.map((article, index) => (
        <li key={article.id}>
          <Link
            to="/news/$slug"
            params={{ slug: article.slug }}
            className="group flex gap-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-2 text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-primary">
                {article.title}
              </h4>

              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatBakuDate(article.publishedAt)}</span>

                {showViews && article.views !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.views.toLocaleString("az-AZ")}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Sidebar({
  latestNews,
  popularNews,
}: {
  latestNews: NewsArticle[];
  popularNews: NewsArticle[];
}) {
  return (
    <aside className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Son xəbərlər
          </h3>
        </div>

        <SidebarList articles={latestNews} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Ən çox oxunanlar
          </h3>
        </div>

        <SidebarList articles={popularNews} showViews />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="font-serif text-lg font-semibold text-foreground">
          Xəbərlərdən xəbərdar olun
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Ən son təhsil və elm xəbərlərini birbaşa e-poçtunuza alın.
        </p>

        <div className="mt-4">
          <input
            type="email"
            placeholder="E-poçt ünvanınız"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <button className="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Abunə ol
          </button>
        </div>
      </div>
    </aside>
  );
}