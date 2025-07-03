import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  selectedCategory: string = 'Cakes';
  selectedItem: any = null;
  quantity: number = 1;
  cartCount: number = 0;
  message: string = '';
  messageColor: string = 'red';
  isAddToCartEnabled: boolean = true;
  filteredCakes: any[] = [];
  allCakes: any[] = []; // Store all cakes to avoid re-filtering issues

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadCakes();
    this.loadCartCount();
  }

  loadCakes() {
    this.http.get('http://localhost:3000/cakes').subscribe({
      next: (data: any) => {
        this.allCakes = data; // Store all cakes
        this.filteredCakes = data; // Initially set filteredCakes to all cakes
        this.showCategory(this.selectedCategory);
      },
      error: (err) => console.error('Error loading cakes:', err)
    });
  }

  showCategory(category: string) {
    this.selectedCategory = category;
    this.filteredCakes = this.allCakes.filter(cake => cake.category === category); // Filter from allCakes
    this.selectedItem = null; // Reset selected item when changing category
  }

  selectItem(item: any) {
    this.selectedItem = { ...item };
    this.quantity = 1;
    this.checkQuantity();
  }

  checkQuantity() {
    this.isAddToCartEnabled = this.quantity > 0 && this.quantity <= (this.selectedItem?.quantity || 0);
    if (!this.isAddToCartEnabled && !this.message) {
      this.message = `Please select a valid quantity .`;
      this.messageColor = 'red';
    } else if (this.isAddToCartEnabled && this.message) {
      this.message = '';
    }
  }

  addToCart() {
    if (!this.isAddToCartEnabled) return;
  
    const item = this.selectedItem;
    this.http.put(`http://localhost:3000/cart/update-quantity/${item.id}`, {
      action: 'add',
      quantity: this.quantity
    }, { withCredentials: true }).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.loadCartCount();
          alert(`${this.quantity} ${item.name}(s) added to cart!`);
          this.selectedItem.quantity -= this.quantity;
          // Update the quantity in allCakes to reflect the change
          const cakeIndex = this.allCakes.findIndex(cake => cake.id === item.id);
          if (cakeIndex !== -1) {
            this.allCakes[cakeIndex].quantity -= this.quantity;
          }
          this.filteredCakes = this.allCakes.filter(cake => cake.category === this.selectedCategory);
          this.checkQuantity();
        } else {
          this.message = result.message || 'Failed to add to cart.';
          this.messageColor = 'red';
        }
      },
      error: (err) => {
        this.message = 'Error adding to cart.';
        this.messageColor = 'red';
        console.error('Add to cart error:', err);
      }
    });
  }

  loadCartCount() {
    this.http.get('http://localhost:3000/api/cart', { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.cartCount = data.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        console.log('Cart count loaded:', this.cartCount);
      },
      error: (err) => console.error('Error loading cart count:', err)
    });
  }

  navigateToProfile() {
    this.router.navigate(['/profile']).then(success => {
      console.log('Navigate to profile:', success ? 'Success' : 'Failed');
    });
  }

  navigateToCart() {
    console.log('Navigating to add-to-cart page...');
    this.router.navigate(['/add-to-cart']).then(success => {
      if (success) {
        console.log('Navigation to add-to-cart successful');
      } else {
        console.log('Navigation to add-to-cart failed');
      }
    });
  }

  navigateToHistory() {
    console.log('Navigating to history page...');
    this.router.navigate(['/history']).then(success => {
      if (success) {
        console.log('Navigation to history successful');
      } else {
        console.log('Navigation to history failed');
      }
    });
  }

  logout() {
    this.http.get('http://localhost:3000/logout', { withCredentials: true }).subscribe({
      next: () => {
        console.log('Logout successful, redirecting to login...');
        this.router.navigate(['/login']);
      },
      error: (err) => console.error('Logout error:', err)
    });
  }
}