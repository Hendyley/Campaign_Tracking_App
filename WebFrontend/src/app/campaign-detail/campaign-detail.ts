import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Campaign } from '../data_models/model';
import { CampaignService } from '../services/service';

@Component({
  selector: 'app-campaign-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './campaign-detail.html',
  styleUrl: './campaign-detail.css',
})
export class CampaignDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(CampaignService);

  campaign = signal<Campaign | null>(null);
  campaigns = signal<Campaign[] | null>(null);
  state = signal<'loading' | 'ok' | 'notfound' | 'error'>('loading');

  readonly pageSize = 20;
  page = signal(1);
  hasNext = signal(false);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === null) {
      this.loadPage(1);
    } else {
      this.api.get(Number(idParam)).subscribe({
        next: (c) => { this.campaign.set(c); this.state.set('ok'); },
        error: (e: HttpErrorResponse) => this.state.set(e.status === 404 ? 'notfound' : 'error'),
      });
    }
  }

  loadPage(page: number): void {
    this.state.set('loading');
    // Ask for one extra row: if it comes back, a next page exists.
    this.api.getAll(page, this.pageSize + 1).subscribe({
      next: (rows) => {
        this.hasNext.set(rows.length > this.pageSize);
        this.campaigns.set(rows.slice(0, this.pageSize));
        this.page.set(page);
        this.state.set('ok');
      },
      error: (e: HttpErrorResponse) => this.state.set(e.status === 404 ? 'notfound' : 'error'),
    });
  }
}