import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WithdrawalSection from '@/components/dashboard/withdrawal-section';

export default function WithdrawPage() {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Retirar Saldo
                </h1>
                <Button asChild variant="outline">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel
                    </Link>
                </Button>
            </header>
            <WithdrawalSection />
        </div>
    )
}
