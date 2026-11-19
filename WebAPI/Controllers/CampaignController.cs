using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI.Assets;

[ApiController]
[Route("api/campaigns")]
public class CampaignsController : ControllerBase
{
    private readonly CampaignDbContext _db;
    public CampaignsController(CampaignDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<CampaignDto>>> GetAll(CancellationToken ct) =>
    await _db.Campaigns
        .AsNoTracking()
        .OrderBy(c => c.Id)
        .Select(c => new CampaignDto(
            c.Id, c.Name, c.StartDate, c.EndDate,
            c.Events.Select(e => new EventDto(e.Id, e.EventType, e.Timestamp)).ToList()))
        .ToListAsync(ct);


    [HttpGet("{id:int}")]
    public async Task<ActionResult<CampaignDto>> Get(int id, CancellationToken ct)
    {
        var campaign = await _db.Campaigns
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CampaignDto(
                c.Id, c.Name, c.StartDate, c.EndDate,
                c.Events.Select(e => new EventDto(e.Id, e.EventType, e.Timestamp)).ToList()))
            .SingleOrDefaultAsync(ct);

        return campaign is null ? NotFound() : Ok(campaign);
    }

    [HttpPost]
    public async Task<ActionResult<CampaignDto>> Create(CreateCampaignRequest req, CancellationToken ct)
    {
        var entity = new Campaign
        {
            Name = req.Name.Trim(),
            StartDate = req.StartDate,
            EndDate = req.EndDate
        };
        _db.Campaigns.Add(entity);
        await _db.SaveChangesAsync(ct);

        var dto = new CampaignDto(entity.Id, entity.Name, entity.StartDate, entity.EndDate, new());
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, dto);
    }
}