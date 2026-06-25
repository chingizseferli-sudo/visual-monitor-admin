import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/(auth)/admin/news/$id/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">
        Xəbər səhifəsi
      </h1>

      <p className="text-muted-foreground mt-2">
        ID: {id}
      </p>
    </div>
  );
}