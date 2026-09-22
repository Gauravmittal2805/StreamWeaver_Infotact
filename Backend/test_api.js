import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./src/app.js";

async function testApi() {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // 1. Test POST /api/jobs (valid datasetId)
    console.log("Testing POST /api/jobs...");
    const postRes = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId: "dataset_test123", autoStart: false })
    });
    const postData = await postRes.json();
    console.log("POST /api/jobs response:", postRes.status, postData);

    if (postRes.status !== 201 || !postData.success || !postData.job.jobId) {
      throw new Error("POST /api/jobs failed");
    }

    const createdJobId = postData.job.jobId;

    // 2. Test GET /api/jobs/:jobId
    console.log(`Testing GET /api/jobs/${createdJobId}...`);
    const getRes = await fetch(`${baseUrl}/api/jobs/${createdJobId}`);
    const getData = await getRes.json();
    console.log("GET /api/jobs/:jobId response:", getRes.status, getData);

    if (getRes.status !== 200 || !getData.success || getData.job.jobId !== createdJobId) {
      throw new Error("GET /api/jobs/:jobId failed");
    }

    // 3. Test POST /api/jobs with missing datasetId (validation)
    console.log("Testing POST /api/jobs validation...");
    const badPostRes = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const badPostData = await badPostRes.json();
    console.log("POST /api/jobs validation response:", badPostRes.status, badPostData);
    if (badPostRes.status !== 400 || badPostData.success !== false) {
      throw new Error("Validation test failed");
    }

    // 4. Test GET /api/jobs/invalid_id (404)
    console.log("Testing GET /api/jobs/nonexistent_job...");
    const notFoundRes = await fetch(`${baseUrl}/api/jobs/job_nonexistent_99999`);
    const notFoundData = await notFoundRes.json();
    console.log("GET 404 response:", notFoundRes.status, notFoundData);
    if (notFoundRes.status !== 404 || notFoundData.success !== false) {
      throw new Error("404 test failed");
    }

    console.log("--- All API Tests Passed Successfully! ---");
  } finally {
    server.close();
  }
}

testApi().catch((err) => {
  console.error("API test failed:", err);
  process.exit(1);
});
