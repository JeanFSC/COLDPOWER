import assert from "node:assert/strict";
import test from "node:test";
import { publishNotificationConfirmation } from "../src/components/admin/useConfirmedNotifications";

test("confirmed notification event carries persisted states and exact counters", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const target = new EventTarget();
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  const events: CustomEvent[] = [];
  target.addEventListener("coldpower:notification-confirmed", (event) => events.push(event as CustomEvent));
  try {
    publishNotificationConfirmation({ notification: { id: "qa", state: "READ", readAt: "2026-10-07T13:00:00Z", dismissedAt: null }, unreadCount: 0, globalUnreadCount: 42 });
    assert.equal(events.length, 1);
    assert.equal(events[0].detail.unreadCount, 0);
    assert.equal(events[0].detail.globalUnreadCount, 42);
    assert.equal(events[0].detail.notifications[0].readAt.toISOString(), "2026-10-07T13:00:00.000Z");
    assert.throws(() => publishNotificationConfirmation({ notification: { id: "qa", state: "UNKNOWN" } }));
    assert.throws(() => publishNotificationConfirmation({ notification: { id: "qa", state: "READ", readAt: "invalid" } }));
    assert.equal(events.length, 1, "invalid responses must not update any view");
    publishNotificationConfirmation({ notifications: [{ id: "qa", state: "UNREAD", readAt: null, dismissedAt: null }] });
    assert.equal(events[1].detail.notifications[0].state, "UNREAD");
    assert.equal(events[1].detail.unreadCount, undefined, "missing counters must not invent zero");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
