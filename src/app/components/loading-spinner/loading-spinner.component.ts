import { Component } from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { ContentSkeletonComponent } from "../../loaders/content-skeleton/content-skeleton.component";

@Component({
  selector: 'app-loading-spinner',
  standalone: true,  // 👈 Important
  imports: [MatProgressSpinnerModule, ContentSkeletonComponent],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {}