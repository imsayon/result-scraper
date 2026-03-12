import axios from "axios"
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from "url"
import pdf from "pdf-parse"
import dotenv from "dotenv"
import XLSX from "xlsx"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ResultScraper {
	constructor() {
		this.baseUrl = process.env.RESULT_PORTAL_URL
		this.downloadsDir = path.join(__dirname, "downloads")
		fs.ensureDirSync(this.downloadsDir)

		this.client = axios.create({
			headers: { "User-Agent": "Mozilla/5.0" },
			timeout: 30000,
		})
	}

	genUsn(year, branch, num) {
		return `1DS${year}${branch.toUpperCase()}${String(num).padStart(3, "0")}`
	}

	async extractInfo(pdfBuffer) {
		try {
			const data = await pdf(pdfBuffer)
			const text = data.text

			const nameMatch = text.match(
				/Name\s*of\s*the\s*Student\s*:\s*([A-Z\s]+)/i,
			)
			const name = nameMatch
				? nameMatch[1].trim().replace(/\s+/g, " ")
				: "Unknown"

			const sgpaMatch = text.match(/SGPA\s*[:\s]*(\d+\.\d+)/i)
			const sgpa = sgpaMatch ? parseFloat(sgpaMatch[1]) : 0.0

			return { name, sgpa }
		} catch (err) {
			return { name: "Error", sgpa: 0.0 }
		}
	}

	async fetchResult(usn) {
		try {
			const params = {
				__report: "mydsi/exam/Exam_Result_Sheet_dsce.rptdesign",
				__format: "pdf",
				USN: usn,
			}
			const res = await this.client.get(this.baseUrl, {
				params,
				responseType: "arraybuffer",
			})
			if (
				res.status === 200 &&
				res.headers["content-type"]?.includes("pdf")
			)
				return res.data
			return null
		} catch {
			return null
		}
	}

	async generateExcel(year, branches) {
		let finalRows = []

		for (const branch of branches) {
			const branchPath = path.join(
				this.downloadsDir,
				`Results_20${year}`,
				branch.toUpperCase(),
			)
			if (!fs.existsSync(branchPath)) continue

			const files = fs
				.readdirSync(branchPath)
				.filter((f) => f.endsWith(".pdf"))
			const deptData = []

			for (const file of files) {
				const buffer = fs.readFileSync(path.join(branchPath, file))
				const { name, sgpa } = await this.extractInfo(buffer)
				const usnSuffix = file.split("_").pop().replace(".pdf", "")

				deptData.push({
					USN: `1DS${year}${branch.toUpperCase()}${usnSuffix}`,
					"Student Name": name,
					SGPA: sgpa,
				})
			}

			if (deptData.length > 0) {
				// Add student records
				finalRows.push(...deptData)

				// Calculate Stats
				const validSGPAs = deptData
					.map((s) => s.SGPA)
					.filter((s) => s > 0)
				const avg = validSGPAs.length
					? (
							validSGPAs.reduce((a, b) => a + b, 0) /
							validSGPAs.length
						).toFixed(2)
					: "0.00"

				const top5 = [...deptData]
					.sort((a, b) => b.SGPA - a.SGPA)
					.slice(0, 5)
					.map((s) => `${s.Name} (${s.SGPA})`)
					.join(", ")

				// Add Summary section for this department
				finalRows.push({})
				finalRows.push({
					USN: `--- DEPARTMENT SUMMARY: ${branch.toUpperCase()} ---`,
				})
				finalRows.push({
					USN: "Department Average SGPA",
					"Student Name": avg,
				})
				finalRows.push({ USN: "Top 5 Students", "Student Name": top5 })
				finalRows.push({}, {})
			}
		}

		if (finalRows.length === 0) return null

		const wb = XLSX.utils.book_new()
		const ws = XLSX.utils.json_to_sheet(finalRows)
		XLSX.utils.book_append_sheet(wb, ws, "Results")

		const outPath = path.join(
			this.downloadsDir,
			`Consolidated_Report_20${year}.xlsx`,
		)
		XLSX.writeFile(wb, outPath)
		return outPath
	}

	async runBatch(year, branches, callback) {
		for (const branch of branches) {
			let fails = 0,
				count = 1
			const folder = path.join(
				this.downloadsDir,
				`Results_20${year}`,
				branch.toUpperCase(),
			)
			fs.ensureDirSync(folder)

			while (fails < 10) {
				const usn = this.genUsn(year, branch, count)
				callback(`Checking ${usn}...`)

				const pdfData = await this.fetchResult(usn)
				if (pdfData) {
					const { name } = await this.extractInfo(pdfData)
					const cleanName = name.replace(/[^a-zA-Z ]/g, "")
					fs.writeFileSync(
						path.join(
							folder,
							`${cleanName}_${count.toString().padStart(3, "0")}.pdf`,
						),
						pdfData,
					)
					fails = 0
				} else {
					fails++
				}
				count++
			}
		}
	}
}

export default new ResultScraper()
