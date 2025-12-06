const express = require('express');
const auth = require('../middleware/auth');
const Application = require('../models/Application');
const Internship = require('../models/Internship');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
    }
  }
});

// Get applications for candidate
router.get('/candidate', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const applications = await Application.find({ candidate_id: req.user.userId }).populate('internship_id');
    res.json(applications);
  } catch (error) {
    console.error('Get candidate applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applications for employer
router.get('/employer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const internships = await Internship.find({ company_id: req.user.userId });
    const internshipIds = internships.map(i => i._id);
    const applications = await Application.find({ internship_id: { $in: internshipIds } }).populate('candidate_id', 'name email').populate('internship_id', 'title');
    res.json(applications);
  } catch (error) {
    console.error('Get employer applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Apply for internship
router.post('/', auth, upload.single('resume'), async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { internship_id, cover_letter, resume_url, additional_info } = req.body;

    // Check if candidate has already applied for this internship
    const existingApplication = await Application.findOne({
      candidate_id: req.user.userId,
      internship_id: internship_id
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this internship' });
    }

    let resumePath = resume_url; // Default to URL if provided
    if (req.file) {
      resumePath = req.file.path; // Use uploaded file path
    }

    const application = new Application({
      candidate_id: req.user.userId,
      internship_id,
      cover_letter,
      resume_url: resumePath,
      additional_info,
    });
    await application.save();
    res.status(201).json(application);
  } catch (error) {
    console.error('Apply error:', error);
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update application status
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { status } = req.body;
    const application = await Application.findById(req.params.id).populate('internship_id');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (application.internship_id.company_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    application.status = status;
    await application.save();
    res.json(application);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
