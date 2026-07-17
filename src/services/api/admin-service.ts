import { http } from "./http-client";
import type { DrinkCardAccount } from "./drink-card-service";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserSummary {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  drinkCard?: {
    lastPurchaseTimestamp: string | null;
    credits: number;
    status: string;
  };
}

export interface AdminPaymentVolunteerInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface AdminPaymentSummary {
  paymentId: string;
  volunteer?: AdminPaymentVolunteerInfo | null;
  volunteerId: string;
  amount: number;
  status: string;
  providerCheckoutId?: string;
  providerCheckoutUrl?: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface AdminDrinkTicketSummary {
  drinkTicketId: string;
  volunteerId: string;
  drinkType: string;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
  consumedAt?: string | null;
  consumedByStaffId?: string | null;
}

export interface AddDrinkCardResponse {
  volunteerId: string;
  credits: number;
  amount: number;
}

export interface AdminListParams {
  volunteerId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface UserListParams {
  role?: string;
  status?: string;
  email?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export function listVolunteerUsers(size = 200) {
  return http<PageResponse<UserSummary>>(`/api/v1/admin/users?role=VOLUNTEER&size=${size}`);
}

export function listUsers(params: UserListParams = {}) {
  return http<PageResponse<UserSummary>>(`/api/v1/admin/users${qs(params)}`);
}

export function listDrinkCardAccounts() {
  return http<DrinkCardAccount[] | PageResponse<DrinkCardAccount>>(
    "/api/v1/admin/drink-card-accounts",
  );
}

export function enableDrinkCardAccountRefill(volunteerId: string) {
  return http<DrinkCardAccount>(`/api/v1/admin/drink-card-accounts/${volunteerId}/enable-refill`, {
    method: "POST",
  });
}

export function disableDrinkCardAccountRefill(volunteerId: string) {
  return http<DrinkCardAccount>(`/api/v1/admin/drink-card-accounts/${volunteerId}/disable-refill`, {
    method: "POST",
  });
}

export function addDrinkCardManually(volunteerId: string) {
  return http<AddDrinkCardResponse>("/api/v1/admin/payments/add-drink-card", {
    method: "POST",
    body: JSON.stringify({ volunteerId }),
  });
}

export interface AdminStats {
  totalAvailableCredits: number;
  totalSuccessfulPaymentsAmount: number;
  totalSuccessfulPayments: number;
  totalActiveCards: number;
  topVolunteers: {
    volunteer: AdminPaymentVolunteerInfo;
    drinkTicketsCount: number;
  }[];
  drinkConsumptions: {
    drinkType: string;
    drinkTicketsCount: number;
  }[];
}

export function getAdminStats() {
  return http<AdminStats>("/api/v1/admin/stats");
}

export function listRecentPayments(size = 10) {
  return http<PageResponse<AdminPaymentSummary>>(
    `/api/v1/admin/payments?size=${size}&sort=createdAt,desc`,
  );
}

export function listAdminPayments(params: AdminListParams = {}) {
  return http<PageResponse<AdminPaymentSummary>>(
    `/api/v1/admin/payments${qs({ size: 20, sort: "createdAt,desc", ...params })}`,
  );
}

export async function listAllAdminPayments(params: AdminListParams = {}) {
  const size = params.size ?? 100;
  const first = await listAdminPayments({ ...params, page: 0, size });
  if (first.totalPages <= 1) return first.content;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) =>
      listAdminPayments({ ...params, page: i + 1, size }),
    ),
  );

  return [...first.content, ...rest.flatMap((page) => page.content)];
}

export function listAdminTickets(params: AdminListParams = {}) {
  return http<PageResponse<AdminDrinkTicketSummary>>(
    `/api/v1/admin/drink-tickets${qs({ size: 20, sort: "createdAt,desc", ...params })}`,
  );
}

export interface InviteUserRequest {
  email: string;
  role: "VOLUNTEER" | "BAR_STAFF" | "ADMIN";
}

export interface InvitationResponse {
  id: string;
  email: string;
  role: string;
  status: string;
}

export function inviteUser(data: InviteUserRequest) {
  return http<InvitationResponse>("/api/v1/admin/invitations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  });
  const out = sp.toString();
  return out ? `?${out}` : "";
}
