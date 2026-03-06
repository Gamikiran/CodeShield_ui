import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectSelectorComponent } from './components/project-selector/project-selector.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';

@NgModule({
  imports: [
    // CommonModule
  ],
  exports: [] // or remove the module entirely if everything is standalone
})
export class ProjectModule {}
