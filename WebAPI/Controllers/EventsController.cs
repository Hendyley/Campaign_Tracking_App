using Microsoft.AspNetCore.Mvc;
using WebAPI.Services;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly IEventService _events;
    public EventsController(IEventService events) => _events = events;

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EventDto>> Get(int id, CancellationToken ct)
    {
        var e = await _events.GetAsync(id, ct);
        return e is null ? NotFound() : Ok(e);
    }

    [HttpPost]
    public async Task<ActionResult<EventDto>> Create(CreateEventRequest req, CancellationToken ct)
    {
        var created = await _events.CreateAsync(req, ct);
        if (created is null)
        {
            ModelState.AddModelError(nameof(req.CampaignId), $"Campaign {req.CampaignId} does not exist.");
            return ValidationProblem(ModelState);
        }
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        await _events.DeleteAsync(id, ct) ? NoContent() : NotFound();
}