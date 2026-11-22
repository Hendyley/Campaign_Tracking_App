using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI.Assets;
using WebAPI.Services;

[ApiController]
[Route("api/campaigns")]
public class CampaignsController : ControllerBase
{
    private readonly ICampaignService _campaigns;
    public CampaignsController(ICampaignService campaigns) => _campaigns = campaigns;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CampaignDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default) =>
        Ok(await _campaigns.GetPageAsync(page, pageSize, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CampaignDto>> Get(int id, CancellationToken ct)
    {
        var campaign = await _campaigns.GetAsync(id, ct);
        return campaign is null ? NotFound() : Ok(campaign);
    }

    [HttpPost]
    public async Task<ActionResult<CampaignDto>> Create(CreateCampaignRequest req, CancellationToken ct)
    {
        var dto = await _campaigns.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = dto.Id }, dto);
    }
}