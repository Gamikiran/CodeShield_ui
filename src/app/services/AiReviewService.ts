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
export interface ImpactedArea {
  area: string;
  impactType: 'BreakingChange' | 'PotentialBug' | 'DataIssue' | 'WrongData' |
              'PerformanceDegradation' | 'DataLoss' | 'TestFailure' |
              'UIBroken' | 'MemoryLeak' | 'WrongBehavior';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  recommendation: string;
}
export interface ParsedAIReview {
  summary: string;
  issues: AIIssue[];
  impactedAreas?: ImpactedArea[];   // ✅ NEW
  optimizedCode?: string;
  overallScore: 'Good' | 'Needs Improvement' | 'Critical';
}

export interface FileReviewResult {
  filePath: string;
  fileType: string;
  diff: string;
  fullContent?: string;        // ✅ add
  aiSuggestion: string;
  parsedReview?: ParsedAIReview | null;
  isDeleted: boolean;
  isNew: boolean;
  isRenamed: boolean;
  isExpanded?: boolean;
  showDiff?: boolean;
  reviewMode?: 'diff' | 'full'; // ✅ add
  tablesMasked?:any;
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
      const cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();
  
      const parsed = JSON.parse(cleaned);
  
      // ✅ If summary itself is a JSON string, extract it
      if (typeof parsed.summary === 'string' && parsed.summary.trim().startsWith('{')) {
        try {
          const inner = JSON.parse(parsed.summary);
          parsed.summary = inner.summary ?? parsed.summary;
        } catch { /* keep as is */ }
      }
  
      // ✅ Filter issues — only keep relevant ones with real method names
      if (parsed.issues?.length) {
        parsed.issues = parsed.issues.filter((issue: any) =>
          issue.message &&
          issue.message.length > 10 &&
          issue.severity !== 'Info'
        );
      }
  
      // ✅ Filter impacted areas — only keep ones with specific method/area names
      if (parsed.impactedAreas?.length) {
        parsed.impactedAreas = parsed.impactedAreas.filter((impact: any) =>
          impact.area &&
          impact.area !== 'Unknown' &&
          impact.area !== 'N/A' &&
          impact.description?.length > 10
        );
      }
  
