import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-custom-cake-builder',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './custom-cake-builder.component.html',
  styleUrls: ['./custom-cake-builder.component.css']
})
export class CustomCakeBuilderComponent {
  customDetails = {
    flavor: '',
    size: '',
    frostingType: '',
    frostingColor: '',
    toppings: [] as string[],
    filling: '',
    shape: '',
    decorativeElements: [] as string[],
    message: '',
    occasion: '',
    customOccasion: '',
    dietaryPreferences: [] as string[]
  };
  price = 500; // Initial price
  quantity = 1;
  errorMessage: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  // Getter to format price safely
  get formattedPrice(): string {
    return this.price ? this.price.toFixed(2) : '0.00';
  }

  // Calculate price based on selections
  calculatePrice() {
    let basePrice = 500; // Default base price

    // Adjust price based on size
    switch (this.customDetails.size) {
      case '500g':
        basePrice = 500;
        break;
      case '1kg':
        basePrice = 900;
        break;
      case '2kg':
        basePrice = 1600;
        break;
    }

    // Add costs for toppings (e.g., ₹50 per topping)
    const toppingCost = this.customDetails.toppings.length * 50;

    // Add costs for dietary preferences (e.g., ₹100 for each)
    const dietaryCost = this.customDetails.dietaryPreferences.length * 100;

    // Add costs for decorative elements (e.g., ₹75 per element)
    const decorativeCost = this.customDetails.decorativeElements.length * 75;

    // Add cost for filling (e.g., ₹100 if selected)
    const fillingCost = this.customDetails.filling ? 100 : 0;

    // Total price
    this.price = (basePrice + toppingCost + dietaryCost + decorativeCost + fillingCost) * this.quantity;
  }

  addToCart() {
    // Recalculate price before adding to cart
    this.calculatePrice();

    // Validate form fields
    if (this.quantity < 1 || this.quantity > 10) {
      this.errorMessage = 'Quantity must be between 1 and 10.';
      return;
    }

    if (
      !this.customDetails.flavor ||
      !this.customDetails.size ||
      !this.customDetails.frostingType ||
      !this.customDetails.frostingColor ||
      !this.customDetails.shape ||
      !this.customDetails.occasion ||
      (this.customDetails.occasion === 'Other' && !this.customDetails.customOccasion)
    ) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    // Check session status
    this.http.get('http://localhost:3000/api/user', { withCredentials: true }).subscribe({
      next: (response: any) => {
        console.log('Session check response:', response);
        if (!response.success) {
          this.errorMessage = 'Please log in to add items to the cart.';
          this.router.navigate(['/login']);
          return;
        }

        // Proceed with adding to cart
        const customCake = {
          id: Date.now(), // Temporary ID for the request
          name: 'Custom Cake',
          quantity: this.quantity,
          price: this.price,
          category: 'custom',
          customCakeId: { customDetails: this.customDetails }
        };

        const payload = {
          action: 'add',
          quantity: this.quantity,
          customDetails: this.customDetails,
          price: this.price // Include price in payload
        };

        console.log('Sending PUT request to:', `http://localhost:3000/cart/update-quantity/${customCake.id}`);
        console.log('Payload:', payload);

        this.http
          .put(`http://localhost:3000/cart/update-quantity/${customCake.id}`, payload, { withCredentials: true })
          .subscribe({
            next: (response: any) => {
              console.log('Add to cart response:', response);
              if (response.success) {
                this.router.navigate(['/add-to-cart']);
              } else {
                this.errorMessage = response.message || 'Failed to add custom cake to cart.';
              }
            },
            error: (err) => {
              console.error('Error adding custom cake to cart:', err);
              if (err.status === 401) {
                this.errorMessage = 'Session expired. Please log in again.';
                this.router.navigate(['/login']);
              } else if (err.status === 400) {
                this.errorMessage = err.error.message || 'Invalid request. Please check your inputs.';
              } else if (err.status === 404) {
                this.errorMessage = 'Cart endpoint not found. Contact support.';
              } else if (err.status === 0) {
                this.errorMessage = 'Cannot connect to the server. Please check if the backend is running.';
              } else {
                this.errorMessage = `Error adding custom cake to cart: ${err.error?.message || err.message || 'Unknown error'}`;
              }
            }
          });
      },
      error: (err) => {
        console.error('Session check failed:', err);
        this.errorMessage = 'Please log in to add items to the cart.';
        this.router.navigate(['/login']);
      }
    });
  }

  updateArrayField(field: 'toppings' | 'decorativeElements' | 'dietaryPreferences', value: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const arrayField = this.customDetails[field];
    if (checked) {
      arrayField.push(value);
    } else {
      this.customDetails[field] = arrayField.filter((item) => item !== value);
    }
    this.calculatePrice();
  }

  clearError() {
    this.errorMessage = null;
  }
}