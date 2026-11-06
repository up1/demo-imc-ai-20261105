# REST API :: Get product information by specified id

## API spcification
* GET /api/v1/products/{id}

### Response with 200 (success)
```json
{
  "id": 1,
  "name": "Product Name",
  "description": "Product Description",
  "price": 99.99,
  "currency": "USD",
  "availability": true
}
```

### Response with 400 (bad request)
```json
{
  "message": "Invalid request"
}
```

### Response with 404 (not found)
```json
{
  "message": "Product not found"
}
```

### Response with 429 (too many requests)
```json
{
  "message": "Rate limit exceeded. Please try again later."
}
```

### Response with 500 (internal server error)
```json
{
  "message": "Internal server error"
}
```

## Request validation and error message in table format
| Field | Type | Required | Description | Error Message |
|-------|------|----------|-------------|---------------|
| id    | integer | Yes      | The unique identifier of the product | "Invalid request" if id is not a valid integer |

## Rate limit to call this API
* Same IP/user can call only 100 requests per minute. If the limit is exceeded, the server will respond with a 429 status code and an error message indicating that the rate limit has been exceeded.

## System flow
1. The client sends a GET request to the endpoint `/api/v1/products/{id}` with the specified product id.
2. The server validates the request parameters.
3. If the id is valid, the server retrieves the product information from the file system (products.json).
4. If the product is found, the server responds with a 200 status code and the product information in JSON format.
5. If the product is not found, the server responds with a 404 status code and an error message indicating that the product was not found.
6. If the request is invalid (e.g., id is not a valid integer), the server responds with a 400 status code and an error message indicating that the request is invalid.
7. If there is an internal server error, the server responds with a 500 status code and an error message indicating that there was an internal server error

## Data store in json file (products.json)
* Structure of data in file:
```json
[
  {
    "id": 1,
    "name": "Product Name",
    "description": "Product Description",
    "price": 99.99,
    "currency": "USD",
    "availability": true
  },
  {
    "id": 2,
    "name": "Another Product",
    "description": "Another Product Description",
    "price": 49.99,
    "currency": "USD",
    "availability": false
  }
]
```

