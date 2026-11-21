import { Routes } from '@angular/router';
import { CampaignForm } from './campaign-form/campaign-form';
import { CampaignDetail } from './campaign-detail/campaign-detail';

export const routes: Routes = [
  { path: '', redirectTo: 'campaigns/new', pathMatch: 'full' },
  { path: 'campaigns/new', component: CampaignForm },
  { path: 'campaigns/all', component: CampaignDetail },
  { path: 'campaigns/:id', component: CampaignDetail },
];