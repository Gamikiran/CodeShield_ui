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
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('500ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
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
  const filteredIssues = this.activeSeverity === 'Total'
    ? this.results.flatMap(r => r.issues)
    : this.results.flatMap(r => r.issues.filter(i => i.severity === this.activeSeverity));

  return filteredIssues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
}

  // Get issue count for each severity
  getIssueCount(severity: string): number {
    return this.results.reduce((count, result) => {
      const matchingIssues = severity === 'Total'
        ? result.issues
        : result.issues.filter(i => i.severity === severity);
      return count + matchingIssues.length;
    }, 0);
  }

  getTotalIssues(): number {
    return ['Critical', 'High', 'Medium', 'Low'].reduce(
      (sum, severity) => sum + this.getIssueCount(severity),
      0
    );
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'Critical': return '#ff4444';
      case 'High': return '#ff8800';
      case 'Medium': return '#ffbb33';
      case 'Low': return '#00C851';
      default: return '#aaaaaa';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'Critical': return '🚨';
      case 'High': return '❗';
      case 'Medium': return '⚠️';
      case 'Low': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  // Called when a severity card is clicked
selectSeverity(severity: string): void {
  this.activeSeverity = severity;
  this.activeType = null;
  this.updateFilteredIssues();
  const filtered = severity === 'Total'
    ? this.results.flatMap(r => r.issues)
    : this.results.flatMap(r => r.issues.filter(i => i.severity === severity));
  const uniqueTypes = [...new Set(filtered.map(i => i.type))];
  this.types = [...uniqueTypes];
}


  // Called when a type card is clicked
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
      .map(issue => ({
        ...issue,
        filePath: result.filePath,
        changeType: result.changeType
      }))
  );
}



  reset(): void {
    this.activeSeverity = null;
    this.activeType = null;
  }

  // Final filtered issues list
getFilteredIssues(): any[] {
  return this.results.flatMap(result =>
    result.issues
      .filter(issue =>
        (this.activeSeverity === 'Total' || issue.severity === this.activeSeverity) &&
        (!this.activeType || issue.type === this.activeType)
      )
      .map(issue => ({
        ...issue,
        filePath: result.filePath,
        changeType: result.changeType
      }))
  );
}


  // Check if there are any filtered results
  getFilteredResults(): CodeReviewResult[] {
    if (!this.activeSeverity || this.activeSeverity === 'Total') return this.results;

    return this.results
      .map(result => ({
        ...result,
        issues: result.issues.filter(i => i.severity === this.activeSeverity),
      }))
      .filter(result => result.issues.length > 0);
  }
}
