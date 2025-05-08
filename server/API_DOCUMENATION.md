# DocuMindAI API Documentation

This document outlines the API endpoints for the DocuMindAI application, a collaborative document editing platform with AI-powered features. The API supports document management, user authentication, real-time collaboration, and AI-generated content. All endpoints require proper authentication unless specified otherwise.

## Base URL

```
https://api.documind-ai.web.id
```

## List of Endpoints

- **Authentication Routes**:
  - `POST /auth/google/callback` - Google OAuth login
  - `GET /auth/me` - Get authenticated user profile
  - `PUT /auth/profile` - Update user profile
- **Document Routes**:
  - `GET /documents/public` - Get all public documents (no auth required)
  - `POST /documents` - Create a new document
  - `GET /documents` - Get all user-owned documents
  - `GET /documents/shared` - Get all documents shared with user
  - `GET /documents/:id` - Get document by ID
  - `GET /documents/:id/access` - Check document access permissions
  - `POST /documents/:id/share` - Share document with another user
  - `PUT /documents/:id` - Update document
  - `PATCH /documents/:id` - Update document (alias for PUT)
  - `DELETE /documents/:id` - Delete document
  - `GET /documents/test-email` - Send test email
- **AI Routes**:
  - `POST /ai/generate-title` - Generate document title using AI
  - `POST /ai/process` - Process text using AI
  - `GET /ai/summaries/document/:documentId` - Get summaries for a document
  - `POST /ai/summaries` - Create or update a document summary
- **WebSocket Events**:
  - `joinDocument` - Join a document for real-time collaboration
  - `updateDocument` - Update document content in real-time
  - `userTyping` - Notify typing activity
  - `userStoppedTyping` - Notify stopped typing
  - `leaveDocument` - Leave a document room
  - `disconnect` - Handle client disconnection
  - Server-emitted: `newDocument`, `documentUpdated`, `documentShared`, `documentDeleted`, `activeUsers`, `documentContentUpdated`, `aiSuggestion`, `aiSummary`, `userTyping`, `userStoppedTyping`

## Authentication

Most endpoints require a JWT token obtained via the `/auth/google/callback` endpoint. Include the token in the `Authorization` header as follows:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### Authentication Routes

#### POST /auth/google/callback

Initiates Google OAuth login and returns a JWT token.

- **Request Body**:
  ```json
  {
    "idToken": "string" // Google ID token
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "access_token": "string",
      "user": {
        "id": "number",
        "username": "string",
        "email": "string"
      }
    }
    ```
  - **400 Bad Request**: Missing `idToken`.
  - **500 Internal Server Error**: Server-side error.

#### GET /auth/me

Retrieves the profile of the authenticated user.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "id": "number",
      "username": "string",
      "email": "string",
      "phoneNumber": "string|null"
    }
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **404 Not Found**: User not found.

#### PUT /auth/profile

Updates the authenticated user's profile.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Request Body**:
  ```json
  {
    "username": "string", // Optional
    "phoneNumber": "string" // Optional
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "id": "number",
      "username": "string",
      "email": "string",
      "phoneNumber": "string|null"
    }
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **404 Not Found**: User not found.
  - **500 Internal Server Error**: Server-side error.

---

### Document Routes

#### GET /documents/public

Retrieves all public documents. No authentication required.

- **Response**:
  - **200 OK**:
    ```json
    [
      {
        "id": "number",
        "title": "string",
        "content": "string",
        "userId": "number",
        "isPublic": true,
        "createdAt": "string",
        "updatedAt": "string",
        "creator": {
          "id": "number",
          "username": "string",
          "email": "string"
        },
        "lastEditor": {
          "id": "number",
          "username": "string",
          "email": "string"
        }
      }
    ]
    ```
  - **500 Internal Server Error**: Server-side error.

#### POST /documents

Creates a new document.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Request Body**:
  ```json
  {
    "content": "string", // Optional, default: ""
    "isPublic": false // Optional, default: false
  }
  ```
- **Response**:
  - **201 Created**:
    ```json
    {
      "message": "Document created successfully",
      "document": {
        "id": "number",
        "title": "string", // AI-generated if content provided
        "content": "string",
        "userId": "number",
        "isPublic": false,
        "lastEditedById": "number",
        "createdAt": "string",
        "updatedAt": "string"
      }
    }
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **500 Internal Server Error**: Server-side error.

#### GET /documents

