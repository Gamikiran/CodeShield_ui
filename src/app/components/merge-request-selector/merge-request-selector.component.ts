import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { GitLabMergeRequest, GitLabProject } from '../../models/code-review.models';
import { CodeReviewService } from '../../services/code-review.service';
import { LoadingSpinnerComponent } from "../loading-spinner/loading-spinner.component";
import { CommonModule } from '@angular/common';

export type MergeRequestFilter = 'all' | 'opened' | 'merged' | 'closed';

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

  /** Full unfiltered list from the API — never mutated after load */
  private allMergeRequests: GitLabMergeRequest[] = [];

  /** Filtered slice shown in the template */
  mergeRequests: GitLabMergeRequest[] = [];

  loading = false;
  error: string | null = null;
  activeFilter: MergeRequestFilter = 'all';

readonly filters: { label: string; value: MergeRequestFilter; count: number }[] = [
  { label: 'All', value: 'all', count: 0 },
  { label: 'Opened', value: 'opened', count: 0 },
  { label: 'Merged', value: 'merged', count: 0 },
  { label: 'Closed', value: 'closed', count: 0 }
];

  @Output() mergeRequestSelected = new EventEmitter<GitLabMergeRequest>();
  @Output() goBack = new EventEmitter<void>();

  constructor(private codeReviewService: CodeReviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.projectId && this.branchName) {
      this.loadMergeRequests();
    }
  }

  /** Switch the active tab and re-apply the filter — no API call */
  setFilter(filter: MergeRequestFilter): void {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    this.applyFilter();
  }

  /** Slice allMergeRequests based on activeFilter */
  private applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.mergeRequests = [...this.allMergeRequests];
    } else {
      this.mergeRequests = this.allMergeRequests.filter(mr => mr.state === this.activeFilter);
    }
  }
private updateFilterCounts(): void {
  this.filters.forEach(f => {
    if (f.value === 'all') {
      f.count = this.allMergeRequests.length;
    } else {
      f.count = this.allMergeRequests.filter(mr => mr.state === f.value).length;
    }
  });
}
  /** Called once per project+branch combination */
  loadMergeRequests(): void {
    this.loading = true;
    this.error = null;
    this.allMergeRequests = [];
    this.mergeRequests = [];
    this.activeFilter = 'all';

    if (this.projectId != null && this.branchName) {
      this.codeReviewService.getMergeRequests(this.projectId, this.branchName).subscribe({
        next: mergeRequests => {
          this.allMergeRequests = mergeRequests;   
          this.updateFilterCounts(); 
          this.applyFilter();
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