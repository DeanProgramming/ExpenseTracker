using System.ComponentModel.DataAnnotations;

namespace ExpenseTracker.Models.Requests;

public sealed class CreateExpenseRequest
{
    [Required]
    [StringLength(200)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(
        typeof(decimal),
        "0.01",
        "9999999999999999.99",
        ErrorMessage = "Amount must be greater than zero.")]
    public decimal? Amount { get; set; }

    [Required]
    [DataType(DataType.Date)]
    public DateTime? Date { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Select a valid category.")]
    public int? CategoryId { get; set; }
}