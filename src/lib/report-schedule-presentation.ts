export function reportExecutionPresentation(configured: boolean) {
  return configured
    ? { label: "Programaciones guardadas", warning: null, classes: "bg-blue-50 text-blue-700" }
    : {
        label: "Ejecución no habilitada",
        warning: "La entrega automática no está habilitada en este entorno. Puedes guardar una programación, pero aún no se entregará en tu inbox interno.",
        classes: "bg-amber-50 text-amber-800",
      };
}
