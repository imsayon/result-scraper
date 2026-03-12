import express from "express"
import scraper from "./scraper.js"
import dotenv from "dotenv"

dotenv.config()
const app = express()
app.use(express.json())

let status = { running: false, msg: "Ready" }

app.get("/status", (req, res) => res.json(status))

// Batch Scrape Start
app.post("/scrape", async (req, res) => {
	const { year, branches } = req.body
	if (status.running)
		return res.status(400).send("A scraping task is already running.")

	status.running = true
	scraper
		.runBatch(year, branches, (m) => (status.msg = m))
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

// Generate Excel Report
app.post("/generate-excel", async (req, res) => {
	const { year, branches } = req.body
	try {
		const file = await scraper.generateExcel(year, branches)
		if (file) res.json({ status: "Success", file_path: file })
		else
			res.status(404).send("No PDF data found. Please run /scrape first.")
	} catch (err) {
		res.status(500).send(err.message)
	}
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => console.log(`Server live at http://localhost:${PORT}`))
