import { App, Editor, MarkdownPreviewView, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, renderResults } from 'obsidian';
// Remember to rename these classes and interfaces!

interface MarkmapToCsvSettings {
	directory: string
}

export default class MarkmapToCsvPlugin extends Plugin {
	settings: MarkmapToCsvSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const markMapToCsvIconE1 = this.addRibbonIcon('dice', 'Markmap to csv Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		markMapToCsvIconE1.addClass('markmap2csv-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		console.log('loading MarkmapToCSVPlugin');

		this.addCommand({
			id: 'convert-markmap-to-csv',
			name: 'Convert Markmap to CSV',
			hotkeys: [
				{
					modifiers: ['Ctrl', 'Shift', 'Alt'],
					key: 'M'
				}
			],
			checkCallback: (checking) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const markdownData = activeView.editor.getValue();
					const csvData = this.convertMarkmapToCSV(markdownData);
					this.saveCsvToFile(this.app.workspace.getActiveFile()?.basename ?? "markMap", csvData);
					return true;
				} else {
					new Notice('ERROR: Please open a Markmap file to convert.');
					return false;
				}
			}
		});
		
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.addSettingTab(new MarkMapToCsvSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, await this.loadData(), {
			directory: '.'
		} as MarkmapToCsvSettings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	convertMarkmapToCSV(data: string): string {
		console.log(data)
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
				if (stack.length-1 >= headerLevel) {
					const newData = stack.join(',')
					csvRows.push(newData)
					stack = stack.slice(0, headerLevel)
				}
				stack.push(line.substring(headerLevel).trim()); // Add header to stack
				currentDepth = headerLevel; // Update current depth
			} else if (line.trimStart().startsWith('-')) {
				// List item indicates a new data row
				const indent: number = this.getIndentCount(line.split('-')[0]); // Calculate indent level
				const depth: number = indent + 3; // Calculate depth
				const item: string = line.substring(line.indexOf('-') + 1).trim(); // Extract item
				if (stack.length-1 >= depth) {
					const newData = stack.join(',')
					csvRows.push(newData)
					stack = stack.slice(0, depth)
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

    saveCsvToFile(filename: string, csvData: string): void {
		const directory = this.settings.directory ?? this.app.workspace.getActiveFile()?.path ?? '.'
		const fullPath = `${directory}/markmap-${filename}-${this.getCurrentDateTimeString()}.csv`
        this.app.vault.create(fullPath, csvData)
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

class MarkMapToCsvSettingTab extends PluginSettingTab {
    constructor(app: App, private plugin: MarkmapToCsvPlugin) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        const setting = new Setting(containerEl)
            .setName('directory')
            .setDesc('Configure save csv directory. (default= activateFile\'s path)')
            .addText(text => {
                text
                    .setPlaceholder('input your directory')
                    .setValue(this.plugin.settings.directory)
                    .onChange(async (value) => {
                        this.plugin.settings.directory = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}
