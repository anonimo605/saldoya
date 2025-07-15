import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentDisplay from '@/components/dashboard/payment-display';

type RechargePaymentPageProps = {
    params: {
        id: string;
    }
}

export default function RechargePaymentPage({ params }: RechargePaymentPageProps) {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Realizar Pago
                </h1>
                <Button asChild variant="outline">
                    <Link href="/dashboard/recharge">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Link>
                </Button>
            </header>
                <div className="flex justify-center">
                <div className="w-full max-w-md">
                    <PaymentDisplay referenceId={params.id} />
                </div>
            </div>
        </div>
    )
}
