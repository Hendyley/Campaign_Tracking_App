namespace WebAPI.Services;

public interface IEventService
{
    Task<EventDto?> GetAsync(int id, CancellationToken ct);
    Task<EventDto?> CreateAsync(CreateEventRequest request, CancellationToken ct);   // null = campaign does not exist
    Task<bool> DeleteAsync(int id, CancellationToken ct);
}