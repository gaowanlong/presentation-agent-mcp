import * as http from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { PresentationRuntime } from "../runtime/presentation-runtime.js";
import { registerToolHandlers } from "./tools.js";

/**
 * Starts an HTTP + SSE MCP server for remote / local-network access.
 * GET  /sse   → SSE stream (server → client messages)
 * POST /      → Client messages (JSON-RPC)
 */
export async function startRemoteMcpServer(
  runtime: PresentationRuntime,
  port: number = 3000
): Promise<void> {
  const server = new Server(
    { name: "presentation-agent-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  registerToolHandlers(server, runtime);
  server.onerror = (error: Error) => console.error("[MCP Error]", error);

  let sseResponse: http.ServerResponse | null = null;
  let messageQueue: string[] = [];

  const httpServer = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/sse") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      sseResponse = res;

      // Send endpoint event (where client should POST messages)
      res.write(`event: endpoint\ndata: /\n\n`);

      // Flush any queued messages
      for (const msg of messageQueue) {
        res.write(`data: ${msg}\n\n`);
      }
      messageQueue = [];

      req.on("close", () => { sseResponse = null; });
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body);
          // Forward to MCP server via transport adapter
          if (sseResponse) {
            sseResponse.write(`data: ${JSON.stringify(parsed)}\n\n`);
          }
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  // Use a simple wrapper to connect the Server to the HTTP transport
  // Since the MCP SDK Server expects a Transport interface, we create an adapter
  const transport: any = {
    onmessage: null as any,
    onclose: null as any,
    onerror: null as any,

    async start() {},
    async close() {
      httpServer.close();
    },
    async send(message: any) {
      const data = JSON.stringify(message);
      if (sseResponse) {
        sseResponse.write(`data: ${data}\n\n`);
      } else {
        messageQueue.push(data);
      }
    },
  };

  await server.connect(transport);

  httpServer.listen(port, () => {
    console.error(`[Remote MCP] Server running on http://localhost:${port}`);
    console.error(`  SSE:   http://localhost:${port}/sse`);
    console.error(`  POST:  http://localhost:${port}/`);
  });
}
