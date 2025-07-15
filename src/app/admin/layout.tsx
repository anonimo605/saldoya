
"use client";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Routes that only 'superadmin' can access.
const superAdminOnlyRoutes = [
    "/admin/products",
    "/admin/qr-settings",
    "/admin/users",
    "/admin/gift-codes",
    "/admin/referral-settings",
    "/admin/withdrawal-settings",
    "/admin/support-settings",
];

// Routes that 'admin' and 'superadmin' can access.
const adminAllowedRoutes = [
    "/admin",
    "/admin/withdrawals",
];


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return; // Wait until loading is done
    }
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    } 

    const isSuperAdmin = user?.role === 'superadmin';
    const isAdmin = user?.role === 'admin';

    // If the user is not an admin or superadmin, redirect away from the admin area.
    if (!isSuperAdmin && !isAdmin) {
      router.replace('/dashboard');
      return;
    }

    // If a regular admin tries to access a superadmin-only route, redirect them.
    if (isAdmin && !isSuperAdmin && !adminAllowedRoutes.includes(pathname)) {
        router.replace('/admin');
    }

  }, [isLoading, isAuthenticated, user, router, pathname]);
  
  const isAuthorized = !isLoading && isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin');

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        Verificando acceso...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="container mx-auto p-4 flex items-center justify-between">
           <div className="flex items-center gap-4">
                <Logo />
                <h1 className="text-xl font-bold text-foreground tracking-tight hidden md:block">
                    Panel de Administración
                </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                  <Link href="/dashboard">
                      <Home className="mr-2 h-4 w-4" />
                      Ir al Panel de Usuario
                  </Link>
              </Button>
              <Button variant="ghost" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
