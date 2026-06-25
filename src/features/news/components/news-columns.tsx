import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table";
import { NewsRowActions } from "./news-row-actions";

export type NewsItem = {
  id: number;
  title: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  source: string | null;
  category: string | null;
  status: string | null;
  scheduled_at: string | null;
  created_at: string | null;
};

export const newsColumns: ColumnDef<NewsItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => <div className="font-medium">#{row.getValue("id")}</div>,
  },

  {
    accessorKey: "image_url",
    header: () => <div>Şəkil</div>,
    cell: ({ row }) => {
      const image = row.original.image_url;

      return image ? (
        <img
          src={image}
          alt=""
          className="h-14 w-24 rounded-md object-cover"
        />
      ) : (
        <div className="h-14 w-24 rounded-md bg-muted" />
      );
    },
  },

  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Başlıq" />
    ),
    meta: {
      className: "w-[450px]",
    },
    cell: ({ row }) => (
      <div>
        <div className="font-medium line-clamp-1">{row.original.title}</div>

        <div className="text-muted-foreground text-sm line-clamp-1">
          {row.original.summary}
        </div>
      </div>
    ),
  },

  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Kateqoriya" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.category || "Ümumi"}</Badge>
    ),
  },

  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;

      return (
        <Badge
          className={
            status === "published"
              ? "bg-green-100 text-green-700 hover:bg-green-100"
              : status === "pending"
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                : status === "scheduled"
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-100"
          }
        >
          {status || "draft"}
        </Badge>
      );
    },
  },

  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tarix" />
    ),
    cell: ({ row }) => (
      <div>
        {row.original.created_at
          ? new Date(row.original.created_at).toLocaleDateString("az-AZ")
          : "-"}
      </div>
    ),
  },

  {
    id: "actions",
    cell: ({ row }) => <NewsRowActions row={row} />,
  },
];