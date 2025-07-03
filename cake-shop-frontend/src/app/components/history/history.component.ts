import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface HistoryEntry {
  _id: string;
  username: string;
  date: string;
  time: string;
  totalPrice: number;
  items: { id: number; name: string; quantity: number; price: number; category: string; customCakeId?: any }[];
  status: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  history: HistoryEntry[] = [];
  message: string | null = null;
  messageColor: string = 'red';
  isLoading: boolean = true;
  // Track toggle state for custom details: { entryId: { itemIndex: boolean } }
  showDetails: { [entryId: string]: { [itemIndex: number]: boolean } } = {};

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.isLoading = true;
    this.history = [];
    this.message = null;

    this.http.get<{ success: boolean; history: HistoryEntry[]; message?: string }>('http://localhost:3000/api/history', { withCredentials: true })
      .subscribe({
        next: (response) => {
          console.log('History response:', response);
          this.isLoading = false;
          if (response.success) {
            this.history = response.history || [];
            // Initialize showDetails for each entry and its items
            this.showDetails = {};
            this.history.forEach(entry => {
              this.showDetails[entry._id] = {};
              entry.items.forEach((_, index) => {
                this.showDetails[entry._id][index] = false; // Default to hidden
              });
            });
            if (this.history.length === 0) {
              this.message = null;
              this.messageColor = 'red';
            }
          } else {
            this.message = response.message || 'Failed to load history.';
            this.messageColor = 'red';
            console.error('History fetch failed:', response.message);
          }
        },
        error: (err) => {
          console.error('HTTP error loading history:', err);
          this.isLoading = false;
          this.history = [];
          this.message = err.status === 401
            ? 'Please log in to view history.'
            : `Error loading history: ${err.status} - ${err.statusText || 'Check server connection.'}`;
          this.messageColor = 'red';
          if (err.status === 401) {
            this.router.navigate(['/login']);
          }
        }
      });
  }

  toggleDetails(entryId: string, itemIndex: number) {
    if (!this.showDetails[entryId]) {
      this.showDetails[entryId] = {};
    }
    this.showDetails[entryId][itemIndex] = !this.showDetails[entryId][itemIndex];
  }

  getShowDetails(entryId: string, itemIndex: number): boolean {
    return this.showDetails[entryId]?.[itemIndex] || false;
  }

  clearMessage() {
    this.message = null;
    this.messageColor = 'red';
  }

  goBackToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}