# Video Progress Tracker

* This project is a web application that tracks a user's watch progress on a video.
* It saves the watched segments to a backend database, allowing the user to resume watching from where they left off and see which parts they have already viewed.

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
* **Deployment:** 
  * Netlify (Frontend - initial setup)
  * Render (Backend or Fullstack)

## Setup and Running Locally

### Prerequisites

* Node.js and npm (or yarn) installed.
* Access to a MongoDB database (MongoDB Atlas cloud database is recommended and used for deployment).
* Git installed.

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <your-project-folder>





* **Backend Mongoose Schema vs. Frontend Data Format Mismatch:** Mongoose expecting `{ start, end }` objects in `watchedIntervals` while the frontend sent `[[start, end]]` arrays, leading to validation failures.
  * **Solution:** Modified the frontend `saveProgress` function to explicitly map the internal `[[start, end]]` array format to the `{ start, end }` object format required by the Mongoose schema just before sending the data.

* **Backend Route Field Names and User ID Handling:** Backend routes expecting different field names (`watchedSegments`) and potentially using a fixed user ID instead of the one sent by the frontend.
  * **Solution:** Updated the frontend `saveProgress` and `loadProgress` functions to send and expect the field 
