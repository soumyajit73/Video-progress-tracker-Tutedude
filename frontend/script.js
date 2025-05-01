


// Time in seconds to consider a "skip". 
const SKIP_THRESHOLD = 0.5;



const video = document.getElementById('lecture-video');
const progressPercentage = document.getElementById('progress-percentage');
const progressBarContainer = document.getElementById('progress-bar-container');
const hoverTimestampLabel = document.getElementById('hover-timestamp-label');
const progressArea = document.getElementById('progress-area');

//  intervals [start_time, end_time]
let watchedIntervals = [];


let currentPlaybackStart = -1; // -1 indicates no segment is being tracked

//  video's time in the previous timeupdate event
let lastKnownTime = 0;


const localStorageKey = 'videoProgress_' + (video.querySelector('source')?.src || video.src);



// When video starts playing
video.addEventListener('play', () => {
    // Start tracking a new segment if not already tracking
    if (currentPlaybackStart === -1) {
        currentPlaybackStart = video.currentTime;
    }
    lastKnownTime = video.currentTime; // Initialize lastKnownTime
});

// When video is paused
video.addEventListener('pause', () => {
    // If tracking a segment and not currently seeking, add the segment
    if (currentPlaybackStart !== -1 && !video.seeking) {
        addWatchedInterval(currentPlaybackStart, video.currentTime);
        currentPlaybackStart = -1; // Reset tracking
    } else if (currentPlaybackStart !== -1 && video.seeking) {
        // If paused while seeking, discard the segment
        currentPlaybackStart = -1; // Reset tracking
    }
    saveProgress(); // Save progress on pause
});

// When seeking starts (user interacts with timeline)
video.addEventListener('seeking', () => {
    // If tracking a segment, end it at the time seeking started
    if (currentPlaybackStart !== -1) {
        const segmentStart = currentPlaybackStart;
        const segmentEnd = video.currentTime;
        currentPlaybackStart = -1; // Reset tracking immediately

        // Add segment only if it has positive duration
        if (segmentStart < segmentEnd) {
             addWatchedInterval(segmentStart, segmentEnd);
        }
    }
    lastKnownTime = video.currentTime; // Update lastKnownTime
});

// When seeking finishes
video.addEventListener('seeked', () => {
    // Start tracking a new segment if video is playing after seek
    if (!video.paused) {
         currentPlaybackStart = video.currentTime;
    }
    lastKnownTime = video.currentTime; // Update lastKnownTime
    updateProgressDisplay(); // Update display after seek
    saveProgress(); // Save progress after seek
});

// When video ends
video.addEventListener('ended', () => {
     // Add the final segment if tracking was active
     if (currentPlaybackStart !== -1) {
        addWatchedInterval(currentPlaybackStart, video.duration);
        currentPlaybackStart = -1; // Reset tracking
    }
    updateProgressDisplay(); // Update display
    saveProgress(); // Save progress
});

// When video metadata is loaded (duration available)
video.addEventListener('loadedmetadata', () => {
    loadProgress(); // Load saved progress
    lastKnownTime = video.currentTime; // Initialize lastKnownTime
});

// Use timeupdate to detect skips during playback (for tracking last known time)
video.addEventListener('timeupdate', () => {
    const currentTime = video.currentTime;
    const totalDuration = video.duration;

    // Detect a skip forward based on time difference
    if (!video.paused && totalDuration > 0 && lastKnownTime !== undefined) {
        const timeDifference = currentTime - lastKnownTime;
        if (timeDifference > SKIP_THRESHOLD) {
            // A skip was detected, segment ending is handled by seeking/pause
        }
    }
    lastKnownTime = currentTime; // Update lastKnownTime for the next check
    // updateProgressDisplay(); // Uncomment for frequent progress updates
});



// mouse hover to detect watched intervals
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
    for (const interval of watchedIntervals) {
        if (hoverTime >= interval[0] && hoverTime < interval[1]) {
            isWatched = true;
            relevantInterval = interval;
            break;
        }
    }

    // Show/hide and position the label
    if (isWatched && relevantInterval) {
        const [start, end] = relevantInterval;
        hoverTimestampLabel.textContent = `Watched: ${formatTime(start)} - ${formatTime(end)}`;

        // Position the label relative to the progress area
        const progressAreaRect = progressArea.getBoundingClientRect();
        const labelLeftPosition = event.clientX - progressAreaRect.left;

        hoverTimestampLabel.style.left = labelLeftPosition + 'px';

        // Temporarily display to get height for positioning
         hoverTimestampLabel.style.display = 'block';
         const labelHeight = hoverTimestampLabel.offsetHeight;
         const labelTopPosition = rect.top - progressAreaRect.top - labelHeight - 5;

         hoverTimestampLabel.style.top = labelTopPosition + 'px';

         // Adjust horizontal position near edges
         const labelWidth = hoverTimestampLabel.offsetWidth;
         const areaWidth = progressAreaRect.width;

         if (labelLeftPosition - labelWidth / 2 < 0) {
             hoverTimestampLabel.style.left = '0px';
             hoverTimestampLabel.style.transform = 'translateX(0)';
         } else if (labelLeftPosition + labelWidth / 2 > areaWidth) {
             hoverTimestampLabel.style.left = areaWidth + 'px';
             hoverTimestampLabel.style.transform = 'translateX(-100%)';
         } else {
             hoverTimestampLabel.style.transform = 'translateX(-50%)'; // Center
         }

    } else {
        hoverTimestampLabel.style.display = 'none';
    }
});

