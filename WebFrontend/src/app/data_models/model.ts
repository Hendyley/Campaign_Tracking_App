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
  events: EventDto[];
}

export interface CreateCampaign {
  name: string;
  startDate: string;
  endDate: string;
}