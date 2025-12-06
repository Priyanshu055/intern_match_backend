const mongoose = require('mongoose');

const candidateProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [{ type: String }],
  education: { type: String },
  experience: { type: String },
  resume_url: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CandidateProfile', candidateProfileSchema);
