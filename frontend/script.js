// Time in seconds to consider a "skip" in timeupdate (used for detection/logging, not direct segment creation)
const SKIP_THRESHOLD = 0.5;

const video = document.getElementById('lecture-video');
const progressPercentage = document.getElementById('progress-percentage');
const progressBarContainer = document.getElementById('progress-bar-container');
const hoverTimestampLabel = document.getElementById('hover-timestamp-label');
const progressArea = document.getElementById('progress-area');

// Array to store watched intervals [start_time, end_time]
let watchedIntervals = [];

// Tracks the start time of the currently playing segment. -1 indicates no segment is being tracked.
let currentPlaybackStart = -1;

// Stores the video's time from the previous timeupdate event, used for skip detection.
let lastKnownTime = 0;

// Unique key for local storage, based on video source URL.
const localStorageKey = 'videoProgress_' + (video.querySelector('source')?.src || video.src || 'defaultVideoId');
// Add a fallback ID if src is not immediately available


// --- Event Listeners ---

// When video starts playing
video.addEventListener('play', () => {
    console.log('Event: play');
    // Start tracking a new segment only if we are not already in the middle of one
    if (currentPlaybackStart === -1) {
        currentPlaybackStart = video.currentTime;
        console.log(`Tracking new segment starting at: ${formatTime(currentPlaybackStart)}`);
    }
    lastKnownTime = video.currentTime; // Initialize or update lastKnownTime
});

// When video is paused
video.addEventListener('pause', () => {
    console.log('Event: pause');
    // If tracking a segment and the pause wasn't triggered by the start of a seek, add the segment.
    // We check !video.seeking because a pause can sometimes fire immediately after seeking starts in some browsers,
    // and the segment ending is primarily handled by the 'seeking' event itself.
    if (currentPlaybackStart !== -1 && !video.seeking) {
        const segmentStart = currentPlaybackStart;
        const segmentEnd = video.currentTime;
        currentPlaybackStart = -1; // Reset tracking as playback has stopped

        // Add the segment only if it has a positive duration
        if (segmentStart < segmentEnd) {
             console.log(`Pause detected. Adding segment: [${formatTime(segmentStart)}, ${formatTime(segmentEnd)}]`);
            addWatchedInterval(segmentStart, segmentEnd);
        } else {
             console.log(`Pause detected, but segment [${formatTime(segmentStart)}, ${formatTime(segmentEnd)}] had non-positive duration. Not added.`);
        }
    } else if (currentPlaybackStart !== -1 && video.seeking) {
        // If paused while seeking (less common), assume the seeking event already handled the segment end
        console.log(`Paused while seeking. Assuming 'seeking' event handled segment end. Resetting tracking.`);
        currentPlaybackStart = -1; // Reset tracking
    } else {
         console.log('Pause detected, but no segment was actively being tracked.');
    }
    saveProgress(); // Always save progress on pause to capture current time
});

// When seeking starts (user interacts with timeline)
video.addEventListener('seeking', () => {
    console.log(`Event: seeking. CurrentTime at seeking start: ${formatTime(video.currentTime)}`);

    // When seeking starts, the current segment is considered ended at the time the seek began.
    // Capture the time *before* the browser jumps to the new seek position.
    const timeBeforeSeek = video.currentTime;

    // If a segment was being tracked, end it at the time seeking started.
    if (currentPlaybackStart !== -1) {
        const segmentStart = currentPlaybackStart;
        const segmentEnd = timeBeforeSeek; // Use the time captured right at seeking start
        currentPlaybackStart = -1; // Reset tracking immediately

        // Add the segment only if it has a positive duration
        if (segmentStart < segmentEnd) {
             console.log(`Seeking started. Adding segment watched BEFORE seek: [${formatTime(segmentStart)}, ${formatTime(segmentEnd)}]`);
            addWatchedInterval(segmentStart, segmentEnd);
        } else {
             console.log(`Seeking started, but segment [${formatTime(segmentStart)}, ${formatTime(segmentEnd)}] had non-positive duration. Not added.`);
        }
    } else {
         console.log('Seeking started, but no segment was actively being tracked.');
         // If no segment was tracked, there's no previous continuous segment to save.
         // The code proceeds without adding a segment here.
    }
     lastKnownTime = video.currentTime; // Update lastKnownTime after capturing timeBeforeSeek
});

