using System.Security.Claims;
using ExpenseTracker.Controllers;
using ExpenseTracker.Data;
using ExpenseTracker.Models;
using ExpenseTracker.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace ExpenseTracker.Tests.TestSupport;

internal static class ControllerTestFactory
{
    public static ExpensesController CreateExpensesController(ApplicationDbContext context, string? authenticatedUserId, IMemoryCache cache, bool isAjax = false)
    {
        var userManager = CreateUserManager();
        var httpContext = new DefaultHttpContext();

        if (!string.IsNullOrWhiteSpace(authenticatedUserId))
        {
            httpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, authenticatedUserId)], authenticationType: "Test"));
        }

        var controller = new ExpensesController(context, userManager, new ExpenseSeedService(context), cache)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            }
        };

        if (isAjax)
        {
            controller.Request.Headers["X-Requested-With"] = "XMLHttpRequest";
        }

        return controller;
    }

    private static UserManager<User> CreateUserManager()
    {
        return new UserManager<User>(
            Mock.Of<IUserStore<User>>(),
            Options.Create(new IdentityOptions()),
            Mock.Of<IPasswordHasher<User>>(),
            Array.Empty<IUserValidator<User>>(),
            Array.Empty<IPasswordValidator<User>>(),
            Mock.Of<ILookupNormalizer>(),
            new IdentityErrorDescriber(),
            Mock.Of<IServiceProvider>(),
            NullLogger<UserManager<User>>.Instance);
    }
}
