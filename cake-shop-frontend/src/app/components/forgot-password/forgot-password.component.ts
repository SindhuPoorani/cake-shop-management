import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  username: string = '';
  email: string = '';
  resetCode: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  step: number = 1;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  requestResetCode() {
    if (!this.username || !this.email) {
      this.errorMessage = 'Please enter both username and email.';
      this.successMessage = '';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.http.post<{ success: boolean, message: string, email: string }>('http://localhost:3000/forgot-password', { username: this.username, email: this.email })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message;
            this.step = 2;
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          console.error('Error requesting reset code:', error);
          this.errorMessage = 'An error occurred while requesting the reset code. Please try again.';
        }
      });
  }

  verifyResetCode() {
    if (!this.resetCode) {
      this.errorMessage = 'Please enter the reset code.';
      this.successMessage = '';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const trimmedCode = this.resetCode.trim(); // Trim whitespace
    console.log('Verifying reset code:', trimmedCode); // Debug log

    this.http.post<{ success: boolean, message: string }>('http://localhost:3000/reset-password', { code: trimmedCode }) // Changed token to code
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message;
            this.step = 3;
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          console.error('Error verifying reset code:', error);
          this.errorMessage = 'An error occurred while verifying the reset code. Please try again.';
        }
      });
  }
  
  resetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields.';
      this.successMessage = '';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      this.successMessage = '';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long.';
      this.successMessage = '';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const trimmedCode = this.resetCode.trim(); // Trim whitespace
    console.log('Resetting password with code:', trimmedCode); // Debug log

    this.http.post<{ success: boolean, message: string }>('http://localhost:3000/reset-password', { code: trimmedCode, newPassword: this.newPassword }) // Changed token to code
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message;
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          console.error('Error resetting password:', error);
          this.errorMessage = 'An error occurred while resetting the password. Please try again.';
        }
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}