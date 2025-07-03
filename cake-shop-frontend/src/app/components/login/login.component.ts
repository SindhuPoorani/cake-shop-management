import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loginMessage: string = '';
  messageColor: string = 'red';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private location: Location
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.loginMessage = 'Please correct the errors in the form.';
      this.messageColor = 'red';
      return;
    }

    this.isLoading = true;
    this.loginMessage = '';
    const { username, password } = this.loginForm.value;

    this.http
      .post<{ success: boolean; message: string; redirect?: string }>(
        'http://localhost:3000/login',
        { username, password },
        { withCredentials: true }
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.loginMessage = response.message;
          this.messageColor = response.success ? 'green' : 'red';
          console.log('Login response:', response);
          if (response.success && response.redirect) {
            setTimeout(() => {
              this.router.navigate([response.redirect]).then((success) => {
                console.log(`Navigation to ${response.redirect} ${success ? 'succeeded' : 'failed'}`);
              });
            }, 1500);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.messageColor = 'red';
          this.loginMessage = `Login failed: ${err.statusText || 'Server error'}. Check console for details.`;
          console.error('Login error:', err);
        },
      });
  }

  goBackToHome(): void {
    // Option 1: Go back to the previous page in browser history
    // this.location.back();

    // Option 2: Navigate to the home page (i.e., "/")
    this.router.navigate(['/']);
  }

  clearMessage() {
    this.loginMessage = '';
    this.messageColor = 'red';
  }
}