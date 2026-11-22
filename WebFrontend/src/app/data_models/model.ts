export interface EventDto {
  id: number;
  eventType: string;
  timestamp: string;
}

export interface Campaign {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  eventCount: number;
  events: EventDto[];
}

export interface CreateCampaign {
  name: string;
  startDate: string;
  endDate: string;
  events?: EventInput[];   
}

export interface CampaignSummary {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  eventCount: number;
}

export interface EventInput {
  eventType: string;
  timestamp?: string;
}

export interface CreateEvent {
  campaignId: number;     
  eventType: string;
  timestamp?: string;
}