// When seeking finishes
video.addEventListener('seeked', () => {
    console.log(`Event: seeked. CurrentTime after seek: ${formatTime(video.currentTime)}`);
    // If the video is playing after the seek, start tracking a new segment from the new position.
    // If it's paused, we wait for a 'play' event to start tracking a new segment.
    if (!video.paused) {
         console.log(`Video is playing after seek. Starting new segment at: ${formatTime(video.currentTime)}`);
         currentPlaybackStart = video.currentTime;
    } else {
         console.log('Video is paused after seek. Not starting a new segment automatically.');
         currentPlaybackStart = -1; // Ensure tracking is off if paused after seek
    }
    lastKnownTime = video.currentTime; // Update lastKnownTime after seek completes
    updateProgressDisplay(); // Update display after seek
    saveProgress(); // Save progress after seek to capture the new current time
});

// When video ends
video.addEventListener('ended', () => {
    console.log('Event: ended');
     // Add the final segment if tracking was active
     if (currentPlaybackStart !== -1) {
        const segmentStart = currentPlaybackStart;
        const segmentEnd = video.duration; // Segment ends at the video duration
         console.log(`Video ended. Adding final segment: [${formatTime(segmentStart)}, ${formatTime(segmentEnd)}]`);
         addWatchedInterval(segmentStart, segmentEnd);
         currentPlaybackStart = -1; // Reset tracking
     } else {
          console.log('Video ended, but no segment was actively being tracked.');
     }
    updateProgressDisplay(); // Update display
    saveProgress(); // Save final progress
});

// When video metadata is loaded (duration available)
video.addEventListener('loadedmetadata', () => {
    console.log('Event: loadedmetadata. Duration:', video.duration);
    loadProgress(); // Load saved progress
    lastKnownTime = video.currentTime; // Initialize lastKnownTime after loading
    // Initial display update happens within loadProgress finally block
});

// Use timeupdate primarily for updating display frequently during regular playback
// It also helps in detecting potential skips based on time difference,
// but segment ending is managed by 'seeking', 'pause', and 'ended'.
video.addEventListener('timeupdate', () => {
    const currentTime = video.currentTime;
    const totalDuration = video.duration;

    // Optional: Detect a skip forward based on time difference for logging/debugging
    if (!video.paused && totalDuration > 0 && lastKnownTime !== undefined) {
        const timeDifference = currentTime - lastKnownTime;
        if (timeDifference > SKIP_THRESHOLD) {
            // This indicates a jump in time, but the 'seeking' event (if user-initiated)
            // or the 'pause' event would handle adding the segment before the jump.
            // console.log(`Detected potential large time jump via timeupdate: From ${formatTime(lastKnownTime)} to ${formatTime(currentTime)}`);
        }
    }
    lastKnownTime = currentTime; // Always update lastKnownTime
    // Uncomment the line below if you want the progress bar/percentage to update very frequently
    // updateProgressDisplay();
});


// --- Progress Bar Interaction ---

// mouse hover to detect watched intervals and show timestamp
progressBarContainer.addEventListener('mousemove', (event) => {
    const totalDuration = video.duration;
    if (isNaN(totalDuration) || totalDuration <= 0) {
        hoverTimestampLabel.style.display = 'none';
        return;
    }

    // Calculate video time corresponding to mouse position
    const rect = progressBarContainer.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const hoverTime = (mouseX / rect.width) * totalDuration;

    // Check if hover time is within a watched interval
    let isWatched = false;
    let relevantInterval = null;
    // Iterate through intervals to find if the hover time is within any
    for (const interval of watchedIntervals) {
        if (hoverTime >= interval[0] && hoverTime < interval[1]) {
            isWatched = true;
            relevantInterval = interval;
            break; // Found an interval, no need to check others
        }
    }

    // Show/hide and position the label
    if (isWatched && relevantInterval) {
        const [start, end] = relevantInterval;
        hoverTimestampLabel.textContent = `Watched: ${formatTime(start)} - ${formatTime(end)}`;

        // Position the label relative to the progress area
        const progressAreaRect = progressArea.getBoundingClientRect();
        // Calculate horizontal position relative to the progress area's left edge
        const labelLeftPosition = event.clientX - progressAreaRect.left;

        hoverTimestampLabel.style.left = labelLeftPosition + 'px';

        // Temporarily display to get height for positioning accurately
         hoverTimestampLabel.style.display = 'block';
         const labelHeight = hoverTimestampLabel.offsetHeight;
         // Position above the progress bar, adjusting for the progress area's top edge
         const labelTopPosition = rect.top - progressAreaRect.top - labelHeight - 5; // 5px buffer

         hoverTimestampLabel.style.top = labelTopPosition + 'px';

         // Adjust horizontal position near edges to prevent overflow
         const labelWidth = hoverTimestampLabel.offsetWidth;
         const areaWidth = progressAreaRect.width;

         // Calculate potential left edge if centered
         const potentialLeft = labelLeftPosition - labelWidth / 2;
         // Calculate potential right edge if centered
         const potentialRight = labelLeftPosition + labelWidth / 2;

         if (potentialLeft < 0) {
             // If centering goes off the left edge, align left
             hoverTimestampLabel.style.left = '0px';
             hoverTimestampLabel.style.transform = 'translateX(0)'; // No horizontal translation needed
         } else if (potentialRight > areaWidth) {
             // If centering goes off the right edge, align right
             hoverTimestampLabel.style.left = areaWidth + 'px';
             hoverTimestampLabel.style.transform = 'translateX(-100%)'; // Translate left by 100% of its width
         } else {
             // Otherwise, center the label
             hoverTimestampLabel.style.transform = 'translateX(-50%)'; // Translate left by 50% of its width
         }


    } else {
        // If not within a watched interval, hide the label
        hoverTimestampLabel.style.display = 'none';
    }
});

