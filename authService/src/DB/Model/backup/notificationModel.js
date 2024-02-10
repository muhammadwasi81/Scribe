import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
  auth: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
  },
  title: {
    type: String,
    default: '',
  },
  body: {
    type: String,
    default: '',
  },
  link: {
    type: String,
    default: '',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const NotificationModel = mongoose.model('Notification', NotificationSchema)

export default NotificationModel
