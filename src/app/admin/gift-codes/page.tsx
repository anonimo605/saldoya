import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GiftCodeManagement from '@/components/admin/gift-code-management';

export default function AdminGiftCodesPage() {
    return (
        <div className="space-y-6">
             <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Gestionar Códigos de Regalo
                </h1>
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel de Admin
                    </Link>
                </Button>
            </header>
            <GiftCodeManagement />
        </div>
    )
}
