import { Link } from "@tanstack/react-router";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="font-serif text-base font-bold text-primary-foreground">
                E
              </span>
            </div>

            <span className="font-serif text-lg font-bold text-foreground">
              Edu<span className="text-primary">News</span>
            </span>
          </Link>

          <p className="text-sm text-muted-foreground">
            © {currentYear} EduNews. Bütün hüquqlar qorunur.
          </p>
        </div>
      </div>
    </footer>
  );
}