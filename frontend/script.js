// script.js

// Get references to our HTML elements
const video = document.getElementById('lecture-video');
const progressPercentage = document.getElementById('progress-percentage');
// Get the progress bar container
const progressBarContainer = document.getElementById('progress-bar-container');
// Get the new single hover timestamp label element
const hoverTimestampLabel = document.getElementById('hover-timestamp-label');
const progressArea = document.getElementById('progress-area'); // Need parent for positioning label

// Data structure to store unique watched intervals [start_time, end_time]
let watchedIntervals = [];

// Variable to track the start time of the current continuous playback segment
let currentPlaybackStart = -1; // Use -1 to indicate no segment is being tracked

// Key for Local Storage. Make it unique for this video.
// Using the video source URL is a simple way to do this.
const localStorageKey = 'videoProgress_' + (video.querySelector('source')?.src || video.src);

console.log("Script loaded. Local Storage Key:", localStorageKey);

// --- Event Listeners ---

// When video starts playing
video.addEventListener('play', () => {
    // If we weren't already tracking a segment, start tracking from the current time
    if (currentPlaybackStart === -1) {
        currentPlaybackStart = video.currentTime;
        console.log('PLAY event: Playback started. Tracking segment from:', currentPlaybackStart);
    } else {
         console.log('PLAY event: Playback resumed. Still tracking segment from:', currentPlaybackStart);
    }
});

// When video is paused
video.addEventListener('pause', () => {
    // If we were tracking a segment, add it to our list of watched intervals
    if (currentPlaybackStart !== -1) {
        // The segment ends at the current time
        addWatchedInterval(currentPlaybackStart, video.currentTime);
        // Reset the tracking variable
        currentPlaybackStart = -1;
        console.log('PAUSE event: Playback paused at:', video.currentTime, 'Segment added.');
    } else {
         console.log('PAUSE event: Playback paused at:', video.currentTime, 'No segment was being tracked.');
    }
    saveProgress(); // Good time to save progress
});

// When the video starts seeking (user clicks on timeline, etc.)
video.addEventListener('seeking', () => {
    console.log('SEEKING event: Seeking started at:', video.currentTime, 'Video paused state:', video.paused);
    // If a continuous segment was being tracked (meaning video was likely playing), end it now.
    // Explicitly check if video was NOT paused right before seeking.
    if (currentPlaybackStart !== -1 && !video.paused) {
        const segmentStart = currentPlaybackStart; // Store the start time
        const segmentEnd = video.currentTime; // The segment ends at the time seeking started
        currentPlaybackStart = -1; // Reset tracking FIRST
        addWatchedInterval(segmentStart, segmentEnd); // Now add the interval
        console.log('SEEKING event: Detected playback interrupted by seeking. Ended previous segment tracking from:', segmentStart, 'to', segmentEnd);
    } else if (currentPlaybackStart !== -1 && video.paused) {
         console.log('SEEKING event: Detected seeking while video was already paused. Discarding previous segment tracking.');
         currentPlaybackStart = -1; // Discard if seeking started while already paused
    }
});


// When user finishes seeking (jumps) to a different part of the video
video.addEventListener('seeked', () => {
    console.log('SEEKED event: Seek finished. Video is now at:', video.currentTime, 'Video paused state:', video.paused);

    // --- Refined Logic for Seeking ---
    // The previous segment was already handled by the 'seeking' event if playback was interrupted.
    // We only start tracking a NEW segment here if the video is playing AFTER the seek finishes.
    if (!video.paused) {
         currentPlaybackStart = video.currentTime;
         console.log('SEEKED event: Video is playing after seek. New segment tracking started from:', currentPlaybackStart);
    } else {
         console.log('SEEKED event: Video is paused after seek. No new segment tracking started.');
    }

    // Recalculate and display progress after seeking
    updateProgressDisplay();
    saveProgress(); // Save progress after seeking
});

// When video ends
video.addEventListener('ended', () => {
     // If we were tracking a segment, add the final segment up to video duration
     if (currentPlaybackStart !== -1) {
        addWatchedInterval(currentPlaybackStart, video.duration);
        currentPlaybackStart = -1; // Reset tracking
        console.log('ENDED event: Video ended. Final segment added.');
    } else {
         console.log('ENDED event: Video ended. No segment was being tracked.');
    }
    // Ensure progress is updated, especially if the whole video was watched uniquely
    updateProgressDisplay();
    saveProgress(); // Save progress
});

