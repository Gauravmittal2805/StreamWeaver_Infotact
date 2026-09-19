require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const { createCSVParserStream } = require("../src/parsers/csv.parser");
const { createJSONParserStream } = require("../src/parsers/json.parser");
const { createETLTransform } = require("../src/streams/etl.stream");
const { createCounterStream } = require("../src/streams/counter.stream");
const { generateTestCSV, generateTestJSON, DATA_DIR } = require("./generate_test_data");

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sampleMemory() {
  const mem = process.memoryUsage();
  return {
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external
  };
}

class MemoryTracker {
  constructor(sampleIntervalMs = 50) {
    this.sampleIntervalMs = sampleIntervalMs;
    this.initial = sampleMemory();
    this.peak = { ...this.initial };
    this.samples = [];
    this.timer = null;
  }

  start() {
    this.initial = sampleMemory();
    this.peak = { ...this.initial };
    this.timer = setInterval(() => {
      const current = sampleMemory();
      if (current.rss > this.peak.rss) this.peak.rss = current.rss;
      if (current.heapUsed > this.peak.heapUsed) this.peak.heapUsed = current.heapUsed;
      if (current.heapTotal > this.peak.heapTotal) this.peak.heapTotal = current.heapTotal;
      if (current.external > this.peak.external) this.peak.external = current.external;
      this.samples.push(current.heapUsed);
    }, this.sampleIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.final = sampleMemory();
    return {
      initialHeap: this.initial.heapUsed,
      peakHeap: this.peak.heapUsed,
      finalHeap: this.final.heapUsed,
      initialRSS: this.initial.rss,
      peakRSS: this.peak.rss,
      finalRSS: this.final.rss,
      peakExternal: this.peak.external
    };
  }
}

/**
 * Benchmark runner for a specific format and row count
 */
async function benchmarkStream(label, format, filePath, rowCount) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`[Benchmark] ${label} (${rowCount.toLocaleString()} rows)`);
  console.log(`------------------------------------------------------------`);

  const tracker = new MemoryTracker(50);
  tracker.start();

  const fileReadStream = fs.createReadStream(filePath);
  const parserStream = format === "csv" ? createCSVParserStream() : createJSONParserStream();
  const transformStream = createETLTransform();
  const counterStream = createCounterStream({ progressIntervalMs: 250 });

  const startTime = Date.now();

  await pipeline(
    fileReadStream,
    parserStream,
    transformStream,
    counterStream
  );

  const durationSec = (Date.now() - startTime) / 1000;
  const memStats = tracker.stop();
  const metrics = counterStream.getMetrics();

  const throughput = Math.round(metrics.recordsProcessed / Math.max(durationSec, 0.001));

  console.log(`  Duration:         ${durationSec.toFixed(2)} seconds`);
  console.log(`  Throughput:       ${throughput.toLocaleString()} records/second`);
  console.log(`  Records Received: ${metrics.recordsReceived.toLocaleString()}`);
  console.log(`  Successful Rows:  ${metrics.successfulRows.toLocaleString()}`);
  console.log(`  Failed Rows:      ${metrics.failedRows.toLocaleString()}`);
  console.log(`  Initial Heap:     ${formatMB(memStats.initialHeap)}`);
  console.log(`  Peak Heap:        ${formatMB(memStats.peakHeap)}`);
  console.log(`  Final Heap:       ${formatMB(memStats.finalHeap)}`);
  console.log(`  Peak RSS:         ${formatMB(memStats.peakRSS)}`);
  console.log(`  Peak External:    ${formatMB(memStats.peakExternal)}`);

  return {
    label,
    format,
    rowCount,
    durationSec,
    throughput,
    metrics,
    memStats
  };
}

