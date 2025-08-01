import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// This will contain the object which contains the access token
const MCP_TOKENS = process.env.MCP_TOKENS;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
const MCP_AUTH_REQUIRED = process.env.NEXT_PUBLIC_MCP_AUTH_REQUIRED === "true";

async function getSupabaseToken(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    // Create a Supabase client using the server client with cookies from the request
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set() {}, // Not needed for token retrieval
        remove() {}, // Not needed for token retrieval
      },
    });

    // Get the session which contains the access token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    return session.access_token;
  } catch (error) {
    console.error("Error getting Supabase token:", error);
    return null;
  }
}

async function getMcpAccessToken(supabaseToken: string, mcpServerUrl: URL) {
  // Garantir que a URL base termina com uma barra
  const baseUrl = mcpServerUrl.href.endsWith("/")
    ? mcpServerUrl.href
    : `${mcpServerUrl.href}/`;
  const mcpUrl = `${baseUrl}mcp`;
  const mcpOauthUrl = `${baseUrl}oauth/token`;

  // Log removido para produção

  // Preparar o payload para a requisição
  const payload = {
    subject_token: supabaseToken,
    client_id: "next_app",
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    resource: mcpUrl,
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
  };

  // Log removido para produção

  try {
    // Converter o payload para formato x-www-form-urlencoded
    const formBody = Object.entries(payload)
      .map(
        ([key, value]) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(value),
      )
      .join("&");

    // Log removido para produção

    // Exchange Supabase token for MCP JWT token
    const tokenResponse = await fetch(mcpOauthUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    // Log removido para produção

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      // Log removido para produção
      return tokenData.access_token;
    } else {
      const errorText = await tokenResponse.text();
      console.error(
        `Token exchange failed (${tokenResponse.status}):`,
        errorText,
      );
      return null;
    }
  } catch (e) {
    console.error("Error during token exchange:", e);
  }
}

/**
 * Proxies requests from the client to the MCP server.
 * Extracts the path after '/api/oap_mcp', constructs the target URL,
 * forwards the request with necessary headers and body, and injects
 * the MCP authorization token.
 *
 * @param req The incoming NextRequest.
 * @returns The response from the MCP server.
 */
export async function proxyRequest(req: NextRequest): Promise<Response> {
  if (!MCP_SERVER_URL) {
    return new Response(
      JSON.stringify({
        message:
          "MCP_SERVER_URL environment variable is not set. Please set it to the URL of your MCP server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Extract the path after '/api/oap_mcp/'
  // Example: /api/oap_mcp/foo/bar -> /foo/bar
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/oap_mcp/, "");

  // Construct the target URL
  const targetUrlObj = new URL(MCP_SERVER_URL);
  targetUrlObj.pathname = `${targetUrlObj.pathname}${targetUrlObj.pathname.endsWith("/") ? "" : "/"}mcp${path}${url.search}`;
  const targetUrl = targetUrlObj.toString();

  // Prepare headers, forwarding original headers except Host
  // and adding Authorization
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    // avoid banned headers that cause errors in Undici (Node.js fetch)
    const bannedHeaders = [
      "connection",
      "content-length",
      "transfer-encoding",
      "expect",
    ];

    if (!bannedHeaders.includes(lowerKey) && lowerKey !== "host") {
      headers.append(key, value);
    }
  });

  const mcpAccessTokenCookie = req.cookies.get("X-MCP-Access-Token")?.value;
  // Authentication priority:
  // 1. X-MCP-Access-Token header
  // 2. X-MCP-Access-Token cookie
  // 3. MCP_TOKENS environment variable
  // 4. Supabase-JWT token exchange
  let accessToken: string | null = null;

  if (MCP_AUTH_REQUIRED) {
    const supabaseToken = await getSupabaseToken(req);

    if (mcpAccessTokenCookie) {
      accessToken = mcpAccessTokenCookie;
    } else if (MCP_TOKENS) {
      // Try to use MCP_TOKENS environment variable
      try {
        const { access_token } = JSON.parse(MCP_TOKENS);
        if (access_token) {
          accessToken = access_token;
        }
      } catch (e) {
        console.error("Failed to parse MCP_TOKENS env variable", e);
      }
    }

    // Logs de debug removidos para produção

    // If no token yet, try Supabase-JWT token exchange
    if (!accessToken && supabaseToken && MCP_SERVER_URL) {
      accessToken = await getMcpAccessToken(
        supabaseToken,
        new URL(MCP_SERVER_URL),
      );
    }

    // If we still don't have a token, return an error
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          message: "Failed to obtain access token from any source.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Set the Authorization header with the token
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  headers.set("Accept", "application/json, text/event-stream");

  // Determine body based on method
  let body: BodyInit | null | undefined = undefined;
  /* if (req.method !== "GET" && req.method !== "HEAD") {
    // For POST, PUT, PATCH, DELETE etc., forward the body
    body = req.body;
  } */

  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await req.json();
      body = JSON.stringify(json);
    } else {
      body = await req.text();
    }
  }

  try {
    // Logs de debug removidos para produção
    console.log("targetUrl", targetUrl);

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    console.log("response", response);

    // Clone the response to create a new one we can modify
    const responseClone = response.clone();

    // Create a new response with the same status, headers, and body
    let newResponse: NextResponse;

    try {
      // Try to parse as JSON first
      const responseData = await responseClone.json();
      newResponse = NextResponse.json(responseData, {
        status: response.status,
        statusText: response.statusText,
      });
    } catch (_) {
      // If not JSON, use the raw response body
      const responseBody = await response.text();
      newResponse = new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    // Copy all headers from the original response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    if (MCP_AUTH_REQUIRED) {
      // If we used the Supabase token exchange, add the access token to the response
      // so it can be used in future requests
      if (!mcpAccessTokenCookie && !MCP_TOKENS && accessToken) {
        // Set a cookie with the access token that will be included in future requests
        newResponse.cookies.set({
          name: "X-MCP-Access-Token",
          value: accessToken,
          httpOnly: false, // Allow JavaScript access so it can be read for headers
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 3600, // 1 hour expiration
        });
      }
    }

    return newResponse;
  } catch (error) {
    /*console.error("MCP Proxy Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Proxy request failed", error: errorMessage }),
      {
        status: 502, // Bad Gateway
        headers: { "Content-Type": "application/json" },
      },
    );*/
    console.error("MCP Proxy Error - Full Error Object:", error);

    return new Response(
      JSON.stringify({
        message: "Proxy request failed",
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
