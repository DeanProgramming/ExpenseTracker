using System.Globalization;
using ExpenseTracker.Models.ViewModels;

namespace ExpenseTracker.Services;

public static class DemoExpenseData
{
    // Returns fresh objects on every GET: no shared mutable state, database,
    // Identity account, or calls into the real regeneration service.
    public static ExpenseDashboardViewModel Create(DateTime? referenceDate = null)
    {
        var today = (referenceDate ?? DateTime.UtcNow).Date;
        var currentMonth = new DateTime(today.Year, today.Month, 1);
        var startDate = currentMonth.AddMonths(-3);

        DemoCategoryViewModel[] categories =
        [
            new(1, "Rent", "#b91d47"),
            new(2, "Transport", "#00aba9"),
            new(3, "Food", "#2b5797"),
            new(4, "Groceries", "#b27a64"),
            new(5, "Coffee", "#1e7145"),
            new(6, "Utilities", "#d97706"),
            new(7, "Entertainment", "#ca8a04"),
            new(8, "Subscriptions", "#0284c7"),
            new(9, "Shopping", "#9333ea"),
            new(10, "Education", "#65a30d"),
            new(11, "Misc", "#e05c5c")
        ];

        var expenses = new List<DemoExpenseViewModel>();
        void Add(string description, decimal amount, DateTime date, int categoryId)
        {
            var category = categories.Single(item => item.Id == categoryId);
            expenses.Add(new DemoExpenseViewModel(
                expenses.Count + 1,
                description,
                amount,
                date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                category.Id,
                category.Name));
        }

        // Fixed rules, no random generator. The same reference date always
        // produces the same dataset, while the displayed months stay current.
        for (var date = startDate; date <= today; date = date.AddDays(1))
        {
            if (date.Day == 1)
            {
                Add("Rent", 700m, date, 1);
                Add("Streaming subscription", 10.99m, date, 8);
            }

            if (date.Day == 5) Add("Electricity and water", 95m, date, 6);
            if (date.Day == 12) Add("Learning materials", 18.50m, date, 10);
            if (date.Day == 20) Add("Household essentials", 24.95m, date, 9);
            if (date.Day == 25) Add("Postage", 4.50m, date, 11);

            if (date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
            {
                Add("Transport - to work", 5m, date, 2);
                Add("Transport - return", 5m, date, 2);
            }

            Add("Daily food / lunch", 4.50m + date.Day % 7, date, 3);

            if (date.DayOfWeek == DayOfWeek.Sunday) Add("Weekly groceries", 38.25m + date.Day % 16, date, 4);
            if (date.Day % 5 == 0) Add("Coffee", 3.20m, date, 5);
            if (date.Day % 14 == 0) Add("Cinema visit", 14m, date, 7);
        }

        return new ExpenseDashboardViewModel(
            currentMonth.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            expenses,
            categories);
    }
}
