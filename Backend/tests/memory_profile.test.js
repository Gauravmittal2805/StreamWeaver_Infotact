import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { processDataset } from '../src/services/etl.service.js';
import { createJob, getJob } from '../src/services/job.service.js';
import { saveMapping } from '../src/services/mapping.service.js';
import { createDatasetMetadata } from '../src/services/dataset.service.js';

async function runMemoryProfileTest() {
  console.log('=====================================================');
  console.log('      STREAMWEAVER MEMORY PROFILING & STRESS TEST    ');
  console.log('=====================================================\n');

  const testDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const largeFile = path.join(testDir, 'dataset_50k_stress.csv');

  console.log('📦 Generating 50,000 row synthetic CSV dataset...');
  const writeStream = fs.createWriteStream(largeFile);
  writeStream.write('id,first_name,last_name,email,score\n');

  const totalRows = 50000;
  for (let i = 1; i <= totalRows; i++) {
    writeStream.write(`${i},User${i},Doe${i},user${i}@example.com,${(i * 1.5).toFixed(2)}\n`);
  }
  await new Promise(resolve => writeStream.end(resolve));

  const fileSizeMb = (fs.statSync(largeFile).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ CSV generated (${fileSizeMb} MB, ${totalRows.toLocaleString()} rows).`);

  const datasetId = 'dataset_50k_stress';

  createDatasetMetadata({
    id: datasetId,
    originalName: 'dataset_50k_stress.csv',
    storedName: 'dataset_50k_stress.csv',
    format: 'csv',
    size: fs.statSync(largeFile).size,
    status: 'uploaded',
    path: largeFile
  });

  saveMapping({
    datasetId,
    mappings: [
      { sourceField: 'first_name', destinationField: 'firstName', transformation: 'uppercase' },
      { sourceField: 'email', destinationField: 'userEmail', transformation: 'lowercase' },
      { sourceField: 'score', destinationField: 'scoreVal', transformation: 'number' }
    ]
  });

  const initialMem = process.memoryUsage();
  console.log(`\n📊 Initial Heap Used : ${(initialMem.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`📊 Initial RSS       : ${(initialMem.rss / (1024 * 1024)).toFixed(2)} MB`);

  const job = await createJob(datasetId);
  console.log(`\n🚀 Starting streaming ETL execution for 50,000 records (Batch Size: 5000)...`);

  const startTime = Date.now();
  let maxHeapUsed = 0;
  let maxRss = 0;

  const sampleInterval = setInterval(() => {
    const mem = process.memoryUsage();
    if (mem.heapUsed > maxHeapUsed) maxHeapUsed = mem.heapUsed;
    if (mem.rss > maxRss) maxRss = mem.rss;
  }, 100);

  const result = await processDataset(datasetId, job.jobId, {
    batchSize: 5000,
    progressIntervalMs: 500
  });

  clearInterval(sampleInterval);
  const durationMs = Date.now() - startTime;

  const finalJob = await getJob(job.jobId);

  const maxHeapMb = (maxHeapUsed / (1024 * 1024)).toFixed(2);
  const maxRssMb = (maxRss / (1024 * 1024)).toFixed(2);
  const throughput = Math.round((totalRows / durationMs) * 1000);

  console.log('\n=====================================================');
  console.log('             MEMORY & PERFORMANCE REPORT              ');
  console.log('=====================================================');
  console.log(`Total Processed Rows : ${finalJob.processedRows.toLocaleString()}`);
  console.log(`Successful Rows      : ${finalJob.successfulRows.toLocaleString()}`);
  console.log(`Failed Rows          : ${finalJob.failedRows}`);
  console.log(`Processing Time      : ${(durationMs / 1000).toFixed(2)} seconds`);
  console.log(`Throughput Speed     : ${throughput.toLocaleString()} rows/sec`);
  console.log(`Peak Heap Memory     : ${maxHeapMb} MB`);
  console.log(`Peak RSS Memory      : ${maxRssMb} MB`);
  console.log(`Memory Target        : < 150 MB`);

  assert.strictEqual(finalJob.processedRows, totalRows);
  assert.strictEqual(finalJob.successfulRows, totalRows);
  assert.ok(maxHeapUsed / (1024 * 1024) < 150, 'Peak Heap Memory exceeded 150 MB target!');

  console.log('\n✅ MEMORY TARGET VERIFIED! Memory footprint remained under 150MB target during 50k streaming processing! 🎉');

  // Cleanup file
  if (fs.existsSync(largeFile)) fs.unlinkSync(largeFile);
}

runMemoryProfileTest().catch(err => {
  console.error('Memory profile test failed:', err);
  process.exit(1);
});
