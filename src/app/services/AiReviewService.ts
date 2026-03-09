// services/ai-review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GitlabAuthService } from './GitlabAuthService';

export interface AIIssue {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  type: string;
  lineNumber?: string;
  line?: string;
  message: string;
  suggestion: string;
  codeExample?: string;
}

export interface ParsedAIReview {
  summary: string;
  issues: AIIssue[];
  optimizedCode?: string;
  overallScore: 'Good' | 'Needs Improvement' | 'Critical';
}

export interface FileReviewResult {
  filePath: string;
  fileType: string;
  diff: string;
  aiSuggestion: string;
  parsedReview?: ParsedAIReview | null;  // ✅ add null
  isDeleted: boolean;
  isNew: boolean;
  isRenamed: boolean;
  isExpanded?: boolean;
  showDiff?: boolean;                    // ✅ add this
}

export interface ReviewResponse {
  projectId: number;
  mergeRequestIid: number;
  files: FileReviewResult[];
  reviewedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AiReviewService {
  private apiUrl = 'https://localhost:7182/api/CodeReviewAI';
  private claudeUrl = 'https://api.anthropic.com/v1/messages';
  constructor(private http: HttpClient,private auth: GitlabAuthService) {}

  reviewMergeRequest(projectId: number, mrIid: number): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(`${this.apiUrl}/review`, {
      projectId,
      mergeRequestIid: mrIid
    });
  }

  parseAISuggestion(rawText: string): ParsedAIReview | null {
    try {
      // Strip markdown code fences if present
      const cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      // Fallback: return raw text as summary
      return {
        summary: rawText,
        issues: [],
        overallScore: 'Needs Improvement'
      };
    }
  }
  getDiffs(projectId: number, mrIid: number): Observable<any> {
    const gitlabToken = this.auth.getGitlabToken();
    const headers = new HttpHeaders({
      'X-GitLab-Token': gitlabToken ?? ''
    });
    return this.http.post(`${this.apiUrl}/diffs`, { projectId, mergeRequestIid: mrIid }, { headers });
  }
  async callClaude(prompt: string): Promise<string> {
    const apiKey = this.auth.getClaudeKey();
    if (!apiKey) throw new Error('Claude API key not set. Please add it in the token setup.');

    const response = await fetch(this.claudeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'  // ✅ required for browser calls
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok)
      throw new Error(`Claude error: ${data?.error?.message ?? response.statusText}`);

    return data.content[0].text;
  }
  async callGemini(prompt: string): Promise<string> {
    const apiKey = this.auth.getGeminiKey();
    if (!apiKey) throw new Error('Gemini API key not set.');
  
    // ✅ Try models in order — each has separate free quota
    const models = [
      'gemini-1.5-flash',        // 1500 req/day free
      'gemini-1.5-flash-8b',     // 1500 req/day free (smaller/faster)
      'gemini-1.0-pro',          // separate quota
    ];
  
    let lastError = '';
  
    for (const model of models) {
      try {
        const result = await this.callGeminiModel(model, prompt, apiKey);
        return result;
      } catch (err: any) {
        lastError = err.message ?? '';
        // If quota exceeded, try next model
        if (lastError.includes('quota') || lastError.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`Model ${model} quota exceeded, trying next...`);
          continue;
        }
        // Any other error — throw immediately
        throw err;
      }
    }
  
    throw new Error(`All models quota exceeded. Try again in 1 minute. ${lastError}`);
  }
  
  private async callGeminiModel(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2048,  // ✅ Reduced to save quota
            temperature: 0.1
          }
        })
      }
    );
  
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(data?.error?.message ?? `${model} error`);
    }
  
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  }
}