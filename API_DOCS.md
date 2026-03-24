## CinePanda Backend API Reference

This document describes all REST APIs exposed by the CinePanda backend for use by frontend clients and agents.

- **Base URL (local)**: `http://localhost:3000` (or `http://localhost:${PORT}` if you override `PORT` in `.env`; current `.env` uses `8000`)
- **API prefix**: all routes start with `/api/...`
- **Auth scheme**: JWT in the `Authorization` header as `Bearer <token>` for all routes except `/api/auth/login`.
- **Content type**: all requests/JSON bodies are `application/json`.

---

## Authentication

### POST `/api/auth/login`

- **Auth**: not required
- **Description**: Authenticate the admin user and return a JWT token.
- **Request body**:
  - `username` (string, required)
  - `password` (string, required)
- **Responses**:
  - `200 OK`
    - Body:
      - `success` (boolean) – `true`
      - `token` (string) – JWT token, valid for 7 days
      - `message` (string) – `"Login successful"`
  - `400 Bad Request`
    - Missing username or password
    - Body: `{ "error": "Username and password are required" }`
  - `401 Unauthorized`
    - Invalid credentials
    - Body: `{ "error": "Invalid credentials" }`

**Usage (frontend)**:
- Call this once with admin credentials.
- Store the token securely (e.g. in memory or httpOnly cookie).
- Add header `Authorization: Bearer <token>` to all subsequent `/api/*` calls.

---

## Users

All user routes require authentication.

### GET `/api/users`

- **Auth**: required
- **Description**: List all users.
- **Query params**: none
- **Responses**:
  - `200 OK`
    - Body: array of user objects:
      - `_id` (string)
      - `name` (string)
      - `email` (string)

### GET `/api/users/:id`

- **Auth**: required
- **Description**: Get a single user by ID.
- **Path params**:
  - `id` (string, MongoDB ObjectId)
- **Responses**:
  - `200 OK` – user object as above
  - `404 Not Found`
    - `{ "message": "User not found" }`

### POST `/api/users`

- **Auth**: required
- **Description**: Create a new user.
- **Request body**:
  - `name` (string, required)
  - `email` (string, required, unique)
- **Responses**:
  - `201 Created` – created user object
  - `400 Bad Request`
    - Missing `name` or `email` or validation error.

---

## Leads

All lead routes require authentication. Lead objects follow the `Lead` model:

- `customerName` (string, required)
- `place` (string, required)
- `contactNumber` (string, required)
- `leadSource` (string, required, must match an active document in `leadsources` collection)
- `leadDate` (ISO date, required)
- `lastUpdate` (ISO date, required)
- `nextCallTime` (ISO date, optional)
- `priorityType` (string, required, must match `prioritytypes` collection)
- `status` (string, default `"OPEN"`, must match `leadstatuses` collection; e.g. `OPEN`, `CLOSED_WON`, `CLOSED_LOST`, etc.)
- `requirement` (string, required)
- `statusDescription` (string, required)
- `createdAt` / `updatedAt` (server timestamps)
- Unique key: (`customerName`, `contactNumber`)

### GET `/api/leads`

- **Auth**: required
- **Description**: Paginated, filterable list of leads.
- **Query params**:
  - `page` (number, optional, default `1`, must be >= 1)
  - `limit` (number, optional, default `10`, range 1–100)
  - `search` (string, optional)
  - `startDate` (ISO date string, optional)
  - `endDate` (ISO date string, optional)
  - `leadSource` (string, optional)
  - `priorityType` (string, optional)
  - `status` (string, optional)
- **Responses**:
  - `200 OK`
    - Body:
      - `success` (boolean)
      - `data` (array of lead objects)
      - `pagination`:
        - `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev`
      - `filters` – echo of applied filters (or `null` when not used)
  - `400 Bad Request`
    - Invalid pagination:
    - Body: `{ success: false, error: "Invalid pagination parameters. Page must be >= 1, limit must be 1-100" }`

### GET `/api/leads/open`

- **Description**: All open leads (status considered "open" by service).
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Lead[], count: number }`

### GET `/api/leads/closed`

- **Description**: All closed leads.
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Lead[], count: number }`

### GET `/api/leads/followup`

