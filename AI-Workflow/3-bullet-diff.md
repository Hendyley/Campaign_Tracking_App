
  ### Provide the prompt you used, the raw AI output, and a 3-bullet diff explaining what you changed and why.
  ---
  Prompt used and raw AI output are stored in `AI-Workflow/AIprompt.mhtml`
  3-bullet diff is stored in `AI-Workflow/3-bullet-diff.md`

  3-bullet diff explaining what you changed and why.
  1. Enforced the paging limits inside the method 
  - What changed: Added line
    ```
    pageSize = Math.Clamp(pageSize, 1, MaxPageSize) 
    page = Math.Clamp(page, 1, int.MaxValue / pageSize)
    ```
  - Why: The AI’s code has no limits, and its checklist only says to cap pageSize at the caller or service level, which leaves it unenforced. Without the clamp, a negative page gives a negative Skip, pageSize = 0 returns nothing, a huge pageSize loads the whole table (the same unbounded problem as issue 2), and a very large page overflows (page - 1) * pageSize.
  
  2. Wrapped the method in IOrderService and OrderService (critical: architecture)
  - What changed: The AI’s bare method that reads _context became a service class behind an interface, registered with AddScoped.
  - Why: The AI flagged “mixed responsibilities” (issue 9) but its fix is still a loose method with no home. The interface lets controllers depend on an abstraction and be tested without a database. It matches ICampaignService in this repo, and the DbContext lifetime follows the service.

  3. Remove OrderDate 
  - What changed: Remove OrderDate reference
  - Why: because the AI said it was assuming that property exists but the prompt never mentions it.
