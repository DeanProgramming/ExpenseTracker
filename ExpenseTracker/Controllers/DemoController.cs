using ExpenseTracker.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseTracker.Controllers;

[AllowAnonymous]
[Route("Demo")]
public sealed class DemoController : Controller
{
    // No POST actions. All demo expense changes happen in browser memor
    [HttpGet("")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Index()
    {
        return View(DemoExpenseData.Create());
    }
}
