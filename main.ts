import { Notice, Plugin, TFile } from 'obsidian';

export default class MarkmapToCsvPlugin extends Plugin {

	async onload() {
		console.log('loading MarkmapToCSVPlugin');

		this.addCommand({
			id: 'convert-markmap-to-csv',
			name: 'Convert Markmap to CSV',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile()
				if (!file || file.extension !== "md") {
					return false;
				}

				if(!checking) {
					this.app.vault.read(file).then(
						async (markdownData) => {
							const csvData = this.convertMarkmapToCSV(markdownData);
							await this.saveCsvToFile(file, csvData);
						}
					).catch((err) => {
						new Notice(`ERROR: failed to read file ${file.basename}`)
						throw err
					});
				}
				
				return true;
				
			}
		});
	}

	onunload() {

	}

	convertMarkmapToCSV(data: string): string {
		const markmapData = data.replace(/^---[\s\S]*?---\n/, '');
		const lines: string[] = markmapData.trim().split('\n');
		const csvRows: string[] = [];
		let stack: string[] = [];
		let currentDepth: number = 0;

		for (const line of lines) {
			if (line.startsWith('#')) {
				// Header indicates a new depth level
				const headerLevel: number = line.match(/^#+/)?.[0].length || 1;
				if(headerLevel == 1) {
					// clear stack all 
					// start new mindmap
					stack = []
				}
				if (stack.length > headerLevel) {
					const newData = stack.join(',')
					csvRows.push(newData)
					stack = stack.slice(0, headerLevel-1)
				} else if (stack.length === headerLevel) {
					const newData = stack.join(',')
					csvRows.push(newData)
					stack.pop()
				}

				const item = line.substring(headerLevel+1)
				stack.push(item); // Add header to stack
				currentDepth = headerLevel; // Update current depth
			} else if (line.trimStart().startsWith('-')) {
				// List item indicates a new data row
				const indent: number = this.getIndentCount(line.split('-')[0]); // Calculate indent level
				const depth: number = indent + 3; // Calculate depth
				const item: string = line.substring(line.indexOf('-') + 1).trim(); // Extract item

				if (stack.length > depth) {
					const newData = stack.join(',')
					csvRows.push(newData)
					stack = stack.slice(0, depth-1)
				} else if(stack.length === depth) {
					const newData = stack.join(',')
					csvRows.push(newData)
					stack.pop()
				}

				stack.push(item); // Set item in stack
				currentDepth = depth; // Update current depth
			}
		}

		if(stack.length >0) {
			const lastData = stack.join(',')
			csvRows.push(lastData)
			stack = []
		}

		return csvRows.join('\n');
    }

	getIndentCount(line: string): number {
		const match = line.replace(/\t/g, '    ').match(/^[\s]*/);
		return match ? match[0].length / 4 : 0;
	}

    async saveCsvToFile(file: TFile, csvData: string): Promise<void> {
		const fullPath = `${file.parent?.path}/markmap-${file.basename}.csv`
        await this.app.vault.adapter.write(fullPath, csvData)
		new Notice(`save ${fullPath}`);
    }

	getCurrentDateTimeString() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		return `${year}${month}${day}${hours}${minutes}${seconds}`;
	}
}