// Hide label when mouse leaves progress area
progressArea.addEventListener('mouseleave', () => {
     hoverTimestampLabel.style.display = 'none';
});


// --- Interval Management ---

// Adds a new watched interval [start, end] and merges the list to consolidate overlaps.
function addWatchedInterval(start, end) {
     // Validate interval based on video duration if available
    if (video.duration > 0 && (start < 0 || end > video.duration + 1 || start >= end)) {
         console.warn('Attempted to add potentially invalid interval based on duration:', [start, end], 'Video Duration:', video.duration);
         // Decide whether to return or try adding anyway if duration is unreliable initially
         // For now, we'll add but the merge/display logic should handle clipping.
         // return; // Uncomment to strictly reject invalid intervals
    } else if (start < 0 || start >= end) {
         console.warn('Attempted to add invalid interval (start < 0 or start >= end):', [start, end]);
         return;
    }


    // Clip interval to video duration if duration is known
    const clippedStart = Math.max(0, start);
    const clippedEnd = (video.duration > 0) ? Math.min(video.duration, end) : end; // Clip end if duration is known

     if (clippedStart >= clippedEnd) {
         console.warn('Clipped interval has non-positive duration, not adding:', [clippedStart, clippedEnd]);
         return;
     }


    watchedIntervals.push([clippedStart, clippedEnd]);
    watchedIntervals = mergeIntervals(watchedIntervals); // Merge overlapping/adjacent intervals
    console.log('Interval added and merged. Current watchedIntervals:', watchedIntervals.map(i => `[${formatTime(i[0])}, ${formatTime(i[1])}]`)); // Log formatted intervals
    updateProgressDisplay(); // Update the visual display of watched segments
}

// Merges overlapping or adjacent intervals in the watchedIntervals array.
function mergeIntervals(intervals) {
    if (intervals.length === 0) {
        return [];
    }
    // Create a copy to avoid modifying the original array during sorting
    const sortedIntervals = [...intervals].sort((a, b) => a[0] - b[0]);
    const merged = [sortedIntervals[0]];

    for (let i = 1; i < sortedIntervals.length; i++) {
        const currentInterval = sortedIntervals[i];
        const lastMergedInterval = merged[merged.length - 1];

        // Check for overlap or adjacency (within a small tolerance for floating point comparisons)
        // If the current interval starts before or at the end of the last merged interval, they overlap or are adjacent.
        if (currentInterval[0] <= lastMergedInterval[1] + 0.001) { // Allow a tiny gap/overlap due to floating points
            // Merge intervals: extend the end of the last merged interval if the current one goes further.
            lastMergedInterval[1] = Math.max(lastMergedInterval[1], currentInterval[1]);
        } else {
            // No overlap or adjacency, add the current interval as a new distinct segment.
            merged.push(currentInterval);
        }
    }
     // Optional: Clean up intervals that are just a single point or very tiny segments that might result from rapid events.
     // Keep intervals with a duration greater than a small threshold (e.g., 0.1 seconds).
     return merged.filter(interval => interval[1] - interval[0] > 0.1);
}

// Calculates the total unique time watched by summing the durations of merged intervals.
function getUniqueWatchedTime() {
    let totalTime = 0;
    for (const interval of watchedIntervals) {
        totalTime += (interval[1] - interval[0]);
    }
    // Ensure total time does not exceed video duration if known
    const totalDuration = video.duration;
    if (!isNaN(totalDuration) && totalDuration > 0) {
         return Math.min(totalTime, totalDuration);
    }
    return totalTime;
}

// Helper function to format time in MM:SS format.
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const roundedSeconds = Math.floor(seconds);
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
    return `${minutes}:${formattedSeconds}`;
}


