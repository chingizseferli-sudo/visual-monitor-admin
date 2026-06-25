import { useEffect, useState } from "react";
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";

import {
  newsColumns as columns,
  type NewsItem,
} from "./news-columns";

type NewsTableProps = {
  data: NewsItem[];
};

export function NewsTable({
  data,
}: NewsTableProps) {
  const [rowSelection, setRowSelection] =
    useState({});

  const [sorting, setSorting] =
    useState<SortingState>([]);

  const [
    columnVisibility,
    setColumnVisibility,
  ] = useState<VisibilityState>({});

  const [globalFilter, setGlobalFilter] =
    useState("");

  const [columnFilters, setColumnFilters] =
    useState<any[]>([]);

  const table = useReactTable({
    data,
    columns,

    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },

    enableRowSelection: true,

    onRowSelectionChange:
      setRowSelection,

    onSortingChange: setSorting,

    onColumnVisibilityChange:
      setColumnVisibility,

    onGlobalFilterChange:
      setGlobalFilter,

    onColumnFiltersChange:
      setColumnFilters,

    globalFilterFn: (
      row,
      _columnId,
      filterValue
    ) => {
      const id = String(
        row.getValue("id")
      ).toLowerCase();

      const title = String(
        row.getValue("title")
      ).toLowerCase();

      const searchValue = String(
        filterValue
      ).toLowerCase();

      return (
        id.includes(searchValue) ||
        title.includes(searchValue)
      );
    },

    getCoreRowModel:
      getCoreRowModel(),

    getFilteredRowModel:
      getFilteredRowModel(),

    getPaginationRowModel:
      getPaginationRowModel(),

    getSortedRowModel:
      getSortedRowModel(),

    getFacetedRowModel:
      getFacetedRowModel(),

    getFacetedUniqueValues:
      getFacetedUniqueValues(),
  });

  useEffect(() => {}, []);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-4"
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder="Başlıq və ID üzrə axtar..."
        filters={[
          {
            columnId: "status",
            title: "Status",
            options: [
              {
                label: "Qaralama",
                value: "draft",
              },
              {
                label:
                  "Təsdiq gözləyir",
                value: "pending",
              },
              {
                label:
                  "Planlaşdırılıb",
                value: "scheduled",
              },
              {
                label:
                  "Yayımlanıb",
                value: "published",
              },
            ],
          },
        ]}
      />

      <div className="overflow-hidden rounded-md border">
        <Table className="min-w-xl">
          <TableHeader>
            {table
              .getHeaderGroups()
              .map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                >
                  {headerGroup.headers.map(
                    (header) => (
                      <TableHead
                        key={header.id}
                        colSpan={
                          header.colSpan
                        }
                        className={cn(
                          header.column
                            .columnDef.meta
                            ?.className,
                          header.column
                            .columnDef.meta
                            ?.thClassName
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header
                                .column
                                .columnDef
                                .header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  )}
                </TableRow>
              ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows
              ?.length ? (
              table
                .getRowModel()
                .rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={
                      row.getIsSelected() &&
                      "selected"
                    }
                  >
                    {row
                      .getVisibleCells()
                      .map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column
                              .columnDef
                              .meta
                              ?.className,
                            cell.column
                              .columnDef
                              .meta
                              ?.tdClassName
                          )}
                        >
                          {flexRender(
                            cell.column
                              .columnDef
                              .cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length
                  }
                  className="h-24 text-center"
                >
                  Nəticə tapılmadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        table={table}
        className="mt-auto"
      />
    </div>
  );
}