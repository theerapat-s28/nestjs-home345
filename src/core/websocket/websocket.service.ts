import { Injectable, Logger } from "@nestjs/common";
import { WebsocketGateway } from "./websocket.gateway";

/* sendToUser() vs sendToClient()
Both ultimately call server.to(id).emit(event, data) at the gateway level, 
but the id they target is fundamentally different:

sendToClient(clientId, event, data)
  - Calls gateway.sendToClient() → server.to(clientId).emit(...)
  - The clientId is a Socket.io socket ID (e.g., "abc123xyz") — a unique, ephemeral identifier assigned to each individual WebSocket connection.
  - Targets exactly one browser tab / connection.
  - If the user has 3 tabs open, each tab has a different client.id. Calling sendToClient with one of those IDs only reaches that single tab.

sendToUser(userId, event, data)
  - Calls gateway.sendToRoom() → server.to(room).emit(...)
  - The userId is your application-level user ID (e.g., a UUID from the database).
  - This works because in handleConnection(), every authenticated socket is joined to a room named after its userId via client.join(userId).
  - Targets all connections belonging to that user — if the user has 3 tabs open, all 3 receive the event.
*/

/** In Socket.io terminology, a "client" is a single WebSocket
    connection (i.e., one browser tab or device connection), 
    not the user themselves. Each tab gets its own unique client.id (socket ID). 
    A single user can have multiple clients if they have multiple tabs/devices open. */

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  constructor(private readonly gateway: WebsocketGateway) {}

  // ─── High-level notification helpers ───────────────────────

  /** Broadcast a `notification` event to all connected clients. */
  notifyAll(message: string): void {
    this.gateway.broadcast("notification", { message });
  }

  /** Send a `notification` event to a specific client. */
  notifyUser(clientId: string, message: string): void {
    this.gateway.sendToClient(clientId, "notification", { message });
  }

  /** Send an event to a specific user (via their user-room). */
  sendToUser<T = unknown>(userId: string, event: string, data: T): void {
    this.gateway.sendToRoom(userId, event, data);
  }

  // ─── Generic emit helpers ──────────────────────────────────

  /** Broadcast any event with a typed payload to all clients. */
  broadcast<T = unknown>(event: string, data: T): void {
    this.gateway.broadcast(event, data);
  }

  /** Send any event with a typed payload to a specific client. */
  sendToClient<T = unknown>(clientId: string, event: string, data: T): void {
    this.gateway.sendToClient(clientId, event, data);
  }

  /** Send any event with a typed payload to all clients in a room. */
  sendToRoom<T = unknown>(room: string, event: string, data: T): void {
    this.gateway.sendToRoom(room, event, data);
  }

  /** Get the current number of connected clients. */
  getConnectedCount(): number {
    return this.gateway.getConnectedCount();
  }
}
