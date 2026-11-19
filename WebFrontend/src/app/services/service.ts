import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Campaign, CreateCampaign } from '../data_models/model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/campaigns`;

  get(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.base}/${id}`);
  }

  create(body: CreateCampaign): Observable<Campaign> {
    return this.http.post<Campaign>(this.base, body);
  }
}