📽️ Video Progress Tracker
This project is a full-stack web application that tracks a user's progress while watching a video. It allows users to resume from where they left off and visually highlights watched segments on the video progress bar — all without requiring a login system.

🚀 Features
Tracks continuous playback segments of a video

Merges overlapping/adjacent watched intervals

Visually displays watched segments on the progress bar

Saves watched progress and last position to a backend API

Loads saved progress when the video page is revisited

Identifies users via a unique ID stored in localStorage

🛠️ Technologies Used
Frontend: HTML, CSS, JavaScript (Vanilla)

Backend: Node.js, Express.js

Database: MongoDB (Mongoose ODM)

Deployment:

Frontend: Netlify (initial setup)

Backend: Render (or alternative fullstack host)

📦 Setup and Running Locally
Prerequisites
Node.js and npm installed

MongoDB Atlas or a local MongoDB instance

Git installed

1. Clone the Repository
bash
Copy
Edit
git clone <your-repo-url>
cd <your-project-folder>
2. Install Backend Dependencies
bash
Copy
Edit
cd backend
npm install
3. Configure Environment Variables
Create a .env file in the backend folder:

env
Copy
Edit
PORT=5000
MONGO_URI=your_mongodb_connection_string
4. Start the Backend Server
bash
Copy
Edit
npm run dev
5. Open Frontend
Navigate to the frontend folder and open index.html in a browser.

🧠 How It Works
🕒 Progress Tracking
Uses HTML5 video events: play, pause, seeking, seeked, ended.

Records segments from currentPlaybackStart to current time when playback is interrupted.

Seeks only count as watched if playback was active before seeking.

lastKnownTime tracks the latest position.

🔁 Interval Merging
Stored as [[start, end], ...] on frontend.

Merging involves:

Sorting intervals by start time

Combining overlapping/adjacent segments

Producing a clean, non-overlapping segment list

🧩 Frontend-Backend Communication
POST /save:

Sends { start, end } format for watchedSegments

Includes userId, videoId, duration, lastPosition, percentageWatched

GET /load:

Receives { start, end } format

Maps it back to [[start, end]] on frontend

👤 User & Video Identification
Unique user ID generated with getOrCreateUserId() and stored in localStorage

currentVideoId in script.js identifies the video (e.g., "video-001")

🧪 Challenges & Solutions
Challenge	Solution
CORS Issues	Enabled CORS middleware in Express and configured allowed origins
Environment URL Confusion	Added API_BASE_URL constant in frontend script
Data Type Bugs in State	Used console.log and strict type checks to sanitize internal state
Schema Mismatch	Explicitly mapped [[start, end]] → { start, end } format before API calls
Field Name Inconsistencies	Synced frontend requests with backend field names and ensured user ID is always passed

📁 Folder Structure
pgsql
Copy
Edit
project-root/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── config/
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
📌 Future Improvements
Add user authentication system

Support multiple videos per user

Add progress analytics (e.g., heatmaps)

Allow manual segment marking

🧑‍💻 Author
Soumyajit Datta
GitHub: @soumyajit73
