
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import type { RechargeRequest } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, deleteDoc } from "firebase/firestore";

type PaymentDisplayProps = {
    referenceId: string; // This is the temporary doc ID from Firestore
};

const QR_CONFIG_DOC_ID = 'qrCode';
const DEFAULT_QR_URL = "https://placehold.co/300x300.png";

const formSchema = z.object({
  manualReference: z.string().min(4, { message: "La referencia debe tener al menos 4 caracteres." }),
});

const PaymentDisplay = ({ referenceId }: PaymentDisplayProps) => {
    const [amount, setAmount] = useState<number | null>(null);
    const [qrUrl, setQrUrl] = useState<string>(DEFAULT_QR_URL);
    const [isLoading, setIsLoading] = useState(true);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            manualReference: "",
        },
    });

    useEffect(() => {
        const fetchRechargeData = async () => {
            try {
                // Fetch QR URL from Firestore
                const qrDocRef = doc(db, 'config', QR_CONFIG_DOC_ID);
                const qrDocSnap = await getDoc(qrDocRef);
                if (qrDocSnap.exists()) {
                    setQrUrl(qrDocSnap.data().url);
                }

                // Fetch amount from the temporary Firestore document
                const tempDocRef = doc(db, "tempRecharges", referenceId);
                const docSnap = await getDoc(tempDocRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAmount(data.amount);
                } else {
                    toast({ variant: "destructive", title: "Error", description: "La sesión de recarga ha expirado. Vuelve a intentarlo." });
                    router.push("/dashboard/recharge");
                }
            } catch (error) {
                console.error("Failed to fetch recharge data:", error);
                toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la recarga." });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRechargeData();
    }, [referenceId, toast, router]);

    const handleConfirmPayment = async (values: z.infer<typeof formSchema>) => {
        if (!user || amount === null) return;
        
        const newRequest: Omit<RechargeRequest, 'uniqueId' | 'requestedAt'> = {
            id: values.manualReference,
            userId: user.id,
            userPhone: user.phone,
            amount: amount,
            status: 'pending',
        };

        try {
            // Add the formal request to the 'rechargeRequests' collection
            await addDoc(collection(db, "rechargeRequests"), {
                ...newRequest,
                requestedAt: serverTimestamp(),
            });

            // Clean up the temporary document
            const tempDocRef = doc(db, "tempRecharges", referenceId);
            await deleteDoc(tempDocRef);

            setPaymentConfirmed(true);
            toast({
                title: "¡Solicitud enviada!",
                description: `Tu solicitud con referencia ${values.manualReference} ha sido registrada. La verificación puede tardar unos minutos.`,
            });
        } catch (error) {
            console.error("Error confirming payment:", error);
             toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo enviar la solicitud. Inténtalo de nuevo.",
            });
        }
    };

    if (paymentConfirmed) {
         return (
             <Alert variant="default" className="border-green-500">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>¡Solicitud de recarga enviada!</AlertTitle>
                <AlertDescription>
                    Hemos recibido la confirmación de tu pago. El saldo se abonará a tu cuenta una vez que nuestro equipo lo verifique.
                     <Button onClick={() => router.push('/dashboard')} className="w-full mt-4">
                        Volver al Panel
                    </Button>
                </AlertDescription>
            </Alert>
         )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleConfirmPayment)}>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Completa tu Recarga</CardTitle>
                        <CardDescription>1. Escanea el QR y realiza el pago desde Nequi. <br/> 2. Ingresa la referencia de pago que te da Nequi.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-center">
                            {isLoading ? (
                                <Skeleton className="h-[300px] w-[300px]" />
                             ) : (
                                <Image
                                    src={qrUrl}
                                    width={300}
                                    height={300}
                                    alt="QR Code para pago Nequi"
                                    className="rounded-lg"
                                    data-ai-hint="qr code"
                                />
                             )}
                        </div>
                        
                        <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Monto a Pagar</p>
                            {isLoading ? (
                                <Skeleton className="h-8 w-3/5 mx-auto mt-1" />
                            ) : (
                                <p className="text-3xl font-bold">
                                    {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount ?? 0)}
                                </p>
                            )}
                        </div>

                         <FormField
                            control={form.control}
                            name="manualReference"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Referencia de Pago Manual</FormLabel>
                                <FormControl>
                                <Input placeholder="Ingresa la referencia de Nequi" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={isLoading || form.formState.isSubmitting}>
                            Confirmar Pago
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Asegúrate de ingresar la referencia correcta. El saldo no se actualizará hasta que el pago sea verificado por un administrador.
                        </p>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
};

export default PaymentDisplay;
