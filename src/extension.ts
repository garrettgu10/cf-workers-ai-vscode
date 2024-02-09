// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import WorkersAI from './ai';

const debounceMs = 1000;
let rejectPrev: Function = () => {};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const config = vscode.workspace.getConfiguration('CoWorkers');
	console.log(config);

	if(!config.get<boolean>('enable')) return;
	if(!config.get<string>('accountId') || config.get<string>('accountId') === '') {
		vscode.window.showErrorMessage("CoWorkers: Please set your account id in the extension settings.");
		vscode.commands.executeCommand("workbench.action.openSettings", "CoWorkers");
		return;
	}
	if(!config.get<string>('apiKey') || config.get<string>('apiKey') === '') {
		vscode.window.showErrorMessage("CoWorkers: Please set your api key in the extension settings.");
		vscode.commands.executeCommand("workbench.action.openSettings", "CoWorkers");
		return;
	}

	vscode.window.showInformationMessage("CoWorkers enabled");

	const ai = new WorkersAI(config.get<string>('accountId') as string, config.get<string>('apiKey') as string);

	const provider: vscode.InlineCompletionItemProvider = {
		provideInlineCompletionItems: async (document, position, context, token) => {
			rejectPrev();
			try{
				await new Promise((resolve, reject) => {
					setTimeout(() => {
						resolve(null);
						rejectPrev = () => {};
					}, debounceMs);
					rejectPrev = reject;
				});
			}catch(e) {
				// canceled
				return null;
			}

			if(config.get<boolean>("enablePopup"))
				vscode.window.showInformationMessage("CoWorkers: starting infill...");
			const text = document.getText();
			const offset = document.offsetAt(position);
			const prefix = text.substring(0, offset);
			const suffix = text.substring(offset);
			const infill = await ai.infill(prefix, suffix);
			
			if(config.get<boolean>("enablePopup"))
				vscode.window.showInformationMessage("CoWorkers: generated " + infill.length + " suggestions");
			const res: vscode.InlineCompletionList = {
				"items": infill.map(a => new vscode.InlineCompletionItem(a))
			};
			return res;
		}
	}

	vscode.languages.registerInlineCompletionItemProvider({pattern: "**"}, provider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