- **Description**: Open leads whose `nextCallTime` is on or before the target date (optionally shifted by a period).
- **Query params**:
  - `date` (ISO date string, required, `YYYY-MM-DD`)
  - `period` (string, optional; add offset to `date` using pattern `\\d+[DMY]`, e.g. `1D`, `7D`, `1M`, `3Y`)
- **Responses**:
  - `200 OK`
    - Body:
      - `success` (true)
      - `data` (Lead[])
      - `count` (number)
      - `filters`:
        - `date` (string, normalized `YYYY-MM-DD`)
        - `period` (string, default `'none'` if not provided)
        - `status` (string, `'OPEN'`)
  - `400 Bad Request`
    - Missing `date`:
      - `{ success: false, error: "Date parameter is required" }`
    - Invalid `date`:
      - `{ success: false, error: "Invalid date format. Use YYYY-MM-DD format" }`

### GET `/api/leads/status/:status`

- **Description**: Leads filtered by a specific status.
- **Path params**:
  - `status` (string)
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Lead[], count: number }`

### GET `/api/leads/:id`

- **Description**: Get a single lead by ID.
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Lead }`
  - `404 Not Found`
    - `{ success: false, error: "Lead not found" }`

### POST `/api/leads`

- **Description**: Create a new lead.
- **Request body**: Full lead payload (see model fields above). At minimum:
  - `customerName` (string)
  - `place` (string)
  - `contactNumber` (string)
  - `leadSource` (string – must be a valid enum via DB)
  - `leadDate` (ISO date)
  - `lastUpdate` (ISO date)
  - `priorityType` (string)
  - `status` (string, optional; default `"OPEN"`)
  - `requirement` (string)
  - `statusDescription` (string)
- **Responses**:
  - `201 Created`
    - `{ success: true, data: Lead, message: "Lead created successfully" }`
  - `400 Bad Request`
    - Mongoose validation errors (e.g. invalid enum, missing fields).

### PUT `/api/leads/:id`

- **Description**: Update a lead (full update semantics, server does not enforce full replacement but you should send all relevant fields).
- **Request body**: Any updatable lead fields.
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Lead, message: "Lead updated successfully" }`
  - `404 Not Found`
    - `{ success: false, error: "Lead not found" }`

### PATCH `/api/leads/:id/status`

- **Description**: Update only the status (and optional description) of a lead.
- **Request body**:
  - `status` (string, required; must be a valid status value)
  - `statusDescription` (string, optional)
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Lead, message: "Lead status updated successfully" }`
  - `400 Bad Request`
    - Missing `status`.
  - `404 Not Found`
    - `{ success: false, error: "Lead not found" }`

### PATCH `/api/leads/:id/close`

- **Description**: Close a lead with a final status and reason.
- **Request body**:
  - `status` (string, required; must be either `"CLOSED_WON"` or `"CLOSED_LOST"`)
  - `reason` (string, optional but recommended)
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Lead, message: "Lead closed won successfully" }` or `"Lead closed lost successfully"` depending on status
  - `400 Bad Request`
    - Invalid `status`:
      - `{ success: false, error: "Status must be CLOSED_WON or CLOSED_LOST" }`
  - `404 Not Found`
    - `{ success: false, error: "Lead not found" }`

### DELETE `/api/leads/:id`

- **Description**: Delete a lead.
- **Responses**:
  - `200 OK`
    - `{ success: true, message: "Lead deleted successfully" }`
  - `404 Not Found`
    - `{ success: false, error: "Lead not found" }`

### GET `/api/leads/enums/sources`

- **Description**: List active lead sources (from `leadsources` collection).
- **Responses**: `200 OK` â€“ `{ success: true, data: LeadSource[], count: number }`

### GET `/api/leads/enums/statuses`

- **Description**: List active lead statuses (from `leadstatuses` collection).
- **Responses**: `200 OK` â€“ `{ success: true, data: LeadStatus[], count: number }`

### GET `/api/leads/enums/priorities`

- **Description**: List active priority types (from `prioritytypes` collection).
- **Responses**: `200 OK` â€“ `{ success: true, data: PriorityType[], count: number }`

---

## Quotations

Quotations are created for customers, optionally from templates, and can be turned into projects.

**Core fields (simplified)**:
- `templateId` (ObjectId, optional)
- `customerId` (ObjectId, required)
- `groups` (array of groups)
- `manualItems` (array of manual items at quotation level)
- `productSubtotal` (number)
- `manualItemsTotal` (number)
- `grandTotal` (number)
- `notes` (string, optional)
- `status` (`"PENDING" | "APPROVED" | "REJECTED"`)
- `projectId` (ObjectId, optional)
- `createdAt`, `updatedAt`

**Group structure**:
- `name` (string)
- `productItems`:
  - `productId` (ObjectId, optional)
  - `productName` (string)
  - `category` (string)
  - `subcategory` (string)
  - `quantity` (number)
  - `unitPrice` (number)
  - `lineTotal` (number)
- `manualItems`:
  - `name` (string)
  - `description` (string, optional)
  - `type` (`"service" | "tax" | "discount" | "other"`)
  - `amount` (number)
  - `isPercentage` (boolean)
  - `resolvedAmount` (number)
- `subtotal` (number)

### GET `/api/quotations`

- **Auth**: required
- **Description**: List all quotations (no pagination in controller).
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Quotation[], count: number }`

