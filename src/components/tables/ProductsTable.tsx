"use client";

import Link from "next/link";
import { type Product } from "@/lib/api/products";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";

interface ProductsTableProps {
  products: Product[];
  onDelete?: (id: string) => void;
}

export function ProductsTable({ products, onDelete }: ProductsTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <Table className="w-full min-w-[1000px] table-fixed">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Subcategory</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product._id}>
              <TableCell className="truncate font-medium" title={product.name}>
                {product.name}
              </TableCell>
              <TableCell className="truncate" title={product.category}>
                {product.category}
              </TableCell>
              <TableCell className="truncate" title={product.subcategory}>
                {product.subcategory}
              </TableCell>
              <TableCell className="truncate" title={product.brand || ""}>
                {product.brand || "—"}
              </TableCell>
              <TableCell className="truncate" title={product.productModel || ""}>
                {product.productModel || "—"}
              </TableCell>
              <TableCell className="truncate text-right font-semibold tabular-nums">
                {product.price.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0
                })}
              </TableCell>
              <TableCell className="truncate">{product.unit}</TableCell>
              <TableCell className="truncate tabular-nums">
                {new Date(product.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/products/new?edit=${product._id}`}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-cine-primary hover:bg-cine-primary/10"
                  >
                    Edit
                  </Link>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(product._id)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="py-8 text-center text-slate-500 dark:text-slate-400"
              >
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
