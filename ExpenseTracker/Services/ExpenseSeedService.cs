using ExpenseTracker.Data;
using ExpenseTracker.Models;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Services
{
    public class ExpenseSeedService
    {
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

        private readonly ApplicationDbContext _context;

        public ExpenseSeedService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task RegenerateExpensesAsync(string userId, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ArgumentException("A user ID is required.", nameof(userId));
            }

            await EnsureCategoriesExistAsync(cancellationToken);

            var categories = await _context.Categories
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var categoryIds = categories
                .GroupBy(
                    category => category.Name,
                    StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    group => group.Key,
                    group => group.First().Id,
                    StringComparer.OrdinalIgnoreCase);

            var missingCategories = RequiredCategoryNames
                .Where(name => !categoryIds.ContainsKey(name))
                .ToList();

            if (missingCategories.Count > 0)
            {
                throw new InvalidOperationException($"Required categories are missing: " + $"{string.Join(", ", missingCategories)}");
            }

            var replacementExpenses = BuildReplacementExpenses(userId, categoryIds, DateTime.UtcNow.Date);

            var existingExpenses = await _context.Expenses
                .Where(expense => expense.UserId == userId)
                .ToListAsync(cancellationToken);
            
            _context.Expenses.RemoveRange(existingExpenses);
            _context.Expenses.AddRange(replacementExpenses);

            await _context.SaveChangesAsync(cancellationToken);
        }

        private async Task EnsureCategoriesExistAsync(CancellationToken cancellationToken)
        {
            var existingCategoryNames = await _context.Categories
                .AsNoTracking()
                .Select(category => category.Name)
                .ToListAsync(cancellationToken);

            var existingNames = existingCategoryNames.ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingCategories = RequiredCategoryNames
                .Where(name => !existingNames.Contains(name))
                .Select(name => new Category
                {
                    Name = name
                })
                .ToList();

            if (missingCategories.Count == 0)
            {
                return;
            }

            _context.Categories.AddRange(missingCategories);
            await _context.SaveChangesAsync(cancellationToken);
        }

        private static List<Expense> BuildReplacementExpenses(string userId, IReadOnlyDictionary<string, int> categoryIds, DateTime today)
        {
            var expenses = new List<Expense>();
            var random = new Random();

            var startDate = today.AddMonths(-3);
            var endDate = today;

            AddRentExpenses(expenses, userId, categoryIds["Rent"], startDate, endDate);

            AddDailyExpenses(expenses, userId, categoryIds, startDate, endDate, random);

            return expenses;
        }

        private static void AddRentExpenses(ICollection<Expense> expenses, string userId, int rentCategoryId, DateTime startDate, DateTime endDate)
        {
            var firstMonth = new DateTime(startDate.Year, startDate.Month, 1);

            for (var month = firstMonth; month <= endDate; month = month.AddMonths(1))
            {
                expenses.Add(new Expense
                {
                    Description = "Rent",
                    Amount = 700m,
                    Date = month,
                    CategoryId = rentCategoryId,
                    UserId = userId
                });
            }
        }

        private static void AddDailyExpenses(ICollection<Expense> expenses, string userId, IReadOnlyDictionary<string, int> categoryIds, DateTime startDate, DateTime endDate, Random random)
        {
            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                if (date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                {
                    expenses.Add(new Expense
                    {
                        Description = "Transport - to work",
                        Amount = 5m,
                        Date = date,
                        CategoryId = categoryIds["Transport"],
                        UserId = userId
                    });

                    expenses.Add(new Expense
                    {
                        Description = "Transport - return",
                        Amount = 5m,
                        Date = date,
                        CategoryId = categoryIds["Transport"],
                        UserId = userId
                    });
                }

                expenses.Add(new Expense
                {
                    Description = "Daily food / lunch",
                    Amount = NextAmount(random, 3m, 12m),
                    Date = date,
                    CategoryId = categoryIds["Food"],
                    UserId = userId
                });

                if (date.DayOfWeek == DayOfWeek.Sunday)
                {
                    expenses.Add(new Expense
                    {
                        Description = "Weekly groceries",
                        Amount = NextAmount(random, 30m, 80m),
                        Date = date,
                        CategoryId = categoryIds["Groceries"],
                        UserId = userId
                    });
                }

                if (random.NextDouble() < 0.15)
                {
                    expenses.Add(new Expense
                    {
                        Description = "Coffee",
                        Amount = NextAmount(random, 1.50m, 4.50m),
                        Date = date,
                        CategoryId = categoryIds["Coffee"],
                        UserId = userId
                    });
                }

                if (random.NextDouble() < 0.08)
                {
                    expenses.Add(new Expense
                    {
                        Description = "Entertainment",
                        Amount = NextAmount(random, 8m, 60m),
                        Date = date,
                        CategoryId = categoryIds["Entertainment"],
                        UserId = userId
                    });
                }

                if (random.NextDouble() < 0.06)
                {
                    expenses.Add(new Expense
                    {
                        Description = "Shopping purchase",
                        Amount = NextAmount(random, 8m, 120m),
                        Date = date,
                        CategoryId = categoryIds["Shopping"],
                        UserId = userId
                    });
                }
            }
        }

        private static decimal NextAmount(Random random, decimal minimum, decimal maximum)
        {
            var range = maximum - minimum;

            return Math.Round(
                minimum + ((decimal)random.NextDouble() * range),
                2);
        }
    }
}