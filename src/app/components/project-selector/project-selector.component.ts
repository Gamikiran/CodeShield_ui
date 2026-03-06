import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CodeReviewService } from '../../services/code-review.service';
import { GitLabProject } from '../../models/code-review.models';
import { LoadingSpinnerComponent } from "../loading-spinner/loading-spinner.component";
import { CommonModule, JsonPipe } from '@angular/common';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ContentSkeletonComponent } from "../../loaders/content-skeleton/content-skeleton.component";
import { animate, style, transition, trigger } from '@angular/animations';


@Component({
  selector: 'app-project-selector',
  standalone: true, // ✅ Make it standalone
  templateUrl: './project-selector.component.html',
  styleUrls: ['./project-selector.component.scss'],
  
  imports: [JsonPipe, CommonModule, LoadingSpinnerComponent, MatProgressSpinnerModule, ContentSkeletonComponent,ContentSkeletonComponent],animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ])
    ])
  ]
})
export class ProjectSelectorComponent implements OnInit {
  
  projects: GitLabProject[] = [];
  loading = true;
  error: string | null = null;
  @Output() projectSelected = new EventEmitter<GitLabProject>();
  constructor(private codeReviewService: CodeReviewService) { }
  
ngOnInit(): void {
    this.loadProjects();
  }

loadProjects(): void {
    this.loading = true;
    this.error = null;

    this.codeReviewService.getProjects().subscribe({
      next: (projects) => {
        console.log('✅ Received projects:', projects);
        this.projects = projects;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading projects:', err);
        this.error = 'Failed to load projects. Please try again.';
        this.loading = false;
      }
    });
  }

selectedProject: GitLabProject | null = null;
 selectProject(project: GitLabProject): void {
  this.selectedProject = project;
  this.projectSelected.emit(project);
}
trackById(index: number, project: any) {
  return project.id;
}

}
