const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  internship_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  cover_letter: { type: String },
  resume_url: { type: String },
  additional_info: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
