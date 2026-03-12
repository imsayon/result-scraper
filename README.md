# DSCE Result Scraper

## Setup

1. **Install Dependencies**: `npm install`
2. **Environment Variables**: Create a `.env` file with `RESULT_PORTAL_URL = "http://14.99.184.178:8080/birt/frameset"`.
3. **Run**: `npm run dev`

## Endpoints

- `POST /scrape`: Batch download result PDFs.
- `POST /generate-excel`: Generate a consolidated Excel sheet from downloaded PDFs.
- `GET /status`: Monitor batch scraping progress.
- `POST /scrape-single`: Fetch result for a single USN.

## Example

```{
  "year": "22",
  "branches": ["AI", "EC", "CS"]
}
```
