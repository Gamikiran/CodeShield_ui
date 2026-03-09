// gitlab-token-setup.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GitlabAuthService } from '../../app/services/GitlabAuthService';

@Component({
  selector: 'app-token-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="token-shell" *ngIf="!bothSaved">

      <div class="token-header">
        <div class="th-icon">🔐</div>
        <div>
          <div class="th-title">Connect Your Accounts</div>
          <div class="th-sub">Tokens are saved in your browser only — never sent to our servers</div>
        </div>
      </div>

      <!-- GitLab Token -->
      <div class="token-card" [class.saved]="gitlabSaved">
        <div class="tc-left">
          <span class="tc-logo">🦊</span>
          <div>
            <div class="tc-name">GitLab Token</div>
            <div class="tc-desc">
              Generate at: <a href="https://git.promptdairytech.com/-/profile/personal_access_tokens" target="_blank">
                Profile → Access Tokens
              </a> with <code>read_api</code> scope
            </div>
          </div>
        </div>
        <div class="tc-right" *ngIf="!gitlabSaved">
          <input
            type="password"
            class="token-input"
            placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
            [(ngModel)]="gitlabToken"
            (keyup.enter)="saveGitlab()"
          />
          <button class="btn-save" (click)="saveGitlab()" [disabled]="!gitlabToken">
            Save
          </button>
        </div>
        <div class="tc-saved" *ngIf="gitlabSaved">
          <span class="saved-badge">✅ Connected</span>
          <button class="btn-remove" (click)="clearGitlab()">Remove</button>
        </div>
      </div>

      <!-- Claude API Key -->
      <div class="token-card" [class.saved]="geminiSaved">
  <div class="tc-left">
    <span class="tc-logo">🤖</span>
    <div>
      <div class="tc-name">Gemini API Key (Free)</div>
      <div class="tc-desc">
        Get free key at:
        <a href="https://aistudio.google.com/apikey" target="_blank">
          aistudio.google.com → Get API Key
        </a>
        — no credit card needed
      </div>
    </div>
  </div>
  <div class="tc-right" *ngIf="!geminiSaved">
    <input
      type="password"
      class="token-input"
      placeholder="AIzaSy-xxxxxxxxxxxxxxxxxxxx"
      [(ngModel)]="geminiKey"
      (keyup.enter)="saveGemini()"
    />
    <button class="btn-save" (click)="saveGemini()" [disabled]="!geminiKey">
      Save
    </button>
  </div>
  <div class="tc-saved" *ngIf="geminiSaved">
    <span class="saved-badge">✅ Connected</span>
    <button class="btn-remove" (click)="clearGemini()">Remove</button>
  </div>
</div>
      <div class="token-note">
        🔒 Stored in <code>localStorage</code> — cleared when you remove or log out
      </div>
    </div>

    <!-- All saved — compact bar -->
    <div class="all-saved-bar" *ngIf="bothSaved">
      <span>🔐 GitLab + Gemini connected</span>
      <button class="btn-manage" (click)="showManage = !showManage">Manage Tokens</button>
      <div class="manage-dropdown" *ngIf="showManage">
        <button (click)="clearGitlab()">🦊 Remove GitLab token</button>
        <button (click)="clearGemini()">✳️ Remove Genimi key</button>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    :host { display: block; font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 24px; }

    .token-shell {
      background: #fff; border: 1.5px solid #e2e8f0; border-radius: 16px;
      padding: 24px; display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }

    .token-header { display: flex; align-items: center; gap: 14px; }
    .th-icon { font-size: 28px; }
    .th-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 3px; }
    .th-sub { font-size: 13px; color: #64748b; }

    .token-card {
      display: flex; align-items: center; justify-content: space-between;
      background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;
      padding: 16px 20px; gap: 16px; flex-wrap: wrap;
      transition: border-color 0.2s;
      &.saved { border-color: #bbf7d0; background: #f0fdf4; }
    }

    .tc-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .tc-logo { font-size: 24px; }
    .tc-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .tc-desc { font-size: 12px; color: #64748b;
      a { color: #6366f1; text-decoration: none; font-weight: 600; &:hover { text-decoration: underline; } }
      code { font-family: 'JetBrains Mono', monospace; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }
    }

    .tc-right { display: flex; align-items: center; gap: 8px; }
    .token-input {
      padding: 9px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
      font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #0f172a;
      outline: none; width: 260px; transition: border-color 0.2s;
      &:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    }

    .btn-save {
      background: #6366f1; border: none; border-radius: 10px; padding: 9px 20px;
      font-size: 13px; font-family: inherit; font-weight: 700; color: #fff;
      cursor: pointer; white-space: nowrap;
      &:hover:not(:disabled) { background: #4f46e5; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .tc-saved { display: flex; align-items: center; gap: 10px; }
    .saved-badge { font-size: 13px; font-weight: 700; color: #15803d; }
    .btn-remove {
      background: none; border: 1px solid #fca5a5; border-radius: 8px;
      padding: 5px 12px; font-size: 12px; font-family: inherit; font-weight: 600;
      color: #dc2626; cursor: pointer;
      &:hover { background: #fff5f5; }
    }

    .token-note {
      font-size: 12px; color: #94a3b8; text-align: center;
      code { font-family: 'JetBrains Mono', monospace; }
    }

    .all-saved-bar {
      display: flex; align-items: center; gap: 12px;
      background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px;
      padding: 12px 18px; font-size: 13px; font-weight: 600; color: #15803d;
      position: relative;
    }
    .btn-manage {
      margin-left: auto; background: #fff; border: 1px solid #bbf7d0;
      border-radius: 8px; padding: 5px 14px; font-size: 12px; font-family: inherit;
      font-weight: 600; color: #15803d; cursor: pointer;
    }
    .manage-dropdown {
      position: absolute; top: calc(100% + 6px); right: 0;
      background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px;
      padding: 8px; display: flex; flex-direction: column; gap: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.1); z-index: 50;
      button {
        background: none; border: none; padding: 8px 14px; border-radius: 8px;
        font-size: 13px; font-family: inherit; font-weight: 600; color: #475569;
        cursor: pointer; text-align: left; white-space: nowrap;
        &:hover { background: #f8fafc; color: #0f172a; }
      }
    }
  `]
})
export class TokenSetupComponent {
  gitlabToken = '';
  claudeKey = '';
  showManage = false;

  constructor(private auth: GitlabAuthService) {}

  get gitlabSaved() { return this.auth.hasGitlabToken(); }
  get claudeSaved() { return this.auth.hasClaudeKey(); }
  //get bothSaved() { return this.gitlabSaved && this.claudeSaved; }

  saveGitlab() {
    if (this.gitlabToken.trim()) {
      this.auth.setGitlabToken(this.gitlabToken.trim());
      this.gitlabToken = '';
    }
  }
  saveClaude() {
    if (this.claudeKey.trim()) {
      this.auth.setClaudeKey(this.claudeKey.trim());
      this.claudeKey = '';
    }
  }
  clearGitlab() { this.auth.clearGitlabToken(); this.showManage = false; }
  clearClaude() { this.auth.clearClaudeKey(); this.showManage = false; }
  // Change claudeKey → geminiKey throughout
geminiKey = '';

get geminiSaved() { return this.auth.hasGeminiKey(); }
get bothSaved() { return this.gitlabSaved && this.geminiSaved; }

saveGemini() {
  if (this.geminiKey.trim()) {
    this.auth.setGeminiKey(this.geminiKey.trim());
    this.geminiKey = '';
  }
}
clearGemini() { this.auth.clearGeminiKey(); this.showManage = false; }
}