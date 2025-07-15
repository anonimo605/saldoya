
"use client";

import BalanceCard from "@/components/dashboard/balance-card";
import TransactionHistory from "@/components/dashboard/transaction-history";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  const transactions = user?.transactions ?? [];
  const balance = user?.balance ?? 0;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Panel de Usuario
          </h1>
          {user && (
            <div className="text-right">
              <p className="font-semibold text-lg">{user.phone}</p>
              <p className="text-sm text-muted-foreground">ID Usuario: {user.displayId}</p>
              <p className="text-sm text-muted-foreground">Cód. Referido: {user.referralCode}</p>
            </div>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BalanceCard balance={balance} />
          <DashboardNav />
        </div>
        
        <div className="lg:col-span-1">
          <TransactionHistory transactions={[...transactions].reverse()} />
        </div>
      </div>
    </div>
  );
}

    