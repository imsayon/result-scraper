import axios from "axios"
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from "url"
import pdf from "pdf-parse"
import dotenv from "dotenv"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ResultScraper {
	constructor() {
		this.baseUrl = process.env.RESULT_PORTAL_URL
		if (!this.baseUrl) {
			throw new Error("RESULT_PORTAL_URL not found in .env file")
		}

		this.reportParams = {
			__report: "mydsi/exam/Exam_Result_Sheet_dsce.rptdesign",
			__format: "pdf",
		}

		this.downloadsDir = path.join(__dirname, "downloads")
		fs.ensureDirSync(this.downloadsDir)

		this.client = axios.create({
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			},
			timeout: 30000,
		})
	}

	generateUsn(year, branch, number) {
		return `1DS${year}${branch.toUpperCase()}${String(number).padStart(3, "0")}`
	}

	async createBranchFolder(year, branch) {
		const folderPath = path.join(
			this.downloadsDir,
			`Results_PDF_20${year}`,
			branch.toUpperCase(),
		)
		await fs.ensureDir(folderPath)
		return folderPath
	}

	async extractStudentNameFromPdf(pdfBuffer) {
		try {
			const data = await pdf(pdfBuffer)
			const nameMatch = data.text.match(
				/Name of the Student:\s*([A-Z\s]+)/i,
			)
			if (nameMatch && nameMatch[1].trim()) {
				return nameMatch[1].trim().replace(/\s+/g, " ")
			}
			return null
		} catch (error) {
			return null
		}
	}

	sanitizeFilename(name) {
		return name.replace(/[<>:"/\\|?*]+/g, "").trim()
	}

	async fetchSingleResult(usn) {
		try {
			const params = { ...this.reportParams, USN: usn }
			const response = await this.client.get(this.baseUrl, {
				params,
				responseType: "arraybuffer",
			})

			if (
				response.status !== 200 ||
				!response.headers["content-type"]?.includes("application/pdf")
			) {
				return null
			}

			const pdfContent = response.data
			const studentName = await this.extractStudentNameFromPdf(pdfContent)

			if (!studentName) return null

			return {
				usn,
				name: studentName,
				branch: usn.substring(5, 7),
				pdfContent,
				year: usn.substring(3, 5),
			}
		} catch (error) {
			return null
		}
	}

	async saveResultPdf(studentInfo) {
		try {
			const branchFolder = await this.createBranchFolder(
				studentInfo.year,
				studentInfo.branch,
			)
			const sanitizedName = this.sanitizeFilename(studentInfo.name)
			const usnSuffix = studentInfo.usn.slice(-5)
			const filename = `${sanitizedName}_${usnSuffix}.pdf`
			const filepath = path.join(branchFolder, filename)

			if (await fs.pathExists(filepath)) {
				return filepath
			}

			await fs.writeFile(filepath, studentInfo.pdfContent)
			return filepath
		} catch (error) {
			return null
		}
	}

	async scrapeAllResults(year, branches, statusCallback) {
		const MAX_FAILURES = 10
		let totalDownloads = 0

		for (const branch of branches) {
			let consecutiveFailures = 0
			let studentNumber = 1

			while (consecutiveFailures < MAX_FAILURES) {
				const usn = this.generateUsn(year, branch, studentNumber)
				statusCallback(totalDownloads, 0, `Checking ${usn}...`)

				const info = await this.fetchSingleResult(usn)
				if (info) {
					await this.saveResultPdf(info)
					totalDownloads++
					consecutiveFailures = 0
				} else {
					consecutiveFailures++
				}
				studentNumber++
				await new Promise((r) => setTimeout(r, 100))
			}
		}
	}
}

export default new ResultScraper()
