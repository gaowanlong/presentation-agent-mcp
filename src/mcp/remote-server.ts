import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { PresentationRuntime } from "../runtime/presentation-runtime.js";
import { registerToolHandlers } from "./tools.js";

const EXPORTS_DIR = path.resolve(process.cwd(), "data", "exports");
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";

function authCheck(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!AUTH_TOKEN) return true;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== AUTH_TOKEN) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return false;
  }
  return true;
}

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

  // Set host:port for download URLs
  runtime.setHostPort(`localhost:${port}`);

  let sseResponse: http.ServerResponse | null = null;
  let messageQueue: string[] = [];

  const transport: any = {
    onmessage: null as any,
    onclose: null as any,
    onerror: null as any,
    async start() {},
    async close() { httpServer.close(); },
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

  const httpServer = http.createServer(async (req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

    const url = req.url || "";
    const pathname = url.split("?")[0];

    // ── Auth ─────────────────────────────────────────────────────
    if (pathname !== "/health" && !authCheck(req, res)) return;

    // ── /health ──────────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        version: "0.4.0",
        provider: "presentation-agent-mcp",
        remote: true,
      }));
      return;
    }

    // ── /artifacts/:id ──────────────────────────────────────────
    if (req.method === "GET" && pathname.startsWith("/artifacts/")) {
      const artifactId = pathname.replace("/artifacts/", "");
      const pptxPath = path.join(EXPORTS_DIR, `${artifactId}.pptx`);
      const pdfPath = path.join(EXPORTS_DIR, `${artifactId}.pdf`);

      let filePath: string | null = null;
      if (fs.existsSync(pptxPath)) filePath = pptxPath;
      else if (fs.existsSync(pdfPath)) filePath = pdfPath;

      if (!filePath) {
        res.writeHead(404); res.end("Not Found");
        return;
      }

      const ext = path.extname(filePath);
      const contentType = ext === ".pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": stat.size,
        "Content-Disposition": `attachment; filename="${artifactId}${ext}"`,
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // ── SSE ──────────────────────────────────────────────────────
    if (req.method === "GET" && pathname === "/sse") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      sseResponse = res;
      res.write(`event: endpoint\ndata: /\n\n`);
      for (const msg of messageQueue) { res.write(`data: ${msg}\n\n`); }
      messageQueue = [];
      req.on("close", () => { sseResponse = null; });
      return;
    }

    // ── POST / (JSON-RPC messages) ─────────────────────────────
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (transport.onmessage) {
            transport.onmessage(parsed);
          }
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, queued: true }));
        } catch (err: any) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404); res.end("Not Found");
  });

  httpServer.listen(port, () => {
    console.error(`[Remote MCP v0.4] Server running on http://localhost:${port}`);
    console.error(`  SSE:   http://localhost:${port}/sse`);
    console.error(`  POST:  http://localhost:${port}/`);
    console.error(`  Health: http://localhost:${port}/health`);
    console.error(`  Download: http://localhost:${port}/artifacts/:id`);
    if (AUTH_TOKEN) console.error(`  Auth: Bearer token enabled`);
  });
}
