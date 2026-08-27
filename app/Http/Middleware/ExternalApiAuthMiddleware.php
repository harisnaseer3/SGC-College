<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExternalApiAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedKey = config('services.external_api.key');

        // Check X-Api-Key header
        $apiKey = $request->header('X-Api-Key');

        // Check Bearer Token if X-Api-Key is missing
        if (!$apiKey && $request->bearerToken()) {
            $apiKey = $request->bearerToken();
        }

        // Check query param if still missing
        if (!$apiKey) {
            $apiKey = $request->query('api_key');
        }

        // Allow if valid API key provided OR request is authenticated via passport user
        if (($apiKey && $expectedKey && hash_equals($expectedKey, $apiKey)) || auth('api')->check() || auth()->check()) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unauthorized. Valid X-Api-Key header, Bearer token, or api_key query parameter required.',
        ], 401);
    }
}
