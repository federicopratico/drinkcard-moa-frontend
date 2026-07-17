import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { CreditCard, Loader2, Pause, Play, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AdminDataTable,
  AdminEmptyRow,
  AdminStatusBadge,
  AdminTable,
} from "@/components/admin/AdminDataTable";
import {
  addDrinkCardManually,
  disableDrinkCardAccountRefill,
  enableDrinkCardAccountRefill,
  listDrinkCardAccounts,
  listVolunteerUsers,
  type PageResponse,
  type UserSummary,
} from "@/services/api/admin-service";
import type { DrinkCardAccount } from "@/services/api/drink-card-service";
import { ApiError } from "@/services/api/http-client";
import { resultCount, translateStatus } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n-react";


export const Route = createFileRoute("/_authenticated/admin/volunteers")({
  component: VolunteersPage,
});

function VolunteersPage() {
  const qc = useQueryClient();
  const { language, t, dateLocale } = useLanguage();
  const addDrinkCardInFlight = useRef(false);
  const users = useQuery({
    queryKey: ["admin", "users", "vol"],
    queryFn: () => listVolunteerUsers(500),
  });
  const accounts = useQuery({ queryKey: ["admin", "accounts"], queryFn: listDrinkCardAccounts });
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const toggleRefill = useMutation({
    mutationFn: ({ volunteerId, enable }: { volunteerId: string; enable: boolean }) =>
      enable
        ? enableDrinkCardAccountRefill(volunteerId)
        : disableDrinkCardAccountRefill(volunteerId),
    onSuccess: (_data, { enable }) => {
      toast.success(
        enable ? t("admin.volunteers.refillEnabled") : t("admin.volunteers.refillDisabled"),
      );
      qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("admin.volunteers.refillError")),
  });

  const addDrinkCard = useMutation({
    mutationFn: addDrinkCardManually,
    onSuccess: (result) => {
      toast.success(
        t("admin.volunteers.addDrinkCardSuccess", {
          credits: String(result.credits),
          amount: result.amount.toFixed(2),
        }),
      );
      qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t("admin.volunteers.addDrinkCardError")),
    onSettled: () => {
      addDrinkCardInFlight.current = false;
    },
  });

  const filtered = (users.data?.content ?? []).filter((v) => {
    const text = `${v.fullName ?? ""} ${v.email} ${v.userId}`.toLowerCase();
    return text.includes(q.toLowerCase());
  });
  const selected = filtered.find((v) => v.userId === sel) ?? filtered[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium text-slate-500">{t("admin.nav.volunteers")}</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            {t("admin.volunteers.drinkCardAccounts")}
          </h1>
        </div>
        <button
          onClick={() => {
            users.refetch();
            accounts.refetch();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> {t("common.refresh")}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.volunteers.search")}
          className="input pl-9"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <AdminDataTable
          title={t("admin.volunteers.list")}
          description={resultCount(language, filtered.length)}
        >
          <AdminTable>
            <thead>
              <tr>
                <th>{t("admin.volunteers.name")}</th>
                <th>{t("admin.volunteers.email")}</th>
                <th>{t("admin.common.state")}</th>
                <th className="text-right">{t("admin.volunteers.credits")}</th>
                <th className="text-right">{t("admin.volunteers.refill")}</th>
              </tr>
            </thead>
            <tbody>
              {users.isLoading && (
                <AdminEmptyRow colSpan={5}>{t("admin.common.loading")}</AdminEmptyRow>
              )}
              {!users.isLoading && filtered.length === 0 && (
                <AdminEmptyRow colSpan={5}>{t("common.noResults")}</AdminEmptyRow>
              )}
              {filtered.map((v) => {
                const accountStatus = v.drinkCard?.status;
                const refillEnabled = accountStatus === "ACTIVE";
                const hasAccount = !!v.drinkCard;
                const isPending =
                  toggleRefill.isPending && toggleRefill.variables?.volunteerId === v.userId;
                return (
                  <tr
                    key={v.userId}
                    onClick={() => setSel(v.userId)}
                    className={`cursor-pointer ${selected?.userId === v.userId ? "bg-blue-50" : ""}`}
                  >
                    <td className="font-medium text-slate-950">{v.fullName}</td>
                    <td className="text-slate-500">{v.email}</td>
                    <td>
                      <AdminStatusBadge status={v.status} />
                    </td>
                    <td className="text-right text-base font-semibold text-slate-950">
                      {v.drinkCard?.credits ?? 0}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        disabled={!hasAccount || isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRefill.mutate({ volunteerId: v.userId, enable: !refillEnabled });
                        }}
                        title={
                          !hasAccount
                            ? t("admin.volunteers.noDrinkCard")
                            : refillEnabled
                              ? t("admin.volunteers.disableRefill")
                              : t("admin.volunteers.enableRefill")
                        }
                        aria-label={
                          refillEnabled
                            ? t("admin.volunteers.disableRefill")
                            : t("admin.volunteers.enableRefill")
                        }
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-60 ${
                          refillEnabled
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {refillEnabled ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        </AdminDataTable>

        <aside className="admin-panel h-fit p-5">
          {selected ? (
            <>
              <p className="text-sm font-medium text-slate-500">{t("admin.volunteers.detail")}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">{selected.fullName}</h2>
              <p className="text-sm text-slate-500">{selected.email}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <Row
                  k={t("admin.volunteers.userStatus")}
                  v={translateStatus(language, selected.status)}
                />
                <Row
                  k={t("admin.volunteers.accountStatus")}
                  v={
                    selected.drinkCard?.status
                      ? translateStatus(language, selected.drinkCard.status)
                      : "—"
                  }
                />
                <Row k={t("admin.volunteers.credits")} v={String(selected.drinkCard?.credits ?? 0)} />
                <Row
                  k={t("admin.volunteers.lastPurchase")}
                  v={
                    selected.drinkCard?.lastPurchaseTimestamp
                      ? format(new Date(selected.drinkCard.lastPurchaseTimestamp), "d MMM, HH:mm", {
                          locale: dateLocale,
                        })
                      : "—"
                  }
                />
                <Row k="ID" v={selected.userId} mono />
              </dl>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-950">
                  {t("admin.volunteers.addDrinkCardTitle")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {t("admin.volunteers.addDrinkCardDescription")}
                </p>
                <button
                  type="button"
                  disabled={!selected.drinkCard || addDrinkCard.isPending}
                  onClick={() => {
                    if (
                      !selected.drinkCard ||
                      addDrinkCard.isPending ||
                      addDrinkCardInFlight.current
                    ) {
                      return;
                    }
                    addDrinkCardInFlight.current = true;
                    addDrinkCard.mutate(selected.userId);
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addDrinkCard.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {addDrinkCard.isPending
                    ? t("admin.volunteers.addDrinkCardPending")
                    : t("admin.volunteers.addDrinkCardButton")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">{t("admin.volunteers.selectPrompt")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd
        className={`text-right text-slate-950 ${mono ? "font-mono text-xs break-all" : "font-medium"}`}
      >
        {v}
      </dd>
    </div>
  );
}

function arr<T>(x: unknown): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x && typeof x === "object" && "content" in x) {
    const content = (x as { content?: unknown }).content;
    if (Array.isArray(content)) return content as T[];
  }
  return [];
}
