import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  signupForm: FormGroup;
  signupMessage: string = '';
  signupMessageColor: string = 'red';
  usernameMessage: string = '';
  usernameMessageColor: string = 'red';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      fullname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(/^(?=.*\d)(?=.*[!@#$%^&*]).{6,}$/)]],
      confirmPassword: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Debounce username input to check availability
    this.signupForm.get('username')?.valueChanges.pipe(
      debounceTime(500)
    ).subscribe(username => {
      if (username.length < 3) {
        this.usernameMessage = '';
        return;
      }
      this.checkUsername();
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  checkUsername() {
    const username = this.signupForm.get('username')?.value;
    if (username.length < 3) return;

    this.http.get<{ available: boolean }>(`http://localhost:3000/check-username?username=${username}`)
      .subscribe({
        next: (result) => {
          if (!result.available) {
            this.usernameMessage = 'Username already taken!';
            this.usernameMessageColor = 'red';
            this.signupForm.get('username')?.setErrors({ taken: true });
          } else {
            this.usernameMessage = 'Username is available!';
            this.usernameMessageColor = 'green';
            this.signupForm.get('username')?.setErrors(null);
          }
        },
        error: () => {
          this.usernameMessage = 'Error checking username.';
          this.usernameMessageColor = 'red';
        }
      });
  }

  onSubmit() {
    if (this.signupForm.invalid) {
      this.signupMessage = 'Please fill in all fields correctly.';
      this.signupMessageColor = 'red';
      return;
    }

    const formData = this.signupForm.value;
    this.http.post<{ success: boolean; message: string }>('http://localhost:3000/register', formData)
      .subscribe({
        next: (result) => {
          this.signupMessage = result.message;
          this.signupMessageColor = result.success ? 'green' : 'red';
          if (result.success) {
            setTimeout(() => this.router.navigate(['/login']), 2000);
          }
        },
        error: () => {
          this.signupMessage = 'Registration failed. Please try again.';
          this.signupMessageColor = 'red';
        }
      });
  }
}