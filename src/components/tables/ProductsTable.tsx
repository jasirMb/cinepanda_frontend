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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Subcategory</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product._id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>{product.subcategory}</TableCell>
              <TableCell>{product.brand || "—"}</TableCell>
              <TableCell>{product.productModel || "—"}</TableCell>
              <TableCell className="font-semibold">
                {product.price.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0
                })}
              </TableCell>
              <TableCell>{product.unit}</TableCell>
              <TableCell>
                {new Date(product.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
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
                className="text-center text-slate-500 dark:text-slate-400"
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
