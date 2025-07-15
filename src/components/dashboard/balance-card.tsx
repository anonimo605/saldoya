import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BalanceCardProps = {
  balance: number;
};

const BalanceCard = ({ balance }: BalanceCardProps) => {
  const formattedBalance = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(balance);

  return (
    <Card className="overflow-hidden bg-primary text-primary-foreground shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-primary-foreground/80">
          Saldo Actual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
            <p
            className={cn(
                "text-5xl font-bold tracking-tighter transition-colors text-primary-foreground"
            )}
            >
            {formattedBalance}
            </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
