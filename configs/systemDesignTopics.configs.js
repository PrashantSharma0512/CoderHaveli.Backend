/**
 * Curated System Design & Node.js Syllabus Roadmap
 * 
 * A structured sequence of production-grade architectural and backend engineering
 * topics. The newsletter pipeline rotates through this list sequentially so subscribers
 * receive a complete, progressive, non-repeating masterclass.
 */

module.exports = [
    {
        id: 1,
        title: "Distributed Rate Limiter with Redis & Token Bucket",
        category: "System Design & Node.js",
        systemDesignFocus: "Token Bucket vs Sliding Window Counter, multi-region synchronization, handling burst traffic, fail-open vs fail-closed strategies",
        nodeJsFocus: "Atomic Lua script execution in ioredis, Express/Fastify custom rate limiting middleware, handling Redis connection drops gracefully",
        diagramFlow: `
┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
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
                         └─────────────────────────┘`,
        ruleOfThumb: "Always fail-open on rate-limiter downtime if availability is higher priority than resource protection."
    },
    {
        id: 2,
        title: "Node.js Event Loop Deep Dive: Microtasks, Macrotasks & Libuv",
        category: "Node.js Internals",
        systemDesignFocus: "Single-threaded event-driven concurrency vs Multi-threaded thread-per-request models (Go/Java), C10K to C1M scalability",
        nodeJsFocus: "Order of execution: process.nextTick vs Promise microtasks vs timers vs setImmediate check phase, identifying event loop lag with perf_hooks",
        diagramFlow: `
┌─────────────────────────────────────────────────────────────────┐
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
└────────────────────────────────┬────────────────────────────────┘
                                 │ (Offloaded async tasks)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Libuv Worker Thread Pool (UV_THREADPOOL_SIZE=4 default)        │
│  [crypto.pbkdf2] | [fs.readFile] | [dns.lookup] | [zlib.gzip]   │
└─────────────────────────────────────────────────────────────────┘`,
        ruleOfThumb: "Never run heavy CPU calculations or synchronous JSON.parse on 10MB+ strings on the main Node.js thread."
    },
    {
        id: 3,
        title: "Distributed Caching & Invalidation Patterns (Cache-Aside, Write-Through)",
        category: "System Design",
        systemDesignFocus: "Cache-Aside vs Write-Through vs Write-Back, solving cache stampede (dogpiling), thundering herd, and cache penetration with Bloom Filters",
        nodeJsFocus: "Implementing Multi-tier Caching (L1 in-memory LRU + L2 Redis), probabilistic early expiration (XFetch algorithm) in Node.js",
        diagramFlow: `
┌──────────────┐         ┌────────────────────────┐         ┌────────────────────────┐
│ Incoming Req │ ──────> │  Node.js In-Memory L1  │ ──HIT──> │ Instant Return (< 1ms) │
└──────────────┘         │  (LRU Cache: 10k keys) │          └────────────────────────┘
                         └───────────┬────────────┘
                                     │ MISS
                                     ▼
                         ┌────────────────────────┐         ┌────────────────────────┐
                         │ Distributed Redis L2   │ ──HIT──> │ 1. Populate L1 Cache   │
                         │ (Cluster with TTL)     │          │ 2. Return Response     │
                         └───────────┬────────────┘          └────────────────────────┘
                                     │ MISS
                                     ▼
                         ┌────────────────────────┐
                         │ Primary Database (RDB) │ ────> [Write to L2 + L1 & Return]
                         └────────────────────────┘`,
        ruleOfThumb: "There are only two hard things in Computer Science: cache invalidation and naming things. — Phil Karlton"
    },
    {
        id: 4,
        title: "High-Throughput Node.js Streams & Backpressure Management",
        category: "Node.js Internals",
        systemDesignFocus: "Flow control across network boundaries, avoiding memory exhaustion during large file uploads, streaming transformations at scale",
        nodeJsFocus: "stream.Readable, stream.Writable, stream.Transform, handling stream.pipeline vs manual piping, monitoring highWaterMark and drain events",
        diagramFlow: `
┌─────────────────────────┐
│ Incoming 2GB Video File │
└────────────┬────────────┘
             │ (Chunks of 64KB)
             ▼
┌─────────────────────────┐
│     Readable Stream     │ <─── [Pushes data chunk into internal buffer]
└────────────┬────────────┘
             │
             │ HighWaterMark Exceeded (16KB Buffer Full)
             ├───> readable.pause() [Stops reading from TCP Socket]
             │
             ▼
┌─────────────────────────┐
│     Writable Stream     │ ───> [Slow Disk / S3 Storage write]
└────────────┬────────────┘
             │
             └───> Emits 'drain' event once buffer empties
                   └───> readable.resume() [Backpressure Resolved!]`,
        ruleOfThumb: "Always use stream.pipeline() instead of .pipe() in production Node.js to properly forward errors and clean up descriptors."
    },
    {
        id: 5,
        title: "Database Sharding, Partition Keys & Consistent Hashing",
        category: "System Design",
        systemDesignFocus: "Horizontal sharding vs vertical partitioning, consistent hashing ring with virtual nodes, avoiding hotspot partitions, cross-shard joins",
        nodeJsFocus: "Dynamic connection pool routing based on tenant or user hash, handling shard failover and read replicas in Mongoose/Prisma/Knex",
        diagramFlow: `
┌─────────────────────────────────────────────────────────────────┐
│                 Consistent Hashing Ring (0 to 2^32-1)           │
│                                                                 │
│           [Shard A (Virtual Node 1)] ──── (Hash: 0x2A1F...)     │
│                     │                                           │
│                     ▼                                           │
│    User ID: 'usr_8492' (Hash: 0x3F8A...) ──> Assigned to Shard B│
│                     │                                           │
│                     ▼                                           │
│           [Shard B (Virtual Node 2)] ──── (Hash: 0x5C20...)     │
│                     │                                           │
│                     ▼                                           │
│           [Shard C (Virtual Node 3)] ──── (Hash: 0x9D00...)     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                   Direct Routed Database Shards
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ Shard A (Users)  │  │ Shard B (Users)  │  │ Shard C (Users)  │
   │ Postgres Node 1  │  │ Postgres Node 2  │  │ Postgres Node 3  │
   └──────────────────┘  └──────────────────┘  └──────────────────┘`,
        ruleOfThumb: "Choose a shard key with high cardinality and even distribution; avoid monotonically increasing keys like autoincrement IDs."
    },
    {
        id: 6,
        title: "Scaling WebSockets to 1 Million Concurrent Connections",
        category: "System Design & Node.js",
        systemDesignFocus: "Stateful connection challenges, horizontal scaling of socket servers, Redis Pub/Sub vs RabbitMQ backplane, sticky sessions via Load Balancers",
        nodeJsFocus: "Node.js ws library tuning, OS file descriptor limits (nofile / ulimit -n 65535), memory overhead per connection (buffer recycling)",
        diagramFlow: "[1M Mobile / Web Clients] ──WSS──> [AWS ALB (Sticky Sessions)] ──> [Node.js WebSocket Cluster] ──Pub/Sub──> [Redis Broker]",
        ruleOfThumb: "A raw Node.js WebSocket consumes ~30-50KB of RAM; 1M connections require ~35-50GB of server memory minimum."
    },
    {
        id: 7,
        title: "Worker Threads vs Cluster Mode in Production Node.js",
        category: "Node.js Architecture",
        systemDesignFocus: "Process isolation vs shared-memory multi-threading, CPU core utilization across multi-core containerized instances (Kubernetes/Docker)",
        nodeJsFocus: "node:worker_threads (Piscina pool, MessageChannel, SharedArrayBuffer) vs node:cluster with fork() and IPC message passing",
        diagramFlow: "[Node.js Primary Process] ──Spawns Worker Threads──> [Worker 1 (Image Resizing)] | [Worker 2 (PDF Generation)] | [Worker 3 (Hashing)]",
        ruleOfThumb: "Use Cluster mode for horizontal I/O scaling per CPU core; use Worker Threads for offloading intensive CPU tasks."
    },
    {
        id: 8,
        title: "Event-Driven Messaging Architecture with Apache Kafka",
        category: "System Design",
        systemDesignFocus: "Partitioning, consumer groups, offset management, exactly-once processing (idempotent producer), handling poison pills with Dead Letter Queues (DLQ)",
        nodeJsFocus: "KafkaJS consumer batching, managing heartbeat timeouts during long processing loops, manual commit strategies",
        diagramFlow: "[Producer Node.js Service] ──Topic (3 Partitions)──> [Kafka Cluster] ──Consumer Group──> [Node.js Worker 1, 2, 3] ──Failed──> [DLQ]",
        ruleOfThumb: "In Kafka, order is only guaranteed within a single partition, never across partitions."
    },
    {
        id: 9,
        title: "Distributed Locking with Redis (Redlock Algorithm & Fencing Tokens)",
        category: "System Design & Node.js",
        systemDesignFocus: "Mutual exclusion across distributed processes, split-brain conditions, clock drift caveats, preventing double payments with fencing tokens",
        nodeJsFocus: "Implementing Redlock in Node.js with ioredis, lock acquisition timeout, auto-extending locks with heartbeat timers (TTL refresh)",
        diagramFlow: "[Node.js Server A] ──SETNX lock:order:101 with TTL──> [Redis Primary] ──Acquired──> [Execute Order] ──DEL / Lua──> [Release]",
        ruleOfThumb: "Always use a monotonic fencing token with distributed locks to prevent delayed zombie processes from corrupting state."
    },
    {
        id: 10,
        title: "Memory Leak Profiling & V8 Heap Diagnostics in Production",
        category: "Node.js Internals",
        systemDesignFocus: "Garbage collection stop-the-world latency impacts, proactive health checks and memory threshold restarts in orchestration (K8s/PM2)",
        nodeJsFocus: "Analyzing v8.getHeapStatistics(), capturing heap snapshots with v8.writeHeapSnapshot(), spotting uncollected closures and EventListener leaks",
        diagramFlow: "[Process Memory Rising] ──Trigger Alert (>85% RSS)──> [Capture Heap Snapshot] ──> [Chrome DevTools Comparison] ──> [Root Cause Fix]",
        ruleOfThumb: "Global variables, unclosed EventEmitters, and unbounded caches are the top 3 causes of Node.js memory leaks."
    },
    {
        id: 11,
        title: "Microservices Resilience: Circuit Breaker & Retry with Jitter",
        category: "System Design",
        systemDesignFocus: "Cascading failure prevention, circuit states (Closed, Open, Half-Open), exponential backoff with full jitter to avoid dogpiling downstream APIs",
        nodeJsFocus: "Implementing Opossum circuit breaker in Node.js, setting timeout thresholds, fallback cache responses, custom axios interceptors",
        diagramFlow: "[Node.js API] ──Failures > 50%──> [Circuit: OPEN (Fail Fast / Fallback)] ──Wait 10s──> [Circuit: HALF-OPEN] ──Probe OK──> [Circuit: CLOSED]",
        ruleOfThumb: "Never retry without exponential backoff and randomized jitter, or retries will DDoS your own recovering services."
    },
    {
        id: 12,
        title: "Designing a Distributed Unique ID Generator (Twitter Snowflake)",
        category: "System Design",
        systemDesignFocus: "64-bit ID structure: Timestamp (41 bits) + Datacenter ID (5 bits) + Machine ID (5 bits) + Sequence number (12 bits), monotonic ordering, clock skew",
        nodeJsFocus: "Implementing 64-bit integer bitwise manipulation using BigInt in Node.js, millisecond collision resolution loop",
        diagramFlow: "[64-Bit ID]: [1 Sign Bit] | [41 Bits Timestamp (69 years)] | [10 Bits Node ID (1024 nodes)] | [12 Bits Sequence (4096 IDs/ms)]",
        ruleOfThumb: "Snowflake IDs provide time-sortable IDs with zero coordination between distributed generator nodes."
    },
    {
        id: 13,
        title: "Zero-Downtime Deployments & Graceful Shutdown in Node.js",
        category: "Node.js Architecture",
        systemDesignFocus: "Rolling deployments vs Blue/Green deployments, draining TCP connections, keeping Load Balancers synchronized during pod termination",
        nodeJsFocus: "Handling SIGTERM and SIGINT signals, server.close(), stopping active worker queues, waiting for in-flight HTTP requests before process.exit(0)",
        diagramFlow: "[Kubernetes / PM2 sends SIGTERM] ──> [Stop Accepting New Conns] ──> [Drain Active Requests (15s timeout)] ──> [Close DB] ──> [Exit 0]",
        ruleOfThumb: "Always give your Node.js application a 10–30 second graceful shutdown window before issuing SIGKILL."
    },
    {
        id: 14,
        title: "Designing Idempotent APIs with Deduplication Stores",
        category: "System Design",
        systemDesignFocus: "Network retries causing duplicate payments or orders, Idempotency-Key headers, storing request fingerprints and cached responses",
        nodeJsFocus: "Express middleware verifying Idempotency-Key in Redis, atomic locking during processing, storing response payloads with TTL",
        diagramFlow: "[Client (Idempotency-Key: abc-123)] ──> [Check Redis Key] ──Found Cached Response──> [Return Instant Response without Re-processing]",
        ruleOfThumb: "All mutating APIs (POST/PUT/PATCH) handling financial transactions or order placement must enforce idempotency keys."
    },
    {
        id: 15,
        title: "AsyncLocalStorage & Context Tracking in Node.js Microservices",
        category: "Node.js Internals",
        systemDesignFocus: "Distributed tracing, correlating logs across 20+ microservices, OpenTelemetry traceparent and span propagation",
        nodeJsFocus: "node:async_hooks AsyncLocalStorage store, attaching requestId/userId to asynchronous call chains without manual parameter passing",
        diagramFlow: "[Incoming HTTP Request (X-Request-ID)] ──AsyncLocalStorage.run()──> [Controller] ──> [Service] ──> [DB / Logger gets ID automatically]",
        ruleOfThumb: "AsyncLocalStorage replaces dangerous global state and cumbersome function-argument context drilling."
    },
    {
        id: 16,
        title: "Designing a Scalable URL Shortener (TinyURL Architecture)",
        category: "System Design",
        systemDesignFocus: "Base62 encoding vs MD5/SHA hashing, Key Generation Service (KGS) pre-allocation, 100:1 Read-to-Write ratio, global caching layers",
        nodeJsFocus: "High-speed 301/302 redirect handlers in Fastify, atomic counter increments in Redis, Base62 encoding implementation in pure JS",
        diagramFlow: "[POST /shorten (longUrl)] ──KGS Token──> [Base62: '7bXq2'] ──> [Store in DB + Redis Cache] ──> [GET /7bXq2 (302 Redirect)]",
        ruleOfThumb: "Use 302 Temporary Redirects if you want to track click analytics on your short URLs; use 301 for permanent browser caching."
    },
    {
        id: 17,
        title: "Database Indexing Strategies: B-Trees, Hash, & Composite Indexes",
        category: "System Design & Databases",
        systemDesignFocus: "B-Tree vs LSM-Tree vs Hash indexes, index selectivity, covering indexes, read vs write performance tradeoffs, index bloat",
        nodeJsFocus: "Analyzing MongoDB explain('executionStats') and PostgreSQL EXPLAIN ANALYZE, eliminating COLLSCAN/Seq Scan in Node.js queries",
        diagramFlow: "[Unindexed Query: Scans 1,000,000 rows (1800ms)] ──VS──> [Composite Index (status, createdAt): Scans 12 rows (2ms)]",
        ruleOfThumb: "Follow the ESR rule (Equality, Sort, Range) when creating composite database indexes."
    },
    {
        id: 18,
        title: "CQRS & Event Sourcing Architecture (Command Query Separation)",
        category: "System Design",
        systemDesignFocus: "Separating write-optimized normalized models from read-optimized denormalized views, event stores as the single source of truth",
        nodeJsFocus: "Handling Command handlers vs Query projectors in Node.js, publishing domain events, eventual consistency reconciliation",
        diagramFlow: "[Command (Write)] ──> [Relational DB / Event Store] ──Domain Event (Kafka)──> [Projector] ──> [Read Model (MongoDB/Elasticsearch)]",
        ruleOfThumb: "CQRS adds operational complexity; only adopt it when read and write workloads have drastically asymmetric scaling requirements."
    },
    {
        id: 19,
        title: "Optimizing Node.js HTTP Performance with Keep-Alive & Undici",
        category: "Node.js Internals",
        systemDesignFocus: "TCP 3-way handshake overhead, TLS negotiation latency, socket pooling and connection reuse in inter-service communication",
        nodeJsFocus: "node:http Agent keepAlive: true configuration, migrating from axios to Undici / native fetch with connection pooling",
        diagramFlow: "[Node.js Client] ──Reusable TCP Connection (Keep-Alive)──> [Microservice A] (Zero TLS Handshake Latency on subsequent requests)",
        ruleOfThumb: "Enabling HTTP Keep-Alive cuts inter-service REST API latency by 40–70% by eliminating repeated TCP/TLS handshakes."
    },
    {
        id: 20,
        title: "Designing a High-Availability Message Queue (BullMQ & RabbitMQ)",
        category: "System Design",
        systemDesignFocus: "Push vs Pull queue architectures, priority queues, delayed jobs, consumer concurrency, message acknowledgment and redelivery",
        nodeJsFocus: "BullMQ queue configuration, managing stalledInterval, lockDuration, lockRenewTime, graceful worker shutdown during deployments",
        diagramFlow: "[API Service] ──Job Payload──> [Queue Storage (Redis/RabbitMQ)] ──Pull──> [Worker Process] ──ACK on Complete / NACK on Error",
        ruleOfThumb: "Always configure exponential backoff and maximum retry limits on queue workers to avoid infinite error loops."
    }
];
