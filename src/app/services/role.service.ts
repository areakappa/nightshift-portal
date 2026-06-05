import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UserRole = 'organizer' | 'operator';

@Injectable({ providedIn: 'root' })
export class RoleService {
  // TODO: agganciare a auth/session
  private role$ = new BehaviorSubject<UserRole>('operator');
  //private role$ = new BehaviorSubject<UserRole>('organizer');
  

  getRole$() {
    return this.role$.asObservable();
  }

  getRoleSnapshot(): UserRole {
    return this.role$.value;
  }

  // helper per test
  setRole(role: UserRole) {
    this.role$.next(role);
  }
}