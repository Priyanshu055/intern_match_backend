const express = require('express');
const auth = require('../middleware/auth');
const Internship = require('../models/Internship');
const CandidateProfile = require('../models/CandidateProfile');
const SavedInternship = require('../models/SavedInternship');
const router = express.Router();

// Helper function to calculate match score
const calculateMatchScore = (candidateSkills, requiredSkills) => {
  if (!candidateSkills || candidateSkills.length === 0) return 0;
  const match = requiredSkills.filter(skill => candidateSkills.includes(skill)).length;
  return Math.round((match / requiredSkills.length) * 100);
};

// Get all internships with optional filters
router.get('/', async (req, res) => {
  try {
    const { location, skills } = req.query;
    let query = {};
    if (location) query.location = location;
    if (skills) query.required_skills = { $in: skills.split(',') };
    const internships = await Internship.find(query).populate('company_id', 'name profileImage');
    res.json(internships);
  } catch (error) {
    console.error('Get internships error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recommended internships for candidate with match score
router.get('/recommended', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const profile = await CandidateProfile.findOne({ user_id: req.user.userId });
    const internships = await Internship.find({}).populate('company_id', 'name profileImage');
    const recommended = internships.map(internship => ({
      ...internship.toObject(),
      matchScore: calculateMatchScore(profile ? profile.skills : [], internship.required_skills)
    })).sort((a, b) => b.matchScore - a.matchScore);
    res.json(recommended);
  } catch (error) {
    console.error('Get recommended internships error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get internships posted by the employer
router.get('/employer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const internships = await Internship.find({ company_id: req.user.userId }).populate('company_id', 'name');
    res.json(internships);
  } catch (error) {
    console.error('Get employer internships error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get saved internships (Candidate only)
router.get('/saved', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const savedInternships = await SavedInternship.find({ user_id: req.user.userId }).populate({
      path: 'internship_id',
      populate: { path: 'company_id', select: 'name profileImage' }
    });
    // Filter out null internship_id (in case internships were deleted)
    const validSavedInternships = savedInternships.filter(save => save.internship_id).map(save => save.internship_id);
    res.json(validSavedInternships);
  } catch (error) {
    console.error('Get saved internships error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get internship by ID
router.get('/:id', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id).populate('company_id', 'name profileImage');
    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }
    res.json(internship);
  } catch (error) {
    console.error('Get internship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new internship (Employer only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { title, description, required_skills, location, stipend, duration, applicationDeadline } = req.body;
    const internship = new Internship({
      title,
      company_id: req.user.userId,
      description,
      required_skills,
      location,
      stipend,
      duration,
      applicationDeadline,
    });
    await internship.save();
    res.status(201).json(internship);
  } catch (error) {
    console.error('Create internship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update internship (Employer only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const internship = await Internship.findById(req.params.id);
    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }
    if (internship.company_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const updatedInternship = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedInternship);
  } catch (error) {
    console.error('Update internship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete internship (Employer only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Employer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const internship = await Internship.findById(req.params.id);
    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }
    if (internship.company_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Internship.findByIdAndDelete(req.params.id);
    res.json({ message: 'Internship deleted' });
  } catch (error) {
    console.error('Delete internship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save internship (Candidate only)
router.post('/save', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { internship_id } = req.body;

    const savedInternship = new SavedInternship({
      user_id: req.user.userId,
      internship_id,
    });
    await savedInternship.save();
    res.status(201).json(savedInternship);
  } catch (error) {
    console.error('Save internship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Unsave internship (Candidate only)
router.delete('/saved/:internshipId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Candidate') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const savedInternship = await SavedInternship.findOneAndDelete({
      user_id: req.user.userId,
      internship_id: req.params.internshipId
    });
    if (!savedInternship) {
      return res.status(404).json({ message: 'Saved internship not found' });
    }
    res.json({ message: 'Unsaved successfully' });
  } catch (error) {
    console.error('Unsave internship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
