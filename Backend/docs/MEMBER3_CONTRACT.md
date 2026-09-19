# StreamWeaver: Member 3 Frontend Job Progress Contract

This document specifies the data structure, REST endpoints, and future WebSocket payload format that Member 3's frontend dashboard should consume for real-time job monitoring.

---

## 1. Job Progress Schema

Every job progress update conforms to the following JSON schema:

```typescript
interface JobProgressPayload {
  jobId: string;                     // Unique identifier (e.g. "job_1789833529422_x81a")
  datasetId: string;                 // Source dataset identifier
  status: "queued" | "processing" | "completed" | "failed";
  totalRows: number;                 // Total rows in dataset (or records received so far)
  processedRows: number;             // Count of records processed through the pipeline
  successfulRows: number;            // Count of successfully transformed records
  failedRows: number;                // Count of malformed/rejected records
  rowsPerSecond: number;             // Real-time processing throughput
  progressPercent: number;           // Calculated as Math.min(100, Math.round((processedRows / totalRows) * 100))
  errors: Array<{                    // Capped diagnostics (first 100 errors)
    rowNumber: number;
    type: string;                    // e.g. "MALFORMED_CSV_ROW", "MALFORMED_JSON_OBJECT"
    message: string;
  }>;
  createdAt: string;                 // ISO 8601 timestamp
  startedAt: string | null;          // ISO 8601 timestamp when stream started
  completedAt: string | null;        // ISO 8601 timestamp when stream completed/failed
}
```

---

## 2. REST Endpoints (Currently Available in Day 2)

### A. Create Job
- **Method**: `POST /api/jobs`
- **Request Body**:
  ```json
  {
    "datasetId": "dataset_1720000000_abc",
    "autoStart": true
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "job": {
      "jobId": "job_1789833529422_x81a",
      "datasetId": "dataset_1720000000_abc",
      "status": "queued",
      "totalRows": 0,
      "processedRows": 0,
      "successfulRows": 0,
      "failedRows": 0,
      "rowsPerSecond": 0,
      "errors": [],
      "createdAt": "2026-09-19T16:15:00.000Z",
      "startedAt": null,
      "completedAt": null
    }
  }
  ```

### B. Poll Job Status
- **Method**: `GET /api/jobs/:jobId`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "job": {
      "jobId": "job_1789833529422_x81a",
      "datasetId": "dataset_1720000000_abc",
      "status": "processing",
      "totalRows": 1000000,
      "processedRows": 450000,
      "successfulRows": 449980,
      "failedRows": 20,
      "rowsPerSecond": 45000,
      "errors": [
        {
          "rowNumber": 1502,
          "type": "MALFORMED_CSV_ROW",
          "message": "Row has more columns than headers defined (5)"
        }
      ],
      "createdAt": "2026-09-19T16:15:00.000Z",
      "startedAt": "2026-09-19T16:15:01.000Z",
      "completedAt": null
    }
  }
  ```

### C. Manually Start Job
- **Method**: `POST /api/jobs/:jobId/start`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Job processing initiated",
    "jobId": "job_1789833529422_x81a"
  }
  ```

---

## 3. Future WebSocket Event Specification (Day 3+)

When WebSockets are activated:
- **Client Subscribe**: `socket.emit("subscribe_job", { jobId: "job_1789833529422_x81a" });`
- **Server Broadcast Channel**: `job_progress_${jobId}`
- **Server Message**:
  ```json
  {
    "event": "JOB_PROGRESS",
    "data": {
      "jobId": "job_1789833529422_x81a",
      "status": "processing",
      "totalRows": 1000000,
      "processedRows": 750000,
      "successfulRows": 749970,
      "failedRows": 30,
      "rowsPerSecond": 48200,
      "progressPercent": 75
    }
  }
  ```
- **Completion Event**:
  ```json
  {
    "event": "JOB_COMPLETED",
    "data": {
      "jobId": "job_1789833529422_x81a",
      "status": "completed",
      "totalRows": 1000000,
      "processedRows": 1000000,
      "successfulRows": 999960,
      "failedRows": 40,
      "rowsPerSecond": 47500,
      "progressPercent": 100,
      "completedAt": "2026-09-19T16:15:22.000Z"
    }
  }
  ```
