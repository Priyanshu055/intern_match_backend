const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  required_skills: [{ type: String }],
  location: { type: String },
  stipend: { type: String },
  duration: { type: String },
  applicationDeadline: { type: Date },
  posted_date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Internship', internshipSchema);
