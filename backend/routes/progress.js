const express = require('express');
const router = express.Router();
const VideoProgress = require('../models/VideoProgress');

// Simulate a fixed user
const FIXED_USER_ID = 'testUser123';

router.post('/save', async (req, res) => {
  const { videoId, watchedSegments } = req.body;

  try {
    let progress = await VideoProgress.findOne({ userId: FIXED_USER_ID, videoId });

    if (progress) {
      progress.watchedSegments = watchedSegments;
    } else {
      progress = new VideoProgress({ userId: FIXED_USER_ID, videoId, watchedSegments });
    }

    await progress.save();
    res.json({ message: 'Progress saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const progress = await VideoProgress.findOne({ userId: FIXED_USER_ID, videoId });
    if (progress) {
      res.json({ watchedSegments: progress.watchedSegments });
    } else {
      res.json({ watchedSegments: [] });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

module.exports = router;
