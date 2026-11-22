import { Routes } from '@angular/router';
import { CampaignForm } from './campaign-form/campaign-form';
import { CampaignDetail } from './campaign-detail/campaign-detail';
import { CampaignList } from './campaign-list/campaign-list';

export const routes: Routes = [
  { path: '', redirectTo: 'campaigns/new', pathMatch: 'full' },
  { path: 'campaigns/new', component: CampaignForm },
  { path: 'campaigns/all', component: CampaignList },
  { path: 'campaigns/:id', component: CampaignDetail },
];