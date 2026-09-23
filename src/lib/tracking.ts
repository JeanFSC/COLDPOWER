import { commerceConfig } from "@/lib/env";

export type ShipmentStatus = "LABEL_CREATED" | "PICKED_UP" | "IN_TRANSIT" | "AT_AGENCY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION";
export type ShippableMethod = "DELIVERY" | "SHIPPING";
export type TrackingEvent = { providerEventId: string; status: ShipmentStatus; description: string; location: string | null };
export type CreatedShipment = { carrier: string; trackingNumber: string; trackingUrl: string | null; estimatedDeliveryAt: Date | null; initialEvent: TrackingEvent };

export interface TrackingProvider {
  readonly name: string;
  createShipment(input: { orderCode: string; method: ShippableMethod; destination: string | null }): Promise<CreatedShipment>;
  // The next courier event after `current`, or null when only the final delivery remains
  // (that one is recorded when staff marks the order as delivered).
  nextEvent(input: { method: ShippableMethod; current: ShipmentStatus; trackingNumber: string; destination: string | null }): TrackingEvent | null;
  deliveredEvent(input: { method: ShippableMethod; trackingNumber: string; destination: string | null }): TrackingEvent;
}

const sequences: Record<ShippableMethod, ShipmentStatus[]> = {
  DELIVERY: ["LABEL_CREATED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"],
  SHIPPING: ["LABEL_CREATED", "PICKED_UP", "IN_TRANSIT", "AT_AGENCY", "DELIVERED"],
};

const descriptions: Record<ShipmentStatus, string> = {
  LABEL_CREATED: "Envío registrado y etiqueta generada",
  PICKED_UP: "Paquete recogido por el transportista",
  IN_TRANSIT: "En tránsito hacia la ciudad de destino",
  AT_AGENCY: "Disponible para recojo en la agencia de destino",
  OUT_FOR_DELIVERY: "En reparto hacia la dirección de entrega",
  DELIVERED: "Entregado",
  EXCEPTION: "Incidencia en el envío",
};

// Simulated courier for development/preview: realistic event sequence, clearly labelled as a
// test carrier. Replace with a real provider behind the same interface.
export class MockTrackingProvider implements TrackingProvider {
  readonly name = "mock";

  async createShipment(input: { orderCode: string; method: ShippableMethod; destination: string | null }): Promise<CreatedShipment> {
    const trackingNumber = `CP-TRK-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    const days = input.method === "DELIVERY" ? 2 : 5;
    return {
      carrier: input.method === "DELIVERY" ? "Reparto ColdPower (simulado)" : "Agencia de transporte (simulado)",
      trackingNumber,
      trackingUrl: null,
      estimatedDeliveryAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      initialEvent: { providerEventId: `${trackingNumber}:LABEL_CREATED`, status: "LABEL_CREATED", description: descriptions.LABEL_CREATED, location: "Almacén ColdPower" },
    };
  }

  nextEvent(input: { method: ShippableMethod; current: ShipmentStatus; trackingNumber: string; destination: string | null }): TrackingEvent | null {
    const sequence = sequences[input.method];
    const next = sequence[sequence.indexOf(input.current) + 1];
    if (!next || next === "DELIVERED") return null;
    const location = next === "PICKED_UP" ? "Almacén ColdPower" : input.destination;
    return { providerEventId: `${input.trackingNumber}:${next}`, status: next, description: descriptions[next], location };
  }

  deliveredEvent(input: { method: ShippableMethod; trackingNumber: string; destination: string | null }): TrackingEvent {
    return { providerEventId: `${input.trackingNumber}:DELIVERED`, status: "DELIVERED", description: descriptions.DELIVERED, location: input.destination };
  }
}

export function getTrackingProvider(): TrackingProvider | null {
  return commerceConfig.trackingProvider === "mock" ? new MockTrackingProvider() : null;
}

export const shipmentStatusLabels = descriptions;
