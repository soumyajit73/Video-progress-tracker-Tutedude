const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema({
  userId: String,
  videoId: {
    type: String,
    required: true
  },
  watchedSegments: {
    type: [[Number, Number]], // Array of [startTime, endTime] pairs
    default: []
  },
  percentageWatched: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  lastPosition: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate percentage watched
videoProgressSchema.pre('save', function(next) {
  if (this.watchedSegments && this.totalDuration) {
    const totalWatchedTime = this.watchedSegments.reduce((acc, [start, end]) => {
      return acc + (end - start);
    }, 0);
    
    this.percentageWatched = Math.min(
      100,
      Math.round((totalWatchedTime / this.totalDuration) * 100)
    );
  }
  next();
});

module.exports = mongoose.model('VideoProgress', videoProgressSchema);