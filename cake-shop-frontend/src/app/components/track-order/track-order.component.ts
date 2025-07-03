import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Order {
  _id: string;
  username: string;
  date: string;
  time: string;
  totalPrice: number;
  items: { id: number; name: string; quantity: number; price: number; category: string; customCakeId?: any }[];
  status: string;
}

@Component({
  selector: 'app-track-order',
  templateUrl: './track-order.component.html',
  styleUrls: ['./track-order.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class TrackOrderComponent implements OnInit {
  orders: Order[] = [];
  errorMessage: string | null = null;
  isLoading: boolean = true;
  // Track toggle state for custom details: { orderId: { itemIndex: boolean } }
  showDetails: { [orderId: string]: { [itemIndex: number]: boolean } } = {};

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.fetchOrders();
  }

  fetchOrders() {
    this.isLoading = true;
    this.http.get<{ success: boolean; orders: Order[]; message?: string }>('http://localhost:3000/api/track-orders', { withCredentials: true })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.orders = response.orders || [];
            this.errorMessage = null;
            // Initialize showDetails for each order and its items
            this.showDetails = {};
            this.orders.forEach(order => {
              this.showDetails[order._id] = {};
              order.items.forEach((_, index) => {
                this.showDetails[order._id][index] = false; // Default to hidden
              });
            });
            if (this.orders.length === 0) {
              this.errorMessage = 'No pending or in-process orders found.';
            }
          } else {
            this.errorMessage = response.message || 'Failed to load orders. Please try again.';
            this.orders = [];
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error fetching orders:', err);
          this.errorMessage = err.status === 401
            ? 'Please log in to view your orders.'
            : `Error fetching orders: ${err.statusText || 'Unknown error'}. Please try again.`;
          this.orders = [];
          if (err.status === 401) {
            this.router.navigate(['/login']);
          }
        }
      });
  }

  toggleDetails(orderId: string, itemIndex: number) {
    if (!this.showDetails[orderId]) {
      this.showDetails[orderId] = {};
    }
    this.showDetails[orderId][itemIndex] = !this.showDetails[orderId][itemIndex];
  }

  getShowDetails(orderId: string, itemIndex: number): boolean {
    return this.showDetails[orderId]?.[itemIndex] || false;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}