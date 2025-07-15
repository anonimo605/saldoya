
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Trash2, Edit, Clock } from 'lucide-react';
import { Label } from "@/components/ui/label";
import Image from "next/image";
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
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';


const productSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    price: z.coerce.number().positive("El precio debe ser un número positivo."),
    dailyYield: z.coerce.number().min(0, "El rendimiento no puede ser negativo."),
    purchaseLimit: z.coerce.number().int().positive("El límite de compra debe ser un entero positivo."),
    durationDays: z.coerce.number().int().positive("La duración debe ser un número entero positivo."),
    isTimeLimited: z.boolean().default(false),
    timeLimitHours: z.coerce.number().optional(),
});


const ProductManagement = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [productImageDataUrl, setProductImageDataUrl] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingProductImageDataUrl, setEditingProductImageDataUrl] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
            const productsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timeLimitSetAt: data.timeLimitSetAt instanceof Timestamp ? data.timeLimitSetAt.toDate() : undefined,
                } as Product
            });
            setProducts(productsData);
        });
        return () => unsubscribe();
    }, []);
    
    const addForm = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            price: 0,
            dailyYield: 0,
            purchaseLimit: 1,
            durationDays: 30,
            isTimeLimited: false,
            timeLimitHours: 24,
        },
    });

    const editForm = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
    });

     const isTimeLimitedInAddForm = addForm.watch('isTimeLimited');
     const isTimeLimitedInEditForm = editForm.watch('isTimeLimited');

    useEffect(() => {
        if (editingProduct) {
            editForm.reset({
                ...editingProduct,
                timeLimitHours: editingProduct.timeLimitHours || 24,
            });
            setEditingProductImageDataUrl(editingProduct.imageUrl);
        } else {
            editForm.reset();
            setEditingProductImageDataUrl(null);
        }
    }, [editingProduct, editForm]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>, formType: 'add' | 'edit') => {
        const file = event.target.files?.[0];
        if (!file) {
            if (formType === 'edit') {
                 setEditingProductImageDataUrl(editingProduct?.imageUrl || null);
            } else {
                setProductImageDataUrl(null);
            }
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast({
                variant: "destructive",
                title: "Archivo inválido",
                description: "Por favor, selecciona un archivo de imagen.",
            });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
             if (formType === 'add') {
                setProductImageDataUrl(reader.result as string);
            } else {
                setEditingProductImageDataUrl(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const onAddSubmit = async (values: z.infer<typeof productSchema>) => {
        try {
            const newProductData: Omit<Product, 'id'> = {
                name: values.name,
                price: values.price,
                dailyYield: values.dailyYield,
                purchaseLimit: values.purchaseLimit,
                durationDays: values.durationDays,
                imageUrl: productImageDataUrl || "https://placehold.co/600x400.png",
                isTimeLimited: values.isTimeLimited,
            };

            if (values.isTimeLimited) {
                newProductData.timeLimitHours = values.timeLimitHours;
                newProductData.timeLimitSetAt = new Date();
            }

            await addDoc(collection(db, "products"), {
                ...newProductData,
                ...(newProductData.timeLimitSetAt && { timeLimitSetAt: Timestamp.fromDate(newProductData.timeLimitSetAt) })
            });

            toast({ title: "Producto Creado", description: `El producto "${values.name}" ha sido añadido.` });
            addForm.reset();
            setProductImageDataUrl(null);
            const fileInput = document.getElementById('product-image-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error("Error adding product: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo crear el producto." });
        }
    };

    const onEditSubmit = async (values: z.infer<typeof productSchema>) => {
        if (!editingProduct) return;

        try {
            const productDocRef = doc(db, "products", editingProduct.id);
            
            const dataToUpdate: Partial<Product> = {
                ...values,
                imageUrl: editingProductImageDataUrl || editingProduct.imageUrl,
            };

            if (values.isTimeLimited) {
                 dataToUpdate.timeLimitSetAt = new Date();
            } else {
                dataToUpdate.timeLimitHours = undefined;
                dataToUpdate.timeLimitSetAt = undefined;
            }

            const firestoreUpdateData: any = { ...dataToUpdate };
            if (dataToUpdate.timeLimitSetAt) {
                firestoreUpdateData.timeLimitSetAt = Timestamp.fromDate(dataToUpdate.timeLimitSetAt);
            } else {
                 firestoreUpdateData.timeLimitSetAt = null; // Or delete the field
            }


            await updateDoc(productDocRef, firestoreUpdateData);
            toast({ title: "Producto Actualizado" });
            setEditingProduct(null);
        } catch (error) {
            console.error("Error updating product: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el producto." });
        }
    };

    const handleDelete = async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({ title: "Producto Eliminado" });
        } catch (error) {
            console.error("Error deleting product: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el producto." });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Añadir Nuevo Producto</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...addForm}>
                        <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                <FormField control={addForm.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre del Producto</FormLabel><FormControl><Input placeholder="Paquete Básico" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={addForm.control} name="price" render={({ field }) => (
                                    <FormItem><FormLabel>Precio (COP)</FormLabel><FormControl><Input type="number" placeholder="25000" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={addForm.control} name="dailyYield" render={({ field }) => (
                                    <FormItem><FormLabel>Rendimiento Diario (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="1.5" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={addForm.control} name="purchaseLimit" render={({ field }) => (
                                    <FormItem><FormLabel>Límite de Compra por Usuario</FormLabel><FormControl><Input type="number" placeholder="3" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={addForm.control} name="durationDays" render={({ field }) => (
                                    <FormItem><FormLabel>Duración (Días)</FormLabel><FormControl><Input type="number" placeholder="30" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                             <FormField
                                control={addForm.control}
                                name="isTimeLimited"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Oferta de Tiempo Limitado</FormLabel>
                                        <CardDescription>Activa un contador para este producto.</CardDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />

                            {isTimeLimitedInAddForm && (
                                <FormField
                                    control={addForm.control}
                                    name="timeLimitHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Duración de la Oferta (Horas)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="24" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="product-image-upload">Imagen del Producto</Label>
                                    <Input id="product-image-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'add')} />
                                    <p className="text-xs text-muted-foreground">Sube una imagen para el producto. Si no se selecciona una, se usará una por defecto.</p>
                                </div>
                                {productImageDataUrl && (
                                    <div className="space-y-2">
                                        <Label>Vista Previa</Label>
                                        <div className="border rounded-lg p-2 flex justify-center items-center bg-muted/50 w-full max-w-sm aspect-video relative">
                                            <Image
                                                src={productImageDataUrl}
                                                alt="Vista previa del producto"
                                                fill
                                                className="rounded-md object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Button type="submit" disabled={addForm.formState.isSubmitting}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Añadir Producto
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Productos Existentes</CardTitle>
                    <CardDescription>Lista de todos los productos disponibles en la plataforma.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Rendimiento</TableHead>
                                    <TableHead>Duración</TableHead>
                                    <TableHead>Límite</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.length > 0 ? (
                                    products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">
                                                {product.name}
                                                {product.isTimeLimited && (
                                                    <Badge variant="secondary" className="ml-2">
                                                        <Clock className="mr-1 h-3 w-3" />
                                                        Limitado
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(product.price)}</TableCell>
                                            <TableCell>{product.dailyYield}%</TableCell>
                                            <TableCell>{product.durationDays} días</TableCell>
                                            <TableCell>{product.purchaseLimit}</TableCell>
                                            <TableCell className="text-right">
                                                 <Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button variant="ghost" size="icon">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Esto eliminará permanentemente el producto.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            No hay productos creados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!editingProduct} onOpenChange={(isOpen) => !isOpen && setEditingProduct(null)}>
                <DialogContent className="sm:max-w-3xl">
                     <DialogHeader>
                        <DialogTitle>Editar Producto</DialogTitle>
                        <DialogDescription>
                           Realiza cambios en el producto. Haz clic en guardar cuando termines.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={editForm.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre del Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="price" render={({ field }) => (
                                    <FormItem><FormLabel>Precio (COP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="dailyYield" render={({ field }) => (
                                    <FormItem><FormLabel>Rendimiento Diario (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="purchaseLimit" render={({ field }) => (
                                    <FormItem><FormLabel>Límite de Compra</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={editForm.control} name="durationDays" render={({ field }) => (
                                    <FormItem><FormLabel>Duración (Días)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            
                             <FormField
                                control={editForm.control}
                                name="isTimeLimited"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Oferta de Tiempo Limitado</FormLabel>
                                            <CardDescription>Activa un contador para este producto.</CardDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {isTimeLimitedInEditForm && (
                                <FormField
                                    control={editForm.control}
                                    name="timeLimitHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Duración de la Oferta (Horas)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="24" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-product-image-upload">Imagen del Producto</Label>
                                    <Input id="edit-product-image-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'edit')} />
                                </div>
                                {editingProductImageDataUrl && (
                                    <div className="space-y-2">
                                        <Label>Vista Previa</Label>
                                        <div className="border rounded-lg p-2 flex justify-center items-center bg-muted/50 w-full max-w-sm aspect-video relative">
                                            <Image
                                                src={editingProductImageDataUrl}
                                                alt="Vista previa del producto"
                                                fill
                                                className="rounded-md object-contain"
                                                key={editingProductImageDataUrl} 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Button type="submit" disabled={editForm.formState.isSubmitting}>
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ProductManagement;
