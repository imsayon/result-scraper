


	import express from "express"
import scraper from "./index.js"
import dotenv from "dotenv"
import path from "path"
dotenv.config()
const app = express()
app.use(express.json())

let status = { running: false, msg: "Ready" }
app.get("/status", (req, res) => res.json(status))

app.post("/scrape", async (req, res) => {
	const { year, branches } = req.body
	if (status.running)
		return res.status(400).send("A scraping task is already running.")

	status.running = true
	scraper
		.runBatch(year, branches, (m) => { status.msg = m; console.log(m); })
		.then(() => {
			status.running = false
			status.msg = "Batch scraping completed!"
		})
		.catch((e) => {
			status.running = false
			status.msg = "Error: " + e.message
		})

	res.json({ message: "Scraping process started in the background." })
})

app.post("/scrape-single", async (req, res) => {
	const { usn } = req.body
	try {
		const pdfData = await scraper.fetchResult(usn)
		if (!pdfData)
			return res.status(404).send("Result not found for this USN.")

		const info = await scraper.extractInfo(pdfData)
		res.json({ usn, ...info })
	} catch (err) {
		res.status(500).send(err.message)
	}
})

app.post("/generate-excel", async (req, res) => {
	const { year, branches } = req.body // FORMAT => { "year": "24", "branches": ["AI", "CS", "IS"] }
	try {
		const filePath = await scraper.generateExcel(year, branches)
		if (filePath) {
			res.json({
				status: "Success",
				file_name: path.basename(filePath),
				full_path: filePath,
			})
		} else {
			res.status(404).send("No data found to generate report.")
		}
	} catch (err) {
		res.status(500).send(err.message)
	}
})
app.get("/", (req, res) => {
	res.send(
		"<h1>DSCE Result Scraper API is Running</h1><p>Use /status to check progress.</p>",
	)
})
const PORT = process.env.PORT || 8000
app.listen(PORT, () => console.log(`Server live at http://localhost:${PORT}`))


