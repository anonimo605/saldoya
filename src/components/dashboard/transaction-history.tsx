
"use client";

import { useState, useEffect } from 'react';
import type { Transaction } from "@/lib/types";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import TransactionItem from "./transaction-item";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const INITIAL_VISIBLE_COUNT = 6;
const LOAD_MORE_COUNT = 10;

const TransactionHistory = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }

    setIsLoading(true);
    // Remove orderBy from the query to avoid needing a composite index
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.id),
      limit(50) // Limit to the last 50 transactions for performance
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newTransactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        newTransactions.push({
          ...data,
          id: doc.id,
          date: data.date.toDate(),
        } as Transaction);
      });
      // Sort transactions on the client-side
      newTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      setTransactions(newTransactions);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading]);
  
  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + LOAD_MORE_COUNT);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
         <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-1/4" />
            </div>
          ))}
        </div>
      );
    }

    if (transactions.length > 0) {
      return (
        <ul className="space-y-4">
          {transactions.slice(0, visibleCount).map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      );
    }

    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Aún no hay transacciones.</p>
        <p className="text-sm">Tu historial aparecerá aquí.</p>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Historial de Transacciones</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {renderContent()}
      </CardContent>
      {transactions.length > visibleCount && (
        <CardFooter className="justify-center">
            <Button variant="outline" onClick={handleLoadMore}>
                Ver más
            </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default TransactionHistory;
