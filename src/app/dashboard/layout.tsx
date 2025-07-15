
"use client";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return; // Wait until loading is done
    }
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
  const isAuthorized = !isLoading && isAuthenticated;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="container mx-auto p-4 flex items-center justify-between">
           <Link href="/dashboard">
                <Logo />
           </Link>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Panel de Admin
                  </Link>
                </Button>
              )}
              <span className="text-sm font-medium hidden sm:inline">
                {user?.phone}
              </span>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                     <Avatar>
                        <AvatarFallback>{user?.phone?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.phone}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
