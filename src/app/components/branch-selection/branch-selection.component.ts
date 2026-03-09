import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitLabBranch, GitLabProject } from '../../models/code-review.models';
import { CodeReviewService } from '../../services/code-review.service';
import { ContentSkeletonComponent } from '../../loaders/content-skeleton/content-skeleton.component';

interface GitLabBranchWithStatus extends GitLabBranch {
  status: 'Open' | 'Merged' | 'Closed';
}

@Component({
  selector: 'app-branch-selection',
  standalone: true,
  imports: [CommonModule, ContentSkeletonComponent],
  templateUrl: './branch-selection.component.html',
  styleUrl: './branch-selection.component.scss',
})
export class BranchSelectionComponent implements OnChanges {
  @Input() projectId?: number;
  //@Input() selectedProject?: GitLabProject; // ✅ shows project banner
  @Input() selectedProject?: GitLabProject | null;
  branches: GitLabBranchWithStatus[] = [];
  filteredBranches: GitLabBranchWithStatus[] = [];
  statuses = ['All', 'Open', 'Merged', 'Closed'];
  selectedStatus = 'All';
  loading = false;
  error: string | null = null;

  @Output() branchSelected = new EventEmitter<GitLabBranchWithStatus>();
  @Output() goBack = new EventEmitter<void>();

  constructor(private codeReviewService: CodeReviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && this.projectId) {
      this.selectedStatus = 'All';
      this.loadBranches();
    }
  }

  loadBranches(): void {
    this.loading = true;
    this.error = null;
    this.branches = [];
    this.filteredBranches = [];

    if (this.projectId != null) {
      this.codeReviewService.getBranches(this.projectId).subscribe({
        next: (apiBranches) => {
          this.branches = apiBranches.map(branch => ({
            name: branch.branchName,
            status: branch.status,
            commit: { author_name: branch.author_name }
          }));
          this.applyFilter();
          this.loading = false;
        },
        error: err => {
          this.error = 'Failed to load branches.';
          this.loading = false;
        }
      });
    } else {
      this.error = 'Project ID is not defined.';
      this.loading = false;
    }
  }

  applyFilter(): void {
    this.filteredBranches = this.selectedStatus === 'All'
      ? this.branches
      : this.branches.filter(b => b.status === this.selectedStatus);
  }

  // ✅ Filter change reloads branches
  onStatusChange(status: string): void {
    if (this.selectedStatus === status) return;
    this.selectedStatus = status;
    this.loadBranches();
  }

  selectBranch(branch: GitLabBranchWithStatus): void {
    this.branchSelected.emit(branch);
  }

  backToProjects(): void {
    this.goBack.emit();
  }
  getCountByStatus(status: string): number {
    return this.branches.filter(b => b.status === status).length;
  }
}