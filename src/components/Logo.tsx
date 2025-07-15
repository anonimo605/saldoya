import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("text-2xl font-bold text-primary", className)}>
      SaldoYa
    </div>
  );
};

export default Logo;
