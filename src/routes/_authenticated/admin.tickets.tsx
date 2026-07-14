import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, type Locale } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  AdminDataTable,
  AdminEmptyRow,
  AdminStatusBadge,
  AdminTable,
} from "@/components/admin/AdminDataTable";
import { listAdminTickets } from "@/services/api/admin-service";
import { resultCount, translateDrink, translateNow, translateStatus } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n-react";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: AdminTicketsPage,
  head: () => ({ meta: [{ title: `${translateNow("admin.nav.tickets")} — Admin MOA` }] }),
});

function AdminTicketsPage() {
  const [status, setStatus] = useState("");
  const [volunteerId, setVolunteerId] = useState("");
  const { language, t, dateLocale } = useLanguage();
  const tickets = useQuery({
    queryKey: ["admin", "tickets", status, volunteerId],
    queryFn: () => listAdminTickets({ status, volunteerId, size: 50 }),
  });

  const list = tickets.data?.content ?? [];
  const errorMessage = tickets.error instanceof Error ? tickets.error.message : t("errors.request");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{t("admin.nav.tickets")}</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            {t("admin.tickets.qrDrinks")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("admin.tickets.description")}</p>
        </div>
        <button
          onClick={() => tickets.refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> {t("common.refresh")}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          value={volunteerId}
          onChange={(e) => setVolunteerId(e.target.value)}
          placeholder={t("admin.common.volunteerIdFilter")}
          className="input bg-white"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input bg-white"
        >
          <option value="">{t("admin.common.allStatuses")}</option>
          <option value="PENDING">{translateStatus(language, "PENDING")}</option>
          <option value="CONSUMED">{translateStatus(language, "CONSUMED")}</option>
          <option value="EXPIRED">{translateStatus(language, "EXPIRED")}</option>
        </select>
      </div>

      <AdminDataTable
        title={t("admin.tickets.emitted")}
        description={resultCount(language, list.length)}
      >
        <AdminTable>
          <thead>
            <tr>
              <th>{t("admin.common.date")}</th>
              <th>{t("admin.common.drink")}</th>
              <th>{t("admin.common.volunteer")}</th>
              <th>{t("admin.common.staff")}</th>
              <th>{t("admin.common.expires")}</th>
              <th>{t("admin.common.state")}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.isLoading && (
              <AdminEmptyRow colSpan={6}>{t("admin.tickets.loading")}</AdminEmptyRow>
            )}
            {tickets.isError && <AdminEmptyRow colSpan={6}>{errorMessage}</AdminEmptyRow>}
            {!tickets.isLoading && !tickets.isError && list.length === 0 && (
              <AdminEmptyRow colSpan={6}>{t("admin.tickets.empty")}</AdminEmptyRow>
            )}
            {list.map((ticket) => (
              <tr key={ticket.drinkTicketId}>
                <td>{fmt(ticket.createdAt, dateLocale)}</td>
                <td className="font-medium text-slate-950">
                  {translateDrink(language, ticket.drinkType)}
                </td>
                <td className="font-mono text-xs">{short(ticket.volunteerId)}</td>
                <td className="font-mono text-xs">
                  {ticket.consumedByStaffId ? short(ticket.consumedByStaffId) : "—"}
                </td>
                <td>{ticket.expiresAt ? fmt(ticket.expiresAt, dateLocale) : "—"}</td>
                <td>
                  <AdminStatusBadge status={ticket.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminDataTable>
    </div>
  );
}

function fmt(value: string | null | undefined, locale: Locale) {
  return value ? format(new Date(value), "d MMM HH:mm", { locale }) : "—";
}

function short(value?: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}
