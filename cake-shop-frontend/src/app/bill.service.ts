import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BillService {
  private bill: any = null;

  setBill(billDetails: any) {
    this.bill = billDetails;
  }

  getBill() {
    return this.bill;
  }

  clearBill() {
    this.bill = null;
  }
}