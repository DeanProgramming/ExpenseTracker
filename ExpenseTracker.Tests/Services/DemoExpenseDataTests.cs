using ExpenseTracker.Models.ViewModels;
using ExpenseTracker.Services;

namespace ExpenseTracker.Tests.Services;

public sealed class DemoExpenseDataTests
{
    [Fact]
    public void Create_IsDeterministicAndReturnsFreshState()
    {
        var referenceDate = new DateTime(2026, 9, 5);

        var first = DemoExpenseData.Create(referenceDate);
        var second = DemoExpenseData.Create(referenceDate);

        Assert.Equal(first.CurrentMonth, second.CurrentMonth);
        Assert.Equal(first.Categories.ToArray(), second.Categories.ToArray());
        Assert.Equal(first.Expenses.ToArray(), second.Expenses.ToArray());
        Assert.NotSame(first.Categories, second.Categories);
        Assert.NotSame(first.Expenses, second.Expenses);

        var firstMutableList = Assert.IsType<List<DemoExpenseViewModel>>(first.Expenses);
        firstMutableList.Clear();

        var third = DemoExpenseData.Create(referenceDate);
        Assert.NotEmpty(third.Expenses);
    }
}
