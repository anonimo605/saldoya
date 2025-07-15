
"use client";

import { useState, useEffect } from "react";
import BalanceCard from "@/components/dashboard/balance-card";
import TransactionHistory from "@/components/dashboard/transaction-history";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ANNOUNCEMENT_CONFIG_ID } from "@/components/admin/withdrawal-settings-form"; // Updated import path

type Announcement = {
  content: string;
  isEnabled: boolean;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const balance = user?.balance ?? 0;

  useEffect(() => {
    const docRef = doc(db, 'config', ANNOUNCEMENT_CONFIG_ID);
    const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            setAnnouncement(doc.data() as Announcement);
        } else {
            setAnnouncement(null);
        }
    });
    return () => unsubscribe();
  }, []);

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

      {announcement?.isEnabled && announcement.content && (
        <Alert className="bg-primary/10 border-primary/20 text-primary-foreground">
          <Megaphone className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-bold">Aviso Importante</AlertTitle>
          <AlertDescription className="text-primary/90">
            {announcement.content}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BalanceCard balance={balance} />
          <DashboardNav />
        </div>
        
        <div className="lg:col-span-1">
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
}
