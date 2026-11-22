import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Campaign, CreateCampaign, CreateEvent, EventDto, CampaignSummary } from '../data_models/model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private http = inject(HttpClient);
  private campaignsUrl = `${environment.apiUrl}/api/campaigns`;
  private eventsUrl = `${environment.apiUrl}/api/events`;

  getAll(page = 1, pageSize = 20): Observable<CampaignSummary[]> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<CampaignSummary[]>(this.campaignsUrl, { params });
  }

  get(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.campaignsUrl}/${id}`);
  }

  create(body: CreateCampaign): Observable<Campaign> {
    return this.http.post<Campaign>(this.campaignsUrl, body);
  }

  deleteCampaign(id: number): Observable<void> {
    return this.http.delete<void>(`${this.campaignsUrl}/${id}`);
  }

  createEvent(body: CreateEvent): Observable<EventDto> {
    return this.http.post<EventDto>(this.eventsUrl, body);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.eventsUrl}/${id}`);
  }
}