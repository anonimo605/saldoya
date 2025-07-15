import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QrSettingsForm from '@/components/admin/qr-settings-form';

export default function AdminQrSettingsPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Configuración del Código QR
                </h1>
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel de Admin
                    </Link>
                </Button>
            </header>
            <QrSettingsForm />
        </div>
    )
}
