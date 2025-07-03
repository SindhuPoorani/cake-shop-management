import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: any = null;
  updateForm: FormGroup;
  isEditing: boolean = false;
  updateMessage: string = '';
  messageColor: string = 'red';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.updateForm = this.fb.group({
      fullname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      address: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.fetchUserData();
  }

  fetchUserData() {
    this.http.get('http://localhost:3000/get-profile', { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.user = data;
        this.updateForm.patchValue({
          fullname: this.user.fullname,
          email: this.user.email,
          mobile: this.user.mobile,
          address: this.user.address
        });
      },
      error: () => {
        alert('Failed to fetch profile data.');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.updateForm.patchValue({
        fullname: this.user.fullname,
        email: this.user.email,
        mobile: this.user.mobile,
        address: this.user.address
      });
      this.updateMessage = '';
    }
  }

  updateProfile() {
    if (this.updateForm.invalid) {
      this.updateMessage = 'Please fill in all fields correctly.';
      this.messageColor = 'red';
      return;
    }

    const updatedData = this.updateForm.value;
    this.http.put('http://localhost:3000/update-profile', updatedData, { withCredentials: true }).subscribe({
      next: (result: any) => {
        this.updateMessage = result.message;
        this.messageColor = result.success ? 'green' : 'red';
        if (result.success) {
          this.user = { ...this.user, ...updatedData };
          this.isEditing = false;
        }
      },
      error: () => {
        this.updateMessage = 'Failed to update profile.';
        this.messageColor = 'red';
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.http.get('http://localhost:3000/logout', { withCredentials: true }).subscribe({
      next: () => {
        alert('Logged out successfully!');
        this.router.navigate(['/']);
      },
      error: () => {
        alert('Logout failed. Redirecting to home...');
        this.router.navigate(['/']);
      }
    });
  }
}