// Updates the displayed progress percentage and renders the visual watched segments on the progress bar.
function updateProgressDisplay() {
    const uniqueTime = getUniqueWatchedTime();
    const totalDuration = video.duration;

    // Handle cases where duration is not yet available or invalid
    if (isNaN(totalDuration) || totalDuration <= 0) {
        progressPercentage.textContent = '0.0';
        progressBarContainer.innerHTML = ''; // Clear segments
        hoverTimestampLabel.style.display = 'none';
        return;
    }

    // Calculate and display the watched percentage
    const percentage = (uniqueTime / totalDuration) * 100;
    const displayPercentage = Math.min(percentage, 100).toFixed(1); // Clamp to 100% and format
    progressPercentage.textContent = displayPercentage; // Update percentage text

    // Clear existing visual segments from the progress bar
    const existingSegments = progressBarContainer.querySelectorAll('.watched-segment');
    existingSegments.forEach(segment => segment.remove());

    // Create and append new visual segments based on the merged watched intervals
    watchedIntervals.forEach(interval => {
        const [start, end] = interval;
        // Ensure calculations are based on a valid, positive duration
        if (totalDuration > 0) {
            const leftPercentage = (start / totalDuration) * 100;
            const widthPercentage = ((end - start) / totalDuration) * 100;

            const segmentDiv = document.createElement('div');
            segmentDiv.classList.add('watched-segment'); // Add class for styling
            segmentDiv.style.left = leftPercentage + '%';
            segmentDiv.style.width = widthPercentage + '%';

            progressBarContainer.appendChild(segmentDiv);
        }
    });
}


// --- Local Storage ---

// Saves the current watched intervals and video playback time to Local Storage.
function saveProgress() {
    const progressData = {
        intervals: watchedIntervals,
        // Saving currentTime allows the video to resume at the last exact point played or seeked to.
        currentTime: video.currentTime
    };
    try {
        localStorage.setItem(localStorageKey, JSON.stringify(progressData));
        console.log('Progress saved:', progressData); // Log the data being saved
    } catch (e) {
        console.error('Failed to save progress to Local Storage:', e);
        if (e.name === 'QuotaExceededError') {
            console.error('Local Storage is full. Cannot save progress.');
        }
    }
}

// Loads watched intervals and video playback time from Local Storage.
function loadProgress() {
    try {
        const savedData = localStorage.getItem(localStorageKey);
        if (savedData) {
            const progressData = JSON.parse(savedData);
            // Load intervals, ensuring it's an array
            watchedIntervals = Array.isArray(progressData.intervals) ? progressData.intervals : [];

            // Set video current time if saved data is valid and duration is known
            // Check video.duration > 0 to ensure metadata is loaded before setting time
            if (progressData.currentTime !== undefined && !isNaN(progressData.currentTime) && video.duration > 0) {
                 // Clamp loaded time to be within the video's duration to prevent errors
                 video.currentTime = Math.min(progressData.currentTime, video.duration);
                 console.log(`Loaded initial current time: ${formatTime(video.currentTime)}`);
            } else {
                 // If no valid time or duration not ready, set to 0
                 video.currentTime = 0;
                 console.log('No valid initial current time loaded or duration not available, setting to 0.');
            }

             console.log('Progress loaded. Watched intervals:', watchedIntervals.map(i => `[${formatTime(i[0])}, ${formatTime(i[1])}]`)); // Log loaded intervals

        } else {
            // No saved data found
            watchedIntervals = [];
            video.currentTime = 0;
             console.log('No saved progress found in Local Storage.');
        }
    } catch (e) {
        console.error('Failed to load progress from Local Storage:', e);
        // Reset in case of parsing errors
        watchedIntervals = [];
        video.currentTime = 0;
         console.log('Error loading progress, resetting to 0.');
    } finally {
        // Update display after loading is complete, ensuring duration is available first.
        // If loadedmetadata already fired, call updateProgressDisplay directly.
        // Otherwise, it will be called by the loadedmetadata listener.
        if (video.duration > 0) {
             updateProgressDisplay();
        } else {
             // If duration not available yet, ensure update is called once loadedmetadata fires
             // Use { once: true } to avoid multiple listeners if loadProgress is called again.
             video.addEventListener('loadedmetadata', updateProgressDisplay, { once: true });
        }
    }
}

// Initial attempt to load progress when the script is parsed and executed.
// The 'loadedmetadata' event listener will re-run loadProgress or ensure display is updated
// once the video's duration is known.
loadProgress();


// --- Initial Setup and Cleanup ---

// Ensure cleanup and saving when the page is about to be unloaded.
window.addEventListener('beforeunload', () => {
    // Clear the periodic save interval to prevent it from firing during unload
    if (saveInterval) {
        clearInterval(saveInterval);
    }
    // Attempt to save the final progress right before the page unloads
    saveProgress();
});

