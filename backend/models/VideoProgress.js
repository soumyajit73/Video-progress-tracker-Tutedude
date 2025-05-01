const mongoose = require('mongoose');

const videoProgressSchema = new mongoose.Schema({
  userId: String,
  videoId: String,
  watchedSegments: [
    {
      start: Number,
      end: Number,
    },
  ],
});

module.exports = mongoose.model('VideoProgress', videoProgressSchema);
