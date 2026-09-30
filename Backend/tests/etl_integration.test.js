import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { processDataset } from '../src/services/etl.service.js';
import { createJob, getJob } from '../src/services/job.service.js';
import { JOB_STATUS } from '../src/utils/job.utils.js';
import { saveMapping } from '../src/services/mapping.service.js';
import { createDatasetMetadata } from '../src/services/dataset.service.js';

async function runETLIntegrationTest() {
  console.log('=====================================================');
  console.log('       STREAMWEAVER ETL PIPELINE INTEGRATION TEST    ');
  console.log('=====================================================\n');

  const testDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const testFile = path.join(testDir, 'dataset_integration_test.csv');
  const csvContent = [
    'id,user_name,email,amount',
    '1,  gaurav ,gaurav@example.com,150.50',
    '2,  rahul  ,rahul@example.com,invalid_num',
    '3,  amit   ,amit@example.com,300.00',
    '4,  priya  ,priya@example.com,500.75'
  ].join('\n');
  fs.writeFileSync(testFile, csvContent);

  const datasetId = 'integration_test_ds';

  // Register dataset metadata
  createDatasetMetadata({
    id: datasetId,
    originalName: 'dataset_integration_test.csv',
    storedName: 'dataset_integration_test.csv',
    format: 'csv',
    size: csvContent.length,
    status: 'uploaded',
    path: testFile
  });

  // Save mapping rule
  saveMapping({
    datasetId,
    mappings: [
      { sourceField: 'user_name', destinationField: 'userName', transformation: 'uppercase' },
      { sourceField: 'email', destinationField: 'userEmail', transformation: 'trim' },
      { sourceField: 'amount', destinationField: 'amountVal', transformation: 'number' }
    ]
  });

  // Step 6 & 7: Create processing job
  const job = await createJob(datasetId);
  assert.strictEqual(job.status, JOB_STATUS.QUEUED);
  console.log(`✅ Job created: ${job.jobId} (Status: ${job.status})`);

  // Step 8 & 9: Process dataset through StreamWeaver ETL engine
  console.log('🚀 Executing full streaming pipeline...');
  const result = await processDataset(datasetId, job.jobId, {
    batchSize: 2, // Configurable batch size
    progressIntervalMs: 100
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, JOB_STATUS.COMPLETED);
  console.log('✅ Pipeline execution complete!');

  // Step 12, 15: Retrieve final job metrics
  const finalJob = await getJob(job.jobId);
  assert.strictEqual(finalJob.status, JOB_STATUS.COMPLETED);
  assert.strictEqual(finalJob.processedRows, 4);
  assert.strictEqual(finalJob.successfulRows, 3);
  assert.strictEqual(finalJob.failedRows, 1); // Row 2 failed numeric conversion
  assert.strictEqual(finalJob.progressPercent, 100);
  assert.ok(finalJob.rowsPerSecond >= 0);

  console.log('\n--- ETL PIPELINE METRICS SUMMARY ---');
  console.log(`Job ID          : ${finalJob.jobId}`);
  console.log(`Status          : ${finalJob.status}`);
  console.log(`Processed Rows  : ${finalJob.processedRows}`);
  console.log(`Successful Rows : ${finalJob.successfulRows}`);
  console.log(`Failed Rows     : ${finalJob.failedRows}`);
  console.log(`Speed           : ${finalJob.rowsPerSecond} rows/sec`);
  console.log(`Progress        : ${finalJob.progressPercent}%`);

  // Cleanup test file
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);

  console.log('\n✅ ALL ETL INTEGRATION TESTS PASSED PERFECTLY!');
}

runETLIntegrationTest().catch(err => {
  console.error('ETL Integration test failed:', err);
  process.exit(1);
});
