namespace ExpenseTracker.Models.ViewModels;

// Presentation-only records.  
public sealed record ExpenseDashboardViewModel(string CurrentMonth, IReadOnlyList<DemoExpenseViewModel> Expenses, IReadOnlyList<DemoCategoryViewModel> Categories);

public sealed record DemoExpenseViewModel(int Id, string Description, decimal Amount, string Date, int CategoryId, string CategoryName);

public sealed record DemoCategoryViewModel(int Id, string Name, string Color);
