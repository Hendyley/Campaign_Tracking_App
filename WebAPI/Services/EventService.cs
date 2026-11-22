using Microsoft.EntityFrameworkCore;
using WebAPI.Assets;

namespace WebAPI.Services;

public class EventService : IEventService
{
    private readonly CampaignDbContext _db;
    public EventService(CampaignDbContext db) => _db = db;

    public Task<EventDto?> GetAsync(int id, CancellationToken ct) =>
        _db.Events
            .AsNoTracking()
            .Where(e => e.Id == id)
            .Select(e => new EventDto(e.Id, e.CampaignId, e.EventType, e.Timestamp))
            .SingleOrDefaultAsync(ct);

    public async Task<EventDto?> CreateAsync(CreateEventRequest request, CancellationToken ct)
    {
        // A cheap EXISTS query: no campaign entity is loaded.
        if (!await _db.Campaigns.AnyAsync(c => c.Id == request.CampaignId, ct))
            return null;

        var entity = new Event
        {
            CampaignId = request.CampaignId,
            EventType = request.EventType.Trim(),
            Timestamp = request.Timestamp ?? DateTime.UtcNow
        };
        _db.Events.Add(entity);
        await _db.SaveChangesAsync(ct);

        return new EventDto(entity.Id, entity.CampaignId, entity.EventType, entity.Timestamp);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct) =>
        await _db.Events.Where(e => e.Id == id).ExecuteDeleteAsync(ct) > 0;
}