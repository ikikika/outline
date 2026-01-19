# Coding Standard (React)

## Contents

- [What?](#what)
- [Why?](#why)
- [How?](#how)
  - [Stack](#stack)
  - [Coding habits](#coding-habits)
    - [1. Focus on code readability](#1-focus-on-code-readability)
    - [2. Turn daily backups into an instinct](#2-turn-daily-backups-into-an-instinct)
    - [3. Leave comments and prioritize documentation](#3-leave-comments-and-prioritize-documentation)
    - [4. Exception Handling](#4-exception-handling)
    - [5. Input Validation](#5-input-validation)
    - [6. Variables](#6-variables)
    - [7. Destructuring](#7-destructuring)
    - [8. File Naming Conventions](#8-file-naming-conventions)
    - [9. CSS ClassName Naming Conventions](#9-css-classname-naming-conventions)
  - [Imports Order](#imports-order)
  - [Readme Standards](#readme-standards)
- [Sources](#sources)

## What?

Coding rules and guidelines that ensure that software is:

- **Safe**
  - It can be used with minimal harm.
- **Secure**
  - It should be as un-hackable as we can make it.
- **Reliable**
  - It functions as it should, every time.
- **Testable**
  - It can be tested at the code level.
- **Maintainable**
  - It can be maintained, even as your codebase grows.
- **Portable**
  - It works the same in every environment.

## Why?

Even the most experienced developer could unintentionally introduce a coding defect. And that one defect could lead to a minor glitch. Or worse, a serious security breach.

Advantages:

- Offers uniformity to the codes created by different engineers.
- Enables the creation of reusable codes.
- Makes it easier to detect errors.
- Makes codes simpler, more readable, and easier to maintain.
- Boost programming efficiency and generate faster results.

## How?

### Stack

A typical modern React setup. Swap pieces when the project already has a clear alternative (e.g. Vitest instead of Jest).

- **React** — UI library: components, hooks, and rendering.
- **TypeScript** — Static types for props, state, and APIs; catches many mistakes before runtime.
- **Vite or Next.js** — App shell and tooling. Vite for SPAs/client apps; Next.js when you want routing, SSR/SSG, and file-based pages.
- **TanStack Query (React Query)** — Server/async state: fetching, caching, retries, and background refetch for APIs.
- **Zod** — Runtime schema validation for forms, env, and API payloads (pairs well with TypeScript).
- **Vitest or Jest + React Testing Library** — Unit/component tests. Vitest is the common default with Vite; Jest remains fine in many codebases. RTL exercises components the way users interact with them.
- **ESLint** — Lint rules for React/TS consistency and common bugs; often paired with Prettier for formatting.

### Coding habits

#### 1. Focus on code readability

Prefer **clear over clever**. Someone else (or future you) should understand the code without a guided tour.

- Use meaningful names for variables, functions, files, and directories — spelling matters for searchability.
- Keep functions short and focused: one function, one job.
- Prefer DRY (Don't Repeat Yourself), but do not abstract so early that the code becomes harder to follow.
- Avoid deep nesting; early returns and small helpers flatten control flow.
- Prefer shorter lines and logical blank lines between related blocks so structure is obvious at a glance.
- Let formatting tools (Prettier/ESLint) handle indentation and spacing consistently.
- It is easier for humans to read blocks of lines that are horizontally short and vertically long.
- Avoid spelling mistakes in variables, files, and directory names for better readability and searchability.

#### 2. Turn daily backups into an instinct

- Multiple events can trigger data loss: system crash, dead battery, software glitch, hardware damage, etc.
- To prevent this, save code daily, and after every modification, no matter how minuscule it may be.
- Back up the workflow on git.

#### 3. Leave comments and prioritize documentation

Do not assume that just because everyone else viewing the code is a developer, they will instinctively understand it without clarification. Devs are human, and it is a lot easier for them to read comments describing code function rather than scanning the code and making speculations.

Take an extra minute to write a comment describing the code function at various points in the script. Ensure that the comments guide any readers through the algorithm and logic implemented. Of course, this is only required when the code's purpose is not apparent.

Remove unnecessarily commented codes to keep codebase clean.

**Do not bother leaving comments on self-explanatory code.**

#### 4. Exception Handling

Failures will happen (network errors, bad API payloads, unexpected nulls). Handle them so the app stays usable and the problem is diagnosable — do not let them fail silently or crash the whole tree when a local fallback will do.

- **Catch at the right layer.** Use `try/catch` (or `.catch`) around async work you own: `fetch`, parsers, storage. Prefer handling errors in data/hooks layers and returning a clear result to the UI, instead of scattering catch blocks in every component.
- **Do not swallow errors.** An empty `catch` hides bugs. Log with context (what failed, relevant ids), then surface a user-facing message or rethrow when the caller should decide.
- **Be specific.** Prefer typed/narrow failures (`if (!res.ok) throw new Error(\`Load user failed: ${res.status}\`)`) over a generic “something went wrong” with no detail for logs.
- **Separate UI crash from data failure.** Render-time React errors need an **Error Boundary** (fallback UI for that subtree). Failed fetches belong in query/`useEffect` error state, not in a boundary.
- **Show recovery in the UI.** Offer retry, go back, or a safe empty state. With TanStack Query, use `isError` / `error` and a Retry action rather than leaving a blank screen.
- **Validate external input.** Treat API and form data as untrusted; validate with something like Zod so bad shapes become expected errors, not random runtime crashes.

```tsx
async function loadProfile(userId: string): Promise<Profile> {
  try {
    const res = await fetch(`/api/users/${userId}`);
    if (!res.ok) {
      throw new Error(`loadProfile failed: ${res.status}`);
    }
    return profileSchema.parse(await res.json());
  } catch (error) {
    console.error("loadProfile", { userId, error });
    throw error; // let the caller show fallback / retry
  }
}
```

#### 5. Input Validation

All user-facing input fields should be validated, at least on the frontend, before submit or side effects. Prefer a schema library (e.g. Zod) so rules stay in one place; still show clear field-level messages in the UI.

- **Required fields:** if a value is not optional, reject `null`, `undefined`, and empty strings (trim whitespace before checking).
- **Types and formats:** emails, phones, dates, and IDs should match the expected shape — not just “non-empty.”
- **Numbers and currency:** parse as numbers; reject NaN; for money, limit decimal places (often 2) and disallow negative amounts unless the domain allows it.
- **Ranges and length:** min/max for numbers, string length, and list size where the product cares.
- **Surface errors early:** disable or block submit while invalid, and show which field failed — do not only fail after the API round-trip.

```tsx
const amountSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Use up to 2 decimal places",
  })
  .transform((value) => Number(value))
  .refine((value) => value > 0, { message: "Amount must be greater than 0" });

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  amount: amountSchema,
});
```

#### 6. Variables

- Variable names should be meaningful.
- `firstName` should be preferred over `fN`.
- Do not use a single identifier for multiple purposes.
- Ascribe a name to each variable that clearly describes its purpose.
- Single variables cannot be assigned multiple values or used for numerous functions. This would confuse everyone reading the code and make future enhancements more difficult to implement.
- Always assign unique variable or argument names.

```tsx
const [ year, setYear ] = useState(2023);
...
const calculateYear = (year) => {
...
```

Can be written as:

```tsx
const [ inputYear, setInputYear ] = useState(2023);
...
const calculateYear = (currentYear) => {
...
```

- Use `const` variables for repeated strings to reduce the risk of spelling mistakes.

```tsx
if (user.role === "admin") {
  ...
}

const adminUsers = users.map(user => user.role === "admin");
...
{
  user.role === "admin" ? <div>{user.name}</div> : null;
}
```

Can be written as:

```tsx
const ADMIN = "admin";
...

if (user.role === ADMIN) {
  ...
}

const adminUsers = users.map(user => user.role === ADMIN);
...
{
  user.role === ADMIN ? <div>{user.name}</div> : null;
}
```

- Use a variable or helper method for complicated expressions to improve code readability.
- If there are too many `&&` or `||` in a condition and/or the condition is repeated multiple times, it is a good idea to assign it to a variable.

```tsx
if (user.active && user.role === ADMIN) {
  ...
}
```

Can be written as:

```tsx
const activeAdmin = user.active && user.role === ADMIN;

if (activeAdmin) {
  ...
}
```

- If it requires more calculation with context, convert it to a helper method.

```tsx
{
  user.active &&
  user.noOfAttempts > 3 &&
  (Date.now() - user.lastLoginAttempt >= 60000)
    ? <div>You can log in</div>
    : <div>You are not allowed to login. Please try again.</div>
}
```

Can be written as:

```tsx
const canAttemptLogin = ({ active, noOfAttempts, lastLoginAttempt }) => {
  return (
    active &&
    noOfAttempts > 3 &&
    (Date.now() - lastLoginAttempt >= 60000)
  );
};
...
{
  canAttemptLogin(user)
    ? <div>You can log in</div>
    : <div>You are not allowed to login. Please try again.</div>
}
```

#### 7. Destructuring

Prefer destructuring for cleaner React/TypeScript code — props, nested state, and API payloads.

**Props**

```tsx
const UserInfo = (props: { firstName: string; lastName: string }) => (
  <div>Name: {props.firstName} {props.lastName}</div>
);
```

Can be written as:

```tsx
const UserInfo = ({ firstName, lastName }: { firstName: string; lastName: string }) => (
  <div>Name: {firstName} {lastName}</div>
);
```

**Nested state**

```tsx
const city = formState.address.city;
const country = formState.address.country;
```

Can be written as:

```tsx
const { city, country } = formState.address;
```

**API response**

```tsx
const name = data.user.profile.name;
const email = data.user.profile.email;
```

Can be written as:

```tsx
const { name, email } = data.user.profile;
```

#### 8. File Naming Conventions

- File and directory names should be meaningful.
- Component names should be in pascal case.

```text
ComponentOne.tsx
Header.tsx
NewsArticle.tsx
```

- Non-component names should be in camel case.

```text
useMyCustomHook.ts
fetchApi.ts
myUtilityFile.ts
```

- Unit tests should use the same names as their corresponding file.

```text
ComponentOne.tsx
ComponentOne.test.tsx
```

- Attributes/Props should be camel case.

```text
className
onClick
someCustomAttribute
```

#### 9. CSS ClassName Naming Conventions

- Use this pattern: `{project}-{module}-{component}-{part}`.
- Container vs Wrapper:
  - Wrapper contains parts that make up one component.
  - Container contains different components and wrappers.

Wrapper example:

```tsx
<div className="project-form-input-wrapper">
  <div className="project-form-input-label">Label</div>
  <div className="project-form-input-field"><input /></div>
</div>
```

Container example:

```tsx
<div className="project-form-container">
  <div className="project-form-input-wrapper">
    ...
  </div>
  <div className="project-form-input-wrapper">
    ...
  </div>
  <ButtonComponent />
</div>
```

### Imports Order

- React import.
- Library imports in alphabetical order.
- Absolute imports from the project in alphabetical order.
- Relative imports in alphabetical order.
- `import * as`.
- `import ./filename.extension`.

### Readme Standards

- Intro
- Getting Started
- Build and test
- Contribution guide

More info: [Create a README for your Git repo](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-a-readme?view=azure-devops)

## Sources

- [Coding Standards and Best Practices to Follow](https://www.browserstack.com/guide/coding-standards-best-practices)
- [Coding Best Practices](https://www.devbridge.com/articles/coding-best-practices/)
- [React Coding Standards and Practices to Level Up Your Code](https://www.jondjones.com/frontend/react/react-tutorials/react-coding-standards-and-practices-to-level-up-your-code/)
- [React Coding Standards and Practices](https://medium.com/@navitasinghal77/react-coding-standards-and-practices-3b133bcaea8)