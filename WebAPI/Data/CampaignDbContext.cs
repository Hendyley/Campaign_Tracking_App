using Microsoft.EntityFrameworkCore;
using WebAPI.Assets;

public class CampaignDbContext : DbContext
{
    public CampaignDbContext(DbContextOptions<CampaignDbContext> options) : base(options) { }

    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<Event> Events => Set<Event>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Campaign>(c =>
        {
            c.Property(x => x.Name).IsRequired().HasMaxLength(200);
            c.HasMany(x => x.Events)
             .WithOne()
             .HasForeignKey(e => e.CampaignId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Event>(e =>
        {
            e.Property(x => x.EventType).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.CampaignId);
        });
    }
}