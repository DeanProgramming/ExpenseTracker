using System.ComponentModel.DataAnnotations;
using ExpenseTracker.Models.Requests;

namespace ExpenseTracker.Tests.Models;

public sealed class ExpenseRequestValidationTests
{
    [Fact]
    public void CreateRequest_WithValidValues_IsValid()
    {
        var request = ValidCreateRequest();

        var errors = Validate(request);

        Assert.Empty(errors);
    }

    [Fact]
    public void CreateRequest_WithBlankDescription_IsInvalid()
    {
        var request = ValidCreateRequest();
        request.Description = "   ";

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(CreateExpenseRequest.Description)));
    }

    [Fact]
    public void CreateRequest_WithZeroAmount_IsInvalid()
    {
        var request = ValidCreateRequest();
        request.Amount = 0m;

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(CreateExpenseRequest.Amount)));
    }

    [Fact]
    public void EditRequest_WithoutDateOrCategory_IsInvalid()
    {
        var request = new EditExpenseRequest
        {
            Description = "Train ticket",
            Amount = 19.50m,
            Date = null,
            CategoryId = null
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(EditExpenseRequest.Date)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(EditExpenseRequest.CategoryId)));
    }

    private static CreateExpenseRequest ValidCreateRequest() => new()
    {
        Description = "Lunch",
        Amount = 8.75m,
        Date = new DateTime(2026, 9, 5),
        CategoryId = 1
    };

    private static IReadOnlyList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();

        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);

        return results;
    }
}
