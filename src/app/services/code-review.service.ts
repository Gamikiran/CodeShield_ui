import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CodeReviewResult, GitLabBranch, GitLabMergeRequest, GitLabProject } from '../models/code-review.models';

interface BranchStatusViewModel {
  branchName: string;
  status: 'Open' | 'Merged' | 'Closed';
  author_name:string
}

@Injectable({
  providedIn: 'root'
})
export class CodeReviewService {

private apiUrl = 'https://localhost:7182/api'; // ✅ Use HTTPS

  constructor(private http: HttpClient) { }

getProjects(): Observable<GitLabProject[]> {
    return this.http.get<GitLabProject[]>(`${this.apiUrl}/projects`);
  }
  
 getBranches(projectId: number): Observable<BranchStatusViewModel[]> {
  return this.http.get<BranchStatusViewModel[]>(`/api/projects/${projectId}/branches`);
}

  getMergeRequests(projectId: number, sourceBranch?: string): Observable<GitLabMergeRequest[]> {
    const url = sourceBranch 
      ? `${this.apiUrl}/projects/${projectId}/merge-requests?sourceBranch=${sourceBranch}`
      : `${this.apiUrl}/projects/${projectId}/merge-requests`;
    return this.http.get<GitLabMergeRequest[]>(url);
  }

analyzeMergeRequest(
  projectId: number,
  mergeRequestIid: number,
  targetBranch: string
) {
  return this.http.get<CodeReviewResult[]>(
    `/api/code-review/merge-request/${projectId}/${mergeRequestIid}`,
    {
      params: {
        targetBranch: targetBranch   // ✅ QUERY PARAM
      }
    }
  );
}


  analyzeBranch(
  projectId: number,
  branch: string,
  targetBranch: string
): Observable<CodeReviewResult[]> {
  return this.http.get<CodeReviewResult[]>(
    `${this.apiUrl}/code-review/branch/${projectId}/${branch}`,
    {
      params: {
        targetBranch: targetBranch   // ✅ PASS TARGET BRANCH
      }
    }
  );
}

  
}