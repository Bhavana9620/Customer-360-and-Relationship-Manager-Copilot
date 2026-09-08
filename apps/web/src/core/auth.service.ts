import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly demoUser = { username: 'admin', password: 'admin123' };
  private readonly usersKey = 'c360_users';

  login(username: string, password: string): Observable<boolean> {
    const normalizedUsername = username.trim().toLowerCase();
    const registeredUsers = this.getRegisteredUsers();
    const isValid = (normalizedUsername === this.demoUser.username && password === this.demoUser.password)
      || registeredUsers.some((user) => user.username === normalizedUsername && user.password === password);

    if (isValid) {
      localStorage.setItem('c360_session', JSON.stringify({ username, authenticatedAt: new Date().toISOString() }));
      return of(true).pipe(delay(400));
    }

    return of(false).pipe(delay(400));
  }

  signup(name: string, username: string, password: string): Observable<boolean> {
    const normalizedUsername = username.trim().toLowerCase();
    const alreadyExists = normalizedUsername === this.demoUser.username
      || this.getRegisteredUsers().some((user) => user.username === normalizedUsername);

    if (alreadyExists) {
      return of(false).pipe(delay(400));
    }

    const users = this.getRegisteredUsers();
    users.push({ name: name.trim(), username: normalizedUsername, password });
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    localStorage.setItem('c360_session', JSON.stringify({ username: normalizedUsername, name: name.trim(), authenticatedAt: new Date().toISOString() }));
    return of(true).pipe(delay(400));
  }

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('c360_session'));
  }

  logout(): void {
    localStorage.removeItem('c360_session');
  }

  private getRegisteredUsers(): Array<{ name: string; username: string; password: string }> {
    try {
      return JSON.parse(localStorage.getItem(this.usersKey) ?? '[]') as Array<{ name: string; username: string; password: string }>;
    } catch {
      return [];
    }
  }
}
