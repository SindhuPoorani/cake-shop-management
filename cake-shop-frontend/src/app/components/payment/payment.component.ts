import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import { BillService } from '../../bill.service';

// Define an interface for the bill object
interface BillDetails {
  items: any[];
  totalPrice: number;
  date: string;
  time: string;
  customer: string | null;
  orderId?: string | null;
  status?: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit {
  bill: BillDetails | null = null;
  errorMessage: string | null = null;
  showPaymentModal: boolean = false;
  isPaid: boolean = false;
  selectedPaymentMethod: string = 'card';
  paymentForm: FormGroup;
  qrCodeUrl: string | null = null;
  showDetails: boolean[] = []; // Tracks visibility of custom details for each item

  constructor(
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder,
    private billService: BillService
  ) {
    this.paymentForm = this.fb.group({
      paymentMethod: ['card', Validators.required],
      cardNumber: ['', [Validators.pattern(/^\d{16}$/)]],
      expiryDate: ['', [Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv: ['', [Validators.pattern(/^\d{3}$/)]],
      cardholderName: ['', [Validators.minLength(2)]],
      upiId: ['', [Validators.pattern(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)]]
    });
    console.log('QRCode library:', QRCode);
  }

  ngOnInit() {
    this.bill = this.billService.getBill();

    if (!this.bill || !this.bill.items || this.bill.items.length === 0) {
      this.errorMessage = 'No items in the bill. Please generate a bill first.';
      console.error('Bill data is empty or not provided:', this.bill);
      return;
    }

    // Initialize showDetails array (default to false for all items)
    this.showDetails = new Array(this.bill.items.length).fill(false);

    console.log('Retrieved bill:', this.bill);
  }

  toggleDetails(index: number) {
    this.showDetails[index] = !this.showDetails[index];
  }

  openPaymentModal() {
    this.showPaymentModal = true;
    this.paymentForm.reset({ paymentMethod: 'card' });
    this.selectedPaymentMethod = 'card';
    this.errorMessage = null;
    this.qrCodeUrl = null;

    if (this.paymentForm.get('paymentMethod')?.value === 'upi') {
      this.generateQRCode();
    }
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.paymentForm.reset();
    this.errorMessage = null;
    this.qrCodeUrl = null;
  }

  submitPayment() {
    const method = this.paymentForm.get('paymentMethod')?.value;
    if (method === 'card') {
      this.paymentForm.get('upiId')?.clearValidators();
      this.paymentForm.get('cardNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{16}$/)]);
      this.paymentForm.get('expiryDate')?.setValidators([Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]);
      this.paymentForm.get('cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
      this.paymentForm.get('cardholderName')?.setValidators([Validators.required, Validators.minLength(2)]);
    } else if (method === 'upi') {
      this.paymentForm.get('cardNumber')?.clearValidators();
      this.paymentForm.get('expiryDate')?.clearValidators();
      this.paymentForm.get('cvv')?.clearValidators();
      this.paymentForm.get('cardholderName')?.clearValidators();
      this.paymentForm.get('upiId')?.setValidators([Validators.required, Validators.pattern(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)]);
    }
    this.paymentForm.get('cardNumber')?.updateValueAndValidity();
    this.paymentForm.get('expiryDate')?.updateValueAndValidity();
    this.paymentForm.get('cvv')?.updateValueAndValidity();
    this.paymentForm.get('cardholderName')?.updateValueAndValidity();
    this.paymentForm.get('upiId')?.updateValueAndValidity();

    if (this.paymentForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    // Step 1: Save the cart items to History
    console.log('Submitting order to /api/save-order with bill:', this.bill);
    this.http.post<{ success: boolean, message: string, orderId: string | null }>('http://localhost:3000/api/save-order', this.bill, { withCredentials: true }).subscribe({
      next: (response) => {
        console.log('Response from /api/save-order:', response);
        if (response.success && response.orderId) {
          // Update the bill with the orderId
          if (this.bill) {
            this.bill.orderId = response.orderId;
            console.log('Updated bill with orderId:', this.bill);
          }

          // Step 2: Update the order status to 'delivered'
          console.log('Updating order status for orderId:', response.orderId);
          this.http.put(`http://localhost:3000/api/order/${response.orderId}/status`, { status: 'delivered' }, { withCredentials: true }).subscribe({
            next: (statusResponse: any) => {
              console.log('Response from /api/order/:id/status:', statusResponse);
              if (statusResponse.success) {
                console.log('Order status updated to delivered:', statusResponse.order);

                // Step 3: Clear the cart after successful payment and status update
                console.log('Clearing cart by calling /api/cart/clear');
                this.http.post<{ success: boolean, message: string, orderId: string | null }>('http://localhost:3000/api/cart/clear', {}, { withCredentials: true }).subscribe({
                  next: (clearResponse) => {
                    console.log('Response from /api/cart/clear:', clearResponse);
                    if (clearResponse.success) {
                      this.isPaid = true;
                      this.showPaymentModal = false;
                      this.errorMessage = null;
                      if (this.bill) {
                        this.bill.status = 'delivered'; // Update local bill status for PDF
                      }
                      this.errorMessage = 'Payment successful! You can now download your bill.';
                      console.log('Payment submitted successfully:', this.paymentForm.value);
                      this.billService.clearBill(); // Clear the bill after payment
                    } else {
                      this.errorMessage = clearResponse.message || 'Failed to clear cart after payment.';
                    }
                  },
                  error: (clearErr) => {
                    console.error('Error clearing cart:', clearErr);
                    this.errorMessage = 'Payment processed, but failed to clear cart. Please contact support.';
                  }
                });
              } else {
                this.errorMessage = statusResponse.message || 'Failed to update order status.';
              }
            },
            error: (statusErr) => {
              console.error('Error updating order status:', statusErr);
              this.errorMessage = 'Payment processed, but failed to update order status. Please contact support.';
            }
          });
        } else {
          this.errorMessage = response.message || 'Failed to save order.';
        }
      },
      error: (err) => {
        console.error('Error saving order:', err);
        this.errorMessage = 'Failed to save order. Please try again.';
      }
    });
  }

  generateQRCode() {
    if (!this.bill || !this.bill.totalPrice) {
      this.errorMessage = 'Cannot generate QR code: No bill or total price available.';
      console.error('Bill or totalPrice is null:', this.bill);
      return;
    }

    try {
      const upiUrl = `upi://pay?pa=user@bank&pn=FrostLand&am=${(this.bill.totalPrice || 0).toFixed(2)}&cu=INR`;
      QRCode.toDataURL(upiUrl, { width: 150, margin: 1 }, (err, url) => {
        if (err) {
          console.error('Error generating QR code:', err);
          this.errorMessage = 'Failed to generate QR code. Please try again.';
          this.qrCodeUrl = null;
          return;
        }
        this.qrCodeUrl = url;
        console.log('QR code generated:', url);
      });
    } catch (error) {
      console.error('QR code generation failed:', error);
      this.errorMessage = 'Failed to generate QR code. Please try again.';
      this.qrCodeUrl = null;
    }
  }

  updatePaymentMethod(method: string) {
    this.selectedPaymentMethod = method;
    this.paymentForm.patchValue({ paymentMethod: method });
    if (method === 'upi') {
      this.generateQRCode();
    } else {
      this.qrCodeUrl = null;
    }
  }

  downloadBillAsPDF() {
    if (!this.bill) {
      this.errorMessage = 'Cannot generate PDF: No bill data available.';
      console.error('Cannot generate PDF: Bill is null');
      return;
    }

    try {
      const doc = new jsPDF();
      let yOffset = 10;

      doc.setFont('Helvetica', 'normal');

      doc.setFontSize(24);
      doc.setTextColor(0, 102, 204);
      doc.text('FrostLand Cake Shop', 105, yOffset, { align: 'center' });
      yOffset += 10;
      doc.setFontSize(18);
      doc.text('Invoice', 105, yOffset, { align: 'center' });
      yOffset += 15;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('123 Sweet Street, Bakery Town, India', 105, yOffset, { align: 'center' });
      yOffset += 5;
      doc.text('Phone: +91 98765 43210 | Email: frostland@cakeshop.com', 105, yOffset, { align: 'center' });
      yOffset += 10;

      doc.setFontSize(12);
      doc.text(`Customer: ${this.bill.customer || 'Guest'}`, 10, yOffset);
      doc.text(`Order ID: ${this.bill.orderId || 'N/A'}`, 150, yOffset);
      yOffset += 10;

      doc.setDrawColor(255, 105, 180);
      doc.setLineWidth(0.5);
      doc.line(10, yOffset, 200, yOffset);
      yOffset += 10;

      doc.setFontSize(12);
      doc.text(`Date: ${this.bill.date || 'N/A'}`, 10, yOffset);
      doc.setTextColor(128, 0, 128);
      doc.text(`Time: ${this.bill.time || 'N/A'}`, 150, yOffset);
      yOffset += 5;
      doc.setTextColor(0, 0, 0);
      doc.text(`Status: ${this.bill.status || 'N/A'}`, 10, yOffset);
      yOffset += 5;

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Items Purchased:', 10, yOffset);
      yOffset += 8;

      doc.setFontSize(11);
      doc.setFillColor(255, 182, 193);
      doc.rect(10, yOffset, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('#', 12, yOffset + 6);
      doc.text('Item Name', 25, yOffset + 6);
      doc.text('Category', 70, yOffset + 6);
      doc.text('Quantity', 110, yOffset + 6);
      doc.text('Price (₹)', 140, yOffset + 6);
      doc.text('Total (₹)', 170, yOffset + 6);
      yOffset += 8;

      if (this.bill.items && Array.isArray(this.bill.items)) {
        this.bill.items.forEach((item: any, index: number) => {
          const rowY = yOffset + 6;
          doc.setFillColor(240, 240, 240);
          doc.rect(10, yOffset, 190, 8, 'F');
          doc.setTextColor(0, 0, 0);
          doc.text(`${index + 1}`, 12, rowY);
          doc.text(item.name || 'N/A', 25, rowY);
          doc.text(item.category || 'N/A', 70, rowY);
          doc.text(`${item.quantity || 0}`, 112, rowY);
          doc.text(`₹${(item.price || 0).toFixed(2)}`, 142, rowY);
          doc.text(`₹${((item.price || 0) * (item.quantity || 0)).toFixed(2)}`, 172, rowY);
          yOffset += 8;

          // Add custom details for custom cakes
          if (item.category === 'custom' && item.customCakeId) {
            yOffset += 2;
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Custom Details:', 15, yOffset + 4);
            yOffset += 6;
            const details = [
              `Flavor: ${item.customCakeId.customDetails.flavor}`,
              `Size: ${item.customCakeId.customDetails.size}`,
              `Frosting: ${item.customCakeId.customDetails.frostingType} (${item.customCakeId.customDetails.frostingColor})`,
              `Toppings: ${item.customCakeId.customDetails.toppings.join(', ') || 'None'}`,
              `Filling: ${item.customCakeId.customDetails.filling || 'None'}`,
              `Shape: ${item.customCakeId.customDetails.shape}`,
              `Decorative Elements: ${item.customCakeId.customDetails.decorativeElements.join(', ') || 'None'}`,
              `Message: ${item.customCakeId.customDetails.message || 'None'}`,
              `Occasion: ${item.customCakeId.customDetails.occasion === 'Other' ? item.customCakeId.customDetails.customOccasion : item.customCakeId.customDetails.occasion}`,
              `Dietary Preferences: ${item.customCakeId.customDetails.dietaryPreferences.join(', ') || 'None'}`
            ];
            details.forEach(detail => {
              doc.text(detail, 15, yOffset + 4);
              yOffset += 5;
            });
            yOffset += 2;
          }
        });
      } else {
        console.warn('No items found in bill');
        doc.text('No items available', 10, yOffset + 6);
        yOffset += 8;
      }

      yOffset += 5;
      doc.setFillColor(220, 220, 220);
      doc.rect(10, yOffset, 190, 8, 'F');
      doc.setTextColor(0, 102, 0);
      doc.text('Total:', 140, yOffset + 6);
      doc.text(`₹${(this.bill.totalPrice || 0).toFixed(2)}`, 172, yOffset + 6);
      yOffset += 15;

      doc.setFontSize(10);
      doc.setTextColor(139, 69, 19);
      doc.text('Thank you for shopping at FrostLand Cake Shop!', 105, yOffset, { align: 'center' });
      yOffset += 5;
      doc.text('Visit us again!', 105, yOffset, { align: 'center' });

      doc.save(`FrostLand_Invoice_${(this.bill.date || 'unknown').replace(/\//g, '-')}_${this.bill.orderId || 'unknown'}.pdf`);
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.errorMessage = 'Failed to generate PDF. Please try again.';
    }
  }

  goShopping() {
    this.billService.clearBill();
    this.bill = null;
    this.router.navigate(['/dashboard']);
  }
}