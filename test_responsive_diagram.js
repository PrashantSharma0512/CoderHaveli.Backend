const fs = require('fs');
const path = require('path');
const {
    renderResponsiveDiagram,
    renderTierNode,
    renderFlowConnector,
    renderBranchTier,
    convertTextFlowToResponsiveHtml,
    enhanceHtmlWithResponsiveDiagrams
} = require('./utils/responsiveDiagram');
const systemDesignTopics = require('./configs/systemDesignTopics.configs');

// Create sample System Design Architecture Diagram
const systemDesignDiagram = renderResponsiveDiagram({
    title: "System Design Topology: Distributed Rate Limiter",
    nodes: [
        {
            type: "node",
            tierLabel: "[ TIER 1: CLIENT INGRESS ]",
            protocolBadge: "HTTPS / HTTP/2",
            title: "Distributed Clients (Web & Mobile Apps)",
            description: "50,000+ RPS burst ingress. Attaches idempotency key & JWT authorization bearer token."
        },
        {
            type: "connector",
            label: "↓ [ AWS ALB: Layer 7 Routing & TLS Termination (P99 < 1.8ms) ]"
        },
        {
            type: "node",
            tierLabel: "[ TIER 2: EDGE RATE LIMITER GATEWAY ]",
            protocolBadge: "EXPRESS / FASTIFY",
            title: "Node.js API Gateway & Rate Limit Middleware",
            description: "Extracts client IP / user ID. Dispatches atomic Redis Lua script EVALSHA for token bucket."
        },
        {
            type: "connector",
            label: "↓ [ Atomic Token Bucket Evaluation in Redis Cluster ]"
        },
        {
            type: "branch",
            leftBranch: {
                label: "[ PATH A: TOKENS >= 1 (ALLOW 96.4%) ]",
                title: "Node.js Microservices Cluster",
                desc: "Executes business logic, queries database read replicas & returns HTTP 200 OK.",
                badge: "FAST PATH"
            },
            rightBranch: {
                label: "[ PATH B: TOKENS < 1 (REJECT 3.6%) ]",
                title: "HTTP 429 Too Many Requests",
                desc: "Instant early return with Retry-After: 60s header. Zero downstream database load.",
                badge: "FAIL FAST"
            }
        },
        {
            type: "connector",
            label: "↓ [ State Persistence & Replication ]"
        },
        {
            type: "node",
            tierLabel: "[ TIER 3: DISTRIBUTED STORAGE & EVENT LOG ]",
            protocolBadge: "POSTGRESQL + KAFKA",
            title: "Multi-Region Distributed Primary & Replication",
            description: "Writes to primary with synchronous commit; asynchronous WAL replication to regional read replicas."
        }
    ],
    asciiFallback: `┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ HTTP Client │ ────> │  Load Balancer  │ ────> │   API Gateway   │
└─────────────┘       └─────────────────┘       └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ Rate Limiter MW │
                                                └────────┬────────┘
                                                         │
                                      ┌──────────────────┴──────────────────┐
                                      ▼                                     ▼
                         ┌─────────────────────────┐           ┌─────────────────────────┐
                         │ Redis (Lua Token Bucket)│           │   Node.js Microservice  │
                         │ [Tokens >= 1?]          │ ──YES───> │  [Executes Controller]  │
                         └────────────┬────────────┘           └─────────────────────────┘
                                      │
                                   NO │ (Limit Exceeded)
                                      ▼
                         ┌─────────────────────────┐
                         │ HTTP 429 Too Many Req   │
                         │ Retry-After: 60s        │
                         └─────────────────────────┘`
});

// Create sample Node.js Event Loop Execution Pipeline Diagram
const nodeJsPipelineDiagram = renderResponsiveDiagram({
    title: "Node.js Engine State & Event Loop Execution Flow",
    nodes: [
        {
            type: "node",
            tierLabel: "[ STAGE 1: V8 JIT COMPILER ]",
            protocolBadge: "V8 ENGINE",
            title: "V8 Synchronous Call Stack",
            description: "Executes top-level synchronous JavaScript code until the call stack is completely empty."
        },
        {
            type: "connector",
            label: "↓ [ Synchronous Frame Finishes Execution ]"
        },
        {
            type: "node",
            tierLabel: "[ STAGE 2: HIGHEST PRIORITY MICROTASKS ]",
            protocolBadge: "MICROTASKS",
            title: "process.nextTick() & Promise.then() Queues",
            description: "Drains completely between every tick and before Libuv advances to the next event loop phase."
        },
        {
            type: "connector",
            label: "↓ [ Microtask Queue Empties • Enters Libuv Event Loop ]"
        },
        {
            type: "node",
            tierLabel: "[ STAGE 3: LIBUV EVENT LOOP PHASES ]",
            protocolBadge: "C++ LIBUV",
            title: "Timers → Pending I/O → Poll → Check (setImmediate) → Close",
            description: "Non-blocking OS asynchronous I/O multiplexed via epoll (Linux) / kqueue (macOS) / IOCP (Windows)."
        },
        {
            type: "connector",
            label: "↓ [ CPU Intensive Tasks / Sync File I/O Offloaded ]"
        },
        {
            type: "node",
            tierLabel: "[ STAGE 4: OFF-THREAD WORKER POOL ]",
            protocolBadge: "UV_THREADPOOL",
            title: "Libuv Worker Thread Pool (crypto, zlib, fs, dns)",
            description: "Pool of 4 OS threads handles synchronous blocking operations without choking the single JS main thread."
        }
    ],
    asciiFallback: `┌─────────────────────────────────────────────────────────────────┐
│                     Node.js V8 Call Stack                       │
│  [Synchronous Code Executes Here until stack is empty]          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. microtask: process.nextTick() Queue (Highest Priority)       │
├─────────────────────────────────────────────────────────────────┤
│ 2. microtask: Promise.then() / async-await Microtask Queue      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               Libuv Event Loop Iteration Phases                 │
│  Phase 1: Timers (setTimeout, setInterval)                      │
│  Phase 2: Pending I/O Callbacks (OS socket/disk errors)         │
│  Phase 3: Idle / Prepare (Internal Libuv housekeeping)          │
│  Phase 4: Poll (Calculates poll timeout, executes I/O callbacks)│
│  Phase 5: Check (setImmediate() runs immediately after I/O)     │
│  Phase 6: Close Callbacks (socket.on('close'))                  │
└────────────────────────────────┬────────────────────────────────┘`
});

