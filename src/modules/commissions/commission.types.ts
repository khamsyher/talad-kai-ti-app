export type CommissionRule = {
  id: string;
  name: string;
  scope: "platform" | "category" | "seller";
  commissionBps: number;
  isActive: boolean;
};
