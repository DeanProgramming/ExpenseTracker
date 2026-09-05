using ExpenseTracker.Models;
using ExpenseTracker.Services;
using ExpenseTracker.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Tests.Services;

public sealed class ExpenseSeedServiceTests
{
    private const string AliceId = "alice-id";
    private const string BobId = "bob-id";

    private static readonly string[] RequiredCategoryNames =
    [
        "Rent",
        "Transport",
        "Food",
        "Groceries",
        "Coffee",
        "Utilities",
        "Entertainment",
        "Subscriptions",
        "Shopping",
        "Education",
        "Misc"
    ];

    [Fact]
    public async Task Regenerate_ReplacesOnlyTargetUsersExpenses()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId, BobId);
        await database.AddExpenseAsync(AliceId, "Alice old expense");
        var bobExpenseId = await database.AddExpenseAsync(BobId, "Bob untouched expense");
        var service = new ExpenseSeedService(database.Context);

        await service.RegenerateExpensesAsync(AliceId, TestContext.Current.CancellationToken);

        database.Context.ChangeTracker.Clear();
        var aliceExpenses = await database.Context.Expenses
            .AsNoTracking()
            .Where(expense => expense.UserId == AliceId)
            .ToListAsync(TestContext.Current.CancellationToken);

        var bobExpense = await database.Context.Expenses
            .AsNoTracking()
            .SingleAsync(
                expense => expense.Id == bobExpenseId,
                TestContext.Current.CancellationToken);

        Assert.NotEmpty(aliceExpenses);
        Assert.All(aliceExpenses, expense => Assert.Equal(AliceId, expense.UserId));
        Assert.DoesNotContain(aliceExpenses, expense => expense.Description == "Alice old expense");
        Assert.Equal(BobId, bobExpense.UserId);
        Assert.Equal("Bob untouched expense", bobExpense.Description);
    }

    [Fact]
    public async Task Regenerate_WhenReplacementWriteFailsPreservesExistingExpenses()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId);
        await AddMissingRequiredCategoriesAsync(database);
        var originalExpenseId = await database.AddExpenseAsync(AliceId, "Original expense", amount: 25m);

        await database.Context.Database.ExecuteSqlRawAsync(
            """
            CREATE TRIGGER "FailGeneratedExpenseInsert"
            BEFORE INSERT ON "Expenses"
            WHEN NEW."Description" = 'Rent'
            BEGIN
                SELECT RAISE(ABORT, 'simulated replacement failure');
            END;
            """,
            TestContext.Current.CancellationToken);

        var service = new ExpenseSeedService(database.Context);

        await Assert.ThrowsAsync<DbUpdateException>(() => service.RegenerateExpensesAsync(AliceId, TestContext.Current.CancellationToken));

        database.Context.ChangeTracker.Clear();
        var persisted = await database.Context.Expenses
            .AsNoTracking()
            .Where(expense => expense.UserId == AliceId)
            .ToListAsync(TestContext.Current.CancellationToken);

        var original = Assert.Single(persisted);
        Assert.Equal(originalExpenseId, original.Id);
        Assert.Equal("Original expense", original.Description);
        Assert.Equal(25m, original.Amount);
    }

    private static async Task AddMissingRequiredCategoriesAsync(SqliteTestDatabase database)
    {
        var existingNames = await database.Context.Categories
            .AsNoTracking()
            .Select(category => category.Name)
            .ToListAsync(TestContext.Current.CancellationToken);

        var missingNames = RequiredCategoryNames
            .Except(existingNames, StringComparer.OrdinalIgnoreCase)
            .Select(name => new Category { Name = name });

        database.Context.Categories.AddRange(missingNames);
        await database.Context.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
