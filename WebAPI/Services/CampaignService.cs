using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using WebAPI.Assets;
using WebAPI.Services;

public class CampaignService : ICampaignService
{
    public const int MaxPageSize = 100;

    // One shared projection: EF translates it to a single SQL query with a join,
    // so GetAsync and GetPageAsync cannot drift apart.
    private static readonly Expression<Func<Campaign, CampaignDto>> ToDto = c =>
        new CampaignDto(
            c.Id, c.Name, c.StartDate, c.EndDate,
            c.Events.Select(e => new EventDto(e.Id, e.EventType, e.Timestamp)).ToList());

    private readonly CampaignDbContext _db;
    public CampaignService(CampaignDbContext db) => _db = db;

    public async Task<IReadOnlyList<CampaignDto>> GetPageAsync(int page, int pageSize, CancellationToken ct)
    {
        // Never trust paging input: bound it here, whoever calls this method.
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        page = Math.Clamp(page, 1, int.MaxValue / pageSize);   // stops (page - 1) * pageSize overflowing

        return await _db.Campaigns
            .AsNoTracking()
            .OrderBy(c => c.Id)                                // stable order, required for paging
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToDto)
            .ToListAsync(ct);
    }

    public Task<CampaignDto?> GetAsync(int id, CancellationToken ct) =>
        _db.Campaigns
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(ToDto)
            .SingleOrDefaultAsync(ct);

    public async Task<CampaignDto> CreateAsync(CreateCampaignRequest request, CancellationToken ct)
    {
        var entity = new Campaign
        {
            Name = request.Name.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate
        };
        _db.Campaigns.Add(entity);
        await _db.SaveChangesAsync(ct);

        return new CampaignDto(entity.Id, entity.Name, entity.StartDate, entity.EndDate, new());
    }
}