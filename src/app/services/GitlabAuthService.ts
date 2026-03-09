// services/gitlab-auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GitlabAuthService {

  private readonly GITLAB_KEY = 'gl_token';
  private readonly CLAUDE_KEY  = 'claude_key';

  //private readonly GITLAB_KEY = 'gl_token';
  private readonly GEMINI_KEY = 'gemini_key';
  private _gitlabToken$ = new BehaviorSubject<string | null>(this.getGitlabToken());
  private _claudeKey$   = new BehaviorSubject<string | null>(this.getClaudeKey());

  // GitLab
//   getGitlabToken(): string | null { return localStorage.getItem(this.GITLAB_KEY); }
//   setGitlabToken(t: string) { localStorage.setItem(this.GITLAB_KEY, t); this._gitlabToken$.next(t); }
//   clearGitlabToken() { localStorage.removeItem(this.GITLAB_KEY); this._gitlabToken$.next(null); }
//   hasGitlabToken(): boolean { return !!localStorage.getItem(this.GITLAB_KEY); }

  // Claude
  getClaudeKey(): string | null { return localStorage.getItem(this.CLAUDE_KEY); }
  setClaudeKey(k: string) { localStorage.setItem(this.CLAUDE_KEY, k); this._claudeKey$.next(k); }
  clearClaudeKey() { localStorage.removeItem(this.CLAUDE_KEY); this._claudeKey$.next(null); }
  hasClaudeKey(): boolean { return !!localStorage.getItem(this.CLAUDE_KEY); }
  getGitlabToken(): string | null { return localStorage.getItem(this.GITLAB_KEY); }
  setGitlabToken(t: string) { localStorage.setItem(this.GITLAB_KEY, t); }
  clearGitlabToken() { localStorage.removeItem(this.GITLAB_KEY); }
  hasGitlabToken(): boolean { return !!localStorage.getItem(this.GITLAB_KEY); }

  getGeminiKey(): string | null { return localStorage.getItem(this.GEMINI_KEY); }
  setGeminiKey(k: string) { localStorage.setItem(this.GEMINI_KEY, k); }
  clearGeminiKey() { localStorage.removeItem(this.GEMINI_KEY); }
  hasGeminiKey(): boolean { return !!localStorage.getItem(this.GEMINI_KEY); }

  hasAllTokens(): boolean { return this.hasGitlabToken() && this.hasGeminiKey(); }
}