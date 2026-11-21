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

  ngOnInit(): void {
    if (this.route.snapshot.paramMap.get('id') === null)
    {
      this.api.getAll().subscribe({
        next: (c) => {
          this.campaigns.set(c);
          this.state.set('ok');
        },
      error: (e: HttpErrorResponse) => this.state.set(e.status === 404 ? 'notfound' : 'error'),
      });
    }
    else 
    {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.api.get(id).subscribe({
        next: (c) => {
          this.campaign.set(c);
          this.state.set('ok');
        },
      error: (e: HttpErrorResponse) => this.state.set(e.status === 404 ? 'notfound' : 'error'),
    });

    }

    
  }
}