using System.ComponentModel.DataAnnotations;

public class CreateCampaignRequest : IValidatableObject
{
    [Required, StringLength(200, MinimumLength = 1)]
    [RegularExpression(@"^[^<>]*$", ErrorMessage = "Name must not contain HTML characters.")]
    public string Name { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (EndDate <= StartDate)
            yield return new ValidationResult("EndDate must be after StartDate.", new[] { nameof(EndDate) });
    }
}

public record EventDto(int Id, string EventType, DateTime Timestamp);
public record CampaignDto(int Id, string Name, DateTime StartDate, DateTime EndDate, List<EventDto> Events);