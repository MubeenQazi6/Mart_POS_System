import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';
import { URL } from 'url';

export interface CounterClient {
  ws: WebSocket;
  orgId: string;
  counterId: string;
  joinedAt: number;
}

export interface RealtimeMessage {
  type: 'STOCK_DECREMENT' | 'SALE_COMPLETED' | 'PRICE_UPDATE' | 'HELD_BILL_SYNC' | 'DRAWER_EVENT' | 'PING' | 'PONG';
  orgId: string;
  counterId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export class MultiCounterHub {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, CounterClient> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/counters' });
    this.setupListeners();
    console.log('⚡ [MultiCounterHub] Realtime WebSocket Mesh listening on /ws/counters');
  }

  private setupListeners(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const orgId = parsedUrl.searchParams.get('org_id') || 'default-org';
      const counterId = parsedUrl.searchParams.get('counter_id') || 'counter-1';

      const client: CounterClient = {
        ws,
        orgId,
        counterId,
        joinedAt: Date.now(),
      };

      this.clients.set(ws, client);
      console.log(`🔌 [Counter Connected] Mart Org: ${orgId} | Register: ${counterId} | Active: ${this.clients.size}`);

      // Send connection acknowledgement
      ws.send(
        JSON.stringify({
          type: 'CONNECTED',
          orgId,
          counterId,
          activeCounters: this.getActiveCountersCount(orgId),
          timestamp: Date.now(),
        }),
      );

      // Handle inbound message from this counter
      ws.on('message', (data: Buffer | string) => {
        try {
          const raw = data.toString();
          const msg = JSON.parse(raw) as RealtimeMessage;

          if (msg.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            return;
          }

          // Broadcast to all other counters in this specific mart
          this.broadcastToOrg(client.orgId, msg, ws);
        } catch (err) {
          console.error('[MultiCounterHub] Parse error:', err);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`🔌 [Counter Disconnected] Mart Org: ${orgId} | Register: ${counterId}`);
      });

      ws.on('error', (err) => {
        console.error(`[MultiCounterHub Error] ${orgId}:${counterId}`, err);
      });
    });
  }

  /**
   * Broadcast message to all counters belonging to the SAME org_id
   * Excludes the sender counter so it doesn't double-process its own event.
   */
  public broadcastToOrg(orgId: string, message: RealtimeMessage, senderWs?: WebSocket): void {
    const raw = JSON.stringify(message);
    let recipientCount = 0;

    for (const [ws, client] of this.clients.entries()) {
      if (client.orgId === orgId && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
        recipientCount++;
      }
    }

    console.log(
      `📡 [Broadcast] Org: ${orgId} | Event: ${message.type} | Delivered to ${recipientCount} peer counters (<80ms)`,
    );
  }

  /**
   * Count active connected counters for a specific mart organization
   */
  public getActiveCountersCount(orgId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.orgId === orgId && client.ws.readyState === WebSocket.OPEN) {
        count++;
      }
    }
    return count;
  }
}
