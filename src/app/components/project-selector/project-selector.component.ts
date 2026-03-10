import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CodeReviewService } from '../../services/code-review.service';
import { GitLabProject } from '../../models/code-review.models';
import { LoadingSpinnerComponent } from "../loading-spinner/loading-spinner.component";
import { CommonModule, JsonPipe } from '@angular/common';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ContentSkeletonComponent } from "../../loaders/content-skeleton/content-skeleton.component";
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  templateUrl: './project-selector.component.html',
  styleUrls: ['./project-selector.component.scss'],
  imports: [
    JsonPipe,
    CommonModule,
    FormsModule,
    LoadingSpinnerComponent,
    MatProgressSpinnerModule,
    ContentSkeletonComponent
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProjectSelectorComponent implements OnInit {

  projects: GitLabProject[] = [];
  filteredProjects: GitLabProject[] = [];

  loading = true;
  error: string | null = null;

  selectedProject: GitLabProject | null = null;

  searchText: string = '';

  @Output() projectSelected = new EventEmitter<GitLabProject>();

  constructor(private codeReviewService: CodeReviewService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.error = null;

    this.codeReviewService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.filteredProjects = [...projects]; // initialize filtered list
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load projects. Please try again.';
        this.loading = false;
        console.error('Error loading projects:', err);
      }
    });
  }

  filterProjects(): void {
    if (!this.searchText) {
      this.filteredProjects = [...this.projects];
      return;
    }

    const search = this.searchText.toLowerCase();

    this.filteredProjects = this.projects.filter(project =>
      project.name?.toLowerCase().includes(search)
    );
  }

  selectProject(project: GitLabProject): void {
    this.selectedProject = project;
    this.projectSelected.emit(project);
  }

  trackById(index: number, project: GitLabProject) {
    return project.id;
  }
}