using Microsoft.EntityFrameworkCore;
using WebAPI.Assets;
using WebAPI.Services;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<CampaignDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ICampaignService, CampaignService>();
builder.Services.AddScoped<IEventService, EventService>();

builder.Services.AddCors(o => o.AddPolicy("web", p =>
    p.WithOrigins("http://localhost:4200", "http://localhost:3000").AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CampaignDbContext>();
    db.Database.Migrate();   
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("web");
app.MapControllers();
app.Run();