// Full complete email template simulation
const fullEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoderHaveli Engineering — Distributed Rate Limiter & Node.js Event Loop</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 640px; margin: 20px auto; background-color: #FFFFFF; border: 1px solid #E8D79A; border-top: 5px solid #D4AF37; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
    
    <!-- Header -->
    <div style="padding: 24px 20px; text-align: center; border-bottom: 1px solid #E8D79A; background-color: #FFFFFF;">
      <div style="font-family: 'Consolas', monospace; font-size: 11px; font-weight: 700; color: #A67C00; letter-spacing: 1.5px; text-transform: uppercase;">
        CoderHaveli Engineering Masterclass
      </div>
      <h1 style="margin: 8px 0 4px; font-size: 24px; font-weight: 800; color: #222222;">
        System Design &amp; Node.js Edition
      </h1>
      <div style="font-size: 12px; color: #8A8170;">
        Issue #42 • Thursday, October 30, 2026 • 8 Min Read
      </div>
    </div>

    <!-- Content Body -->
    <div style="padding: 24px 20px;">

      <!-- SECTION 1 -->
      <div style="margin-bottom: 30px;">
        <div style="display: inline-block; padding: 2px 8px; background: #FFF9E8; color: #A67C00; border: 1px solid #E8D79A; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; font-family: monospace;">
          Section 1: Architecture Blueprint
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #222222; margin: 8px 0 12px;">
          Distributed Rate Limiting with Redis Token Bucket &amp; Edge Gateways
        </h2>
        <p style="font-size: 13.5px; line-height: 1.6; color: #444444; margin-bottom: 14px;">
          At high concurrency (50,000+ RPS), local in-memory rate limiting fails across multi-instance clusters. By offloading token bucket evaluation to Redis via atomic Lua scripts, we achieve single-digit millisecond latency while guarding against distributed DDoS and rogue scrapers.
        </p>

        <!-- DIAGRAM 1: Responsive HTML System Design Diagram -->
        ${systemDesignDiagram}

        <p style="font-size: 13.5px; line-height: 1.6; color: #444444;">
          Notice how the architecture gracefully separates the high-velocity fast path (cached Redis in-memory lookup) from the slow path, protecting our primary relational databases from cascade outages during flash traffic spikes.
        </p>
      </div>

      <!-- SECTION 2 -->
      <div style="margin-bottom: 30px; border-top: 1px dashed #E8D79A; padding-top: 24px;">
        <div style="display: inline-block; padding: 2px 8px; background: #FFF9E8; color: #A67C00; border: 1px solid #E8D79A; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; font-family: monospace;">
          Section 2: Node.js Under The Hood
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #222222; margin: 8px 0 12px;">
          Microtasks, Macrotasks &amp; Libuv Event Loop Phases
        </h2>
        <p style="font-size: 13.5px; line-height: 1.6; color: #444444; margin-bottom: 14px;">
          Understanding the order of execution between <code>process.nextTick()</code>, Promise microtasks, and Libuv event loop phases is the difference between an application that handles 50k RPS smoothly and one that suffers catastrophic event loop starvation.
        </p>

        <!-- DIAGRAM 2: Responsive HTML Node.js Pipeline Diagram -->
        ${nodeJsPipelineDiagram}

        <p style="font-size: 13.5px; line-height: 1.6; color: #444444;">
          Always ensure asynchronous tasks never starve the event loop. Microtasks execute immediately after the current operation finishes, meaning an infinite recursive microtask loop will freeze the entire event loop tick cycle.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #FFFDF7; border-top: 1px solid #E8D79A; padding: 20px; text-align: center; font-size: 12px; color: #8A8170;">
      <div style="font-weight: 700; color: #A67C00; margin-bottom: 4px;">CoderHaveli Engineering</div>
      <div>Level up your distributed systems and backend engineering skills daily.</div>
    </div>

  </div>
</body>
</html>
`;

// Save the preview HTML to public directory so we can open it in browser!
const outPath = path.join(__dirname, '../CoderHaveli.Com/Client/public/newsletter_responsive_diagram_preview.html');
fs.writeFileSync(outPath, fullEmailHtml, 'utf8');
console.log(`Successfully generated responsive diagram preview: ${outPath}`);
