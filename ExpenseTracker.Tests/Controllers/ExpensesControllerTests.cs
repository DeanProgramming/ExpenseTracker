using ExpenseTracker.Models;
using ExpenseTracker.Models.Requests;
using ExpenseTracker.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace ExpenseTracker.Tests.Controllers;

public sealed class ExpensesControllerTests
{
    private const string AliceId = "alice-id";
    private const string BobId = "bob-id";

    [Fact]
    public async Task Index_ReturnsOnlyAuthenticatedUsersExpenses()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId, BobId);
        await database.AddExpenseAsync(AliceId, "Alice expense");
        await database.AddExpenseAsync(BobId, "Bob expense");
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var expenses = Assert.IsAssignableFrom<IEnumerable<Expense>>(view.Model);
        var expense = Assert.Single(expenses);
        Assert.Equal(AliceId, expense.UserId);
        Assert.Equal("Alice expense", expense.Description);
        Assert.NotNull(expense.Category);
    }

    [Fact]
    public async Task Index_WithoutResolvedUserId_ReturnsChallenge()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, authenticatedUserId: null, cache);

        var result = await controller.Index();

        Assert.IsType<ChallengeResult>(result);
    }

    [Fact]
    public async Task Create_UsesAuthenticatedUserIdAndTrimsDescription()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId, BobId);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache, isAjax: true);

        var request = new CreateExpenseRequest
        {
            Description = "  Lunch  ",
            Amount = 9.25m,
            Date = new DateTime(2026, 9, 5),
            CategoryId = 1
        };

        var result = await controller.Create(request);

        var json = Assert.IsType<JsonResult>(result);
        var saved = await database.Context.Expenses.AsNoTracking().SingleAsync(TestContext.Current.CancellationToken);

        Assert.Equal(AliceId, saved.UserId);
        Assert.Equal("Lunch", saved.Description);
        Assert.DoesNotContain(json.Value!.GetType().GetProperties(), property => property.Name == nameof(Expense.UserId));
    }

    [Fact]
    public async Task Create_WithUnknownCategory_ReturnsValidationProblemAndDoesNotPersist()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId);

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache);

        var request = new CreateExpenseRequest
        {
            Description = "Lunch",
            Amount = 9.25m,
            Date = new DateTime(2026, 9, 5),
            CategoryId = 999
        };

        var result = await controller.Create(request);

        var problem = Assert.IsType<ObjectResult>(result);
        var details = Assert.IsType<ValidationProblemDetails>(problem.Value);

        Assert.True(details.Errors.ContainsKey(nameof(CreateExpenseRequest.CategoryId)));

        Assert.Contains("Select a valid category.", details.Errors[nameof(CreateExpenseRequest.CategoryId)]);
    }

    [Fact]
    public async Task Edit_OwnExpenseUpdatesAllowedFieldsAndPreservesOwner()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId, BobId);
        var expenseId = await database.AddExpenseAsync(AliceId, "Old value");
        using var cache = new MemoryCache(new MemoryCacheOptions());

        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache, isAjax: true);

        var request = new EditExpenseRequest
        {
            Description = "  Updated value  ",
            Amount = 40m,
            Date = new DateTime(2026, 9, 4),
            CategoryId = 2
        };

        var result = await controller.Edit(expenseId, request);

        Assert.IsType<JsonResult>(result);
        database.Context.ChangeTracker.Clear();
        var saved = await database.Context.Expenses
            .AsNoTracking()
            .SingleAsync(TestContext.Current.CancellationToken);

        Assert.Equal(AliceId, saved.UserId);
        Assert.Equal("Updated value", saved.Description);
        Assert.Equal(40m, saved.Amount);
        Assert.Equal(2, saved.CategoryId);
    }

    [Fact]
    public async Task Edit_ForeignExpenseReturnsNotFoundAndLeavesItUnchanged()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId, BobId);
        var originalDate = new DateTime(2026, 9, 1);

        var expenseId = await database.AddExpenseAsync(BobId, "Bob original", amount: 15m, date: originalDate, categoryId: 1);

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache);

        var request = new EditExpenseRequest
        {
            Description = "Alice forged edit",
            Amount = 1m,
            Date = new DateTime(2026, 9, 5),
            CategoryId = 2
        };

        var result = await controller.Edit(expenseId, request);

        Assert.IsType<NotFoundResult>(result);
        database.Context.ChangeTracker.Clear();
        var saved = await database.Context.Expenses
            .AsNoTracking()
            .SingleAsync(TestContext.Current.CancellationToken);

        Assert.Equal(BobId, saved.UserId);
        Assert.Equal("Bob original", saved.Description);
        Assert.Equal(15m, saved.Amount);
        Assert.Equal(originalDate, saved.Date);
        Assert.Equal(1, saved.CategoryId);
    }

    [Fact]
    public async Task Delete_OwnExpenseRemovesIt()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId);

        var expenseId = await database.AddExpenseAsync(AliceId, "Delete me");
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache, isAjax: true);

        var result = await controller.DeleteConfirmed(expenseId);

        Assert.IsType<NoContentResult>(result);
        Assert.False(await database.Context.Expenses
            .AsNoTracking()
            .AnyAsync(expense => expense.Id == expenseId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Delete_ForeignExpenseReturnsNotFoundAndLeavesItUntouched()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId, BobId);

        var expenseId = await database.AddExpenseAsync(BobId, "Bob keeps this");
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache);

        var result = await controller.DeleteConfirmed(expenseId);

        Assert.IsType<NotFoundResult>(result);
        var saved = await database.Context.Expenses
            .AsNoTracking()
            .SingleAsync(expense => expense.Id == expenseId, TestContext.Current.CancellationToken);

        Assert.Equal(BobId, saved.UserId);
        Assert.Equal("Bob keeps this", saved.Description);
    }

    [Fact]
    public async Task Regenerate_SecondRequestWithinCooldownReturnsTooManyRequests()
    {
        await using var database = await SqliteTestDatabase.CreateAsync();
        await database.SeedUsersAsync(AliceId);

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var controller = ControllerTestFactory.CreateExpensesController(database.Context, AliceId, cache);

        var firstResult = await controller.Regenerate(TestContext.Current.CancellationToken);
        var countAfterFirstRequest = await database.Context.Expenses.CountAsync(TestContext.Current.CancellationToken);
        var secondResult = await controller.Regenerate(TestContext.Current.CancellationToken);

        Assert.IsType<OkObjectResult>(firstResult);

        var throttled = Assert.IsType<ObjectResult>(secondResult);

        Assert.Equal(429, throttled.StatusCode);
        Assert.Equal(countAfterFirstRequest, await database.Context.Expenses.CountAsync(TestContext.Current.CancellationToken));
    }
}
