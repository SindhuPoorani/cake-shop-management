import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  // Define the categories array with 6 categories and their images
  categories = [
    { name: 'Cakes', image: '/assets/images/hcake.png' },
    { name: 'Chocolate', image: '/assets/images/hchoco.png' },
    { name: 'Puddings', image: '/assets/images/hpdd.png' },
    { name: 'Desserts', image: '/assets/images/hdessert.png' },
    { name: 'Cupcakes', image: '/assets/images/hcup.png' },
    { name: 'Pastries', image: '/assets/images/hpass.png' }
  ];

  constructor(private router: Router,private location:Location) {}

ngOnInit() {
  this.location.replaceState('/');
}
  // Method to handle category click and redirect to login
  onCategoryClick() {
    this.router.navigate(['/login']);
  }

  // Method to handle Shop Now button click and redirect to login
  onShopNowClick() {
    this.router.navigate(['/login']);
  }
}