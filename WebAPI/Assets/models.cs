namespace WebAPI.Assets;

public class Campaign 
{ 
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; } 
    public DateTime EndDate { get; set; }
    public List<Event> Events { get; set; } = new();
}
public class Event { 
    public int Id { get; set; } 
    public string EventType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } 
    public int CampaignId { get; set; } 
}
