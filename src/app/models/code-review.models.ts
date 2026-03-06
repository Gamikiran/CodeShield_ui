export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email: string;
  state: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
}

export interface GitLabBranch {
  name: string;
  commit: {
    author_name: string;
  };
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  source_branch: string;
  target_branch: string;
  author: GitLabUser;
  assignee: GitLabUser;
  created_at: string;
  updated_at: string;
}

export interface CodeReviewResult {
  filePath: string;
  issues: CodeIssue[];
  changeType: string;
}

export interface CodeIssue {
  type: string;
  severity: string;
  message: string;
  lineNumber: number;
  suggestion: string;
  sourceLine: string;
  ruleId?: string;
  confidence?: string;
  realWorldImpact?: string;
}