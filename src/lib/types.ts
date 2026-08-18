export interface RoleRef {
  id: string;
  name: string;
  permissions: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  role: RoleRef;
  createdAt: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  adminsCount: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Grouped by module, e.g. { admins: ['admins.read', ...], roles: [...] } */
export type PermissionCatalog = Record<string, string[]>;

export type PreferredLanguage = 'en' | 'ar';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    name: string;
    email: string;
    preferredLanguage: PreferredLanguage;
    role: RoleRef;
  };
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  preferredLanguage: PreferredLanguage;
  role: RoleRef;
}

/* ------------------------------------------------ Plans & subscriptions */

export type PlanStatus = 'active' | 'archived';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'canceled'
  | 'expired';

export interface ModuleCatalogEntry {
  key: string;
  labelEn: string;
  labelAr: string;
}

export interface PlanSummary {
  id: string;
  nameEn: string;
  nameAr: string;
  monthlyPrice: number;
  yearlyPrice: number | null;
  currency: string;
  status: PlanStatus;
  isTrial: boolean;
  trialDurationDays: number | null;
  subscriberCount: number;
  createdAt: string;
}

export interface PlanDetail extends PlanSummary {
  descriptionEn: string | null;
  descriptionAr: string | null;
  maxRooms: number | null;
  maxStaffUsers: number | null;
  maxGuestRequestsPerMonth: number | null;
  enabledModules: string[];
  createdBy: { id: string; name: string; email: string } | null;
  updatedAt: string;
}

export interface PlanSubscriber {
  hotelId: string;
  hotelName: string | null;
  startDate: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  daysRemaining: number | null;
}

export interface LimitViolation {
  hotelId: string;
  hotelName: string;
  field: string;
  usage: number;
  limit: number;
  message?: string;
}

/* ------------------------------------------------------ Hotels (tenants) */

export type HotelStatus = 'active' | 'suspended' | 'inactive';

export type SuspensionReason =
  | 'non_payment'
  | 'policy_violation'
  | 'hotel_request'
  | 'other';

export interface HotelPlanRef {
  id: string;
  nameEn: string;
  nameAr: string;
  isTrial: boolean;
}

export interface HotelListItem {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  city: string;
  status: HotelStatus;
  roomsCount: number;
  createdAt: string;
  plan: HotelPlanRef | null;
  subscription: {
    status: SubscriptionStatus;
    trialEndsAt: string | null;
    daysRemaining: number | null;
  } | null;
}

export interface HotelOwner {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active';
  lastLoginAt: string | null;
}

export interface TenantUrls {
  tenantDashboard: string;
  guestApp: string;
}

export interface HotelDetail {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  status: HotelStatus;
  logoPath: string | null;
  logoUrl: string | null;
  starRating: number | null;
  contactEmail: string;
  contactPhone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
  timezone: string;
  defaultLanguage: string;
  currency: string;
  roomsCount: number;
  staffUsersCount: number;
  monthlyGuestRequests: number;
  suspension: {
    reason: SuspensionReason | null;
    note: string | null;
    suspendedAt: string | null;
    suspendedBy: { id: string; name: string } | null;
  } | null;
  onboardedBy: { id: string; name: string; email: string } | null;
  owner: HotelOwner | null;
  urls: TenantUrls;
  createdAt: string;
  updatedAt: string;
}

export interface SlugAvailability {
  available: boolean;
  reason?: 'invalid' | 'reserved' | 'taken';
}

export interface OnboardHotelResponse {
  hotel: HotelDetail;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    trialEndsAt: string | null;
    daysRemaining: number | null;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    status: 'pending';
    /** Shown exactly once — the backend stores only a hash. */
    setupLink: string;
    setupLinkExpiresAt: string;
  };
}

export interface RegenerateLinkResponse {
  setupLink: string;
  expiresAt: string;
}

/* -------------------------------------------------------- Notifications */

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type NotificationType =
  | 'owner_setup_link'
  | 'trial_countdown'
  | 'trial_expired'
  | 'hotel_suspended'
  | 'hotel_reactivated';

export interface NotificationHotelRef {
  id: string;
  nameEn: string;
  nameAr: string;
}

export interface NotificationListItem {
  id: string;
  createdAt: string;
  type: NotificationType;
  channel: string;
  language: 'ar' | 'en';
  recipientName: string;
  recipientEmail: string;
  status: NotificationStatus;
  attemptCount: number;
  sentAt: string | null;
  resendOfId: string | null;
  hotel: NotificationHotelRef | null;
}

export interface NotificationAttempt {
  at: string;
  ok: boolean;
  error: string | null;
}

export interface NotificationDetail extends NotificationListItem {
  /** Rendered at queue time; setup-link tokens arrive masked. */
  subject: string;
  bodyHtml: string;
  lastError: string | null;
  attempts: NotificationAttempt[];
}

/** Response of GET /hotels/:id/subscription (Story 4.6 view). */
export interface HotelSubscriptionView {
  current:
    | (Record<string, unknown> & {
        id: string;
        planId: string;
        billingCycle: BillingCycle;
        status: SubscriptionStatus;
        startDate: string;
        trialEndsAt: string | null;
        daysRemaining: number | null;
        plan?: PlanDetail;
      })
    | null;
  usage: Array<{
    field: string;
    label: string;
    used: number;
    max: number | null;
    pct: number | null;
  }> | null;
  history: Array<{
    id: string;
    planId: string;
    planNameEn: string | null;
    planNameAr: string | null;
    billingCycle: BillingCycle;
    status: SubscriptionStatus;
    startDate: string;
    endDate: string | null;
  }>;
}
