const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String },
  industry: { type: String },
  website: { type: String },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);
