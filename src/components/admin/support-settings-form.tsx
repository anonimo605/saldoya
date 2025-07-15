
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Phone } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const SUPPORT_CONFIG_DOC_ID = 'support';
const DEFAULT_PHONE_NUMBER = "573001234567";

const formSchema = z.object({
    phone: z.string().min(10, "El número de teléfono debe tener al menos 10 dígitos."),
});

const SupportSettingsForm = () => {
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            phone: '',
        },
    });

    useEffect(() => {
        const fetchSupportNumber = async () => {
            try {
                const docRef = doc(db, 'config', SUPPORT_CONFIG_DOC_ID);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().phoneNumber) {
                    form.setValue('phone', docSnap.data().phoneNumber);
                } else {
                    form.setValue('phone', DEFAULT_PHONE_NUMBER);
                }
            } catch (error) {
                console.error("Error fetching support number:", error);
                form.setValue('phone', DEFAULT_PHONE_NUMBER);
            }
        };
        fetchSupportNumber();
    }, [form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const docRef = doc(db, 'config', SUPPORT_CONFIG_DOC_ID);
            await setDoc(docRef, { phoneNumber: values.phone }, { merge: true });
            toast({
                title: "Número Guardado",
                description: `El nuevo número de soporte es ${values.phone}.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al Guardar",
                description: "No se pudo guardar el número de teléfono en la base de datos.",
            });
            console.error("Error saving support phone number:", error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurar Número de WhatsApp</CardTitle>
                <CardDescription>
                    Este número se usará en el botón flotante de soporte para que los usuarios puedan contactar por WhatsApp. Incluye el código del país.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de teléfono de soporte</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                             <Input type="tel" placeholder="573001234567" {...field} className="pl-8" />
                                             <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            <Save className="mr-2 h-4 w-4" />
                            Guardar Número
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default SupportSettingsForm;
