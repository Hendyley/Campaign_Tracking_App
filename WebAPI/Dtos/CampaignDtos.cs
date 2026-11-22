using System.ComponentModel.DataAnnotations;
public class CreateCampaignRequest : IValidatableObject
{
    public const int MaxEvents = 50;

    [Required, StringLength(200, MinimumLength = 1)]
    [RegularExpression(@"^[^<>]*$", ErrorMessage = "Name must not contain HTML characters.")]
    public string Name { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    [MaxLength(MaxEvents, ErrorMessage = "A campaign can be created with at most 50 events.")]
    public List<EventInput> Events { get; set; } = new();   

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (EndDate <= StartDate)
            yield return new ValidationResult("EndDate must be after StartDate.", new[] { nameof(EndDate) });
    }
}

public class EventInput
{
    [Required, StringLength(100, MinimumLength = 1)]
    [RegularExpression(@"^[^<>]*$", ErrorMessage = "EventType must not contain HTML characters.")]
    public string EventType { get; set; } = string.Empty;

    public DateTime? Timestamp { get; set; }  
}

public class CreateEventRequest : EventInput
{
    [Range(1, int.MaxValue, ErrorMessage = "CampaignId is required.")]
    public int CampaignId { get; set; }
}


public record EventDto(int Id, int CampaignId, string EventType, DateTime Timestamp);
public record CampaignSummaryDto(int Id, string Name, DateTime StartDate, DateTime EndDate, int EventCount);
public record CampaignDto(int Id, string Name, DateTime StartDate, DateTime EndDate, int EventCount, List<EventDto> Events);