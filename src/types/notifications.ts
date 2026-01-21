export type NotificationType = 
  | 'new_lead' 
  | 'follow_up_due' 
  | 'approval_pending' 
  | 'goal_alert' 
  | 'whatsapp_message'
  | 'trade_in_pending';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export const notificationTypeIcons: Record<NotificationType, string> = {
  new_lead: '👤',
  follow_up_due: '📞',
  approval_pending: '✅',
  goal_alert: '🎯',
  whatsapp_message: '💬',
  trade_in_pending: '🚗',
};

export const notificationTypeColors: Record<NotificationType, string> = {
  new_lead: 'bg-blue-500',
  follow_up_due: 'bg-orange-500',
  approval_pending: 'bg-green-500',
  goal_alert: 'bg-purple-500',
  whatsapp_message: 'bg-emerald-500',
  trade_in_pending: 'bg-cyan-500',
};
