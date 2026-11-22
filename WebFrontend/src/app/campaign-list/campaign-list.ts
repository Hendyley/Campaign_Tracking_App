import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampaignSummary } from '../data_models/model';
import { CampaignService } from '../services/service';
import { apiErrorMessage } from '../utils/api-error';

@Component({
  selector: 'app-campaign-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './campaign-list.html',
  styleUrl: './campaign-list.css',
})
export class CampaignList implements OnInit {
  private api = inject(CampaignService);

  readonly pageSize = 20;
  campaigns = signal<CampaignSummary[]>([]);
  page = signal(1);
  hasNext = signal(false);
  state = signal<'loading' | 'ok' | 'error'>('loading');
  actionError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.state.set('loading');
    this.api.getAll(page, this.pageSize + 1).subscribe({
      next: (rows) => {
        if (rows.length === 0 && page > 1) {
          this.loadPage(page - 1);  
          return;
        }
        this.hasNext.set(rows.length > this.pageSize);
        this.campaigns.set(rows.slice(0, this.pageSize));
        this.page.set(page);
        this.state.set('ok');
      },
      error: () => this.state.set('error'),
    });
  }

  remove(c: CampaignSummary): void {
    if (!window.confirm(`Delete "${c.name}" and its ${c.eventCount} event(s)?`)) {
      return;
    }
    this.actionError.set(null);
    this.api.deleteCampaign(c.id).subscribe({
      next: () => this.loadPage(this.page()),
      error: (e: HttpErrorResponse) =>
        this.actionError.set(apiErrorMessage(e, 'Could not delete the campaign.')),
    });
  }
}