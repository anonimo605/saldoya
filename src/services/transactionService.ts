'use server';

import { db } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

/**
 * Creates a new transaction document in Firestore with proper validation.
 * @param transactionData - The data for the new transaction, excluding the 'id'.
 * @returns The ID of the newly created transaction document.
 * @throws An error if the provided data is invalid.
 */
export async function createTransaction(transactionData: Omit<Transaction, 'id'>): Promise<string> {
  // --- Start of Security Validation ---
  if (!transactionData.userId || typeof transactionData.userId !== 'string') {
    console.error('Invalid transaction data: userId is missing or not a string.', transactionData);
    throw new Error('Error de sistema: No se pudo registrar la transacción debido a un ID de usuario inválido.');
  }

  if (typeof transactionData.amount !== 'number' || isNaN(transactionData.amount) || transactionData.amount < 0) {
    console.error('Invalid transaction data: amount is invalid.', transactionData);
    throw new Error('Error de sistema: El monto de la transacción es inválido.');
  }
   
  if (!transactionData.description || typeof transactionData.description !== 'string' || transactionData.description.trim() === '') {
     console.error('Invalid transaction data: description is missing or empty.', transactionData);
     throw new Error('Error de sistema: La descripción de la transacción no puede estar vacía.');
  }
  // --- End of Security Validation ---

  try {
    const transactionWithTimestamp = {
      ...transactionData,
      date: Timestamp.fromDate(transactionData.date instanceof Date ? transactionData.date : new Date()),
    };
    
    const docRef = await addDoc(collection(db, 'transactions'), transactionWithTimestamp);
    return docRef.id;

  } catch (error) {
    console.error("Failed to create transaction in Firestore:", error);
    // Re-throw a more user-friendly or generic error to the caller
    throw new Error("No se pudo completar la operación de la base de datos para la transacción.");
  }
}
