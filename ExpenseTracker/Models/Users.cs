using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace ExpenseTracker.Models
{

    public class User : IdentityUser
    {
        public ICollection<Expense> Expenses { get; set; }
    }
}
