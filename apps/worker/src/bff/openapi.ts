export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Euronews PT Reading Lab API",
    version: "0.1.0",
    description:
      "Cloudflare Worker BFF for daily Euronews Portuguese reading, vocabulary notes, sentence practice, and review state.",
  },
  servers: [
    {
      url: "http://localhost:8787",
      description: "Local Wrangler dev server",
    },
  ],
  tags: [
    { name: "System", description: "Health and API documentation" },
    {
      name: "Articles",
      description: "Daily edition, stored articles, and refresh pipeline",
    },
    { name: "Words", description: "Vocabulary lookup and user notes" },
    {
      name: "Paragraphs",
      description: "Sentence-pattern practice and feedback",
    },
    {
      name: "Review",
      description: "Completion, saved notes, and practice history",
    },
    { name: "Debug", description: "Worker diagnostics for development" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          "200": jsonResponse("Worker status", {
            type: "object",
            required: ["ok", "service"],
            properties: {
              ok: { type: "boolean", example: true },
              service: { type: "string", example: "euronews-pt-bff" },
            },
          }),
        },
      },
    },
    "/api/docs": {
      get: {
        tags: ["System"],
        summary: "Swagger UI",
        description:
          "Interactive API reference rendered from /api/openapi.json.",
        responses: {
          "200": {
            description: "Swagger UI HTML",
            content: {
              "text/html": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["System"],
        summary: "OpenAPI JSON",
        description: "Machine-readable OpenAPI contract for the Worker BFF.",
        responses: {
          "200": jsonResponse("OpenAPI document", {
            type: "object",
            additionalProperties: true,
          }),
        },
      },
    },
    "/api/today": {
      get: {
        tags: ["Articles"],
        summary: "List today's article summaries",
        description:
          "Returns the latest stored D1 edition. If no edition exists yet, returns bundled sample articles so the UI remains inspectable.",
        responses: {
          "200": jsonResponse("Daily article summaries", {
            type: "object",
            required: ["articles", "source", "fetchedAt"],
            properties: {
              articles: {
                type: "array",
                items: ref("ArticleSummary"),
              },
              source: {
                type: "string",
                enum: ["euronews-d1", "sample-fallback"],
              },
              fetchedAt: { type: "string", format: "date-time" },
            },
          }),
        },
      },
    },
    "/api/articles/status": {
      get: {
        tags: ["Articles"],
        summary: "Get latest stored edition status",
        responses: {
          "200": jsonResponse("Edition status", {
            type: "object",
            required: [
              "hasStoredEdition",
              "editionDate",
              "articleCount",
              "lastFetchedAt",
            ],
            properties: {
              hasStoredEdition: { type: "boolean" },
              editionDate: {
                type: "string",
                nullable: true,
                example: "2026-07-07",
              },
              articleCount: { type: "integer", minimum: 0 },
              lastFetchedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
              },
            },
          }),
        },
      },
    },
    "/api/articles/{articleId}": {
      get: {
        tags: ["Articles"],
        summary: "Get one article with paragraphs",
        description:
          "Stored articles are translated lazily on first read. Sample fallback articles may be returned while D1 is empty.",
        parameters: [pathParam("articleId", "Article id")],
        responses: {
          "200": jsonResponse("Article detail", {
            type: "object",
            required: ["article", "fetchedAt"],
            properties: {
              article: ref("ArticleDetail"),
              fetchedAt: { type: "string", format: "date-time" },
            },
          }),
          "404": errorResponse("Article not found"),
        },
      },
    },
    "/api/articles/refresh": {
      post: {
        tags: ["Articles"],
        summary: "Manually refresh today's Euronews edition",
        description:
          "Fetches Euronews PT articles synchronously and stores them in D1. Paragraph translations are deferred until first read.",
        responses: {
          "200": jsonResponse("Refresh summary", {
            type: "object",
            required: [
              "ok",
              "editionDate",
              "storedArticles",
              "translatedParagraphs",
              "translationMode",
              "aiAvailable",
              "note",
            ],
            properties: {
              ok: { type: "boolean", example: true },
              editionDate: { type: "string", example: "2026-07-07" },
              storedArticles: {
                type: "array",
                items: { type: "string" },
              },
              translatedParagraphs: { type: "integer", minimum: 0 },
              translationMode: {
                type: "string",
                enum: ["inline", "on-first-read"],
              },
              aiAvailable: { type: "boolean" },
              note: { type: "string" },
            },
          }),
          "502": jsonResponse("Refresh failure", {
            type: "object",
            required: ["ok", "error"],
            properties: {
              ok: { type: "boolean", example: false },
              error: { type: "string" },
            },
          }),
        },
      },
    },
    "/api/articles/{articleId}/complete": {
      post: {
        tags: ["Review"],
        summary: "Mark an article as completed",
        parameters: [pathParam("articleId", "Article id")],
        responses: {
          "200": jsonResponse("Completion state", {
            type: "object",
            required: ["completedArticleIds"],
            properties: {
              completedArticleIds: {
                type: "array",
                items: { type: "string" },
              },
            },
          }),
        },
      },
    },
    "/api/words/lookup": {
      post: {
        tags: ["Words"],
        summary: "Look up a selected word or expression",
        description:
          "Combines Workers AI language hints, a Priberam link, Unsplash image search, and a placeholder fallback.",
        requestBody: jsonRequest({
          type: "object",
          required: ["word"],
          properties: {
            word: { type: "string", minLength: 1, example: "governo" },
          },
        }),
        responses: {
          "200": jsonResponse("Word lookup", {
            type: "object",
            required: ["lookup"],
            properties: {
              lookup: ref("WordLookup"),
            },
          }),
          "400": errorResponse("word is required"),
        },
      },
    },
    "/api/words/notes": {
      post: {
        tags: ["Words"],
        summary: "Save a vocabulary note",
        requestBody: jsonRequest({
          type: "object",
          required: ["lookup"],
          properties: {
            lookup: ref("WordLookup"),
            meaning: {
              type: "string",
              description: "User-authored meaning or memory cue",
            },
            tags: { type: "string", description: "Comma-separated tags" },
          },
        }),
        responses: {
          "200": jsonResponse("Saved note", {
            type: "object",
            required: ["note"],
            properties: {
              note: ref("WordNote"),
            },
          }),
          "400": errorResponse("lookup is required"),
        },
      },
    },
    "/api/paragraphs/practice": {
      post: {
        tags: ["Paragraphs"],
        summary: "Create a paragraph practice prompt",
        requestBody: jsonRequest({
          type: "object",
          required: ["paragraphPt"],
          properties: {
            paragraphPt: { type: "string", minLength: 1 },
            selectedText: { type: "string" },
            targetSentence: { type: "string" },
          },
        }),
        responses: {
          "200": jsonResponse("Practice prompt", {
            type: "object",
            required: ["practice"],
            properties: {
              practice: ref("ParagraphPractice"),
            },
          }),
          "400": errorResponse("paragraphPt is required"),
        },
      },
    },
    "/api/paragraphs/feedback": {
      post: {
        tags: ["Paragraphs"],
        summary: "Save a paragraph attempt and return feedback",
        requestBody: jsonRequest({
          allOf: [
            ref("ParagraphPractice"),
            {
              type: "object",
              properties: {
                userZhHans: { type: "string" },
                userPt: { type: "string" },
              },
            },
          ],
        }),
        responses: {
          "200": jsonResponse("Feedback and saved practice", {
            type: "object",
            required: ["feedback", "practice"],
            properties: {
              feedback: ref("PracticeFeedback"),
              practice: ref("SavedParagraphPractice"),
            },
          }),
        },
      },
    },
    "/api/review": {
      get: {
        tags: ["Review"],
        summary: "Get review state",
        responses: {
          "200": jsonResponse("Review state", {
            type: "object",
            required: ["review"],
            properties: {
              review: ref("ReviewState"),
            },
          }),
        },
      },
    },
    "/api/debug/translate": {
      get: {
        tags: ["Debug"],
        summary: "Run raw translation diagnostics",
        parameters: [
          {
            name: "text",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Portuguese text to translate",
          },
        ],
        responses: {
          "200": jsonResponse("Translation diagnostic result", {
            type: "object",
            required: ["aiAvailable"],
            properties: {
              aiAvailable: { type: "boolean" },
              note: { type: "string" },
              text: { type: "string" },
              attempts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                },
              },
            },
          }),
        },
      },
    },
  },
  components: {
    schemas: {
      ArticleSummary: {
        type: "object",
        required: [
          "id",
          "title",
          "dek",
          "sourceUrl",
          "publishedAt",
          "estimatedMinutes",
          "completed",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          dek: { type: "string" },
          sourceUrl: { type: "string", format: "uri" },
          publishedAt: { type: "string", format: "date-time" },
          estimatedMinutes: { type: "integer", minimum: 1 },
          completed: { type: "boolean" },
        },
      },
      Paragraph: {
        type: "object",
        required: ["id", "articleId", "index", "pt", "zhHans"],
        properties: {
          id: { type: "string" },
          articleId: { type: "string" },
          index: { type: "integer", minimum: 0 },
          pt: { type: "string" },
          zhHans: { type: "string" },
        },
      },
      ArticleDetail: {
        allOf: [
          ref("ArticleSummary"),
          {
            type: "object",
            required: ["paragraphs"],
            properties: {
              paragraphs: {
                type: "array",
                items: ref("Paragraph"),
              },
            },
          },
        ],
      },
      WordImage: {
        type: "object",
        required: ["url", "alt", "source"],
        properties: {
          url: { type: "string" },
          alt: { type: "string" },
          attribution: { type: "string" },
          source: {
            type: "string",
            enum: ["unsplash", "cloudflare-ai", "placeholder"],
          },
        },
      },
      WordLookup: {
        type: "object",
        required: ["word", "lemma", "priberamUrl", "examplePt", "image"],
        properties: {
          word: { type: "string" },
          lemma: { type: "string" },
          priberamUrl: { type: "string", format: "uri" },
          examplePt: { type: "string" },
          meaningZhHans: {
            type: "string",
            description: "Empty when AI is unavailable",
          },
          image: ref("WordImage"),
        },
      },
      WordNote: {
        type: "object",
        required: [
          "id",
          "word",
          "lemma",
          "meaning",
          "tags",
          "imageUrl",
          "examplePt",
          "priberamUrl",
          "savedAt",
        ],
        properties: {
          id: { type: "string" },
          word: { type: "string" },
          lemma: { type: "string" },
          meaning: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          imageUrl: { type: "string" },
          examplePt: { type: "string" },
          priberamUrl: { type: "string", format: "uri" },
          savedAt: { type: "string", format: "date-time" },
        },
      },
      ParagraphPractice: {
        type: "object",
        required: [
          "paragraphPt",
          "targetSentence",
          "selectedText",
          "structureLabel",
          "tenseFocus",
          "generatedParagraphPt",
          "promptZhHans",
        ],
        properties: {
          paragraphPt: { type: "string" },
          targetSentence: { type: "string" },
          selectedText: { type: "string" },
          structureLabel: { type: "string" },
          tenseFocus: { type: "string" },
          generatedParagraphPt: { type: "string" },
          promptZhHans: { type: "string" },
        },
      },
      PracticeFeedback: {
        type: "object",
        required: ["summary", "diff"],
        properties: {
          summary: { type: "string" },
          diff: {
            type: "array",
            items: {
              type: "object",
              required: ["kind"],
              properties: {
                kind: {
                  type: "string",
                  enum: ["keep", "missing", "extra", "replace"],
                },
                user: { type: "string" },
                expected: { type: "string" },
                note: { type: "string" },
              },
            },
          },
        },
      },
      SavedParagraphPractice: {
        allOf: [
          ref("ParagraphPractice"),
          {
            type: "object",
            required: ["id", "userZhHans", "userPt", "feedback", "savedAt"],
            properties: {
              id: { type: "string" },
              userZhHans: { type: "string" },
              userPt: { type: "string" },
              feedback: ref("PracticeFeedback"),
              savedAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      ReviewState: {
        type: "object",
        required: ["completedArticleIds", "wordNotes", "paragraphPractices"],
        properties: {
          completedArticleIds: {
            type: "array",
            items: { type: "string" },
          },
          wordNotes: {
            type: "array",
            items: ref("WordNote"),
          },
          paragraphPractices: {
            type: "array",
            items: ref("SavedParagraphPractice"),
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
} as const;

export const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Euronews PT Reading Lab API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f7f4ed; }
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 32px 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        displayRequestDuration: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

function pathParam(name: string, description: string) {
  return {
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
    description,
  };
}

function jsonRequest(schema: object) {
  return {
    required: true,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

function jsonResponse(description: string, schema: object) {
  return {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

function errorResponse(description: string) {
  return jsonResponse(description, ref("ErrorResponse"));
}
