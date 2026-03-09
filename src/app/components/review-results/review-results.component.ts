import { Component, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { CodeReviewResult } from '../../models/code-review.models';

@Component({
  selector: 'app-review-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-results.component.html',
  styleUrl: './review-results.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ReviewResultsComponent {
  @Input() results: CodeReviewResult[] = [];
  @Input() mergeRequest?: any;
  @Input() branch?: string;

  filteredIssues: any[] = [];
  activeSeverity: string | null = null;
  activeType: string | null = null;
  types: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['results'] && this.results?.length > 0 && !this.activeSeverity) {
      this.selectSeverity('Total');
    }
  }

  getTypeCounts(): { [key: string]: number } {
    const issues = this.activeSeverity === 'Total'
      ? this.results.flatMap(r => r.issues)
      : this.results.flatMap(r => r.issues.filter(i => i.severity === this.activeSeverity));
    return issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  getIssueCount(severity: string): number {
    return this.results.reduce((count, result) => {
      const matching = severity === 'Total' ? result.issues : result.issues.filter(i => i.severity === severity);
      return count + matching.length;
    }, 0);
  }

  getTotalIssues(): number {
    return ['Critical', 'High', 'Medium', 'Low'].reduce(
      (sum, sev) => sum + this.getIssueCount(sev), 0
    );
  }

  // ✅ Used by the MR banner score card to show risk-based color
  getScoreClass(): string {
    const total = this.getTotalIssues();
    const critical = this.getIssueCount('Critical');
    const high = this.getIssueCount('High');
    if (critical > 0 || high > 2) return 'high-risk';
    if (total > 5) return 'med-risk';
    return 'low-risk';
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#94a3b8';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'Critical': return '🚨';
      case 'High': return '❗';
      case 'Medium': return '⚠️';
      case 'Low': return 'ℹ️';
      default: return '📊';
    }
  }

  selectSeverity(severity: string): void {
    this.activeSeverity = severity;
    this.activeType = null;
    this.updateFilteredIssues();
    const filtered = severity === 'Total'
      ? this.results.flatMap(r => r.issues)
      : this.results.flatMap(r => r.issues.filter(i => i.severity === severity));
    this.types = [...new Set(filtered.map(i => i.type))];
  }

  selectType(type: string): void {
    this.activeType = type === 'Total' ? null : type;
    this.updateFilteredIssues();
  }

  updateFilteredIssues(): void {
    this.filteredIssues = this.results.flatMap(result =>
      result.issues
        .filter(issue =>
          (this.activeSeverity === 'Total' || issue.severity === this.activeSeverity) &&
          (!this.activeType || issue.type === this.activeType)
        )
        .map(issue => ({ ...issue, filePath: result.filePath, changeType: result.changeType }))
    );
  }

  getFilteredIssues(): any[] {
    return this.results.flatMap(result =>
      result.issues
        .filter(issue =>
          (this.activeSeverity === 'Total' || issue.severity === this.activeSeverity) &&
          (!this.activeType || issue.type === this.activeType)
        )
        .map(issue => ({ ...issue, filePath: result.filePath, changeType: result.changeType }))
    );
  }

  getFilteredResults(): CodeReviewResult[] {
    if (!this.activeSeverity || this.activeSeverity === 'Total') return this.results;
    return this.results
      .map(result => ({ ...result, issues: result.issues.filter(i => i.severity === this.activeSeverity) }))
      .filter(result => result.issues.length > 0);
  }

  reset(): void {
    this.activeSeverity = null;
    this.activeType = null;
  }
}