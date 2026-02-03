import { createSwaggerSpec } from 'next-swagger-doc';

export function getApiDocs() {
  return createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'MediTrackr API',
        version: '0.1.0',
        description: 'REST API for MediTrackr — medical billing, OCR scanning, and payment processing.',
      },
      servers: [{ url: 'http://localhost:3001', description: 'Local dev' }],
      components: {
        securitySchemes: {
          supabaseAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Supabase session JWT',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          ExpenseResult: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              expense: { type: 'object' },
              receiptUrl: { type: 'string', format: 'uri' },
            },
          },
          HealthCardResult: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
              memberId: { type: 'string', example: 'BEAB 8501 0101 23' },
              dateOfBirth: { type: 'string', format: 'date' },
              expiryDate: { type: 'string', example: '2027-12' },
              sex: { type: 'string', enum: ['M', 'F', ''] },
            },
          },
          SmartScanResult: {
            type: 'object',
            properties: {
              documentType: {
                type: 'string',
                enum: ['RAMQ_CARD', 'INSURANCE_CARD', 'ID_CARD', 'RECEIPT', 'INVOICE', 'UNKNOWN'],
              },
              confidence: { type: 'integer', minimum: 0, maximum: 100 },
              fields: { type: 'object' },
              billingRecommendation: {
                type: 'string',
                nullable: true,
                enum: ['RAMQ', 'PRIVATE_INSURANCE', 'OUT_OF_PROVINCE', 'EXPENSE', null],
              },
              detectedInsurer: { type: 'string', nullable: true },
              detectedProvince: { type: 'string', nullable: true },
            },
          },
          PaymentLinkResult: {
            type: 'object',
            properties: {
              paymentUrl: { type: 'string', format: 'uri' },
              sessionId: { type: 'string' },
            },
          },
        },
      },
      paths: {
        '/api/ocr/expense-receipt': {
          post: {
            summary: 'Scan an expense receipt via Mindee OCR',
            tags: ['OCR'],
            security: [{ supabaseAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['image'],
                    properties: {
                      image: {
                        type: 'string',
                        description: 'Base64-encoded image with data URI prefix (data:image/jpeg;base64,...)',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Expense created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExpenseResult' } } } },
              400: { description: 'Invalid image data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
              401: { description: 'Unauthorized' },
              500: { description: 'OCR processing failed' },
            },
          },
        },
        '/api/ocr/health-card': {
          post: {
            summary: 'Extract data from a Quebec RAMQ health card image',
            tags: ['OCR'],
            security: [{ supabaseAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['image'],
                    properties: {
                      image: { type: 'string', description: 'Base64-encoded image with data URI prefix' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Card data extracted', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthCardResult' } } } },
              400: { description: 'Invalid image data' },
              401: { description: 'Unauthorized' },
              500: { description: 'OCR processing failed' },
            },
          },
        },
        '/api/ocr/smart-scan': {
          post: {
            summary: 'Auto-classify and extract data from any document image',
            tags: ['OCR'],
            security: [{ supabaseAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['image'],
                    properties: {
                      image: { type: 'string', description: 'Base64-encoded image with data URI prefix' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Document classified and data extracted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SmartScanResult' } } } },
              400: { description: 'Invalid image data' },
              401: { description: 'Unauthorized' },
              500: { description: 'Scan processing failed' },
            },
          },
        },
        '/api/create-payment-link': {
          post: {
            summary: 'Create a Stripe Checkout payment link for an invoice',
            tags: ['Payments'],
            security: [{ supabaseAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['invoiceId', 'amount', 'patientName'],
                    properties: {
                      invoiceId: { type: 'string' },
                      amount: { type: 'number', description: 'Amount in CAD dollars' },
                      patientName: { type: 'string' },
                      patientEmail: { type: 'string', format: 'email' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Payment link created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentLinkResult' } } } },
              401: { description: 'Unauthorized' },
              500: { description: 'Failed to create payment link' },
            },
          },
        },
        '/api/stripe-webhook': {
          post: {
            summary: 'Stripe webhook — handles checkout.session.completed events',
            tags: ['Payments'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { type: 'object', description: 'Raw Stripe event payload' },
                },
              },
            },
            parameters: [
              { in: 'header', name: 'stripe-signature', required: true, schema: { type: 'string' } },
            ],
            responses: {
              204: { description: 'Event processed' },
              400: { description: 'Invalid signature or payload' },
              500: { description: 'Processing error' },
            },
          },
        },
      },
    },
  });
}