### GET `/api/quotations/:id`

- **Description**: Get a quotation by ID.
- **Responses**:
  - `200 OK` – `{ success: true, data: Quotation }`
  - `404 Not Found` – `{ success: false, error: "Quotation not found" }`

### POST `/api/quotations`

- **Description**: Create a quotation from scratch.
- **Request body** (simplified, must conform to service expectations):
  - `customerId` (string, required)
  - `templateId` (string, optional)
  - `groups` (array, required):
    - each group:
      - `name` (string)
      - `productItems` (array of product item objects, see model)
      - `manualItems` (array of manual items, optional)
  - `manualItems` (array of quotation-level manual items, optional)
  - `notes` (string, optional)
- **Responses**:
  - `201 Created`
    - `{ success: true, data: Quotation, message: "Quotation created successfully" }`

### POST `/api/quotations/from-template`

- **Description**: Create a quotation by copying an existing template snapshot.
- **Request body**:
  - `templateId` (string, required)
  - `customerId` (string, required)
  - `manualItems` (array of additional top-level manual items, optional)
  - `notes` (string, optional)
- **Responses**:
  - `201 Created`
    - `{ success: true, data: Quotation, message: "Quotation created from template" }`
  - `400 Bad Request`
    - Missing `templateId` or `customerId`.

### PUT `/api/quotations/:id`

- **Description**: Update a quotation.
- **Request body**: any fields allowed by the service (e.g. groups, manualItems, notes, etc.).
- **Responses**:
  - `200 OK` – `{ success: true, data: Quotation, message: "Quotation updated successfully" }`
  - `404 Not Found` – `{ success: false, error: "Quotation not found" }`

### PATCH `/api/quotations/:id/status`

- **Description**: Update the status of a quotation.
- **Request body**:
  - `status` (string, required; must be `"PENDING"`, `"APPROVED"`, or `"REJECTED"`)
- **Responses**:
  - `200 OK` – `{ success: true, data: Quotation, message: "Status updated successfully" }`
  - `400 Bad Request` – invalid status.
  - `404 Not Found` – quotation not found.

### DELETE `/api/quotations/:id`

- **Description**: Delete a quotation.
- **Responses**:
  - `200 OK` – `{ success: true, message: "Quotation deleted successfully" }`
  - `404 Not Found` – `{ success: false, error: "Quotation not found" }`

### GET `/api/quotations/:id/pdf`

- **Description**: Generate a PDF of a quotation and stream it as a download.
- **Responses**:
  - `200 OK`
    - Headers:
      - `Content-Type: application/pdf`
      - `Content-Disposition: attachment; filename=quotation-<id>.pdf`
    - Body: PDF binary.
  - `404 Not Found` – `{ success: false, error: "Quotation not found" }`

---

## Projects

Projects are typically created from quotations but can be managed separately.

**Project model (simplified)**:
- `quotationId` (ObjectId, optional)
- `customerId` (ObjectId, optional)
- `clientName` (string, required)
- `serviceType` (string, required)
- `projectValue` (number, required)
- `startDate` (ISO date, required)
- `expectedCompletionDate` (ISO date, required)
- `status` (`"ONGOING" | "COMPLETED"`, default `"ONGOING"`)
- `createdAt`, `updatedAt`

### GET `/api/projects`

