<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\OrganizationScope::class,
        ]);
        
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'external_api_auth' => \App\Http\Middleware\ExternalApiAuthMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                $status = 500;
                
                if (method_exists($e, 'getStatusCode')) {
                    $status = $e->getStatusCode();
                } elseif ($e instanceof \Illuminate\Auth\AuthenticationException || 
                          str_contains(get_class($e), 'InvalidTokenStructure') ||
                          str_contains(get_class($e), 'TokenParsingException')) {
                    $status = 401;
                }

                // Special handling for validation exceptions
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The given data was invalid.',
                        'errors' => $e->errors(),
                    ], 422);
                }

                // Explicit handling for permission/authorization exceptions
                if ($e instanceof \Spatie\Permission\Exceptions\UnauthorizedException || 
                    $e instanceof \Illuminate\Auth\Access\AuthorizationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Access Denied: You do not have permission to perform this action.',
                    ], 403);
                }

                return response()->json([
                    'success' => false,
                    'message' => $status === 401 ? 'Unauthenticated or invalid token.' : ($e->getMessage() ?: 'Server Error'),
                    'debug' => config('app.debug') ? [
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => collect($e->getTrace())->take(5),
                    ] : null,
                ], $status);
            }
        });
    })->create();
