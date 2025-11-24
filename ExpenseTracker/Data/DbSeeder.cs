using ExpenseTracker.Models;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ExpenseTracker.Data
{
    public static class DbSeeder
    {
        public static void Seed(ApplicationDbContext context, UserManager<User> userManager)
        {
            context.Database.EnsureCreated();

            var user = userManager.Users.FirstOrDefault(u => u.Email == "test@example.com");
            if (user == null)
            {
                user = new User { UserName = "test@example.com", Email = "test@example.com" };
                userManager.CreateAsync(user, "Test@123").Wait();
            }

            // Categories
            if (!context.Categories.Any())
            {
                //Need a way to be able to create another category and add it to the colour list
                context.Categories.AddRange(
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
                context.SaveChanges();
            }

            var categories = context.Categories.ToList();
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

            // Rent entries: first of each month in the date range
            if (!context.Expenses.Any(e => e.CategoryId == rentCategory.Id))
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

                context.Expenses.AddRange(rentExpenses);
                context.SaveChanges();
            }

            // Daily transport/food/entertainment pattern
            if (!context.Expenses.Any(e => e.CategoryId != rentCategory.Id))
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

                context.Expenses.AddRange(expenses);
                context.SaveChanges();
            }
        }
    }
}
