---
description: Coding standards for API development in CollegeSGC
---

# API Coding Standards

To ensure consistency across the multi-tenant system, follow these standards for all API development:

## 1. Controller Inheritance
- All API controllers MUST extend `App\Http\Controllers\Api\BaseController`.
- Never extend the default `App\Http\Controllers\Controller` directly for API endpoints.

## 2. API Responses
- Use `$this->sendResponse($data, $message, $code)` for successful responses.
- Use `$this->sendError($error, $errorMessages, $code)` for error responses.
- NEVER return `response()->json()` or raw arrays directly from controllers.

## 3. Validation
- Use Laravel **FormRequest** classes for all request validation.
- Create new request classes in `App\Http\Requests\Api\...`.
- NEVER use `$request->validate()` or inline validation logic inside controller methods.
- Type-hint the specific `FormRequest` class in the controller method signature.

## 4. Multi-tenancy
- Always consider `organization_id` and `campus_id` context when fetching or storing data.
- Ensure that resources created are correctly linked to the active Organization/Campus.

## 5. Module Permissions
- Whenever a new module or feature is implemented, its permissions (e.g., View, Create, Edit, Delete, Print, Manage, etc.) MUST be added to `database/seeders/PermissionsSeeder.php`.
- Adding them to the seeder ensures they automatically populate in the existing dynamic Manage Permissions modal.
- Protect all new API endpoints utilizing these explicit permissions via Laravel 11's `HasMiddleware` interface in the Controller.
