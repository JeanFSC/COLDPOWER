"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

const TYPES = [
  { value: "STORE", label: "Tienda" },
  { value: "WAREHOUSE", label: "Almacén" },
  { value: "STORE_WAREHOUSE", label: "Tienda y almacén" },
] as const;

const inputClass = "h-9 rounded-md border border-[#dce6ee] bg-white px-2.5 text-[11px] font-semibold text-[#304b66] outline-none focus:border-[#2277ee]";

export function NewLocationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(TYPES[0].value);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/inventario/locales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name, type, city, address }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo crear el local.");
      setCode(""); setName(""); setCity(""); setAddress(""); setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el local.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Nuevo local
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Cerrar" />
          <form onSubmit={create} className="absolute right-0 top-11 z-20 grid w-[300px] gap-2.5 rounded-lg border border-[#dce6ee] bg-white p-3.5 shadow-[0_12px_28px_rgba(16,42,67,0.14)]">
            <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Código<input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="LIM02" maxLength={32} required /></label>
            <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Nombre<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tienda Ate" maxLength={120} required /></label>
            <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Tipo
              <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Ciudad<input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lima" maxLength={120} /></label>
            <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">Dirección<input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Principal 123" maxLength={240} /></label>
            {error ? <p role="alert" className="text-[10px] font-semibold text-[#b42318]">{error}</p> : null}
            <button type="submit" disabled={busy} className="mt-1 inline-flex h-9 items-center justify-center rounded-lg bg-[#2277ee] text-[11px] font-extrabold text-white disabled:opacity-50">{busy ? "Creando…" : "Crear local"}</button>
          </form>
        </>
      ) : null}
    </div>
  );
}
