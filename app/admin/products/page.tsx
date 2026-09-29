"use client";

import { useEffect, useRef, useState } from "react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { categories } from "@/lib/data/categories";
import { Pencil, Trash2, Plus, X, Upload, ChevronLeft, ChevronRight } from "lucide-react";

type FormState = Partial<Product> & { name: string; category: string; price: number };
type ImageItem = { id: string; url: string; file?: File };

const blankForm: FormState = {
  name: "",
  category: categories[0].slug,
  subcategory: "",
  description: "",
  price: 0,
  originalPrice: undefined,
  stock: 0,
  featured: false,
  bestseller: false,
  trending: false,
  newArrival: false,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(load, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...blankForm });
    setImages([]);
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ ...p });
    const existing = [p.image, ...(p.additionalImages ?? [])].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index);
    setImages(existing.map((url, i) => ({ id: `existing-${i}-${url}`, url })));
    setError("");
    setShowForm(true);
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const selected = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    setImages((current) => [
      ...current,
      ...selected.map((file) => ({
        id: `new-${crypto.randomUUID()}`,
        url: URL.createObjectURL(file),
        file,
      })),
    ]);
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function uploadPendingImages() {
    const pending = images.filter((image) => image.file).map((image) => image.file as File);
    if (pending.length === 0) return images.map((image) => image.url);

    const data = new FormData();
    pending.forEach((file) => data.append("files", file));

    const response = await fetch("/api/admin/product-images", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Image upload failed.");

    let uploadedIndex = 0;
    return images.map((image) => {
      if (!image.file) return image.url;
      return result.urls[uploadedIndex++];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const imageUrls = await uploadPendingImages();
      const primaryImage = imageUrls[0] || form.image || "/images/products/placeholder.jpg";
      const additionalImages = imageUrls.slice(1);
      const payload = { ...form, image: primaryImage, additionalImages };

      const response = editing
        ? await fetch(`/api/products/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save product.");

      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="font-display text-2xl sm:text-3xl">Products</h1>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-obsidian">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-bronze">Loading…</p>
      ) : (
        <>
          {/* Mobile / tablet: card list */}
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <div key={p.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-bronze">{p.category}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => openEdit(p)} aria-label="Edit" className="p-1"><Pencil size={16} className="text-bronze" /></button>
                    <button onClick={() => handleDelete(p.id)} aria-label="Delete" className="p-1"><Trash2 size={16} className="text-bronze" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="font-medium">{formatPrice(p.price)}</span>
                  <span className="text-bronze">Stock: {p.stock}</span>
                </div>
                {[p.featured && "Featured", p.bestseller && "Bestseller", p.trending && "Trending", p.newArrival && "New"].filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[p.featured && "Featured", p.bestseller && "Bestseller", p.trending && "Trending", p.newArrival && "New"]
                      .filter(Boolean)
                      .map((flag) => (
                        <span key={flag as string} className="rounded-full bg-blush px-2 py-0.5 text-[11px] text-bronze">{flag}</span>
                      ))}
                  </div>
                )}
              </div>
            ))}
            {products.length === 0 && <p className="text-center text-sm text-bronze py-8">No products yet.</p>}
          </div>

          {/* Desktop / laptop: table */}
          <div className="hidden md:block rounded-2xl border border-line bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-bronze">
                  <th className="p-3">Name</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Flags</th><th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3 text-bronze">{p.category}</td>
                    <td className="p-3">{formatPrice(p.price)}</td>
                    <td className="p-3">{p.stock}</td>
                    <td className="p-3 text-xs text-bronze">
                      {[p.featured && "Featured", p.bestseller && "Bestseller", p.trending && "Trending", p.newArrival && "New"].filter(Boolean).join(", ")}
                    </td>
                    <td className="p-3 flex gap-3">
                      <button onClick={() => openEdit(p)} aria-label="Edit"><Pencil size={15} className="text-bronze hover:text-ink" /></button>
                      <button onClick={() => handleDelete(p.id)} aria-label="Delete"><Trash2 size={15} className="text-bronze hover:text-red-500" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSave} className="w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl">{editing ? "Edit Product" : "Add Product"}</h2>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div><label className="text-xs font-medium">Name</label><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="admin-input" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs font-medium">Category</label><select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="admin-input">{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
                <div><label className="text-xs font-medium">Subcategory</label><input value={form.subcategory ?? ""} onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))} className="admin-input" /></div>
              </div>
              <div><label className="text-xs font-medium">Description</label><textarea value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="admin-input" rows={2} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="text-xs font-medium">Price (Rs.)</label><input type="number" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="admin-input" /></div>
                <div><label className="text-xs font-medium">Original Price</label><input type="number" value={form.originalPrice ?? ""} onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value ? Number(e.target.value) : undefined }))} className="admin-input" /></div>
                <div><label className="text-xs font-medium">Stock</label><input type="number" value={form.stock ?? 0} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} className="admin-input" /></div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Product Images</label>
                  <span className="text-[11px] text-bronze">First image = primary image</span>
                </div>
                <div className="mt-2 rounded-xl border border-dashed border-line bg-ivory/40 p-4">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium hover:border-gold">
                    <Upload size={16} /> Select multiple images
                  </button>
                  <p className="mt-2 text-center text-[11px] text-bronze">JPG, PNG, WEBP or GIF · max 10MB each</p>

                  {images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {images.map((image, index) => (
                        <div key={image.id} className="group relative overflow-hidden rounded-xl border border-line bg-white">
                          <img src={image.url} alt={`Product image ${index + 1}`} className="aspect-square w-full object-cover" />
                          <div className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">{index === 0 ? "Primary" : index + 1}</div>
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between gap-1">
                            <button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} className="rounded-full bg-white/90 p-1 disabled:opacity-30"><ChevronLeft size={14} /></button>
                            <button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} className="rounded-full bg-white/90 p-1 disabled:opacity-30"><ChevronRight size={14} /></button>
                            <button type="button" onClick={() => removeImage(image.id)} className="rounded-full bg-white/90 p-1 text-red-600"><X size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {(["featured", "bestseller", "trending", "newArrival"] as const).map((flag) => (
                  <label key={flag} className="flex items-center gap-2"><input type="checkbox" checked={!!form[flag]} onChange={(e) => setForm((f) => ({ ...f, [flag]: e.target.checked }))} />{flag}</label>
                ))}
              </div>
            </div>

            {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={saving} className="mt-6 w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian disabled:opacity-50">{saving ? "SAVING…" : editing ? "SAVE CHANGES" : "ADD PRODUCT"}</button>
          </form>
          <style jsx global>{`
            .admin-input { width: 100%; border: 1px solid #e4d9ce; border-radius: 0.65rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; margin-top: 0.25rem; }
          `}</style>
        </div>
      )}
    </div>
  );
}
