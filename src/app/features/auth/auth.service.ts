import { inject, Injectable, signal } from "@angular/core";
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, user } from "@angular/fire/auth";
import { Firestore, collection, doc, setDoc, getDoc, runTransaction } from "@angular/fire/firestore";
import { from, map, Observable } from "rxjs";
import { UserInterface } from "./user.interface";


@Injectable({providedIn: 'root'})
export class AuthService {
  firebaseAuth = inject(Auth);
  firestore = inject(Firestore);
  user$ = user(this.firebaseAuth);

  currentUserSig = signal<UserInterface | null | undefined>(undefined);

  constructor() {
    this.user$.subscribe(user => {
      if (user) {
        this.currentUserSig.set({
          uid: user.uid,
          email: user.email ?? '',
          username: user.displayName ?? ''
        });
      } else {
        this.currentUserSig.set(null);
      }
    });
  }

  register(email: string, username: string, password: string): Observable<void> {
    const promise = (async () => {
      const statsDocRef = doc(this.firestore, '_stats/usersCount');
      const statsDoc = await getDoc(statsDocRef);
      
      if (!statsDoc.exists()) {
        throw new Error('User limit configuration not found. Please contact administrator.');
      }
      
      const stats = statsDoc.data();
      const currentCount = stats?.['count'] ?? 0;
      const maxUsers = stats?.['maxUsers'] ?? 10;
      
      if (currentCount >= maxUsers) {
        throw new Error(`User limit reached. Maximum ${maxUsers} users allowed.`);
      }
      
      const response = await createUserWithEmailAndPassword(
        this.firebaseAuth, 
        email, 
        password
      );
      
      try {
        await updateProfile(response.user, {displayName: username});
        
        await runTransaction(this.firestore, async (transaction) => {
          const statsSnapshot = await transaction.get(statsDocRef);
          const currentStats = statsSnapshot.data();
          
          if (!currentStats || currentStats['count'] >= currentStats['maxUsers']) {
            throw new Error(`User limit reached. Maximum ${currentStats?.['maxUsers']} users allowed.`);
          }
          
          const userDocRef = doc(this.firestore, 'users', response.user.uid);
          transaction.set(userDocRef, {
            userId: response.user.uid,
            username: username,
            email: email
          });
          
          transaction.update(statsDocRef, {
            count: currentStats['count'] + 1
          });
        });
      } catch (error) {
        try {
          await response.user.delete();
        } catch (deleteError) {
          console.error('Failed to delete user after transaction error:', deleteError);
        }
        throw error;
      }
    })().catch((error) => {
      console.error('Firebase registration error:', error);
      throw error;
    });

    return from(promise);
  }

  login(email: string, password: string): Observable<void> {
    const promise = signInWithEmailAndPassword(
      this.firebaseAuth,
      email,
      password
    ).then(async (response) => {
      const userDocRef = doc(this.firestore, 'users', response.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          userId: response.user.uid,
          username: response.user.displayName || '',
          email: response.user.email || email
        });
      }
    });
    
    return from(promise);
  }

  getUser(): UserInterface | null | undefined {
    return this.currentUserSig();
  }

  userSignal() {
    return this.currentUserSig;
  }

  userChanges(): Observable<UserInterface | null> {
  return this.user$.pipe(
    map(user => {
      if (!user) return null;

      return {
        uid: user.uid,
        email: user.email ?? '',
        username: user.displayName ?? ''
      };
    })
  );
}

  logout(): Observable<void> {
    const promise = signOut(this.firebaseAuth);
    return from(promise);
  }
}