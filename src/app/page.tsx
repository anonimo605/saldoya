"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || (!isLoading && isAuthenticated)) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <Logo className="text-5xl" />
      <p className="mt-4 text-lg text-muted-foreground max-w-md">
        Gestiona tu saldo, compra productos y gana recompensas. Todo en un solo lugar.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg">
          <Link href="/login">
            Iniciar Sesión
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/register">
            Crear cuenta
          </Link>
        </Button>
      </div>
    </main>
  );
}