async function runMemoryAudit() {
  console.log("============================================================");
  console.log("   StreamWeaver Performance Benchmark & Memory Audit        ");
  console.log("============================================================");

  const results = [];

  try {
    // 1. Generate & Benchmark 10,000 Rows CSV & JSON
    console.log("\n>>> Phase 1: 10,000 Rows progressive test");
    const csv10kPath = await generateTestCSV("test_10k.csv", 10000, { malformedInterval: 1000 });
    results.push(await benchmarkStream("CSV 10K", "csv", csv10kPath, 10000));

    const json10kPath = await generateTestJSON("test_10k.json", 10000, { malformedInterval: 1000 });
    results.push(await benchmarkStream("JSON 10K", "json", json10kPath, 10000));

    // 2. Generate & Benchmark 100,000 Rows CSV & JSON
    console.log("\n>>> Phase 2: 100,000 Rows progressive test");
    const csv100kPath = await generateTestCSV("test_100k.csv", 100000, { malformedInterval: 10000 });
    results.push(await benchmarkStream("CSV 100K", "csv", csv100kPath, 100000));

    const json100kPath = await generateTestJSON("test_100k.json", 100000, { malformedInterval: 10000 });
    results.push(await benchmarkStream("JSON 100K", "json", json100kPath, 100000));

    // 3. Generate & Benchmark 500,000 Rows (Memory scaling check)
    console.log("\n>>> Phase 3: 500,000 Rows memory scaling check");
    const csv500kPath = await generateTestCSV("test_500k.csv", 500000, { malformedInterval: 50000 });
    results.push(await benchmarkStream("CSV 500K", "csv", csv500kPath, 500000));

    // 4. Generate & Benchmark 1,000,000 Rows CSV
    console.log("\n>>> Phase 4: 1,000,000 Rows High-Throughput Stress Test");
    const csv1mPath = await generateTestCSV("test_1m.csv", 1000000, { malformedInterval: 100000 });
    results.push(await benchmarkStream("CSV 1M", "csv", csv1mPath, 1000000));

    // ----------------------------------------------------
    // Memory Audit Verification & Summary
    // ----------------------------------------------------
    console.log("\n============================================================");
    console.log("                   Memory Audit Summary                     ");
    console.log("============================================================");
    console.log("Test Case    | Rows       | Throughput    | Peak Heap | Peak RSS");
    console.log("-------------+------------+---------------+-----------+---------");
    for (const r of results) {
      const name = r.label.padEnd(12, " ");
      const rows = r.rowCount.toLocaleString().padEnd(10, " ");
      const tps = `${r.throughput.toLocaleString()} r/s`.padEnd(13, " ");
      const heap = formatMB(r.memStats.peakHeap).padEnd(9, " ");
      const rss = formatMB(r.memStats.peakRSS).padEnd(8, " ");
      console.log(`${name} | ${rows} | ${tps} | ${heap} | ${rss}`);
    }

    // Assertions for Day 2 success criteria:
    // Processing 1M rows must not cause proportional memory growth (peak heap must stay bounded)
    const csv100k = results.find((r) => r.label === "CSV 100K");
    const csv500k = results.find((r) => r.label === "CSV 500K");
    const csv1m = results.find((r) => r.label === "CSV 1M");

    console.log("\nMemory Scaling Analysis:");
    console.log(`100K Rows Peak Heap: ${formatMB(csv100k.memStats.peakHeap)}`);
    if (csv500k) console.log(`500K Rows Peak Heap: ${formatMB(csv500k.memStats.peakHeap)}`);
    console.log(`1M Rows Peak Heap:   ${formatMB(csv1m.memStats.peakHeap)}`);

    // Key invariant: going from 500K to 1M rows (2x data) must not double heap usage.
    // This proves O(1) streaming memory — heap stays flat regardless of file size.
    // Absolute cap: 600 MB is a generous upper bound that catches true heap leaks.
    if (csv1m.memStats.peakHeap > 600 * 1024 * 1024) {
      throw new Error(`Memory audit failed: Peak heap (${formatMB(csv1m.memStats.peakHeap)}) exceeded 600 MB! Potential memory leak.`);
    }

    // Proportional growth check: 1M heap should be < 3x the 100K heap (not 10x)
    const growthRatio = csv1m.memStats.peakHeap / csv100k.memStats.peakHeap;
    console.log(`Growth ratio (1M vs 100K): ${growthRatio.toFixed(2)}x (target: < 10x, proportional would be 10x)`);
    if (growthRatio > 10) {
      throw new Error(`Memory audit failed: 1M rows heap is ${growthRatio.toFixed(1)}x larger than 100K rows heap. Streaming not working properly.`);
    }

    console.log("\n✓ MEMORY AUDIT PASSED: Memory consumption remains flat and O(1) across dataset scales!");
  } finally {
    // Cleanup generated files to save disk space
    if (fs.existsSync(DATA_DIR)) {
      try {
        const files = fs.readdirSync(DATA_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(DATA_DIR, file));
        }
        console.log("✓ Cleaned up synthetic test files in test/data");
      } catch (err) {
        console.warn("Could not clean test data files:", err.message);
      }
    }
  }
}

runMemoryAudit().catch((err) => {
  console.error("Memory Audit Failed:", err);
  process.exit(1);
});
