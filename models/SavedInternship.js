const mongoose = require('mongoose');

const savedInternshipSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  internship_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
}, { timestamps: true });

module.exports = mongoose.model('SavedInternship', savedInternshipSchema);
