import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },

  // FIX: renamed for consistency with controller/frontend expectations
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Note', noteSchema);