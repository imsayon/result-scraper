import express from "express"
import scraper from "./scraper.js"
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

let scrapeStatus = {
	is_running: false,
	progress: 0,
	total: 0,
	message: "Ready",
}

const updateProgress = (current, total, message) => {
	scrapeStatus.progress = current
	scrapeStatus.total = total
	scrapeStatus.message = message
}

app.get("/", (req, res) => {
	res.json({ message: "DSCE Result Scraper API (Node.js) is running" })
})

app.get("/status", (req, res) => {
	res.json(scrapeStatus)
})

app.post("/scrape", async (req, res) => {
	const { year, branches } = req.body

	if (scrapeStatus.is_running) {
		return res
			.status(400)
			.json({ detail: "Scraping is already in progress." })
	}

	if (!/^\d{2}$/.test(year)) {
		return res
			.status(422)
			.json({ detail: "Invalid year format. Use 2 digits (e.g., '24')." })
	}

	// Run scraping in the background
	;(async () => {
		try {
			scrapeStatus.is_running = true
			scrapeStatus.message = `Starting scraping for year 20${year}...`
			await scraper.scrapeAllResults(year, branches, updateProgress)
			scrapeStatus.message = "Scraping completed!"
		} catch (err) {
			scrapeStatus.message = `Error: ${err.message}`
		} finally {
			scrapeStatus.is_running = false
		}
	})()

	res.json({ message: "Scraping process started in the background." })
})

app.post("/scrape-single", async (req, res) => {
	const { usn } = req.body
	try {
		const info = await scraper.fetchSingleResult(usn)
		if (info) {
			const filePath = await scraper.saveResultPdf(info)
			return res.json({ usn, status: "success", file_path: filePath })
		}
		res.status(404).json({ detail: `Result not found for USN: ${usn}` })
	} catch (err) {
		res.status(500).json({ detail: err.message })
	}
})

app.get("/results", async (req, res) => {
	const results = []
	const downloadsDir = path.join(__dirname, "downloads")

	if (!(await fs.pathExists(downloadsDir))) return res.json([])

	const walk = async (dir) => {
		const files = await fs.readdir(dir)
		for (const file of files) {
			const p = path.join(dir, file)
			if ((await fs.stat(p)).isDirectory()) {
				await walk(p)
			} else if (file.endsWith(".pdf")) {
				const stats = await fs.stat(p)
				const nameParts = file.replace(".pdf", "").split("_")
				results.push({
					filename: file,
					student_name: nameParts.slice(0, -1).join("_"),
					branch: nameParts.slice(-1)[0].substring(0, 2),
					size_kb: Math.round((stats.size / 1024) * 100) / 100,
					modified: stats.mtime.toISOString(),
				})
			}
		}
	}

	await walk(downloadsDir)
	res.json(results)
})

const PORT = 8000
app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`)
})
