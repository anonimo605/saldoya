

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Transaction, WithdrawalInfo, PurchasedProduct } from '@/lib/types';
import { db } from '@/lib/firebase';
import { createTransaction } from '@/services/transactionService';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    updateDoc, 
    query, 
    where, 
    getDocs, 
    runTransaction,
    Timestamp,
    getDoc,
    writeBatch
} from 'firebase/firestore';

// This function processes pending yields for a user's active products.
const processProductYields = async (user: User, purchasedProducts: PurchasedProduct[]): Promise<{ updatedUser: User, updatedProducts: PurchasedProduct[], hasChanges: boolean }> => {
    if (!user || !purchasedProducts || purchasedProducts.length === 0) {
        return { updatedUser: user, updatedProducts: purchasedProducts, hasChanges: false };
    }

    const now = new Date();
    let updatedBalance = user.balance;
    const newTransactions: Omit<Transaction, 'id'>[] = [];
    let hasChanges = false;

    const updatedPurchasedProducts = purchasedProducts.map(product => {
        if (product.status === 'Expirado') {
            return product;
        }
        
        const purchaseDate = new Date((product.purchaseDate as any).seconds ? (product.purchaseDate as any).seconds * 1000 : product.purchaseDate);
        const expirationDate = new Date(new Date(purchaseDate).setDate(purchaseDate.getDate() + product.durationDays));
        const lastYieldDate = product.lastYieldDate ? new Date((product.lastYieldDate as any).seconds ? (product.lastYieldDate as any).seconds * 1000 : product.lastYieldDate) : undefined;

        // Use the purchase date as the starting point if no yield has been processed yet
        const lastDate = lastYieldDate || purchaseDate;
        
        // Don't process yields past the expiration date
        const endDateForYield = now > expirationDate ? expirationDate : now;

        const elapsedMilliseconds = endDateForYield.getTime() - lastDate.getTime();
        const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60);

        // If it's not time for the next 24h cycle yet, do nothing unless it's past expiration
        if (elapsedHours < 24) {
            if (now > expirationDate && product.status !== 'Expirado') {
                 // Mark as expired if the current time is past the expiration date, even if no full cycle passed
                 hasChanges = true;
                 return { ...product, status: 'Expirado' };
            }
            return product;
        }

        const cyclesToProcess = Math.floor(elapsedHours / 24);
        if (cyclesToProcess <= 0) {
             if (now > expirationDate && product.status !== 'Expirado') {
                 hasChanges = true;
                 return { ...product, status: 'Expirado' };
            }
            return product;
        }

        hasChanges = true;
        const dailyProfit = product.price * (product.dailyYield / 100);
        const totalProfit = dailyProfit * cyclesToProcess;

        updatedBalance += totalProfit;

        const yieldTransaction: Omit<Transaction, 'id'> = {
            userId: user.id,
            type: 'credit',
            amount: totalProfit,
            description: `Rendimiento de ${product.name} (${cyclesToProcess} día/s)`,
            date: new Date(),
        };
        newTransactions.push(yieldTransaction);

        // Update the last yield date by adding the processed cycles
        const newLastYieldDate = new Date(lastDate.getTime() + cyclesToProcess * 24 * 60 * 60 * 1000);
        const updatedStatus = newLastYieldDate >= expirationDate ? 'Expirado' : 'Activo';
        
        const updatedProduct: PurchasedProduct = {
            ...product,
            lastYieldDate: newLastYieldDate,
            status: updatedStatus,
        };

        return updatedProduct;
    });

    if (hasChanges) {
        // Create new transaction documents
        for (const tx of newTransactions) {
            await createTransaction(tx);
        }

        return {
            updatedUser: {
                ...user,
                balance: updatedBalance,
            },
            updatedProducts: updatedPurchasedProducts,
            hasChanges: true
        };
    }
    
    return { updatedUser: user, updatedProducts: purchasedProducts, hasChanges: false };
};


