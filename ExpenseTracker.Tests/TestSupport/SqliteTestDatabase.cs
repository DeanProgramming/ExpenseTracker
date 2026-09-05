using ExpenseTracker.Data;
using ExpenseTracker.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Tests.TestSupport;

internal sealed class SqliteTestDatabase : IAsyncDisposable
{
    private readonly SqliteConnection _connection;

    private SqliteTestDatabase(SqliteConnection connection, ApplicationDbContext context)
    {
        _connection = connection;
        Context = context;
    }

    public ApplicationDbContext Context { get; }

    public static async Task<SqliteTestDatabase> CreateAsync()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync(TestContext.Current.CancellationToken);

        var context = CreateContext(connection);
        await context.Database.EnsureCreatedAsync(TestContext.Current.CancellationToken);

        return new SqliteTestDatabase(connection, context);
    }

    public static ApplicationDbContext CreateContext(SqliteConnection connection)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .EnableDetailedErrors()
            .Options;

        return new ApplicationDbContext(options);
    }

    public async Task SeedUsersAsync(params string[] userIds)
    {
        foreach (var userId in userIds)
        {
            if (await Context.Users.AnyAsync(user => user.Id == userId, TestContext.Current.CancellationToken))
            {
                continue;
            }

            Context.Users.Add(new User
            {
                Id = userId,
                UserName = $"{userId}@example.com",
                NormalizedUserName = $"{userId.ToUpperInvariant()}@EXAMPLE.COM",
                Email = $"{userId}@example.com",
                NormalizedEmail = $"{userId.ToUpperInvariant()}@EXAMPLE.COM",
                SecurityStamp = Guid.NewGuid().ToString("N")
            });
        }

        await Context.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    public async Task<int> AddExpenseAsync(
        string userId,
        string description,
        decimal amount = 12.50m,
        DateTime? date = null,
        int categoryId = 1)
    {
        var expense = new Expense
        {
            UserId = userId,
            Description = description,
            Amount = amount,
            Date = date ?? new DateTime(2026, 9, 1),
            CategoryId = categoryId
        };

        Context.Expenses.Add(expense);
        await Context.SaveChangesAsync(TestContext.Current.CancellationToken);

        return expense.Id;
    }

    public async ValueTask DisposeAsync()
    {
        await Context.DisposeAsync();
        await _connection.DisposeAsync();
    }
}
