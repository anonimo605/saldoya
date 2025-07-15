
"use client";

import { useEffect } from 'react';
import { useForm, useForm as useAnnouncementForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Percent, Clock, Megaphone } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Checkbox } from "@/components/ui/checkbox";
import type { WithdrawalSettings } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export const ANNOUNCEMENT_CONFIG_ID = 'announcement';

const announcementSchema = z.object({
    content: z.string().max(500, "El anuncio no puede tener más de 500 caracteres.").optional(),
    isEnabled: z.boolean().default(false),
});


const DEFAULT_SETTINGS: WithdrawalSettings = {
    minWithdrawal: 10000,
    dailyLimit: 1,
    withdrawalFeePercentage: 8,
    withdrawalStartTime: 10,
    withdrawalEndTime: 15,
    allowedWithdrawalDays: [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
};

const daysOfWeek = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
];

const formSchema = z.object({
    minWithdrawal: z.coerce.number().positive("El monto mínimo debe ser un número positivo."),
    dailyLimit: z.coerce.number().int().min(1, "El límite diario debe ser al menos 1."),
    withdrawalFeePercentage: z.coerce.number().min(0, "El porcentaje no puede ser negativo.").max(100, "El porcentaje no puede ser mayor a 100."),
    withdrawalStartTime: z.coerce.number().int().min(0, "La hora debe ser entre 0 y 23.").max(23, "La hora debe ser entre 0 y 23."),
    withdrawalEndTime: z.coerce.number().int().min(0, "La hora debe ser entre 0 y 23.").max(23, "La hora debe ser entre 0 y 23."),
    allowedWithdrawalDays: z.array(z.number()).min(1, "Debes seleccionar al menos un día de la semana."),
}).refine(data => data.withdrawalStartTime < data.withdrawalEndTime, {
    message: "La hora de inicio debe ser anterior a la hora de fin.",
    path: ["withdrawalEndTime"], 
});


const WithdrawalSettingsForm = () => {
    const { toast } = useToast();

    const withdrawalForm = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: DEFAULT_SETTINGS,
    });

    const announcementForm = useAnnouncementForm<z.infer<typeof announcementSchema>>({
        resolver: zodResolver(announcementSchema),
        defaultValues: {
            content: '',
            isEnabled: false,
        },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const configDocRef = doc(db, 'config', 'withdrawals');
            const docSnap = await getDoc(configDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Partial<WithdrawalSettings>;
                withdrawalForm.reset({
                    ...DEFAULT_SETTINGS,
                    ...data,
                });
            }
        };
        const fetchAnnouncement = async () => {
            try {
                const docRef = doc(db, 'config', ANNOUNCEMENT_CONFIG_ID);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    announcementForm.reset(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching announcement:", error);
            }
        };
        fetchSettings();
        fetchAnnouncement();
    }, [withdrawalForm, announcementForm]);

    const onWithdrawalSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const configDocRef = doc(db, 'config', 'withdrawals');
            await setDoc(configDocRef, values, { merge: true });
            toast({
                title: "Configuración Guardada",
                description: "Las reglas de retiro han sido actualizadas.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al Guardar",
                description: "No se pudo guardar la configuración de retiros.",
            });
            console.error("Error saving withdrawal settings:", error);
        }
    };

     const onAnnouncementSubmit = async (values: z.infer<typeof announcementSchema>) => {
        try {
            const docRef = doc(db, 'config', ANNOUNCEMENT_CONFIG_ID);
            await setDoc(docRef, values, { merge: true });
            toast({
                title: "Anuncio Guardado",
                description: "La configuración del anuncio global ha sido actualizada.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al Guardar",
                description: "No se pudo guardar la configuración del anuncio.",
            });
            console.error("Error saving announcement:", error);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Ajustes de Retiro</CardTitle>
                    <CardDescription>
                        Establece las reglas para las solicitudes de retiro, incluyendo montos, límites y horarios.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...withdrawalForm}>
                        <form onSubmit={withdrawalForm.handleSubmit(onWithdrawalSubmit)} className="space-y-6">
                            <FormField
                                control={withdrawalForm.control}
                                name="minWithdrawal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Monto Mínimo de Retiro (COP)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="10000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={withdrawalForm.control}
                                name="dailyLimit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Máximo de Retiros por Día</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={withdrawalForm.control}
                                name="withdrawalFeePercentage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Porcentaje de Comisión por Retiro</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                 <Input type="number" step="0.1" placeholder="8" {...field} className="pl-8" />
                                                 <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <FormLabel>Días de Retiro Permitidos</FormLabel>
                                <FormField
                                    control={withdrawalForm.control}
                                    name="allowedWithdrawalDays"
                                    render={() => (
                                        <FormItem className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {daysOfWeek.map((day) => (
                                                <FormField
                                                    key={day.id}
                                                    control={withdrawalForm.control}
                                                    name="allowedWithdrawalDays"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={day.id}
                                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(day.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, day.id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== day.id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal">
                                                                    {day.label}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                             <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>


                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <FormField
                                    control={withdrawalForm.control}
                                    name="withdrawalStartTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hora de Inicio de Retiros</FormLabel>
                                            <FormControl>
                                                 <div className="relative">
                                                    <Input type="number" placeholder="10" {...field} className="pl-8" />
                                                    <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={withdrawalForm.control}
                                    name="withdrawalEndTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hora de Fin de Retiros</FormLabel>
                                            <FormControl>
                                                 <div className="relative">
                                                    <Input type="number" placeholder="15" {...field} className="pl-8" />
                                                    <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button type="submit" disabled={withdrawalForm.formState.isSubmitting}>
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Configuración de Retiros
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Separator />

            <Card>
                 <CardHeader>
                    <CardTitle>Gestionar Anuncio Global</CardTitle>
                    <CardDescription>
                        Escribe el mensaje que quieres mostrar a todos los usuarios en su panel. Usa el interruptor para activarlo o desactivarlo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...announcementForm}>
                        <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-6">
                             <FormField
                                control={announcementForm.control}
                                name="isEnabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Mostrar Anuncio</FormLabel>
                                        <CardDescription>
                                            Si está activado, el anuncio será visible para todos los usuarios.
                                        </CardDescription>
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
                            <FormField
                                control={announcementForm.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contenido del Anuncio</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Escribe tu mensaje aquí..."
                                                className="min-h-[120px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        
                            <Button type="submit" disabled={announcementForm.formState.isSubmitting}>
                                <Megaphone className="mr-2 h-4 w-4" />
                                Guardar Anuncio
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default WithdrawalSettingsForm;

