import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'opportunity_submitted'
  | 'opportunity_approved'
  | 'opportunity_rejected'
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'application_reviewing';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  recipientRole: 'student' | 'company' | 'admin';
  senderId?: mongoose.Types.ObjectId;
  senderName?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;   // opportunityId or applicationId
  relatedType?: 'opportunity' | 'application';
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipientRole: { type: String, enum: ['student', 'company', 'admin'], required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String },
  type: {
    type: String,
    enum: [
      'opportunity_submitted', 'opportunity_approved', 'opportunity_rejected',
      'application_received', 'application_accepted', 'application_rejected',
      'application_reviewing',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: String },
  relatedType: { type: String, enum: ['opportunity', 'application'] },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast recipient queries
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
