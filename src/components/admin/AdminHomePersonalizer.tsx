"use client";

import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Save, Settings2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";

export type HomePersonalizationOption = {
  id: string;
  label: string;
  detail?: string;
};

function uniqueAllowed(values: string[], options: HomePersonalizationOption[]) {
  const allowed = new Set(options.map((option) => option.id));
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

function completeOrder(values: string[], options: HomePersonalizationOption[]) {
  const selected = uniqueAllowed(values, options);
  return [
    ...selected,
    ...options.map((option) => option.id).filter((id) => !selected.includes(id)),
  ];
}

export function AdminHomePersonalizer({
  favorites,
  quickActions,
  widgetOrder,
  favoriteOptions,
  quickActionOptions,
  widgetOptions,
}: {
  favorites: string[];
  quickActions: string[];
  widgetOrder: string[];
  favoriteOptions: HomePersonalizationOption[];
  quickActionOptions: HomePersonalizationOption[];
  widgetOptions: HomePersonalizationOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draftFavorites, setDraftFavorites] = useState<string[]>([]);
  const [draftQuickActions, setDraftQuickActions] = useState<string[]>([]);
  const [draftWidgetOrder, setDraftWidgetOrder] = useState<string[]>([]);

  function openPersonalizer() {
    setDraftFavorites(uniqueAllowed(favorites, favoriteOptions));
    setDraftQuickActions(
      uniqueAllowed(quickActions, quickActionOptions).length
        ? uniqueAllowed(quickActions, quickActionOptions)
        : quickActionOptions.map((option) => option.id),
    );
    setDraftWidgetOrder(completeOrder(widgetOrder, widgetOptions));
    setMessage(null);
    setOpen(true);
  }

  function toggleValue(value: string, selected: string[], setSelected: (next: string[]) => void) {
    setSelected(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );
  }

  function moveWidget(id: string, direction: -1 | 1) {
    setDraftWidgetOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function resetDraft() {
    setDraftFavorites([]);
    setDraftQuickActions(quickActionOptions.map((option) => option.id));
    setDraftWidgetOrder(widgetOptions.map((option) => option.id));
    setMessage("Vista restablecida. Guarda para aplicar los cambios.");
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/inicio/preferencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favorites: draftFavorites,
          quickActions: draftQuickActions,
          widgetOrder: draftWidgetOrder,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "No se pudieron guardar las preferencias.",
        );
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudieron guardar las preferencias.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPersonalizer}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]"
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        Personalizar vista
      </button>
      <AdminDrawer
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        title="Personalizar inicio"
        size="wide"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-semibold text-[#71869c]" aria-live="polite">
              {message ?? "Los cambios se guardan solo para tu espacio de trabajo."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetDraft}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#526b84] hover:border-[#2277ee] hover:text-[#2277ee] disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Restablecer
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2277ee] px-3.5 text-[10px] font-extrabold text-white shadow-[0_5px_12px_rgba(34,119,238,0.16)] hover:bg-[#1764d2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {busy ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-[#e2eaf1] bg-[#fbfcfd] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-extrabold text-[#102a43]">Módulos frecuentes</h3>
                <p className="mt-1 text-[10px] font-semibold leading-4 text-[#71869c]">
                  Elige los módulos que aparecerán primero en tu inicio.
                </p>
              </div>
              <Star className="h-4 w-4 text-[#2277ee]" aria-hidden="true" />
            </div>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Módulos frecuentes disponibles</legend>
              {favoriteOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#e7eef4] bg-white px-3 py-2.5 text-[11px] font-extrabold text-[#304b66] hover:border-[#b9d2eb]"
                >
                  <input
                    type="checkbox"
                    checked={draftFavorites.includes(option.id)}
                    onChange={() => toggleValue(option.id, draftFavorites, setDraftFavorites)}
                    className="h-4 w-4 accent-[#2277ee]"
                  />
                  <span className="flex-1">{option.label}</span>
                  {option.detail ? (
                    <span className="text-[9px] font-semibold text-[#9aabba]">{option.detail}</span>
                  ) : null}
                </label>
              ))}
            </fieldset>
          </section>

          <section className="rounded-xl border border-[#e2eaf1] bg-[#fbfcfd] p-4">
            <div>
              <h3 className="text-[13px] font-extrabold text-[#102a43]">Accesos rápidos</h3>
              <p className="mt-1 text-[10px] font-semibold leading-4 text-[#71869c]">
                Mantén a mano las tareas que ejecutas con más frecuencia.
              </p>
            </div>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Accesos rápidos disponibles</legend>
              {quickActionOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#e7eef4] bg-white px-3 py-2.5 text-[11px] font-extrabold text-[#304b66] hover:border-[#b9d2eb]"
                >
                  <input
                    type="checkbox"
                    checked={draftQuickActions.includes(option.id)}
                    onChange={() => toggleValue(option.id, draftQuickActions, setDraftQuickActions)}
                    className="h-4 w-4 accent-[#2277ee]"
                  />
                  <span className="flex-1">{option.label}</span>
                  {option.detail ? (
                    <span className="text-[9px] font-semibold text-[#9aabba]">{option.detail}</span>
                  ) : null}
                </label>
              ))}
            </fieldset>
          </section>
        </div>

        <section className="mt-5 rounded-xl border border-[#e2eaf1] bg-[#fbfcfd] p-4">
          <div>
            <h3 className="text-[13px] font-extrabold text-[#102a43]">Orden de widgets</h3>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-[#71869c]">
              Reordena los bloques del inicio con controles accesibles.
            </p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {draftWidgetOrder.map((id, index) => {
              const option = widgetOptions.find((item) => item.id === id);
              if (!option) return null;
              return (
                <div
                  key={option.id}
                  className="flex items-center gap-2 rounded-lg border border-[#e7eef4] bg-white px-3 py-2.5"
                >
                  <GripVertical className="h-4 w-4 text-[#9aabba]" aria-hidden="true" />
                  <span className="flex-1 text-[11px] font-extrabold text-[#304b66]">
                    {option.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveWidget(id, -1)}
                    disabled={busy || index === 0}
                    aria-label={`Subir ${option.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#526b84] hover:bg-[#e8f1ff] hover:text-[#2277ee] disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(id, 1)}
                    disabled={busy || index === draftWidgetOrder.length - 1}
                    aria-label={`Bajar ${option.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#526b84] hover:bg-[#e8f1ff] hover:text-[#2277ee] disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </AdminDrawer>
    </>
  );
}
