# Test Plan

This file defines the planned V1 validation matrix.

Rules used here:

- Excel test IDs are preserved.
- All tests are currently planned only. No code-level execution happened in this documentation step.
- Blocking tests for V1 are the highest priority before coding completion.

## Functional tests

- [ ] QA-001 - Local application starts successfully
  - Steps: Install dependencies, run `npm run dev`, and open the local URL.
  - Expected result: The application is reachable locally and responds without startup errors.
  - Status: Not run
  - Notes: Current repository inspection shows the app is still a starter scaffold.

- [ ] QA-082 - Raw and modified outputs are displayed after a successful job
  - Steps: Submit a valid job, wait for success, and open the result view.
  - Expected result: `raw_text` and `modified_text` are both visible and reviewable.
  - Status: Not run
  - Notes: This validates the main review workflow.

## Security tests

- [ ] QA-010 - Access is refused without authentication
  - Steps: Open the protected page and call `/api/transcribe` without a valid session cookie.
  - Expected result: The UI redirects to login or blocks access, and the API returns an auth error.
  - Status: Not run
  - Notes: Blocking V1 requirement.

- [ ] QA-011 - Files above 12 MB are rejected before RunPod
  - Steps: Authenticate, upload a file above 12 MB, and inspect behavior.
  - Expected result: The BFF rejects the file and does not call RunPod.
  - Status: Not run
  - Notes: The size limit is before encryption and base64.

- [ ] QA-012 - Daily quota limit blocks overuse
  - Steps: Configure a low daily quota, submit jobs until the quota is exceeded, and submit one more.
  - Expected result: The extra request fails cleanly and does not call RunPod.
  - Status: Not run
  - Notes: Daily quota behavior is part of the intended V1 anti-cost design from the start.

- [ ] QA-030 - RunPod secrets are not exposed to the browser
  - Steps: Inspect DevTools, browser network traffic, and any client bundle artifacts after running the app.
  - Expected result: No `RUNPOD_API_KEY`, `MASTER_KEY_BASE64`, or session secret appears in client-visible code or traffic.
  - Status: Not run
  - Notes: Blocking V1 security test.

## Encryption and decryption tests

- [ ] QA-020 - Salt and nonce are unique across uploads
  - Steps: Upload the same audio twice and compare generated `salt` and `audio_nonce` values in server-side test instrumentation.
  - Expected result: Both values differ between the two jobs.
  - Status: Not run
  - Notes: This protects the AES-GCM key/nonce lifecycle.

- [ ] QA-021 - HKDF derivation matches between Next.js and Python
  - Steps: Use a fixed `MASTER_KEY_BASE64`, `salt`, and `job_id` in both implementations and compare derived keys.
  - Expected result: The derived 32-byte key is identical on both sides.
  - Status: Not run
  - Notes: Blocking integration test for cross-language crypto compatibility.

- [ ] QA-022 - The payload never contains clear audio
  - Steps: Inspect the payload sent to the worker and verify its fields.
  - Expected result: The payload contains only encrypted audio data plus the expected metadata and non-secret base64 fields.
  - Status: Not run
  - Notes: The master key must also be absent from the payload.

- [ ] TEST-001 - AES-GCM authentication fails on tampered ciphertext
  - Steps: Modify one byte in an encrypted payload and attempt worker decryption.
  - Expected result: Decryption fails cleanly and the job is rejected.
  - Status: Not run
  - Notes: Added because the Excel security checklist requires authenticated encryption behavior even though the test is not a named Excel QA row.

## RunPod integration tests

- [ ] QA-031 - The Serverless custom endpoint accepts a valid job
  - Steps: Deploy the worker, send one valid encrypted payload, and inspect the JSON response.
  - Expected result: The endpoint returns a successful structured response.
  - Status: Not run
  - Notes: Blocking V1 infrastructure test.

- [ ] QA-040 - The worker Docker image builds successfully
  - Steps: Run a local or CI image build using the worker Dockerfile.
  - Expected result: The image builds without dependency or packaging errors.
  - Status: Not run
  - Notes: Required before RunPod deployment can be trusted.

- [ ] QA-041 - The worker can decrypt a BFF-produced payload
  - Steps: Generate a payload from the BFF implementation and feed it into the worker in a controlled test.
  - Expected result: The worker recovers a usable temporary audio file and continues to the processing stage.
  - Status: Not run
  - Notes: Depends on HKDF and AES-GCM compatibility.

## Worker cleanup tests

- [ ] QA-070 - Cleanup runs after a successful job
  - Steps: Complete a successful job and inspect whether the `/tmp/job_xxx` directory remains.
  - Expected result: The temp directory is removed and cleanup status reports success.
  - Status: Not run
  - Notes: Blocking V1 privacy test.

- [ ] QA-071 - Cleanup still runs after an error
  - Steps: Force an error path after temp file creation and inspect the worker temp directory afterward.
  - Expected result: The temp directory is removed even when the job fails.
  - Status: Not run
  - Notes: Blocking V1 privacy test.

## faster-whisper tests

- [ ] QA-050 - Short audio transcription works
  - Steps: Submit a short valid audio sample of about 30 to 60 seconds.
  - Expected result: The worker returns coherent `raw_text` and timestamped segments.
  - Status: Not run
  - Notes: First ML smoke test.

- [ ] QA-051 - Target-duration audio completes before timeout
  - Steps: Submit a realistic file of about 20 minutes within the file size limit.
  - Expected result: The job completes within the configured timeout and returns `raw_text`.
  - Status: Not run
  - Notes: The numeric timeout remains deployment-configurable, but it must be validated against realistic French audio.

## Local LLM correction tests

- [ ] QA-060 - `modified_text` stays faithful to `raw_text`
  - Steps: Compare `raw_text` and `modified_text` on a noisy or imperfect transcription sample.
  - Expected result: Readability improves but no obvious new information or meaning changes are introduced.
  - Status: Not run
  - Notes: The corrector should keep uncertain passages and mark them with `[a verifier]` when needed.

## Cost-control tests

- [ ] QA-091 - RunPod does not scale above one worker
  - Steps: Trigger concurrent jobs or inspect endpoint behavior under overlapping requests.
  - Expected result: The endpoint configuration prevents scaling beyond `workersMax=1`.
  - Status: Not run
  - Notes: Blocking cost-control test.

## UI and export tests

- [ ] QA-080 - Client-side format validation rejects unsupported files
  - Steps: Attempt to upload an unsupported extension such as `.exe`.
  - Expected result: The UI rejects the file immediately with a clear message.
  - Status: Not run
  - Notes: Convenience validation only; server validation still must exist.

- [ ] QA-083 - Export artifacts download correctly
  - Steps: Complete a successful job and trigger all export actions.
  - Expected result: `raw.txt`, `modified.txt`, and `result.json` all download and open correctly.
  - Status: Not run
  - Notes: Export support is part of the definition of done.

## Documentation and privacy tests

- [ ] QA-101 - Privacy documentation is accurate
  - Steps: Review the project docs against the real implementation behavior once coding exists.
  - Expected result: The docs explicitly mention temporary worker decryption and avoid false claims of absolute secrecy.
  - Status: Not run
  - Notes: Important because documentation must match real behavior.

## Deferred beyond V1

- [ ] QA-090 - Duration and cost estimate are populated in the UI
  - Steps: Complete a job and inspect the timing and estimated cost output.
  - Expected result: The values are present and non-empty.
  - Status: Deferred to V2
  - Notes: Not part of the V1 validation baseline.
