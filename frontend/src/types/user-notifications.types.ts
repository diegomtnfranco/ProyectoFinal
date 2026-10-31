export interface UserNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface UserNotificationPage {
  items: UserNotification[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  unreadCount: number;
}

export interface OccupancyAlertSubscription {
  parkingLotId: string;
  activatedAt: string;
}
