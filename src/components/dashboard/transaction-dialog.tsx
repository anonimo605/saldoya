"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DialogTrigger } from "@radix-ui/react-dialog";

const formSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Por favor, introduce un número válido." })
    .positive({ message: "El monto debe ser positivo." }),
  description: z.string().min(2, {
    message: "La descripción debe tener al menos 2 caracteres.",
  }).max(50, {
    message: "La descripción debe tener como máximo 50 caracteres.",
  }),
});

type TransactionDialogProps = {
  type: "credit" | "debit";
  onConfirm: (amount: number, description: string) => void;
  children: React.ReactNode;
};

const TransactionDialog = ({
  type,
  onConfirm,
  children,
}: TransactionDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      description: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onConfirm(values.amount, values.description);
    form.reset();
    setIsOpen(false);
  };

  const title = type === "credit" ? "Añadir Fondos" : "Hacer un Pago";
  const description =
    type === "credit"
      ? "Añade dinero a tu billetera."
      : "Gasta dinero de tu billetera.";
  const buttonText = type === "credit" ? "Añadir" : "Gastar";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Café, Salario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
              </DialogClose>
              <Button type="submit">{buttonText}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDialog;
