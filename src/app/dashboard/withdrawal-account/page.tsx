import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WithdrawalAccountForm from '@/components/dashboard/withdrawal-account-form';

export default function WithdrawalAccountPage() {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Mi Cuenta de Retiro
                </h1>
                <Button asChild variant="outline">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel
                    </Link>
                </Button>
            </header>
            <div className="flex justify-center">
                 <div className="w-full max-w-2xl">
                    <WithdrawalAccountForm />
                </div>
            </div>
        </div>
    )
}
