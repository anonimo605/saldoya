

"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import Image from "next/image";

// Countdown Timer Component
const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
    const calculateTimeLeft = () => {
        const difference = +targetDate - +new Date();
        let timeLeft: { hours?: number; minutes?: number; seconds?: number } = {};

        if (difference > 0) {
            timeLeft = {
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    const timerComponents: string[] = [];

    Object.keys(timeLeft).forEach((interval) => {
        const value = timeLeft[interval as keyof typeof timeLeft];
        timerComponents.push(String(value).padStart(2, '0'));
    });

    if (timerComponents.length) {
        return <span className="font-mono">{timerComponents.join(":")}</span>;
    } else {
        return <span className="text-primary animate-pulse">Procesando...</span>;
    }
};


const PurchasedProductsSection = () => {
    const { user, purchasedProducts } = useAuth();

    if (!user) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Mis Productos</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground py-8">
                    Cargando información del usuario...
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mis Productos</CardTitle>
                <CardDescription>
                    Aquí puedes ver todos los productos que has comprado y el tiempo restante para tu próximo rendimiento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Imagen</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Rendimiento Diario</TableHead>
                                <TableHead>Fecha de Expiración</TableHead>
                                <TableHead>Próximo Rendimiento</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchasedProducts.length > 0 ? (
                                purchasedProducts.map((product) => {
                                    const purchaseDate = new Date(product.purchaseDate);
                                    const expirationDate = new Date(new Date(purchaseDate).setDate(purchaseDate.getDate() + product.durationDays));
                                    const lastDate = product.lastYieldDate ? new Date(product.lastYieldDate) : new Date(product.purchaseDate);
                                    const nextYieldDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);

                                    return (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <div className="w-16 h-16 relative rounded-md overflow-hidden bg-muted">
                                                    {product.imageUrl && (
                                                        <Image 
                                                            src={product.imageUrl} 
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="64px"
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{product.name}
                                             <div className="text-xs text-muted-foreground">
                                                Comprado: {new Date(product.purchaseDate).toLocaleDateString("es-CO")}
                                             </div>
                                            </TableCell>
                                            <TableCell className="text-green-600 font-medium">
                                                +{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(product.price * (product.dailyYield/100))} ({product.dailyYield}%)
                                            </TableCell>
                                            <TableCell>
                                                 {expirationDate.toLocaleDateString("es-CO", {
                                                    year: 'numeric', month: 'long', day: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                {product.status === 'Activo' ? (
                                                    <CountdownTimer targetDate={nextYieldDate} />
                                                ) : (
                                                    <span className="text-muted-foreground">--</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={product.status === 'Activo' ? "default" : "secondary"}>
                                                    {product.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No has comprado ningún producto todavía.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default PurchasedProductsSection;
