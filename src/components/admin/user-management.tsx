

"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User, Transaction, PurchasedProduct } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Edit, Trash2, Archive, Copy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, Timestamp, getDocs } from 'firebase/firestore';
import { createTransaction } from '@/services/transactionService';

const editBalanceSchema = z.object({
    amount: z.coerce.number().positive("El monto debe ser un número positivo."),
    description: z.string().min(3, "La descripción es requerida."),
    actionType: z.enum(["add", "subtract", "set"], {
        required_error: "Debes seleccionar una acción.",
    }),
});

type UserWithProducts = User & { purchasedProducts: PurchasedProduct[] };

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [viewingUser, setViewingUser] = useState<UserWithProducts | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as User));
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, []);

    const form = useForm<z.infer<typeof editBalanceSchema>>({
        resolver: zodResolver(editBalanceSchema),
    });

    const handleEditBalance = (user: User) => {
        setSelectedUser(user);
        form.reset({
            amount: 0,
            description: "",
            actionType: "add",
        });
    };

    const handleViewProducts = async (user: User) => {
        try {
            const productsColRef = collection(db, `users/${user.id}/purchasedProducts`);
            const snapshot = await getDocs(productsColRef);
            const products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                purchaseDate: (doc.data().purchaseDate as Timestamp).toDate(),
                lastYieldDate: doc.data().lastYieldDate ? (doc.data().lastYieldDate as Timestamp).toDate() : undefined,
            } as PurchasedProduct));
            setViewingUser({ ...user, purchasedProducts: products });
        } catch (error) {
            console.error("Error fetching user products:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los productos del usuario." });
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado", description: "El texto ha sido copiado." });
    };

    const onSubmitBalance = async (values: z.infer<typeof editBalanceSchema>) => {
        if (!selectedUser || !selectedUser.id) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no seleccionado o inválido." });
            return;
        }

        let newBalance = selectedUser.balance;
        let transactionType: 'credit' | 'debit' = 'credit';
        let transactionAmount = values.amount;

        switch (values.actionType) {
            case 'add':
                newBalance += values.amount;
                transactionType = 'credit';
                break;
            case 'subtract':
                newBalance -= values.amount;
                transactionType = 'debit';
                break;
            case 'set':
                const diff = values.amount - newBalance;
                transactionType = diff >= 0 ? 'credit' : 'debit';
                transactionAmount = Math.abs(diff);
                newBalance = values.amount;
                break;
        }

        const newTransaction: Omit<Transaction, 'id'> = {
            userId: selectedUser.id,
            type: transactionType,
            amount: transactionAmount,
            description: values.description,
            date: new Date(),
        };
        
        try {
            await createTransaction(newTransaction);
            const userDocRef = doc(db, 'users', selectedUser.id);
            await updateDoc(userDocRef, {
                balance: newBalance,
                version: (selectedUser.version || 0) + 1
            });
            setSelectedUser(null);
            toast({ title: "Saldo Actualizado" });
        } catch (error) {
            console.error("Error updating balance: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el saldo." });
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            // Firestore doesn't support deleting subcollections from the client-side SDK directly.
            // This would require a Cloud Function for a complete cleanup.
            // For now, we just delete the user document.
            await deleteDoc(doc(db, 'users', userId));
            toast({ title: "Usuario Eliminado" });
        } catch (error) {
            console.error("Error deleting user: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar al usuario." });
        }
    };

    const handleDeleteProduct = async (userId: string, productId: string) => {
        if (!userId) {
            toast({ variant: "destructive", title: "Error", description: "ID de usuario inválido." });
            return;
        }
        try {
            const productDocRef = doc(db, `users/${userId}/purchasedProducts`, productId);
            await deleteDoc(productDocRef);

            setViewingUser(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    purchasedProducts: prev.purchasedProducts.filter(p => p.id !== productId)
                };
            });

            toast({ title: "Producto Eliminado del Usuario" });
        } catch (error) {
            console.error("Error deleting user product: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el producto del usuario." });
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Usuarios</CardTitle>
                    <CardDescription>Visualiza, edita y elimina usuarios registrados en la plataforma.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID Usuario</TableHead>
                                    <TableHead>Cód. Referido</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Saldo</TableHead>
                                    <TableHead>Referidos</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono">{user.displayId}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(user.displayId)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono">{user.referralCode}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(user.referralCode)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.phone}</TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            <TableCell className="font-semibold">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(user.balance)}</TableCell>
                                            <TableCell>{user.referredUsers?.length ?? 0}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditBalance(user)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleViewProducts(user)}>
                                                    <Archive className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={user.role === 'superadmin'}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario y toda su información. La subcolección de productos deberá ser eliminada manualmente o con una Cloud Function.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">
                                                                Sí, eliminar usuario
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            No hay usuarios registrados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Saldo de Usuario</DialogTitle>
                        <DialogDescription>
                            Modifica el saldo para {selectedUser?.phone}. La acción creará una transacción.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="text-sm">
                            <span className="text-muted-foreground">Saldo actual: </span> 
                            <span className="font-bold">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(selectedUser.balance)}</span>
                        </div>
                    )}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitBalance)} className="space-y-4">
                            <FormField control={form.control} name="actionType" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Acción a Realizar</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="add" /></FormControl>
                                                <FormLabel className="font-normal">Añadir</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="subtract" /></FormControl>
                                                <FormLabel className="font-normal">Restar</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="set" /></FormControl>
                                                <FormLabel className="font-normal">Establecer</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="amount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto (COP)</FormLabel>
                                    <FormControl><Input type="number" placeholder="5000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción / Razón</FormLabel>
                                    <FormControl><Input placeholder="Bono por buen rendimiento" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Aplicando...' : 'Aplicar Cambios'}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewingUser} onOpenChange={(isOpen) => !isOpen && setViewingUser(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Productos de {viewingUser?.phone}</DialogTitle>
                        <DialogDescription>
                            Aquí puedes ver y eliminar los productos que ha comprado este usuario.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Fecha Compra</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewingUser?.purchasedProducts && viewingUser.purchasedProducts.length > 0 ? (
                                    viewingUser.purchasedProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{new Date(product.purchaseDate).toLocaleDateString('es-CO')}</TableCell>
                                            <TableCell>
                                                <Badge variant={product.status === 'Activo' ? 'default' : 'secondary'}>
                                                    {product.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Eliminar producto del usuario?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer y no devolverá el saldo de la compra al usuario.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => {
                                                                    if (viewingUser) {
                                                                        handleDeleteProduct(viewingUser.id, product.id);
                                                                    }
                                                                }} 
                                                                className="bg-destructive hover:bg-destructive/90">
                                                                Sí, eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            Este usuario no tiene productos comprados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserManagement;