- **Auth**: required
- **Description**: List projects; can be filtered by status/date.
- **Query params**:
  - `status` (string, optional; e.g. `"ONGOING"` or `"COMPLETED"`)
  - `startDate` (ISO date string, optional)
  - `endDate` (ISO date string, optional)
- **Responses**:
  - `200 OK`
    - `{ success: true, data: Project[], count: number }`

### GET `/api/projects/:id`

- **Description**: Get a single project by ID.
- **Responses**:
  - `200 OK` – `{ success: true, data: Project }`
  - `404 Not Found` – `{ success: false, error: "Project not found" }`

### POST `/api/projects`

- **Description**: Create a new project.
- **Request body**:
  - `quotationId` (string, optional)
  - `customerId` (string, optional)
  - `clientName` (string, required)
  - `serviceType` (string, required)
  - `projectValue` (number, required)
  - `startDate` (ISO date, required)
  - `expectedCompletionDate` (ISO date, required)
- **Responses**:
  - `201 Created`
    - `{ success: true, data: Project, message: "Project created successfully" }`

### PUT `/api/projects/:id`

- **Description**: Update a project.
- **Request body**: any updatable fields (e.g. `status`, `expectedCompletionDate`, etc.).
- **Responses**:
  - `200 OK` – `{ success: true, data: Project, message: "Project updated successfully" }`
  - `404 Not Found` – `{ success: false, error: "Project not found" }`

### DELETE `/api/projects/:id`

- **Description**: Delete a project.
- **Responses**:
  - `200 OK` – `{ success: true, message: "Project deleted successfully" }`
  - `404 Not Found` – `{ success: false, error: "Project not found" }`

---

## Ledger

Ledger entries track income and expenses, optionally tied to a project.

**LedgerEntry model (simplified)**:
- `projectId` (string, optional)
- `entryType` (`"INCOME" | "EXPENSE"`, required)
- `category` (string, required)
- `amount` (number, required)
- `description` (string, required)
- `entryDate` (ISO date, required)
- `createdAt`, `updatedAt`

### GET `/api/ledger`

- **Auth**: required
- **Description**: List ledger entries, optionally filtered.
- **Query params**:
  - `startDate` (ISO date, optional)
  - `endDate` (ISO date, optional)
  - `entryType` (`"INCOME"` or `"EXPENSE"`, optional)
  - `projectId` (string, optional)
- **Responses**:
  - `200 OK`
    - `{ success: true, data: LedgerEntry[], count: number }`

### POST `/api/ledger`

- **Description**: Create a ledger entry.
- **Request body**:
  - `projectId` (string, optional)
  - `entryType` (`"INCOME" | "EXPENSE"`)
  - `category` (string)
  - `amount` (number)
  - `description` (string)
  - `entryDate` (ISO date)
- **Responses**:
  - `201 Created`
    - `{ success: true, data: LedgerEntry, message: "Ledger entry created successfully" }`

### DELETE `/api/ledger/:id`

- **Description**: Delete a ledger entry.
- **Responses**:
  - `200 OK` – `{ success: true, message: "Ledger entry deleted successfully" }`
  - `404 Not Found` – `{ success: false, error: "Ledger entry not found" }`

---

## Dashboard

### GET `/api/dashboard/projects-overview`

- **Auth**: required
- **Description**: Summarized overview of projects and financials.
- **Responses**:
  - `200 OK`
    - `{ success: true, data: { totalProjects: number, totalIncome: number, netProfit: number, ... } }`
    - Exact shape of `data` is defined by `DashboardService#getProjectsOverview` (not shown in controller), but at least includes the fields logged above.

---

## Products

Products represent catalog items used in templates and quotations.

**Product model (simplified)**:
- `name` (string, required)
- `description` (string, optional)
- `category` (string, required)
- `subcategory` (string, required)
- `brand` (string, optional)
- `productModel` (string, optional)
- `price` (number, required)
- `unit` (string, required, e.g. `"per piece"`, `"per sq ft"`)
- `specifications` (object, key-value specs)
- `isActive` (boolean, default `true`)
- `createdAt`, `updatedAt`

### GET `/api/products`

