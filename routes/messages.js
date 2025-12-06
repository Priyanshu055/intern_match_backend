const express = require('express');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Application = require('../models/Application');
const CandidateProfile = require('../models/CandidateProfile');
const router = express.Router();

// Send message (Candidate to Employer or Employer to Candidate)
router.post('/', auth, async (req, res) => {
  try {
    const { application_id, message } = req.body;

    // Verify the application exists and the user is part of it
    const application = await Application.findById(application_id).populate('internship_id');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    let sender_id, receiver_id;
    if (req.user.role === 'Candidate') {
      if (application.candidate_id.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      sender_id = req.user.userId;
      receiver_id = application.internship_id.company_id;
    } else if (req.user.role === 'Employer') {
      if (application.internship_id.company_id.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      sender_id = req.user.userId;
      receiver_id = application.candidate_id;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newMessage = new Message({
      sender_id,
      receiver_id,
      application_id,
      message,
    });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for candidate
router.get('/candidate', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const messages = await Message.find({
      $or: [
        { sender_id: req.user.userId },
        { receiver_id: req.user.userId }
      ]
    })
      .populate('sender_id', 'name')
      .populate('receiver_id', 'name')
      .populate({
        path: 'application_id',
        populate: { path: 'internship_id', select: 'title' }
      })
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Get candidate messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for employer
router.get('/employer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const messages = await Message.find({
      $or: [
        { sender_id: req.user.userId },
        { receiver_id: req.user.userId }
      ]
    })
      .populate('sender_id', 'name')
      .populate('receiver_id', 'name')
      .populate({
        path: 'application_id',
        populate: [
          { path: 'candidate_id', select: 'name email' },
          { path: 'internship_id', select: 'title' }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Get employer messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get candidate profile for employer
router.get('/candidate-profile/:applicationId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const application = await Application.findById(req.params.applicationId).populate('candidate_id');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if the employer owns the internship
    const internship = await require('../models/Internship').findById(application.internship_id);
    if (internship.company_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const profile = await CandidateProfile.findOne({ user_id: application.candidate_id._id });
    res.json({
      user: application.candidate_id,
      profile: profile || { skills: [], education: '', experience: '', resume_url: '' }
    });
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark message as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.receiver_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    message.is_read = true;
    await message.save();
    res.json(message);
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
