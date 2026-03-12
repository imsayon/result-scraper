# DSCE Result Scraper

A high-performance Node.js utility designed to automate the extraction of student exam results from the Dayananda Sagar College of Engineering (DSCE) portal. This tool scrapes result PDFs for specified batches, parses academic data, and generates consolidated Excel reports featuring department-level statistics.

---

## 🚀 Features

- **Batch Scraping**: Automatically fetch results for entire departments based on year and branch codes.
- **Intelligent PDF Parsing**: Extracts student names and SGPAs from official result sheets.
- **Data Consolidation**: Generates Excel reports including department averages and lists of top performers.
- **Status Monitoring**: Real-time tracking of scraping progress via a dedicated endpoint.
- **Single USN Lookup**: Quickly retrieve details for an individual student.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Web Framework**: Express
- **Scraping & Requests**: Axios
- **Data Extraction**: pdf-parse
- **Report Generation**: xlsx (SheetJS)

---

## 📋 Prerequisites

- Node.js (v14 or higher recommended)
- NPM (Node Package Manager)

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd dsce-result-scraper

```

### 2. Install Dependencies

```bash
npm install

```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add the following:

```env
RESULT_PORTAL_URL="http://14.99.184.178:8080/birt/frameset"
PORT=8000

```

### 4. Start the Application

**For Production:**

```bash
npm start

```

**For Development (with Nodemon):**

```bash
npm run dev

```

---

## 🔌 API Documentation

### **Check Status**

`GET /status`

Returns the current state of any background scraping tasks.

### **Start Batch Scrape**

`POST /scrape`

Initiates background downloading of PDFs for the specified batch.

**Example Body:**

```json
{
	"year": "22",
	"branches": ["AI", "EC", "CS", "IS"]
}
```

### **Single Result Fetch**

`POST /scrape-single`

Fetches and parses a single student's result immediately.

**Example Body:**

```json
{
	"usn": "1DS22CS001"
}
```

### **Generate Excel Report**

`POST /generate-excel`

Processes downloaded PDFs into a consolidated `.xlsx` file.

**Example Body:**

```json
{
	"year": "22",
	"branches": ["AI", "CS"]
}
```

---

## 🤝 Contributing

This project is open for contributions! To get involved:

1. **Fork** the repository.
2. Create a new **branch** (`git checkout -b feature/your-feature`).
3. **Commit** and **push** your changes (`git commit -m "Add feature"`, `git push origin feature/your-feature`).
4. Open a **Pull Request** (PR) for review.

Please ensure your PRs are valid and provide clear descriptions of your changes for review.

---

## 📜 License

This project is licensed under the **MIT License**.
