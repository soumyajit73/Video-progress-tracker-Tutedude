const express = require('express');
const router = express.Router();
const VideoProgress = require('../models/VideoProgress');

// Simulate a fixed user
const FIXED_USER_ID = 'testUser123';

router.post('/save', async (req, res) => {
  try {
    const { videoId, watchedSegments, totalDuration, percentageWatched, lastPosition } = req.body;
    
    const progress = await VideoProgress.findOneAndUpdate(
      { videoId },
      { 
        videoId,
        watchedSegments,
        totalDuration,
        percentageWatched,
        lastPosition,
        lastUpdated: Date.now()
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    );

    res.json(progress);
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const progress = await VideoProgress.findOne({ videoId });
    if (progress) {
      res.json({ 
        watchedSegments: progress.watchedSegments,
        percentageWatched: progress.percentageWatched || 0,
        lastPosition: progress.lastPosition || 0
      });
    } else {
      res.json({ 
        watchedSegments: [],
        percentageWatched: 0,
        lastPosition: 0
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

module.exports = router;