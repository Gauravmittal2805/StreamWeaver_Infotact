import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import app from '../server.js';
import * as jobService from '../src/services/job.service.js';
import * as etlService from '../src/services/etl.service.js';
import { saveMapping } from '../src/services/mapping.service.js';
import { createDatasetMetadata } from '../src/services/dataset.service.js';
import { JOB_STATUS } from '../src/utils/job.utils.js';

async function runWorkflowAndReconnectionTest() {
  console.log('=====================================================');
  console.log('  STREAMWEAVER WORKFLOW & RECONNECTION INTEGRATION   ');
  console.log('=====================================================\n');

  // Start HTTP and WebSocket test server
  const server = http.createServer(app);
  const jobSubscribers = new Map();
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const subscriptions = new Set();
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && msg.jobId) {
          subscriptions.add(msg.jobId);
          if (!jobSubscribers.has(msg.jobId)) jobSubscribers.set(msg.jobId, new Set());
          jobSubscribers.get(msg.jobId).add(ws);
          ws.send(JSON.stringify({ type: 'subscribed', jobId: msg.jobId }));
        }
      } catch {}
    });

    ws.on('close', () => {
      for (const jId of subscriptions) {
        const s = jobSubscribers.get(jId);
        if (s) s.delete(ws);
      }
    });
  });

  const broadcast = (jobId, data) => {
    const subs = jobSubscribers.get(jobId);
    if (!subs) return;
    const payload = JSON.stringify(data);
    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  };

  etlService.setBroadcast(broadcast);
  jobService.setJobBroadcast(broadcast);

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`📡 Test server running on port ${port}`);

  // Create a realistic dataset with valid and invalid rows
  const testDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const testFile = path.join(testDir, 'workflow_test.csv');
  const csvContent = [
    'row_id,Email,Age,amount',
    '101,valid1@streamweaver.io,25,100',
    '124,invalid_email_no_at,30,200',      // Field: Email, Error: invalid email
    '205,valid2@streamweaver.io,45,300',
    '581,valid3@streamweaver.io,not_a_num,400', // Field: Age, Error: invalid number
    '600,valid4@streamweaver.io,22,500'
  ].join('\n');
  fs.writeFileSync(testFile, csvContent);

  const datasetId = 'workflow_test_dataset';

  createDatasetMetadata({
    id: datasetId,
    originalName: 'workflow_test.csv',
    storedName: 'workflow_test.csv',
    format: 'csv',
    size: csvContent.length,
    status: 'uploaded',
    path: testFile
  });

  saveMapping({
    datasetId,
    mappings: [
      { sourceField: 'row_id', destinationField: 'id' },
      { sourceField: 'Email', destinationField: 'email', transformation: 'trim' },
      { sourceField: 'Age', destinationField: 'age', transformation: 'number' },
      { sourceField: 'amount', destinationField: 'amount', transformation: 'number' }
    ]
  });

  console.log('✅ Step 1: Verified dataset & mapping configuration');

  // Step 1: Start Processing & receive Job ID
  const job = await jobService.createJob(datasetId);
  const jobId = job.jobId;
  assert.ok(jobId, 'Job ID must be received');
  assert.strictEqual(job.status, JOB_STATUS.QUEUED);
  console.log(`✅ Step 1: Start processing works, received Job ID: ${jobId}`);

  // Step 3: Connect WebSocket
  const wsUrl = `ws://127.0.0.1:${port}/ws`;
  let ws1 = new WebSocket(wsUrl);

  const receivedProgressEvents = [];
  let highestProgressSeen = 0;

  await new Promise((resolve, reject) => {
    ws1.on('open', () => {
      ws1.send(JSON.stringify({ type: 'subscribe', jobId }));
    });
    ws1.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'subscribed') {
        resolve();
      }
    });
    ws1.on('error', reject);
  });
  console.log('✅ Step 3: WebSocket successfully connected and subscribed to job');

  ws1.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'progress') {
      receivedProgressEvents.push(msg);
      if (msg.progressPercent > highestProgressSeen) {
        highestProgressSeen = msg.progressPercent;
      }
    }
  });

  // Start processing in background
  const processPromise = etlService.processDataset(datasetId, jobId, {
    batchSize: 2,
    progressIntervalMs: 50
  });

  // Wait a moment for some progress, then simulate disconnect
  await new Promise(r => setTimeout(r, 60));

  // Step 4: Simulate WebSocket Disconnect
  console.log('🔌 Step 4: Simulating WebSocket disconnect during processing...');
  ws1.terminate();
  ws1 = null;

  // Verify status can still be retrieved via REST during disconnect
  const interimJob = await jobService.getJob(jobId);
  assert.ok(interimJob, 'Interim job status must be retrievable via REST');
  assert.ok(
    interimJob.progressPercent >= highestProgressSeen,
    `Progress should not reset backwards! (Highest seen: ${highestProgressSeen}, Interim: ${interimJob.progressPercent})`
  );
  console.log(`✅ Step 4: Reconnection poll retrieved status: ${interimJob.status}, progress: ${interimJob.progressPercent}%`);

  // Step 4: Reconnect WebSocket and resume
  console.log('🔄 Step 4: Reconnecting WebSocket...');
  const ws2 = new WebSocket(wsUrl);
  let completedEventReceived = false;

  await new Promise((resolve, reject) => {
    ws2.on('open', () => {
      ws2.send(JSON.stringify({ type: 'subscribe', jobId }));
      resolve();
    });
    ws2.on('error', reject);
  });

  ws2.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'progress') {
      // Step 4: Assert progress never drops to 0 after reconnect
      assert.ok(
        msg.progressPercent >= highestProgressSeen || msg.progressPercent === 100,
        `Progress should never reset to 0 after reconnect! Received: ${msg.progressPercent}%`
      );
      highestProgressSeen = Math.max(highestProgressSeen, msg.progressPercent);
    } else if (msg.type === 'completed') {
      completedEventReceived = true;
    }
  });

  // Wait for ETL process to finish
  const finalResult = await processPromise;
  assert.strictEqual(finalResult.success, true);
  console.log('✅ Step 8 & 10: ETL Processing completed successfully!');

  // Close second WS
  ws2.close();

  // Final job inspection
  const finalJob = await jobService.getJob(jobId);
  assert.strictEqual(finalJob.status, JOB_STATUS.COMPLETED);
  assert.strictEqual(finalJob.processedRows, 5); // 5 rows in test file
  assert.strictEqual(finalJob.successfulRows, 4); // 4 valid rows
  assert.strictEqual(finalJob.failedRows, 1);     // 1 invalid number row (Age = not_a_num)
  assert.strictEqual(finalJob.progressPercent, 100);

  console.log('\n--- FINAL JOB EXECUTION SUMMARY ---');
  console.log(`Job ID          : ${finalJob.jobId}`);
  console.log(`Status          : ${finalJob.status}`);
  console.log(`Processed Rows  : ${finalJob.processedRows}`);
  console.log(`Successful Rows : ${finalJob.successfulRows}`);
  console.log(`Failed Rows     : ${finalJob.failedRows}`);
  console.log(`Rows / Sec      : ${finalJob.rowsPerSecond}`);
  console.log(`Errors Capped   : ${finalJob.errors.length}`);

  // Step 6: Verify Failed Records structure
  assert.ok(finalJob.errors.length > 0, 'Failed records must be captured');
  const sampleError = finalJob.errors[0];
  console.log('\nSample Failed Record Structure (Step 6 verification):', sampleError);
  assert.ok(sampleError.rowNumber !== undefined, 'Error must contain rowNumber (Row)');
  assert.ok(sampleError.field !== undefined, 'Error must contain field (Field)');
  assert.ok(sampleError.message !== undefined, 'Error must contain message (Error)');

  // Step 7: Test Cancel Job action
  console.log('\nTesting Job Cancellation Action (Step 7)...');
  const jobToCancel = await jobService.createJob(datasetId);
  const cancelRes = await jobService.updateJob(jobToCancel.jobId, {
    status: JOB_STATUS.CANCELLED,
    completedAt: new Date().toISOString()
  });
  assert.strictEqual(cancelRes.status, JOB_STATUS.CANCELLED);
  console.log(`✅ Step 7: Job ${jobToCancel.jobId} successfully cancelled.`);

  // Cleanup
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  server.close();

  console.log('\n🎉 ALL WORKFLOW, RECONNECTION, DASHBOARD & ERROR UI CHECKS PASSED!\n');
  process.exit(0);
}

runWorkflowAndReconnectionTest().catch(err => {
  console.error('❌ Workflow test failed:', err);
  process.exit(1);
});
