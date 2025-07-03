import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Cake {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  weight: number;
  category: string;
  quantity: number;
}

interface Order {
  _id: string;
  username: string;
  date: string;
  time: string;
  totalPrice: number;
  items: { id: number; name: string; quantity: number; price: number; category: string }[];
  status: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  activeSection: string = 'add';
  addCakeForm: FormGroup;
  updateForm: FormGroup;
  updateCakeForm: FormGroup;
  deleteForm: FormGroup;
  cakes: Cake[] = [];
  filteredCakes: Cake[] = []; // Added for filtered cakes
  cakeToUpdate: Cake | null = null;
  addMessage: string = '';
  updateMessage: string = '';
  deleteMessage: string = '';
  messageColor: string = 'red';
  selectedFile: File | null = null;
  orders: Order[] = [];
  orderErrorMessage: string | null = null;
  selectedStatus: string = '';
  selectedCategory: string = ''; // Added for category filter

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.addCakeForm = this.fb.group({
      name: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      description: ['', Validators.required],
      image: ['', Validators.required],
      weight: ['', [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0)]]
    });

    this.updateForm = this.fb.group({
      cakeId: ['', Validators.required]
    });

    this.updateCakeForm = this.fb.group({
      name: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      description: ['', Validators.required],
      image: [''],
      weight: ['', [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0)]]
    });

    this.deleteForm = this.fb.group({
      cakeId: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCakes();
    this.fetchOrders();
  }

  setActiveSection(section: string) {
    this.activeSection = section;
    if (section === 'view') {
      this.loadCakes(); // Reload cakes to ensure data is fresh
    } else if (section === 'orders') {
      this.fetchOrders();
    }
  }

  onFileSelected(event: any, formType: 'add' | 'update') {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const targetForm = formType === 'add' ? this.addCakeForm : this.updateCakeForm;
      targetForm.patchValue({ image: file.name });
      targetForm.get('image')?.updateValueAndValidity();
    }
  }

  addCake() {
    if (this.addCakeForm.invalid || !this.selectedFile) {
      this.addMessage = 'Please fill in all fields correctly and select an image.';
      this.messageColor = 'red';
      return;
    }

    const formData = new FormData();
    formData.append('name', this.addCakeForm.get('name')?.value);
    formData.append('price', this.addCakeForm.get('price')?.value);
    formData.append('description', this.addCakeForm.get('description')?.value);
    formData.append('image', this.selectedFile);
    formData.append('weight', this.addCakeForm.get('weight')?.value);
    formData.append('category', this.addCakeForm.get('category')?.value);
    formData.append('quantity', this.addCakeForm.get('quantity')?.value);

    this.http.post('http://localhost:3000/cakes', formData, { withCredentials: true }).subscribe({
      next: (result: any) => {
        this.addMessage = result.message;
        this.messageColor = result.success ? 'green' : 'red';
        this.addCakeForm.reset();
        this.selectedFile = null;
        if (this.activeSection === 'view') {
          this.loadCakes();
        }
      },
      error: (err) => {
        this.addMessage = err.error?.message || 'Failed to add Item.';
        this.messageColor = 'red';
      }
    });
  }

  fetchCakeToUpdate() {
    if (this.updateForm.invalid) {
      this.updateMessage = 'Please enter a valid item ID.';
      this.messageColor = 'red';
      return;
    }

    this.http.get<{ success: boolean; cake: Cake; message?: string }>(`http://localhost:3000/cakes/${this.updateForm.get('cakeId')?.value}`, { withCredentials: true }).subscribe({
      next: (result) => {
        if (result.success) {
          this.cakeToUpdate = result.cake;
          this.updateCakeForm.patchValue({
            name: this.cakeToUpdate.name,
            price: this.cakeToUpdate.price,
            description: this.cakeToUpdate.description,
            image: null,
            weight: this.cakeToUpdate.weight,
            category: this.cakeToUpdate.category,
            quantity: this.cakeToUpdate.quantity
          });
          this.updateMessage = 'Item fetched successfully.';
          this.messageColor = 'green';
        } else {
          this.updateMessage = result.message || 'Failed to fetch item.';
          this.messageColor = 'red';
          this.cakeToUpdate = null;
        }
      },
      error: (err) => {
        this.updateMessage = err.error?.message || 'Failed to fetch item.';
        this.messageColor = 'red';
        this.cakeToUpdate = null;
      }
    });
  }

  updateCake() {
    if (this.updateCakeForm.invalid || !this.cakeToUpdate) {
      this.updateMessage = 'Please fill in all fields correctly.';
      this.messageColor = 'red';
      return;
    }

    const formData = new FormData();
    formData.append('name', this.updateCakeForm.get('name')?.value);
    formData.append('price', this.updateCakeForm.get('price')?.value);
    formData.append('description', this.updateCakeForm.get('description')?.value);
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }
    formData.append('weight', this.updateCakeForm.get('weight')?.value);
    formData.append('category', this.updateCakeForm.get('category')?.value);
    formData.append('quantity', this.updateCakeForm.get('quantity')?.value);

    this.http.put(`http://localhost:3000/cakes/${this.cakeToUpdate.id}`, formData, { withCredentials: true }).subscribe({
      next: (result: any) => {
        this.updateMessage = result.message;
        this.messageColor = result.success ? 'green' : 'red';
        this.cakeToUpdate = null;
        this.selectedFile = null;
        this.updateForm.reset();
        this.updateCakeForm.reset();
        if (this.activeSection === 'view') {
          this.loadCakes();
        }
      },
      error: (err) => {
        this.updateMessage = err.error?.message || 'Failed to update item.';
        this.messageColor = 'red';
      }
    });
  }

  deleteCake() {
    if (this.deleteForm.invalid) {
      this.deleteMessage = 'Please enter a valid item ID.';
      this.messageColor = 'red';
      return;
    }

    this.http.delete<{ success: boolean; message: string }>(`http://localhost:3000/cakes/${this.deleteForm.get('cakeId')?.value}`, { withCredentials: true }).subscribe({
      next: (result) => {
        this.deleteMessage = result.message;
        this.messageColor = result.success ? 'green' : 'red';
        this.deleteForm.reset();
        if (this.activeSection === 'view') {
          this.loadCakes();
        }
      },
      error: (err) => {
        this.deleteMessage = err.error?.message || 'Failed to delete item.';
        this.messageColor = 'red';
      }
    });
  }

  loadCakes() {
    this.http.get<Cake[]>('http://localhost:3000/cakes', { withCredentials: true }).subscribe({
      next: (data) => {
        this.cakes = data;
        this.filterCakes(); // Apply filter after loading cakes
      },
      error: (err) => {
        this.cakes = [];
        this.filteredCakes = []; // Reset filtered cakes on error
        console.error('Error loading cakes:', err);
      }
    });
  }

  filterCakes() {
    if (!this.selectedCategory) {
      this.filteredCakes = [...this.cakes]; // Show all cakes if no category is selected
    } else {
      this.filteredCakes = this.cakes.filter(cake => cake.category === this.selectedCategory);
    }
  }

  logout() {
    this.http.get('http://localhost:3000/logout', { withCredentials: true }).subscribe({
      next: () => {
        alert('Logged out successfully!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        alert('Logout failed. Redirecting to home...');
        this.router.navigate(['/']);
        console.error('Logout error:', err);
      }
    });
  }

  fetchOrders() {
    const url = this.selectedStatus
      ? `http://localhost:3000/api/admin/orders?status=${this.selectedStatus}`
      : 'http://localhost:3000/api/admin/orders';
    this.http.get<{ success: boolean; orders: Order[]; message?: string }>(url, { withCredentials: true })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.orders = response.orders.map(order => ({
              ...order,
              status: order.status.toLowerCase() // Normalize status to lowercase
            }));
            this.orderErrorMessage = null;
          } else {
            this.orderErrorMessage = response.message || 'Failed to load orders.';
            this.orders = [];
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error fetching orders:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error
          });
          this.orderErrorMessage = err.status === 403
            ? 'Unauthorized access. Please log in as admin.'
            : `Error fetching orders: ${err.status} - ${err.statusText || 'Unknown error'}. ${err.error?.message || 'Please try again.'}`;
          this.orders = [];
          if (err.status === 403) {
            this.router.navigate(['/login']);
          }
        }
      });
  }

  updateOrderStatus(orderId: string, newStatus: string) {
    const orderIndex = this.orders.findIndex(o => o._id === orderId);
    if (orderIndex === -1) {
      this.orderErrorMessage = 'Order not found.';
      return;
    }

    const order = this.orders[orderIndex];
    const originalStatus = order.status; // Store the original status

    // Normalize statuses to lowercase
    const normalizedNewStatus = newStatus.toLowerCase();

    // Send the update request with the normalized status
    this.http.put<{ success: boolean; message?: string; order?: Order }>(
      `http://localhost:3000/api/admin/order/${orderId}/status`,
      { status: normalizedNewStatus },
      { withCredentials: true }
    ).subscribe({
      next: (updateResponse) => {
        if (updateResponse.success && updateResponse.order) {
          // Update the local orders array with the backend response
          this.orders[orderIndex] = {
            ...updateResponse.order,
            status: updateResponse.order.status.toLowerCase()
          };
          this.orderErrorMessage = null;
        } else {
          // Revert the status on failure
          this.orders[orderIndex].status = originalStatus;
          this.orderErrorMessage = updateResponse.message || 'Failed to update order status.';
        }
      },
      error: (err: HttpErrorResponse) => {
        // Revert the status on error
        this.orders[orderIndex].status = originalStatus;
        console.error('Error updating order status:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error
        });
        this.orderErrorMessage = err.status === 400
          ? 'Invalid status value. Please try again.'
          : err.status === 403
          ? err.error?.message || 'Unauthorized access. Please log in as admin.'
          : `Error updating order status: ${err.status} - ${err.statusText || 'Unknown error'}. ${err.error?.message || 'Please try again.'}`;
        if (err.status === 403) {
          this.router.navigate(['/login']);
        }
        // Refresh orders to ensure sync with backend
        this.fetchOrders();
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  isOrderDelivered(order: Order): boolean {
    return order.status.toLowerCase() === 'delivered';
  }

  isPendingDisabled(order: Order): boolean {
    const status = order.status.toLowerCase();
    return status === 'on process' || status === 'delivered';
  }

  isOnProcessDisabled(order: Order): boolean {
    return order.status.toLowerCase() === 'delivered';
  }

  isDeliveredDisabled(order: Order): boolean {
    return false;
  }

  isStatusChangeDisabled(order: Order): boolean {
    return order.status.toLowerCase() === 'delivered';
  }

  goBack() {
    window.history.back();
  }
}