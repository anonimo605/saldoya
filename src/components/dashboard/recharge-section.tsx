
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const presetAmounts = [10000, 20000, 50000, 100000];

const RechargeSection = () => {
    const [amount, setAmount] = useState("");
    const router = useRouter();
    const { toast } = useToast();

    const handleRechargeRequest = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast({
                variant: "destructive",
                title: "Monto inválido",
                description: "Por favor, ingresa un monto válido para recargar.",
            });
            return;
        }

        const referenceId = `SY-RECARGA-${Date.now()}`;
        // For prototyping, we use a temporary document in Firestore to pass data to the payment page.
        // A more robust solution might use a dedicated collection for pending recharges.
        try {
            const tempRechargeRef = doc(db, "tempRecharges", referenceId);
            await setDoc(tempRechargeRef, { amount: numericAmount, createdAt: new Date() });
            
            // Optional: Clean up old temp documents after some time (e.g., with a TTL policy in Firestore).

            router.push(`/dashboard/recharge/${referenceId}`);
        } catch (error) {
            console.error("Error creating temp recharge doc:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo iniciar la solicitud. Inténtalo de nuevo.",
            });
        }
    };

    const handlePresetClick = (presetAmount: number) => {
        setAmount(presetAmount.toString());
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Selecciona un Monto</CardTitle>
                <CardDescription>Elige una opción o ingresa un monto personalizado para recargar tu saldo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {presetAmounts.map((preset) => (
                        <Button
                            key={preset}
                            variant="outline"
                            onClick={() => handlePresetClick(preset)}
                        >
                            {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(preset)}
                        </Button>
                    ))}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="custom-amount">O ingresa otro valor</Label>
                    <Input
                        id="custom-amount"
                        type="number"
                        placeholder="Ej: 15000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={handleRechargeRequest}>
                    Solicitar Recarga
                </Button>
            </CardFooter>
        </Card>
    );
};

export default RechargeSection;
