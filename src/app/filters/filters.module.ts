import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterViewComponent } from './filter-view/filter-view.component';
import { FilterListComponent } from './filter-list/filter-list.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';

@NgModule({
  declarations: [FilterViewComponent, FilterListComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SliderModule,
    FormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    MatCardModule,
  ],
  exports: [FilterViewComponent, FilterListComponent],
})
export class FiltersModule {}
