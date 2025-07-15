

"use client";

import { useState, useEffect } from 'react';
import type { RechargeRequest, User, Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, getDoc, Timestamp, getDocs, addDoc, orderBy } from 'firebase/firestore';

// Helper to get the referral commission percentage from Firestore config or fallback
const getReferralPercentage = async (): Promise<number> => {
    try {
        const configDoc = await getDoc(doc(db, "config", "referrals"));
        if (configDoc.exists() && configDoc.data().commissionPercentage) {
            const percentage = parseFloat(configDoc.data().commissionPercentage);
            return isNaN(percentage) ? 0.10 : percentage / 100;
        }
    } catch (error) {
        console.error("Error fetching referral config:", error);
    }
    return 0.10; // Default to 10%
};

const RechargeRequests = () => {
    const [pendingRequests, setPendingRequests] = useState<RechargeRequest[]>([]);
    const [approvedRequests, setApprovedRequests] = useState<RechargeRequest[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        // Listener for pending requests
        const pendingQuery = query(collection(db, 'rechargeRequests'), where('status', '==', 'pending'));
        const unsubscribePending = onSnapshot(pendingQuery, (querySnapshot) => {
            const newRequests: RechargeRequest[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                newRequests.push({
                    ...data,
                    uniqueId: doc.id,
                    requestedAt: (data.requestedAt as Timestamp).toDate(),
                } as RechargeRequest);
            });
            setPendingRequests(newRequests);
        });

        // Listener for approved requests (will be sorted on the client)
        const approvedQuery = query(collection(db, 'rechargeRequests'), where('status', '==', 'approved'));
        const unsubscribeApproved = onSnapshot(approvedQuery, (querySnapshot) => {
            const newRequests: RechargeRequest[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                newRequests.push({
                    ...data,
                    uniqueId: doc.id,
                    requestedAt: (data.requestedAt as Timestamp).toDate(),
                } as RechargeRequest);
            });
            // Sort client-side to avoid needing a composite index
            newRequests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
            setApprovedRequests(newRequests);
        }, (error) => {
            console.error("Error fetching approved requests. You may need to create a Firestore index.", error);
        });

        return () => {
            unsubscribePending();
            unsubscribeApproved();
        };
    }, []);

    const handleAction = async (requestToProcess: RechargeRequest, action: 'approve' | 'reject') => {
        if (action === 'approve') {
             // Check for duplicate reference ID that has already been approved
            const duplicateQuery = query(
                collection(db, "rechargeRequests"),
                where('id', '==', requestToProcess.id),
                where('status', '==', 'approved')
            );
            const duplicateSnapshot = await getDocs(duplicateQuery);
            if (!duplicateSnapshot.empty) {
                toast({
                    variant: "destructive",
                    title: "Referencia Duplicada",
                    description: "Esta referencia de pago ya ha sido aprobada anteriormente.",
                });
                return; // Stop execution
            }
        }

        try {
            await runTransaction(db, async (transactionRunner) => {
                const requestDocRef = doc(db, "rechargeRequests", requestToProcess.uniqueId);
                const requestDoc = await transactionRunner.get(requestDocRef);

                if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
                    throw new Error("La solicitud ya ha sido procesada.");
                }

                if (action === 'approve') {
                    const userDocRef = doc(db, "users", requestToProcess.userId);
                    const userDoc = await transactionRunner.get(userDocRef);

                    if (!userDoc.exists()) {
                        throw new Error("Usuario no encontrado.");
                    }

                    let rechargedUser = userDoc.data() as User;
                    rechargedUser.id = userDoc.id; // Ensure the ID is attached
                    let referrerFinalBalance: number | undefined;
                    let referrerPhone: string | undefined;

                    // --- Start: Referral Commission Logic ---
                    if (rechargedUser.referredBy && !rechargedUser.hasMadeFirstRecharge) {
                        const referrerDocRef = doc(db, "users", rechargedUser.referredBy);
                        const referrerDoc = await transactionRunner.get(referrerDocRef);
                        
                        if (referrerDoc.exists()) {
                            const referrerUser = referrerDoc.data() as User;
                            referrerUser.id = referrerDoc.id; // Ensure ID is attached
                            const commissionPercentage = await getReferralPercentage();
                            const commissionAmount = requestToProcess.amount * commissionPercentage;
                            
                            const newReferrerBalance = referrerUser.balance + commissionAmount;
                             const commissionTransactionData: Omit<Transaction, 'id' | 'date'> & { date: Timestamp } = {
                                userId: referrerDoc.id,
                                type: 'credit',
                                amount: commissionAmount,
                                description: `Comisión por referido ${rechargedUser.phone}`,
                                date: Timestamp.now(),
                            };
                            
                            // Create transaction using the transaction runner
                            const newCommissionTransRef = doc(collection(db, 'transactions'));
                            transactionRunner.set(newCommissionTransRef, commissionTransactionData);
                            
                            transactionRunner.update(referrerDocRef, {
                                balance: newReferrerBalance,
                                version: (referrerUser.version || 0) + 1
                            });
                            
                            referrerFinalBalance = newReferrerBalance;
                            referrerPhone = referrerUser.phone;
                            
                            // Mark user so they don't generate commission again
                            transactionRunner.update(userDocRef, { hasMadeFirstRecharge: true });
                        }
                    }
                    // --- End: Referral Commission Logic ---

                    const newBalance = rechargedUser.balance + requestToProcess.amount;
                    const newTransactionData: Omit<Transaction, 'id' | 'date'> & { date: Timestamp } = {
                        userId: rechargedUser.id,
                        type: 'credit',
                        amount: requestToProcess.amount,
                        description: `Recarga aprobada (Ref: ${requestToProcess.id})`,
                        date: Timestamp.now(),
                    };
                    
                    // Create transaction using the transaction runner
                    const newRechargeTransRef = doc(collection(db, 'transactions'));
                    transactionRunner.set(newRechargeTransRef, newTransactionData);

                    transactionRunner.update(userDocRef, {
                        balance: newBalance,
                        version: (rechargedUser.version || 0) + 1
                    });
                    
                    transactionRunner.update(requestDocRef, { status: 'approved' });
                    
                    toast({
                        title: `Solicitud Aprobada`,
                        description: `El saldo de ${rechargedUser.phone} ha sido actualizado.`,
                    });
                    if (referrerPhone && referrerFinalBalance !== undefined) {
                         toast({
                            title: "Comisión Pagada",
                            description: `Se pagó una comisión a ${referrerPhone}.`
                        });
                    }

                } else { // 'reject'
                    transactionRunner.update(requestDocRef, { status: 'rejected' });
                    toast({
                        title: `Solicitud Rechazada`,
                        description: `La solicitud con referencia ${requestToProcess.id} ha sido rechazada.`,
                    });
                }
            });
        } catch (error: any) {
            console.error("Error processing recharge:", error);
            toast({
                variant: "destructive",
                title: "Error al procesar",
                description: error.message || "No se pudo completar la operación.",
            });
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Solicitudes Pendientes</CardTitle>
                    <CardDescription>
                        Verifica el pago en Nequi usando la referencia proporcionada por el usuario y luego aprueba o rechaza la solicitud.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha Solicitud</TableHead>
                                    <TableHead>Referencia de Pago</TableHead>
                                    <TableHead>Teléfono Usuario</TableHead>
                                    <TableHead>ID Usuario</TableHead>
                                    <TableHead>Monto</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingRequests.length > 0 ? (
                                    pendingRequests.map((req) => (
                                        <TableRow key={req.uniqueId}>
                                            <TableCell>{req.requestedAt.toLocaleString('es-CO')}</TableCell>
                                            <TableCell className="font-mono">{req.id}</TableCell>
                                            <TableCell>{req.userPhone}</TableCell>
                                            <TableCell>{req.userId}</TableCell>
                                            <TableCell className="font-semibold">
                                                {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(req.amount)}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleAction(req, 'approve')}>
                                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                    Aprobar
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleAction(req, 'reject')}>
                                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                                    Rechazar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            No hay solicitudes de recarga pendientes.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Historial de Recargas Aprobadas</CardTitle>
                    <CardDescription>
                        Lista de todas las solicitudes de recarga que han sido aprobadas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha Aprobación</TableHead>
                                    <TableHead>Referencia de Pago</TableHead>
                                    <TableHead>Teléfono Usuario</TableHead>
                                    <TableHead>Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {approvedRequests.length > 0 ? (
                                    approvedRequests.map((req) => (
                                        <TableRow key={req.uniqueId}>
                                            <TableCell>{req.requestedAt.toLocaleString('es-CO')}</TableCell>
                                            <TableCell className="font-mono">{req.id}</TableCell>
                                            <TableCell>{req.userPhone}</TableCell>
                                            <TableCell className="font-semibold">
                                                {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(req.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No hay recargas aprobadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default RechargeRequests;
