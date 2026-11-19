export function formatLak(amountLak: string | number) {
  const amount =
    typeof amountLak === "number" ? amountLak : Number.parseInt(amountLak, 10);

  if (!Number.isFinite(amount)) {
    return "0 LAK";
  }

  return `${new Intl.NumberFormat("lo-LA").format(amount)} LAK`;
}