interface AuthContextType {
    user: User | null;
    purchasedProducts: PurchasedProduct[];
    isAuthenticated: boolean;
    login: (phone: string, password: string) => Promise<boolean>;
    logout: () => void;
    register: (phone: string, password: string, referralCode?: string) => Promise<{ success: boolean; message: string }>;
    updateUser: (dataToUpdate: Partial<User>) => Promise<void>;
    isLoading: boolean;
    processUserYields: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userListener, setUserListener] = useState<(() => void) | null>(null);
    const [productsListener, setProductsListener] = useState<(() => void) | null>(null);
    const router = useRouter();
    
    useEffect(() => {
        // Cleanup listeners on unmount
        return () => {
            if (userListener) userListener();
            if (productsListener) productsListener();
        };
    }, [userListener, productsListener]);

    useEffect(() => {
        const checkAuth = () => {
            const currentUserId = localStorage.getItem('userId');
            if (currentUserId) {
                listenToUserData(currentUserId);
            } else {
                setIsLoading(false);
            }
        };
        checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateUserAndYield = async (userId: string, fetchedUser: User, fetchedProducts: PurchasedProduct[]) => {
        const { updatedUser, updatedProducts, hasChanges } = await processProductYields(fetchedUser, fetchedProducts);
        
        if (hasChanges) {
            await saveUserAndProductsChanges(userId, updatedUser, updatedProducts);
            setUser(updatedUser);
            setPurchasedProducts(updatedProducts);
        } else {
            setUser(fetchedUser);
            setPurchasedProducts(fetchedProducts);
        }
    };
    
    const listenToUserData = (userId: string) => {
        setIsLoading(true);
        if (userListener) userListener();
        if (productsListener) productsListener();
        
        const userDocRef = doc(db, "users", userId);
        const productsColRef = collection(db, `users/${userId}/purchasedProducts`);

        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = { ...doc.data(), id: doc.id } as User;
                 onSnapshot(productsColRef, (snapshot) => {
                    const productsData = snapshot.docs.map(pDoc => {
                        const data = pDoc.data();
                        return {
                            ...data,
                            id: pDoc.id,
                            purchaseDate: (data.purchaseDate as any).toDate(),
                            lastYieldDate: data.lastYieldDate ? (data.lastYieldDate as any).toDate() : undefined,
                        } as PurchasedProduct;
                    });
                    
                    updateUserAndYield(userId, userData, productsData);
                    setIsLoading(false);
                });
            } else {
                logout(); // User not found, log out
                setIsLoading(false);
            }
        }, (error) => {
            console.error("Error listening to user:", error);
            setIsLoading(false);
        });

        const unsubscribeProducts = onSnapshot(productsColRef, (snapshot) => {
            const productsData = snapshot.docs.map(pDoc => {
                const data = pDoc.data();
                return {
                    ...data,
                    id: pDoc.id,
                    purchaseDate: (data.purchaseDate as any).toDate(),
                    lastYieldDate: data.lastYieldDate ? (data.lastYieldDate as any).toDate() : undefined,
                } as PurchasedProduct;
            });
            setPurchasedProducts(productsData);
             if (user) {
                updateUserAndYield(userId, user, productsData);
            }
        });
        
        setUserListener(() => unsubscribeUser);
        setProductsListener(() => unsubscribeProducts);
    };

    const processUserYields = async () => {
       if (user) {
            const { updatedUser, updatedProducts, hasChanges } = await processProductYields(user, purchasedProducts);
            if (hasChanges) {
                await saveUserAndProductsChanges(user.id, updatedUser, updatedProducts);
            }
        }
    };

    const login = async (phone: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('phone', '==', phone));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setIsLoading(false);
                return false;
            }
            
            const foundUser = querySnapshot.docs[0].data() as User;
            const userId = querySnapshot.docs[0].id;
            
            // This is a simplified check for prototyping. DO NOT use in production.
            if (foundUser.password === password) {
                localStorage.setItem('userId', userId);
                listenToUserData(userId);
                // No need to setIsLoading(false) here, listenToUser will do it.
                router.push(foundUser.role === 'admin' || foundUser.role === 'superadmin' ? '/admin' : '/dashboard');
                return true;
            }
            setIsLoading(false);
            return false;
        } catch(e) {
            console.error(e);
            setIsLoading(false);
            return false;
        }
    };

    const logout = () => {
        if (userListener) userListener();
        if (productsListener) productsListener();
        setUser(null);
        setPurchasedProducts([]);
        setUserListener(null);
        setProductsListener(null);
        localStorage.removeItem('userId');
        router.push('/login');
    };

    const register = async (phone: string, password: string, referralCode?: string): Promise<{ success: boolean; message: string }> => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const phoneQuery = query(usersRef, where('phone', '==', phone));
            const existingUserSnapshot = await getDocs(phoneQuery);

            if (!existingUserSnapshot.empty) {
                return { success: false, message: "Este número de celular ya está en uso." };
            }

            let referrer: User | null = null;
            let referrerId: string | null = null;
            
            if (referralCode) {
                const referrerQuery = query(usersRef, where("referralCode", "==", referralCode));
                const referrerSnapshot = await getDocs(referrerQuery);
                if (referrerSnapshot.empty) {
                     return { success: false, message: "El código de referido no es válido." };
                }
                referrerId = referrerSnapshot.docs[0].id;
                referrer = referrerSnapshot.docs[0].data() as User;
            }
            
            const docRef = await addDoc(collection(db, 'users'), {});
            
            const welcomeTransaction: Omit<Transaction, 'id'> = {
                userId: docRef.id,
                type: "credit",
                amount: 5000,
                description: "Bono de bienvenida",
                date: new Date(),
            };
            
            await createTransaction(welcomeTransaction);

            const newUser: Omit<User, 'id'> = {
                displayId: docRef.id.substring(0, 6).toUpperCase(),
                phone,
                password, // Storing password for prototype purposes. Not for production.
                balance: 5000,
                referralCode: docRef.id.substring(0, 6).toUpperCase(),
                referredUsers: [],
                role: 'user',
                withdrawalInfo: null,
                version: 1,
            };

            if (referrerId) {
                (newUser as any).referredBy = referrerId;
            }

            await updateDoc(docRef, newUser);

            if (referrerId && referrer) {
                const referrerDocRef = doc(db, "users", referrerId);
                await updateDoc(referrerDocRef, {
                    referredUsers: [...(referrer.referredUsers || []), docRef.id]
                });
            }
            
            localStorage.setItem('userId', docRef.id);
            listenToUserData(docRef.id);
            router.push('/dashboard');
            return { success: true, message: "Registro exitoso." };

        } catch (error) {
            console.error("Error during registration:", error);
            return { success: false, message: "Ocurrió un error inesperado." };
        } finally {
            setIsLoading(false);
        }
    };

    const saveUserAndProductsChanges = async (userId: string, userData: User, products: PurchasedProduct[]) => {
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', userId);
        
        const { id, ...userDataToSave } = userData;
        batch.update(userDocRef, userDataToSave);

        products.forEach(product => {
            const productDocRef = doc(db, `users/${userId}/purchasedProducts`, product.id);
            const { id: pId, ...productDataToSave } = product;
            batch.update(productDocRef, {
                ...productDataToSave,
                purchaseDate: Timestamp.fromDate(new Date(product.purchaseDate)),
                ...(product.lastYieldDate && { lastYieldDate: Timestamp.fromDate(new Date(product.lastYieldDate)) }),
            });
        });

        await batch.commit();
    };
    
     const updateUser = async (dataToUpdate: Partial<User>): Promise<void> => {
        if (!user) {
            throw new Error("User not authenticated");
        }
        
        try {
            const userDocRef = doc(db, "users", user.id);
            
            // Increment the version number for optimistic locking
            const currentVersion = user.version || 0;
            const dataWithVersion = {
                ...dataToUpdate,
                version: currentVersion + 1,
            };

            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(userDocRef);
                if (!sfDoc.exists()) {
                    throw "Document does not exist!";
                }
                
                // Compare versions to prevent overwrites
                const serverVersion = sfDoc.data().version || 0;
                if (serverVersion !== currentVersion) {
                    throw "User data has been modified by another process. Please refresh and try again.";
                }

                transaction.update(userDocRef, dataWithVersion);
            });

        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    };

    const value = { user, purchasedProducts, isAuthenticated: !!user, login, logout, register, updateUser, isLoading, processUserYields };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
