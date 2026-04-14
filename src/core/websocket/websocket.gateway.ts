import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
  path: "/socket",
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Defer to runtime — allows ConfigService value to be read after DI
      callback(null, true); // overridden in afterInit via server.engine config
    },
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketGateway.name);

  /** Track connected client IDs for diagnostics */
  private readonly connectedClients = new Set<string>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Called once after the WebSocket server is initialised.
   * We patch CORS origin here so it reads the env-based FRONTEND_URL.
   */
  afterInit(server: Server) {
    const allowedOrigin =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:4200";

    // Re-apply CORS origin via adapter opts (socket.io v4+)
    // `opts` is typed as private but is accessible at runtime
    const serverAny = server as any;
    if (serverAny.opts) {
      serverAny.opts.cors = {
        origin: allowedOrigin,
        credentials: true,
      };
    }

    this.logger.log(
      `WebSocket server initialised — CORS origin: ${allowedOrigin}`,
    );
  }

  /**
   * Authenticate the socket connection using the JWT from cookies or auth header.
   * Unauthenticated clients are disconnected immediately.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (token) {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>("JWT_SECRET"),
        });
        const userId = payload.sub ?? payload.id;
        if (userId) {
          client.join(userId);
        }

        this.logger.log(
          `Client connected: ${client.id} (user: ${userId ?? "unknown"})`,
        );
      } else if (this.isDevBypass()) {
        const userId = "dev-bypass-user-id";
        client.data.user = { id: userId, username: "dev-admin", role: "admin" };
        client.join(userId);
        this.logger.warn(`Client connected (dev-bypass): ${client.id}`);
      } else {
        this.logger.warn(`Unauthenticated client rejected: ${client.id}`);
        client.disconnect(true);
        return;
      }

      this.connectedClients.add(client.id);
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} failed auth: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Emit helpers ──────────────────────────────────────────

  /** Broadcast an event to ALL connected clients. */
  broadcast<T = unknown>(event: string, data: T): void {
    this.server.emit(event, data);
  }

  /** Send an event to a specific client by socket ID. */
  sendToClient<T = unknown>(clientId: string, event: string, data: T): void {
    this.server.to(clientId).emit(event, data);
  }

  /** Send an event to all clients in a given room. */
  sendToRoom<T = unknown>(room: string, event: string, data: T): void {
    this.server.to(room).emit(event, data);
  }

  /** Get the current number of connected clients. */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }

  // ─── Private helpers ───────────────────────────────────────

  /**
   * Extract JWT from cookie (`access_token`) or `Authorization` header.
   */
  private extractToken(client: Socket): string | null {
    // 1. Try cookie (HttpOnly cookie auth)
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const match = cookies.match(/access_token=([^;]+)/);
      if (match?.[1]) return match[1];
    }

    // 2. Try Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    // 3. Try query param (useful for testing)
    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === "string" && queryToken) {
      return queryToken;
    }

    return null;
  }

  private isDevBypass(): boolean {
    return (
      this.configService.get<string>("NODE_ENV") === "development" &&
      this.configService.get<string>("BYPASS_AUTH") === "true"
    );
  }
}