- **Auth**: required
- **Description**: Paginated, filterable list of products.
- **Query params**:
  - `page` (number, optional, default 1)
  - `limit` (number, optional, default 10, 1–100)
  - `search` (string, optional; uses text index on name, description, brand, productModel)
  - `category` (string, optional)
  - `subcategory` (string, optional)
  - `brand` (string, optional)
  - `isActive` (`"true"` or `"false"`, optional)
- **Responses**:
  - `200 OK`
    - Body:
      - `success` (true)
      - `data` (Product[])
      - `pagination` object with:
        - `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev`
      - `filters` – echo of applied filters
  - `400 Bad Request`
    - Invalid pagination parameters (same message as leads).

### GET `/api/products/:id`

- **Description**: Get a product by ID.
- **Responses**:
  - `200 OK` – `{ success: true, data: Product }`
  - `404 Not Found` – `{ success: false, error: "Product not found" }`

### POST `/api/products`

- **Description**: Create a new product.
- **Request body**:
  - `name`, `category`, `subcategory`, `price`, `unit` (required)
  - `description`, `brand`, `productModel`, `specifications`, `isActive` (optional)
- **Responses**:
  - `201 Created` – `{ success: true, data: Product, message: "Product created successfully" }`

### PUT `/api/products/:id`

- **Description**: Update a product.
- **Request body**: any product fields.
- **Responses**:
  - `200 OK` – `{ success: true, data: Product, message: "Product updated successfully" }`
  - `404 Not Found` – `{ success: false, error: "Product not found" }`

### DELETE `/api/products/:id`

- **Description**: Soft-delete or deactivate a product (via service).
- **Responses**:
  - `200 OK` – `{ success: true, message: "Product deleted successfully" }`
  - `404 Not Found` – `{ success: false, error: "Product not found" }`

---

## Product Categories & Specifications

Represents high-level product categories, their subcategories, and spec templates.

**ProductCategory model (simplified)**:
- `name` (string, unique)
- `subcategories` (string[])
- `isActive` (boolean)
- `createdAt`, `updatedAt`

> All routes below are under `/api/product-categories`.

### GET `/api/product-categories/list`

- **Auth**: required
- **Description**: List all categories with their subcategories.
- **Responses**:
  - `200 OK` – `{ success: true, data: ProductCategory[], count: number }`

### POST `/api/product-categories`

- **Description**: Create a new category.
- **Request body**:
  - `name` (string, required)
  - `subcategories` (string[], optional)
- **Responses**:
  - `201 Created` – `{ success: true, data: ProductCategory, message: "Category created successfully" }`
  - `400 Bad Request` – missing `name`.

### PUT `/api/product-categories/:categoryName`

- **Description**: Update a category (e.g. name or subcategories).
- **Request body**: fields to update (typically `name`, `subcategories`, `isActive`).
- **Responses**:
  - `200 OK` – `{ success: true, data: ProductCategory, message: "Category updated successfully" }`

### DELETE `/api/product-categories/:categoryName`

- **Description**: Delete (or deactivate) a category.
- **Responses**:
  - `200 OK` – `{ success: true, message: "Category deleted successfully" }`
  - `404 Not Found` – `{ success: false, error: "Category not found" }`

### GET `/api/product-categories/:categoryName/subcategories`

- **Description**: Get subcategories for a given category.
- **Responses**:
  - `200 OK`
    - `{ success: true, data: string[], category: string }`

### POST `/api/product-categories/:categoryName/subcategories`

- **Description**: Add a subcategory to a category.
- **Request body**:
  - `subcategory` (string, required)
- **Responses**:
  - `201 Created`
    - `{ success: true, data: ProductCategory, message: "Subcategory added successfully" }`
  - `400 Bad Request` – missing `subcategory`.

### PUT `/api/product-categories/:categoryName/subcategories/:subcategoryName`

- **Description**: Rename a subcategory.
- **Request body**:
  - `newName` (string, required)
- **Responses**:
  - `200 OK` – `{ success: true, data: ProductCategory, message: "Subcategory updated successfully" }`
  - `400 Bad Request` – missing `newName`.

### DELETE `/api/product-categories/:categoryName/subcategories/:subcategoryName`

- **Description**: Delete a subcategory.
- **Responses**:
  - `200 OK` – `{ success: true, data: ProductCategory, message: "Subcategory deleted successfully" }`

### GET `/api/product-categories/specifications`

- **Description**: Get specification template metadata for a subcategory, or list available subcategories.
- **Query params**:
  - `subcategory` (string, optional)
