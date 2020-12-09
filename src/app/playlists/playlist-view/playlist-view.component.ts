import { Component, Input, OnInit } from '@angular/core';
import { GenreService } from 'src/app/filters/genre-filters/+state';
import { Playlist, PlaylistStore } from '../+state';

@Component({
  selector: 'app-playlist-view',
  templateUrl: './playlist-view.component.html',
  styleUrls: ['./playlist-view.component.css'],
})
export class PlaylistViewComponent implements OnInit {
  @Input() playlist: Playlist;

  constructor(
    private store: PlaylistStore,
    private genreService: GenreService
  ) {}

  ngOnInit(): void {}

  public setActive() {
    this.store.toggleActive(this.playlist.id);
    this.genreService.toggle(this.playlist.id);
  }
}
