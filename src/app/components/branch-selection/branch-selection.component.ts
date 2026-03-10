import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitLabBranch, GitLabProject } from '../../models/code-review.models';
import { CodeReviewService } from '../../services/code-review.service';
import { ContentSkeletonComponent } from '../../loaders/content-skeleton/content-skeleton.component';
import { FormsModule } from '@angular/forms';

interface GitLabBranchWithStatus extends GitLabBranch {
  status: 'Open' | 'Merged' | 'Closed';
}

@Component({
  selector: 'app-branch-selection',
  standalone: true,
  imports: [CommonModule, ContentSkeletonComponent,FormsModule],
  templateUrl: './branch-selection.component.html',
  styleUrl: './branch-selection.component.scss',
})
export class BranchSelectionComponent implements OnChanges {
  @Input() projectId?: number;
  //@Input() selectedProject?: GitLabProject; // ✅ shows project banner
  @Input() selectedProject?: GitLabProject | null;
  branches: GitLabBranchWithStatus[] = [];
  filteredBranches: GitLabBranchWithStatus[] = [];
  loading = false;
  error: string | null = null;
  searchText: string = '';

  @Output() branchSelected = new EventEmitter<GitLabBranchWithStatus>();
  @Output() goBack = new EventEmitter<void>();

  constructor(private codeReviewService: CodeReviewService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && this.projectId) {
      //this.selectedStatus = 'All';
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
          this.filteredBranches = [...this.branches];
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

  filterBranches(): void {

  if (!this.searchText) {
    this.filteredBranches = [...this.branches];
    return;
  }

  const search = this.searchText.toLowerCase();

  this.filteredBranches = this.branches.filter(b =>
    b.name.toLowerCase().includes(search)
  );
}

  // ✅ Filter change reloads branches
  selectBranch(branch: GitLabBranchWithStatus): void {
    this.branchSelected.emit(branch);
  }

  backToProjects(): void {
    this.goBack.emit();
  }

}