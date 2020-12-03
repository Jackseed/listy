import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaylistListComponent } from './playlist-list/playlist-list.component';
import { PlaylistViewComponent } from './playlist-view/playlist-view.component';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

@NgModule({
  declarations: [PlaylistListComponent, PlaylistViewComponent],
  imports: [CommonModule, MatCardModule, MatCheckboxModule],
  exports: [PlaylistListComponent, PlaylistViewComponent],
})
export class PlaylistsModule {}
