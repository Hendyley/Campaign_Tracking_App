using Microsoft.EntityFrameworkCore;
using WebAPI.Assets;

namespace WebAPI.Services;

public class CampaignService : ICampaignService
{
    public const int MaxPageSize = 100;
    public const int MaxEventsInDetail = 100;

    private readonly CampaignDbContext _db;
    public CampaignService(CampaignDbContext db) => _db = db;

    public async Task<IReadOnlyList<CampaignSummaryDto>> GetPageAsync(int page, int pageSize, CancellationToken ct)
    {
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        page = Math.Clamp(page, 1, int.MaxValue / pageSize);

        return await _db.Campaigns
            .AsNoTracking()
            .OrderBy(c => c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CampaignSummaryDto(c.Id, c.Name, c.StartDate, c.EndDate, c.Events.Count))  // COUNT in SQL
            .ToListAsync(ct);
    }

    public Task<CampaignDto?> GetAsync(int id, CancellationToken ct) =>
        _db.Campaigns
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CampaignDto(
                c.Id, c.Name, c.StartDate, c.EndDate,
                c.Events.Count,
                c.Events.OrderBy(e => e.Timestamp).ThenBy(e => e.Id)
                    .Take(MaxEventsInDetail)
                    .Select(e => new EventDto(e.Id, e.CampaignId, e.EventType, e.Timestamp))
                    .ToList()))
            .SingleOrDefaultAsync(ct);

    public async Task<CampaignDto> CreateAsync(CreateCampaignRequest request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var entity = new Campaign
        {
            Name = request.Name.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Events = request.Events.Select(e => new Event
            {
                EventType = e.EventType.Trim(),
                Timestamp = e.Timestamp ?? now
            }).ToList()
        };

        _db.Campaigns.Add(entity);
        await _db.SaveChangesAsync(ct);  

        return new CampaignDto(
            entity.Id, entity.Name, entity.StartDate, entity.EndDate, entity.Events.Count,
            entity.Events.Select(e => new EventDto(e.Id, e.CampaignId, e.EventType, e.Timestamp)).ToList());
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct) =>
        await _db.Campaigns.Where(c => c.Id == id).ExecuteDeleteAsync(ct) > 0;
}