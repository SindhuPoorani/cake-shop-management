import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private router: Router) {}

  // Check if the user is authenticated (e.g., token exists in localStorage)
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    const isAuthenticated = !!token;
    console.log('AuthService: isAuthenticated =', isAuthenticated);
    return isAuthenticated;
  }

  // Store token after login (call this in your LoginComponent)
  login(token: string): void {
    localStorage.setItem('authToken', token);
  }

  // Clear token and navigate to login on logout
  logout(): void {
    console.log('AuthService: Logging out');
    localStorage.removeItem('authToken');
    this.router.navigate(['/login']);
  }
}