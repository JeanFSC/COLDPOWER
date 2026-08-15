"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entity = "categories" | "families" | "brands";
type Row = { id: string; name: string; slug: string; active: boolean; categoryId?: string };

const sections: Array<{ entity: Entity; label: string }> = [{ entity: "categories", label: "Categorías" }, { entity: "families", label: "Familias" }, { entity: "brands", label: "Marcas" }];

export function TaxonomyManager({ categories, families, brands }: { categories: Row[]; families: Row[]; brands: Row[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const data: Record<Entity, Row[]> = { categories, families, brands };
  const create = async (entity: Entity, form: HTMLFormElement) => {
    const formData = new FormData(form);
    const response = await fetch(`/api/admin/taxonomia?entity=${entity}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData)) });
    const result = await response.json();
    setMessage(response.ok ? `${entity} actualizado.` : result.error || "No se pudo guardar.");
    if (response.ok) { form.reset(); router.refresh(); }
  };
  const toggle = async (entity: Entity, row: Row) => {
    const response = await fetch(`/api/admin/taxonomia/${entity}/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !row.active }) });
    setMessage(response.ok ? "Estado actualizado." : "No se pudo actualizar el estado.");
    if (response.ok) router.refresh();
  };
  return <div className="mt-8 grid gap-6">{message ? <p role="status" className="rounded-md border border-border bg-white px-4 py-3 text-sm font-bold text-dark">{message}</p> : null}{sections.map(({ entity, label }) => <section key={entity} className="rounded-md border border-border bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-xl font-black text-dark">{label}</h2><p className="mt-1 text-sm text-gray-text">Gestiona el catálogo editorial sin borrar la fuente importada.</p></div><form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void create(entity, event.currentTarget); }}><input name="name" required minLength={2} placeholder={`Nueva ${label.slice(0, -1).toLowerCase()}`} className="h-10 rounded-md border border-border px-3 text-sm" /><input name="slug" placeholder="slug opcional" className="h-10 rounded-md border border-border px-3 text-sm" />{entity === "families" ? <select name="categoryId" required className="h-10 rounded-md border border-border px-3 text-sm"><option value="">Categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : null}<button type="submit" className="h-10 rounded-md bg-dark px-4 text-sm font-bold text-white">Agregar</button></form></div><div className="mt-4 grid gap-2">{data[entity].map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"><div><p className="font-bold text-dark">{row.name}</p><p className="text-xs text-gray-text">/{row.slug}{row.categoryId ? ` · ${categories.find((category) => category.id === row.categoryId)?.name || "Categoría"}` : ""}</p></div><button type="button" onClick={() => void toggle(entity, row)} className="rounded-pill border border-border px-3 py-1.5 text-xs font-bold text-dark">{row.active ? "Desactivar" : "Activar"}</button></div>)}</div></section>)}</div>;
}