- **Responses**:
  - If `subcategory` is omitted:
    - `200 OK`
      - `{ success: true, data: string[], message: "Pass ?subcategory=<name> to get the specification template for that subcategory" }`
  - If `subcategory` is provided:
    - `200 OK`
      - `{ success: true, subcategory: string, data: <specTemplateObject> }`

---

## Templates

Templates are reusable quotation blueprints consisting of groups and items.

**Template model (simplified)**:
- `name` (string, required)
- `description` (string, optional)
- `groups` (array of template groups)
- `manualItems` (array of manual items)
- `grandTotal` (number)
- `isActive` (boolean)
- `createdAt`, `updatedAt`

> All routes below are under `/api/templates`.

### POST `/api/templates/suggest`

- **Auth**: required
- **Description**: Suggest a template configuration given some input (exact behavior defined in `template.controller#suggest`).
- **Request body**: depends on implementation (not shown in controller here); treat as an AI-like helper endpoint.
- **Responses**:
  - `200 OK` – suggestion result (shape defined by controller/service).

### GET `/api/templates`

- **Description**: List all templates.
- **Responses**:
  - `200 OK` – `{ success: true, data: Template[] }`

### POST `/api/templates`

- **Description**: Create a new template.
- **Request body**:
  - `name` (string, required)
  - `description` (string, optional)
  - `groups` (array, structured like `ITemplateGroup`)
  - `manualItems` (array of `IManualItem`)
- **Responses**:
  - `201 Created` – `{ success: true, data: Template }`

### GET `/api/templates/:id`

- **Description**: Get a template by ID.
- **Responses**:
  - `200 OK` – `{ success: true, data: Template }`

### PUT `/api/templates/:id`

- **Description**: Update a template.
- **Request body**: any updatable template fields.
- **Responses**:
  - `200 OK` – `{ success: true, data: Template }`

### DELETE `/api/templates/:id`

- **Description**: Delete or deactivate a template.
- **Responses**:
  - `200 OK` – `{ success: true, message: "Template deleted" }` (exact message depends on controller)

---

## Customers

Represents customers / clients used in leads, quotations, and projects.

**Customer model (simplified)**:
- `name` (string, required)
- `email` (string, optional)
- `phone` (string, required)
- `place` (string, required)
- `notes` (string, optional)
- `createdAt`, `updatedAt`

> All routes below are under `/api/customers`.

### GET `/api/customers`

- **Auth**: required
- **Description**: Get all customers or search by term.
- **Query params**:
  - `search` (string, optional) – performs text-like search in service.
- **Responses**:
  - `200 OK` – `{ success: true, data: Customer[], count: number }`

### GET `/api/customers/:id`

- **Description**: Get a customer by ID.
- **Responses**:
  - `200 OK` – `{ success: true, data: Customer }`
  - `404 Not Found` – `{ success: false, error: "Customer not found" }`

### POST `/api/customers`

- **Description**: Create a new customer.
- **Request body**:
  - `name` (string, required)
  - `email` (string, optional)
  - `phone` (string, required)
  - `place` (string, required)
  - `notes` (string, optional)
- **Responses**:
  - `201 Created` – `{ success: true, data: Customer, message: "Customer created successfully" }`

### PUT `/api/customers/:id`

- **Description**: Update a customer.
- **Request body**: any updatable fields (`name`, `email`, `phone`, `place`, `notes`).
- **Responses**:
  - `200 OK` – `{ success: true, data: Customer, message: "Customer updated successfully" }`
  - `404 Not Found` – `{ success: false, error: "Customer not found" }`

### DELETE `/api/customers/:id`

- **Description**: Delete a customer.
- **Responses**:
  - `200 OK` – `{ success: true, message: "Customer deleted successfully" }`
  - `404 Not Found` – `{ success: false, error: "Customer not found" }`

---

## How to Use This Doc with Frontend Agents

- **Always include**:
  - Base URL (e.g. `http://localhost:3000`) and route path from this file.
  - `Authorization: Bearer <token>` header for every route except `/api/auth/login`.
  - `Content-Type: application/json` header for requests with bodies.
- **Follow request/response shapes** above when constructing fetch/axios calls.
- Use the documented query parameters for pagination & filters (e.g. leads, products, projects, ledger).