// When video metadata (like duration) is loaded
video.addEventListener('loadedmetadata', () => {
    console.log('LOADEDMETADATA event: Metadata loaded. Duration:', video.duration);
    loadProgress(); // Attempt to load saved progress when video metadata is ready
    // Initial display update based on loaded data (also done in loadProgress)
    // updateProgressDisplay(); // Called inside loadProgress
});


// --- Hover Timestamp Logic ---

// Listen for mouse movement over the progress bar container
progressBarContainer.addEventListener('mousemove', (event) => {
    // console.log('mousemove event fired.'); // Log every mousemove event - can be noisy

    const totalDuration = video.duration;
    if (isNaN(totalDuration) || totalDuration <= 0) {
        hoverTimestampLabel.style.display = 'none'; // Hide if duration is invalid
        // console.log('mousemove: Duration invalid, hiding label.'); // Uncomment for more logs
        return;
    }

    // Calculate the mouse position relative to the progress bar container
    const rect = progressBarContainer.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // Mouse position relative to the left edge of the bar

    // Calculate the video time corresponding to the mouse position
    const hoverTime = (mouseX / rect.width) * totalDuration;

    // console.log(`mousemove: mouseX=${mouseX.toFixed(1)}, rect.width=${rect.width.toFixed(1)}, hoverTime=${hoverTime.toFixed(1)}s`); // Uncomment for more logs


    // Find which interval the hover time falls into (watched or unwatched)
    let isWatched = false;
    let relevantInterval = null;

    // Check if the hover time is within any watched interval
    for (const interval of watchedIntervals) {
        if (hoverTime >= interval[0] && hoverTime < interval[1]) {
            isWatched = true;
            relevantInterval = interval; // This is the watched interval
            // console.log('mousemove: Hover time is within a watched interval:', interval); // Uncomment for more logs
            break; // Found a watched interval, no need to check others
        }
    }

    // If the hover time is over a watched segment, show the label
    if (isWatched && relevantInterval) {
        // console.log('mousemove: Condition (isWatched && relevantInterval) is TRUE. Attempting to show label.'); // Uncomment for more logs
        const [start, end] = relevantInterval;
        // Show the watched interval timestamps
        hoverTimestampLabel.textContent = `Watched: ${formatTime(start)} - ${formatTime(end)}`;

        // Position the label relative to the progress area
        const progressAreaRect = progressArea.getBoundingClientRect();
        // Calculate the label's left position relative to the progress area's left edge
        const labelLeftPosition = event.clientX - progressAreaRect.left; // Use event.clientX directly relative to progressAreaRect.left

        hoverTimestampLabel.style.left = labelLeftPosition + 'px';
        // Position above the progress bar container, adjusted for the padding-top in progress-area
        // Need to consider the height of the label once it's potentially visible
         // Temporarily display label to get accurate offsetHeight
         hoverTimestampLabel.style.display = 'block';
         const labelHeight = hoverTimestampLabel.offsetHeight;
         // Calculate top position relative to the progress area's top edge
         const labelTopPosition = rect.top - progressAreaRect.top - labelHeight - 5; // 5px padding above label

         hoverTimestampLabel.style.top = labelTopPosition + 'px';


         // Adjust horizontal position if close to edges to prevent overflow
         const labelWidth = hoverTimestampLabel.offsetWidth;
         const areaWidth = progressAreaRect.width;

         // Check if centering would push the left edge off the area
         if (labelLeftPosition - labelWidth / 2 < 0) {
             hoverTimestampLabel.style.left = '0px';
             hoverTimestampLabel.style.transform = 'translateX(0)'; // Align left edge to area start
             // console.log('mousemove: Label positioned at start.'); // Uncomment for more logs
         }
         // Check if centering would push the right edge off the area
         else if (labelLeftPosition + labelWidth / 2 > areaWidth) {
             hoverTimestampLabel.style.left = areaWidth + 'px';
             hoverTimestampLabel.style.transform = 'translateX(-100%)'; // Align right edge to area end
             // console.log('mousemove: Label positioned at end.'); // Uncomment for more logs
         }
         else {
             hoverTimestampLabel.style.transform = 'translateX(-50%)'; // Center if in the middle
             // console.log('mousemove: Label centered.'); // Uncomment for more logs
         }


    } else {
        // If over an unwatched segment or outside the bar, hide the label
        hoverTimestampLabel.style.display = 'none';
        // console.log('mousemove: Condition (isWatched && relevantInterval) is FALSE. Hiding label.'); // Uncomment for more logs
    }
});