Retrieves all documents owned by the authenticated user.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Response**:
  - **200 OK**:
    ```json
    [
      {
        "id": "number",
        "title": "string",
        "content": "string",
        "userId": "number",
        "isPublic": false,
        "createdAt": "string",
        "updatedAt": "string",
        "creator": {
          "id": "number",
          "username": "string",
          "email": "string"
        },
        "lastEditor": {
          "id": "number",
          "username": "string",
          "email": "string"
        }
      }
    ]
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **500 Internal Server Error**: Server-side error.

#### GET /documents/shared

Retrieves all documents shared with the authenticated user.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Response**:
  - **200 OK**:
    ```json
    [
      {
        "id": "number",
        "title": "string",
        "content": "string",
        "userId": "number",
        "isPublic": false,
        "createdAt": "string",
        "updatedAt": "string",
        "creator": {
          "id": "number",
          "username": "string",
          "email": "string"
        },
        "lastEditor": {
          "id": "number",
          "username": "string",
          "email": "string"
        }
      }
    ]
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **500 Internal Server Error**: Server-side error.

#### GET /documents/:id

Retrieves a document by ID.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Parameters**:
  - `id`: Document ID
- **Response**:
  - **200 OK**:
    ```json
    {
      "id": "number",
      "title": "string",
      "content": "string",
      "userId": "number",
      "isPublic": false,
      "createdAt": "string",
      "updatedAt": "string",
      "creator": {
        "id": "number",
        "username": "string",
        "email": "string"
      },
      "lastEditor": {
        "id": "number",
        "username": "string",
        "email": "string"
      }
    }
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **403 Forbidden**: Access denied.
  - **404 Not Found**: Document not found.
  - **500 Internal Server Error**: Server-side error.

#### GET /documents/:id/access

Checks access permissions for a document.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Parameters**:
  - `id`: Document ID
- **Response**:
  - **200 OK**:
    ```json
    {
      "hasAccess": true,
      "accessLevel": "edit|view|null"
    }
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **404 Not Found**: Document not found.
  - **500 Internal Server Error**: Server-side error.

#### POST /documents/:id/share

Shares a document with another user via email.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Parameters**:
  - `id`: Document ID
- **Request Body**:
  ```json
  {
    "email": "string",
    "accessLevel": "edit" // Optional, default: "edit"
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Document shared successfully"
    }
    ```
  - **400 Bad Request**: Invalid email or user already has access.
  - **401 Unauthorized**: Missing or invalid token.
  - **403 Forbidden**: Only the creator can share.
  - **404 Not Found**: Document not found.
  - **500 Internal Server Error**: Server-side error.

#### PUT /documents/:id

Updates a document.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Parameters**:
  - `id`: Document ID
- **Request Body**:
  ```json
  {
    "title": "string", // Optional
    "content": "string", // Optional
    "isPublic": false // Optional
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Document updated successfully",
      "document": {
        "id": "number",
        "title": "string",
        "content": "string",
        "userId": "number",
        "isPublic": false,
        "lastEditedById": "number",
        "createdAt": "string",
        "updatedAt": "string"
      }
    }
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **403 Forbidden**: Access denied.
  - **404 Not Found**: Document not found.
  - **500 Internal Server Error**: Server-side error.

#### PATCH /documents/:id

Alias for PUT /documents/:id (same functionality).

#### DELETE /documents/:id

Deletes a document.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Parameters**:
  - `id`: Document ID
- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Document deleted successfully"
    }
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **404 Not Found**: Document not found.
  - **500 Internal Server Error**: Server-side error.

#### GET /documents/test-email

Sends a test email for debugging purposes.

- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Email tes berhasil dikirim"
    }
    ```
  - **500 Internal Server Error**: Email sending failed.

---

### AI Routes

#### POST /ai/generate-title

Generates a document title using AI.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Request Body**:
  ```json
  {
    "prompt": "string" // Document content or description
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "title": "string"
    }
    ```
  - **400 Bad Request**: Missing or invalid prompt.
  - **401 Unauthorized**: Missing or invalid token.
  - **502 Bad Gateway**: AI service error.
  - **500 Internal Server Error**: Server-side error.

#### POST /ai/process

Processes a prompt using AI to generate content.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Request Body**:
  ```json
  {
    "prompt": "string" // Text to process
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "result": "string"
    }
    ```
  - **400 Bad Request**: Missing or invalid prompt.
  - **401 Unauthorized**: Missing or invalid token.
  - **502 Bad Gateway**: AI service error.
  - **500 Internal Server Error**: Server-side error.

#### GET /ai/summaries/document/:documentId

Retrieves all summaries for a specific document.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Parameters**:
  - `documentId`: Document ID
- **Response**:
  - **200 OK**:
    ```json
    [
      {
        "id": "number",
        "documentId": "number",
        "content": "string",
        "createdAt": "string",
        "updatedAt": "string"
      }
    ]
    ```
  - **401 Unauthorized**: Missing or invalid token.
  - **404 Not Found**: Document not found.
  - **500 Internal Server Error**: Server-side error.

#### POST /ai/summaries

Creates or updates a summary for a document.

