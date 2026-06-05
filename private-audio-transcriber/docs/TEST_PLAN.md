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
  - Notes: The repository already contains a partial local app shell.

- [ ] QA-082 - Raw and modified outputs are displayed after a successful job
  - Steps: Submit a valid job, wait for success, and open the result view.
  - Expected result: `raw_text` and `modified_text` are both visible and reviewable.
  - Status: Not run
  - Notes: This validates the main review workflow.

- [ ] QA-084 - A successful job creates a local history record
  - Steps: Submit a valid treatment with first name, last name, and one supported audio file, then inspect the local history view and storage folder.
  - Expected result: The job appears in `Historique` and `/storage/jobs/{job_id}` contains `metadata.json`, `raw.txt`, `modified.txt`, and `result.json`.
  - Status: Not run
  - Notes: Blocking V1 history test.

- [ ] QA-096 - Failed jobs are not historized
  - Steps: Force a processing failure after submission and inspect both the history view and `/storage/jobs`.
  - Expected result: No failed job is added to local history storage.
  - Status: Not run
  - Notes: V1 history should contain successful jobs only.

## Security tests

- [ ] QA-010 - Access is refused without authentication
  - Steps: Open the protected page and call `/api/transcribe` without a valid session cookie.
  - Expected result: The UI redirects to login or blocks access, and the API returns an auth error.
  - Status: Not run
  - Notes: Blocking V1 requirement.

- [ ] QA-013 - History access is refused without authentication
  - Steps: Attempt to open history routes, history data endpoints, and history download endpoints without a valid session.
  - Expected result: Access is denied consistently and no stored result file is returned.
  - Status: Not run
  - Notes: History must be protected like `/api/transcribe`.

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
  - Notes: This protects the AES-GCM key and nonce lifecycle.

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

## History lookup and download tests

- [ ] QA-085 - `raw.txt` can be downloaded from history
  - Steps: Complete one successful job, open it from `Historique`, and download `raw.txt`.
  - Expected result: The downloaded file opens locally and matches the stored raw transcript.
  - Status: Not run
  - Notes: Must not trigger a new RunPod call.

- [ ] QA-086 - `modified.txt` can be downloaded from history
  - Steps: Complete one successful job, open it from `Historique`, and download `modified.txt`.
  - Expected result: The downloaded file opens locally and matches the stored corrected transcript.
  - Status: Not run
  - Notes: Must not trigger a new RunPod call.

- [ ] QA-087 - `result.json` can be downloaded from history
  - Steps: Complete one successful job, open it from `Historique`, and download `result.json`.
  - Expected result: The downloaded JSON is valid and matches the stored structured result.
  - Status: Not run
  - Notes: Must not trigger a new RunPod call.

- [ ] QA-088 - History search works by last name
  - Steps: Create at least two historized jobs with different last names, then filter by one last name.
  - Expected result: Only matching records remain visible.
  - Status: Not run
  - Notes: First and last name tests are separated on purpose.

- [ ] QA-089 - History search works by first name
  - Steps: Create at least two historized jobs with different first names, then filter by one first name.
  - Expected result: Only matching records remain visible.
  - Status: Not run
  - Notes: This validates the required identity search field.

- [ ] QA-092 - History search works by original filename
  - Steps: Create at least two historized jobs with different original filenames, then filter by one filename.
  - Expected result: Only matching records remain visible.
  - Status: Not run
  - Notes: Filename matching behavior may later need exact-vs-partial clarification.

- [ ] QA-093 - History search works by processing date
  - Steps: Create historized jobs across at least two distinct dates or mock dates, then filter by one exact date.
  - Expected result: Only records for the selected exact date are shown.
  - Status: Not run
  - Notes: This validates exact-day filtering.

- [ ] QA-097 - History search works by date range
  - Steps: Create historized jobs across at least three distinct dates or mock dates, then filter with a bounded date range.
  - Expected result: Only records whose processing dates fall inside the selected range are shown.
  - Status: Not run
  - Notes: This validates range-based filtering.

- [ ] QA-098 - History pagination remains stable as records grow
  - Steps: Create enough historized jobs to exceed the default page size, then navigate across multiple pages.
  - Expected result: Ordering stays predictable, no record is duplicated or lost between pages, and filtering still behaves correctly with pagination.
  - Status: Not run
  - Notes: Added to make sure pagination is prepared from V1.

## UI and export tests

- [ ] QA-080 - Client-side format validation rejects unsupported files
  - Steps: Attempt to upload an unsupported extension such as `.exe`.
  - Expected result: The UI rejects the file immediately with a clear message.
  - Status: Not run
  - Notes: Convenience validation only; server validation still must exist.

- [ ] QA-083 - Export artifacts download correctly from the live result view
  - Steps: Complete a successful job and trigger all export actions from the treatment result view.
  - Expected result: `raw.txt`, `modified.txt`, and `result.json` all download and open correctly.
  - Status: Not run
  - Notes: Export support is part of the definition of done.

## Local storage and privacy tests

- [ ] QA-094 - Original audio is never stored in local history
  - Steps: Complete a successful job, inspect `/storage/jobs/{job_id}`, and list all files created.
  - Expected result: No original audio file is present in local history storage.
  - Status: Not run
  - Notes: Blocking privacy requirement.

- [ ] QA-095 - Encrypted audio payload is never stored in local history
  - Steps: Complete a successful job, inspect `/storage/jobs/{job_id}`, and review serialized metadata and stored artifacts.
  - Expected result: No encrypted audio blob or payload snapshot is persisted.
  - Status: Not run
  - Notes: This complements the original-audio storage test.

## Documentation and privacy tests

- [ ] QA-101 - Privacy documentation is accurate
  - Steps: Review the project docs against the real implementation behavior once coding exists.
  - Expected result: The docs explicitly mention temporary worker decryption, local history limits, and avoid false claims of absolute secrecy.
  - Status: Not run
  - Notes: Important because documentation must match real behavior.

## Clarifications needed

- `AGENTS.md` still names `ALLOW_CONCURRENT_JOBS`, while the current approved documentation set keeps `MAX_CONCURRENT_JOBS`. Reconfirm the final runtime variable name before implementing new concurrency-dependent behavior.

## Deferred beyond V1

- [ ] QA-090 - Duration and cost estimate are populated in the UI
  - Steps: Complete a job and inspect the timing and estimated cost output.
  - Expected result: The values are present and non-empty.
  - Status: Deferred to V2
  - Notes: Not part of the V1 validation baseline.
