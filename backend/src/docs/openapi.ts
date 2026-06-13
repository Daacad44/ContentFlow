/**
 * OpenAPI 3.1 specification for ContentFlow API v1.
 */
export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'ContentFlow API',
    version: '1.0.0',
    description:
      'Social Scheduler AI SaaS — authentication, workspaces, social accounts, scheduling, publishing, AI, and billing.',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  tags: [
    { name: 'Auth', description: 'Authentication & authorization' },
    { name: 'Workspaces', description: 'Multi-tenant workspaces' },
    { name: 'Social', description: 'Social account connections (Zernio)' },
    { name: 'Posts', description: 'Post scheduling & management' },
    { name: 'Publishing', description: 'Publish queue & job logs' },
    { name: 'AI', description: 'Gemini content generation' },
    { name: 'Billing', description: 'Stripe subscriptions' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register with email/password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Account created' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email/password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  rememberMe: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Returns access token + sets refresh cookie' } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token (httpOnly cookie)',
        responses: { '200': { description: 'New access token' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User profile' } },
      },
    },
    '/auth/google': {
      get: {
        tags: ['Auth'],
        summary: 'Start Google OAuth',
        parameters: [
          {
            name: 'redirect',
            in: 'query',
            schema: { type: 'string' },
            description: 'Frontend origin to redirect after OAuth',
          },
        ],
        responses: { '302': { description: 'Redirect to Google' } },
      },
    },
    '/auth/google/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Google OAuth callback',
        responses: { '302': { description: 'Redirect to frontend with access token in hash' } },
      },
    },
    '/workspaces': {
      get: {
        tags: ['Workspaces'],
        summary: 'List user workspaces',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Workspace list' } },
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Create workspace',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Workspace created' } },
      },
    },
    '/workspaces/{workspaceId}/social/accounts': {
      get: {
        tags: ['Social'],
        summary: 'List connected social accounts',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Connected accounts' } },
      },
    },
    '/workspaces/{workspaceId}/posts': {
      get: {
        tags: ['Posts'],
        summary: 'List posts',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Post list' } },
      },
      post: {
        tags: ['Posts'],
        summary: 'Create post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Post created' } },
      },
    },
    '/workspaces/{workspaceId}/posts/{postId}/publish': {
      post: {
        tags: ['Publishing'],
        summary: 'Publish post immediately',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Publish job queued or completed' } },
      },
    },
    '/workspaces/{workspaceId}/publish/jobs': {
      get: {
        tags: ['Publishing'],
        summary: 'List publish jobs',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Publish job list with logs' } },
      },
    },
    '/workspaces/{workspaceId}/ai/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate AI content (Gemini)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Generated content' } },
      },
    },
    '/billing/plans': {
      get: {
        tags: ['Billing'],
        summary: 'List subscription plans',
        responses: { '200': { description: 'Plans' } },
      },
    },
  },
} as const;