- **Headers**:
  ```
  Authorization: Bearer <your-jwt-token>
  ```
- **Request Body**:
  ```json
  {
    "documentId": "number",
    "content": "string"
  }
  ```
- **Response**:
  - **201 Created** (new summary):
    ```json
    {
      "id": "number",
      "documentId": "number",
      "content": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
    ```
  - **200 OK** (updated summary):
    ```json
    {
      "id": "number",
      "documentId": "number",
      "content": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
    ```
  - **400 Bad Request**: Missing documentId or content.
  - **401 Unauthorized**: Missing or invalid token.
  - **404 Not Found**: Document not found.
  - **500 Internal Server Error**: Server-side error.

---

### WebSocket Events

The API supports real-time collaboration via Socket.IO. Clients connect to the server at the base URL and listen for the following events:

#### Event: joinDocument

Joins a document room for real-time collaboration.

- **Payload**:
  ```json
  {
    "documentId": "number",
    "userId": "number"
  }
  ```
- **Emitted Events**:
  - `activeUsers`: List of active users in the document.
    ```json
    {
      "documentId": "number",
      "users": [
        {
          "id": "number",
          "name": "string",
          "color": "string"
        }
      ]
    }
    ```
  - `error`: If document not found or access denied.

#### Event: updateDocument

Updates document content in real-time.

- **Payload**:
  ```json
  {
    "documentId": "number",
    "content": "string",
    "userId": "number"
  }
  ```
- **Emitted Events**:
  - `documentContentUpdated`: Broadcasts updated content.
    ```json
    {
      "documentId": "number",
      "content": "string",
      "userId": "number"
    }
    ```
  - `aiSuggestion`: AI-generated suggestion for content continuation.
    ```json
    {
      "documentId": "number",
      "suggestion": "string"
    }
    ```
  - `aiSummary`: AI-generated summary of the document.
    ```json
    {
      "documentId": "number",
      "summary": "string"
    }
    ```
  - `error`: If document not found or access denied.

#### Event: userTyping

Notifies other users of typing activity.

- **Payload**:
  ```json
  {
    "documentId": "number",
    "userId": "number",
    "userName": "string",
    "cursorPos": "number",
    "selection": "object"
  }
  ```
- **Emitted Event**:
  - `userTyping`: Broadcasts typing information.
    ```json
    {
      "documentId": "number",
      "userId": "number",
      "userName": "string",
      "cursorPos": "number",
      "selection": "object"
    }
    ```

#### Event: userStoppedTyping

Notifies other users when a user stops typing.

- **Payload**:
  ```json
  {
    "documentId": "number",
    "userId": "number"
  }
  ```
- **Emitted Event**:
  - `userStoppedTyping`: Broadcasts stopped typing information.
    ```json
    {
      "documentId": "number",
      "userId": "number"
    }
    ```

#### Event: leaveDocument

Removes a user from a document room.

- **Payload**:
  ```json
  {
    "documentId": "number",
    "userId": "number"
  }
  ```
- **Emitted Event**:
  - `activeUsers`: Updated list of active users.

#### Event: disconnect

Handles client disconnection.

- **Emitted Event**:
  - `activeUsers`: Updated list of active users for all affected documents.

#### Server-Emitted Events

- `newDocument`: When a new document is created.
  ```json
  {
    "id": "number",
    "title": "string",
    "userId": "number",
    "isPublic": false,
    "createdAt": "string"
  }
  ```
- `documentUpdated`: When a document is updated.
  ```json
  {
    "documentId": "number",
    "title": "string",
    "content": "string",
    "isPublic": false,
    "updatedAt": "string"
  }
  ```
- `documentShared`: When a document is shared.
  ```json
  {
    "documentId": "number",
    "email": "string",
    "sharedBy": "string"
  }
  ```
- `documentDeleted`: When a document is deleted.
  ```json
  {
    "documentId": "number"
  }
  ```

---

## Error Handling

All endpoints return error responses in the following format:

```json
{
  "message": "string"
}
```

Common status codes:

- **400 Bad Request**: Invalid input.
- **401 Unauthorized**: Missing or invalid token.
- **403 Forbidden**: Access denied.
- **404 Not Found**: Resource not found.
- **500 Internal Server Error**: Server-side error.
- **502 Bad Gateway**: AI service error.

---

## Notes

- The API uses a PostgreSQL database configured in `config.json`.
- Environment variables (e.g., `GOOGLE_AI_API_KEY`, `JWT_SECRET`, `EMAIL_USER`) must be set in a `.env` file.
- Real-time features rely on Socket.IO with CORS enabled for the client URL.
- AI functionalities use Google’s Gemini 2.0 Flash model.
- Email notifications are sent via Nodemailer using a Gmail account.

For further details, refer to the source code or contact the development team.