// Hide the label when the mouse leaves the progress bar container or the progress area
progressBarContainer.addEventListener('mouseleave', () => {
    hoverTimestampLabel.style.display = 'none';
    console.log('mouseleave progress bar container: Hiding label.');
});
// Also hide if mouse leaves the entire progress area (covers cases where label is outside bar)
progressArea.addEventListener('mouseleave', () => {
     hoverTimestampLabel.style.display = 'none';
     console.log('mouseleave progress area: Hiding label.');
});


// --- Core Logic Functions ---

// Adds a new watched interval and merges the list
function addWatchedInterval(start, end) {
     // Basic validation: ensure start is less than end and within video bounds
    if (start >= end || start < 0 || end > video.duration) {
        console.warn('Attempted to add invalid interval:', [start, end]);
        return;
    }
    // Add the new interval to our list
    watchedIntervals.push([start, end]);
    // Merge the intervals to keep the list clean and accurate
    watchedIntervals = mergeIntervals(watchedIntervals);
    console.log('Interval added and merged. Current intervals:', JSON.stringify(watchedIntervals));
    // Update display after adding/merging intervals
    updateProgressDisplay();
}

// Merges overlapping or adjacent intervals in the watchedIntervals array.
// This is crucial for tracking unique time.
function mergeIntervals(intervals) {
    // If there are no intervals, return an empty array
    if (intervals.length === 0) {
        return [];
    }

    // 1. Sort intervals based on their start time.
    // This allows us to process them in chronological order.
    intervals.sort((a, b) => a[0] - b[0]);

    // 2. Initialize the result list with the first interval.
    const merged = [intervals[0]];

    // 3. Iterate through the rest of the intervals.
    for (let i = 1; i < intervals.length; i++) {
        const currentInterval = intervals[i];
        // Get the last interval that was added to our merged list
        const lastMergedInterval = merged[merged.length - 1];

        // 4. Check for overlap or adjacency:
        // If the current interval's start time is less than or equal to
        // the end time of the last merged interval, they overlap or touch.
        if (currentInterval[0] <= lastMergedInterval[1]) {
            // 5. Merge: Extend the end time of the last merged interval
            // to be the maximum of its current end time and the current interval's end time.
            // This handles cases where the current interval is fully contained within
            // the last merged one, or extends beyond it.
            lastMergedInterval[1] = Math.max(lastMergedInterval[1], currentInterval[1]);
        } else {
            // 6. No overlap: If the current interval does not overlap with the last merged one,
            // it means the last merged interval is complete. Add the current interval
            // as a new, separate merged interval.
            merged.push(currentInterval);
        }
    }

    // 7. Return the list of non-overlapping, merged intervals.
    return merged;
}

// Calculates the total unique time watched from the merged intervals
function getUniqueWatchedTime() {
    let totalTime = 0;
    // Sum the duration (end - start) of each merged interval
    for (const interval of watchedIntervals) {
        totalTime += (interval[1] - interval[0]);
    }
    return totalTime;
}

// Helper function to format time in seconds into MM:SS format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
    return `${minutes}:${formattedSeconds}`;
}


