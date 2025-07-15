
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, Gift, Users, CircleDollarSign, CreditCard, Archive, Landmark, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { SUPPORT_CONFIG_DOC_ID } from "@/components/admin/support-settings-form";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const navItems = [
    { href: "/dashboard/recharge", icon: CreditCard, label: "Recargar Saldo" },
    { href: "/dashboard/products", icon: ShoppingCart, label: "Comprar Productos" },
    { href: "/dashboard/my-products", icon: Archive, label: "Mis Productos" },
    { href: "/dashboard/withdrawal-account", icon: Landmark, label: "Cuenta de Retiro" },
    { href: "/dashboard/withdraw", icon: CircleDollarSign, label: "Retirar Saldo" },
    { href: "/dashboard/referrals", icon: Users, label: "Programa de Referidos" },
    { href: "/dashboard/gift-code", icon: Gift, label: "Canjear Código" },
];

const DashboardNav = () => {
    const [supportNumber, setSupportNumber] = useState('573001234567');

    useEffect(() => {
        const fetchSupportNumber = async () => {
            try {
                const docRef = doc(db, 'config', SUPPORT_CONFIG_DOC_ID);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().phoneNumber) {
                    setSupportNumber(docSnap.data().phoneNumber);
                }
            } catch (error) {
                console.error("Error fetching support number for dashboard:", error);
                // Keep the default number in case of an error
            }
        };
        fetchSupportNumber();
    }, []);

    const supportItem = { 
        href: `https://api.whatsapp.com/send?phone=${supportNumber}`, 
        icon: MessageSquare, 
        label: "Soporte"
    };

    const allItems = [...navItems, supportItem];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>Navega a las diferentes secciones de tu panel.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allItems.map((item) => (
                         <Link href={item.href} key={item.href} className="block">
                            <Card className="h-full hover:bg-accent hover:border-primary transition-colors group">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3 h-full">
                                    <item.icon className="h-8 w-8 text-primary transition-colors" />
                                    <span className="text-sm font-semibold">{item.label}</span>
                                </CardContent>
                            </Card>
                         </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default DashboardNav;
