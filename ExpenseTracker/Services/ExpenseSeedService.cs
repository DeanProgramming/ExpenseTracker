using ExpenseTracker.Data;
using ExpenseTracker.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ExpenseTracker.Services
{
    public class ExpenseSeedService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;
        public ExpenseSeedService(ApplicationDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        //Demo data auto-regenerates when stale but never overwrites user-edited data unless requested
        public async Task<bool> RegenerateExpensesAsync(bool userRequested = false)
        {
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");

            if (user == null)
            {
                user = new User { UserName = "test@example.com", Email = "test@example.com" };
                await _userManager.CreateAsync(user, "Test@123");
            }

            // Categories
            if (!_context.Categories.Any())
            {
                //Need a way to be able to create another category and add it to the colour list
                _context.Categories.AddRange(
                    new Category { Name = "Rent" },
                    new Category { Name = "Transport" },
                    new Category { Name = "Food" },
                    new Category { Name = "Groceries" },
                    new Category { Name = "Coffee" },
                    new Category { Name = "Utilities" },
                    new Category { Name = "Entertainment" },
                    new Category { Name = "Subscriptions" },
                    new Category { Name = "Shopping" },
                    new Category { Name = "Education" },
                    new Category { Name = "Misc" }
                );
                await _context.SaveChangesAsync();
            }

            var categories = _context.Categories.ToList();
            var rentCategory = categories.First(c => c.Name == "Rent");
            var transportCategory = categories.First(c => c.Name == "Transport");
            var foodCategory = categories.First(c => c.Name == "Food");
            var groceriesCategory = categories.First(c => c.Name == "Groceries");
            var entertainmentCategory = categories.First(c => c.Name == "Entertainment");
            var coffeeCategory = categories.First(c => c.Name == "Coffee");

            var random = new Random();

            // Use the same date range for rent and other expenses
            var startDate = DateTime.Now.Date.AddMonths(-3);
            var endDate = DateTime.Now.Date.AddMonths(0); 
            var startOfMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);

            // If page loaded (Not user requested)
            if (userRequested == false)
            {
                bool hasCurrentMonthData = await _context.Expenses.AnyAsync(e =>
                    e.UserId == user.Id &&
                    e.Date >= startOfMonth &&
                    e.Date <= endDate);

                // If theres data in current month leave as is
                if (hasCurrentMonthData)
                {
                    return false; // All good leave (Dont display message)
                } 
            }

            // Wipe data for this user and regenerate data 
            var existingExpenses = await _context.Expenses
                .Where(e =>
                    e.UserId == user.Id)
                .ToListAsync();

            _context.Expenses.RemoveRange(existingExpenses);
            await _context.SaveChangesAsync();

            // Rent entries: first of each month in the date range
            if (!_context.Expenses.Any(e => e.CategoryId == rentCategory.Id && e.UserId == user.Id))
            {
                var rentExpenses = new List<Expense>();
                for (var month = new DateTime(startDate.Year, startDate.Month, 1); month <= endDate; month = month.AddMonths(1))
                {
                    rentExpenses.Add(new Expense
                    {
                        Description = $"Rent",
                        Amount = 700m,
                        Date = month,
                        CategoryId = rentCategory.Id,
                        UserId = user.Id
                    });
                }

                _context.Expenses.AddRange(rentExpenses);
                _context.SaveChanges();
            }

            // Daily transport/food/entertainment pattern
            if (!_context.Expenses.Any(e => e.CategoryId != rentCategory.Id && e.UserId == user.Id))
            {
                var expenses = new List<Expense>();

                for (var date = startDate; date <= endDate; date = date.AddDays(1))
                {
                    // Weekdays: transport to and back (£5 each)
                    if (date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday)
                    {
                        expenses.Add(new Expense
                        {
                            Description = $"Transport - to work",
                            Amount = 5.00m,
                            Date = date,
                            CategoryId = transportCategory.Id,
                            UserId = user.Id
                        });

                        expenses.Add(new Expense
                        {
                            Description = $"Transport - return",
                            Amount = 5.00m,
                            Date = date,
                            CategoryId = transportCategory.Id,
                            UserId = user.Id
                        });
                    }

                    // Daily food (small)
                    var dailyFoodAmount = Math.Round((decimal)(random.NextDouble() * (12.0 - 3.0) + 3.0), 2);
                    expenses.Add(new Expense
                    {
                        Description = $"Daily food / lunch",
                        Amount = dailyFoodAmount,
                        Date = date,
                        CategoryId = foodCategory.Id,
                        UserId = user.Id
                    });

                    // Weekly groceries on Sundays
                    if (date.DayOfWeek == DayOfWeek.Sunday)
                    {
                        var weeklyGroceries = Math.Round((decimal)(random.NextDouble() * (80.0 - 30.0) + 30.0), 2);
                        expenses.Add(new Expense
                        {
                            Description = $"Weekly groceries",
                            Amount = weeklyGroceries,
                            Date = date,
                            CategoryId = groceriesCategory.Id,
                            UserId = user.Id
                        });
                    }

                    // Coffee chance
                    if (random.NextDouble() < 0.15)
                    {
                        var coffeeAmt = Math.Round((decimal)(random.NextDouble() * (4.5 - 1.5) + 1.5), 2);
                        expenses.Add(new Expense
                        {
                            Description = $"Coffee",
                            Amount = coffeeAmt,
                            Date = date,
                            CategoryId = coffeeCategory.Id,
                            UserId = user.Id
                        });
                    }

                    // Entertainment chance
                    if (random.NextDouble() < 0.08)
                    {
                        var entertainmentAmt = Math.Round((decimal)(random.NextDouble() * (60.0 - 8.0) + 8.0), 2);
                        expenses.Add(new Expense
                        {
                            Description = $"Entertainment",
                            Amount = entertainmentAmt,
                            Date = date,
                            CategoryId = entertainmentCategory.Id,
                            UserId = user.Id
                        });
                    }

                    // Occasional shopping
                    if (random.NextDouble() < 0.06)
                    {
                        var shopCat = categories.FirstOrDefault(c => c.Name == "Shopping") ?? categories.First();
                        var shopAmt = Math.Round((decimal)(random.NextDouble() * (120.0 - 8.0) + 8.0), 2);
                        expenses.Add(new Expense
                        {
                            Description = $"Shopping purchase",
                            Amount = shopAmt,
                            Date = date,
                            CategoryId = shopCat.Id,
                            UserId = user.Id
                        });
                    }
                }

                _context.Expenses.AddRange(expenses);
                await _context.SaveChangesAsync();

                return true;
            }

            return false;
        }
    }
}