// Updates the progress percentage text and visually renders the watched segments
// Timestamp labels are now handled by the mousemove event listener
function updateProgressDisplay() {
    const uniqueTime = getUniqueWatchedTime();
    const totalDuration = video.duration;

    // Handle cases where duration is not available yet or is zero
    if (isNaN(totalDuration) || totalDuration <= 0) {
        progressPercentage.textContent = '0.0';
        // Clear any existing segments if duration is invalid
        progressBarContainer.innerHTML = '';
        // Hide the hover label
        hoverTimestampLabel.style.display = 'none';
        return;
    }

    // Calculate the percentage, ensuring it doesn't exceed 100%
    const percentage = (uniqueTime / totalDuration) * 100;
    const displayPercentage = Math.min(percentage, 100).toFixed(1); // Clamp and format

    // Update the text
    progressPercentage.textContent = displayPercentage;

    // --- Visual Rendering of Watched Segments ---

    // Clear any previously rendered segments (except the hover label)
    // We need to keep the hover label element inside the container
    const existingSegments = progressBarContainer.querySelectorAll('.watched-segment');
    existingSegments.forEach(segment => segment.remove());


    // Iterate through the merged intervals and create a div for each
    watchedIntervals.forEach(interval => {
        const [start, end] = interval;

        // Calculate the position and width of the segment in percentage
        const leftPercentage = (start / totalDuration) * 100;
        const widthPercentage = ((end - start) / totalDuration) * 100;

        // Create a new div element for the segment
        const segmentDiv = document.createElement('div');
        segmentDiv.classList.add('watched-segment'); // Add the CSS class

        // Set the style to position and size the segment
        segmentDiv.style.left = leftPercentage + '%';
        segmentDiv.style.width = widthPercentage + '%';

        // Append the segment div to the progress bar container
        progressBarContainer.appendChild(segmentDiv);
    });

    // Note: Timestamp labels are no longer rendered here.
    // They are handled dynamically on mouse hover.

    console.log(`Unique time: ${uniqueTime.toFixed(1)}s, Total duration: ${totalDuration.toFixed(1)}s, Progress: ${displayPercentage}%`);
}


// --- Data Persistence (Local Storage) ---

// Saves the current watched intervals and video position to Local Storage
function saveProgress() {
    const progressData = {
        intervals: watchedIntervals,
        currentTime: video.currentTime // Save current time for resuming playback position
    };
    try {
        // Convert the data object to a JSON string before saving
        const dataToSave = JSON.stringify(progressData);
        localStorage.setItem(localStorageKey, dataToSave);
        console.log('Attempted to save progress to Local Storage:', dataToSave);
    } catch (e) {
        console.error('Failed to save progress to Local Storage:', e);
        // Check if error is due to storage full
        if (e.name === 'QuotaExceededError') {
            console.error('Local Storage is full. Cannot save progress.');
            // Optionally alert the user or handle this case
        }
    }
}

// Loads saved progress from Local Storage
function loadProgress() {
    try {
        console.log('Attempting to load progress from Local Storage with key:', localStorageKey);
        // Read the data string from Local Storage
        const savedData = localStorage.getItem(localStorageKey);

        if (savedData) {
            console.log('Found saved data in Local Storage:', savedData);
            // Parse the JSON string back into a JavaScript object
            const progressData = JSON.parse(savedData);
            console.log('Parsed saved data:', progressData);

            // Restore the watched intervals, defaulting to an empty array if none exist
            watchedIntervals = progressData.intervals || [];
            console.log('Restored watched intervals:', watchedIntervals);

            // Restore the video playback position if a valid time was saved
            if (progressData.currentTime !== undefined && !isNaN(progressData.currentTime)) {
                 video.currentTime = progressData.currentTime;
                 console.log('Video position restored to:', video.currentTime);
            } else {
                 console.log('No valid saved time found in data. Starting from 0.');
                 video.currentTime = 0; // Start from beginning if no valid time saved
            }
            console.log('Progress loaded successfully from Local Storage.');
            // Update the display based on the loaded data, which will also render the segments
            updateProgressDisplay();
        } else {
            console.log('No saved progress found in Local Storage for key:', localStorageKey);
            // Ensure initial state is clean if no data found
            watchedIntervals = [];
            video.currentTime = 0;
            updateProgressDisplay();
        }
    } catch (e) {
        console.error('Failed to load or parse progress from Local Storage:', e);
        // Reset state if loading fails to prevent errors
        watchedIntervals = [];
        video.currentTime = 0;
        updateProgressDisplay();
    }
}

// Initial load of progress when the script starts (or when metadata is ready).
// The loadProgress function is called in the 'loadedmetadata' event listener
// to ensure video.duration is available when calculating progress and setting currentTime.
// loadProgress(); // Called in loadedmetadata event listener instead
