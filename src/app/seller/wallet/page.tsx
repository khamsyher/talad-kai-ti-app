import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSeller } from "@/modules/auth/require-seller";
import { formatLak } from "@/lib/format";
import {
  getSellerWallet,
  listWalletTransactions,
} from "@/modules/wallets/wallet.repository";
import { listPayouts } from "@/modules/payouts/payout.repository";
import { requestPayoutFormAction } from "@/modules/payouts/payout.actions";

export const instant = false;

export default async function SellerWalletPage() {
  const { seller } = await requireSeller();
  if (!seller) redirect("/seller");

  const [wallet, transactions, payouts] = await Promise.all([
    getSellerWallet(seller.id),
    listWalletTransactions(seller.id),
    listPayouts(seller.id),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">Seller wallet</h1>
          <Link href="/seller" className="text-sm underline">Dashboard</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-zinc-500">Available balance</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {formatLak(wallet.availableBalanceLak)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-zinc-500">Pending balance</p>
            <p className="mt-2 text-3xl font-bold">
              {formatLak(wallet.pendingBalanceLak)}
            </p>
          </div>
        </div>

        <section className="grid gap-8 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-4 text-lg font-bold">Transaction history</h2>
            <div className="grid gap-3">
              {transactions.length ? transactions.map((entry) => (
                <article key={entry.id} className="rounded-xl border bg-white p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">{entry.type}</p>
                      {entry.description && (
                        <p className="text-sm text-zinc-500">{entry.description}</p>
                      )}
                    </div>
                    <strong>{formatLak(entry.amountLak)}</strong>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Balance after {formatLak(entry.balanceAfterLak)}
                  </p>
                </article>
              )) : (
                <p className="rounded-xl border bg-white p-6 text-zinc-600">
                  No wallet transactions.
                </p>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-xl border bg-white p-5">
            <h2 className="font-bold">Request payout</h2>
            <form action={requestPayoutFormAction} className="mt-4 grid gap-3">
              <input name="amountLak" type="number" min="1" required placeholder="Amount (LAK)" className="rounded border px-3 py-2" />
              <input name="bankName" required placeholder="Bank name" className="rounded border px-3 py-2" />
              <input name="accountName" required placeholder="Account name" className="rounded border px-3 py-2" />
              <input name="accountNumber" required placeholder="Account number" className="rounded border px-3 py-2" />
              <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
                Submit request
              </button>
            </form>
          </aside>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Payout requests</h2>
          <div className="grid gap-3">
            {payouts.length ? payouts.map((payout) => (
              <article key={payout.id} className="rounded-xl border bg-white p-4">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{formatLak(payout.amountLak)}</p>
                  <p className="text-sm text-zinc-600">{payout.status}</p>
                </div>
                {payout.rejectionReason && (
                  <p className="mt-2 text-sm text-red-700">{payout.rejectionReason}</p>
                )}
              </article>
            )) : (
              <p className="rounded-xl border bg-white p-6 text-zinc-600">
                No payout requests.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
