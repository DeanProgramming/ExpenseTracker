using System.Reflection;
using ExpenseTracker.Controllers;
using ExpenseTracker.Models.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseTracker.Tests.Security;

public sealed class SecurityContractTests
{
    [Fact]
    public void ExpensesController_IsProtectedByAuthorizeAttribute()
    {
        var attribute = typeof(ExpensesController).GetCustomAttribute<AuthorizeAttribute>(inherit: true);

        Assert.NotNull(attribute);
    }

    [Fact]
    public void MutationActions_UsePostAndValidateAntiforgeryToken()
    {
        MethodInfo[] mutationActions =
        [
            GetAction(nameof(ExpensesController.Create)),
            GetAction(nameof(ExpensesController.Edit)),
            GetAction(nameof(ExpensesController.DeleteConfirmed)),
            GetAction(nameof(ExpensesController.Regenerate))
        ];

        Assert.All(mutationActions, action =>
        {
            Assert.NotNull(action.GetCustomAttribute<HttpPostAttribute>(inherit: true));
            Assert.NotNull(action.GetCustomAttribute<ValidateAntiForgeryTokenAttribute>(inherit: true));
        });
    }

    [Fact]
    public void DemoController_IsAnonymousAndContainsNoPostActions()
    {
        var allowAnonymous = typeof(DemoController).GetCustomAttribute<AllowAnonymousAttribute>(inherit: true);

        var declaredActions = typeof(DemoController).GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);

        Assert.NotNull(allowAnonymous);
        Assert.DoesNotContain(declaredActions, action => action.GetCustomAttribute<HttpPostAttribute>(inherit: true) is not null);
    }

    [Fact]
    public void ExpenseRequestModels_ExposeOnlyEditableFields()
    {
        string[] expectedProperties = ["Amount", "CategoryId", "Date", "Description"];

        Assert.Equal(expectedProperties, GetPropertyNames<CreateExpenseRequest>());
        Assert.Equal(expectedProperties, GetPropertyNames<EditExpenseRequest>());
    }

    private static MethodInfo GetAction(string name) => typeof(ExpensesController).GetMethod(name) ?? throw new InvalidOperationException($"Action '{name}' was not found.");

    private static string[] GetPropertyNames<T>() =>
        typeof(T)
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Select(property => property.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();
}
