
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupportSettingsForm from '@/components/admin/support-settings-form';

export default function AdminSupportSettingsPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Número de Soporte
                </h1>
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel de Admin
                    </Link>
                </Button>
            </header>
            <SupportSettingsForm />
        </div>
    )
}
