namespace WebAPI.Services
{
    public interface ICampaignService
    {
        Task<IReadOnlyList<CampaignDto>> GetPageAsync(int page, int pageSize, CancellationToken ct);
        Task<CampaignDto?> GetAsync(int id, CancellationToken ct);
        Task<CampaignDto> CreateAsync(CreateCampaignRequest request, CancellationToken ct);
    }
}
