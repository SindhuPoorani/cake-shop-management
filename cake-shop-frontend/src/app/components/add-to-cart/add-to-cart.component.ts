import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BillService } from '../../bill.service';

// Define an interface for the billDetails object
interface BillDetails {
  items: any[];
  totalPrice: number;
  date: string;
  time: string;
  customer: string | null;
  orderId?: string | null; // Optional orderId property
}

@Component({
  selector: 'app-add-to-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-to-cart.component.html',
  styleUrls: ['./add-to-cart.component.css']
})
export class AddToCartComponent implements OnInit {
  cart: any[] = [];
  message: string = '';
  messageColor: string = 'red';
  userId: string | null = null;
  totalPrice: number = 0;
  availableQuantities: { [key: number]: number } = {};
  showBackButton: boolean = false;
  showDetails: boolean[] = []; // Tracks visibility of custom details for each item

  constructor(
    private http: HttpClient,
    private router: Router,
    private billService: BillService
  ) {}

  ngOnInit() {
    this.fetchUserId();
  }

  fetchUserId() {
    this.http.get('http://localhost:3000/api/user', { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.userId = response.username;
        console.log('User ID (username) fetched:', this.userId);
        this.loadCart();
      },
      error: (err) => {
        console.error('Failed to fetch user ID:', err);
        this.message = 'Session expired. Please log in again.';
        this.messageColor = 'red';
        this.http.get('http://localhost:3000/logout', { withCredentials: true }).subscribe({
          next: () => {
            console.log('Session expired, logging out and redirecting to login...');
            this.router.navigate(['/login']);
          },
          error: (logoutErr) => {
            console.error('Logout error during session expiry:', logoutErr);
            this.router.navigate(['/login']);
          }
        });
      }
    });
  }

  loadCart() {
    if (!this.userId) return;
    this.http.get('http://localhost:3000/api/cart', { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.cart = response.items || [];
        // Initialize showDetails array (default to false for all items)
        this.showDetails = new Array(this.cart.length).fill(false);
        this.cart.forEach(item => {
          if (item.category !== 'custom') {
            this.fetchAvailableQuantity(item.id);
          } else {
            // For custom cakes, set an arbitrary max quantity since they don't have inventory
            this.availableQuantities[item.id] = 10; // Arbitrary max for custom cakes
          }
        });
        this.calculateTotal();
        console.log('Loaded cart:', this.cart);
      },
      error: (err) => {
        this.message = 'Failed to load cart. Please try again.';
        this.messageColor = 'red';
        console.error('Error loading cart:', err);
      }
    });
  }

  fetchAvailableQuantity(cakeId: number) {
    this.http.get(`http://localhost:3000/cakes/${cakeId}`).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.availableQuantities[cakeId] = response.cake.quantity;
        } else {
          this.availableQuantities[cakeId] = 0;
          console.warn(`Failed to fetch quantity for cake ${cakeId}:`, response.message);
        }
      },
      error: (err) => {
        console.error(`Error fetching quantity for cake ${cakeId}:`, err);
        this.availableQuantities[cakeId] = 0;
      }
    });
  }

  calculateTotal() {
    this.totalPrice = this.cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    console.log('Total price calculated:', this.totalPrice);
  }

  toggleDetails(index: number) {
    this.showDetails[index] = !this.showDetails[index];
  }

  updateItem(index: number) {
    if (!this.userId) {
      this.message = 'Please log in to modify your cart.';
      this.messageColor = 'red';
      return;
    }

    const item = this.cart[index];
    const newQuantity = item.quantity;
    const oldQuantity = item.originalQuantity || item.quantity;

    // For custom cakes, only check if quantity is at least 1 (no upper limit from inventory)
    if (item.category === 'custom') {
      if (newQuantity < 1) {
        this.message = 'Quantity must be at least 1.';
        this.messageColor = 'red';
        item.quantity = oldQuantity;
        return;
      }
    } else {
      // For regular cakes, check against available inventory
      if (newQuantity < 1 || newQuantity > (this.availableQuantities[item.id] + oldQuantity)) {
        this.message = `Quantity must be between 1 and ${this.availableQuantities[item.id] + oldQuantity}.`;
        this.messageColor = 'red';
        item.quantity = oldQuantity;
        return;
      }
    }

    this.http.put(`http://localhost:3000/api/cart/update-quantity/${item.id}`, {
      action: 'update',
      quantity: newQuantity,
      oldQuantity: oldQuantity,
      category: item.category
    }, { withCredentials: true }).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.cart = result.items;
          this.showDetails = new Array(this.cart.length).fill(false); // Reset toggle states
          if (item.category !== 'custom') {
            this.availableQuantities[item.id] = result.updatedCakeQuantity;
          }
          item.originalQuantity = newQuantity;
          this.calculateTotal();
          this.message = 'Quantity updated successfully.';
          this.messageColor = 'green';
        } else {
          this.message = result.message || 'Failed to update quantity.';
          this.messageColor = 'red';
          item.quantity = oldQuantity;
        }
      },
      error: (err) => {
        this.message = 'Error updating quantity. Please try again.';
        this.messageColor = 'red';
        console.error('Error updating item:', err);
        item.quantity = oldQuantity;
      }
    });
  }

  removeItem(index: number) {
    if (confirm(`Are you sure you want to remove ${this.cart[index].name} from the cart?`)) {
      const item = this.cart[index];
      this.http.put(`http://localhost:3000/api/cart/update-quantity/${item.id}`, {
        action: 'delete',
        quantity: item.quantity,
        category: item.category
      }, { withCredentials: true }).subscribe({
        next: (result: any) => {
          if (result.success) {
            this.cart.splice(index, 1);
            this.showDetails = new Array(this.cart.length).fill(false); // Reset toggle states
            this.calculateTotal();
            this.message = 'Item removed from cart.';
            this.messageColor = 'green';
          } else {
            this.message = result.message || 'Failed to remove item.';
            this.messageColor = 'red';
          }
        },
        error: (err) => {
          this.message = 'Error removing item from cart. Please try again.';
          this.messageColor = 'red';
          console.error('Error removing item:', err);
        }
      });
    }
  }

  generateBill() {
    if (!this.userId) {
      this.message = 'Please log in to generate a bill.';
      this.messageColor = 'red';
      return;
    }

    if (this.cart.length === 0) {
      this.message = 'Cart is empty. Add items before generating a bill.';
      this.messageColor = 'red';
      return;
    }

    const total = this.totalPrice;
    const billDetails: BillDetails = {
      items: this.cart, // Pass the cart items to PaymentComponent
      totalPrice: this.totalPrice,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      customer: this.userId
    };

    // Do NOT clear the cart here; just store the bill details and navigate
    this.message = `Bill Generated! Total: ₹${total}. Redirecting to payment...`;
    this.messageColor = 'green';
    this.showBackButton = false;
    this.showDetails = []; // Reset toggle states
    this.billService.setBill(billDetails);
    this.router.navigate(['/payment']);
  }

  goBackToDashboard() {
    this.router.navigate(['/dashboard']);
    this.showBackButton = false;
    this.message = '';
  }

  goBack() {
    window.history.back();
  }
}