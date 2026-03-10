// ai-review-results.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { AiReviewService , ReviewResponse, FileReviewResult } from '../../app/services/AiReviewService';
import { trigger, transition, style, animate } from '@angular/animations';
import { GitlabAuthService } from '../services/GitlabAuthService';
import { firstValueFrom } from 'rxjs';

// ─────────────────────────────────────────────
// Pipe: score CSS class
// ─────────────────────────────────────────────
@Pipe({ name: 'scoreClass', standalone: true })
export class ScoreClassPipe implements PipeTransform {
  transform(score: string): string {
    switch (score) {
      case 'Good': return 'score-good';
      case 'Needs Improvement': return 'score-warn';
      case 'Critical': return 'score-crit';
      default: return '';
    }
  }
}

@Component({
  selector: 'app-ai-review-results',
  standalone: true,
  imports: [CommonModule, ScoreClassPipe],
  templateUrl: './ai-review-results.component.html',
  styleUrl: './ai-review-results.component.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AiReviewResultsComponent implements OnDestroy {
  @Input() projectId?: number;
  @Input() mergeRequest?: any;

  reviewResponse: ReviewResponse | null = null;
  loading = false;
  error: string | null = null;
  loadStep = 0;
  reviewedAt = '';
  private stepInterval?: any;

  constructor(private aiReviewService: AiReviewService,private auth: GitlabAuthService) {}

  ngOnDestroy(): void {
    clearInterval(this.stepInterval);
  }
  ngOnInit(): void {
    this.aiReviewService.listAvailableModels().then(models => {
      // Use the first available model
      if (models.length > 0) {
        console.log('Using model:', models[0]);
      }
    });
  }
  // startReview(): void {
  //   if (!this.projectId || !this.mergeRequest?.iid) return;

  //   this.loading = true;
  //   this.error = null;
  //   this.reviewResponse = null;
  //   this.loadStep = 0;

  //   // Animate loading steps
  //   this.stepInterval = setInterval(() => {
  //     if (this.loadStep < 4) this.loadStep++;
  //   }, 1800);

  //   this.aiReviewService.reviewMergeRequest(this.projectId, this.mergeRequest.iid)
  //     .subscribe({
  //       next: (response) => {
  //         clearInterval(this.stepInterval);
  //         this.loadStep = 5;

  //         // Parse AI suggestion JSON for each file
  //         response.files = response.files.map(file => ({
  //           ...file,
  //           parsedReview: this.aiReviewService.parseAISuggestion(file.aiSuggestion),
  //           isExpanded: true  // expand first file by default
  //         }));

  //         // Collapse all except first
  //         if (response.files.length > 1) {
  //           response.files.forEach((f, i) => f.isExpanded = i === 0);
  //         }

  //         this.reviewResponse = response;
  //         this.reviewedAt = new Date(response.reviewedAt).toLocaleString();
  //         this.loading = false;
  //       },
  //       error: (err) => {
  //         clearInterval(this.stepInterval);
  //         this.error = err?.error?.error || 'Failed to complete AI review. Please try again.';
  //         this.loading = false;
  //       }
  //     });
  // }
  async startReview(): Promise<void> {
    if (!this.projectId || !this.mergeRequest?.iid) return;
  
    this.loading = true;
    this.error = null;
    this.reviewResponse = null;
    this.loadStep = 0;
  
    this.stepInterval = setInterval(() => {
      if (this.loadStep < 4) this.loadStep++;
    }, 1800);
  
    try {
      const diffsResponse: any = await firstValueFrom(
        this.aiReviewService.getDiffs(this.projectId, this.mergeRequest.iid)
      );
  
      if (!diffsResponse?.files?.length) {
        this.error = 'No reviewable files found.';
        this.loading = false;
        clearInterval(this.stepInterval);
        return;
      }
  
      const files: FileReviewResult[] = [];
  
      for (const file of diffsResponse.files) {
  
        // ✅ Trim diff to max 1500 chars to save quota
        const trimmedDiff = this.trimDiff(file.diff, 1500);
        const prompt = this.buildPrompt(file.fileType, file.filePath, trimmedDiff);
  
        try {
          const aiText = await this.aiReviewService.callGemini(prompt);
  
          files.push({
            filePath: file.filePath,
            fileType: file.fileType,
            diff: file.diff,
            aiSuggestion: aiText,
            parsedReview: this.aiReviewService.parseAISuggestion(aiText) ?? undefined,
            isDeleted: file.isDeleted,
            isNew: file.isNew,
            isRenamed: file.isRenamed,
            isExpanded: files.length === 0,
            showDiff: false
          });
  
          // ✅ Small delay between files to avoid rate limiting
          if (diffsResponse.files.indexOf(file) < diffsResponse.files.length - 1) {
            await this.delay(1500);
          }
  
        } catch (fileErr: any) {
          // ✅ Don't fail entire review if one file fails
          files.push({
            filePath: file.filePath,
            fileType: file.fileType,
            diff: file.diff,
            aiSuggestion: '',
            parsedReview: {
              summary: `Review skipped: ${fileErr.message}`,
              issues: [],
              overallScore: 'Needs Improvement'
            },
            isDeleted: file.isDeleted,
            isNew: file.isNew,
            isRenamed: file.isRenamed,
            isExpanded: false,
            showDiff: false
          });
        }
      }
  
      clearInterval(this.stepInterval);
      this.reviewResponse = {
        projectId: this.projectId,
        mergeRequestIid: this.mergeRequest.iid,
        files,
        reviewedAt: new Date().toISOString()
      };
      this.reviewedAt = new Date().toLocaleString();
      this.loading = false;
  
    } catch (err: any) {
      clearInterval(this.stepInterval);
      this.error = err?.message ?? 'Review failed.';
      this.loading = false;
    }
  }
  
  // ✅ Only send changed lines (+) to save tokens
  private trimDiff(diff: string, maxChars: number): string {
    if (!diff) return '';
  
    // Keep only added lines and context
    const importantLines = diff.split('\n')
      .filter(line => line.startsWith('+') || line.startsWith('@@'))
      .join('\n');
  
    const trimmed = importantLines.length > 0 ? importantLines : diff;
    return trimmed.length > maxChars
      ? trimmed.substring(0, maxChars) + '\n... (truncated)'
      : trimmed;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  buildPrompt(fileType: string, filePath: string, diff: string): string {
    const header = `File: ${filePath}\nChanges:\n${diff}\n\n`;
  
    // ✅ Shorter prompts = less tokens used
    const instructions: Record<string, string> = {
      'CSharp': `Review this C# diff. Return ONLY JSON:
  {"summary":"...","issues":[{"severity":"Critical|High|Medium|Low","type":"Security|Performance|CodeQuality","lineNumber":"...","message":"...","suggestion":"..."}],"optimizedCode":null,"overallScore":"Good|Needs Improvement|Critical"}`,
  
      'SQL': `Optimize this SQL diff without changing logic. Return ONLY JSON:
  {"summary":"...","issues":[{"severity":"High|Medium|Low","type":"Performance|Security","lineNumber":"...","message":"...","suggestion":"..."}],"optimizedCode":"optimized SQL or null","overallScore":"Good|Needs Improvement|Critical"}`,
  
      'TypeScript': `Review this TypeScript/Angular diff. Return ONLY JSON:
  {"summary":"...","issues":[{"severity":"High|Medium|Low","type":"TypeSafety|Performance|Angular","lineNumber":"...","message":"...","suggestion":"..."}],"optimizedCode":null,"overallScore":"Good|Needs Improvement|Critical"}`
    };
  
    return header + (instructions[fileType] ?? instructions['CSharp']);
  }
  resetReview(): void {
    this.reviewResponse = null;
    this.error = null;
    this.loadStep = 0;
  }

  toggleFile(file: FileReviewResult): void {
    file.isExpanded = !file.isExpanded;
  }

  getTotalBySeverity(severity: string): number {
    if (!this.reviewResponse) return 0;
    return this.reviewResponse.files.reduce((sum, file) => {
      const issues = file.parsedReview?.issues?.filter(i => i.severity === severity) ?? [];
      return sum + issues.length;
    }, 0);
  }

  getFileIcon(fileType: string): string {
    switch (fileType?.toLowerCase()) {
      case 'sql': return '🗄️';
      case 'csharporquery': case 'csharpwithquery': return '⚙️';
      case 'typescript': return '📘';
      case 'html': return '🖼️';
      case 'config': return '⚙️';
      default: return '📄';
    }
  }

  getFileName(filePath: string): string {
    return filePath.split('/').pop() ?? filePath;
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'Critical': return '🚨';
      case 'High': return '❗';
      case 'Medium': return '⚠️';
      case 'Low': return 'ℹ️';
      default: return '•';
    }
  }

  getScoreEmoji(score: string): string {
    switch (score) {
      case 'Good': return '✅';
      case 'Needs Improvement': return '⚠️';
      case 'Critical': return '🚨';
      default: return '📊';
    }
  }

  formatDiff(diff: string): string {
    return diff
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .split('\n')
      .map(line => {
        if (line.startsWith('+')) return `<span class="diff-add">${line}</span>`;
        if (line.startsWith('-')) return `<span class="diff-rem">${line}</span>`;
        if (line.startsWith('@@')) return `<span class="diff-hunk">${line}</span>`;
        return line;
      })
      .join('\n');
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      // Could show a toast here
    });
  }
}