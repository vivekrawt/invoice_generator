"use client";

import * as React from "react";
import {
  Package,
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, jsonBody } from "@/lib/api-client";
import {
  PRODUCT_CATEGORIES,
} from "@/lib/constants/products-seed";
import type { Product } from "@/types/database.types";

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [seeding, setSeeding] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    category: PRODUCT_CATEGORIES[0] as string,
    product_name: "",
    description: "",
  });
  const [saving, setSaving] = React.useState(false);

  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      setProducts(await apiRequest<Product[]>("/api/data/products"));
    } catch (err: unknown) {
      console.error("Error fetching products:", err);
      setMessage({
        text: err instanceof Error ? `Products could not be loaded: ${err.message}` : "Products could not be loaded.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Seed / Sync brochure items to the Supabase catalogue.
  const handleSeedBrochure = async () => {
    try {
      setSeeding(true);
      setMessage(null);
      const { count } = await apiRequest<{ count: number }>("/api/data/products", {
        method: "POST",
        body: jsonBody({ action: "sync-brochure" }),
      });

      setMessage({
        text: `Successfully synchronized ${count} catalogue products from the brochure!`,
        type: "success",
      });
      await fetchProducts();
    } catch (err: unknown) {
      console.error("Error seeding products:", err);
      setMessage({
        text: err instanceof Error ? `Could not sync the catalogue: ${err.message}` : "Could not sync the catalogue.",
        type: "error",
      });
    } finally {
      setSeeding(false);
    }
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData({
      category: PRODUCT_CATEGORIES[0],
      product_name: "",
      description: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      category: prod.category,
      product_name: prod.product_name,
      description: prod.description || "",
    });
    setDialogOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name.trim()) return;

    try {
      setSaving(true);
      const payload = {
        category: formData.category,
        product_name: formData.product_name.trim(),
        description: formData.description.trim() || null,
      };

      if (editingProduct) {
        const saved = await apiRequest<Product>(`/api/data/products/${editingProduct.id}`, {
          method: "PUT",
          body: jsonBody(payload),
        });
        setProducts((prev) => prev.map((product) => product.id === saved.id ? saved : product));
        setMessage({ text: "Product updated successfully.", type: "success" });
      } else {
        const saved = await apiRequest<Product>("/api/data/products", {
          method: "POST",
          body: jsonBody(payload),
        });
        setProducts((prev) => [saved, ...prev]);
        setMessage({ text: "New product added to catalogue.", type: "success" });
      }

      setDialogOpen(false);
    } catch (err: unknown) {
      console.error("Error saving product:", err);
      setMessage({
        text: err instanceof Error ? `Product could not be saved: ${err.message}` : "Product could not be saved.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setSaving(true);
      await apiRequest(`/api/data/products/${productToDelete.id}`, { method: "DELETE" });

      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setMessage({ text: "Product removed from catalogue.", type: "success" });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (err) {
      console.error("Error deleting product:", err);
      setMessage({
        text: err instanceof Error ? `Product could not be deleted: ${err.message}` : "Product could not be deleted.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filtered Products
  const filteredProducts = React.useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory =
        selectedCategory === "ALL" || prod.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        prod.product_name.toLowerCase().includes(q) ||
        (prod.description && prod.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Products Catalogue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Prepopulated with official ABIRA Enterprises brochure specifications. Prices are entered dynamically per invoice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedBrochure}
            disabled={seeding}
            className="text-xs gap-1.5 border-slate-300"
            title="Import/Reset all 70+ items from the brochure"
          >
            {seeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
            )}
            <span>Sync Brochure Items</span>
          </Button>
          <Button
            size="sm"
            onClick={openAddDialog}
            className="text-xs gap-1.5 bg-[#0b1f3a] hover:bg-[#132c50]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Alert / Notice Message */}
      {message && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs underline ml-2 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pricing Policy Reminder Banner */}
      <div className="p-3 rounded-md bg-slate-100/90 border border-slate-200/80 flex items-start gap-2 text-xs text-slate-700">
        <Sparkles className="h-4 w-4 text-[#0b1f3a] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Standard Catalogue Rules: </span>
          Fixed prices are omitted from the catalogue. Pricing is entered manually during invoice generation to accommodate volume discounts and client customization. Custom products can also be entered during invoice creation.
        </div>
      </div>

      {/* Filters and Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products by name or specification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Category Chips Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-thin">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Category:
            </span>
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "ALL"
                  ? "bg-[#0b1f3a] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All ({products.length})
            </button>
            {PRODUCT_CATEGORIES.map((cat) => {
              const count = products.filter((p) => p.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-[#0b1f3a] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Products Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              {selectedCategory === "ALL" ? "All Products" : selectedCategory}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Showing {filteredProducts.length} item(s) matching criteria
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span>Loading catalogue items...</span>
            </div>
          ) : filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((prod, idx) => (
                  <TableRow key={prod.id}>
                    <TableCell className="text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 text-xs sm:text-sm">
                      {prod.product_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium tracking-wide uppercase"
                      >
                        {prod.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-500 max-w-md truncate">
                      {prod.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(prod)}
                          className="h-7 w-7 text-slate-600 hover:text-slate-900"
                          title="Edit Product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setProductToDelete(prod);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-red-700 hover:bg-red-50"
                          title="Delete Product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No products found</p>
              <p className="text-slate-400 mt-0.5">
                Try adjusting your search query or category filter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Catalogue Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              Catalogue items are standardized templates. Unit rates are specified when issuing an invoice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                required
                placeholder="e.g. 5-Ply Corrugated Heavy Carton"
                value={formData.product_name}
                onChange={(e) =>
                  setFormData({ ...formData, product_name: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Specification / Description (Optional)</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Technical specifications, dimensions, ply count, or finish details..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#0b1f3a] hover:bg-[#132c50]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : editingProduct ? (
                  "Update Product"
                ) : (
                  "Add to Catalogue"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Remove Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{productToDelete?.product_name}</strong> from the active catalogue?
              This will not affect historical invoices already generated.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={saving}
            >
              {saving ? "Removing..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
