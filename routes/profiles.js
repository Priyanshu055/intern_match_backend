const express = require('express');
const auth = require('../middleware/auth');
const CandidateProfile = require('../models/CandidateProfile');
const EmployerProfile = require('../models/EmployerProfile');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Multer setup for file uploads (resume and profile image)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'resume') {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed for resume!'));
    }
  } else if (file.fieldname === 'profileImage') {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and GIF files are allowed for profile image!'));
    }
  } else {
    cb(new Error('Unexpected field'));
  }
};

const upload = multer({ storage, fileFilter });

// Get profile
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'Candidate') {
      const profile = await CandidateProfile.findOne({ user_id: req.user.userId });
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      res.json(profile);
    } else if (req.user.role === 'Employer') {
      const profile = await EmployerProfile.findOne({ user_id: req.user.userId });
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      res.json(profile);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update profile
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'Candidate') {
      const { skills, education, experience } = req.body;
      let profile = await CandidateProfile.findOne({ user_id: req.user.userId });
      if (profile) {
        profile.skills = skills || profile.skills;
        profile.education = education || profile.education;
        profile.experience = experience || profile.experience;
        await profile.save();
      } else {
        profile = new CandidateProfile({
          user_id: req.user.userId,
          skills: skills || [],
          education,
          experience,
        });
        await profile.save();
      }
      res.json(profile);
    } else if (req.user.role === 'Employer') {
      const { company, industry, website, description } = req.body;
      let profile = await EmployerProfile.findOne({ user_id: req.user.userId });
      if (profile) {
        profile.company = company || profile.company;
        profile.industry = industry || profile.industry;
        profile.website = website || profile.website;
        profile.description = description || profile.description;
        await profile.save();
      } else {
        profile = new EmployerProfile({
          user_id: req.user.userId,
          company,
          industry,
          website,
          description,
        });
        await profile.save();
      }
      res.json(profile);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload resume
router.post('/upload-resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const resume_url = `/uploads/${req.file.filename}`;
    let profile = await CandidateProfile.findOne({ user_id: req.user.userId });
    if (profile) {
      profile.resume_url = resume_url;
      await profile.save();
    } else {
      profile = new CandidateProfile({
        user_id: req.user.userId,
        resume_url,
      });
      await profile.save();
    }
    res.json({ message: 'Resume uploaded', resume_url });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile image
router.post('/upload-profile-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const profileImage = `/uploads/${req.file.filename}`;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.profileImage = profileImage;
    await user.save();
    res.json({ message: 'Profile image uploaded', profileImage });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
