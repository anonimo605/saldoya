import type { Transaction } from "@/lib/types";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TransactionItemProps = {
  transaction: Transaction;
};

const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const isCredit = transaction.type === "credit";
  const amountColor = isCredit ? "text-green-600" : "text-red-600";
  const Icon = isCredit ? ArrowUpCircle : ArrowDownCircle;

  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(transaction.amount);

  const formattedDate = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
  }).format(new Date(transaction.date));

  return (
    <li className="flex items-center space-x-4 p-2 rounded-md transition-colors hover:bg-secondary/50">
      <div className={cn("p-2 rounded-full", isCredit ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900")}>
        <Icon className={cn("h-6 w-6", amountColor)} />
      </div>
      <div className="flex-grow">
        <p className="font-semibold">{transaction.description}</p>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
      </div>
      <div className={cn("font-bold", amountColor)}>
        {isCredit ? `+${formattedAmount}` : `-${formattedAmount}`}
      </div>
    </li>
  );
};

export default TransactionItem;
