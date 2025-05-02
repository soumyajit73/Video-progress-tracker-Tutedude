# Video Progress Tracker

This project is a web application that tracks a user's watch progress on a video. It saves the watched segments to a backend database, allowing the user to resume watching from where they left off and see which parts they have already viewed.

## Features

* Tracks continuous playback segments of a video.
* Merges overlapping or adjacent watched segments to calculate unique watched time.
* Visually displays watched segments on a progress bar.
* Saves user's progress (watched segments and last position) to a backend API.
* Loads saved progress when the video page is visited.
* Uses a simple unique ID stored in local storage to identify users without a login system.

## Technologies Used

* **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (using Mongoose for object modeling)
* **Deployment:** Netlify (Frontend - initial setup), Render (Backend or Fullstack)

## Setup and Running Locally

### Prerequisites

* Node.js and npm (or yarn) installed.
* Access to a MongoDB database (MongoDB Atlas cloud database is recommended and used for deployment).
* Git installed.

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <your-project-folder>

## Design Decisions and How it Works

Building this application involved several design decisions and implementation details:

### Progress Tracking

* Progress is tracked by listening to standard HTML5 video events like `play`, `pause`, `seeking`, `seeked`, and `ended`.
* A `currentPlaybackStart` variable records the `video.currentTime` when playback begins (`play` event).
* When playback is interrupted by `pause`, `seeking`, or `ended`, the segment from `currentPlaybackStart` to the current time is recorded as a watched interval `[start, end]`.
* `lastKnownTime` is updated on `timeupdate` and seeking events to help identify skips or the position before a seek.
* The `seeking` event logic is configured to only record a segment watched *before* a seek if playback was active (`currentPlaybackStart !== -1`) when the seek began. Seeking from a paused state does not add a segment by the `seeking` event itself.

### Interval Merging

* Watched intervals are stored in a `watchedIntervals` array on the frontend in the format `[[start, end], ...]`.
* The `mergeIntervals` helper function is used to consolidate these segments into a clean list of non-overlapping intervals.
* The merging logic involves:
    1.  Sorting the intervals by their start times.
    2.  Iterating through the sorted intervals and comparing each with the last interval added to the merged list.
    3.  If the current interval overlaps with or is adjacent (within a small tolerance) to the last merged interval, the last merged interval's end time is extended to cover the current interval's end time.
    4.  If there is no overlap, the current interval is added as a new distinct segment to the merged list.
* This merged list (`watchedIntervals`) is used internally on the frontend for display and calculation.

### Frontend-Backend Communication

* The frontend communicates with the backend API using the `Workspace` API.
* `saveProgress()` sends a `POST` request to the backend. It takes the internal `watchedIntervals` array (`[[start, end], ...]`) and maps it to the `{ start, end }` object format required by the backend Mongoose schema *just before sending*. It also includes the user ID, video ID, total duration, percentage watched, and last known position.
* `loadProgress()` sends a `GET` request to fetch saved progress. It expects the response to include `watchedSegments` as an array of `{ start, end }` objects. It then maps this received data back into the frontend's internal `[start, end]` array format.

### User and Video Identification

* A simple unique user ID is generated and stored in the browser's `localStorage` using `getOrCreateUserId`. This ID is sent to the backend to track progress for this specific "user" in this browser.
* A `currentVideoId` constant needs to be set in `script.js` to uniquely identify the video being watched. This ID is used by the backend to distinguish progress across different videos.

## Challenges Encountered and Solutions

Building this application involved several challenges, common in fullstack development and state management:

1.  **CORS (Cross-Origin Resource Sharing):** Blocking API requests between frontend and backend on different origins.
    * **Solution:** Implementing the `cors` middleware in the Express backend, configured to allow requests from the frontend's origin(s).
2.  **Frontend API URL Configuration:** Ensuring the frontend calls the correct backend URL in different environments (local vs. deployed).
    * **Solution:** Using a configurable `API_BASE_URL` constant in the frontend `script.js` and updating it appropriately for each environment.
3.  **Frontend Internal State Corruption:** Tracing why the `watchedIntervals` array on the frontend sometimes contained strings instead of numerical pairs, causing backend validation errors.
    * **Solution:** Extensive targeted `console.log` debugging to pinpoint the issue's origin, verifying variable types at key points. Ensuring the code strictly handles only numerical arrays internally and adding defensive filtering helped mitigate this.
4.  **Backend Mongoose Schema vs. Frontend Data Format Mismatch:** Mongoose expecting `{ start, end }` objects in `watchedIntervals` while the frontend sent `[[start, end]]` arrays, leading to validation failures.
    * **Solution:** Modified the frontend `saveProgress` function to explicitly map the internal `[[start, end]]` array format to the `{ start, end }` object format required by the Mongoose schema just before sending the data.
5.  **Backend Route Field Names and User ID Handling:** Backend routes expecting different field names (`watchedSegments`) and potentially using a fixed user ID instead of the one sent by the frontend.
    * **Solution:** Updated the frontend `saveProgress` and `loadProgress` functions to send and expect the field names and user ID handling used by the specific backend routes file.
6.  **Deployment Configuration:** Setting up environment variables, configuring static file serving for fullstack deployment, and managing database network access.
    * **Solution:** Following platform-specific documentation (like Render's), configuring environment variables, setting up static middleware in Express, and whitelisting IP addresses in MongoDB Atlas.
