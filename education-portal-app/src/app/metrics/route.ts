import { logger } from "@/lib/logger";

function gauge(name: string, help: string, value: number): string {
  return `# HELP ${name} ${help}\n# TYPE ${name} gauge\n${name} ${value}\n`;
}

export async function GET() {
  logger.info("metrics scraped", { path: "/metrics" });
  const mem = process.memoryUsage();
  const body = [
    gauge("process_uptime_seconds",        "Seconds since process started",              process.uptime()),
    gauge("nodejs_heap_used_bytes",        "Heap memory used by the Node.js process",    mem.heapUsed),
    gauge("nodejs_heap_total_bytes",       "Total heap memory allocated",                mem.heapTotal),
    gauge("nodejs_rss_bytes",              "Resident set size",                          mem.rss),
    gauge("nodejs_external_memory_bytes",  "External memory used by C++ objects",        mem.external),
    gauge("nodejs_array_buffers_bytes",    "Memory in ArrayBuffers and SharedArrayBuffers", mem.arrayBuffers ?? 0),
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
