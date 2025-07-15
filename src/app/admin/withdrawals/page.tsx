import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WithdrawalRequests from '@/components/admin/withdrawal-requests';

export default function AdminWithdrawalsPage() {
    return (
        <div className="space-y-6">
             <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Solicitudes de Retiro
                </h1>
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel de Admin
                    </Link>
                </Button>
            </header>
            <WithdrawalRequests />
        </div>
    )
}
