
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PackagePlus, QrCode, Banknote, Users, Gift, Percent, Settings, MessageSquare } from "lucide-react";
import RechargeRequests from '@/components/admin/recharge-requests';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bienvenido, {user?.phone || 'Admin'}</CardTitle>
                    <CardDescription>Gestiona las solicitudes de recarga y retiros de la plataforma desde aquí.</CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-wrap gap-4">
                    {isSuperAdmin && (
                        <>
                            <Button asChild variant="outline">
                                <Link href="/admin/products">
                                    <PackagePlus className="mr-2 h-4 w-4" />
                                    Gestionar Productos
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/qr-settings">
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Cambiar QR de Pago
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/users">
                                    <Users className="mr-2 h-4 w-4" />
                                    Gestionar Usuarios
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/gift-codes">
                                    <Gift className="mr-2 h-4 w-4" />
                                    Gestionar Códigos
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/referral-settings">
                                    <Percent className="mr-2 h-4 w-4" />
                                    Comisión de Referidos
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/withdrawal-settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Configuración de Retiros
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/support-settings">
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Número de Soporte
                                </Link>
                            </Button>
                        </>
                    )}
                     <Button asChild variant="outline">
                        <Link href="/admin/withdrawals">
                            <Banknote className="mr-2 h-4 w-4" />
                            Gestionar Retiros
                        </Link>
                    </Button>
                </CardContent>
            </Card>
            <RechargeRequests />
        </div>
    )
}
