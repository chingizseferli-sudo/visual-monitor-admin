import { createFileRoute } from "@tanstack/react-router";
import { PublicCard, PublicPageHero, PublicPageShell } from "@/components/public-site/public-site-shell";

const posts = [
  { title: "Media monitorinq nə üçün vacibdir?", category: "Media", text: "Komandalar gündəlik xəbər axınını əl ilə yoxlamaq əvəzinə sistemli izləmə ilə qərar verə bilər." },
  { title: "PR komandaları xəbər axınını necə idarə etməlidir?", category: "PR", text: "Vacib siqnalları erkən görmək reputasiya və kommunikasiya risklərini azaltmağa kömək edir." },
  { title: "SEO və kommunikasiya görünürlüğü arasında əlaqə", category: "SEO", text: "Media görünürlüğü və axtarış görünürlüğü bir-birini tamamlayan iki fərqli siqnaldır." },
];

function BlogPage() {
  return (
    <PublicPageShell>
      <main>
        <PublicPageHero eyebrow="Blog" title="Media, PR, SEO və kommunikasiya haqqında qeydlər" description="Vizual.Az blogu kommunikasiya komandaları üçün praktik monitorinq və reputasiya mövzularını izah edəcək." />
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <PublicCard key={post.title}>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-[#1463ff]">{post.category}</span>
                <h2 className="mt-4 text-xl font-extrabold text-slate-950">{post.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{post.text}</p>
              </PublicCard>
            ))}
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}

export const Route = createFileRoute("/blog")({ component: BlogPage });