      return parsed;
    } catch {
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
  
    // ✅ Exact model names from your available list
    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite',
      'gemini-flash-latest',
    ];
  
    let lastError = '';
  
    for (const model of models) {
      try {
        const result = await this.callGeminiModel(model, prompt, apiKey);
        console.log(`✅ Review completed using: ${model}`);
        return result;
      } catch (err: any) {
        lastError = err.message ?? '';
        console.warn(`⚠️ ${model} failed: ${lastError}`);
  
        if (
          lastError.includes('quota') ||
          lastError.includes('RESOURCE_EXHAUSTED') ||
          lastError.includes('not found') ||
          lastError.includes('not supported') ||
          lastError.includes('404')
        ) {
          continue; // try next model
        }
        throw err;
      }
    }
  
    throw new Error(`All Gemini models failed. Last: ${lastError}`);
  }
  
  private async callGeminiModel(model: string, prompt: string, apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.1
        }
      })
    });
  
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(data?.error?.message ?? `${model} failed with ${response.status}`);
    }
  
    if (!data.candidates?.length) {
      throw new Error(`${model} returned no candidates`);
    }
  
    const text = data.candidates[0]?.content?.parts?.[0]?.text ?? '';
    return text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  }
  async listAvailableModels(): Promise<string[]> {
    const apiKey = this.auth.getGeminiKey();
    if (!apiKey) return [];
  
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json();
  
    const models = data.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      ?.map((m: any) => m.name.replace('models/', ''));
  
    console.log('✅ Your available Gemini models:', models);
    return models ?? [];
  }
  // ── Diff-only prompt
  buildPromptDiff(fileType: string, filePath: string, diff: string): string {
    return `File: ${filePath}
  
  ## Changed lines (+ added, - removed):
  \`\`\`
  ${diff}
  \`\`\`
  
  Analyze this diff thoroughly. Report every issue found — syntax, logic, security, performance, structure.
  Do not skip anything.
  
  ${this.getInstructions(fileType, 'diff')}`;
  }
  
  buildPromptFull(fileType: string, filePath: string, diff: string, fullContent: string): string {
    const trimmedFull = fullContent.length > 8000
      ? fullContent.substring(0, 8000) + '\n\n... (file truncated at 8000 chars)'
      : fullContent;
  
    return `File: ${filePath}
  
  ## CHANGED lines (+ added, - removed) — analyze these first:
  \`\`\`
  ${diff}
  \`\`\`
  
  ## FULL file content — use this to find ALL callers and check consistency:
  \`\`\`
  ${trimmedFull}
  \`\`\`
  
  Analyze thoroughly:
  1. Every issue in the changed lines — syntax, logic, hardcoded values, wrong aliases
  2. Every method in the full file that calls or depends on the changed code
  3. Any inconsistency between the change and the rest of the file
  
  Report everything found. Do not skip any category.
  
  ${this.getInstructions(fileType, 'full')}`;
  }
  private getInstructions(fileType: string, mode: 'diff' | 'full'): string {

    const outputRules = `
  STRICT RULES:
  - Summary: max 3 sentences. What changed, what is broken, what is at risk.
  - Issues: report EVERY real problem found — syntax, logic, security, performance, naming, structure.
  - Do NOT skip issues because they seem minor — report everything found in the code.
  - Each issue must mention the SPECIFIC method/variable/column/line involved.
  - impactedAreas: every method/function/procedure that calls or depends on changed code.
  - Use EXACT names from the file — no generic entries.
  - No markdown. No backticks. Pure JSON only.
  `;
  
    const fullModeNote = mode === 'full'
      ? `You have the FULL file content.
  - Scan every line for anything broken, risky, or inconsistent introduced by the diff
  - Find every method/function that calls or depends on the changed code
  - Check variable names, parameter names, aliases, column names for consistency throughout the file
  - Look for anything that will fail at runtime, compile time, or produce wrong results
  `
      : `You have changed lines only. Analyze what is added/removed and flag every issue found.`;
  
    const impactAnalysis = mode === 'full' ? `
  Impact Analysis:
  Scan the FULL file and report:
  - Every method/function that calls the changed method — exact name
  - Every place that passes arguments to the changed method — will args still match?
  - Every variable/alias/column reference that depends on the changed code
  - Any place where removed code is still being referenced
  - Anything that will silently return wrong data without throwing an error
  ` : `
  Impact Analysis:
  Based on the diff:
  - Which callers are likely affected by this change
  - What could break at runtime or compile time
  - Any silent failures that could occur
  `;
  
    const jsonSchema = `
  Return ONLY valid JSON (no markdown, no backticks):
  {
    "summary": "3 sentences: what changed | what is broken | what is at risk",
    "issues": [
      {
        "severity": "Critical|High|Medium|Low",
        "type": "SyntaxError|LogicError|BrokenReference|NamingMismatch|HardcodedValue|NullSafety|Performance|Security|CodeQuality|BestPractice|AliasMismatch|ParameterMismatch|WrongData",
        "lineNumber": "line number from diff or file",
        "message": "specific description — name the exact method/variable/column involved",
        "suggestion": "exact fix with code if possible",
        "codeExample": "corrected snippet or null"
      }
    ],
    "impactedAreas": [
      {
        "area": "ExactMethodName() or ClassName.MethodName() from the file",
        "impactType": "BreakingChange|PotentialBug|DataIssue|WrongData|PerformanceDegradation|DataLoss|TestFailure|UIBroken|MemoryLeak|WrongBehavior|CompilationError|SyntaxError",
        "severity": "Critical|High|Medium|Low",
        "description": "what exactly breaks, with line reference",
        "recommendation": "exact change needed to fix"
      }
    ],
    "optimizedCode": "full corrected version of changed block or null",
    "overallScore": "Good|Needs Improvement|Critical"
  }`;
  
    // ✅ Generic instructions — same depth for all file types
    const genericReview = `
  Analyze ALL of the following — do not skip any category:
  
  CODE ISSUES:
  - Syntax errors (trailing commas, missing brackets, wrong operators)
  - Logic errors (wrong conditions, off-by-one, inverted checks)
  - Hardcoded values that should be parameters or config
  - Removed parameters still referenced inside the method body
  - Variable/parameter renamed but old name still used elsewhere
  - Wrong number of arguments passed to a method after signature change
  - Null reference risks — objects used without null check
  - Missing error handling or exception swallowing
  - Async/await issues — blocking calls, missing await
  - Unused variables or dead code introduced
  
  QUERY ISSUES (if SQL or C# with SQL strings):
  - Trailing comma before FROM/WHERE/GROUP BY/ORDER BY
  - Missing comma between SELECT columns  
  - Hardcoded filter value replacing a dynamic parameter
  - Column alias used in WHERE/ORDER BY not defined in SELECT
  - JOIN condition referencing wrong table alias
  - Parameter removed from method but still used in query string
  - Query returns wrong columns after rename
  - N+1 query patterns
  
  STRUCTURE ISSUES:
  - Method too long after change
  - Breaking change to public/private API
  - Callers passing wrong argument count or type after signature change
  - Return type mismatch
  `;
  
    const typeInstructions: Record<string, string> = {
  
      'CSharp': `You are an expert .NET Core / C# and SQL reviewer.
  ${outputRules}
  ${fullModeNote}
  ${genericReview}
  ${impactAnalysis}
  ${jsonSchema}`,
  
      'SQL': `You are an expert SQL and database reviewer.
  ${outputRules}
  ${fullModeNote}
  ${genericReview}
  ${impactAnalysis}
  ${jsonSchema}`,
  
      'TypeScript': `You are an expert Angular / TypeScript reviewer.
  ${outputRules}
  ${fullModeNote}
  ${genericReview}
  ${impactAnalysis}
  ${jsonSchema}`,
  
      'HTML': `You are an expert Angular HTML template reviewer.
  ${outputRules}
  ${fullModeNote}
  ${genericReview}
  ${impactAnalysis}
  ${jsonSchema}`,
  
      'Other': `You are an expert code reviewer.
  ${outputRules}
  ${fullModeNote}
  ${genericReview}
  ${impactAnalysis}
  ${jsonSchema}`
    };
  
    // ✅ Fallback — any unknown file type gets full generic review
    return typeInstructions[fileType] ?? `You are an expert code reviewer.
  ${outputRules}
  ${fullModeNote}
  ${genericReview}
  ${impactAnalysis}
  ${jsonSchema}`;
  }
}