// Hide label when mouse leaves progress area
progressArea.addEventListener('mouseleave', () => {
     hoverTimestampLabel.style.display = 'none';
});




// Adds a new watched interval and merges the list
function addWatchedInterval(start, end) {
     // Validate interval
    if (start >= end || start < 0 || end > video.duration) {
        console.warn('Attempted to add invalid interval:', [start, end]);
        return;
    }
    watchedIntervals.push([start, end]);
    watchedIntervals = mergeIntervals(watchedIntervals); // Merge intervals
    updateProgressDisplay(); // Update display
}

// Merges overlapping or adjacent intervals
function mergeIntervals(intervals) {
    if (intervals.length === 0) {
        return [];
    }
    intervals.sort((a, b) => a[0] - b[0]); // Sort by start time
    const merged = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        const currentInterval = intervals[i];
        const lastMergedInterval = merged[merged.length - 1];

        // Check for overlap or adjacency
        if (currentInterval[0] <= lastMergedInterval[1]) {
            // Merge intervals
            lastMergedInterval[1] = Math.max(lastMergedInterval[1], currentInterval[1]);
        } else {
            // No overlap, add as a new interval
            merged.push(currentInterval);
        }
    }
    return merged;
}

// Calculates total unique time watched
function getUniqueWatchedTime() {
    let totalTime = 0;
    for (const interval of watchedIntervals) {
        totalTime += (interval[1] - interval[0]);
    }
    return totalTime;
}

// Helper function to format time (MM:SS)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
    return `${minutes}:${formattedSeconds}`;
}


// Updates progress percentage and renders watched segments
function updateProgressDisplay() {
    const uniqueTime = getUniqueWatchedTime();
    const totalDuration = video.duration;

    if (isNaN(totalDuration) || totalDuration <= 0) {
        progressPercentage.textContent = '0.0';
        progressBarContainer.innerHTML = ''; // Clear segments
        hoverTimestampLabel.style.display = 'none';
        return;
    }

    const percentage = (uniqueTime / totalDuration) * 100;
    const displayPercentage = Math.min(percentage, 100).toFixed(1);
    progressPercentage.textContent = displayPercentage; // Update text

    
    // Clear existing segments
    const existingSegments = progressBarContainer.querySelectorAll('.watched-segment');
    existingSegments.forEach(segment => segment.remove());

    // Create and append new segments
    watchedIntervals.forEach(interval => {
        const [start, end] = interval;
        const leftPercentage = (start / totalDuration) * 100;
        const widthPercentage = ((end - start) / totalDuration) * 100;

        const segmentDiv = document.createElement('div');
        segmentDiv.classList.add('watched-segment');
        segmentDiv.style.left = leftPercentage + '%';
        segmentDiv.style.width = widthPercentage + '%';

        progressBarContainer.appendChild(segmentDiv);
    });
}




// Saves progress to Local Storage
function saveProgress() {
    const progressData = {
        intervals: watchedIntervals,
        currentTime: video.currentTime
    };
    try {
        localStorage.setItem(localStorageKey, JSON.stringify(progressData));
    } catch (e) {
        console.error('Failed to save progress to Local Storage:', e);
        if (e.name === 'QuotaExceededError') {
            console.error('Local Storage is full. Cannot save progress.');
        }
    }
}

// Loads progress from Local Storage
function loadProgress() {
    try {
        const savedData = localStorage.getItem(localStorageKey);
        if (savedData) {
            const progressData = JSON.parse(savedData);
            watchedIntervals = progressData.intervals || [];
            if (progressData.currentTime !== undefined && !isNaN(progressData.currentTime)) {
                 video.currentTime = progressData.currentTime;
            } else {
                 video.currentTime = 0;
            }
        } else {
            watchedIntervals = [];
            video.currentTime = 0;
        }
    } catch (e) {
        console.error('Failed to load progress from Local Storage:', e);
        watchedIntervals = [];
        video.currentTime = 0;
    } finally {
        updateProgressDisplay(); // Always update display after loading
    }
}

// Initial load on metadata load
video.addEventListener('loadedmetadata', loadProgress);
