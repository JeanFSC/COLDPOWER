import { Clock, ShieldCheck, Truck } from "lucide-react";

const items = [
  {
    icon: Clock,
    label: "Lun - Sáb: 9:00 AM - 6:00 PM",
  },
  {
    icon: Truck,
    label: "Envíos a todo el Perú",
  },
  {
    icon: ShieldCheck,
    label: "Asesoría especializada",
  },
] as const;

export function TopBar() {
  return (
    <div className="bg-dark text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-4 py-2 text-xs font-semibold sm:justify-between lg:px-8">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="hidden items-center gap-2 text-gray-light sm:flex">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          );
        })}

        <div className="flex items-center gap-2 text-gray-light sm:hidden">
          <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Envíos a todo el Perú · Garantía</span>
        </div>
      </div>
    </div>
  );
}
