import { Component } from '@angular/core';
import { CodeReviewService } from './services/code-review.service';
import { GitLabProject, GitLabBranch, GitLabMergeRequest, CodeReviewResult } from './models/code-review.models';
import { LoadingSpinnerComponent } from "./components/loading-spinner/loading-spinner.component";
import { ProjectSelectorComponent } from "./components/project-selector/project-selector.component";
import { MergeRequestSelectorComponent } from "./components/merge-request-selector/merge-request-selector.component";
import { ReviewResultsComponent } from "./components/review-results/review-results.component";
import { CommonModule, JsonPipe } from '@angular/common';
import { BranchSelectionComponent } from './components/branch-selection/branch-selection.component';
import { ContentSkeletonComponent } from "./loaders/content-skeleton/content-skeleton.component";
import { AiReviewResultsComponent } from "./ai-review-results/ai-review-results.component";
import { TokenSetupComponent } from "./token-setup/token-setup.component";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  host: { ngSkipHydration: 'true' },
  imports: [
    ProjectSelectorComponent,
    MergeRequestSelectorComponent,
    ReviewResultsComponent,
    LoadingSpinnerComponent,
    CommonModule,
    BranchSelectionComponent,
    JsonPipe,
    ContentSkeletonComponent,
    ContentSkeletonComponent,
    AiReviewResultsComponent,
    TokenSetupComponent
]
  //imports: [LoadingSpinnerComponent, ProjectSelectorComponent, MergeRequestSelectorComponent, ReviewResultsComponent]
})
export class AppComponent {
  currentStep: number = 1;
  selectedProject: GitLabProject | null = null;
  selectedBranch: GitLabBranch | null = null;
  selectedMergeRequest: GitLabMergeRequest | null = null;
  selectedMR: any | null = null;
  reviewResults: CodeReviewResult[] = [];
  loading = false;
  error: string | null = null;
projectId: any;

  constructor(private codeReviewService: CodeReviewService) {}

  onProjectSelected(project: GitLabProject): void {
    this.selectedProject = project;
    this.currentStep = 2;
    this.selectedBranch = null;
    this.selectedMergeRequest = null;
    this.reviewResults = [];
  }

  onBranchSelected(branch: GitLabBranch): void {
    this.selectedBranch = branch;
    this.currentStep = 3;
    this.selectedMergeRequest = null;
    this.reviewResults = [];
  }

  onMergeRequestSelected(mergeRequest: GitLabMergeRequest): void {
    this.selectedMergeRequest = mergeRequest;
    this.selectedMR = mergeRequest;
    this.currentStep = 4;
    this.analyzeMergeRequest();
  }

  analyzeMergeRequest(): void {
     if (!this.selectedProject || !this.selectedMergeRequest || !this.selectedBranch) {
    return;
  }

    this.loading = true;
    this.error = null;

    this.codeReviewService.analyzeMergeRequest(
      this.selectedProject.id,
      this.selectedMergeRequest.iid,
      this.selectedBranch.name   // ✅ PASS TARGET BRANCH

    ).subscribe({
      next: results => {
        this.reviewResults = results;
        this.loading = false;
      },
      error: err => {
        this.error = 'Failed to analyze merge request. Please try again.';
        this.loading = false;
        console.error('Error analyzing merge request:', err);
      }
    });
  }

  analyzeBranch(): void {
    if (!this.selectedProject || !this.selectedBranch) return;

    this.loading = true;
    this.error = null;

this.codeReviewService.analyzeBranch(
  this.selectedProject.id,
  this.selectedBranch.name,
  this.selectedBranch.name   // running / target branch
    ).subscribe({
      next: results => {
        this.reviewResults = results;
        this.loading = false;
        this.currentStep = 4;
      },
      error: err => {
        this.error = 'Failed to analyze branch. Please try again.';
        this.loading = false;
        console.error('Error analyzing branch:', err);
      }
    });
  }

  backToProjects(): void {
    this.currentStep = 1;
    this.selectedProject = null;
    this.selectedBranch = null;
    this.selectedMergeRequest = null;
    this.reviewResults = [];
  }

  backToBranches(): void {
    this.currentStep = 2;
    this.selectedBranch = null;
    this.selectedMergeRequest = null;
    this.reviewResults = [];
  }

  backToMergeRequests(): void {
    this.currentStep = 3;
    this.selectedMergeRequest = null;
    this.reviewResults = [];
  }
}