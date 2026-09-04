using ExpenseTracker.Data;
using ExpenseTracker.Models;
using ExpenseTracker.Models.Requests;
using ExpenseTracker.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace ExpenseTracker.Controllers
{
    [Authorize]
    public class ExpensesController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly ExpenseSeedService _seedService;
        private readonly IMemoryCache _cache;

        public ExpensesController(
            ApplicationDbContext context,
            UserManager<User> userManager,
            ExpenseSeedService seedService,
            IMemoryCache cache)
        {
            _context = context;
            _userManager = userManager;
            _seedService = seedService;
            _cache = cache;
        }

        public async Task<IActionResult> Index()
        {
            var userId = _userManager.GetUserId(User);

            if (string.IsNullOrWhiteSpace(userId))
            {
                return Challenge();
            }

            var expenses = await _context.Expenses
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .Include(e => e.Category)
                .OrderByDescending(e => e.Date)
                .ToListAsync();

            ViewBag.CategoriesForJS = await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Id)
                .Select(c => new
                {
                    c.Id,
                    c.Name
                })
                .ToListAsync();

            return View(expenses);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(
            CreateExpenseRequest request)
        {
            var userId = _userManager.GetUserId(User);

            if (string.IsNullOrWhiteSpace(userId))
            {
                return Challenge();
            }

            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var categoryId = request.CategoryId!.Value;

            var category = await _context.Categories
                .AsNoTracking()
                .SingleOrDefaultAsync(c => c.Id == categoryId);

            if (category is null)
            {
                ModelState.AddModelError(nameof(request.CategoryId), "Select a valid category.");

                return ValidationProblem(ModelState);
            }

            var expense = new Expense
            {
                Description = request.Description.Trim(),
                Amount = request.Amount!.Value,
                Date = request.Date!.Value,
                CategoryId = categoryId,
                UserId = userId
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            if (IsAjaxRequest())
            {
                return Json(new
                {
                    expense.Id,
                    expense.Description,
                    expense.Amount,
                    expense.Date,
                    expense.CategoryId,
                    CategoryName = category.Name
                });
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(
            int id,
            EditExpenseRequest request)
        {
            var userId = _userManager.GetUserId(User);

            if (string.IsNullOrWhiteSpace(userId))
            {
                return Challenge();
            }

            var expense = await _context.Expenses
                .SingleOrDefaultAsync(e =>
                    e.Id == id &&
                    e.UserId == userId);

            if (expense is null)
            {
                return NotFound();
            }

            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var categoryId = request.CategoryId!.Value;

            var category = await _context.Categories
                .AsNoTracking()
                .SingleOrDefaultAsync(c => c.Id == categoryId);

            if (category is null)
            {
                ModelState.AddModelError(nameof(request.CategoryId), "Select a valid category.");
                return ValidationProblem(ModelState);
            }

            expense.Description = request.Description.Trim();
            expense.Amount = request.Amount!.Value;
            expense.Date = request.Date!.Value;
            expense.CategoryId = categoryId;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return NotFound();
            }

            if (IsAjaxRequest())
            {
                return Json(new
                {
                    expense.Id,
                    expense.Description,
                    expense.Amount,
                    expense.Date,
                    expense.CategoryId,
                    CategoryName = category.Name
                });
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var userId = _userManager.GetUserId(User);

            if (string.IsNullOrWhiteSpace(userId))
            {
                return Challenge();
            }

            var expense = await _context.Expenses.SingleOrDefaultAsync(e => e.Id == id && e.UserId == userId);

            if (expense is null)
            {
                return NotFound();
            }

            _context.Expenses.Remove(expense);

            await _context.SaveChangesAsync();

            if (IsAjaxRequest())
            {
                return NoContent();
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Regenerate(
            CancellationToken cancellationToken)
        {
            var userId = _userManager.GetUserId(User);

            if (string.IsNullOrWhiteSpace(userId))
            {
                return Challenge();
            }

            var cacheKey = $"expense-regenerate:last:{userId}";
            var cooldown = TimeSpan.FromMinutes(2);
            var now = DateTimeOffset.UtcNow;

            if (_cache.TryGetValue<DateTimeOffset>(cacheKey, out var lastRun))
            {
                var remaining = lastRun.Add(cooldown) - now;

                if (remaining > TimeSpan.Zero)
                {
                    return StatusCode(StatusCodes.Status429TooManyRequests, new
                    {
                        success = false,
                        message =
                            $"Please wait {remaining.Minutes}m {remaining.Seconds}s before regenerating again."
                    });
                }
            }

            _cache.Set(cacheKey, now, cooldown);

            try
            {
                await _seedService.RegenerateExpensesAsync(
                    userId,
                    cancellationToken);
            }
            catch
            {
                // A failed request should not consume the cooldown.
                _cache.Remove(cacheKey);
                throw;
            }

            return Ok(new
            {
                success = true,
                message = "Sample expenses loaded."
            });
        }

        private bool IsAjaxRequest()
        {
            return Request.Headers["X-Requested-With"] == "XMLHttpRequest";
        }
    }
}