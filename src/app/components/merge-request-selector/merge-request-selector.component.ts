import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { GitLabMergeRequest, GitLabProject } from '../../models/code-review.models';
import { CodeReviewService } from '../../services/code-review.service';
import { LoadingSpinnerComponent } from "../loading-spinner/loading-spinner.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-merge-request-selector',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './merge-request-selector.component.html',
  styleUrl: './merge-request-selector.component.scss'
})
export class MergeRequestSelectorComponent implements OnChanges {

  @Input() projectId?: number;
  @Input() branchName?: string;
  @Input() selectedProject?: GitLabProject | null;

  mergeRequests: GitLabMergeRequest[] = [];
  loading = false;
  error: string | null = null;

  @Output() mergeRequestSelected = new EventEmitter<GitLabMergeRequest>();
  @Output() goBack = new EventEmitter<void>();

  constructor(private codeReviewService: CodeReviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.projectId && this.branchName) {
      this.loadMergeRequests();
    }
  }

  loadMergeRequests(): void {
    this.loading = true;
    this.error = null;
    this.mergeRequests = [];

    if (this.projectId != null && this.branchName) {
      this.codeReviewService.getMergeRequests(this.projectId, this.branchName).subscribe({
        next: mergeRequests => {
          this.mergeRequests = mergeRequests;
          this.loading = false;
        },
        error: err => {
          this.error = 'Failed to load merge requests. Please try again.';
          this.loading = false;
          console.error('Error loading merge requests:', err);
        }
      });
    } else {
      this.error = 'Project ID or branch name is not defined.';
      this.loading = false;
    }
  }

  selectMergeRequest(mr: GitLabMergeRequest): void {
    this.mergeRequestSelected.emit(mr);
  }

  backToBranches(): void {
    this.goBack.emit();
  }
}